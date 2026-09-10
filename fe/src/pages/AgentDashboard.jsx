// src/pages/AgentDashboard.jsx
import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin, Tag, Space, Button } from 'antd';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import AgentCallTrend from '../components/common/AgentCallTrend';
import CallTrendChart from '../components/common/CallTrendChart';
import { dashboardApi } from '../api/dashboardApi';
import { attemptApi } from '../api/attemptApi';
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
    disputed: 0,
    noContact: 0,
    completionRate: 0,
    todayCalls: 0,
    confirmedCallsToday: 0,
    disputedCallsToday: 0,
    noContactCallsToday: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };
  // ✅ Fetch agent stats
  const fetchAgentStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Get dashboard stats
      const response = await dashboardApi.getAgentStats(user.id);
      const data = response.data || response || {};

      // Also get today's call attempts directly
      const attemptsRes = await attemptApi.getMyAttempts(user.id, { limit: 100 });
      const attempts = attemptsRes.data || [];
      const today = new Date().toISOString().slice(0, 10);
      const todayAttempts = attempts.filter((a) => a.createdAt && a.createdAt.startsWith(today));
      setStats({
        todayQueue: data.todayQueue ?? 0,
        completed: data.completed ?? 0,
        pending: data.pending ?? 0,
        exceptions: data.exceptions ?? 0,
        completionRate: data.completionRate ?? '0.0',
        todayCalls: todayAttempts.length,
        confirmedCallsToday: todayAttempts.filter((a) => a.result === 'CONFIRMED').length,
        disputedCallsToday: todayAttempts.filter((a) => a.result === 'DISPUTED').length,
        noContactCallsToday: todayAttempts.filter((a) => a.result === 'NO_CONTACT').length,
      });
    } catch (error) {
      console.error('Error fetching agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentStats();
  }, [user, refreshKey]);

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
      >
        <Spin size="large" tip="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          My Dashboard
        </Title>
        <Space>
          <Tag color="blue">Agent: {user?.fullName || 'Agent'}</Tag>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Welcome back, {user?.fullName || 'Agent'}!
      </Text>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ============================================ */}
        {/* Row 1: Core Stats */}
        {/* ============================================ */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Today's Queue"
                value={stats.todayQueue}
                prefix={<PhoneOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
                suffix={
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {stats.completionRate}%
                  </Text>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Pending"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Exceptions"
                value={stats.exceptions}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                ⚖️ Disputed: {stats.disputed || 0} | 📞 No Contact: {stats.noContact || 0}
              </div>
            </Card>
          </Col>
        </Row>

        {/* ============================================ */}
        {/* Row 2: Today's Call Activity */}
        {/* ============================================ */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="📞 Today's Call Activity">
              <Row gutter={16}>
                <Col xs={24} sm={12} lg={6}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 12,
                      background: '#e6f7ff',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {stats.todayCalls || 0}
                    </div>
                    <div style={{ color: '#888', fontSize: 12 }}>Total Calls</div>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 12,
                      background: '#f6ffed',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                      {stats.confirmedCallsToday || 0}
                    </div>
                    <div style={{ color: '#888', fontSize: 12 }}>✅ Confirmed</div>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 12,
                      background: '#fff1f0',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                      {stats.disputedCallsToday || 0}
                    </div>
                    <div style={{ color: '#888', fontSize: 12 }}>🔴 Disputed</div>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 12,
                      background: '#fffbe6',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                      {stats.noContactCallsToday || 0}
                    </div>
                    <div style={{ color: '#888', fontSize: 12 }}>📞 No Contact</div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* ============================================ */}
        {/* Row 3: Personal Call Trend (shows historical data) */}
        {/* ============================================ */}
        <AgentCallTrend key={refreshKey} />

        {/* ============================================ */}
        {/* Row 4: Weekly Performance (shows same data but different view) */}
        {/* ============================================ */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <CallTrendChart
              type="personal"
              agentId={user?.id}
              title="My Weekly Performance"
              showAgentFilter={false}
              key={refreshKey}
            />
          </Col>
        </Row>

        {/* Callback Schedule */}
        <Card title="📅 My Callback Schedule" style={{ marginTop: 16 }}>
          <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
            Your scheduled callbacks will appear here.
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;
