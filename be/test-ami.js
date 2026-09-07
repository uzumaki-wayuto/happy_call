// test-ami.js - Fixed version
import net from 'net';

const config = {
    host: process.env.PBX_HOST || '127.0.0.1',
    port: parseInt(process.env.PBX_PORT) || 5038,
    username: process.env.PBX_USERNAME || 'admin',
    password: process.env.PBX_PASSWORD || 'admin123'
};

console.log('📞 Testing AMI connection...');
console.log(`   Host: ${config.host}:${config.port}`);
console.log(`   Username: ${config.username}`);
console.log(`   Password: ${config.password}`);
console.log('');

let authenticated = false;
let buffer = '';

const client = net.createConnection({
    host: config.host,
    port: config.port
});

client.on('connect', () => {
    console.log('✅ TCP Connection established');
    console.log('📤 Sending login...');

    // Send login with proper formatting
    const login = `Action: Login
Username: ${config.username}
Secret: ${config.password}

`;
    client.write(login);
    console.log('📤 Login sent, waiting for response...');
});

client.on('data', (data) => {
    const chunk = data.toString();
    console.log('📥 Received chunk:', chunk);
    buffer += chunk;

    // Check for complete responses
    if (buffer.includes('\r\n\r\n')) {
        const messages = buffer.split('\r\n\r\n');
        buffer = messages.pop() || '';

        for (const msg of messages) {
            console.log('📥 Response:');
            console.log(msg);
            console.log('');

            if (msg.includes('Response: Success')) {
                authenticated = true;
                console.log('✅ ✅ ✅ LOGIN SUCCESSFUL! ✅ ✅ ✅');
                console.log('');
                console.log('💡 Asterisk AMI is ready to use!');
                console.log('');
                console.log('📋 Next steps:');
                console.log('   1. Update .env file with these credentials');
                console.log('   2. Run: node test-clicktocall.js');
                console.log('');
                console.log('Press Ctrl+C to disconnect');
            }

            if (msg.includes('Response: Error')) {
                console.log('❌ LOGIN FAILED!');
                console.log('');
                console.log('🔍 Check your manager.conf file:');
                console.log('   sudo nano /etc/asterisk/manager.conf');
                console.log('');
                console.log('   It should contain:');
                console.log('   [general]');
                console.log('   enabled = yes');
                console.log('   port = 5038');
                console.log('   bindaddr = 0.0.0.0');
                console.log('');
                console.log('   [admin]');
                console.log(`   secret = ${config.password}`);
                console.log('   read = all');
                console.log('   write = all');
                console.log('');
                console.log('Then restart Asterisk:');
                console.log('   sudo systemctl restart asterisk');
                client.end();
            }
        }
    }
});

client.on('error', (err) => {
    console.error('❌ Connection error:', err.message);
    console.log('');
    console.log('🔍 Troubleshooting:');
    if (err.code === 'ECONNREFUSED') {
        console.log('   - Asterisk is not running');
        console.log('   - Run: sudo systemctl start asterisk');
    } else if (err.code === 'ETIMEDOUT') {
        console.log('   - No response from Asterisk');
        console.log('   - Check if AMI is enabled in manager.conf');
    }
    process.exit(1);
});

client.setTimeout(5000);
client.on('timeout', () => {
    console.log('⏰ Connection timeout after 30 seconds');
    console.log('');
    console.log('🔍 Possible causes:');
    console.log('   1. AMI is not enabled in manager.conf');
    console.log('   2. Wrong username or password');
    console.log('   3. Asterisk is not fully started');
    console.log('');
    console.log('📋 Try:');
    console.log('   1. Check manager.conf: sudo cat /etc/asterisk/manager.conf');
    console.log('   2. Restart Asterisk: sudo systemctl restart asterisk');
    console.log('   3. Check Asterisk logs: sudo tail -f /var/log/asterisk/messages');
    client.end();
    process.exit(1);
});

console.log('📡 Waiting for response... (timeout: 30s)');