// src/middleware/immutabilityMiddleware.js

// ============ BACKEND: Prevent UPDATE/DELETE on CALL_ATTEMPTS ============
export const immutabilityMiddleware = async(req, res, next) => {
    // Check if the request is for CALL_ATTEMPTS
    const isCallAttempts = req.path.includes('/attempts/') &&
        (req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH');

    if (isCallAttempts) {
        return res.status(403).json({
            error: 'CALL_ATTEMPTS are immutable and cannot be modified or deleted',
            code: 'IMMUTABLE_RECORD'
        });
    }

    // Check if the request is trying to update CALL_ATTEMPTS via task update
    if (req.method === 'PUT' && req.path.includes('/tasks/')) {
        const { status } = req.body;
        // Allow status updates but prevent modifying attempt data
        const allowedFields = ['status', 'assigned_agent_id'];
        const invalidFields = Object.keys(req.body).filter(f => !allowedFields.includes(f));

        if (req.body) {
            for (const field of Object.keys(req.body)) {
                if (!allowedFields.includes(field)) {
                    invalidFields.push(field);
                }
            }
        }

        if (invalidFields.length > 0) {
            return res.status(400).json({
                error: `Cannot update fields: ${invalidFields.join(', ')}`,
                code: 'INVALID_FIELD_UPDATE'
            });
        }
    }

    next();
};