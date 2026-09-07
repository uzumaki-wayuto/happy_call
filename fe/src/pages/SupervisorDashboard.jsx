// src/pages/SupervisorDashboard.jsx
import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Tag, Divider, Spin, Progress } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PhoneOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import CallTrendChart from '../components/common/CallTrendChart';
import { dashboardApi } from '../api/dashboardApi';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    completed: 0,
    remaining: 0,
    exceptions: 0,
    completionRate: 0,
  });
  const [branchPerformance, setBranchPerformance] = useState([]);

  // ✅ Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, branchesRes] = await Promise.all([
        dashboardApi.getSupervisorStats(),
        dashboardApi.getTopBranches(),
      ]);

      // ✅ Fix: Use the response directly (not .data)
      setStats(statsRes.data || statsRes || {});
      setBranchPerformance(branchesRes.data || branchesRes || []);
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Supervisor Dashboard</Title>
        <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>
          <TeamOutlined /> {user?.fullName || 'Supervisor'}
        </Tag>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Overview of team performance and key operational metrics
      </Text>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Assigned"
              value={stats.totalAssigned}
              prefix={<UserOutlined />}
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
              title="Remaining"
              value={stats.remaining}
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

      {/* Quick Stats Row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>📞 Total Calls</span>
              <span style={{ fontWeight: 'bold' }}>{stats.totalAssigned || 0}</span>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>✅ Completion Rate</span>
              <span style={{ fontWeight: 'bold', color: stats.completionRate >= 70 ? '#52c41a' : '#faad14' }}>
                {stats.completionRate || 0}%
              </span>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>⚠️ Exceptions</span>
              <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>{stats.exceptions || 0}</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Call Trend Chart */}
      <CallTrendChart
        type="global"
        title="Team Call Trend Analysis"
        showAgentFilter={true}
      />

      {/* Top Branches */}
      <Card title="Top 5 Branch (Completion %)" style={{ marginTop: 16 }}>
        {branchPerformance.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>No branch data available</div>
        ) : (
          branchPerformance.map((branch, index) => (
            <div key={index} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 14 }}>{branch.name}</span>
                <span style={{ fontWeight: 'bold', fontSize: 14, color: branch.completionRate >= 70 ? '#52c41a' : '#faad14' }}>
                  {branch.completionRate?.toFixed(1) || 0}%
                </span>
              </div>
              <Progress
                percent={branch.completionRate || 0}
                strokeColor={branch.completionRate >= 70 ? '#52c41a' : branch.completionRate >= 60 ? '#faad14' : '#ff4d4f'}
                size="small"
                showInfo={false}
                strokeWidth={8}
              />
            </div>
          ))
        )}
      </Card>

      {/* Agent Performance Summary */}
      <Card title="Agent Performance Summary" style={{ marginTop: 16 }}>
        <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
          Team performance metrics will be displayed here.
        </div>
      </Card>
    </div>
  );
};

export default SupervisorDashboard;