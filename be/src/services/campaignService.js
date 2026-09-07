// src/services/campaignService.js
import { getConnection } from '../config/db.js';

export const campaignService = {
    // ============ TARGET LIST UPLOAD ============
    uploadTargetList: async(payload) => {
        const { taskType, rows } = payload;
        const createdTasks = [];
        const errors = [];

        if (!taskType) {
            return {
                success: false,
                error: 'taskType is required',
                totalRows: rows ? rows.length : 0,
                created: 0,
                assigned: 0
            };
        }
        if (!rows || rows.length === 0) {
            return {
                success: false,
                error: 'No rows provided',
                totalRows: 0,
                created: 0,
                assigned: 0
            };
        }

        try {
            const pool = await getConnection();

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    console.log(`📝 Processing row ${i + 1}/${rows.length}:`, row);

                    // Validate row
                    if (!row.loanId) {
                        errors.push(`Row ${i + 1}: loanId is required`);
                        continue;
                    }
                    if (!row.customerName) {
                        errors.push(`Row ${i + 1}: customerName is required`);
                        continue;
                    }
                    if (!row.phoneNumber) {
                        errors.push(`Row ${i + 1}: phoneNumber is required`);
                        continue;
                    }
                    if (!row.amount) {
                        errors.push(`Row ${i + 1}: amount is required`);
                        continue;
                    }

                    // 1. Check if loan exists
                    const loanCheck = await pool.request()
                        .input('loanId', row.loanId)
                        .query('SELECT loan_id FROM LOANS WHERE loan_id = @loanId');

                    // 2. If loan doesn't exist, create it
                    if (!loanCheck.recordset || loanCheck.recordset.length === 0) {
                        console.log(`📝 Creating loan: ${row.loanId}`);
                        await pool.request()
                            .input('loanId', row.loanId)
                            .input('customerName', row.customerName)
                            .input('phone', row.phoneNumber)
                            .input('amount', parseFloat(row.amount) || 0)
                            .input('importedAt', new Date())
                            .query(`
                                INSERT INTO LOANS (
                                    loan_id, 
                                    customer_name, 
                                    customer_phone, 
                                    loan_amount, 
                                    imported_at
                                )
                                VALUES (
                                    @loanId, 
                                    @customerName, 
                                    @phone, 
                                    @amount, 
                                    @importedAt
                                )
                            `);
                    }

                    // 3. Check if task already exists for this loan + type
                    const taskCheck = await pool
                        .request()
                        .input('loanId', row.loanId)
                        .input('taskType', taskType).query(`
                            SELECT task_id 
                            FROM VERIFICATION_TASKS 
                            WHERE loan_id = @loanId 
                            AND task_type = @taskType
                        `);

                    if (taskCheck.recordset && taskCheck.recordset.length > 0) {
                        errors.push(
                            `Task already exists for loan ${row.loanId} (${taskType})`
                        );
                        continue;
                    }

                    // 4. Create verification task
                    const dueDate = new Date();
                    dueDate.setHours(23, 59, 59, 999);

                    const taskResult = await pool
                        .request()
                        .input('loanId', row.loanId)
                        .input('taskType', taskType)
                        .input('dueDateTime', dueDate)
                        .input('status', 'PENDING').query(`
                            INSERT INTO VERIFICATION_TASKS (
                                loan_id, 
                                task_type, 
                                due_datetime, 
                                status
                            )
                            OUTPUT 
                                INSERTED.task_id as id,
                                INSERTED.loan_id as loanId,
                                INSERTED.task_type as taskType,
                                INSERTED.status,
                                INSERTED.due_datetime as dueDateTime
                            VALUES (
                                @loanId, 
                                @taskType, 
                                @dueDateTime, 
                                @status
                            )
                        `);

                    if (taskResult.recordset && taskResult.recordset.length > 0) {
                        createdTasks.push(taskResult.recordset[0]);
                    }
                } catch (rowError) {
                    console.error('Error processing row:', row, rowError);
                    errors.push(`Row ${i + 1}: ${rowError.message}`);
                }
            }

            // 5. Auto-assign tasks to agents if any were created
            let assignedCount = 0;
            if (createdTasks.length > 0) {
                try {
                    assignedCount = await assignTasksToAgents(createdTasks, taskType);
                } catch (assignError) {
                    console.error('❌ Error assigning tasks:', assignError);
                    errors.push(`Assignment error: ${assignError.message}`);
                }
            }

            const result = {
                success: createdTasks.length > 0 || errors.length === 0,
                totalRows: rows.length,
                created: createdTasks.length,
                assigned: assignedCount,
                errors: errors,
                tasks: createdTasks
            };

            return result;

        } catch (error) {
            console.error('❌ Error in uploadTargetList:', error);
            return {
                success: false,
                error: error.message,
                totalRows: rows ? rows.length : 0,
                created: 0,
                assigned: 0,
                errors: [error.message],
            };
        }
    },

    // ============ GET CAMPAIGNS ============
    getCampaigns: async(filters = {}) => {
        try {
            const pool = await getConnection();
            let query = `
                SELECT 
                    campaign_id as id,
                    name,
                    type,
                    description,
                    total_loans as totalLoans,
                    assigned,
                    completed,
                    confirmed,
                    disputed,
                    status,
                    start_date as startDate,
                    end_date as endDate,
                    created_by as createdBy,
                    created_at as createdAt,
                    updated_at as updatedAt
                FROM CAMPAIGNS
                WHERE 1=1
            `;

            const request = pool.request();

            if (filters.status && filters.status !== 'all') {
                query += ` AND status = @status`;
                request.input('status', filters.status);
            }

            if (filters.type && filters.type !== 'all') {
                query += ` AND type = @type`;
                request.input('type', filters.type);
            }

            query += ` ORDER BY created_at DESC`;

            const result = await request.query(query);
            return result.recordset || [];
        } catch (error) {
            console.error('❌ Error in getCampaigns:', error);
            return [];
        }
    },

    // ============ GET CAMPAIGN BY ID ============
    getCampaignById: async(campaignId) => {
        try {
            const pool = await getConnection();
            const result = await pool.request().input('id', campaignId).query(`
                    SELECT 
                        campaign_id as id,
                        name,
                        type,
                        description,
                        total_loans as totalLoans,
                        assigned,
                        completed,
                        confirmed,
                        disputed,
                        status,
                        start_date as startDate,
                        end_date as endDate,
                        created_by as createdBy,
                        created_at as createdAt,
                        updated_at as updatedAt
                    FROM CAMPAIGNS
                    WHERE campaign_id = @id
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('❌ Error in getCampaignById:', error);
            return null;
        }
    },

    // ============ CREATE CAMPAIGN ============
    createCampaign: async(campaignData) => {
        try {
            const pool = await getConnection();
            const result = await pool
                .request()
                .input('name', campaignData.name)
                .input('type', campaignData.type)
                .input('description', campaignData.description || '')
                .input('totalLoans', campaignData.totalLoans || 0)
                .input('startDate', campaignData.startDate || new Date())
                .input('endDate', campaignData.endDate || new Date())
                .input('createdBy', campaignData.createdBy || 1)
                .input('status', campaignData.status || 'DRAFT').query(`
                    INSERT INTO CAMPAIGNS (
                        name, type, description, total_loans, 
                        start_date, end_date, created_by, status
                    )
                    OUTPUT 
                        INSERTED.campaign_id as id,
                        INSERTED.name,
                        INSERTED.type,
                        INSERTED.status
                    VALUES (
                        @name, @type, @description, @totalLoans,
                        @startDate, @endDate, @createdBy, @status
                    )
                `);

            return result.recordset[0] || { success: true };
        } catch (error) {
            console.error('❌ Error in createCampaign:', error);
            return { success: false, error: error.message };
        }
    },

    // ============ UPDATE CAMPAIGN ============
    updateCampaign: async(campaignId, campaignData) => {
        try {
            const pool = await getConnection();
            await pool
                .request()
                .input('id', campaignId)
                .input('name', campaignData.name)
                .input('type', campaignData.type)
                .input('description', campaignData.description || '')
                .input('totalLoans', campaignData.totalLoans || 0)
                .input('startDate', campaignData.startDate || new Date())
                .input('endDate', campaignData.endDate || new Date())
                .input('status', campaignData.status || 'DRAFT').query(`
                    UPDATE CAMPAIGNS 
                    SET 
                        name = @name,
                        type = @type,
                        description = @description,
                        total_loans = @totalLoans,
                        start_date = @startDate,
                        end_date = @endDate,
                        status = @status,
                        updated_at = SYSUTCDATETIME()
                    WHERE campaign_id = @id
                `);

            return { success: true };
        } catch (error) {
            console.error('❌ Error in updateCampaign:', error);
            return { success: false, error: error.message };
        }
    },

    // ============ DELETE CAMPAIGN ============
    deleteCampaign: async(campaignId) => {
        try {
            const pool = await getConnection();
            await pool
                .request()
                .input('id', campaignId)
                .query('DELETE FROM CAMPAIGNS WHERE campaign_id = @id');
            return { success: true };
        } catch (error) {
            console.error('❌ Error in deleteCampaign:', error);
            return { success: false, error: error.message };
        }
    },
};

// ============================================
// HELPER FUNCTION: Assign Tasks to Agents
// ============================================
async function assignTasksToAgents(tasks, taskType) {
    try {
        const pool = await getConnection();

        // 1. Get active agents for this task type
        const agentsResult = await pool.request().input('taskType', taskType)
            .query(`
                SELECT 
                    user_id as id,
                    username,
                    full_name,
                    pbx_extension
                FROM USERS
                WHERE role = 'VERIFIER'
                AND verification_type = @taskType
                AND status = 'ACTIVE'
                ORDER BY user_id
            `);

        const agents = agentsResult.recordset || [];

        if (agents.length === 0) {
            console.log(`⚠️ No active agents found for ${taskType}`);
            return 0;
        }

        // 2. Get current workload for each agent
        const workloadMap = {};
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const workloadResult = await pool.request().input('agentId', agent.id)
                .query(`
                    SELECT COUNT(*) as count
                    FROM VERIFICATION_TASKS
                    WHERE assigned_agent_id = @agentId
                    AND status IN ('ASSIGNED', 'IN_PROGRESS')
                `);
            const record = workloadResult.recordset[0];
            workloadMap[agent.id] = record ? record.count : 0;
        }

        // 3. Sort agents by workload (least tasks first)
        const sortedAgents = [...agents].sort((a, b) => {
            const aWorkload = workloadMap[a.id] || 0;
            const bWorkload = workloadMap[b.id] || 0;
            return aWorkload - bWorkload;
        });

        // 4. Assign tasks in round-robin based on workload
        let assignedCount = 0;
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const agentIndex = i % sortedAgents.length;
            const agent = sortedAgents[agentIndex];

            if (!agent) {
                continue;
            }

            await pool
                .request()
                .input('taskId', task.id)
                .input('agentId', agent.id)
                .input('status', 'ASSIGNED').query(`
                    UPDATE VERIFICATION_TASKS
                    SET 
                        assigned_agent_id = @agentId,
                        status = @status,
                        updated_at = SYSUTCDATETIME()
                    WHERE task_id = @taskId
                `);

            assignedCount++;
        }

        console.log(
            `✅ Assigned ${assignedCount} tasks to ${sortedAgents.length} agents for ${taskType}`
        );
        return assignedCount;
    } catch (error) {
        console.error('❌ Error in assignTasksToAgents:', error);
        return 0;
    }
}

export default campaignService;