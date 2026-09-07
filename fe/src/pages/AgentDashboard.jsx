// src/pages/AgentDashboard.jsx
import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin } from 'antd';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import AgentCallTrend from '../components/common/AgentCallTrend';
import CallTrendChart from '../components/common/CallTrendChart';
import { dashboardApi } from '../api/dashboardApi';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;


const AgentDashboard = () => {

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayQueue: 0,
    completed: 0,
    pending: 0,
    exceptions: 0,
    completionRate: 0,
  });

  // ✅ Fetch agent stats
  const fetchAgentStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await dashboardApi.getAgentStats(user.id);
      setStats(response.data || {});
    } catch (error) {
      console.error('Error fetching agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentStats();
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <Title level={2} style={{ flexShrink: 0 }}>My Dashboard</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Welcome back, {user?.fullName || 'Agent'}!
      </Text>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>


        <Row gutter={16} style={{ flexShrink: 0 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Today's Queue"
                value={stats.todayQueue}
                prefix={<PhoneOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
                suffix={<Text type="secondary" style={{ fontSize: 14 }}>{stats.completionRate}%</Text>}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Pending"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>


          <Col span={6}>
            <Card>
              <Statistic
                title="Exceptions"
                value={stats.exceptions}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
          {/* ✅ NEW: Personal Call Trend */}
      <AgentCallTrend />

      {/* ✅ NEW: Weekly Personal Trend (Detailed) */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <CallTrendChart 
            type="personal"
            agentId={user?.id}
            title="My Weekly Performance"
            showAgentFilter={false}
          />
        </Col>
      </Row>

      {/* Callback Schedule */}
        <Card title="My Callback Schedule" style={{ marginTop: 16 }}>
          <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
            Your scheduled callbacks will appear here.
          </div>
        </Card>
    </div>
 

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
          Agent dashboard showing your personal metrics. More detailed stats coming soon.
        </div>
      </div>
  );
};

export default AgentDashboard;