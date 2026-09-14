// src/pages/AgentDashboard.jsx
import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Spin,
  Tag,
  Space,
  Button,
  Table,
  Empty,
  Badge,
} from 'antd';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CalendarOutlined,
  FileTextOutlined,
  HourglassOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AgentCallTrend from '../components/common/AgentCallTrend';
import CallTrendChart from '../components/common/CallTrendChart';
import { dashboardApi } from '../api/dashboardApi';
import { attemptApi } from '../api/attemptApi';
import { useAuth } from '../context/AuthContext';
import { callbackApi } from '../api/callbackApi';

const { Title, Text } = Typography;

const AgentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [callbacks, setCallbacks] = useState([]);
  const [callbacksLoading, setCallbacksLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    // Today
    todayTasks: 0,
    todayConfirmed: 0,
    todayExceptions: 0,
    todayCalls: 0,
    todayCallbacks: 0,
    // All-time
    totalTasks: 0,
    totalConfirmed: 0,
    totalDisputed: 0,
    totalEscalated: 0,
    totalNoContact: 0,
    totalExceptions: 0,
    totalPending: 0,
    totalCalls: 0,
    totalConfirmedCalls: 0,
    totalDisputedCalls: 0,
    totalNoContactCalls: 0,
    totalCallbacks: 0,
    // Derived
    completionRate: '0.0',
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

      setStats({
        todayTasks: data.todayTasks ?? 0,
        todayConfirmed: data.todayConfirmed ?? 0,
        todayExceptions: data.todayExceptions ?? 0,
        todayCalls: data.todayCalls ?? 0,
        todayCallbacks: data.todayCallbacks ?? 0,

        totalTasks: data.totalTasks ?? 0,
        totalConfirmed: data.totalConfirmed ?? 0,
        totalDisputed: data.totalDisputed ?? 0,
        totalEscalated: data.totalEscalated ?? 0,
        totalNoContact: data.totalNoContact ?? 0,
        totalExceptions: data.totalExceptions ?? 0,
        totalPending: data.totalPending ?? 0,
        totalCalls: data.totalCalls ?? 0,
        totalConfirmedCalls: data.totalConfirmedCalls ?? 0,
        totalDisputedCalls: data.totalDisputedCalls ?? 0,
        totalNoContactCalls: data.totalNoContactCalls ?? 0,
        totalCallbacks: data.totalCallbacks ?? 0,

        completionRate: data.completionRate ?? '0.0',
      });
    } catch (error) {
      console.error('Error fetching agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCallbacks = async () => {
    if (!user?.id) return;
    setCallbacksLoading(true);
    try {
      const response = await callbackApi.getCallbacks({ agentId: user.id });
      // Handle both raw array and { data: [...] } shapes
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setCallbacks(list);
    } catch (error) {
      console.error('Error fetching callbacks:', error);
      setCallbacks([]);
    } finally {
      setCallbacksLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchAgentStats();
      fetchCallbacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const callbackColumns = [
    {
      title: 'Date',
      dataIndex: 'callbackDate',
      key: 'callbackDate',
      width: 110,
      render: (date) => date || '-',
    },
    {
      title: 'Time',
      dataIndex: 'callbackTime',
      key: 'callbackTime',
      width: 80,
      render: (time) => time || '-',
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      ellipsis: true,
    },
    {
      title: 'Loan ID',
      dataIndex: 'loanId',
      key: 'loanId',
      width: 140,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => {
        const map = {
          PENDING: { color: 'orange', text: 'Pending' },
          COMPLETED: { color: 'green', text: 'Completed' },
          CANCELLED: { color: 'red', text: 'Cancelled' },
        };
        const info = map[status] || { color: 'default', text: status };
        return <Badge color={info.color} text={info.text} />;
      },
    },
  ];

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
        {/* Row 1: TODAY'S METRICS */}
        {/* ============================================ */}
        <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
          <Col xs={24} sm={12} lg={5}>
            <Card style={{ background: '#f0f7ff', borderColor: '#bae7ff' }}>
              <Statistic
                title="Today's Tasks"
                value={stats.todayTasks}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Due today</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card style={{ background: '#f0f7ff', borderColor: '#bae7ff' }}>
              <Statistic
                title="Today's Confirmed"
                value={stats.todayConfirmed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Confirmed today</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card style={{ background: '#f0f7ff', borderColor: '#bae7ff' }}>
              <Statistic
                title="Today's Exceptions"
                value={stats.todayExceptions}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                Disputed or escalated today
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card style={{ background: '#f0f7ff', borderColor: '#bae7ff' }}>
              <Statistic
                title="Today's Calls"
                value={stats.todayCalls}
                prefix={<PhoneOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Attempts made today</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card style={{ background: '#f0f7ff', borderColor: '#bae7ff' }}>
              <Statistic
                title="Today's Callbacks"
                value={stats.todayCallbacks}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Scheduled today</div>
            </Card>
          </Col>
          {/* 2. Pending (All Time) */}
          <Col xs={24} sm={12} lg={4}>
            <Card style={{ background: '#f0f7ff', borderColor: '#bae7ff' }}>
              <Statistic
                title="Pending"
                value={stats.totalPending}
                prefix={<HourglassOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>All pending</div>
            </Card>
          </Col>
        </Row>

        {/* ============================================ */}
        {/* Row 2: ALL-TIME TOTALS */}
        {/* ============================================ */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={5}>
            <Card>
              <Statistic
                title="Total Tasks"
                value={stats.totalTasks}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>All assigned to you</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card>
              <Statistic
                title="Total Confirmed"
                value={stats.totalConfirmed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                {stats.completionRate}% completion rate
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card>
              <Statistic
                title="Total Exceptions"
                value={stats.totalExceptions}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                Disputed: {stats.totalDisputed} | Escalated: {stats.totalEscalated}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card>
              <Statistic
                title="Total Calls"
                value={stats.totalCalls}
                prefix={<PhoneOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                Confirmed: {stats.totalConfirmedCalls} | No Contact: {stats.totalNoContactCalls}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic
                title="Total Callbacks"
                value={stats.totalCallbacks}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Scheduled</div>
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

        {/* ============================================ */}
        {/* Callback Schedule */}
        {/* ============================================ */}
        <Card
          title="📅 My Callback Schedule"
          style={{ marginTop: 16 }}
          extra={
            <Button type="link" size="small" onClick={() => navigate('/callbacks')}>
              View All →
            </Button>
          }
        >
          {callbacksLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="small" tip="Loading callbacks..." />
            </div>
          ) : callbacks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  <Text>No scheduled callbacks</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Callbacks you schedule will appear here.
                  </Text>
                </span>
              }
            />
          ) : (
            <>
            <div style={{ marginBottom: 12, display: 'flex', gap: 24 }}>
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Pending</Text>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#faad14' }}>
                        {callbacks.filter((c) => c.status === 'PENDING').length}
                    </div>
                </div>
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Total</Text>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}>
                        {callbacks.length}
                    </div>
                </div>
            </div>
            <Table
              columns={callbackColumns}
              dataSource={callbacks}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5, size: 'small' }} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;
