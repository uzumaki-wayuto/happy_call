// src/pages/SupervisorDashboard.jsx
import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Tag,
  Divider,
  Spin,
  Progress,
  Badge,
  Tooltip,
  Button,
  Table,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PhoneOutlined,
  TeamOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import CallTrendChart from '../components/common/CallTrendChart';
import { dashboardApi } from '../api/dashboardApi';
import { useAuth } from '../context/AuthContext';
import { reportApi } from '../api/reportApi';

const { Title, Text } = Typography;

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    completed: 0,
    remaining: 0,
    exceptions: 0,
    disputed: 0,
    escalated: 0,
    noContact: 0,
    todayCalls: 0,
    confirmedCallsToday: 0,
    disputedCallsToday: 0,
    noContactCallsToday: 0,
    completionRate: 0,
  });
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [agentPerformance, setAgentPerformance] = useState([]);

  // ✅ Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, branchesRes, agentsRes] = await Promise.all([
        dashboardApi.getSupervisorStats(),
        dashboardApi.getTopBranches(),
        reportApi.getAgentPerformance(),
      ]);

      setStats(statsRes.data || statsRes || {});
      setBranchPerformance(branchesRes.data || branchesRes || []);
      setAgentPerformance(agentsRes.data || agentsRes || []);
    } catch (error) {
      console.error('Error fetching supervisor dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
      >
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }

  // Calculate percentages
  const totalTasks = stats.totalAssigned || 0;
  const completed = stats.completed || 0;
  const remaining = stats.remaining || 0;
  const exceptions = stats.exceptions || 0;
  const disputed = stats.disputed || 0;
  const escalated = stats.escalated || 0;
  const noContact = stats.noContact || 0;

  const completionRate = totalTasks > 0 ? ((completed / totalTasks) * 100).toFixed(1) : 0;
  const exceptionRate = totalTasks > 0 ? ((exceptions / totalTasks) * 100).toFixed(1) : 0;
  const noContactRate = totalTasks > 0 ? ((noContact / totalTasks) * 100).toFixed(1) : 0;

  // Agent performance columns (for table)
  const agentColumns = [
    {
      title: 'Agent',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span>{text}</span>
          <Tag color="blue" style={{ fontSize: 11 }}>
            {record.verificationType || 'Agent'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Assigned Tasks',
      dataIndex: 'assigned',
      key: 'assigned',
      width: 100,
    },
    {
      title: 'Completed Tasks',
      dataIndex: 'resolved',
      key: 'resolved',
      width: 100,
      render: (value) => <span style={{ color: '#52c41a' }}>{value || 0}</span>,
    },
    {
      title: 'Complete Rate',
      dataIndex: 'completionRate',
      key: 'completionRate',
      width: 120,
      render: (rate) => (
        <Progress
          percent={rate || 0}
          size="small"
          strokeColor={rate >= 80 ? '#52c41a' : rate >= 60 ? '#faad14' : '#ff4d4f'}
          format={() => `${(rate || 0).toFixed(0)}%`}
        />
      ),
    },
    {
      title: 'Exceptions',
      dataIndex: 'exception',
      key: 'exception',
      width: 90,
      render: (value) => <Badge color="red" count={value || 0} />,
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
          Supervisor Dashboard
        </Title>
        <Space>
          <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>
            <TeamOutlined /> {user?.fullName || 'Supervisor'}
          </Tag>
          <Button icon={<ReloadOutlined />} onClick={fetchDashboardData} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Overview of team performance and key operational metrics
      </Text>

      {/* ============================================ */}
      {/* Row 1: Core KPIs */}
      {/* ============================================ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: 130 }}>
            <Statistic
              title="Total Assigned"
              value={totalTasks}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: 130 }}>
            <Statistic
              title="Completed"
              value={completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  {completionRate}%
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: 130 }}>
            <Statistic
              title="Remaining"
              value={remaining}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  {totalTasks > 0 ? ((remaining / totalTasks) * 100).toFixed(1) : 0}%
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: 130 }}>
            <Statistic
              title="Exceptions"
              value={exceptions}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  {exceptionRate}%
                </Text>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* ============================================ */}
      {/* Row 2: Task Breakdown Cards */}
      {/* ============================================ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                <Text strong>Completed</Text>
              </span>
              <span style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>
                {completed}
              </span>
            </div>
            <Progress
              percent={parseFloat(completionRate)}
              strokeColor="#52c41a"
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ background: '#fffbe6', borderColor: '#ffe58f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                <Text strong>Remaining</Text>
              </span>
              <span style={{ fontSize: 20, fontWeight: 'bold', color: '#faad14' }}>
                {remaining}
              </span>
            </div>
            <Progress
              percent={totalTasks > 0 ? (remaining / totalTasks) * 100 : 0}
              strokeColor="#faad14"
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                <Text strong>Exceptions</Text>
              </span>
              <span style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f' }}>
                {exceptions}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
              <span>
                ⚖️ Disputed: <strong>{disputed}</strong>
              </span>
              <span>
                📌 Escalated: <strong>{escalated}</strong>
              </span>
              <span>
                📞 No Contact: <strong>{noContact}</strong>
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ============================================ */}
      {/* Row 3: Today's Call Activity */}
      {/* ============================================ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title="📞 Today's Call Activity">
            <Row gutter={16}>
              <Col span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: 16,
                    background: '#fafafa',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                    {stats.todayCalls || 0}
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>Total Calls</div>
                </div>
              </Col>
              <Col span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: 16,
                    background: '#f6ffed',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                    {stats.confirmedCallsToday || 0}
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>✅ Confirmed</div>
                </div>
              </Col>
              <Col span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: 16,
                    background: '#fff1f0',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>
                    {stats.disputedCallsToday || 0}
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>🔴 Disputed</div>
                </div>
              </Col>
              <Col span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: 16,
                    background: '#fffbe6',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#faad14' }}>
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
      {/* Row 4: Call Trend Chart */}
      {/* ============================================ */}
      <CallTrendChart type="global" title="Team Call Trend Analysis" showAgentFilter={true} />

      {/* ============================================ */}
      {/* Row 5: Top Branches + Agent Performance */}
      {/* ============================================ */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="🏢 Top 5 Branch (Completion %)" style={{ height: '100%' }}>
            {branchPerformance.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                No branch data available
              </div>
            ) : (
              branchPerformance.map((branch, index) => (
                <div key={index} style={{ marginBottom: 12 }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}
                  >
                    <span style={{ fontSize: 14 }}>
                      {index + 1}. {branch.name}
                    </span>
                    <span
                      style={{
                        fontWeight: 'bold',
                        fontSize: 14,
                        color:
                          branch.completionRate >= 70
                            ? '#52c41a'
                            : branch.completionRate >= 60
                              ? '#faad14'
                              : '#ff4d4f',
                      }}
                    >
                      {branch.completionRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <Progress
                    percent={branch.completionRate || 0}
                    strokeColor={
                      branch.completionRate >= 70
                        ? '#52c41a'
                        : branch.completionRate >= 60
                          ? '#faad14'
                          : '#ff4d4f'
                    }
                    size="small"
                    showInfo={false}
                    strokeWidth={8}
                  />
                </div>
              ))
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="👥 Agent Performance Summary"
            style={{ height: '100%' }}
            extra={
              <Button type="link" size="small" onClick={() => (window.location.href = '/agents')}>
                View All →
              </Button>
            }
          >
            {agentPerformance.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                No agent performance data available
              </div>
            ) : (
              <Table
                columns={agentColumns}
                dataSource={agentPerformance.slice(0, 5)}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 500 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ============================================ */}
      {/* Row 6: Status Summary */}
      {/* ============================================ */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="📊 Team Status Summary">
            <Row gutter={16}>
              <Col span={24}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                    ✅ Completed: {completed} ({completionRate}%)
                  </Tag>
                  <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>
                    ⏳ Remaining: {remaining} (
                    {totalTasks > 0 ? ((remaining / totalTasks) * 100).toFixed(1) : 0}%)
                  </Tag>
                  <Tag color="red" style={{ fontSize: 14, padding: '4px 12px' }}>
                    🔴 Disputed: {disputed} (
                    {totalTasks > 0 ? ((disputed / totalTasks) * 100).toFixed(1) : 0}%)
                  </Tag>
                  <Tag color="magenta" style={{ fontSize: 14, padding: '4px 12px' }}>
                    📌 Escalated: {escalated} (
                    {totalTasks > 0 ? ((escalated / totalTasks) * 100).toFixed(1) : 0}%)
                  </Tag>
                  <Tag color="gold" style={{ fontSize: 14, padding: '4px 12px' }}>
                    📞 No Contact: {noContact} ({noContactRate}%)
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SupervisorDashboard;
