// src/services/immutabilityService.js
import { getConnection } from '../config/db.js';

export const immutabilityService = {
    // ============ CHECK IF ATTEMPT CAN BE MODIFIED ============
    async canModifyAttempt(attemptId) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('attemptId', attemptId)
                .query(`
                    SELECT 
                        attempt_id,
                        created_at,
                        CASE 
                            WHEN DATEDIFF(MINUTE, created_at, SYSUTCDATETIME()) < 5 THEN 1 
                            ELSE 0 
                        END as isEditable
                    FROM CALL_ATTEMPTS
                    WHERE attempt_id = @attemptId
                `);

            const record = result.recordset[0];
            if (!record) {
                return {
                    success: false,
                    message: 'Attempt not found'
                };
            }

            // Call attempts are immutable - never editable
            return {
                success: false,
                message: 'Call attempts are immutable and cannot be modified',
                immutable: true,
                attemptId: record.attempt_id,
                createdAt: record.created_at
            };
        } catch (error) {
            console.error('❌ Error in canModifyAttempt:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    // ============ LOG ACCESS FOR AUDIT ============
    async logAccess(userId, action, targetType, targetId, ipAddress, details = null) {
        try {
            const pool = await getConnection();
            const result = await pool.request()
                .input('userId', userId)
                .input('action', action)
                .input('targetType', targetType)
                .input('targetId', targetId)
                .input('ipAddress', ipAddress)
                .input('details', details ? JSON.stringify(details) : null)
                .query(`
                    INSERT INTO ACCESS_LOGS (
                        user_id,
                        action,
                        target_type,
                        target_id,
                        ip_address,
                        details,
                        created_at
                    )
                    VALUES (
                        @userId,
                        @action,
                        @targetType,
                        @targetId,
                        @ipAddress,
                        @details,
                        SYSUTCDATETIME()
                    )
                `);
            return { success: true };
        } catch (error) {
            console.error('❌ Error logging access:', error);
            return { success: false, error: error.message };
        }
    },

    // ============ GET ACCESS LOGS ============
    async getAccessLogs(userId = null, limit = 100) {
        try {
            const pool = await getConnection();
            let query = `
                SELECT 
                    al.log_id as id,
                    al.user_id as userId,
                    u.full_name as userName,
                    al.action,
                    al.target_type as targetType,
                    al.target_id as targetId,
                    al.ip_address as ipAddress,
                    al.details,
                    al.created_at as createdAt,
                    FORMAT(al.created_at, 'yyyy-MM-dd HH:mm:ss') as timestamp
                FROM ACCESS_LOGS al
                JOIN USERS u ON al.user_id = u.user_id
                WHERE 1=1
            `;

            const request = pool.request();

            if (userId) {
                query += ` AND al.user_id = @userId`;
                request.input('userId', userId);
            }

            query += ` ORDER BY al.created_at DESC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
            request.input('limit', limit);

            const result = await request.query(query);
            return result.recordset || [];
        } catch (error) {
            console.error('❌ Error getting access logs:', error);
            return [];
        }
    }
};

export default immutabilityService;