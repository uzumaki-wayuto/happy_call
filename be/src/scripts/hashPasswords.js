// src/scripts/hashPasswords.js
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { getConnection } from '../config/db.js';
import readline from 'readline';

dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer.trim());
        });
    });
};

const changePassword = async() => {
    try {
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();
        console.log('✅ Connected to database');

        // Show all users
        const usersResult = await pool.request().query(`
            SELECT user_id, username, full_name, role FROM USERS WHERE status = 'ACTIVE'
        `);

        console.log('\n📋 Available Users:');
        console.log('┌─────────┬──────────────┬────────────────────┬──────────────┐');
        console.log('│ User ID │ Username     │ Full Name          │ Role         │');
        console.log('├─────────┼──────────────┼────────────────────┼──────────────┤');
        usersResult.recordset.forEach(user => {
            console.log(`│ ${String(user.user_id).padEnd(7)} │ ${String(user.username).padEnd(12)} │ ${String(user.full_name).padEnd(18)} │ ${String(user.role).padEnd(12)} │`);
        });
        console.log('└─────────┴──────────────┴────────────────────┴──────────────┘');

        // Ask for username
        const username = await askQuestion('\n👤 Enter username to change password: ');

        // Find user
        const user = usersResult.recordset.find(u => u.username === username);
        if (!user) {
            console.log(`❌ User "${username}" not found!`);
            rl.close();
            return;
        }

        console.log(`\n📝 Changing password for: ${user.full_name} (${user.username})`);

        // Ask for new password
        const newPassword = await askQuestion('🔑 Enter new password: ');
        const confirmPassword = await askQuestion('✅ Confirm new password: ');

        if (newPassword !== confirmPassword) {
            console.log('❌ Passwords do not match!');
            rl.close();
            return;
        }

        if (newPassword.length < 4) {
            console.log('❌ Password must be at least 4 characters!');
            rl.close();
            return;
        }
        const hashedPassword = hashPasword(newPassword)



        // const updateUserPasswords = async() => {
        //     try {
        //         const pool = await getConnection();

        // // Define users and their plaintext passwords
        // const users = [
        //     { username: 'admin', password: 'admin123' },
        //     { username: 'supervisor', password: 'sup123' },
        //     { username: 'agent1', password: 'agent123' },
        //     { username: 'agent2', password: 'agent123' },
        //     { username: 'agent3', password: 'agent123' },

        //     { username: 'agent4', password: 'agent123' },
        //     { username: 'agent5', password: 'agent123' },
        //     { username: 'agent6', password: 'agent123' },
        //     { username: 'agent7', password: 'agent123' },
        //     { username: 'monmon', password: 'agent123' },
        //     { username: 'yeye', password: 'agent123' },
        //     { username: 'yeemon', password: 'agent123' },
        //     { username: 'thiri', password: 'agent123' },

        //     ];

        //     for (const user of users) {
        //         const hashedPassword = await hashPassword(user.password);

        //         await pool.request()
        //             .input('username', user.username)
        //             .input('passwordHash', hashedPassword)
        //             .query(`
        //                     UPDATE USERS 
        //                     SET password_hash = @passwordHash 
        //                     WHERE username = @username
        //                 `);

        //         console.log(`✅ Updated password for ${user.username}`);
        //     }

        //     console.log('✅ All passwords updated successfully!');
        //     console.log('\n📝 Login Credentials:');
        //     console.log('   Admin:      admin / admin123');
        //     console.log('   Supervisor: supervisor / sup123');
        //     console.log('   Agent1:     agent1 / agent123');
        //     console.log('   Agent2:     agent2 / agent123');

        //     process.exit(0);
        // } catch (error) {
        //     console.error('❌ Error updating passwords:', error);
        //     process.exit(1);
        // }
        // };
        // Update the password
        await pool.request()
            .input('userId', user.user_id)
            .input('hashedPassword', hashedPassword)
            .query(`
                UPDATE USERS 
                SET password_hash = @hashedPassword,
                    updated_at = SYSUTCDATETIME()
                WHERE user_id = @userId
            `);

        console.log(`\n✅ Password successfully changed for: ${user.full_name} (${user.username})`);
        console.log(`🔑 New password: ${newPassword}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
    }

    const hashPassword = async(password) => {
        const saltRounds = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, saltRounds);
    };
};

changePassword();