// src/components/common/AgentCallTrend.jsx
import { useState, useEffect } from 'react';
import { Card, Row, Col, Radio, Typography, Spin, message, Button, Space } from 'antd';
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
import { trendApi } from '../../api/trendApi';
import { attemptApi } from '../../api/attemptApi';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const AgentCallTrend = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [data, setData] = useState([]);
  const [agentName, setAgentName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ Fetch agent trend data from API
  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Try to get real data from attempts
      const response = await attemptApi.getMyAttempts(user.id, { limit: 1000 });
      const attempts = response.data || [];

      // Process attempts into daily aggregates
      const processedData = processAttemptsData(attempts, timeFrame);

      if (processedData.length > 0) {
        setData(processedData);
      } else {
        // Fallback to mock data
        setData(generateFallbackData());
      }

      setAgentName(user.fullName || 'Agent');
    } catch (error) {
      console.error('Error fetching agent trend:', error);
      message.error('Failed to load your trend data');
      setData(generateFallbackData());
      setAgentName(user.fullName || 'Agent');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Process attempts into daily aggregates
  const processAttemptsData = (attempts, timeframe) => {
    if (!attempts || attempts.length === 0) return [];

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap = {};

    // Initialize all days
    days.forEach((day) => {
      dayMap[day] = { completed: 0, exceptions: 0, noContact: 0, total: 0 };
    });

    // Get date range based on timeframe
    const now = new Date();
    let daysToShow = 7;
    if (timeframe === 'monthly') daysToShow = 30;
    if (timeframe === 'daily') daysToShow = 1;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToShow);

    // Group attempts by day
    attempts.forEach((attempt) => {
      if (!attempt.createdAt) return;
      const date = new Date(attempt.createdAt);
      if (date < cutoffDate) return;

      const dayName = days[date.getDay()];
      if (dayMap[dayName]) {
        if (attempt.result === 'CONFIRMED') {
          dayMap[dayName].completed += 1;
        } else if (attempt.result === 'DISPUTED') {
          dayMap[dayName].exceptions += 1;
        } else if (attempt.result === 'NO_CONTACT') {
          dayMap[dayName].noContact += 1;
        }
        dayMap[dayName].total += 1;
      }
    });

    // Convert to array and order by day
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const result = dayOrder.map((day) => ({
      day,
      ...dayMap[day],
    }));

    // If no data, return empty
    if (result.every((r) => r.total === 0)) return [];

    return result;
  };

  // ✅ Fallback mock data generator
  const generateFallbackData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days
      .map((day) => ({
        day,
        date: new Date().toISOString().slice(0, 10),
        completed: Math.floor(Math.random() * 20) + 5,
        exceptions: Math.floor(Math.random() * 5) + 1,
        noContact: Math.floor(Math.random() * 8) + 2,
        total: 0,
      }))
      .map((item) => ({
        ...item,
        total: item.completed + item.exceptions + item.noContact,
      }));
  };

  useEffect(() => {
    fetchData();
  }, [timeFrame, user, refreshKey]);

  // Calculate personal stats
  const stats = {
    totalCompleted: data.reduce((sum, d) => sum + (d.completed || 0), 0),
    totalExceptions: data.reduce((sum, d) => sum + (d.exceptions || 0), 0),
    totalNoContact: data.reduce((sum, d) => sum + (d.noContact || 0), 0),
    totalCalls: data.reduce(
      (sum, d) => sum + (d.completed || 0) + (d.exceptions || 0) + (d.noContact || 0),
      0
    ),
    avgDaily:
      data.length > 0
        ? Math.round(
            data.reduce(
              (sum, d) => sum + (d.completed || 0) + (d.exceptions || 0) + (d.noContact || 0),
              0
            ) / data.length
          )
        : 0,
    bestDay: data.reduce((best, curr) => {
      const bestTotal = (best.completed || 0) + (best.exceptions || 0) + (best.noContact || 0);
      const currTotal = (curr.completed || 0) + (curr.exceptions || 0) + (curr.noContact || 0);
      return currTotal > bestTotal ? curr : best;
    }, data[0] || {}),
  };

  const colors = {
    completed: '#52c41a',
    exceptions: '#ff4d4f',
    noContact: '#faad14',
    total: '#1890ff',
  };

  const xKey = 'day';

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

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
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}
        >
          <Spin size="large" tip="Loading your trend data..." />
        </div>
      </Card>
    );
  }

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
      {data.length === 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 250,
            color: '#999',
          }}
        >
          No trend data available for your account. Make some calls to see your performance!
        </div>
      ) : (
        <>
          {/* Agent Summary Stats */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <div
                style={{ textAlign: 'center', padding: 12, background: '#f6ffed', borderRadius: 8 }}
              >
                <div style={{ fontSize: 20, color: colors.completed, fontWeight: 'bold' }}>
                  {stats.totalCompleted}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>✅ Completed</div>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{ textAlign: 'center', padding: 12, background: '#fff1f0', borderRadius: 8 }}
              >
                <div style={{ fontSize: 20, color: colors.exceptions, fontWeight: 'bold' }}>
                  {stats.totalExceptions}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>🔴 Disputed</div>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{ textAlign: 'center', padding: 12, background: '#fffbe6', borderRadius: 8 }}
              >
                <div style={{ fontSize: 20, color: colors.noContact, fontWeight: 'bold' }}>
                  {stats.totalNoContact}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>📞 No Contact</div>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{ textAlign: 'center', padding: 12, background: '#e6f7ff', borderRadius: 8 }}
              >
                <div style={{ fontSize: 20, color: colors.total, fontWeight: 'bold' }}>
                  {stats.totalCalls}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>📞 Total Calls</div>
              </div>
            </Col>
          </Row>

          {/* Best Day */}
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
              🏆 Best Day: <strong>{stats.bestDay?.[xKey] || 'N/A'}</strong> with{' '}
              {stats.bestDay
                ? (stats.bestDay.completed || 0) +
                  (stats.bestDay.exceptions || 0) +
                  (stats.bestDay.noContact || 0)
                : 0}{' '}
              calls
            </Text>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="completed"
                stroke={colors.completed}
                strokeWidth={2}
                name="Completed"
              />
              <Line
                type="monotone"
                dataKey="exceptions"
                stroke={colors.exceptions}
                strokeWidth={2}
                name="Disputed"
              />
              <Line
                type="monotone"
                dataKey="noContact"
                stroke={colors.noContact}
                strokeWidth={2}
                name="No Contact"
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
};

export default AgentCallTrend;
