// src/scripts/hashPasswords.js
import bcrypt from 'bcrypt';
import { getConnection } from '../config/db.js';

const hashPassword = async(password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

const updateUserPasswords = async() => {
    try {
        const pool = await getConnection();

        // Define users and their plaintext passwords
        const users = [
            { username: 'admin', password: 'admin123' },
            { username: 'supervisor', password: 'sup123' },
            { username: 'agent1', password: 'agent123' },
            { username: 'agent2', password: 'agent123' },
        ];

        for (const user of users) {
            const hashedPassword = await hashPassword(user.password);

            await pool.request()
                .input('username', user.username)
                .input('passwordHash', hashedPassword)
                .query(`
                    UPDATE USERS 
                    SET password_hash = @passwordHash 
                    WHERE username = @username
                `);

            console.log(`✅ Updated password for ${user.username}`);
        }

        console.log('✅ All passwords updated successfully!');
        console.log('\n📝 Login Credentials:');
        console.log('   Admin:      admin / admin123');
        console.log('   Supervisor: supervisor / sup123');
        console.log('   Agent1:     agent1 / agent123');
        console.log('   Agent2:     agent2 / agent123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating passwords:', error);
        process.exit(1);
    }
};

updateUserPasswords();