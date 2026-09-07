// src/services/attemptService.js
import { getConnection } from '../config/db.js';

export const attemptService = {

    // ============ SAVE CALL ATTEMPT ============
    saveAttempt: async(data) => {
        const pool = await getConnection();

        try {
            console.log('💾 Saving attempt with data:', data);

            // Validate required fields
            if (!data.taskId) {
                throw new Error('taskId is required');
            }
            if (!data.agentId) {
                throw new Error('agentId is required');
            }
            if (!data.result) {
                throw new Error('result is required');
            }

            // ✅ Validate result is valid
            const validResults = ['CONFIRMED', 'DISPUTED', 'NO_CONTACT'];
            if (!validResults.includes(data.result)) {
                throw new Error(`Invalid result: ${data.result}. Must be one of: ${validResults.join(', ')}`);
            }

            // Insert call attempt (immutable)
            const result = await pool.request()
                .input('taskId', data.taskId)
                .input('agentId', data.agentId)
                .input('callMethod', data.callMethod || 'CLICK_TO_CALL')
                .input('result', data.result)
                .input('notes', data.notes || '')
                .input('duration', data.duration || 0)
                .input('disputeReason', data.disputeReason || null)
                .input('noContactReason', data.noContactReason || null)
                .input('manualReason', data.manualReason || null)
                .input('manualReasonDetail', data.manualReasonDetail || null)
                .query(`
                    INSERT INTO CALL_ATTEMPTS (
                        task_id, 
                        agent_id, 
                        call_method, 
                        result, 
                        notes, 
                        duration_sec, 
                        dispute_reason, 
                        no_contact_reason,
                        manual_reason,
                        manual_reason_detail
                    )
                    OUTPUT 
                        INSERTED.attempt_id as id,
                        INSERTED.task_id as taskId,
                        INSERTED.agent_id as agentId,
                        INSERTED.call_method as callMethod,
                        INSERTED.result,
                        INSERTED.notes,
                        INSERTED.duration_sec as duration,
                        INSERTED.dispute_reason as disputeReason,
                        INSERTED.no_contact_reason as noContactReason,
                        INSERTED.created_at as createdAt
                    VALUES (
                        @taskId, 
                        @agentId, 
                        @callMethod, 
                        @result, 
                        @notes, 
                        @duration, 
                        @disputeReason, 
                        @noContactReason,
                        @manualReason,
                        @manualReasonDetail
                    )
                `);

            const attempt = result.recordset[0];

            // Update task status based on result
            const statusMap = {
                'CONFIRMED': 'CONFIRMED',
                'DISPUTED': 'DISPUTED',
                'NO_CONTACT': 'NO_CONTACT'
            };

            const newStatus = statusMap[data.result] || 'NO_CONTACT';

            await pool.request()
                .input('taskId', data.taskId)
                .input('status', newStatus)
                .query(`
                    UPDATE VERIFICATION_TASKS 
                    SET 
                        status = @status,
                        updated_at = SYSUTCDATETIME()
                    WHERE task_id = @taskId
                `);

            // If DISPUTED, log exception
            if (data.result === 'DISPUTED') {
                await logException(data.taskId, data);
            }

            // If NO_CONTACT, schedule retry
            if (data.result === 'NO_CONTACT') {
                await scheduleRetry(data.taskId, data.noContactReason);
            }

            await pool.request()
                .input('taskId', data.taskId)
                .input('status', newStatus)
                .query(`
                UPDATE VERIFICATION_TASKS 
                SET 
                    status = @status,
                    updated_at = SYSUTCDATETIME()
                WHERE task_id = @taskId
            `);

            console.log('✅ Attempt saved:', attempt);
            return attempt;

        } catch (error) {
            console.error('❌ Error saving attempt:', error);
            throw error;
        }
    },

    // ============ GET ATTEMPTS BY TASK ============
    getAttemptsByTask: async(taskId) => {
        const pool = await getConnection();
        try {
            const result = await pool.request()
                .input('taskId', taskId)
                .query(`
                    SELECT 
                        a.attempt_id as id,
                        a.task_id as taskId,
                        a.agent_id as agentId,
                        u.full_name as agentName,
                        a.call_method as callMethod,
                        a.result,
                        a.notes,
                        a.duration_sec as duration,
                        a.dispute_reason as disputeReason,
                        a.no_contact_reason as noContactReason,
                        a.created_at as createdAt,
                        FORMAT(a.created_at, 'yyyy-MM-dd hh:mm tt') as timestamp
                    FROM CALL_ATTEMPTS a
                    LEFT JOIN USERS u ON a.agent_id = u.user_id
                    WHERE a.task_id = @taskId
                    ORDER BY a.created_at DESC
                `);
            return result.recordset;
        } catch (error) {
            console.error('❌ Error fetching attempts by task:', error);
            throw error;
        }
    },

    // ============ GET ATTEMPTS BY AGENT ============
    getAttemptsByAgent: async(agentId, limit = 1000) => {
        const pool = await getConnection();
        try {

            const validLimit = parseInt(limit) || 1000;

            const result = await pool.request()
                .input('agentId', agentId)
                .input('limit', validLimit)
                .query(`
                    SELECT TOP (@limit)
                        a.attempt_id as id,
                        a.task_id as taskId,
                        t.loan_id as loanId,
                        l.customer_name as customerName,
                        l.customer_phone as phone,
                        t.task_type as type,
                        a.call_method as callMethod,
                        a.result,
                        a.notes,
                        a.duration_sec as duration,
                        a.dispute_reason as disputeReason,
                        a.no_contact_reason as noContactReason,
                        a.created_at as createdAt,
                        FORMAT(a.created_at, 'yyyy-MM-dd hh:mm tt') as timestamp
                    FROM CALL_ATTEMPTS a
                    JOIN VERIFICATION_TASKS t ON a.task_id = t.task_id
                    JOIN LOANS l ON t.loan_id = l.loan_id
                    WHERE a.agent_id = @agentId
                    ORDER BY a.created_at DESC
                `);
            return result.recordset;
        } catch (error) {
            console.error('❌ Error fetching attempts by agent:', error);
            throw error;
        }
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Log exception when a dispute is reported
async function logException(taskId, data) {
    try {
        const pool = await getConnection();

        // Get task and loan details
        const taskResult = await pool.request()
            .input('taskId', taskId)
            .query(`
                SELECT 
                    t.task_id,
                    t.loan_id,
                    t.task_type,
                    l.customer_name,
                    l.customer_phone,
                    l.loan_amount
                FROM VERIFICATION_TASKS t
                JOIN LOANS l ON t.loan_id = l.loan_id
                WHERE t.task_id = @taskId
            `);

        const task = taskResult.recordset[0];

        if (!task) {
            console.error('❌ Task not found for exception logging:', taskId);
            return;
        }

        // Insert exception
        await pool.request()
            .input('taskId', taskId)
            .input('loanId', task.loan_id)
            .input('customerName', task.customer_name)
            .input('phone', task.customer_phone)
            .input('type', task.task_type)
            .input('amount', task.loan_amount)
            .input('severity', 'HIGH')
            .input('status', 'DISPUTED')
            .input('disputeReason', data.disputeReason || 'OTHER')
            .input('description', 'Customer dispute reported during verification call')
            .input('reportedBy', data.agentId || null)
            .input('notes', data.notes || '')
            .input('attempts', 1)
            .query(`
                INSERT INTO EXCEPTIONS (
                    task_id,
                    loan_id,
                    customer_name,
                    phone,
                    type,
                    amount,
                    severity,
                    status,
                    dispute_reason,
                    description,
                    reported_by,
                    notes,
                    attempts
                )
                VALUES (
                    @taskId,
                    @loanId,
                    @customerName,
                    @phone,
                    @type,
                    @amount,
                    @severity,
                    @status,
                    @disputeReason,
                    @description,
                    @reportedBy,
                    @notes,
                    @attempts
                )
            `);

        console.log('✅ Exception logged for task:', taskId);
    } catch (error) {
        console.error('❌ Error logging exception:', error);
    }
}

// Schedule retry for NO_CONTACT attempts
async function scheduleRetry(taskId, reason) {
    try {
        const pool = await getConnection();

        // Get current attempt count
        const result = await pool.request()
            .input('taskId', taskId)
            .query(`
                SELECT attempt_count
                FROM VERIFICATION_TASKS
                WHERE task_id = @taskId
            `);

        const record = result.recordset[0];
        const attemptCount = record ? record.attempt_count : 0;

        if (attemptCount < 3) {
            // Reset to ASSIGNED for retry
            await pool.request()
                .input('taskId', taskId)
                .input('status', 'ASSIGNED')
                .query(`
                    UPDATE VERIFICATION_TASKS
                    SET 
                        status = @status,
                        updated_at = SYSUTCDATETIME()
                    WHERE task_id = @taskId
                `);
            console.log(`🔄 Retry scheduled for task ${taskId} (attempt ${attemptCount + 1})`);
        } else {
            // Escalate if max retries reached (3 attempts)
            await pool.request()
                .input('taskId', taskId)
                .input('status', 'ESCALATED')
                .query(`
                    UPDATE VERIFICATION_TASKS
                    SET 
                        status = @status,
                        updated_at = SYSUTCDATETIME()
                    WHERE task_id = @taskId
                `);
            console.log(`⚠️ Task ${taskId} escalated to supervisor (max retries reached)`);
        }
    } catch (error) {
        console.error('❌ Error scheduling retry:', error);
    }
}

export default attemptService;