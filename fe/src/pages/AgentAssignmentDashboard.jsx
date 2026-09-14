// src/pages/AgentAssignmentDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'antd';
import {
  UserOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { assignmentApi } from '../api/assignmentApi';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../config/currency';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const AgentAssignmentDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(false);
  const [agentWorkload, setAgentWorkload] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [summary, setSummary] = useState({});
  const [performance, setPerformance] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workloadRes, tasksRes, summaryRes, performanceRes] = await Promise.all([
        assignmentApi.getWorkload({ taskType: typeFilter }),
        assignmentApi.getTasksWithAgent({
          agentId: selectedAgent,
          status: statusFilter,
          type: typeFilter,
          searchText: searchText,
        }),
        assignmentApi.getSummary(),
        assignmentApi.getPerformance(),
      ]);

      setAgentWorkload(workloadRes.data || []);
      setAllTasks(tasksRes.data || []);
      setSummary(summaryRes.data || {});
      setPerformance(performanceRes.data || []);
    } catch (error) {
      console.error('Error fetching assignment data:', error);
      message.error('Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAgent, statusFilter, typeFilter]);

  const workloadColumns = [
    {
      title: 'Agent',
      dataIndex: 'agentName',
      key: 'agentName',
      render: (text, record) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
          <Tag color={record.agentStatus === 'ACTIVE' ? 'green' : 'red'}>{record.agentStatus}</Tag>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'agentType',
      key: 'agentType',
      render: (type) => (
        <Tag color={type === 'DISBURSEMENT' ? 'blue' : 'green'}>
          {type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
        </Tag>
      ),
    },
    { title: 'Extension', dataIndex: 'extension', key: 'extension' },
    {
      title: 'Active Tasks',
      dataIndex: 'activeTasks',
      key: 'activeTasks',
      render: (value) => <Badge count={value || 0} showZero />,
    },
    {
      title: 'Assigned',
      dataIndex: 'totalAssigned',
      key: 'totalAssigned',
      sorter: (a, b) => a.totalAssigned - b.totalAssigned,
    },
    {
      title: 'In Progress',
      dataIndex: 'inProgress',
      key: 'inProgress',
      render: (value) => <Badge color="orange" count={value || 0} showZero />,
    },
    {
      title: 'Completed',
      dataIndex: 'completed',
      key: 'completed',
      render: (value) => <Badge color="green" count={value || 0} showZero />,
    },
    {
      title: 'Disputed',
      dataIndex: 'disputed',
      key: 'disputed',
      render: (value) => <Badge color="red" count={value || 0} showZero />,
    },
    {
      title: 'No Contact',
      dataIndex: 'noContact',
      key: 'noContact',
      render: (value) => <Badge color="gold" count={value || 0} showZero />,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedAgent(record.agentId);
            setViewMode('tasks');
          }}
        >
          View Tasks
        </Button>
      ),
    },
  ];

  const taskColumns = [
    {
      title: 'Loan ID',
      dataIndex: 'loanId',
      key: 'loanId',
      render: (text) => <a>{text}</a>,
    },
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'DISBURSEMENT' ? 'blue' : 'green'}>
          {type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          CONFIRMED: { color: 'green', text: 'Confirmed' },
          DISPUTED: { color: 'red', text: 'Disputed' },
          NO_CONTACT: { color: 'gold', text: 'No Contact' },
          ASSIGNED: { color: 'blue', text: 'Assigned' },
          IN_PROGRESS: { color: 'orange', text: 'In Progress' },
          PENDING: { color: 'default', text: 'Pending' },
          ESCALATED: { color: 'magenta', text: 'Escalated' },
          CLOSED: { color: 'default', text: 'Closed' },
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Badge color={info.color} text={info.text} />;
      },
    },
    {
      title: 'Assigned To',
      dataIndex: 'agentName',
      key: 'agentName',
      render: (text) =>
        text ? (
          <Space>
            <UserOutlined />
            <span>{text}</span>
          </Space>
        ) : (
          <Tag color="default">Unassigned</Tag>
        ),
    },
    {
      title: 'Calls',
      dataIndex: 'callCount',
      key: 'callCount',
      render: (value) => value || 0,
    },
    {
      title: 'Last Call',
      dataIndex: 'lastCallAt',
      key: 'lastCallAt',
      render: (date) => (date ? new Date(date).toLocaleString() : '-'),
    },
    { title: 'Attempts', dataIndex: 'attempts', key: 'attempts' },
  ];

  const performanceColumns = [
    { title: 'Agent', dataIndex: 'agentName', key: 'agentName' },
    {
      title: 'Type',
      dataIndex: 'agentType',
      key: 'agentType',
      render: (type) => (
        <Tag color={type === 'DISBURSEMENT' ? 'blue' : 'green'}>
          {type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
        </Tag>
      ),
    },
    { title: 'Total Assigned', dataIndex: 'totalAssigned', key: 'totalAssigned' },
    {
      title: 'Success Rate',
      dataIndex: 'successRate',
      key: 'successRate',
      render: (rate) => (
        <Progress
          percent={Math.round(rate || 0)}
          size="small"
          strokeColor={rate >= 80 ? '#52c41a' : rate >= 60 ? '#faad14' : '#ff4d4f'}
        />
      ),
    },
    {
      title: 'Confirmed',
      dataIndex: 'confirmed',
      key: 'confirmed',
      render: (value) => <Badge color="green" count={value || 0} showZero />,
    },
    {
      title: 'Disputed',
      dataIndex: 'disputed',
      key: 'disputed',
      render: (value) => <Badge color="red" count={value || 0} showZero />,
    },
    {
      title: 'No Contact',
      dataIndex: 'noContact',
      key: 'noContact',
      render: (value) => <Badge color="gold" count={value || 0} showZero />,
    },
    {
      title: 'Avg Handle Time',
      dataIndex: 'avgHandleTime',
      key: 'avgHandleTime',
      render: (seconds) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
      },
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Spin size="large" tip="Loading assignment data..." />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Agent Assignment Dashboard
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
          {isAdmin && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => navigate('/admin/task-assignment')}
            >
              Assign Tasks
            </Button>
          )}
        </Space>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Monitor agent workloads, task assignments, and performance metrics.
      </Text>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 12 }}>
        {/* Row A: Total scope */}
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Tasks"
              value={summary.totalTasks || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#595959' }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>All tasks in system</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Resolved Tasks"
              value={summary.resolvedTasks || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Confirmed + Closed</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Unresolved Tasks"
              value={summary.unresolvedTasks || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              Pending + Disputed + Escalated + Assigned + In Progress
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* Row B: Breakdown of unresolved */}
        <Col span={6}>
          <Card>
            <Statistic
              title="Assigned (Unresolved)"
              value={summary.assignedActive || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Has an agent</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Unassigned (Unresolved)"
              value={summary.unassignedActive || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Needs assignment</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Agents"
              value={summary.activeAgents || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              Registered VERIFIER accounts
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Agents With Work"
              value={summary.agentsWithWork || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              Holding ≥1 unresolved task
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Select
            value={selectedAgent}
            onChange={setSelectedAgent}
            style={{ width: 180 }}
            placeholder="Filter by Agent"
          >
            <Option value="all">All Agents</Option>
            {agentWorkload.map((agent) => (
              <Option key={agent.agentId} value={agent.agentId}>
                {agent.agentName}
              </Option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder="Filter by Status"
          >
            <Option value="all">All Status</Option>
            <Option value="ASSIGNED">Assigned</Option>
            <Option value="IN_PROGRESS">In Progress</Option>
            <Option value="CONFIRMED">Confirmed</Option>
            <Option value="DISPUTED">Disputed</Option>
            <Option value="NO_CONTACT">No Contact</Option>
          </Select>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 150 }}
            placeholder="Filter by Type"
          >
            <Option value="all">All Types</Option>
            <Option value="DISBURSEMENT">Disbursement</Option>
            <Option value="DEPOSIT">Deposit</Option>
          </Select>
          <Input
            placeholder="Search by Loan ID or Customer"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => fetchData()}
            allowClear
          />
          <Button type="primary" onClick={fetchData}>
            Apply Filters
          </Button>
        </Space>
      </Card>

      {/* Tabs */}
      <Tabs activeKey={viewMode} onChange={setViewMode}>
        <TabPane tab="Overview" key="overview">
          <Card title="Agent Workload Summary">
            <Table
              columns={workloadColumns}
              dataSource={agentWorkload}
              rowKey="agentId"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="All Tasks" key="tasks">
          <Card title={`Tasks (${allTasks.length})`}>
            <Table
              columns={taskColumns}
              dataSource={allTasks}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1400 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="Performance" key="performance">
          <Card title="Agent Performance Metrics">
            <Table
              columns={performanceColumns}
              dataSource={performance}
              rowKey="agentId"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AgentAssignmentDashboard;
