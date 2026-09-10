// be/src/routes/callbackRoutes.js
import express from 'express';
import { getConnection } from '../config/db.js';

const router = express.Router();

// ============ GET ALL CALLBACKS ============
router.get('/', async(req, res) => {
    try {
        const pool = await getConnection();
        const { agentId, status, type } = req.query;

        let query = `
            SELECT 
                callback_id as id,
                task_id as taskId,
                loan_id as loanId,
                customer_name as customerName,
                phone,
                type,
                callback_date as callbackDate,
                callback_time as callbackTime,
                reason,
                notes,
                status,
                assigned_to as assignedTo,
                created_at as createdAt,
                completed_at as completedAt
            FROM CALLBACKS
            WHERE 1=1
        `;

        const request = pool.request();

        if (agentId) {
            query += ` AND assigned_to = @agentId`;
            request.input('agentId', agentId);
        }

        if (status && status !== 'all') {
            query += ` AND status = @status`;
            request.input('status', status);
        }

        if (type && type !== 'all') {
            query += ` AND type = @type`;
            request.input('type', type);
        }

        query += ` ORDER BY callback_date DESC, callback_time DESC`;

        const result = await request.query(query);
        res.json(result.recordset || []);
    } catch (error) {
        console.error('Error fetching callbacks:', error);
        res.status(500).json({ error: 'Failed to fetch callbacks' });
    }
});

// ============ GET CALLBACK BY ID ============
router.get('/:id', async(req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', req.params.id)
            .query(`
                SELECT 
                    callback_id as id,
                    task_id as taskId,
                    loan_id as loanId,
                    customer_name as customerName,
                    phone,
                    type,
                    callback_date as callbackDate,
                    callback_time as callbackTime,
                    reason,
                    notes,
                    status,
                    assigned_to as assignedTo,
                    created_at as createdAt,
                    completed_at as completedAt
                FROM CALLBACKS
                WHERE callback_id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Callback not found' });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching callback:', error);
        res.status(500).json({ error: 'Failed to fetch callback' });
    }
});

// ============ CREATE CALLBACK ============
router.post('/', async(req, res) => {
    try {
        const pool = await getConnection();
        const {
            taskId,
            loanId,
            customerName,
            phone,
            type,
            callbackDate,
            callbackTime,
            reason,
            notes,
            assignedTo
        } = req.body;

        // Validate required fields
        if (!customerName || !loanId || !phone || !type || !callbackDate || !callbackTime || !reason) {
            return res.status(400).json({
                error: 'Missing required fields: customerName, loanId, phone, type, callbackDate, callbackTime, reason'
            });
        }

        const result = await pool.request()
            .input('taskId', taskId || null)
            .input('loanId', loanId)
            .input('customerName', customerName)
            .input('phone', phone)
            .input('type', type)
            .input('callbackDate', callbackDate)
            .input('callbackTime', callbackTime)
            .input('reason', reason)
            .input('notes', notes || '')
            .input('assignedTo', assignedTo || null)
            .input('status', 'PENDING')
            .query(`
                INSERT INTO CALLBACKS (
                    task_id,
                    loan_id,
                    customer_name,
                    phone,
                    type,
                    callback_date,
                    callback_time,
                    reason,
                    notes,
                    assigned_to,
                    status,
                    created_at
                )
                OUTPUT 
                    INSERTED.callback_id as id,
                    INSERTED.task_id as taskId,
                    INSERTED.loan_id as loanId,
                    INSERTED.customer_name as customerName,
                    INSERTED.phone,
                    INSERTED.type,
                    INSERTED.callback_date as callbackDate,
                    INSERTED.callback_time as callbackTime,
                    INSERTED.reason,
                    INSERTED.notes,
                    INSERTED.status,
                    INSERTED.assigned_to as assignedTo,
                    INSERTED.created_at as createdAt
                VALUES (
                    @taskId,
                    @loanId,
                    @customerName,
                    @phone,
                    @type,
                    @callbackDate,
                    @callbackTime,
                    @reason,
                    @notes,
                    @assignedTo,
                    @status,
                    SYSUTCDATETIME()
                )
            `);

        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('Error creating callback:', error);
        res.status(500).json({ error: 'Failed to create callback' });
    }
});

// ============ UPDATE CALLBACK ============
router.put('/:id', async(req, res) => {
    try {
        const pool = await getConnection();
        const { id } = req.params;
        const { status, notes } = req.body;

        // Check if callback exists
        const checkResult = await pool.request()
            .input('id', id)
            .query('SELECT * FROM CALLBACKS WHERE callback_id = @id');

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Callback not found' });
        }

        let query = `
            UPDATE CALLBACKS 
            SET 
                status = @status,
                notes = COALESCE(@notes, notes),
                updated_at = SYSUTCDATETIME()
        `;

        const request = pool.request()
            .input('id', id)
            .input('status', status || checkResult.recordset[0].status)
            .input('notes', notes || checkResult.recordset[0].notes);

        if (status === 'COMPLETED') {
            query += `, completed_at = SYSUTCDATETIME()`;
        }

        query += ` WHERE callback_id = @id`;

        await request.query(query);

        // Get updated callback
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT 
                    callback_id as id,
                    task_id as taskId,
                    loan_id as loanId,
                    customer_name as customerName,
                    phone,
                    type,
                    callback_date as callbackDate,
                    callback_time as callbackTime,
                    reason,
                    notes,
                    status,
                    assigned_to as assignedTo,
                    created_at as createdAt
                FROM CALLBACKS
                WHERE callback_id = @id
            `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error updating callback:', error);
        res.status(500).json({ error: 'Failed to update callback' });
    }
});

// ============ DELETE CALLBACK ============
router.delete('/:id', async(req, res) => {
    try {
        const pool = await getConnection();
        const { id } = req.params;

        // Check if callback exists
        const checkResult = await pool.request()
            .input('id', id)
            .query('SELECT callback_id FROM CALLBACKS WHERE callback_id = @id');

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Callback not found' });
        }

        await pool.request()
            .input('id', id)
            .query('DELETE FROM CALLBACKS WHERE callback_id = @id');

        res.json({ success: true, message: 'Callback deleted successfully' });
    } catch (error) {
        console.error('Error deleting callback:', error);
        res.status(500).json({ error: 'Failed to delete callback' });
    }
});

export default router;