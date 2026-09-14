// src/services/reportService.js
import { getConnection } from '../config/db.js';

// ============================================
// HELPERS
// ============================================

// Convert SQL bucket value to a stable string key
const normalizeBucket = (raw) => {
  if (raw instanceof Date) {
    // Use LOCAL date parts to avoid UTC shift (e.g., +6:30 Myanmar)
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(raw);
};

// Build continuous bucket list for weekly/monthly/daily
const fillMissingBuckets = (map, timeFrame) => {
  if (timeFrame === 'daily') {
    for (let h = 0; h < 24; h++) {
      const key = String(h).padStart(2, '0') + ':00';
      if (!map[key]) {
        map[key] = {
          bucket: key,
          completed: 0,
          exceptions: 0,
          noContact: 0,
          total: 0,
        };
      }
    }
  } else {
    const days = timeFrame === 'monthly' ? 30 : 7;
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${dd}`;
      if (!map[key]) {
        map[key] = {
          bucket: key,
          completed: 0,
          exceptions: 0,
          noContact: 0,
          total: 0,
        };
      }
    }
  }
};

// Apply result → bucket aggregation
// NOTE: attempt result has only CONFIRMED / DISPUTED / NO_CONTACT.
// ESCALATED is a TASK status, not an attempt result — it won't appear here.
const applyAttemptResult = (bucketObj, result, count) => {
  if (result === 'CONFIRMED') bucketObj.completed += count;
  else if (result === 'DISPUTED') bucketObj.exceptions += count;
  else if (result === 'NO_CONTACT') bucketObj.noContact += count;
  bucketObj.total += count;
};

// Get SQL grouping expression + daysBack based on timeFrame
const getGrouping = (timeFrame, alias = 'a') => {
  switch (timeFrame) {
    case 'daily':
      return {
        daysBack: 1,
        grouping: `CONVERT(VARCHAR(2), DATEPART(HOUR, ${alias}.created_at)) + ':00'`,
      };
    case 'monthly':
      return {
        daysBack: 30,
        grouping: `CONVERT(DATE, ${alias}.created_at)`,
      };
    case 'weekly':
    default:
      return {
        daysBack: 7,
        grouping: `CONVERT(DATE, ${alias}.created_at)`,
      };
  }
};

// ============================================

export const reportService = {
  // ============================================
  // AGENT PERFORMANCE
  // ============================================
  getAgentPerformance: async ({ role } = {}) => {
    try {
      const pool = await getConnection();
      let query = `
            SELECT 
                u.user_id as id,
                u.full_name as name,
                u.role,
                u.verification_type as verificationType,
                COUNT(DISTINCT t.task_id) as assigned,
                COUNT(DISTINCT CASE WHEN t.status = 'CONFIRMED' THEN t.task_id END) as confirmed,
                COUNT(DISTINCT CASE WHEN t.status = 'DISPUTED' THEN t.task_id END) as disputed,
                COUNT(DISTINCT CASE WHEN t.status = 'ESCALATED' THEN t.task_id END) as escalated,
                COUNT(DISTINCT CASE WHEN t.status = 'NO_CONTACT' THEN t.task_id END) as noContact,
                COUNT(DISTINCT CASE WHEN t.status IN ('CONFIRMED','DISPUTED','ESCALATED','NO_CONTACT','CLOSED') THEN t.task_id END) as resolved,
                COUNT(DISTINCT CASE WHEN t.status IN ('PENDING','ASSIGNED','IN_PROGRESS') THEN t.task_id END) as pending,
                COUNT(DISTINCT CASE WHEN t.status IN ('DISPUTED', 'ESCALATED') THEN t.task_id END) as exception,
                ISNULL((
                    SELECT CAST(ROUND(AVG(CAST(duration_sec AS DECIMAL(10,2))), 0) AS INT)
                    FROM CALL_ATTEMPTS a2
                    JOIN VERIFICATION_TASKS t2 ON a2.task_id = t2.task_id
                    WHERE t2.assigned_agent_id = u.user_id
                ), 0) as avgHandleTime
            FROM USERS u
            LEFT JOIN VERIFICATION_TASKS t ON u.user_id = t.assigned_agent_id
            WHERE u.role IN ('VERIFIER', 'AGENT')
        `;

      if (role && role !== 'all') {
        query += ` AND u.verification_type = @role`;
      }

      query += `
            GROUP BY u.user_id, u.full_name, u.role, u.verification_type
            ORDER BY u.full_name
        `;

      const result = await pool.request();
      if (role && role !== 'all') result.input('role', role);
      const data = await result.query(query);

      return data.recordset.map((row) => ({
        ...row,
        // ✅ Completion Rate = confirmed / assigned (your definition)
        completionRate:
          row.assigned > 0 ? (row.confirmed / row.assigned) * 100 : 0,
        // Optional supplementary metrics
        resolvedRate:
          row.assigned > 0 ? (row.resolved / row.assigned) * 100 : 0,
        successRate:
          row.resolved > 0 ? (row.confirmed / row.resolved) * 100 : 0,
      }));
    } catch (error) {
      console.error('❌ Error in getAgentPerformance:', error);
      return [];
    }
  },

  // ============================================
  // GLOBAL TREND (Attempt-based)
  // ============================================
  getTrendData: async ({ timeFrame = 'weekly' } = {}) => {
    try {
      const pool = await getConnection();
      const { daysBack, grouping } = getGrouping(timeFrame, 'a');

      const query = `
                SELECT 
                    ${grouping} as bucket,
                    a.result,
                    COUNT(*) as count
                FROM CALL_ATTEMPTS a
                WHERE a.created_at >= DATEADD(day, -${daysBack}, GETDATE())
                GROUP BY ${grouping}, a.result
                ORDER BY bucket
            `;

      const result = await pool.request().query(query);

      console.log(`📊 Trend data from DB (${timeFrame}):`, result.recordset);

      const map = {};
      result.recordset.forEach((row) => {
        const key = normalizeBucket(row.bucket);
        if (!map[key]) {
          map[key] = {
            bucket: key,
            completed: 0,
            exceptions: 0,
            noContact: 0,
            total: 0,
          };
        }
        applyAttemptResult(map[key], row.result, row.count);
      });

      // Fill gaps so weekly = 7 buckets, monthly = 30, daily = 24
      fillMissingBuckets(map, timeFrame);

      return Object.values(map).sort((a, b) =>
        a.bucket.localeCompare(b.bucket)
      );
    } catch (error) {
      console.error('❌ Error in getTrendData:', error);
      return [];
    }
  },

  // ============================================
  // AGENT TREND (Attempt-based)
  // ============================================
  getAgentTrendData: async (agentId, { timeFrame = 'weekly' } = {}) => {
    try {
      const pool = await getConnection();
      const { daysBack, grouping } = getGrouping(timeFrame, 'a');

      const query = `
                SELECT 
                    ${grouping} as bucket,
                    a.result,
                    COUNT(*) as count
                FROM CALL_ATTEMPTS a
                WHERE a.agent_id = @agentId
                  AND a.created_at >= DATEADD(day, -${daysBack}, GETDATE())
                GROUP BY ${grouping}, a.result
                ORDER BY bucket
            `;

      const result = await pool
        .request()
        .input('agentId', agentId)
        .query(query);

      console.log(
        `📊 Agent trend data from DB (agent ${agentId}, ${timeFrame}):`,
        result.recordset
      );

      const map = {};
      result.recordset.forEach((row) => {
        const key = normalizeBucket(row.bucket);
        if (!map[key]) {
          map[key] = {
            bucket: key,
            completed: 0,
            exceptions: 0,
            noContact: 0,
            total: 0,
          };
        }
        applyAttemptResult(map[key], row.result, row.count);
      });

      fillMissingBuckets(map, timeFrame);

      return Object.values(map).sort((a, b) =>
        a.bucket.localeCompare(b.bucket)
      );
    } catch (error) {
      console.error('❌ Error in getAgentTrendData:', error);
      return [];
    }
  },

  // ============================================
  // RESULT DISTRIBUTION (Task-based — KPI helper)
  // ============================================
  getResultDistribution: async () => {
    try {
      const pool = await getConnection();
      const result = await pool.request().query(`
                SELECT 
                    status as name,
                    COUNT(*) as value
                FROM VERIFICATION_TASKS
                WHERE status IN ('CONFIRMED', 'DISPUTED', 'ESCALATED', 'NO_CONTACT')
                GROUP BY status
            `);

      if (result.recordset.length === 0) {
        console.log('ℹ️ No result distribution data found');
        return [];
      }

      return result.recordset;
    } catch (error) {
      console.error('❌ Error in getResultDistribution:', error);
      return [];
    }
  },
};

export default reportService;
