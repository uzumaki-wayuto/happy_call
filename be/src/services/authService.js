// src/services/authService.js
import bcrypt from 'bcrypt';
import { getConnection } from '../config/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export const authService = {
    login: async(username, password) => {
        try {
            const pool = await getConnection();
            const result = await pool.request().input('username', username).query(`
                SELECT 
                    user_id as id,
                    username,
                    password_hash,
                    full_name,
                    role,
                    verification_type as verificationType,
                    pbx_extension as pbxExtension,
                    status
                FROM USERS 
                WHERE username = @username AND status = 'ACTIVE'
            `);

            const user = result.recordset[0];
            if (!user) {
                throw new Error('Invalid credentials - user not found');
            }

            console.log('🔐 User found:', user.username);

            if (user.password_hash) {
                console.log('Password hash length:', user.password_hash.length);
            } else {
                console.log('Password hash length:', undefined);
            }

            // Compare password with hashed password
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                throw new Error('Invalid credentials - wrong password');
            }

            // Generate JWT token
            const token = jwt.sign({
                    userId: user.id,
                    username: user.username,
                    role: user.role,
                    fullName: user.full_name,
                },
                JWT_SECRET, { expiresIn: '24h' }
            );

            // Remove password hash from response
            delete user.password_hash;

            // Ensure full_name is returned
            const userResponse = {
                ...user,
                fullName: user.full_name || user.username, // Fallback to username if full_name is empty
            };

            return {
                token,
                user,
            };
        } catch (error) {
            console.error('❌ Login error:', error.message);
            throw error;
        }
    },

    refreshToken: async(token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const newToken = jwt.sign({
                    userId: decoded.userId,
                    username: decoded.username,
                    role: decoded.role,
                    fullName: decoded.fullName,
                },
                JWT_SECRET, { expiresIn: '24h' }
            );
            return { token: newToken };
        } catch (error) {
            throw new Error('Invalid token');
        }
    },

    verifyToken: (token) => {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    },
};

export default authService;