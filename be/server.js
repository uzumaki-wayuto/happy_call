// server.js - COMPLETE FIXED VERSION
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import { getConnection } from './src/config/db.js';
import { authService } from './src/services/authService.js';
import { taskService } from './src/services/taskService.js';
import { userService } from './src/services/userService.js';
import { campaignService } from './src/services/campaignService.js';
import { attemptService } from './src/services/attemptService.js';
import { reportService } from './src/services/reportService.js';
import { dashboardService } from './src/services/dashboardService.js';
import { agentAssignmentService } from './src/services/agentAssignmentService.js';
import { immutabilityService } from './src/services/immutabilityService.js';
import { pbxService } from './src/services/pbxService.js';
import { assignmentService } from './src/services/assignmentService.js';
import { accessLogMiddleware } from './src/middleware/accessLogMiddleware.js';
import { immutabilityMiddleware } from './src/middleware/immutabilityMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// ============ MIDDLEWARE ============
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express.json());
app.use(accessLogMiddleware);
app.use(immutabilityMiddleware);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
});
app.use('/api/', limiter);

// ============ CREATE HTTP SERVER WITH SOCKET.IO ============
const server = createServer(app);
const io = new SocketServer(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

// ============ SOCKET.IO MIDDLEWARE ============
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

// ============ SOCKET.IO CONNECTION HANDLER ============
io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id} (User: ${socket.userId})`);

    socket.join(`user_${socket.userId}`);

    // PBX event forwarders
    const pbxEventHandlers = {
        'call:started': (data) => {
            socket.emit('call:started', data);
            if (data.agentId) {
                io.to(`user_${data.agentId}`).emit('call:started', data);
            }
        },
        'call:ringing': (data) => {
            socket.emit('call:ringing', data);
            if (data.agentId) {
                io.to(`user_${data.agentId}`).emit('call:ringing', data);
            }
        },
        'call:connected': (data) => {
            socket.emit('call:connected', data);
            if (data.agentId) {
                io.to(`user_${data.agentId}`).emit('call:connected', data);
            }
        },
        'call:ended': (data) => {
            socket.emit('call:ended', data);
            if (data.agentId) {
                io.to(`user_${data.agentId}`).emit('call:ended', data);
            }
        },
        'call:error': (data) => {
            socket.emit('call:error', data);
            if (data.agentId) {
                io.to(`user_${data.agentId}`).emit('call:error', data);
            }
        },
        'pbx:status': (data) => {
            socket.emit('pbx:status', data);
        }
    };

    Object.keys(pbxEventHandlers).forEach(event => {
        pbxService.on(event, pbxEventHandlers[event]);
    });

    // Client events
    socket.on('pbx:getStatus', async() => {
        try {
            const status = {
                connected: pbxService.isConnected(),
                activeCalls: pbxService.getActiveCalls().length,
                activeCallsList: pbxService.getActiveCalls(),
            };
            socket.emit('pbx:status', status);
        } catch (error) {
            socket.emit('pbx:error', { message: error.message });
        }
    });

    socket.on('call:monitor', async(data) => {
        const { callId } = data;
        if (callId) {
            const status = pbxService.getCallStatus(callId);
            if (status) {
                socket.emit('call:status', { callId, status });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
        Object.keys(pbxEventHandlers).forEach(event => {
            pbxService.off(event, pbxEventHandlers[event]);
        });
    });
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ DASHBOARD ROUTES ============
app.get('/api/dashboard/admin/stats', async(req, res) => {
    try {
        const stats = await dashboardService.getAdminStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

app.get('/api/dashboard/supervisor/stats', async(req, res) => {
    try {
        const stats = await dashboardService.getSupervisorStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching supervisor stats:', error);
        res.status(500).json({ error: 'Failed to fetch supervisor stats' });
    }
});

app.get('/api/dashboard/agent/:agentId/stats', async(req, res) => {
    try {
        const { agentId } = req.params;
        const stats = await dashboardService.getAgentStats(agentId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching agent stats:', error);
        res.status(500).json({ error: 'Failed to fetch agent stats' });
    }
});

app.get('/api/dashboard/top-branches', async(req, res) => {
    try {
        const branches = await dashboardService.getTopBranches();
        res.json(branches);
    } catch (error) {
        console.error('Error fetching top branches:', error);
        res.status(500).json({ error: 'Failed to fetch top branches' });
    }
});

app.get('/api/dashboard/notices', async(req, res) => {
    try {
        const notices = await dashboardService.getSystemNotices();
        res.json(notices);
    } catch (error) {
        console.error('Error fetching notices:', error);
        res.status(200).json([
            { type: 'info', message: 'System is running normally', date: new Date().toISOString().slice(0, 10) },
            { type: 'success', message: 'Welcome to Happy Call System', date: new Date().toISOString().slice(0, 10) },
        ]);
    }
});

app.get('/api/dashboard/exception-by-type', async(req, res) => {
    try {
        const data = await dashboardService.getExceptionByType();
        res.json(data);
    } catch (error) {
        console.error('Error fetching exception by type:', error);
        res.status(500).json({ error: 'Failed to fetch exception data' });
    }
});

app.get('/api/dashboard/critical-exceptions', async(req, res) => {
    try {
        const data = await dashboardService.getCriticalExceptions();
        res.json(data);
    } catch (error) {
        console.error('Error fetching critical exceptions:', error);
        res.status(500).json({ error: 'Failed to fetch critical exceptions' });
    }
});

// ============ AUTH ROUTES ============
app.post('/api/auth/login', async(req, res) => {
    try {
        const { username, password } = req.body;
        const result = await authService.login(username, password);
        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

app.post('/api/auth/refresh', async(req, res) => {
    try {
        const { token } = req.body;
        const result = await authService.refreshToken(token);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// ============ TASK ROUTES ============
app.get('/api/tasks', async(req, res) => {
    try {
        const { agentId, status, type, searchText } = req.query;

        let tasks;
        const hasValidAgentId = agentId && agentId !== 'null' && agentId !== 'undefined';

        if (status && status.includes(',')) {
            const statuses = status.split(',');
            tasks = await taskService.getTasksByStatus(statuses, type);
        } else if (hasValidAgentId) {
            tasks = await taskService.getTasksByAgent(agentId, { status, type, searchText });
        } else {
            tasks = await taskService.getTasks({ status, type, searchText });
        }

        res.json(tasks || []);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

app.get('/api/tasks/:id', async(req, res) => {
    try {
        const task = await taskService.getTaskById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});

app.post('/api/tasks', async(req, res) => {
    try {
        const task = await taskService.createTask(req.body);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

app.put('/api/tasks/:id/status', async(req, res) => {
    try {
        const { status, agentId } = req.body;
        await taskService.updateTaskStatus(req.params.id, status, agentId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// ============ ATTEMPT ROUTES ============
app.post('/api/attempts', async(req, res) => {
    try {
        const attempt = await attemptService.saveAttempt(req.body);
        res.status(201).json(attempt);
    } catch (error) {
        console.error('Error saving attempt:', error);
        res.status(500).json({ error: 'Failed to save attempt' });
    }
});

app.get('/api/attempts/task/:taskId', async(req, res) => {
    try {
        const attempts = await attemptService.getAttemptsByTask(req.params.taskId);
        res.json(attempts);
    } catch (error) {
        console.error('Error fetching attempts:', error);
        res.status(500).json({ error: 'Failed to fetch attempts' });
    }
});

app.get('/api/attempts/agent/:agentId', async(req, res) => {
    try {
        const { limit } = req.query;
        const validLimit = parseInt(limit) || 50;
        const attempts = await attemptService.getAttemptsByAgent(req.params.agentId, validLimit);
        res.json(attempts);
    } catch (error) {
        console.error('Error fetching agent attempts:', error);
        res.status(500).json({ error: 'Failed to fetch attempts' });
    }
});

// ============ USER ROUTES ============
app.get('/api/users', async(req, res) => {
    try {
        const { role, status, search } = req.query;
        const users = await userService.getUsers({ role, status, search });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/api/users/:id', async(req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

app.post('/api/users', async(req, res) => {
    try {
        const user = await userService.createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.put('/api/users/:id', async(req, res) => {
    try {
        await userService.updateUser(req.params.id, req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/users/:id', async(req, res) => {
    try {
        await userService.deactivateUser(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deactivating user:', error);
        res.status(500).json({ error: 'Failed to deactivate user' });
    }
});

app.post('/api/users/:id/password', async(req, res) => {
    try {
        const { newPassword } = req.body;
        await userService.changePassword(req.params.id, newPassword);
        res.json({ success: true });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ============ CAMPAIGN ROUTES ============
app.get('/api/campaigns', async(req, res) => {
    try {
        const { status, type } = req.query;
        const campaigns = await campaignService.getCampaigns({ status, type });
        res.json(campaigns);
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

app.get('/api/campaigns/:id', async(req, res) => {
    try {
        const campaign = await campaignService.getCampaignById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        res.json(campaign);
    } catch (error) {
        console.error('Error fetching campaign:', error);
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
});

app.post('/api/campaigns', async(req, res) => {
    try {
        const campaign = await campaignService.createCampaign(req.body);
        res.status(201).json(campaign);
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

app.post('/api/campaigns/upload', async(req, res) => {
    try {
        const result = await campaignService.uploadTargetList(req.body);
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error uploading target list:', error);
        res.status(500).json({ error: 'Failed to upload target list' });
    }
});

app.put('/api/campaigns/:id', async(req, res) => {
    try {
        await campaignService.updateCampaign(req.params.id, req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
});

app.delete('/api/campaigns/:id', async(req, res) => {
    try {
        await campaignService.deleteCampaign(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ error: 'Failed to delete campaign' });
    }
});

// ============ REPORT ROUTES ============
app.get('/api/reports/agent-performance', async(req, res) => {
    try {
        const { role } = req.query;
        const data = await reportService.getAgentPerformance({ role });
        res.json(data);
    } catch (error) {
        console.error('Error fetching agent performance:', error);
        res.status(500).json({ error: 'Failed to fetch agent performance data' });
    }
});

app.get('/api/reports/trend', async(req, res) => {
    try {
        const { timeFrame } = req.query;
        const data = await reportService.getTrendData({ timeFrame });
        res.json(data);
    } catch (error) {
        console.error('Error fetching trend data:', error);
        res.status(500).json({ error: 'Failed to fetch trend data' });
    }
});

app.get('/api/reports/trend/agent/:agentId', async(req, res) => {
    try {
        const { agentId } = req.params;
        const { timeFrame } = req.query;
        const data = await reportService.getAgentTrendData(agentId, { timeFrame });
        res.json(data);
    } catch (error) {
        console.error('Error fetching agent trend:', error);
        res.status(500).json({ error: 'Failed to fetch agent trend data' });
    }
});

app.get('/api/reports/distribution', async(req, res) => {
    try {
        const data = await reportService.getResultDistribution();
        res.json(data);
    } catch (error) {
        console.error('Error fetching result distribution:', error);
        res.status(500).json({ error: 'Failed to fetch result distribution' });
    }
});

// ============ ASSIGNMENT ROUTES ============
app.post('/api/tasks/auto-assign', async(req, res) => {
    try {
        const { taskType } = req.body;
        const result = await assignmentService.autoAssignPendingTasks(taskType);
        res.json(result);
    } catch (error) {
        console.error('Error auto-assigning tasks:', error);
        res.status(500).json({ error: 'Failed to auto-assign tasks' });
    }
});

app.post('/api/tasks/assign', async(req, res) => {
    try {
        const { taskIds, agentId } = req.body;
        const result = await assignmentService.assignTasksToAgentBatch(taskIds, agentId);
        res.json(result);
    } catch (error) {
        console.error('Error assigning tasks:', error);
        res.status(500).json({ error: 'Failed to assign tasks' });
    }
});

app.get('/api/tasks/unassigned', async(req, res) => {
    try {
        const { taskType } = req.query;
        const tasks = await taskService.getUnassignedTasks(taskType);
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching unassigned tasks:', error);
        res.status(500).json({ error: 'Failed to fetch unassigned tasks' });
    }
});

app.post('/api/tasks/suggestions', async(req, res) => {
    try {
        const { taskId } = req.body;
        const result = await assignmentService.getAssignmentSuggestions(taskId);
        res.json(result);
    } catch (error) {
        console.error('Error getting assignment suggestions:', error);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

// ============ PBX ROUTES ============
app.get('/api/pbx/status', async(req, res) => {
    try {
        const connected = pbxService.isConnected();
        res.json({
            connected: connected,
            activeCalls: pbxService.getActiveCalls().length
        });
    } catch (error) {
        console.error('Error getting PBX status:', error);
        res.status(500).json({ error: 'Failed to get PBX status' });
    }
});

app.post('/api/pbx/connect', async(req, res) => {
    try {
        const connected = await pbxService.connect();
        res.json({ success: connected });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pbx/call', async(req, res) => {
    try {
        const { agentExtension, customerPhone, taskId, agentId } = req.body;

        if (!agentExtension || !customerPhone || !taskId || !agentId) {
            return res.status(400).json({
                error: 'Missing required fields: agentExtension, customerPhone, taskId, agentId'
            });
        }

        console.log(`📞 Click-to-Call request: ${agentExtension} → ${customerPhone}`);
        const result = await pbxService.clickToCall(agentExtension, customerPhone, taskId, agentId);
        res.json(result);
    } catch (error) {
        console.error('❌ Click-to-Call error:', error);
        res.status(500).json({ error: error.message || 'Failed to make call' });
    }
});

app.post('/api/pbx/manual', async(req, res) => {
    try {
        const { taskId, agentId, manualReason, reasonDetail, customerPhone } = req.body;
        const result = await pbxService.manualDial(taskId, agentId, manualReason, reasonDetail, customerPhone);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/pbx/call/:callId', async(req, res) => {
    try {
        const status = pbxService.getCallStatus(req.params.callId);
        res.json({ status: status || 'not_found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ AGENT ASSIGNMENT DASHBOARD ROUTES ============
app.get('/api/assignment/workload', async(req, res) => {
    try {
        const { taskType } = req.query;
        const workload = await agentAssignmentService.getAgentWorkload(taskType);
        res.json(workload);
    } catch (error) {
        console.error('Error fetching agent workload:', error);
        res.status(500).json({ error: 'Failed to fetch agent workload' });
    }
});

app.get('/api/assignment/agent/:agentId/tasks', async(req, res) => {
    try {
        const { agentId } = req.params;
        const { status, type, searchText } = req.query;
        const tasks = await agentAssignmentService.getTasksByAgentDetailed(agentId, {
            status,
            type,
            searchText
        });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching agent tasks:', error);
        res.status(500).json({ error: 'Failed to fetch agent tasks' });
    }
});

app.get('/api/assignment/tasks', async(req, res) => {
    try {
        const { agentId, status, type, assignedOnly, unassignedOnly, searchText } = req.query;
        const tasks = await agentAssignmentService.getAllTasksWithAgent({
            agentId,
            status,
            type,
            assignedOnly,
            unassignedOnly,
            searchText
        });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks with agent:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

app.get('/api/assignment/summary', async(req, res) => {
    try {
        const summary = await agentAssignmentService.getAgentAssignmentSummary();
        res.json(summary);
    } catch (error) {
        console.error('Error fetching assignment summary:', error);
        res.status(500).json({ error: 'Failed to fetch assignment summary' });
    }
});

app.get('/api/assignment/performance', async(req, res) => {
    try {
        const { agentId } = req.query;
        const metrics = await agentAssignmentService.getAgentPerformanceMetrics(agentId);
        res.json(metrics);
    } catch (error) {
        console.error('Error fetching agent performance:', error);
        res.status(500).json({ error: 'Failed to fetch agent performance' });
    }
});

// ============ EXCEPTION ROUTES ============
app.get('/api/exceptions', async(req, res) => {
    try {
        const { status, severity } = req.query;
        const pool = await getConnection();
        let query = `
            SELECT 
                exception_id as id,
                task_id as taskId,
                loan_id as loanId,
                customer_name as customerName,
                phone,
                type,
                amount,
                severity,
                status,
                dispute_reason as disputeReason,
                description,
                reported_by as reportedBy,
                reported_at as reportedAt,
                attempts,
                notes
            FROM EXCEPTIONS
            WHERE 1=1
        `;

        if (status) {
            query += ` AND status = @status`;
        }
        if (severity) {
            query += ` AND severity = @severity`;
        }

        query += ` ORDER BY reported_at DESC`;

        const result = await pool.request();
        if (status) result.input('status', status);
        if (severity) result.input('severity', severity);
        const data = await result.query(query);
        res.json(data.recordset);
    } catch (error) {
        console.error('Error fetching exceptions:', error);
        res.status(500).json({ error: 'Failed to fetch exceptions' });
    }
});

app.put('/api/exceptions/:id/resolve', async(req, res) => {
    try {
        const { id } = req.params;
        const { resolution, resolvedBy } = req.body;
        const pool = await getConnection();
        await pool.request()
            .input('id', id)
            .input('resolution', resolution || 'Resolved by supervisor')
            .input('resolvedBy', resolvedBy)
            .query(`
                UPDATE EXCEPTIONS
                SET 
                    status = 'RESOLVED',
                    resolved_at = SYSUTCDATETIME(),
                    resolved_by = @resolvedBy,
                    notes = @resolution
                WHERE exception_id = @id
            `);
        res.json({ success: true });
    } catch (error) {
        console.error('Error resolving exception:', error);
        res.status(500).json({ error: 'Failed to resolve exception' });
    }
});

// ============ AUDIT LOG ROUTES ============
app.get('/api/audit/logs', async(req, res) => {
    try {
        const { userId, limit } = req.query;
        const logs = await immutabilityService.getAccessLogs(userId, limit || 100);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching access logs:', error);
        res.status(500).json({ error: 'Failed to fetch access logs' });
    }
});

app.post('/api/audit/log', async(req, res) => {
    try {
        const { userId, action, targetType, targetId, details } = req.body;
        const result = await immutabilityService.logAccess(
            userId,
            action,
            targetType,
            targetId,
            req.ip || req.connection.remoteAddress,
            details
        );
        res.json(result);
    } catch (error) {
        console.error('Error logging access:', error);
        res.status(500).json({ error: 'Failed to log access' });
    }
});

// ============ DEBUG ROUTES ============
app.get('/api/debug/users', async(req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(
            `SELECT user_id, username, role, verification_type, status FROM USERS`
        );
        res.json({
            total: result.recordset.length,
            users: result.recordset
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ START SERVER ============
const startServer = async() => {
    try {
        await getConnection();
        console.log('✅ Database connected');

        // Connect PBX
        try {
            const pbxConnected = await pbxService.connect();
            if (pbxConnected) {
                console.log('✅ PBX connected successfully');
                io.emit('pbx:status', { connected: true, activeCalls: 0 });
            } else {
                console.log('⚠️ PBX connection failed - Click-to-Call will not work');
                io.emit('pbx:status', { connected: false, activeCalls: 0, error: 'PBX connection failed' });
            }
        } catch (pbxError) {
            console.log('⚠️ PBX not available:', pbxError.message);
            io.emit('pbx:status', { connected: false, activeCalls: 0, error: pbxError.message });
        }

        // Start server with Socket.IO
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🔌 Socket.IO ready on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();