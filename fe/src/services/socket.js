// fe/src/services/socket.js
import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this._isConnected = false; // ✅ Use private property
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.isConnecting = false;
        this.lastPBXStatus = null;
        this.pbxStatusEmitted = false;

        // ✅ Add shared PBX status
        this._pbxStatus = {
            connected: false,
            activeCalls: 0,
            isReady: false
        };

        // ✅ Store callbacks for status updates
        this.statusCallbacks = [];
    }

    connect() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('⚠️ No token found, skipping socket connection');
            return;
        }

        if (this.socket && this._isConnected) {
            console.log('✅ Socket already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('⏳ Socket already connecting...');
            return;
        }

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        this.isConnecting = true;
        const wsUrl =
            import.meta.env.VITE_WS_URL || 'http://localhost:5000';

        console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

        this.socket = io(wsUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        });

        this.setupListeners();
    }

    setupListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            this._isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.pbxStatusEmitted = false;
            this.emit('connect', {});

            setTimeout(() => {
                this.socket.emit('pbx:getStatus');
            }, 100);
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`❌ WebSocket disconnected: ${reason}`);
            this._isConnected = false;
            this.isConnecting = false;
            this.pbxStatusEmitted = false;

            if (reason !== 'io client disconnect') {
                this.emit('disconnect', { reason });
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
            this.isConnecting = false;
            this.reconnectAttempts++;

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('❌ Max reconnection attempts reached');
                this.emit('connect_failed', { error: 'Max reconnection attempts reached' });
            }
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
            this._isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.pbxStatusEmitted = false;
            this.emit('reconnect', { attemptNumber });

            setTimeout(() => {
                this.socket.emit('pbx:getStatus');
            }, 100);
        });

        // ============ PBX EVENTS ============
        this.socket.on('pbx:status', (data) => {
            const statusKey = JSON.stringify(data);
            if (this.lastPBXStatus === statusKey) {
                console.log('📡 PBX Status unchanged, skipping emit');
                return;
            }
            this.lastPBXStatus = statusKey;
            this.pbxStatusEmitted = true;
            // ✅ Update shared status
            this._pbxStatus = {
                ...data,
                isReady: true
            };
            console.log('📡 PBX Status:', this._pbxStatus);
            // ✅ Notify all registered callbacks
            this.statusCallbacks.forEach(callback => {
                try {
                    callback(this._pbxStatus);
                } catch (error) {
                    console.error('Error in status callback:', error);
                }
            });

            // Also emit for component listeners
            this.emit('pbx:status', this._pbxStatus);
        });

        this.socket.on('pbx:error', (data) => {
            console.error('❌ PBX Error:', data);
            this.emit('pbx:error', data);
        });

        // ============ CALL EVENTS ============
        this.socket.on('call:started', (data) => {
            console.log('📞 Call Started:', data);
            this.emit('call:started', data);
        });

        this.socket.on('call:ringing', (data) => {
            console.log('📞 Call Ringing:', data);
            this.emit('call:ringing', data);
        });

        this.socket.on('call:connected', (data) => {
            console.log('📞 Call Connected:', data);
            this.emit('call:connected', data);
        });

        this.socket.on('call:ended', (data) => {
            console.log('📞 Call Ended:', data);
            this.emit('call:ended', data);
        });

        this.socket.on('call:failed', (data) => {
            console.log('❌ Call Failed:', data);
            this.emit('call:failed', data);
        });

        this.socket.on('call:error', (data) => {
            console.error('❌ Call Error:', data);
            this.emit('call:error', data);
        });

        this.socket.on('call:dialing', (data) => {
            console.log('📞 Call Dialing:', data);
            this.emit('call:dialing', data);
        });

        this.socket.on('call:status', (data) => {
            console.log('📞 Call Status Update:', data);
            this.emit('call:status', data);
        });
        // ============ TASK EVENTS ============
        this.socket.on('task:assigned', (data) => {
            this.emit('task:assigned', data);
        });

        this.socket.on('task:updated', (data) => {
            this.emit('task:updated', data);
        });

        this.socket.on('task:completed', (data) => {
            this.emit('task:completed', data);
        });
    }

    // ============ NEW: Register status callback ============
    onPBXStatusChange(callback) {
        if (typeof callback === 'function') {
            this.statusCallbacks.push(callback);
            // Immediately send current status
            if (this._pbxStatus.isReady) {
                callback(this._pbxStatus);
            }
        }
        // Return unsubscribe function
        return () => {
            const index = this.statusCallbacks.indexOf(callback);
            if (index > -1) {
                this.statusCallbacks.splice(index, 1);
            }
        };
    }

    // ============ EVENT MANAGEMENT ============
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        const listeners = this.listeners.get(event);
        if (!listeners.includes(callback)) {
            listeners.push(callback);
        }
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        const callbacksCopy = [...callbacks];
        callbacksCopy.forEach((callback) => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Error in ${event} listener:`, error);
            }
        });
    }

    // ============ NEW: Get current PBX status ============
    getPBXStatusSync() {
        return this._pbxStatus;
    }


    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
            this.listeners.delete(event);
        }
    }

    // ============ PUBLIC METHODS ============
    getSocket() {
        return this.socket;
    }

    // ✅ Ensure this method exists and is properly defined
    isConnected() {
        return this._isConnected && this.socket && this.socket.connected;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this._isConnected = false;
        this.isConnecting = false;
        this.listeners.clear();
        this.lastPBXStatus = null;
        this.pbxStatusEmitted = false;
        console.log('🔌 Socket disconnected manually');
    }

    emitToServer(event, data) {
        if (!this.socket || !this._isConnected) {
            console.warn(`⚠️ Cannot emit ${event}: socket not connected`);
            return;
        }
        this.socket.emit(event, data);
    }

    getPBXStatus() {
        if (this.pbxStatusEmitted) {
            console.log('📡 PBX status already emitted, skipping duplicate request');
            return;
        }
        this.emitToServer('pbx:getStatus');
    }

    monitorCall(callId) {
        this.emitToServer('call:monitor', { callId });
    }

    // ✅ Alias for isConnected for backward compatibility
    get connected() {
        return this.isConnected();
    }
}

// ✅ Create and export the singleton instance
export const socketService = new SocketService();

// ✅ Default export for easier importing
export default socketService;