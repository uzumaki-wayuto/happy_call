// test-pbx-service.js - Full PBX Service Test
import { pbxService } from './src/services/pbxService.js';

async function testPBXService() {
    console.log('🧪 Testing PBX Service');
    console.log('=======================');
    console.log('');

    // 1. Test Connection
    console.log('📡 Step 1: Testing PBX Connection...');
    const connected = await pbxService.connect();

    if (!connected) {
        console.log('❌ PBX Connection Failed');
        console.log('   Check:');
        console.log('   1. Asterisk is running: sudo systemctl status asterisk');
        console.log('   2. AMI is enabled: sudo cat /etc/asterisk/manager.conf');
        console.log('   3. Your .env file has correct PBX credentials');
        return;
    }

    console.log('✅ PBX Connected Successfully!');
    console.log(`   Connected: ${pbxService.isConnected()}`);
    console.log('');

    // 2. Test Event Listeners
    console.log('📡 Step 2: Setting up event listeners...');

    pbxService.on('call:started', (data) => {
        console.log('📞 [EVENT] Call Started:', data);
    });

    pbxService.on('call:ringing', (data) => {
        console.log('📞 [EVENT] Call Ringing:', data);
    });

    pbxService.on('call:connected', (data) => {
        console.log('📞 [EVENT] Call Connected:', data);
    });

    pbxService.on('call:ended', (data) => {
        console.log('📞 [EVENT] Call Ended:', data);
    });

    pbxService.on('call:error', (data) => {
        console.log('❌ [EVENT] Call Error:', data);
    });

    console.log('✅ Event listeners registered');
    console.log('');

    // 3. Test Click-to-Call
    console.log('📡 Step 3: Testing Click-to-Call...');
    console.log('   Agent Extension: 6001');
    console.log('   Customer Number: 6002');
    console.log('   Task ID: TEST-001');
    console.log('   Agent ID: 1');
    console.log('');

    try {
        const result = await pbxService.clickToCall(
            '6001',
            '6002',
            'TEST-001',
            '1'
        );

        console.log('✅ Click-to-Call Initiated!');
        console.log('   Result:', result);
        console.log('');

        console.log('📡 Waiting for call events... (30 seconds)');
        console.log('   Press Ctrl+C to stop early');
        console.log('');

        // Wait for events
        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('');
                console.log('⏰ Test complete - 30 seconds elapsed');
                resolve();
            }, 30000);

            // Listen for call end to resolve early
            pbxService.once('call:ended', () => {
                clearTimeout(timeout);
                console.log('');
                console.log('📞 Call ended - test complete');
                resolve();
            });
        });

        // 4. Check active calls
        console.log('');
        console.log('📡 Step 4: Checking active calls...');
        const activeCalls = pbxService.getActiveCalls();
        console.log(`   Active Calls: ${activeCalls.length}`);
        if (activeCalls.length > 0) {
            console.log('   Calls:', activeCalls);
        }

        // 5. Test manual dial
        console.log('');
        console.log('📡 Step 5: Testing Manual Dial logging...');
        try {
            const manualResult = await pbxService.manualDial(
                'TEST-001',
                '1',
                'PERSONAL_MOBILE',
                'Testing manual dial',
                '09991234567'
            );
            console.log('✅ Manual Dial Logged:', manualResult);
        } catch (manualError) {
            console.log('⚠️ Manual Dial test skipped:', manualError.message);
        }

    } catch (error) {
        console.error('❌ Click-to-Call Error:', error.message);
        console.log('');
        console.log('📋 Troubleshooting:');
        console.log('   1. Check if SIP extensions are registered');
        console.log('   2. Check Asterisk logs: sudo tail -f /var/log/asterisk/messages');
        console.log('   3. Verify the context "from-internal" exists in extensions.conf');
        console.log('   4. Try using "internal" context instead of "from-internal"');
    }

    console.log('');
    console.log('✅ PBX Service Test Complete!');
    console.log('📊 Summary:');
    console.log(`   Connected: ${pbxService.isConnected()}`);
    console.log(`   Active Calls: ${pbxService.getActiveCalls().length}`);
}

// Run the test
testPBXService().catch((error) => {
    console.error('❌ Test failed:', error);
});