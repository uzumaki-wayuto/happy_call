// src/middleware/authMiddleware.js

export const checkPermission = (requiredRoles) => {
    return (req, res, next) => {
        const user = req.user; // From JWT

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!requiredRoles.includes(user.role)) {
            return res
                .status(403)
                .json({ error: 'Forbidden - Insufficient permissions' });
        }

        next();
    };
};

// In your routes
router.get(
    '/api/loans/unassigned',
    checkPermission(['ADMIN', 'SUPERVISOR']),
    async(req, res) => {
        // Only return loans for supervisor's campaigns if supervisor
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';
        const isSupervisor = req.user.role === 'SUPERVISOR';

        let query = `
      SELECT l.*, t.task_type
      FROM LOANS l
      LEFT JOIN VERIFICATION_TASKS t ON l.loan_id = t.loan_id
      WHERE l.campaign_id IS NULL
    `;

        // Supervisors only see loans from their campaigns
        if (isSupervisor) {
            query += ` AND l.supervisor_id = @userId`;
        }

        const result = await pool.request().input('userId', userId).query(query);

        res.json(result.recordset);
    }
);