// fe/src/components/common/AgentCallTrend.jsx
import { useState, useEffect } from 'react';
import { Card, Row, Col, Radio, Typography, Spin, message } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { trendApi } from '../../api/trendApi';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const AgentCallTrend = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [data, setData] = useState([]);
  const [agentName, setAgentName] = useState('');

  // ✅ Fetch agent trend data from API
  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await trendApi.getAgentTrend(user.id, { timeFrame });
      setData(response.data || []);
      setAgentName(user.fullName || 'Agent');
    } catch (error) {
      console.error('Error fetching agent trend:', error);
      message.error('Failed to load your trend data');
      // ✅ Fallback to mock data
      setData(generateFallbackData());
      setAgentName(user.fullName || 'Agent');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fallback mock data generator
  const generateFallbackData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      date: new Date().toISOString().slice(0, 10),
      completed: Math.floor(Math.random() * 100) + 50,
      exceptions: Math.floor(Math.random() * 10) + 2,
      noContact: Math.floor(Math.random() * 15) + 3,
      total: 0,
    })).map(item => ({
      ...item,
      total: item.completed + item.exceptions + item.noContact,
    }));
  };

  useEffect(() => {
    fetchData();
  }, [timeFrame, user]);

  // Calculate personal stats
  const stats = {
    totalCompleted: data.reduce((sum, d) => sum + (d.completed || 0), 0),
    totalExceptions: data.reduce((sum, d) => sum + (d.exceptions || 0), 0),
    totalNoContact: data.reduce((sum, d) => sum + (d.noContact || 0), 0),
    totalCalls: data.reduce((sum, d) => sum + (d.completed || 0) + (d.exceptions || 0) + (d.noContact || 0), 0),
    avgDaily: data.length > 0 ? Math.round(data.reduce((sum, d) => sum + (d.completed || 0) + (d.exceptions || 0) + (d.noContact || 0), 0) / data.length) : 0,
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

  if (loading) {
    return (
      <Card title={`My Call Trend - ${agentName || 'Agent'}`}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <Spin size="large" tip="Loading your trend data..." />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={`My Call Trend - ${agentName || 'Agent'}`}
      extra={
        <Radio.Group value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)} buttonStyle="solid">
          <Radio.Button value="weekly">Weekly</Radio.Button>
          <Radio.Button value="monthly">Monthly</Radio.Button>
        </Radio.Group>
      }
    >
      {data.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250, color: '#999' }}>
          No trend data available for your account.
        </div>
      ) : (
        <>
          {/* Agent Summary Stats */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: 12, background: '#f6ffed', borderRadius: 8 }}>
                <div style={{ fontSize: 20, color: colors.completed, fontWeight: 'bold' }}>
                  {stats.totalCompleted}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>✅ Completed</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: 12, background: '#fff2f0', borderRadius: 8 }}>
                <div style={{ fontSize: 20, color: colors.exceptions, fontWeight: 'bold' }}>
                  {stats.totalExceptions}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>⚠️ Exceptions</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: 12, background: '#fffbe6', borderRadius: 8 }}>
                <div style={{ fontSize: 20, color: colors.noContact, fontWeight: 'bold' }}>
                  {stats.totalNoContact}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>❌ No Contact</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: 12, background: '#e6f7ff', borderRadius: 8 }}>
                <div style={{ fontSize: 20, color: colors.total, fontWeight: 'bold' }}>
                  {stats.totalCalls}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>📞 Total Calls</div>
              </div>
            </Col>
          </Row>

          {/* Best Day */}
          <div style={{ marginBottom: 16, textAlign: 'center', padding: 8, background: '#fafafa', borderRadius: 8 }}>
            <Text>
              🏆 Best Day: <strong>{stats.bestDay?.[xKey] || 'N/A'}</strong> 
              {' '}with {(stats.bestDay ? (stats.bestDay.completed || 0) + (stats.bestDay.exceptions || 0) + (stats.bestDay.noContact || 0) : 0)} calls
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
              <Line type="monotone" dataKey="completed" stroke={colors.completed} strokeWidth={2} name="Completed" />
              <Line type="monotone" dataKey="exceptions" stroke={colors.exceptions} strokeWidth={2} name="Exceptions" />
              <Line type="monotone" dataKey="noContact" stroke={colors.noContact} strokeWidth={2} name="No Contact" />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
};

export default AgentCallTrend;