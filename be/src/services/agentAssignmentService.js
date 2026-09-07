// src/services/agentAssignmentService.js
import { getConnection } from '../config/db.js';

export const agentAssignmentService = {
    // ============ GET AGENT WORKLOAD SUMMARY ============
    async getAgentWorkload(taskType = null) {
        try {
            const pool = await getConnection();

            let query = `
                SELECT 
                    u.user_id as agentId,
                    u.username,
                    u.full_name as agentName,
                    u.verification_type as agentType,
                    u.pbx_extension as extension,
                    u.status as agentStatus,
                    COUNT(t.task_id) as totalAssigned,
                    SUM(CASE WHEN t.status = 'ASSIGNED' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgress,
                    SUM(CASE WHEN t.status = 'CONFIRMED' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN t.status = 'DISPUTED' THEN 1 ELSE 0 END) as disputed,
                    SUM(CASE WHEN t.status = 'NO_CONTACT' THEN 1 ELSE 0 END) as noContact,
                    SUM(CASE WHEN t.status = 'ESCALATED' THEN 1 ELSE 0 END) as escalated,
                    SUM(CASE WHEN t.status = 'CLOSED' THEN 1 ELSE 0 END) as closed,
                    COUNT(CASE WHEN t.status != 'CLOSED' THEN 1 END) as activeTasks
                FROM USERS u
                LEFT JOIN VERIFICATION_TASKS t ON u.user_id = t.assigned_agent_id
                WHERE u.role = 'VERIFIER'
                AND u.status = 'ACTIVE'
            `;

            if (taskType && taskType !== 'all') {
                query += ` AND u.verification_type = @taskType`;
            }

            query += `
                GROUP BY u.user_id, u.username, u.full_name, u.verification_type, u.pbx_extension, u.status
                ORDER BY COUNT(t.task_id) DESC
            `;

            const result = await pool.request();
            if (taskType && taskType !== 'all') {
                result.input('taskType', taskType);
            }
            const data = await result.query(query);

            return data.recordset || [];
        } catch (error) {
            console.error('❌ Error in getAgentWorkload:', error);
            return [];
        }
    },

    // ============ GET TASKS BY AGENT (Detailed) ============
    async getTasksByAgentDetailed(agentId, filters = {}) {
        try {
            const pool = await getConnection();

            let query = `
                SELECT 
                    t.task_id as id,
                    t.loan_id as loanId,
                    l.customer_name as customerName,
                    l.customer_phone as phone,
                    l.loan_amount as amount,
                    t.task_type as type,
                    t.status,
                    t.attempt_count as attempts,
                    t.created_at as createdAt,
                    t.due_datetime as dueTime,
                    t.updated_at as updatedAt,
                    u.full_name as agentName,
                    (SELECT COUNT(*) FROM CALL_ATTEMPTS WHERE task_id = t.task_id) as callCount,
                    (SELECT MAX(created_at) FROM CALL_ATTEMPTS WHERE task_id = t.task_id) as lastCallAt
                FROM VERIFICATION_TASKS t
                JOIN LOANS l ON t.loan_id = l.loan_id
                LEFT JOIN USERS u ON t.assigned_agent_id = u.user_id
                WHERE t.assigned_agent_id = @agentId
            `;

            const params = [{ name: 'agentId', value: agentId }];

            if (filters.status && filters.status !== 'all') {
                query += ` AND t.status = @status`;
                params.push({ name: 'status', value: filters.status });
            }

            if (filters.type && filters.type !== 'all') {
                query += ` AND t.task_type = @type`;
                params.push({ name: 'type', value: filters.type });
            }

            if (filters.searchText) {
                query += ` AND (t.loan_id LIKE @search OR l.customer_name LIKE @search)`;
                params.push({ name: 'search', value: `%${filters.searchText}%` });
            }

            query += ` ORDER BY t.due_datetime ASC, t.created_at DESC`;

            const result = await pool.request();
            params.forEach(p => result.input(p.name, p.value));
            const data = await result.query(query);

            return data.recordset || [];
        } catch (error) {
            console.error('❌ Error in getTasksByAgentDetailed:', error);
            return [];
        }
    },

    // ============ GET ALL TASKS WITH AGENT INFO ============
    async getAllTasksWithAgent(filters = {}) {
        try {
            const pool = await getConnection();

            let query = `
                SELECT 
                    t.task_id as id,
                    t.loan_id as loanId,
                    l.customer_name as customerName,
                    l.customer_phone as phone,
                    l.loan_amount as amount,
                    t.task_type as type,
                    t.status,
                    t.attempt_count as attempts,
                    t.created_at as createdAt,
                    t.due_datetime as dueTime,
                    t.assigned_agent_id as agentId,
                    u.full_name as agentName,
                    u.verification_type as agentType,
                    (SELECT COUNT(*) FROM CALL_ATTEMPTS WHERE task_id = t.task_id) as callCount,
                    (SELECT MAX(created_at) FROM CALL_ATTEMPTS WHERE task_id = t.task_id) as lastCallAt
                FROM VERIFICATION_TASKS t
                JOIN LOANS l ON t.loan_id = l.loan_id
                LEFT JOIN USERS u ON t.assigned_agent_id = u.user_id
                WHERE 1=1
            `;

            const params = [];

            if (filters.agentId && filters.agentId !== 'all') {
                query += ` AND t.assigned_agent_id = @agentId`;
                params.push({ name: 'agentId', value: filters.agentId });
            }

            if (filters.status && filters.status !== 'all') {
                query += ` AND t.status = @status`;
                params.push({ name: 'status', value: filters.status });
            }

            if (filters.type && filters.type !== 'all') {
                query += ` AND t.task_type = @type`;
                params.push({ name: 'type', value: filters.type });
            }

            if (filters.assignedOnly === 'true') {
                query += ` AND t.assigned_agent_id IS NOT NULL`;
            }

            if (filters.unassignedOnly === 'true') {
                query += ` AND t.assigned_agent_id IS NULL`;
            }

            if (filters.searchText) {
                query += ` AND (t.loan_id LIKE @search OR l.customer_name LIKE @search)`;
                params.push({ name: 'search', value: `%${filters.searchText}%` });
            }

            query += ` ORDER BY t.due_datetime ASC, t.created_at DESC`;

            const result = await pool.request();
            params.forEach(p => result.input(p.name, p.value));
            const data = await result.query(query);

            return data.recordset || [];
        } catch (error) {
            console.error('❌ Error in getAllTasksWithAgent:', error);
            return [];
        }
    },

    // ============ GET AGENT ASSIGNMENT SUMMARY ============
    async getAgentAssignmentSummary() {
        try {
            const pool = await getConnection();

            const result = await pool.request().query(`
                SELECT 
                    COUNT(*) as totalTasks,
                    SUM(CASE WHEN assigned_agent_id IS NULL THEN 1 ELSE 0 END) as unassigned,
                    SUM(CASE WHEN assigned_agent_id IS NOT NULL THEN 1 ELSE 0 END) as assigned,
                    COUNT(DISTINCT assigned_agent_id) as activeAgents,
                    COUNT(CASE WHEN assigned_agent_id IS NOT NULL AND status = 'IN_PROGRESS' THEN 1 END) as inProgress
                FROM VERIFICATION_TASKS
                WHERE status NOT IN ('CLOSED', 'CONFIRMED')
            `);

            return result.recordset[0] || {};
        } catch (error) {
            console.error('❌ Error in getAgentAssignmentSummary:', error);
            return {};
        }
    },

    // ============ GET AGENT PERFORMANCE METRICS ============
    async getAgentPerformanceMetrics(agentId = null) {
        try {
            const pool = await getConnection();

            let query = `
                SELECT 
                    u.user_id as agentId,
                    u.full_name as agentName,
                    u.verification_type as agentType,
                    COUNT(t.task_id) as totalAssigned,
                    COUNT(CASE WHEN t.status = 'CONFIRMED' THEN 1 END) as confirmed,
                    COUNT(CASE WHEN t.status = 'DISPUTED' THEN 1 END) as disputed,
                    COUNT(CASE WHEN t.status = 'NO_CONTACT' THEN 1 END) as noContact,
                    AVG(CASE WHEN a.duration_sec IS NOT NULL THEN a.duration_sec ELSE 0 END) as avgHandleTime,
                    COUNT(CASE WHEN t.status = 'CONFIRMED' THEN 1 END) * 100.0 / NULLIF(COUNT(t.task_id), 0) as successRate
                FROM USERS u
                LEFT JOIN VERIFICATION_TASKS t ON u.user_id = t.assigned_agent_id
                LEFT JOIN CALL_ATTEMPTS a ON t.task_id = a.task_id
                WHERE u.role = 'VERIFIER'
                AND u.status = 'ACTIVE'
            `;

            if (agentId) {
                query += ` AND u.user_id = @agentId`;
            }

            query += `
                GROUP BY u.user_id, u.full_name, u.verification_type
                ORDER BY successRate DESC, totalAssigned DESC
            `;

            const result = await pool.request();
            if (agentId) {
                result.input('agentId', agentId);
            }
            const data = await result.query(query);

            return data.recordset || [];
        } catch (error) {
            console.error('❌ Error in getAgentPerformanceMetrics:', error);
            return [];
        }
    }
};

export default agentAssignmentService;