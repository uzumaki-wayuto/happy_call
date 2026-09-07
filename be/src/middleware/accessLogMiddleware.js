// src/middleware/accessLogMiddleware.js
import { immutabilityService } from '../services/immutabilityService.js';

// ============ ACCESS LOG MIDDLEWARE ============
export const accessLogMiddleware = async(req, res, next) => {
    // Skip logging for health checks and login
    const skipPaths = ['/health', '/login', '/auth/login', '/api/health'];
    if (req.path === '/health' || req.path === '/login' || req.path === '/auth/login') {
        return next();
    }

    // Store original send function
    const originalSend = res.send;
    const originalJson = res.json;

    // Override send to log after response
    res.send = function(data) {
        // Log access
        logAccess(req, res, data);
        return originalSend.call(this, data);
    };

    res.json = function(data) {
        // Log access
        logAccess(req, res, data);
        return originalJson.call(this, data);
    };

    next();
};

// ============ LOG ACCESS FUNCTION ============
async function logAccess(req, res, data) {
    try {
        // Skip logging if no user or if it's a static asset
        if (!req.user || !req.user.id || req.path.includes('.')) {
            return;
        }

        // Determine action based on method and path
        const action = getAction(req.method, req.path);
        const targetType = getTargetType(req.path);
        let targetId = null;
        if (req.params) {
            targetId = req.params.id || req.params.taskId || req.params.agentId || null;
        }
        if (!targetId && req.body && req.body.taskId) {
            targetId = req.body.taskId;
        }

        // For phone number views, log specially
        const isPhoneView = req.path.includes('/tasks/') && req.query && req.query.includePhone === 'true';

        const details = {
            method: req.method,
            path: req.path,
            query: req.query,
            isPhoneView: isPhoneView
        };
        if (isPhoneView) {
            details.action = 'VIEW_PHONE_NUMBER';
        }

        // Log the access
        await immutabilityService.logAccess(
            req.user.id,
            action,
            targetType,
            targetId,
            req.ip || req.connection.remoteAddress,
            details
        );

        // For phone number views, add audit header
        if (isPhoneView) {
            res.set('X-Audit-Logged', 'true');
        }

    } catch (error) {
        console.error('❌ Error in access log middleware:', error);
        // Don't block the request
    }
}

// ============ HELPER FUNCTIONS ============
function getAction(method, path) {
    const actionMap = {
        'GET': {
            '/dashboard': 'VIEW_DASHBOARD',
            '/tasks': 'VIEW_TASKS',
            '/tasks/': 'VIEW_TASK_DETAIL',
            '/attempts': 'VIEW_ATTEMPTS',
            '/reports': 'VIEW_REPORTS',
            '/users': 'VIEW_USERS',
            '/campaigns': 'VIEW_CAMPAIGNS',
            '/exceptions': 'VIEW_EXCEPTIONS',
            '/callbacks': 'VIEW_CALLBACKS',
        },
        'POST': {
            '/tasks': 'CREATE_TASK',
            '/attempts': 'CREATE_ATTEMPT',
            '/campaigns/upload': 'UPLOAD_TARGET_LIST',
            '/users': 'CREATE_USER',
            '/auth/login': 'LOGIN',
        },
        'PUT': {
            '/tasks/': 'UPDATE_TASK',
            '/users/': 'UPDATE_USER',
            '/campaigns/': 'UPDATE_CAMPAIGN',
            '/exceptions/': 'RESOLVE_EXCEPTION',
        },
        'DELETE': {
            '/users/': 'DELETE_USER',
            '/campaigns/': 'DELETE_CAMPAIGN',
        }
    };

    // Check exact match first
    const methodMap = actionMap[method] || {};
    for (const [key, value] of Object.entries(methodMap)) {
        if (path === key) return value;
        if (path.startsWith(key) && key !== '/') return value;
    }

    // Default actions
    const defaultActions = {
        'GET': 'VIEW',
        'POST': 'CREATE',
        'PUT': 'UPDATE',
        'DELETE': 'DELETE',
        'PATCH': 'UPDATE'
    };

    return defaultActions[method] || 'UNKNOWN';
}

function getTargetType(path) {
    const typeMap = {
        '/tasks': 'VERIFICATION_TASK',
        '/attempts': 'CALL_ATTEMPT',
        '/users': 'USER',
        '/campaigns': 'CAMPAIGN',
        '/reports': 'REPORT',
        '/exceptions': 'EXCEPTION',
        '/callbacks': 'CALLBACK',
        '/dashboard': 'DASHBOARD',
        '/loans': 'LOAN',
    };

    for (const [key, value] of Object.entries(typeMap)) {
        if (path.startsWith(key)) return value;
    }

    return 'UNKNOWN';
}