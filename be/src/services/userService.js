// be/src/services/userService.js
import { query } from '../config/db.js';
import bcrypt from 'bcrypt';

export const userService = {
    async getUsers(filters = {}) {
        let sqlQuery = `
            SELECT 
                user_id as id,
                username,
                full_name as fullName,
                role,
                verification_type as verificationType,
                pbx_extension as pbxExtension,
                status,
                created_at as createdAt,
                updated_at as updatedAt
            FROM USERS
            WHERE 1=1
        `;

        const params = {};

        if (filters.role && filters.role !== 'all') {
            sqlQuery += ` AND role = @role`;
            params.role = filters.role;
        }

        if (filters.status && filters.status !== 'all') {
            sqlQuery += ` AND status = @status`;
            params.status = filters.status;
        }

        if (filters.search) {
            sqlQuery += ` AND (username LIKE @search OR full_name LIKE @search)`;
            params.search = `%${filters.search}%`;
        }

        sqlQuery += ` ORDER BY created_at DESC`;

        const result = await query(sqlQuery, params);
        return result.recordset;
    },

    async getUserById(userId) {
        const result = await query(
            `SELECT 
                user_id as id,
                username,
                full_name as fullName,
                role,
                verification_type as verificationType,
                pbx_extension as pbxExtension,
                status,
                created_at as createdAt
             FROM USERS
             WHERE user_id = @userId`, { userId }
        );
        return result.recordset[0];
    },

    async createUser(userData) {
        const { username, password, fullName, role, verificationType, pbxExtension } = userData;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await query(
            `INSERT INTO USERS 
             (username, password_hash, full_name, role, verification_type, pbx_extension, status)
             VALUES 
             (@username, @passwordHash, @fullName, @role, @verificationType, @pbxExtension, 'ACTIVE');
             SELECT SCOPE_IDENTITY() as userId;`, {
                username,
                passwordHash,
                fullName,
                role,
                verificationType: role === 'VERIFIER' ? verificationType : null,
                pbxExtension,
            }
        );
        return { userId: result.recordset[0].userId };
    },

    async updateUser(userId, userData) {
        const { fullName, role, verificationType, pbxExtension, status } = userData;

        await query(
            `UPDATE USERS 
             SET full_name = @fullName,
                 role = @role,
                 verification_type = @verificationType,
                 pbx_extension = @pbxExtension,
                 status = @status,
                 updated_at = GETDATE()
             WHERE user_id = @userId`, {
                userId,
                fullName,
                role,
                verificationType: role === 'VERIFIER' ? verificationType : null,
                pbxExtension,
                status,
            }
        );
        return { success: true };
    },

    async deactivateUser(userId) {
        await query(
            `UPDATE USERS 
             SET status = 'INACTIVE', updated_at = GETDATE()
             WHERE user_id = @userId`, { userId }
        );
        return { success: true };
    },

    async changePassword(userId, newPassword) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await query(
            `UPDATE USERS 
             SET password_hash = @passwordHash, updated_at = GETDATE()
             WHERE user_id = @userId`, { userId, passwordHash }
        );
        return { success: true };
    },
};