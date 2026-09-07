// src/services/reportService.js
import { getConnection } from '../config/db.js';

export const reportService = {
    getAgentPerformance: async({ role } = {}) => {
        try {
            const pool = await getConnection();
            let query = `
                SELECT 
                    u.user_id as id,
                    u.full_name as name,
                    u.role,
                    u.verification_type as verificationType,
                    COUNT(t.task_id) as assigned,
                    SUM(CASE WHEN t.status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
                    SUM(CASE WHEN t.status = 'DISPUTED' THEN 1 ELSE 0 END) as disputed,
                    SUM(CASE WHEN t.status = 'NO_CONTACT' THEN 1 ELSE 0 END) as noContact,
                    COUNT(CASE WHEN t.status IN ('CONFIRMED', 'DISPUTED', 'NO_CONTACT') THEN 1 END) as completed,
                    ISNULL(AVG(CASE WHEN a.duration_sec IS NOT NULL THEN a.duration_sec ELSE 0 END), 0) as avgHandleTime
                FROM USERS u
                LEFT JOIN VERIFICATION_TASKS t ON u.user_id = t.assigned_agent_id
                LEFT JOIN CALL_ATTEMPTS a ON t.task_id = a.task_id
                WHERE u.role IN ('VERIFIER', 'AGENT')
            `;

            if (role && role !== 'all') {
                query += ` AND u.verification_type = @role`;
            }

            query += `
                GROUP BY u.user_id, u.full_name, u.role, u.verification_type
                ORDER BY u.full_name
            `;

            const result = await pool.request();
            if (role && role !== 'all') {
                result.input('role', role);
            }
            const data = await result.query(query);

            // Calculate completion rate for each agent
            return data.recordset.map(row => ({
                ...row,
                completionRate: row.assigned > 0 ? (row.completed / row.assigned) * 100 : 0,
            }));
        } catch (error) {
            console.error('❌ Error in getAgentPerformance:', error);
            return [];
        }
    },

    getTrendData: async({ timeFrame = 'weekly' } = {}) => {
        try {
            const pool = await getConnection();

            let query = `
                SELECT 
                    CONVERT(DATE, t.created_at) as date,
                    t.status,
                    COUNT(*) as count
                FROM VERIFICATION_TASKS t
                WHERE t.created_at >= DATEADD(day, -7, GETDATE())
                GROUP BY CONVERT(DATE, t.created_at), t.status
                ORDER BY CONVERT(DATE, t.created_at)
            `;

            const result = await pool.request().query(query);

            console.log('📊 Trend data from DB:', result.recordset);

            // If no data, return empty array
            if (result.recordset.length === 0) {
                console.log('ℹ️ No trend data found in database');
                return [];
            }

            // Transform data for chart
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const dayMap = {};

            // Group by day of week
            result.recordset.forEach(row => {
                const date = new Date(row.date);
                const dayIndex = date.getDay();
                const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];
                if (!dayMap[dayName]) {
                    dayMap[dayName] = { completed: 0, exceptions: 0, noContact: 0 };
                }
                if (row.status === 'CONFIRMED') {
                    dayMap[dayName].completed += row.count;
                } else if (row.status === 'DISPUTED') {
                    dayMap[dayName].exceptions += row.count;
                } else if (row.status === 'NO_CONTACT') {
                    dayMap[dayName].noContact += row.count;
                }
            });

            // Build final data
            return days.map(day => {
                const dayData = dayMap[day] || { completed: 0, exceptions: 0, noContact: 0 };
                return {
                    day,
                    date: new Date().toISOString().slice(0, 10),
                    completed: dayData.completed || 0,
                    exceptions: dayData.exceptions || 0,
                    noContact: dayData.noContact || 0,
                    total: (dayData.completed || 0) + (dayData.exceptions || 0) + (dayData.noContact || 0),
                };
            });
        } catch (error) {
            console.error('❌ Error in getTrendData:', error);
            return [];
        }
    },

    getAgentTrendData: async(agentId, { timeFrame = 'weekly' } = {}) => {
        try {
            const pool = await getConnection();

            let query = `
                SELECT 
                    CONVERT(DATE, t.created_at) as date,
                    t.status,
                    COUNT(*) as count
                FROM VERIFICATION_TASKS t
                WHERE t.assigned_agent_id = @agentId
                AND t.created_at >= DATEADD(day, -7, GETDATE())
                GROUP BY CONVERT(DATE, t.created_at), t.status
                ORDER BY CONVERT(DATE, t.created_at)
            `;

            const result = await pool.request()
                .input('agentId', agentId)
                .query(query);

            console.log('📊 Agent trend data from DB:', result.recordset);

            // If no data, return empty array
            if (result.recordset.length === 0) {
                console.log('ℹ️ No agent trend data found in database');
                return [];
            }

            // Transform data for chart
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const dayMap = {};

            result.recordset.forEach(row => {
                const date = new Date(row.date);
                const dayIndex = date.getDay();
                const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];
                if (!dayMap[dayName]) {
                    dayMap[dayName] = { completed: 0, exceptions: 0, noContact: 0 };
                }
                if (row.status === 'CONFIRMED') {
                    dayMap[dayName].completed += row.count;
                } else if (row.status === 'DISPUTED') {
                    dayMap[dayName].exceptions += row.count;
                } else if (row.status === 'NO_CONTACT') {
                    dayMap[dayName].noContact += row.count;
                }
            });

            // Build final data
            return days.map(day => {
                const dayData = dayMap[day] || { completed: 0, exceptions: 0, noContact: 0 };
                return {
                    day,
                    date: new Date().toISOString().slice(0, 10),
                    completed: dayData.completed || 0,
                    exceptions: dayData.exceptions || 0,
                    noContact: dayData.noContact || 0,
                    total: (dayData.completed || 0) + (dayData.exceptions || 0) + (dayData.noContact || 0),
                };
            });
        } catch (error) {
            console.error('❌ Error in getAgentTrendData:', error);
            return [];
        }
    },

    getResultDistribution: async() => {
        try {
            const pool = await getConnection();
            const result = await pool.request().query(`
                SELECT 
                    status as name,
                    COUNT(*) as value
                FROM VERIFICATION_TASKS
                WHERE status IN ('CONFIRMED', 'DISPUTED', 'NO_CONTACT')
                GROUP BY status
            `);

            // If no data, return empty array
            if (result.recordset.length === 0) {
                console.log('ℹ️ No result distribution data found');
                return [];
            }

            return result.recordset;
        } catch (error) {
            console.error('❌ Error in getResultDistribution:', error);
            return [];
        }
    },
};

export default reportService;