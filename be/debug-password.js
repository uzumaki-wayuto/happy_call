// debug-password.js
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { getConnection } from './src/config/db.js';

dotenv.config();

const debugPassword = async() => {
    try {
        console.log('🔍 Debugging Password Issue');
        console.log('='.repeat(50));

        const pool = await getConnection();
        console.log('✅ Database connected\n');

        // Test with admin
        const username = 'admin';
        const plainPassword = 'admin123';

        // Get user from database
        const result = await pool.request()
            .input('username', username)
            .query(`
                SELECT 
                    user_id,
                    username,
                    full_name,
                    role,
                    password_hash,
                    status
                FROM USERS 
                WHERE username = @username
            `);

        if (result.recordset.length === 0) {
            console.log('❌ User not found:', username);
            return;
        }

        const user = result.recordset[0];
        console.log('📋 User found:');
        console.log(`   Username: ${user.username}`);
        console.log(`   Full Name: ${user.full_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Password Hash: ${user.password_hash}`);
        console.log(`   Hash Length: ${user.password_hash ? user.password_hash.length : 0}`);
        console.log('');

        // Test the password
        console.log('🔐 Testing password comparison...');
        console.log(`   Password to test: "${plainPassword}"`);

        if (!user.password_hash) {
            console.log('❌ Password hash is null or empty!');
            console.log('💡 You need to update the password hash.');
            return;
        }

        // Try bcrypt compare
        try {
            const isValid = await bcrypt.compare(plainPassword, user.password_hash);
            console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

            if (!isValid) {
                console.log('\n⚠️ Password mismatch!');
                console.log('💡 Let\'s generate a new hash and update it.');

                // Generate a new hash
                const salt = await bcrypt.genSalt(10);
                const newHash = await bcrypt.hash(plainPassword, salt);
                console.log(`\n📝 New hash generated: ${newHash}`);

                // Update the database
                await pool.request()
                    .input('username', username)
                    .input('newHash', newHash)
                    .query(`
                        UPDATE USERS 
                        SET password_hash = @newHash,
                            updated_at = SYSUTCDATETIME()
                        WHERE username = @username
                    `);
                console.log(`✅ Updated password for ${username}`);

                // Verify the new hash
                const verifyResult = await pool.request()
                    .input('username', username)
                    .query('SELECT password_hash FROM USERS WHERE username = @username');

                const newHashFromDb = verifyResult.recordset[0].password_hash;
                const verifyValid = await bcrypt.compare(plainPassword, newHashFromDb);
                console.log(`✅ Verification: ${verifyValid ? 'PASSED' : 'FAILED'}`);
            }
        } catch (bcryptError) {
            console.error('❌ Bcrypt error:', bcryptError.message);
            console.log('💡 The password hash might be corrupted or in wrong format.');
            console.log('💡 We\'ll generate a fresh hash.');

            // Generate fresh hash
            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash(plainPassword, salt);

            await pool.request()
                .input('username', username)
                .input('newHash', newHash)
                .query(`
                    UPDATE USERS 
                    SET password_hash = @newHash,
                        updated_at = SYSUTCDATETIME()
                    WHERE username = @username
                `);
            console.log(`✅ Fresh password hash generated for ${username}`);
        }

        // Test all users
        console.log('\n📊 Testing all active users:');
        console.log('='.repeat(50));

        const allUsers = await pool.request().query(`
            SELECT username, password_hash 
            FROM USERS 
            WHERE status = 'ACTIVE'
        `);

        const testPasswords = {
            'admin': 'admin123',
            'supervisor1': 'sup123',
            'supervisor2': 'sup123',
            'agent1': 'agent123',
            'agent2': 'agent123',
            'agent3': 'agent123',
            'agent4': 'agent123',
            'agent5': 'agent123',
            'agent6': 'agent123',
            'agent7': 'agent123',
            'agent8': 'agent123'
        };

        for (const user of allUsers.recordset) {
            const expectedPassword = testPasswords[user.username];
            if (expectedPassword) {
                try {
                    const isValid = await bcrypt.compare(expectedPassword, user.password_hash);
                    console.log(`   ${user.username.padEnd(15)}: ${isValid ? '✅' : '❌'} ${isValid ? 'Valid' : 'Invalid'}`);

                    // If invalid, update it
                    if (!isValid) {
                        const salt = await bcrypt.genSalt(10);
                        const newHash = await bcrypt.hash(expectedPassword, salt);
                        await pool.request()
                            .input('username', user.username)
                            .input('newHash', newHash)
                            .query(`
                                UPDATE USERS 
                                SET password_hash = @newHash,
                                    updated_at = SYSUTCDATETIME()
                                WHERE username = @username
                            `);
                        console.log(`   ✅ Updated ${user.username} with fresh hash`);
                    }
                } catch (e) {
                    console.log(`   ${user.username.padEnd(15)}: ❌ Error - ${e.message}`);
                    // Fix the hash
                    const salt = await bcrypt.genSalt(10);
                    const newHash = await bcrypt.hash(expectedPassword, salt);
                    await pool.request()
                        .input('username', user.username)
                        .input('newHash', newHash)
                        .query(`
                            UPDATE USERS 
                            SET password_hash = @newHash,
                                updated_at = SYSUTCDATETIME()
                            WHERE username = @username
                        `);
                    console.log(`   ✅ Fixed ${user.username} with new hash`);
                }
            }
        }

        console.log('\n✅ Debug complete!');
        console.log('\n📝 Login Credentials:');
        console.log('━'.repeat(50));
        console.log('  ADMIN       | admin      | admin123');
        console.log('  SUPERVISOR  | supervisor1| sup123');
        console.log('  SUPERVISOR  | supervisor2| sup123');
        console.log('  AGENT 1-8   | agent1-8   | agent123');
        console.log('━'.repeat(50));

        process.exit(0);

    } catch (error) {
        console.error('❌ Debug error:', error);
        process.exit(1);
    }
};

debugPassword();