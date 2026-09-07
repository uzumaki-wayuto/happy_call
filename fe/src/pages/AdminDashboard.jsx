// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import {
  Card,
    Table,
    Tag,
    Button,
    Space,
    Select,
    Input,
    Typography,
    Row,
    Col,
    Statistic,
    Badge,
    Tabs,
    Progress,
    message,
    Spin,
    Tooltip,
    List,
    Alert,
} from 'antd';
import {
  UserOutlined,
  FlagOutlined,
  PhoneOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  BellOutlined,
  WarningOutlined,
  TeamOutlined,
  SearchOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import CallTrendChart from '../components/common/CallTrendChart';
import { dashboardApi } from '../api/dashboardApi';

const { Title, Text } = Typography;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    agents: 0,
    supervisors: 0,
    admins: 0,
    activeCampaigns: 0,
    campaignLoans: 0,
    todayCalls: 0,
    called: 0,
    yesterdayCalls: 0,
    percentageChange: 0,
    exceptions: 0,
    totalLoans: 0,
    completed: 0,
    remaining: 0,
    completionRate: 0,
  });

  const [branchPerformance, setBranchPerformance] = useState([]);
  const [systemNotices, setSystemNotices] = useState([]);
  const [exceptionByType, setExceptionByType] = useState([]);
  const [criticalExceptions, setCriticalExceptions] = useState([]);

  // ✅ Fetch all dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching dashboard data...');

      const [statsRes, branchesRes, noticesRes, exceptionsRes, criticalRes] = await Promise.all([
        dashboardApi.getAdminStats(),
        dashboardApi.getTopBranches(),
        dashboardApi.getSystemNotices(),
        dashboardApi.getExceptionByType(),
        dashboardApi.getCriticalExceptions(),
      ]);

      // ✅ Handle both wrapped and unwrapped responses
      const statsData = statsRes.data || statsRes || {};
      const branchesData = branchesRes.data || branchesRes || [];
      const noticesData = noticesRes.data || noticesRes || [];
      const exceptionsData = exceptionsRes.data || exceptionsRes || [];
      const criticalData = criticalRes.data || criticalRes || [];

      // Validate percentage change makes sense
if (statsData.todayCalls === 0 && statsData.yesterdayCalls > 0) {
    statsData.percentageChange = -100;
} else if (statsData.todayCalls === 0 && statsData.yesterdayCalls === 0) {
    statsData.percentageChange = 0;
}

      console.log('✅ Processed stats:', statsData);
      console.log('📊 Today calls:', statsData.todayCalls);
console.log('📊 Yesterday calls:', statsData.yesterdayCalls);
console.log('📊 Percentage change:', statsData.percentageChange);

      setStats(statsData);
      setBranchPerformance(branchesData);
      setSystemNotices(noticesData);
      setExceptionByType(exceptionsData);
      setCriticalExceptions(criticalData);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper to format percentage change
  const formatPercentageChange = (value) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const icon = isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />;
    return (
      <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
        {icon} {Math.abs(value).toFixed(1)}% vs yesterday
      </span>
    );
  };

  // Notice type styling
  const noticeTypeMap = {
    maintenance: { color: 'orange', icon: <WarningOutlined /> },
    success: { color: 'green', icon: <CheckCircleOutlined /> },
    info: { color: 'blue', icon: <BellOutlined /> },
    warning: { color: 'red', icon: <ExclamationCircleOutlined /> },
  };

  // Exception type colors
  const exceptionColors = ['#ff4d4f', '#faad14', '#1890ff', '#52c41a'];

  // Critical exceptions table columns
  const criticalColumns = [
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 80,
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      render: (text, record) => (
        <a>
          {text} ({record.loanId})
        </a>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => <Tag color="red">{text}</Tag>,
    },
  ];

  if (error) {
    return (
      <Alert
        message="Failed to load dashboard"
        description={error}
        type="error"
        showIcon
        action={<Button onClick={fetchDashboardData}>Retry</Button>}
      />
    );
  }

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
      >
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }


  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Title level={2} style={{ marginBottom: 8, flexShrink: 0 }}>
        Administration Dashboard
      </Title>
      <Text
        type="secondary"
        style={{ display: 'block', marginBottom: 16, fontSize: 14, flexShrink: 0 }}
      >
        Overview of system performance and key metrics
      </Text>

      {/* ✅ Content that stretches */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Row 1: Core KPIs */}
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ height: 130 }}>
              <Statistic
                title="Total Users"
                value={stats.totalUsers}
                prefix={<UserOutlined />}
                styles={{ content: { color: '#1890ff', fontSize: 28 } }}
                suffix={
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Agents: {stats.agents} | Supervisor: {stats.supervisors}
                  </Text>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ height: 130 }}>
              <Statistic
                title="Active Campaigns"
                value={stats.activeCampaigns}
                prefix={<FlagOutlined />}
                styles={{ content: { color: '#52c41a', fontSize: 28 } }}
                suffix={
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    {stats.campaignLoans} loans
                  </Text>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ height: 130 }}>
              <Statistic
                title="Today Calls"
                value={stats.todayCalls}
                prefix={<PhoneOutlined />}
                styles={{ content: { color: '#1890ff', fontSize: 28 } }}
                suffix={
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <Text type="secondary">
                     {stats.yesterdayCalls > 0 || stats.todayCalls > 0 ? (
                      <>
                       {stats.percentageChange > 0 ? '↑' : stats.percentageChange < 0 ? '↓' : '→'}
                       {' '}{Math.abs(stats.percentageChange)}% vs yesterday
                        <span style={{ display: 'block', fontSize: 10, color: '#999' }}>
                       (Yesterday: {stats.yesterdayCalls})
                       </span>
                     </>
                    ) : (
                        'No data available'
                    )}
                    <span style={{ display: 'block', fontSize: 10, color: '#999'}}>
                      Total Called : {stats.called}
                      </span>
                     </Text> 
                   </div>
      }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ height: 130 }}>
              <Statistic
                title="Exceptions"
                value={stats.exceptions}
                prefix={<ExclamationCircleOutlined />}
                styles={{ content: { color: '#ff4d4f', fontSize: 28 } }}
                suffix={
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    {stats.totalLoans > 0
                      ? ((stats.exceptions / stats.totalLoans) * 100).toFixed(1)
                      : 0}
                    % of total
                  </Text>
                }
              />
            </Card>
          </Col>
        </Row>

        {/* Row 2: Loan KPIs - 3 columns with equal spacing */}
        <Row gutter={[24, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={8}>
            <Card style={{ height: 120 }}>
              <Statistic
                title="Total Loans"
                value={stats.totalLoans}
                prefix={<FileTextOutlined />}
                styles={{ content: { color: '#1890ff', fontSize: 28 } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ height: 120 }}>
              <Statistic
                title="Completed"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a', fontSize: 28 } }}
                suffix={
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {stats.completionRate}%
                  </Text>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ height: 120 }}>
              <Statistic
                title="Remaining"
                value={stats.remaining}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: '#faad14', fontSize: 28 } }}
                suffix={
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {stats.totalLoans > 0
                      ? ((stats.remaining / stats.totalLoans) * 100).toFixed(1)
                      : 0}
                    %
                  </Text>
                }
              />
            </Card>
          </Col>
        </Row>

        {/* Row 3: Branch Performance + System Notices - Full width 50/50 split */}
        <Row gutter={[24, 16]} style={{ flex: 1 }}>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card title="Top 5 Branch (Completion %)" style={{ flex: 1, minHeight: 280 }}>
              {branchPerformance.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                  No branch data available
                </div>
              ) : (
                branchPerformance.map((branch, index) => (
                  <div key={index} style={{ marginBottom: 14 }}>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}
                    >
                      <span style={{ fontSize: 14 }}>{branch.name}</span>
                      <span
                        style={{
                          fontWeight: 'bold',
                          fontSize: 14,
                          color: branch.completionRate >= 70 ? '#52c41a' : '#faad14',
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

          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card title="System Notices" style={{ flex: 1, minHeight: 280 }}>
              <List
                itemLayout="horizontal"
                dataSource={systemNotices}
                renderItem={(item) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <Tag
                          color={noticeTypeMap[item.type]?.color || 'default'}
                          style={{ marginTop: 4 }}
                        >
                          {noticeTypeMap[item.type]?.icon}
                        </Tag>
                      }
                      title={<span style={{ fontSize: 14 }}>{item.message}</span>}
                      description={
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {item.date}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
        {/* ✅ NEW: Call Trend Chart - Global View */}
        <CallTrendChart
          type="global"
          title="Overall Call Trend (All Agents)"
          showAgentFilter={true}
        />
        {/* Row 4: Exception Distribution + Critical Exceptions */}
        <Row gutter={[24, 16]} style={{ flex: 1 }}>
          <Col xs={24} lg={8} style={{ display: 'flex' }}>
            <Card title="Exception by Type" style={{ flex: 1, minHeight: 300 }}>
              {exceptionByType.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                  No exceptions data
                </div>
              ) : (
                exceptionByType.map((type, index) => (
                  <div key={index} style={{ marginBottom: 16 }}>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}
                    >
                      <span style={{ fontSize: 14 }}>{type.name}</span>
                      <span style={{ fontWeight: 'bold', fontSize: 14 }}>{type.value}</span>
                    </div>
                    <Progress
                      percent={type.percent}
                      strokeColor={exceptionColors[index % exceptionColors.length]}
                      size="small"
                      showInfo={false}
                      strokeWidth={8}
                    />
                  </div>
                ))
              )}
            </Card>
          </Col>
          <Col xs={24} lg={16} style={{ display: 'flex' }}>
            <Card title="Recent Critical Exceptions" style={{ flex: 1, minHeight: 300 }}>
              {criticalExceptions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                  No critical exceptions
                </div>
              ) : (
                <Table
                  columns={criticalColumns}
                  dataSource={criticalExceptions}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  style={{ fontSize: 14 }}
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );

};


export default AdminDashboard;
