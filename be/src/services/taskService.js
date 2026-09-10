// src/services/taskService.js
import { getConnection } from '../config/db.js';

export const taskService = {
        // ============ GET TASKS ============
        getTasks: async({ status, type, searchText } = {}) => {
            const pool = await getConnection();
            let query = `
            SELECT 
                t.task_id as id,
                t.loan_id as loanId,
                l.customer_name as customerName,
                l.customer_phone as phone,
                t.task_type as type,
                l.loan_amount as amount,
                t.status,
                t.attempt_count as attempts,
                t.assigned_agent_id as agentId,
                u.full_name as agentName,
                t.created_at as createdAt,
                t.due_datetime as dueTime
            FROM VERIFICATION_TASKS t
            LEFT JOIN LOANS l ON t.loan_id = l.loan_id
            LEFT JOIN USERS u ON t.assigned_agent_id = u.user_id
            WHERE 1=1
        `;
            const params = [];

            if (status) {
                query += ` AND t.status = @status`;
                params.push({ name: 'status', value: status });
            }

            if (type && type !== 'all') {
                query += ` AND t.task_type = @type`;
                params.push({ name: 'type', value: type });
            }

            if (searchText) {
                query += ` AND (t.loan_id LIKE @search OR l.customer_name LIKE @search)`;
                params.push({ name: 'search', value: `%${searchText}%` });
            }

            query += ` ORDER BY t.created_at DESC`;

            const result = await pool.request();
            params.forEach((p) => result.input(p.name, p.value));
            const data = await result.query(query);
            return data.recordset;
        },

        // ============ GET TASKS BY AGENT ============
        getTasksByAgent: async(agentId, { status, type, searchText } = {}) => {
            const pool = await getConnection();
            let query = `
            SELECT 
                t.task_id as id,
                t.loan_id as loanId,
                l.customer_name as customerName,
                l.customer_phone as phone,
                t.task_type as type,
                l.loan_amount as amount,
                t.status,
                t.attempt_count as attempts,
                t.assigned_agent_id as agentId,
                u.full_name as agentName,
                t.created_at as createdAt,
                t.due_datetime as dueTime
            FROM VERIFICATION_TASKS t
            LEFT JOIN LOANS l ON t.loan_id = l.loan_id
            LEFT JOIN USERS u ON t.assigned_agent_id = u.user_id
            WHERE t.assigned_agent_id = @agentId --
        `;
            const params = [{ name: 'agentId', value: agentId }];

            if (status && status !== 'active') {
                query += ` AND t.status = @status`;
                params.push({ name: 'status', value: status });
            } else if (status === 'active') {
                query += ` AND t.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')`;
            }

            if (type && type !== 'all') {
                query += ` AND t.task_type = @type`;
                params.push({ name: 'type', value: type });
            }

            if (searchText) {
                query += ` AND (t.loan_id LIKE @search OR l.customer_name LIKE @search)`;
                params.push({ name: 'search', value: `%${searchText}%` });
            }

            query += ` ORDER BY t.due_datetime ASC, t.created_at DESC`;

            const result = await pool.request();
            params.forEach((p) => result.input(p.name, p.value));
            const data = await result.query(query);
            return data.recordset;
        },

        // ============ GET TASKS BY STATUS ============
        getTasksByStatus: async(statuses, type) => {
                const pool = await getConnection();
                let query = `
            SELECT 
                t.task_id as id,
                t.loan_id as loanId,
                l.customer_name as customerName,
                l.customer_phone as phone,
                t.task_type as type,
                l.loan_amount as amount,
                t.status,
                t.attempt_count as attempts,
                t.assigned_agent_id as agentId,
                u.full_name as agentName,
                t.created_at as createdAt,
                t.due_datetime as dueTime
            FROM VERIFICATION_TASKS t
            LEFT JOIN LOANS l ON t.loan_id = l.loan_id
            LEFT JOIN USERS u ON t.assigned_agent_id = u.user_id
            WHERE t.status IN (${statuses.map((s) => `'${s}'`).join(',')})
        `;

    if (type && type !== 'all') {
      query += ` AND t.task_type = @type`;
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.request();
    if (type && type !== 'all') {
      result.input('type', type);
    }
    const data = await result.query(query);
    return data.recordset;
  },

  // ============ GET TASK BY ID ============
  getTaskById: async (id) => {
    const pool = await getConnection();
    const result = await pool.request().input('id', id).query(`
                SELECT 
                    t.task_id as id,
                    t.loan_id as loanId,
                    l.customer_name as customerName,
                    l.customer_phone as phone,
                    t.task_type as type,
                    l.loan_amount as amount,
                    t.status,
                    t.attempt_count as attempts,
                    t.assigned_agent_id as agentId,
                    u.full_name as agentName,
                    t.created_at as createdAt,
                    t.due_datetime as dueTime
                FROM VERIFICATION_TASKS t
                LEFT JOIN LOANS l ON t.loan_id = l.loan_id
                LEFT JOIN USERS u ON t.assigned_agent_id = u.user_id
                WHERE t.task_id = @id
            `);
    return result.recordset[0];
  },

  // ============ CREATE TASK ============
  createTask: async (data) => {
    const pool = await getConnection();

    // First check if loan exists
    const loanCheck = await pool
      .request()
      .input('loanId', data.loanId)
      .query('SELECT loan_id FROM LOANS WHERE loan_id = @loanId');

    if (loanCheck.recordset.length === 0) {
      // Create loan if it doesn't exist
      await pool
        .request()
        .input('loanId', data.loanId)
        .input('customerName', data.customerName)
        .input('phone', data.phone)
        .input('amount', data.amount || 0).query(`
                    INSERT INTO LOANS (loan_id, customer_name, customer_phone, loan_amount, disbursement_date)
                    VALUES (@loanId, @customerName, @phone, @amount, GETDATE())
                `);
    }

    const result = await pool
      .request()
      .input('loanId', data.loanId)
      .input('taskType', data.type || 'DISBURSEMENT')
      .input('assignedAgentId', data.assignedTo || null)
      .input('dueDateTime', data.dueTime || new Date())
      .input('status', data.status || 'ASSIGNED').query(`
                INSERT INTO VERIFICATION_TASKS (loan_id, task_type, assigned_agent_id, due_datetime, status)
                OUTPUT INSERTED.*
                VALUES (@loanId, @taskType, @assignedAgentId, @dueDateTime, @status)
            `);
    return result.recordset[0];
  },

  // ============ UPDATE TASK STATUS ============
  updateTaskStatus: async (id, status, agentId) => {
    const pool = await getConnection();
    await pool
      .request()
      .input('id', id)
      .input('status', status)
      .input('agentId', agentId).query(`
                UPDATE VERIFICATION_TASKS 
                SET status = @status, 
                    assigned_agent_id = @agentId,
                    updated_at = SYSUTCDATETIME()
                WHERE task_id = @id
            `);
    return { success: true };
  },

  // ============ SAVE CALL ATTEMPT ============
  saveAttempt: async (data) => {
    const pool = await getConnection();

    const result = data.result || 'NO_CONTACT';

    const attemptResult = await pool
      .request()
      .input('taskId', data.taskId)
      .input('agentId', data.agentId)
      .input('callMethod', data.callMethod || 'CLICK_TO_CALL')
      .input('result', result)
      .input('notes', data.notes || '')
      .input('duration', data.duration || 0)
      .input('disputeReason', data.disputeReason || null)
      .input('noContactReason', data.noContactReason || null)
      .input('manualReason', data.manualReason || null)
      .input('manualReasonDetail', data.manualReasonDetail || null).query(`
                INSERT INTO CALL_ATTEMPTS (
                    task_id, agent_id, call_method, result, 
                    notes, duration_sec, dispute_reason, no_contact_reason,
                    manual_reason, manual_reason_detail
                )
                OUTPUT INSERTED.*
                VALUES (
                    @taskId, @agentId, @callMethod, @result,
                    @notes, @duration, @disputeReason, @noContactReason,
                    @manualReason, @manualReasonDetail
                )
            `);

    // Update task status
    await pool.request().input('taskId', data.taskId).input('result', result)
      .query(`
                UPDATE VERIFICATION_TASKS 
                SET status = @result,
                    updated_at = SYSUTCDATETIME()
                WHERE task_id = @taskId
            `);

    return attemptResult.recordset[0];
  },

  // ============ ASSIGN TASKS TO AGENTS (Manual) ============
  assignTasksToAgents: async (taskIds, agentId) => {
    try {
      const pool = await getConnection();

      // Verify agent exists and is active
      const agentCheck = await pool.request().input('agentId', agentId).query(`
                    SELECT user_id, role, verification_type, status
                    FROM USERS
                    WHERE user_id = @agentId
                    AND status = 'ACTIVE'
                    AND role = 'VERIFIER'
                `);

      if (!agentCheck.recordset || agentCheck.recordset.length === 0) {
        throw new Error('Invalid or inactive agent');
      }

     const taskIdsString = taskIds
    .map((id) => parseInt(id, 10))
    .filter((n) => !isNaN(n))
    .join(',');
      const result = await pool.request().input('agentId', agentId).query(`
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
        assigned: result.rowsAffected[0],
      };
    } catch (error) {
      console.error('❌ Error in assignTasksToAgents:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ AUTO-ASSIGN PENDING TASKS ============
  autoAssignPendingTasks: async (taskType) => {
    try {
      const pool = await getConnection();

      // Get pending tasks for this type
      const tasksResult = await pool.request().input('taskType', taskType)
        .query(`
                    SELECT 
                        task_id as id,
                        loan_id as loanId,
                        task_type as taskType
                    FROM VERIFICATION_TASKS
                    WHERE status = 'PENDING'
                    AND task_type = @taskType
                    ORDER BY created_at ASC
                `);

      const tasks = tasksResult.recordset || [];

      if (tasks.length === 0) {
        return { success: true, assigned: 0, message: 'No pending tasks' };
      }

      // Get active agents for this task type
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
        return {
          success: false,
          assigned: 0,
          message: `No active agents for ${taskType}`,
        };
      }

      // Get current workload for each agent
      const workloadMap = {};
      for (const agent of agents) {
        const workloadResult = await pool.request().input('agentId', agent.id)
          .query(`
                        SELECT COUNT(*) as count
                        FROM VERIFICATION_TASKS
                        WHERE assigned_agent_id = @agentId
                        AND status IN ('ASSIGNED', 'IN_PROGRESS')
                    `);
        workloadMap[agent.id] = workloadResult.recordset[0].count || 0;
      }

      // Sort agents by workload
      const sortedAgents = [...agents].sort((a, b) => {
        return (workloadMap[a.id] || 0) - (workloadMap[b.id] || 0);
      });

      // Assign tasks in round-robin
      let assignedCount = 0;
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const agentIndex = i % sortedAgents.length;
        const agent = sortedAgents[agentIndex];

        await pool.request().input('taskId', task.id).input('agentId', agent.id)
          .query(`
                        UPDATE VERIFICATION_TASKS
                        SET 
                            assigned_agent_id = @agentId,
                            status = 'ASSIGNED',
                            updated_at = SYSUTCDATETIME()
                        WHERE task_id = @taskId
                    `);

        assignedCount++;
      }

      return {
        success: true,
        assigned: assignedCount,
        message: `Assigned ${assignedCount} tasks to ${sortedAgents.length} agents`,
      };
    } catch (error) {
      console.error('❌ Error in autoAssignPendingTasks:', error);
      return { success: false, error: error.message };
    }
  },

  // ============ GET UNASSIGNED TASKS ============
  getUnassignedTasks: async (taskType, campaignAssigned) => {
    try {
      const pool = await getConnection();
      const request = pool.request();

      let query = `
            SELECT 
                t.task_id as id,
                t.loan_id as loanId,
                l.customer_name as customerName,
                l.customer_phone as phone,
                t.task_type as type,
                l.loan_amount as amount,
                t.status,
                t.attempt_count as attempts,
                t.created_at as createdAt,
                t.due_datetime as dueTime,
                l.campaign_id,
                c.name AS campaign_name,
                CASE WHEN l.campaign_id IS NULL THEN 0 ELSE 1 END AS campaign_assigned
            FROM VERIFICATION_TASKS t
            LEFT JOIN LOANS l ON t.loan_id = l.loan_id
            LEFT JOIN CAMPAIGNS c ON l.campaign_id = c.campaign_id
            WHERE t.status = 'PENDING'
              AND t.assigned_agent_id IS NULL
        `;

      if (taskType && taskType !== 'all') {
        query += ` AND t.task_type = @taskType`;
        request.input('taskType', taskType);
      }

      if (campaignAssigned === 0) {
        query += ` AND l.campaign_id IS NULL`;
      } else if (campaignAssigned === 1) {
        query += ` AND l.campaign_id IS NOT NULL`;
      }

      query += ` ORDER BY t.created_at ASC`;
console.log('🔍 UNASSIGNED SQL:', query);
console.log('🔍 UNASSIGNED params:', { taskType, campaignAssigned });
      const result = await request.query(query);
      return result.recordset || [];
    } catch (error) {
      console.error('❌ Error in getUnassignedTasks:', error);
      console.error('❌ Full:', error);
      return [];
    }
  },
};

export default taskService;