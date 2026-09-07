// src/services/assignmentService.js
import { getConnection } from '../config/db.js';
import { pbxService } from './pbxService.js';

class AssignmentService {
    // ============ LOAD BALANCING ASSIGNMENT ============
    async autoAssignPendingTasks(taskType = null) {
        try {
            const pool = await getConnection();

            // 1. Get pending tasks
            let taskQuery = `
                SELECT 
                    t.task_id as id,
                    t.loan_id as loanId,
                    t.task_type as taskType,
                    t.attempt_count as attempts,
                    t.created_at as createdAt,
                    l.customer_name as customerName,
                    l.customer_phone as phone
                FROM VERIFICATION_TASKS t
                JOIN LOANS l ON t.loan_id = l.loan_id
                WHERE t.status = 'PENDING'
            `;

            if (taskType && taskType !== 'all') {
                taskQuery += ` AND t.task_type = @taskType`;
            }

            taskQuery += ` ORDER BY t.created_at ASC`;

            const taskResult = await pool.request();
            if (taskType && taskType !== 'all') {
                taskResult.input('taskType', taskType);
            }
            const tasks = (await taskResult.query(taskQuery)).recordset || [];

            if (tasks.length === 0) {
                return { success: true, assigned: 0, message: 'No pending tasks' };
            }

            // 2. Get available agents with skills and workload
            const agents = await this.getAvailableAgents(taskType);

            if (agents.length === 0) {
                return {
                    success: false,
                    assigned: 0,
                    message: 'No available agents for this task type'
                };
            }

            // 3. Assign tasks using load balancing algorithm
            const assignments = await this.loadBalanceAssign(tasks, agents);

            // 4. Process assignments
            let assignedCount = 0;
            for (const assignment of assignments) {
                await this.assignTaskToAgent(assignment.taskId, assignment.agentId);
                assignedCount++;
            }

            return {
                success: true,
                assigned: assignedCount,
                assignments: assignments,
                message: `Assigned ${assignedCount} tasks to ${agents.length} agents`
            };

        } catch (error) {
            console.error('❌ Error in autoAssignPendingTasks:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ GET AVAILABLE AGENTS ============
    async getAvailableAgents(taskType = null) {
        try {
            const pool = await getConnection();

            let query = `
                SELECT 
                    u.user_id as id,
                    u.username,
                    u.full_name as fullName,
                    u.verification_type as verificationType,
                    u.pbx_extension as pbxExtension,
                    u.status,
                    COUNT(t.task_id) as currentLoad,
                    SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as activeCalls,
                    CASE 
                        WHEN DATEADD(hour, -8, GETDATE()) < u.last_activity THEN 1 
                        ELSE 0 
                    END as isActive
                FROM USERS u
                LEFT JOIN VERIFICATION_TASKS t ON u.user_id = t.assigned_agent_id
                    AND t.status IN ('ASSIGNED', 'IN_PROGRESS')
                WHERE u.role = 'VERIFIER'
                AND u.status = 'ACTIVE'
            `;

            if (taskType && taskType !== 'all') {
                query += ` AND u.verification_type = @taskType`;
            }

            query += `
                GROUP BY u.user_id, u.username, u.full_name, u.verification_type, 
                         u.pbx_extension, u.status, u.last_activity
                HAVING COUNT(t.task_id) < 10  -- Max concurrent tasks
                AND SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) < 2  -- Max concurrent calls
                ORDER BY COUNT(t.task_id) ASC, u.user_id
            `;

            const result = await pool.request();
            if (taskType && taskType !== 'all') {
                result.input('taskType', taskType);
            }
            const agents = (await result.query(query)).recordset || [];

            // Filter by PBX availability (if PBX is connected)
            if (pbxService.isConnected()) {
                const activeCalls = pbxService.getActiveCalls();
                const activeAgentIds = activeCalls.map(c => c.agentId);
                return agents.filter(a => !activeAgentIds.includes(a.id));
            }

            return agents;

        } catch (error) {
            console.error('❌ Error getting available agents:', error);
            return [];
        }
    }

    // ============ LOAD BALANCE ASSIGNMENT ALGORITHM ============
    loadBalanceAssign(tasks, agents) {
        const assignments = [];
        const agentLoadMap = new Map();

        // Initialize agent load map
        agents.forEach(agent => {
            agentLoadMap.set(agent.id, {
                agent: agent,
                load: agent.currentLoad || 0,
                assigned: 0
            });
        });

        // Sort tasks by priority (attempts, created_at)
        const sortedTasks = [...tasks].sort((a, b) => {
            // Priority 1: Fewer attempts first
            if (a.attempts !== b.attempts) {
                return a.attempts - b.attempts;
            }
            // Priority 2: Older first
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        // Assign tasks using weighted round-robin
        for (const task of sortedTasks) {
            // Find the agent with the least load
            let bestAgent = null;
            let minLoad = Infinity;
            let minAssigned = Infinity;

            for (const [agentId, data] of agentLoadMap) {
                const totalLoad = data.load + data.assigned;
                if (totalLoad < minLoad) {
                    minLoad = totalLoad;
                    minAssigned = data.assigned;
                    bestAgent = data.agent;
                } else if (totalLoad === minLoad && data.assigned < minAssigned) {
                    minAssigned = data.assigned;
                    bestAgent = data.agent;
                }
            }

            if (bestAgent) {
                assignments.push({
                    taskId: task.id,
                    task: task,
                    agentId: bestAgent.id,
                    agent: bestAgent
                });

                // Update load
                const data = agentLoadMap.get(bestAgent.id);
                data.assigned += 1;
            } else {
                console.log(`⚠️ No agent available for task ${task.id}`);
            }
        }

        return assignments;
    }

    // ============ ASSIGN TASK TO AGENT ============
    async assignTaskToAgent(taskId, agentId) {
        try {
            const pool = await getConnection();
            await pool.request()
                .input('taskId', taskId)
                .input('agentId', agentId)
                .input('status', 'ASSIGNED')
                .query(`
                    UPDATE VERIFICATION_TASKS
                    SET assigned_agent_id = @agentId,
                        status = @status,
                        updated_at = SYSUTCDATETIME()
                    WHERE task_id = @taskId
                `);

            // Update agent last activity
            await pool.request()
                .input('agentId', agentId)
                .query(`
                    UPDATE USERS
                    SET last_activity = SYSUTCDATETIME()
                    WHERE user_id = @agentId
                `);

            console.log(`✅ Task ${taskId} assigned to agent ${agentId}`);
            return { success: true };

        } catch (error) {
            console.error(`❌ Error assigning task ${taskId} to agent ${agentId}:`, error);
            throw error;
        }
    }

    // ============ AGENT STATUS MANAGEMENT ============
    async updateAgentStatus(agentId, status, reason = null) {
        try {
            const pool = await getConnection();
            await pool.request()
                .input('agentId', agentId)
                .input('status', status)
                .input('reason', reason)
                .query(`
                    UPDATE USERS
                    SET 
                        agent_status = @status,
                        agent_status_reason = @reason,
                        updated_at = SYSUTCDATETIME()
                    WHERE user_id = @agentId
                `);

            console.log(`✅ Agent ${agentId} status updated to ${status}`);
            return { success: true };

        } catch (error) {
            console.error(`❌ Error updating agent status:`, error);
            return { success: false, error: error.message };
        }
    }

    // ============ SKILL-BASED ROUTING ============
    async skillBasedRouting(taskId, taskType) {
        try {
            // Get agents with matching skills
            const agents = await this.getAvailableAgents(taskType);

            if (agents.length === 0) {
                return { success: false, message: 'No matching agents available' };
            }

            // Get agent rankings based on performance
            const rankedAgents = await this.rankAgentsByPerformance(agents, taskType);

            // Assign to best agent
            const bestAgent = rankedAgents[0];
            const result = await this.assignTaskToAgent(taskId, bestAgent.id);

            return {
                success: true,
                agentId: bestAgent.id,
                agentName: bestAgent.fullName,
                ...result
            };

        } catch (error) {
            console.error('❌ Error in skill-based routing:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ RANK AGENTS BY PERFORMANCE ============
    async rankAgentsByPerformance(agents, taskType) {
        try {
            const pool = await getConnection();
            const rankedAgents = [];

            for (const agent of agents) {
                const result = await pool.request()
                    .input('agentId', agent.id)
                    .input('taskType', taskType)
                    .query(`
                        SELECT 
                            COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) * 1.0 / 
                            NULLIF(COUNT(*), 0) as successRate,
                            AVG(CASE WHEN duration_sec IS NOT NULL THEN duration_sec ELSE 0 END) as avgHandleTime,
                            COUNT(*) as totalTasks
                        FROM VERIFICATION_TASKS t
                        LEFT JOIN CALL_ATTEMPTS a ON t.task_id = a.task_id
                        WHERE t.assigned_agent_id = @agentId
                        AND t.task_type = @taskType
                        AND t.status IN ('CONFIRMED', 'DISPUTED', 'NO_CONTACT')
                    `);

                const stats = result.recordset[0] || {};
                rankedAgents.push({
                    ...agent,
                    successRate: stats.successRate || 0,
                    avgHandleTime: stats.avgHandleTime || 0,
                    totalTasks: stats.totalTasks || 0,
                    score: (stats.successRate || 0) * 0.6 +
                        (1 - Math.min(stats.avgHandleTime / 300, 1)) * 0.4
                });
            }

            // Sort by score descending
            return rankedAgents.sort((a, b) => b.score - a.score);

        } catch (error) {
            console.error('❌ Error ranking agents:', error);
            return agents;
        }
    }

    // ============ GET TASK ASSIGNMENT SUGGESTIONS ============
    async getAssignmentSuggestions(taskId) {
        try {
            const pool = await getConnection();

            // Get task details
            const taskResult = await pool.request()
                .input('taskId', taskId)
                .query(`
                    SELECT task_type, loan_id
                    FROM VERIFICATION_TASKS
                    WHERE task_id = @taskId
                `);

            const task = taskResult.recordset[0];
            if (!task) {
                return { success: false, message: 'Task not found' };
            }

            // Get available agents
            const agents = await this.getAvailableAgents(task.task_type);

            // Rank them
            const rankedAgents = await this.rankAgentsByPerformance(agents, task.task_type);

            return {
                success: true,
                taskId,
                suggestions: rankedAgents.map(agent => ({
                    agentId: agent.id,
                    agentName: agent.fullName,
                    currentLoad: agent.currentLoad || 0,
                    successRate: (agent.successRate * 100).toFixed(1),
                    avgHandleTime: agent.avgHandleTime,
                    score: agent.score
                }))
            };

        } catch (error) {
            console.error('❌ Error getting assignment suggestions:', error);
            return { success: false, error: error.message };
        }
    }

    // src/services/assignmentService.js - Add this method

    // ============ ASSIGN TASKS TO AGENT (BATCH) ============
    async assignTasksToAgentBatch(taskIds, agentId) {
        try {
            const pool = await getConnection();

            // Verify agent exists and is active
            const agentCheck = await pool.request()
                .input('agentId', agentId)
                .query(`
                SELECT user_id, role, verification_type, status
                FROM USERS
                WHERE user_id = @agentId
                AND status = 'ACTIVE'
                AND role = 'VERIFIER'
            `);

            if (!agentCheck.recordset || agentCheck.recordset.length === 0) {
                throw new Error('Invalid or inactive agent');
            }

            // Build task IDs string
            const taskIdsString = taskIds.map(id => `'${id}'`).join(',');

            // Assign tasks
            const result = await pool.request()
                .input('agentId', agentId)
                .query(`
                UPDATE VERIFICATION_TASKS
                SET 
                    assigned_agent_id = @agentId,
                    status = 'ASSIGNED',
                    updated_at = SYSUTCDATETIME()
                WHERE task_id IN (${taskIdsString})
                AND status = 'PENDING'
            `);

            return {
                success: true,
                assigned: result.rowsAffected[0]
            };
        } catch (error) {
            console.error('❌ Error in assignTasksToAgentBatch:', error);
            return { success: false, error: error.message };
        }
    }
}

export const assignmentService = new AssignmentService();
export default assignmentService;