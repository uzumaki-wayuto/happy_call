// src/components/common/AgentCallTrend.jsx
import { useState, useEffect } from 'react';
import { Card, Row, Col, Radio, Typography, Spin, message, Button, Space, Empty } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { attemptApi } from '../../api/attemptApi';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;

// ============================================
// AGGREGATION: group raw attempts into buckets
// ============================================
const aggregateAttempts = (attempts, timeFrame) => {
  if (!attempts || attempts.length === 0) return [];

  // Anchor: use the LATEST attempt timestamp in the data (not "today")
  // This way weekly/monthly always show the freshest 7/30 days of data,
  // regardless of when the mock data was created.
  const timestamps = attempts
    .map((a) => a.createdAt || a.created_at || a.timestamp)
    .filter(Boolean)
    .map((t) => new Date(t).getTime())
    .filter((t) => !isNaN(t));

  const anchor = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

  // Determine cutoff + bucket key formatter
  let cutoff;
  let keyFn;

  if (timeFrame === 'daily') {
    cutoff = new Date(anchor);
    cutoff.setHours(0, 0, 0, 0);
    keyFn = (d) => String(d.getHours()).padStart(2, '0') + ':00';
  } else if (timeFrame === 'monthly') {
    cutoff = new Date(anchor);
    cutoff.setDate(cutoff.getDate() - 30);
    cutoff.setHours(0, 0, 0, 0);
    keyFn = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
  } else {
    // weekly
    cutoff = new Date(anchor);
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);
    keyFn = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
  }

  const map = {};

  attempts.forEach((attempt) => {
    const rawTime = attempt.createdAt || attempt.created_at || attempt.timestamp;
    if (!rawTime) return;

    const d = new Date(rawTime);
    if (isNaN(d.getTime())) return;
    if (d < cutoff) return;

    const key = keyFn(d);

    if (!map[key]) {
      map[key] = { bucket: key, completed: 0, exceptions: 0, noContact: 0, total: 0 };
    }

    if (attempt.result === 'CONFIRMED') map[key].completed += 1;
    else if (attempt.result === 'DISPUTED') map[key].exceptions += 1;
    else if (attempt.result === 'NO_CONTACT') map[key].noContact += 1;

    map[key].total += 1;
  });

  // ---- Fill gaps so the chart has continuous buckets ----
  if (timeFrame === 'daily') {
    for (let h = 0; h < 24; h++) {
      const key = String(h).padStart(2, '0') + ':00';
      if (!map[key]) {
        map[key] = { bucket: key, completed: 0, exceptions: 0, noContact: 0, total: 0 };
      }
    }
  } else {
    const days = timeFrame === 'monthly' ? 30 : 7;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (!map[key]) {
        map[key] = { bucket: key, completed: 0, exceptions: 0, noContact: 0, total: 0 };
      }
    }
  }

  return Object.values(map).sort((a, b) => a.bucket.localeCompare(b.bucket));
};

// ============================================
// FORMATTING
// ============================================
const formatBucketLabel = (bucket, timeFrame) => {
  if (!bucket) return '';

  if (timeFrame === 'daily') {
    // '14:00' → '14:00'
    return bucket;
  }

  // bucket = 'YYYY-MM-DD'
  const [y, m, d] = bucket.split('-').map(Number);
  if (!y || !m || !d) return bucket;

  if (timeFrame === 'weekly') {
    const date = new Date(y, m - 1, d);
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    return `${weekday} ${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // monthly
  return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const formatBucketTooltip = (bucket, timeFrame) => {
  if (!bucket) return '';
  if (timeFrame === 'daily') return `Hour: ${bucket}`;

  const [y, m, d] = bucket.split('-').map(Number);
  if (!y || !m || !d) return bucket;

  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// ============================================

const AgentCallTrend = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [data, setData] = useState([]);
  const [agentName, setAgentName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH
  // ============================================
  const fetchData = async () => {
    if (!user?.id) return;
    setError(null);
    setLoading(true);
    try {
      const response = await attemptApi.getMyAttempts(user.id, { limit: 1000 });
      const attempts = response.data || [];

      const processedData = aggregateAttempts(attempts, timeFrame);

      // Guard: only show "no data" if truly nothing in range
      const hasAnyData = processedData.some((b) => b.total > 0);

      if (hasAnyData) {
        setData(processedData);
      } else {
        setData([]);
        setError(
          'No call data available for this period. Make some calls to see your performance!'
        );
      }

      setAgentName(user.fullName || 'Agent');
    } catch (err) {
      console.error('Error fetching agent trend:', err);
      setError('Failed to load your trend data. Please try again.');
      message.error('Failed to load your trend data');
      setAgentName(user.fullName || 'Agent');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFrame, user, refreshKey]);

  // ============================================
  // STATS
  // ============================================
  const stats = {
    totalCompleted: data.reduce((s, d) => s + (d.completed || 0), 0),
    totalExceptions: data.reduce((s, d) => s + (d.exceptions || 0), 0),
    totalNoContact: data.reduce((s, d) => s + (d.noContact || 0), 0),
    totalCalls: data.reduce((s, d) => s + (d.total || 0), 0),
  };

  const bestBucket = data.reduce(
    (best, curr) => ((curr.total || 0) > (best?.total || 0) ? curr : best),
    null
  );

  const colors = {
    completed: '#52c41a',
    exceptions: '#ff4d4f',
    noContact: '#faad14',
    total: '#1890ff',
  };

  // ============================================
  // TOOLTIP
  // ============================================
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        style={{
          background: '#fff',
          padding: 12,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          border: '1px solid #f0f0f0',
        }}
      >
        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>
          {formatBucketTooltip(label, timeFrame)}
        </p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color, margin: 2 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <Card
        title={`My Call Trend - ${agentName || 'Agent'}`}
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
        }
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 300,
          }}
        >
          <Spin size="large" tip="Loading your trend data..." />
        </div>
      </Card>
    );
  }

  // ============================================
  // X-AXIS CONFIG
  // ============================================
  const xAxisProps = {
    dataKey: 'bucket',
    tickFormatter: (v) => formatBucketLabel(v, timeFrame),
    interval: 'preserveStartEnd',
    tick: { fontSize: 11 },
    angle: timeFrame === 'monthly' ? -35 : 0,
    textAnchor: timeFrame === 'monthly' ? 'end' : 'middle',
    height: timeFrame === 'monthly' ? 60 : 30,
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <Card
      title={`📊 My Call Trend - ${agentName || 'Agent'}`}
      extra={
        <Space>
          <Radio.Group
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="daily">Daily</Radio.Button>
            <Radio.Button value="weekly">Weekly</Radio.Button>
            <Radio.Button value="monthly">Monthly</Radio.Button>
          </Radio.Group>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} size="small">
            Refresh
          </Button>
        </Space>
      }
    >
      {error || data.length === 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 250,
            padding: '40px 20px',
          }}
        >
          <Empty
            description={
              <span>
                <Text strong>No Call Data Available</Text>
                <br />
                <Text type="secondary">
                  {error || 'Start making calls to see your performance trends here.'}
                </Text>
              </span>
            }
          />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <div
                style={{
                  textAlign: 'center',
                  padding: 12,
                  background: '#f6ffed',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 20, color: colors.completed, fontWeight: 'bold' }}>
                  {stats.totalCompleted}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>✅ Confirmed Calls</div>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{
                  textAlign: 'center',
                  padding: 12,
                  background: '#fff1f0',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 20, color: colors.exceptions, fontWeight: 'bold' }}>
                  {stats.totalExceptions}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>🔴 Disputed Calls</div>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{
                  textAlign: 'center',
                  padding: 12,
                  background: '#fffbe6',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 20, color: colors.noContact, fontWeight: 'bold' }}>
                  {stats.totalNoContact}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>📞 No-Contact Calls</div>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{
                  textAlign: 'center',
                  padding: 12,
                  background: '#e6f7ff',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 20, color: colors.total, fontWeight: 'bold' }}>
                  {stats.totalCalls}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>📊 Total Calls</div>
              </div>
            </Col>
          </Row>

          {/* Best Bucket */}
          {bestBucket && bestBucket.bucket && bestBucket.total > 0 && (
            <div
              style={{
                marginBottom: 16,
                textAlign: 'center',
                padding: 8,
                background: '#fafafa',
                borderRadius: 8,
              }}
            >
              <Text>
                🏆 Best {timeFrame === 'daily' ? 'Hour' : 'Day'}:{' '}
                <strong>{formatBucketLabel(bestBucket.bucket, timeFrame)}</strong> with{' '}
                {bestBucket.total} calls
              </Text>
            </div>
          )}

          {/* Chart */}
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis {...xAxisProps} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="completed"
                stroke={colors.completed}
                strokeWidth={2}
                name="Confirmed Calls"
              />
              <Line
                type="monotone"
                dataKey="exceptions"
                stroke={colors.exceptions}
                strokeWidth={2}
                name="Disputed Calls"
              />
              <Line
                type="monotone"
                dataKey="noContact"
                stroke={colors.noContact}
                strokeWidth={2}
                name="No-Contact Calls"
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
};

export default AgentCallTrend;
