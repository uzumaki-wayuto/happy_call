// src/services/campaignService.js
import { getConnection } from '../config/db.js';

export const campaignService = {
    // ============ TARGET LIST UPLOAD ============
    uploadTargetList: async(payload) => {
        const { taskType, rows, campaignAssignment } = payload;
        const createdTasks = [];
        const errors = [];
        let assignedCount = 0;
        let campaignAssigned = false;
        let assignedCampaignId = null;

        console.log('📤 Upload payload:', JSON.stringify(payload, null, 2));

        if (!taskType) {
            return {
                success: false,
                error: 'taskType is required',
                totalRows: rows ? rows.length : 0,
                created: 0,
                assigned: 0,
            };
        }
        if (!rows || rows.length === 0) {
            return {
                success: false,
                error: 'No rows provided',
                totalRows: 0,
                created: 0,
                assigned: 0,
            };
        }

        try {
            const pool = await getConnection();

            // Helper function to parse date from DD-MM-YYYY to YYYY-MM-DD
            const parseDate = (dateStr) => {
                if (!dateStr) return null;

                // If it's already a Date object, return it
                if (dateStr instanceof Date) return dateStr;

                // Try to parse DD-MM-YYYY format
                const parts = dateStr.toString().split('-');
                if (parts.length === 3) {
                    // Check if it's DD-MM-YYYY (day-month-year)
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1; // Month is 0-indexed in JS
                    const year = parseInt(parts[2]);

                    // If year is 2 digits, convert to 4 digits
                    const fullYear = year < 100 ? 2000 + year : year;

                    const date = new Date(fullYear, month, day);

                    // Check if date is valid
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }

                // Try other formats
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    return date;
                }

                console.warn(`⚠️ Unable to parse date: ${dateStr}`);
                return null;
            };

            // ✅ NEW: Check if loan is near maturity for DEPOSIT task
            const isNearMaturity = (disbursementDate, maturityDate) => {
                if (!disbursementDate || !maturityDate) return false;

                const today = new Date();
                const maturity = new Date(maturityDate);

                // Calculate months difference
                const monthsDiff = (maturity.getFullYear() - today.getFullYear()) * 12 +
                    (maturity.getMonth() - today.getMonth());

                // Create DEPOSIT task only if within 3 months of maturity
                // (or if maturity date has passed - should have been created earlier)
                return monthsDiff <= 3;
            };

            // ✅ NEW: Check if loan is newly originated for DISBURSEMENT task
            const isNewlyOriginated = (disbursementDate) => {
                if (!disbursementDate) return false;

                const today = new Date();
                const disbursement = new Date(disbursementDate);

                // Calculate days difference
                const daysDiff = Math.floor((today - disbursement) / (1000 * 60 * 60 * 24));

                // Create DISBURSEMENT task if within 30 days of disbursement
                // (or if loan is new and hasn't been verified yet)
                return daysDiff <= 30;
            };

            // Helper function to find campaign for a loan based on disbursement date
            const findCampaignForLoan = async(disbursementDate, taskType) => {
                if (!disbursementDate) return null;

                try {
                    const date = new Date(disbursementDate);
                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;

                    // Find active campaign for this month and type
                    const result = await pool
                        .request()
                        .input('year', year)
                        .input('month', month)
                        .input('taskType', taskType).query(`
                            SELECT TOP 1 campaign_id, name
                            FROM CAMPAIGNS
                            WHERE type = @taskType
                            AND status = 'ACTIVE'
                            AND YEAR(start_date) <= @year
                            AND YEAR(end_date) >= @year
                            AND MONTH(start_date) <= @month
                            AND MONTH(end_date) >= @month
                            ORDER BY start_date DESC
                        `);

                    if (result.recordset && result.recordset.length > 0) {
                        return result.recordset[0].campaign_id;
                    }

                    // If no active campaign, check for draft campaigns
                    const draftResult = await pool
                        .request()
                        .input('year', year)
                        .input('month', month)
                        .input('taskType', taskType).query(`
                            SELECT TOP 1 campaign_id, name
                            FROM CAMPAIGNS
                            WHERE type = @taskType
                            AND status IN ('DRAFT')
                            AND YEAR(start_date) <= @year
                            AND YEAR(end_date) >= @year
                            AND MONTH(start_date) <= @month
                            AND MONTH(end_date) >= @month
                            ORDER BY start_date DESC
                        `);

                    if (draftResult.recordset && draftResult.recordset.length > 0) {
                        return draftResult.recordset[0].campaign_id;
                    }

                    return null;
                } catch (error) {
                    console.error('Error finding campaign for loan:', error);
                    return null;
                }
            };

            // ✅ NEW: Create verification task helper
            const createVerificationTask = async(loanId, taskTypeToCreate, campaignToUse) => {
                const dueDate = new Date();
                dueDate.setHours(23, 59, 59, 999);

                const taskResult = await pool
                    .request()
                    .input('loanId', loanId)
                    .input('taskType', taskTypeToCreate)
                    .input('dueDateTime', dueDate)
                    .input('status', 'PENDING')
                    .query(`
                    INSERT INTO VERIFICATION_TASKS (
                        loan_id,
                        task_type,
                        due_datetime,
                        status
                    )
                    OUTPUT 
                        INSERTED.task_id as id,
                        INSERTED.loan_id as loanId,
                        INSERTED.task_type as taskType,
                        INSERTED.status,
                        INSERTED.due_datetime as dueDateTime
                    VALUES (
                        @loanId,
                        @taskType,
                        @dueDateTime,
                        @status
                    )
                `);

                return taskResult.recordset && taskResult.recordset.length > 0 ?
                    taskResult.recordset[0] :
                    null;
            };

            // Determine campaign assignment mode
            const { mode, campaignId: manualCampaignId } = campaignAssignment || {
                mode: 'none',
                campaignId: null,
            };
            console.log(`📋 Campaign assignment mode: ${mode}`);

            let createdCount = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    console.log(`📝 Processing row ${i + 1}/${rows.length}:`, row.loanId);

                    // Validate row
                    if (!row.loanId) {
                        errors.push(`Row ${i + 1}: loanId is required`);
                        continue;
                    }
                    if (!row.customerName) {
                        errors.push(`Row ${i + 1}: customerName is required`);
                        continue;
                    }
                    if (!row.phoneNumber) {
                        errors.push(`Row ${i + 1}: phoneNumber is required`);
                        continue;
                    }
                    if (!row.amount) {
                        errors.push(`Row ${i + 1}: amount is required`);
                        continue;
                    }
                    if (!row.branchId) {
                        errors.push(`Row ${i + 1}: branch ID is required`);
                        continue;
                    }

                    // Parse dates
                    const disbursementDate = parseDate(row.disbursementDate);
                    const maturityDate = parseDate(row.maturityDate);

                    console.log(`📅 Parsed dates:`, {
                        disbursementDate: disbursementDate ?
                            disbursementDate.toISOString().split('T')[0] : null,
                        maturityDate: maturityDate ?
                            maturityDate.toISOString().split('T')[0] : null,
                    });

                    // Determine which campaign to use for this loan
                    let campaignToUse = null;

                    if (mode === 'manual' && manualCampaignId) {
                        // Manual mode - use the selected campaign
                        campaignToUse = manualCampaignId;
                        console.log(`📋 Manual campaign selected: ${campaignToUse}`);
                    } else if (mode === 'auto' && row.disbursementDate) {
                        // Auto mode - find campaign based on disbursement date
                        campaignToUse = await findCampaignForLoan(
                            row.disbursementDate,
                            taskType
                        );
                        if (campaignToUse) {
                            console.log(
                                `📋 Auto-assigned loan ${row.loanId} to campaign ${campaignToUse}`
                            );
                        } else {
                            console.log(
                                `⚠️ No active campaign found for loan ${row.loanId} (${row.disbursementDate})`
                            );
                        }
                    } else {
                        console.log(`📋 No campaign assigned to loan ${row.loanId}`);
                    }

                    // If a campaign was found, mark as assigned
                    if (campaignToUse) {
                        campaignAssigned = true;
                        assignedCampaignId = campaignToUse;
                    }

                    // 1. Check if loan exists
                    const loanCheck = await pool
                        .request()
                        .input('loanId', row.loanId)
                        .query(
                            'SELECT loan_id, campaign_id FROM LOANS WHERE loan_id = @loanId'
                        );

                    // 2. If loan doesn't exist, create it with campaign_id
                    if (!loanCheck.recordset || loanCheck.recordset.length === 0) {
                        console.log(
                            `📝 Creating loan: ${row.loanId} with campaign_id: ${campaignId || 'NULL'}`
                        );

                        // DEBUG: Log the values being inserted
                        console.log('Inserting loan with values:', {
                            loanId: row.loanId,
                            customerName: row.customerName,
                            phone: row.phoneNumber,
                            amount: parseFloat(row.amount) || 0,
                            campaignId: campaignId || null,
                            branchId: row.branchId || '', // This is the key!
                            loanOfficer: row.loanOfficer || '',
                            disbursementDate: row.disbursementDate || null,
                            maturityDate: row.maturityDate || null,
                        });

                        await pool
                            .request()
                            .input('loanId', row.loanId)
                            .input('customerName', row.customerName)
                            .input('phone', row.phoneNumber)
                            .input('amount', parseFloat(row.amount) || 0)
                            .input('campaignId', campaignId || null)
                            .input('branchId', row.branchId || '')
                            .input('loanOfficer', row.loanOfficer || '')
                            .input('disbursementDate', row.disbursementDate || null)
                            .input('maturityDate', row.maturityDate || null)
                            .input('importedAt', new Date()).query(`
                                INSERT INTO LOANS (
                                    loan_id, 
                                    customer_name, 
                                    customer_phone, 
                                    loan_amount, 
                                    campaign_id,
                                    branch_id,
                                    loan_officer,
                                    disbursement_date,
                                    maturity_date,
                                    imported_at
                                )
                                VALUES (
                                    @loanId, 
                                    @customerName, 
                                    @phone, 
                                    @amount, 
                                    @campaignId,
                                    @branchId,
                                    @loanOfficer,
                                    @disbursementDate,
                                    @maturityDate,
                                    @importedAt
                                )
                            `);
                    } else {
                        // ✅ If loan exists, update campaign_id if provided and not already set
                        const existingLoan = loanCheck.recordset[0];
                        if (campaignToUse && !existingLoan.campaign_id) {
                            console.log(
                                `📝 Updating loan ${row.loanId} with campaign_id: ${campaignToUse}`
                            );
                            await pool
                                .request()
                                .input('loanId', row.loanId)
                                .input('campaignId', campaignToUse).query(`
                                    UPDATE LOANS 
                                    SET campaign_id = @campaignId,
                                        updated_at = SYSUTCDATETIME()
                                    WHERE loan_id = @loanId
                                `);
                        } else if (campaignToUse && existingLoan.campaign_id) {
                            console.log(
                                `⚠️ Loan ${row.loanId} already has campaign_id: ${existingLoan.campaign_id}`
                            );
                        }
                    }

                    // 3. Check if task already exists for this loan + type
                    const taskCheck = await pool
                        .request()
                        .input('loanId', row.loanId)
                        .input('taskType', taskType).query(`
                            SELECT task_id 
                            FROM VERIFICATION_TASKS 
                            WHERE loan_id = @loanId 
                            AND task_type = @taskType
                        `);

                    if (taskCheck.recordset && taskCheck.recordset.length > 0) {
                        errors.push(
                            `Task already exists for loan ${row.loanId} (${taskType})`
                        );
                        continue;
                    }

                    // 4. Create verification task
                    const dueDate = new Date();
                    dueDate.setHours(23, 59, 59, 999);

                    const taskResult = await pool
                        .request()
                        .input('loanId', row.loanId)
                        .input('taskType', taskType)
                        .input('dueDateTime', dueDate)
                        .input('status', 'PENDING').query(`
                            INSERT INTO VERIFICATION_TASKS (
                                loan_id, 
                                task_type, 
                                due_datetime, 
                                status
                            )
                            OUTPUT 
                                INSERTED.task_id as id,
                                INSERTED.loan_id as loanId,
                                INSERTED.task_type as taskType,
                                INSERTED.status,
                                INSERTED.due_datetime as dueDateTime
                            VALUES (
                                @loanId, 
                                @taskType, 
                                @dueDateTime, 
                                @status
                            )
                        `);

                    if (taskResult.recordset && taskResult.recordset.length > 0) {
                        createdTasks.push(taskResult.recordset[0]);
                        createdCount++;
                    }
                } catch (rowError) {
                    console.error('Error processing row:', row, rowError);
                    errors.push(`Row ${i + 1}: ${rowError.message}`);
                }
            }

            // 5. Auto-assign tasks to agents if any were created
            if (createdTasks.length > 0) {
                try {
                    assignedCount = await assignTasksToAgents(createdTasks, taskType);
                } catch (assignError) {
                    console.error('❌ Error assigning tasks:', assignError);
                    errors.push(`Assignment error: ${assignError.message}`);
                }
            }

            // 6. Update campaign total_loans count
            if (campaignId && createdCount > 0) {
                try {
                    // ✅ Get current count of loans in this campaign
                    const countResult = await pool
                        .request()
                        .input('campaignId', assignedCampaignId).query(`
                            SELECT COUNT(*) as loanCount
                            FROM LOANS
                            WHERE campaign_id = @campaignId
                        `);

                    // ✅ FIXED: No optional chaining - use proper null check
                    const actualLoanCount =
                        countResult.recordset && countResult.recordset.length > 0 ?
                        countResult.recordset[0].loanCount :
                        0;

                    // ✅ Update campaign with actual count
                    await pool
                        .request()
                        .input('campaignId', assignedCampaignId)
                        .input('loanCount', actualLoanCount).query(`
                            UPDATE CAMPAIGNS
                            SET total_loans = @loanCount,
                                updated_at = SYSUTCDATETIME()
                            WHERE campaign_id = @campaignId
                        `);

                    console.log(
                        `✅ Updated campaign ${assignedCampaignId} total_loans to ${actualLoanCount}`
                    );
                } catch (updateError) {
                    console.error('❌ Error updating campaign count:', updateError);
                }
            }

            const result = {
                success: createdTasks.length > 0 || errors.length === 0,
                totalRows: rows.length,
                created: createdTasks.length,
                assigned: assignedCount,
                campaignAssigned: campaignAssigned,
                assignedCampaignId: assignedCampaignId,
                campaignMode: mode,
                errors: errors,
                tasks: createdTasks,
            };

            console.log('📊 Upload Result:', result);
            return result;
        } catch (error) {
            console.error('❌ Error in uploadTargetList:', error);
            console.error('❌ Error stack:', error.stack);
            return {
                success: false,
                error: error.message,
                totalRows: rows ? rows.length : 0,
                created: 0,
                assigned: 0,
                errors: [error.message],
            };
        }
    },

    // ============ GET CAMPAIGNS WITH LOAN DATA ============
    getCampaigns: async(filters = {}) => {
        try {
            const pool = await getConnection();
            let query = `
                SELECT 
                    c.campaign_id as id,
                    c.name,
                    c.type,
                    c.description,
                    c.total_loans as totalLoans,
                    c.status,
                    c.start_date as startDate,
                    c.end_date as endDate,
                    c.created_by as createdBy,
                    c.created_at as createdAt,
                    c.updated_at as updatedAt,
                    COUNT(DISTINCT l.loan_id) as actualLoans,
                    COUNT(DISTINCT CASE WHEN t.status = 'CONFIRMED' THEN t.task_id END) as completed,
                    COUNT(DISTINCT CASE WHEN t.status = 'DISPUTED' THEN t.task_id END) as disputed,
                    COUNT(DISTINCT CASE WHEN t.status = 'NO_CONTACT' THEN t.task_id END) as noContact,
                    COUNT(DISTINCT CASE WHEN t.status = 'ESCALATED' THEN t.task_id END) as escalated,
                    COUNT(DISTINCT CASE WHEN t.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS') THEN t.task_id END) as remaining,
                    COUNT(DISTINCT CASE WHEN t.assigned_agent_id IS NOT NULL THEN t.task_id END) as assigned,
                    u.full_name as createdByName
                FROM CAMPAIGNS c
                LEFT JOIN LOANS l ON c.campaign_id = l.campaign_id
                LEFT JOIN VERIFICATION_TASKS t ON l.loan_id = t.loan_id
                LEFT JOIN USERS u ON c.created_by = u.user_id
                WHERE 1=1
            `;

            const request = pool.request();

            if (filters.status && filters.status !== 'all') {
                query += ` AND c.status = @status`;
                request.input('status', filters.status);
            }

            if (filters.type && filters.type !== 'all') {
                query += ` AND c.type = @type`;
                request.input('type', filters.type);
            }

            query += `
                GROUP BY 
                    c.campaign_id, c.name, c.type, c.description, 
                    c.total_loans, c.status, c.start_date, c.end_date,
                    c.created_by, c.created_at, c.updated_at, u.full_name
                ORDER BY c.created_at DESC
            `;

            const result = await request.query(query);

            const campaigns = result.recordset.map((campaign) => {
                const actual = campaign.actualLoans || 0;
                const completed = campaign.completed || 0;
                return {
                    ...campaign,
                    completionRate: actual > 0 ? (completed / actual) * 100 : 0,
                    progress: actual > 0 ? (completed / actual) * 100 : 0,
                };
            });

            console.log(`📊 Found ${campaigns.length} campaigns`);
            return campaigns || [];
        } catch (error) {
            console.error('❌ Error in getCampaigns:', error);
            return [];
        }
    },

    // ============ GET CAMPAIGN LOANS ============
    getCampaignLoans: async(campaignId, filters = {}) => {
        try {
            const pool = await getConnection();

            // ✅ Verify campaign exists
            const campaignCheck = await pool
                .request()
                .input('campaignId', campaignId)
                .query('SELECT name FROM CAMPAIGNS WHERE campaign_id = @campaignId');

            if (!campaignCheck.recordset || campaignCheck.recordset.length === 0) {
                console.log(`⚠️ Campaign ${campaignId} not found`);
                return [];
            }

            let query = `
                SELECT 
                    l.loan_id as loanId,
                    l.customer_name as customerName,
                    l.customer_phone as phone,
                    l.loan_amount as amount,
                    l.branch_id,
                    l.loan_officer as loanOfficer,
                    l.disbursement_date as disbursementDate,
                    l.maturity_date as maturityDate,
                    l.imported_at as importedAt,
                    t.task_id as taskId,
                    t.task_type as taskType,
                    t.status as taskStatus,
                    t.attempt_count as attempts,
                    t.assigned_agent_id as agentId,
                    u.full_name as agentName,
                    t.created_at as taskCreatedAt,
                    t.updated_at as taskUpdatedAt
                FROM LOANS l
                LEFT JOIN VERIFICATION_TASKS t ON l.loan_id = t.loan_id
                LEFT JOIN USERS u ON t.assigned_agent_id = u.user_id
                WHERE l.campaign_id = @campaignId
            `;

            const request = pool.request();
            request.input('campaignId', campaignId);

            if (filters.taskType && filters.taskType !== 'all') {
                query += ` AND t.task_type = @taskType`;
                request.input('taskType', filters.taskType);
            }

            if (filters.status && filters.status !== 'all') {
                query += ` AND t.status = @status`;
                request.input('status', filters.status);
            }

            query += ` ORDER BY l.imported_at DESC`;

            const result = await request.query(query);

            console.log(
                `📊 Found ${result.recordset.length} loans for campaign ${campaignId}`
            );
            return result.recordset || [];
        } catch (error) {
            console.error('❌ Error in getCampaignLoans:', error);
            return [];
        }
    },

    // ============ GET CAMPAIGN BY ID WITH DETAILS ============
    getCampaignById: async(campaignId) => {
        try {
            const pool = await getConnection();
            const result = await pool.request().input('id', campaignId).query(`
                    SELECT 
                        c.campaign_id as id,
                        c.name,
                        c.type,
                        c.description,
                        c.total_loans as totalLoans,
                        c.status,
                        c.start_date as startDate,
                        c.end_date as endDate,
                        c.created_by as createdBy,
                        c.created_at as createdAt,
                        c.updated_at as updatedAt,
                        u.full_name as createdByName,
                        COUNT(DISTINCT l.loan_id) as actualLoans,
                        COUNT(DISTINCT CASE WHEN t.status = 'CONFIRMED' THEN t.task_id END) as completed,
                        COUNT(DISTINCT CASE WHEN t.status = 'DISPUTED' THEN t.task_id END) as disputed,
                        COUNT(DISTINCT CASE WHEN t.status = 'NO_CONTACT' THEN t.task_id END) as noContact,
                        COUNT(DISTINCT CASE WHEN t.status = 'ESCALATED' THEN t.task_id END) as escalated,
                        COUNT(DISTINCT CASE WHEN t.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS') THEN t.task_id END) as remaining
                    FROM CAMPAIGNS c
                    LEFT JOIN LOANS l ON c.campaign_id = l.campaign_id
                    LEFT JOIN VERIFICATION_TASKS t ON l.loan_id = t.loan_id
                    LEFT JOIN USERS u ON c.created_by = u.user_id
                    WHERE c.campaign_id = @id
                    GROUP BY 
                        c.campaign_id, c.name, c.type, c.description, 
                        c.total_loans, c.status, c.start_date, c.end_date,
                        c.created_by, c.created_at, c.updated_at, u.full_name
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('❌ Error in getCampaignById:', error);
            return null;
        }
    },

    // ============ CREATE CAMPAIGN ============
    createCampaign: async(campaignData) => {
        try {
            const pool = await getConnection();
            const result = await pool
                .request()
                .input('name', campaignData.name)
                .input('type', campaignData.type)
                .input('description', campaignData.description || '')
                .input('totalLoans', campaignData.totalLoans || 0)
                .input('startDate', campaignData.startDate || new Date())
                .input('endDate', campaignData.endDate || new Date())
                .input('createdBy', campaignData.createdBy || 1)
                .input('status', campaignData.status || 'DRAFT').query(`
                    INSERT INTO CAMPAIGNS (
                        name, type, description, total_loans, 
                        start_date, end_date, created_by, status
                    )
                    OUTPUT 
                        INSERTED.campaign_id as id,
                        INSERTED.name,
                        INSERTED.type,
                        INSERTED.status
                    VALUES (
                        @name, @type, @description, @totalLoans,
                        @startDate, @endDate, @createdBy, @status
                    )
                `);

            return result.recordset[0] || { success: true };
        } catch (error) {
            console.error('❌ Error in createCampaign:', error);
            return { success: false, error: error.message };
        }
    },

    // ============ UPDATE CAMPAIGN ============
    updateCampaign: async(campaignId, campaignData) => {
        try {
            const pool = await getConnection();
            await pool
                .request()
                .input('id', campaignId)
                .input('name', campaignData.name)
                .input('type', campaignData.type)
                .input('description', campaignData.description || '')
                .input('totalLoans', campaignData.totalLoans || 0)
                .input('startDate', campaignData.startDate || new Date())
                .input('endDate', campaignData.endDate || new Date())
                .input('status', campaignData.status || 'DRAFT')
                .input('updatedBy', campaignData.updatedBy || 1).query(`
                    UPDATE CAMPAIGNS 
                    SET 
                        name = @name,
                        type = @type,
                        description = @description,
                        total_loans = @totalLoans,
                        start_date = @startDate,
                        end_date = @endDate,
                        status = @status,
                        updated_by = @updatedBy,
                        updated_at = SYSUTCDATETIME()
                    WHERE campaign_id = @id
                `);

            return { success: true };
        } catch (error) {
            console.error('❌ Error in updateCampaign:', error);
            return { success: false, error: error.message };
        }
    },

    // ============ DELETE CAMPAIGN ============
    deleteCampaign: async(campaignId) => {
        try {
            const pool = await getConnection();

            // Check if campaign has loans
            const loanCheck = await pool
                .request()
                .input('campaignId', campaignId)
                .query(
                    'SELECT COUNT(*) as count FROM LOANS WHERE campaign_id = @campaignId'
                );

            // ✅ FIXED: No optional chaining
            const loanCount =
                loanCheck.recordset && loanCheck.recordset.length > 0 ?
                loanCheck.recordset[0].count :
                0;

            if (loanCount > 0) {
                // Remove campaign association from loans
                await pool
                    .request()
                    .input('campaignId', campaignId)
                    .query(
                        'UPDATE LOANS SET campaign_id = NULL WHERE campaign_id = @campaignId'
                    );
                console.log(`✅ Removed campaign association from ${loanCount} loans`);
            }

            // Delete the campaign
            await pool
                .request()
                .input('id', campaignId)
                .query('DELETE FROM CAMPAIGNS WHERE campaign_id = @id');

            return { success: true };
        } catch (error) {
            console.error('❌ Error in deleteCampaign:', error);
            return { success: false, error: error.message };
        }
    },

    // ============ UPDATE CAMPAIGN STATUS ============
    updateCampaignStatus: async(campaignId, status) => {
        try {
            const pool = await getConnection();
            await pool.request().input('id', campaignId).input('status', status)
                .query(`
                    UPDATE CAMPAIGNS 
                    SET 
                        status = @status,
                        updated_at = SYSUTCDATETIME()
                    WHERE campaign_id = @id
                `);

            return { success: true };
        } catch (error) {
            console.error('❌ Error in updateCampaignStatus:', error);
            return { success: false, error: error.message };
        }
    },

    // ============ GET CAMPAIGN STATISTICS ============
    getCampaignStatistics: async(campaignId) => {
        try {
            const pool = await getConnection();
            const result = await pool.request().input('campaignId', campaignId)
                .query(`
                    SELECT 
                        COUNT(DISTINCT l.loan_id) as totalLoans,
                        COUNT(DISTINCT t.task_id) as totalTasks,
                        COUNT(DISTINCT CASE WHEN t.status = 'CONFIRMED' THEN t.task_id END) as confirmed,
                        COUNT(DISTINCT CASE WHEN t.status = 'DISPUTED' THEN t.task_id END) as disputed,
                        COUNT(DISTINCT CASE WHEN t.status = 'NO_CONTACT' THEN t.task_id END) as noContact,
                        COUNT(DISTINCT CASE WHEN t.status = 'ESCALATED' THEN t.task_id END) as escalated,
                        COUNT(DISTINCT CASE WHEN t.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS') THEN t.task_id END) as remaining,
                        COUNT(DISTINCT CASE WHEN t.assigned_agent_id IS NOT NULL THEN t.task_id END) as assigned,
                        COUNT(DISTINCT t.assigned_agent_id) as activeAgents
                    FROM CAMPAIGNS c
                    LEFT JOIN LOANS l ON c.campaign_id = l.campaign_id
                    LEFT JOIN VERIFICATION_TASKS t ON l.loan_id = t.loan_id
                    WHERE c.campaign_id = @campaignId
                `);

            // ✅ FIXED: No optional chaining
            return result.recordset && result.recordset.length > 0 ?
                result.recordset[0] : {};
        } catch (error) {
            console.error('❌ Error in getCampaignStatistics:', error);
            return {};
        }
    },
};

// ============================================
// HELPER FUNCTION: Assign Tasks to Agents
// ============================================
async function assignTasksToAgents(tasks, taskType) {
    try {
        const pool = await getConnection();

        // 1. Get active agents for this task type
        const agentsResult = await pool.request().input('taskType', taskType)
            .query(`
                SELECT 
                    user_id as id,
                    username,
                    full_name,
                    pbx_extension
                FROM USERS
                WHERE role = 'VERIFIER'
                AND verification_type = @taskType
                AND status = 'ACTIVE'
                ORDER BY user_id
            `);

        const agents = agentsResult.recordset || [];

        if (agents.length === 0) {
            console.log(`⚠️ No active agents found for ${taskType}`);
            return 0;
        }

        // 2. Get current workload for each agent
        const workloadMap = {};
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const workloadResult = await pool.request().input('agentId', agent.id)
                .query(`
                    SELECT COUNT(*) as count
                    FROM VERIFICATION_TASKS
                    WHERE assigned_agent_id = @agentId
                    AND status IN ('ASSIGNED', 'IN_PROGRESS')
                `);
            // ✅ FIXED: No optional chaining
            const record =
                workloadResult.recordset && workloadResult.recordset.length > 0 ?
                workloadResult.recordset[0] :
                null;
            workloadMap[agent.id] = record ? record.count : 0;
        }

        // 3. Sort agents by workload (least tasks first)
        const sortedAgents = [...agents].sort((a, b) => {
            const aWorkload = workloadMap[a.id] || 0;
            const bWorkload = workloadMap[b.id] || 0;
            return aWorkload - bWorkload;
        });

        // 4. Assign tasks in round-robin based on workload
        let assignedCount = 0;
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const agentIndex = i % sortedAgents.length;
            const agent = sortedAgents[agentIndex];

            if (!agent) {
                continue;
            }

            await pool
                .request()
                .input('taskId', task.id)
                .input('agentId', agent.id)
                .input('status', 'ASSIGNED').query(`
                    UPDATE VERIFICATION_TASKS
                    SET 
                        assigned_agent_id = @agentId,
                        status = @status,
                        updated_at = SYSUTCDATETIME()
                    WHERE task_id = @taskId
                `);

            assignedCount++;
        }

        console.log(
            `✅ Assigned ${assignedCount} tasks to ${sortedAgents.length} agents for ${taskType}`
        );
        return assignedCount;
    } catch (error) {
        console.error('❌ Error in assignTasksToAgents:', error);
        return 0;
    }
}

export default campaignService;