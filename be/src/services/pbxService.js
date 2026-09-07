// src/services/pbxService.js
import AMI from 'asterisk-manager';
import EventEmitter from 'events';
import { getConnection } from '../config/db.js';

class PBXService extends EventEmitter {
    constructor() {
        super();
        this.ami = null;
        this._connected = false;
        this.authenticated = false;
        this.activeCalls = new Map();
        this.retryCount = 0;
        this.maxRetries = 5;
        this.callAttempts = new Map(); // Track call attempts
    }

    // ============ CONNECT TO PBX ============
    async connect() {
        return new Promise((resolve) => {
            try {
                const host = process.env.PBX_HOST || '192.168.7.100';
                const port = parseInt(process.env.PBX_PORT) || 7777;
                const username = process.env.PBX_USERNAME || 'admin';
                const password = process.env.PBX_PASSWORD || 'admin123';

                console.log(`🔌 Connecting to PBX at ${host}:${port}...`);

                if (this._connected && this.authenticated) {
                    console.log('✅ Already connected to PBX');
                    resolve(true);
                    return;
                }

                this.ami = new AMI({
                    host: host,
                    port: port,
                    username: username,
                    password: password,
                    keepConnected: true,
                    reconnect: true
                });

                let resolved = false;

                this.ami.on('connect', () => {
                    console.log('✅ PBX AMI Connected');
                    this._connected = true;
                    this.authenticated = true;
                    this.retryCount = 0;
                    this.emit('pbx:status', { connected: true });
                    if (!resolved) {
                        resolved = true;
                        resolve(true);
                    }
                });

                this.ami.on('disconnect', () => {
                    console.log('❌ PBX AMI Disconnected');
                    this._connected = false;
                    this.authenticated = false;
                    this.emit('pbx:status', { connected: false });
                });

                this.ami.on('error', (error) => {
                    console.error('❌ PBX AMI Error:', error.message || error);
                    this._connected = false;
                    this.authenticated = false;
                    this.emit('pbx:error', { message: error.message });
                    if (!resolved) {
                        resolved = true;
                        resolve(false);
                    }
                });

                // Monitor AMI events
                this.ami.on('Newstate', (event) => this.handleNewState(event));
                this.ami.on('Hangup', (event) => this.handleHangup(event));
                this.ami.on('BridgeEnter', (event) => this.handleBridgeEnter(event));
                this.ami.on('BridgeLeave', (event) => this.handleBridgeLeave(event));
                this.ami.on('Dial', (event) => this.handleDial(event));
                this.ami.on('DialEnd', (event) => this.handleDialEnd(event));
                this.ami.on('VarSet', (event) => this.handleVarSet(event));

                // Connect
                this.ami.connect();

                // Timeout
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        console.log('⏰ PBX Connection timeout');
                        resolve(false);
                    }
                }, 10000);

            } catch (error) {
                console.error('❌ Failed to connect to PBX:', error);
                this.emit('pbx:error', { message: error.message });
                resolve(false);
            }
        });
    }

    // ============ CLICK-TO-CALL ============
    async clickToCall(agentExtension, customerPhone, taskId, agentId) {
        if (!this._connected || !this.authenticated) {
            this.emit('call:error', {
                taskId,
                agentId,
                message: 'PBX not connected',
                error: 'PBX_UNAVAILABLE'
            });
            throw new Error('PBX not connected');
        }

        return new Promise((resolve, reject) => {
            try {
                console.log(`📞 Click-to-Call: ${agentExtension} → ${customerPhone}`);

                const callId = `call_${taskId}_${Date.now()}`;

                // Store call attempt
                this.callAttempts.set(callId, {
                    taskId,
                    agentId,
                    agentExtension,
                    customerPhone,
                    startTime: new Date(),
                    status: 'initiating',
                    ringCount: 0,
                });

                // Store active call
                this.activeCalls.set(callId, {
                    taskId: taskId,
                    agentId: agentId,
                    agentExtension: agentExtension,
                    customerPhone: customerPhone,
                    startTime: new Date(),
                    callId: callId,
                    status: 'initiating'
                });

                const action = {
                    Action: 'Originate',
                    Channel: `SIP/${agentExtension}`,
                    Exten: customerPhone,
                    Context: 'internal',
                    Priority: 1,
                    CallerID: `"Happy Call" <${agentExtension}>`,
                    Timeout: 60000,
                    Variable: `callId=${callId},taskId=${taskId},agentId=${agentId}`
                };

                this.ami.action(action, async(response) => {
                    const isSuccess = response && response.Response === 'Success';

                    if (isSuccess) {
                        // Update call status
                        const call = this.activeCalls.get(callId);
                        if (call) {
                            call.status = 'ringing';
                            call.channel = response.Channel;
                        }

                        // Update task status
                        await this.updateTaskStatus(taskId, 'IN_PROGRESS', agentId);
                        await this.logCallStart(taskId, agentId, callId, agentExtension, customerPhone);

                        // Emit events
                        this.emit('call:started', {
                            taskId,
                            agentId,
                            callId,
                            customerPhone,
                            status: 'ringing',
                            timestamp: new Date().toISOString()
                        });

                        // Update call attempt
                        const attempt = this.callAttempts.get(callId);
                        if (attempt) {
                            attempt.status = 'ringing';
                            attempt.channel = response.Channel;
                        }

                        resolve({
                            success: true,
                            callId: callId,
                            channel: response.Channel,
                            message: 'Call initiated successfully'
                        });
                    } else {
                        const errorMsg = response && response.Message ? response.Message : 'Originate failed';

                        // Update call status
                        const call = this.activeCalls.get(callId);
                        if (call) {
                            call.status = 'failed';
                            call.error = errorMsg;
                        }

                        this.emit('call:error', {
                            taskId,
                            agentId,
                            callId,
                            message: errorMsg,
                            error: 'ORIGINATE_FAILED'
                        });

                        reject(new Error(errorMsg));
                    }
                });

            } catch (error) {
                console.error('❌ Click-to-Call error:', error);
                this.emit('call:error', {
                    taskId,
                    agentId,
                    message: error.message,
                    error: 'CLICK_TO_CALL_ERROR'
                });
                reject(error);
            }
        });
    }

    // ============ ENHANCED EVENT HANDLERS ============

    handleNewState(event) {
        const callId = this.findCallId(event);
        if (!callId) return;

        const call = this.activeCalls.get(callId);
        if (!call) {
            // Maybe it's a call we didn't initiate
            return;
        }

        const state = event.ChannelStateDesc || '';
        console.log(`📞 Call ${callId} state: ${state}`);

        if (state === 'Ring' || state === 'Ringing') {
            call.status = 'ringing';
            call.ringStart = new Date();

            // Update attempt
            const attempt = this.callAttempts.get(callId);
            if (attempt) {
                attempt.status = 'ringing';
                attempt.ringStart = new Date();
            }

            this.emit('call:ringing', {
                callId,
                taskId: call.taskId,
                agentId: call.agentId,
                status: 'ringing',
                timestamp: new Date().toISOString()
            });
        } else if (state === 'Up') {
            call.status = 'connected';
            call.connectedAt = new Date();

            // Update attempt
            const attempt = this.callAttempts.get(callId);
            if (attempt) {
                attempt.status = 'connected';
                attempt.connectedAt = new Date();
            }

            this.emit('call:connected', {
                callId,
                taskId: call.taskId,
                agentId: call.agentId,
                status: 'connected',
                duration: 0,
                timestamp: new Date().toISOString()
            });
        }
    }

    handleHangup(event) {
        const callId = this.findCallId(event);
        if (!callId) return;

        const call = this.activeCalls.get(callId);
        if (!call) return;

        let duration = 0;
        if (call.connectedAt) {
            duration = Math.floor((new Date() - call.connectedAt) / 1000);
        }

        call.status = 'ended';
        call.duration = duration;
        call.endTime = new Date();
        call.cause = event.Cause;
        call.causeText = event.CauseText;

        // Update attempt
        const attempt = this.callAttempts.get(callId);
        if (attempt) {
            attempt.status = 'ended';
            attempt.duration = duration;
            attempt.endTime = new Date();
        }

        // Emit ended event
        this.emit('call:ended', {
            callId,
            taskId: call.taskId,
            agentId: call.agentId,
            duration: duration,
            cause: event.Cause,
            causeText: event.CauseText,
            timestamp: new Date().toISOString()
        });

        // Update call duration in database
        this.updateCallDuration(callId, duration);

        // Remove from active calls after 5 minutes
        setTimeout(() => {
            this.activeCalls.delete(callId);
            this.callAttempts.delete(callId);
        }, 300000);
    }

    handleBridgeEnter(event) {
        // When two channels are bridged (agent and customer connected)
        const callId = this.findCallId(event);
        if (!callId) return;

        const call = this.activeCalls.get(callId);
        if (!call) return;

        if (call.status !== 'connected') {
            call.status = 'connected';
            call.connectedAt = new Date();

            this.emit('call:connected', {
                callId,
                taskId: call.taskId,
                agentId: call.agentId,
                status: 'connected',
                duration: 0,
                timestamp: new Date().toISOString()
            });
        }
    }

    handleBridgeLeave(event) {
        // When channels are unbridged
        const callId = this.findCallId(event);
        if (!callId) return;

        const call = this.activeCalls.get(callId);
        if (!call) return;

        // If call was connected and now bridging ends, it might be hanging up
        if (call.status === 'connected') {
            // Give it a moment to see if it's a hangup
            setTimeout(() => {
                const currentCall = this.activeCalls.get(callId);
                if (currentCall && currentCall.status === 'connected') {
                    // Still connected, bridge might be re-established
                }
            }, 500);
        }
    }

    handleDial(event) {
        // Dial event - when outbound call is being placed
        const callId = this.findCallId(event);
        if (!callId) return;

        const call = this.activeCalls.get(callId);
        if (!call) return;

        call.dialStatus = event.DialStatus;
        call.dialStart = new Date();

        this.emit('call:dialing', {
            callId,
            taskId: call.taskId,
            agentId: call.agentId,
            status: 'dialing',
            dialStatus: event.DialStatus,
            timestamp: new Date().toISOString()
        });
    }

    handleDialEnd(event) {
        // Dial end event - when outbound call completes (success or fail)
        const callId = this.findCallId(event);
        if (!callId) return;

        const call = this.activeCalls.get(callId);
        if (!call) return;

        const dialStatus = event.DialStatus;
        call.dialEnd = new Date();
        call.finalDialStatus = dialStatus;

        if (dialStatus === 'ANSWER') {
            // Call was answered
            call.status = 'connected';
            call.connectedAt = new Date();

            this.emit('call:connected', {
                callId,
                taskId: call.taskId,
                agentId: call.agentId,
                status: 'connected',
                duration: 0,
                timestamp: new Date().toISOString()
            });
        } else if (dialStatus === 'NOANSWER' || dialStatus === 'BUSY' || dialStatus === 'CANCEL') {
            // Call wasn't answered
            call.status = 'failed';
            call.failReason = dialStatus;

            this.emit('call:failed', {
                callId,
                taskId: call.taskId,
                agentId: call.agentId,
                status: 'failed',
                reason: dialStatus,
                timestamp: new Date().toISOString()
            });
        }
    }

    handleVarSet(event) {
        // Monitor variable changes
        // Could be used to track custom variables
        const callId = this.findCallId(event);
        if (!callId) return;

        // Check for specific variables
        if (event.Variable === 'CALL_RESULT') {
            const call = this.activeCalls.get(callId);
            if (call) {
                call.result = event.Value;
            }
        }
    }

    // ============ HELPER METHODS ============
    findCallId(event) {
        if (!event) return null;

        // Check for callId in variables
        if (event.Variable && event.Variable.callId) {
            return event.Variable.callId;
        }

        // Check Channel variable
        if (event.Channel) {
            const match = event.Channel.match(/call_(\d+)_(\d+)/);
            if (match) {
                return `call_${match[1]}_${match[2]}`;
            }
        }

        // Check for callId in event
        if (event.callId) {
            return event.callId;
        }

        return null;
    }

    async updateTaskStatus(taskId, status, agentId) {
        try {
            const pool = await getConnection();
            await pool.request()
                .input('taskId', taskId)
                .input('status', status)
                .input('agentId', agentId)
                .query(`
                    UPDATE VERIFICATION_TASKS
                    SET status = @status,
                        assigned_agent_id = @agentId,
                        updated_at = SYSUTCDATETIME()
                    WHERE task_id = @taskId
                `);
        } catch (error) {
            console.error('❌ Error updating task status:', error);
        }
    }

    async logCallStart(taskId, agentId, callId, agentExtension, customerPhone) {
        try {
            const pool = await getConnection();
            await pool.request()
                .input('taskId', taskId)
                .input('agentId', agentId)
                .input('callId', callId)
                .input('agentExtension', agentExtension)
                .input('customerPhone', customerPhone)
                .query(`
                    INSERT INTO CALL_ATTEMPTS (
                        task_id,
                        agent_id,
                        call_method,
                        pbx_call_id,
                        start_time,
                        result,
                        notes
                    )
                    VALUES (
                        @taskId,
                        @agentId,
                        'CLICK_TO_CALL',
                        @callId,
                        SYSUTCDATETIME(),
                        'IN_PROGRESS',
                        @customerPhone
                    )
                `);
        } catch (error) {
            console.error('❌ Error logging call start:', error);
        }
    }

    async updateCallDuration(callId, duration) {
        try {
            const pool = await getConnection();
            await pool.request()
                .input('callId', callId)
                .input('duration', duration)
                .query(`
                    UPDATE CALL_ATTEMPTS
                    SET duration_sec = @duration,
                        end_time = SYSUTCDATETIME()
                    WHERE pbx_call_id = @callId
                    AND result = 'IN_PROGRESS'
                `);
        } catch (error) {
            console.error('❌ Error updating call duration:', error);
        }
    }

    // ============ PUBLIC METHODS ============
    getCallStatus(callId) {
        if (this.activeCalls.has(callId)) {
            return this.activeCalls.get(callId);
        }
        return null;
    }

    getActiveCalls() {
        const calls = [];
        for (const [key, value] of this.activeCalls) {
            calls.push(value);
        }
        return calls;
    }

    isConnected() {
        return this._connected && this.authenticated;
    }

    disconnect() {
        if (this.ami) {
            this.ami.disconnect();
        }
        this._connected = false;
        this.authenticated = false;
        console.log('🔌 Disconnected from PBX');
        this.emit('pbx:status', { connected: false });
    }
}

// Singleton instance
export const pbxService = new PBXService();
export default pbxService;