// src/services/dashboardService.js
import { getConnection } from '../config/db.js';

export const dashboardService = {
    // ============ ADMIN DASHBOARD ============
    getAdminStats: async() => {
        // Get user counts
        try {
            const pool = await getConnection();

            // Get user counts - Include VERIFIER as AGENT
            const userResult = await pool.request().query(`
                SELECT 
                    COUNT(*) as totalUsers,
                    SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) as admins,
                    SUM(CASE WHEN role = 'SUPERVISOR' THEN 1 ELSE 0 END) as supervisors,
                    SUM(CASE WHEN role = 'VERIFIER' OR role = 'AGENT' THEN 1 ELSE 0 END) as agents
                FROM USERS
                WHERE status = 'ACTIVE'
            `);

            // Get campaign stats
            const campaignResult = await pool.request().query(`
                SELECT 
                    COUNT(*) as activeCampaigns,
                    ISNULL(SUM(total_loans), 0) as campaignLoans
                FROM CAMPAIGNS
                WHERE status = 'ACTIVE'
            `);

            // Get today's calls
            // Get today's date
            const today = new Date().toISOString().slice(0, 10);
            // Get yesterday's date
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().slice(0, 10);

            const todayCallsResult = await pool.request().input('today', today)
                .query(`
                SELECT 
                    COUNT(*) as todayCalls,
                    SUM(CASE WHEN result = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmedCalls,
                   SUM(CASE WHEN result = 'DISPUTED' THEN 1 ELSE 0 END) as disputedCalls,
                    SUM(CASE WHEN result = 'NO_CONTACT' THEN 1 ELSE 0 END) as noContactCalls
                FROM CALL_ATTEMPTS
                WHERE CAST(created_at AS DATE) = @today
            `);
            // ✅ NEW: Get yesterday's calls
            const yesterdayCallsResult = await pool
                .request()
                .input('yesterday', yesterdayStr).query(`
                SELECT COUNT(*) as yesterdayCalls
                FROM CALL_ATTEMPTS
                WHERE CAST(created_at AS DATE) = @yesterday
            `);

            // Get total loans
            const taskResult = await pool.request().query(`
            SELECT 
                COUNT(*) as totalLoans,
                SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as completedTasks,
                SUM(CASE WHEN status IN ('ASSIGNED', 'IN_PROGRESS', 'PENDING') THEN 1 ELSE 0 END) as remainingTasks,
                SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END) as disputedTasks,
                SUM(CASE WHEN status = 'ESCALATED' THEN 1 ELSE 0 END) as escalatedTasks,
                SUM(CASE WHEN status = 'NO_CONTACT' THEN 1 ELSE 0 END) as noContactTasks,
                SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed
            FROM VERIFICATION_TASKS
            WHERE status NOT IN ('CLOSED')
        `);

            const users = userResult.recordset[0] || {};
            const campaigns = campaignResult.recordset[0] || {};
            const todayCalls = todayCallsResult.recordset[0] || {};
            const yesterdayCalls = yesterdayCallsResult.recordset[0] || {};
            const tasks = taskResult.recordset[0] || {};

            // ✅ Calculate remaining properly
            const totalVerifications = tasks.totalLoans || 0;
            const completed = tasks.completedTasks || 0;
            const disputed = tasks.disputedTasks || 0;
            const escalated = tasks.escalatedTasks || 0;
            const noContact = tasks.noContactTasks || 0;
            const remaining = tasks.remainingTasks || 0;
            // 🔴 TOTAL EXCEPTIONS = Disputed Tasks + Escalated Tasks
            // (Customer disputes + System escalations)
            const exceptions = disputed + escalated;

            // 📊 TODAY'S EXCEPTIONS = Disputed Calls Today
            const todayDisputes = todayCalls.disputedCalls || 0;
            // Calculate percentage change
            const todayCallsCount = todayCalls.todayCalls || 0;
            const yesterdayCallsCount = yesterdayCalls.yesterdayCalls || 0;

            let percentageChange = 0;
            if (yesterdayCallsCount > 0) {
                percentageChange =
                    ((todayCallsCount - yesterdayCallsCount) / yesterdayCallsCount) * 100;
            } else if (todayCallsCount > 0 && yesterdayCallsCount === 0) {
                percentageChange = 100; // Infinite growth from zero
            }
            // Round to 1 decimal place
            percentageChange = Math.round(percentageChange * 10) / 10;

            console.log('📊 Admin Stats:', {
                users,
                campaigns,
                todayCalls: { todayCallsCount, ...todayCalls },
                yesterdayCalls: yesterdayCallsCount,
                tasks: {
                    totalVerifications,
                    completed,
                    exceptions,
                    remaining: tasks.remaining,
                },
                percentageChange,
            });

            return {
                totalUsers: users.totalUsers || 0,
                agents: users.agents || 0,
                supervisors: users.supervisors || 0,
                admins: users.admins || 0,

                activeCampaigns: campaigns.activeCampaigns || 0,
                campaignLoans: campaigns.campaignLoans || 0,

                todayCalls: todayCalls.todayCalls || 0,
                confirmedCallsToday: todayCalls.confirmedCalls || 0,
                disputedCallsToday: todayDisputes,
                noContactCallsToday: todayCalls.noContactCalls || 0,
                yesterdayCalls: yesterdayCallsCount,
                percentageChange: percentageChange,

                // Verification stats (from VERIFICATION_TASKS - CURRENT STATUS)
                totalVerifications: totalVerifications,
                completed: completed,
                remaining: remaining,
                // ✅ EXCEPTIONS = ONLY from VERIFICATION_TASKS (current status)
                exceptions: exceptions,
                disputedTasks: tasks.disputedTasks || 0,
                escalatedTasks: tasks.escalatedTasks || 0,
                noContactTasks: tasks.noContactTasks || 0,

                completionRate: totalVerifications > 0 ?
                    ((completed / totalVerifications) * 100).toFixed(1) : 0,
            };
        } catch (error) {
            console.error('Error in getAdminStats:', error);
            // Return fallback data
            return {
                totalUsers: 0,
                agents: 0,
                supervisors: 0,
                admins: 0,
                activeCampaigns: 0,
                campaignLoans: 0,
                todayCalls: 0,
                confirmedCallsToday: 0,
                disputedCallsToday: 0,
                noContactCallsToday: 0,
                yesterdayCalls: 0,
                percentageChange: 0,
                totalVerifications: 0,
                completed: 0,
                remaining: 0,
                exceptions: 0,
                disputedTasks: 0,
                escalatedTasks: 0,
                noContactTasks: 0,
                completionRate: 0,
            };
        }
    },
    // ============ SUPERVISOR DASHBOARD ============
    getSupervisorStats: async() => {
        try {
            const pool = await getConnection();
            const result = await pool.request().query(`
                SELECT 
                    COUNT(*) as totalAssigned,
                    SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status IN ('ASSIGNED', 'IN_PROGRESS', 'PENDING') THEN 1 ELSE 0 END) as remaining,
                    SUM(CASE WHEN status IN ('DISPUTED', 'ESCALATED') THEN 1 ELSE 0 END) as exceptions
                FROM VERIFICATION_TASKS
                WHERE status NOT IN ('CLOSED')
            `);

            const stats = result.recordset[0] || {};
            return {
                ...stats,
                completionRate: stats.totalAssigned > 0 ?
                    ((stats.completed / stats.totalAssigned) * 100).toFixed(1) : 0,
            };
        } catch (error) {
            console.error('Error in getSupervisorStats:', error);
            return {
                totalAssigned: 0,
                completed: 0,
                remaining: 0,
                exceptions: 0,
                completionRate: 0,
            };
        }
    },
    // ============ AGENT DASHBOARD ============
    getAgentStats: async(agentId) => {
        try {
            const pool = await getConnection();
            const result = await pool.request().input('agentId', agentId).query(`
                    SELECT 
                        COUNT(*) as todayQueue,
                        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as completed,
                        SUM(CASE WHEN status IN ('ASSIGNED', 'IN_PROGRESS', 'PENDING') THEN 1 ELSE 0 END) as pending,
                        SUM(CASE WHEN status IN ('DISPUTED', 'ESCALATED') THEN 1 ELSE 0 END) as exceptions
                    FROM VERIFICATION_TASKS
                    WHERE assigned_agent_id = @agentId
                    AND status NOT IN ('CLOSED')
                `);

            const stats = result.recordset[0] || {};
            return {
                ...stats,
                completionRate: stats.todayQueue > 0 ?
                    ((stats.completed / stats.todayQueue) * 100).toFixed(1) : 0,
            };
        } catch (error) {
            console.error('Error in getAgentStats:', error);
            return {
                todayQueue: 0,
                completed: 0,
                pending: 0,
                exceptions: 0,
                completionRate: 0,
            };
        }
    },

    // ============ TOP BRANCHES ============
    getTopBranches: async() => {
        try {
            const pool = await getConnection();
            const result = await pool.request().query(`
                SELECT TOP 5
                    b.branch_name as name,
                    ISNULL(
                        COUNT(CASE WHEN t.status = 'CONFIRMED' THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(t.task_id), 0), 
                        0
                    ) as completionRate
                FROM BRANCHES b
                LEFT JOIN LOANS l ON b.branch_id = l.branch_id
                LEFT JOIN VERIFICATION_TASKS t ON l.loan_id = t.loan_id
                GROUP BY b.branch_name
                HAVING COUNT(t.task_id) > 0
                ORDER BY completionRate DESC
            `);

            if (result.recordset.length === 0) {
                return [
                    { name: 'Yangon Division', completionRate: 0.0 },
                    { name: 'Ayeyarwady Division', completionRate: 0.0 },
                    { name: 'Magway Division', completionRate: 0.0 },
                    { name: 'Shan State', completionRate: 0.0 },
                    { name: ' --- Division', completionRate: 0.0 },
                ];
            }
            return result.recordset;
        } catch (error) {
            console.log('Error fetching branches, using fallback:', error.message);
            return [
                { name: 'Yangon Division', completionRate: 0.0 },
                { name: 'Ayeyarwady Division', completionRate: 0.0 },
                { name: 'Magway Division', completionRate: 0.0 },
                { name: 'Shan State', completionRate: 0.0 },
                { name: ' --- Division', completionRate: 0.0 },
            ];
        }
    },

    // ============ SYSTEM NOTICES ============
    getSystemNotices: async() => {
        try {
            console.log('📡 Fetching system notices...');
            const pool = await getConnection();

            const result = await pool.request().query(`
                SELECT TOP 5
                    type,
                    message,
                    CAST(date AS DATE) as date
                FROM SYSTEM_NOTICES
                WHERE is_active = 1
                ORDER BY created_at DESC
            `);

            console.log('📊 Notices query result:', result.recordset);

            if (result.recordset.length === 0) {
                return [{
                        type: 'info',
                        message: 'System is running normally',
                        date: new Date().toISOString().slice(0, 10),
                    },
                    {
                        type: 'success',
                        message: 'Welcome to Happy Call System',
                        date: new Date().toISOString().slice(0, 10),
                    },
                ];
            }

            return result.recordset;
        } catch (error) {
            console.log('ℹ️ Error fetching notices, using fallback:', error.message);
            return [{
                    type: 'info',
                    message: 'System is running normally',
                    date: new Date().toISOString().slice(0, 10),
                },
                {
                    type: 'success',
                    message: 'Welcome to Happy Call System',
                    date: new Date().toISOString().slice(0, 10),
                },
                {
                    type: 'warning',
                    message: 'Everything running flawlessly, but This is fall back, so something wrong',
                    date: new Date().toISOString().slice(0, 10),
                },
            ];
        }
    },

    // ============ EXCEPTION BY TYPE ============
    getExceptionByType: async() => {
        try {
            const pool = await getConnection();
            const result = await pool.request().query(`
                SELECT 
                    dispute_reason as name,
                    COUNT(*) as value
                FROM CALL_ATTEMPTS
                WHERE result = 'DISPUTED'
                AND dispute_reason IS NOT NULL
                GROUP BY dispute_reason
            `);

            if (result.recordset.length === 0) {
                return [
                    { name: 'Amount Mismatch', value: 45, percent: 45 },
                    { name: 'Not Received', value: 30, percent: 30 },
                    { name: 'Other', value: 25, percent: 25 },
                ];
            }

            const total = result.recordset.reduce((sum, r) => sum + r.value, 0);
            return result.recordset.map((r) => ({
                ...r,
                percent: total > 0 ? (r.value / total) * 100 : 0,
            }));
        } catch (error) {
            console.log('Error fetching exceptions, using fallback:', error.message);
            return [
                { name: 'Amount Mismatch', value: 0, percent: 0 },
                { name: 'Not Received', value: 0, percent: 0 },
                { name: 'Other', value: 0, percent: 0 },
            ];
        }
    },

    // ============ CRITICAL EXCEPTIONS ============
    getCriticalExceptions: async() => {
        try {
            const pool = await getConnection();
            const result = await pool.request().query(`
                SELECT TOP 5
                    a.attempt_id as id,
                    FORMAT(a.created_at, 'HH:mm') as time,
                    l.customer_name as customer,
                    t.loan_id as loanId,
                    a.dispute_reason as reason
                FROM CALL_ATTEMPTS a
                JOIN VERIFICATION_TASKS t ON a.task_id = t.task_id
                JOIN LOANS l ON t.loan_id = l.loan_id
                WHERE a.result = 'DISPUTED'
                ORDER BY a.created_at DESC
            `);

            if (result.recordset.length === 0) {
                return [{
                        id: 1,
                        time: '09:15',
                        customer: 'John Dela Cruz',
                        loanId: 'LN-2026-00123',
                        reason: 'Amount Mismatch',
                    },
                    {
                        id: 2,
                        time: '08:45',
                        customer: 'Maria Santos',
                        loanId: 'LN-2026-00456',
                        reason: 'Not Received',
                    },
                    {
                        id: 3,
                        time: '08:20',
                        customer: 'Jose Rizal',
                        loanId: 'LN-2026-00789',
                        reason: 'Other',
                    },
                ];
            }

            return result.recordset;
        } catch (error) {
            console.log(
                'Error fetching critical exceptions, using fallback:',
                error.message
            );
            return [{
                    id: 1,
                    time: '09:15',
                    customer: 'John Dela Cruz',
                    loanId: 'LN-2026-00123',
                    reason: 'Amount Mismatch',
                },
                {
                    id: 2,
                    time: '08:45',
                    customer: 'Maria Santos',
                    loanId: 'LN-2026-00456',
                    reason: 'Not Received',
                },
                {
                    id: 3,
                    time: '08:20',
                    customer: 'Jose Rizal',
                    loanId: 'LN-2026-00789',
                    reason: 'Other',
                },
            ];
        }
    },
};

//