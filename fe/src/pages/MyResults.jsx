// fe/src/pages/MyResults.jsx
import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Select,
  DatePicker,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PhoneOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { attemptApi } from '../api/attemptApi';
import { taskApi } from '../api/taskApi';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const MyResults = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [resultFilter, setResultFilter] = useState('all');

  // ✅ Fetch tasks from API
  const fetchMyTasks = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await taskApi.getTasks({ agentId: user.id });
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      message.error('Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [user]);

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'CONFIRMED').length;
  const disputedTasks = tasks.filter((t) => t.status === 'DISPUTED').length;
  const noContactTasks = tasks.filter((t) => t.status === 'NO_CONTACT').length;
  const pendingTasks = tasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'
  ).length;

  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

  // Filter tasks for table
  const filteredTasks = tasks.filter((task) => {
    if (resultFilter !== 'all' && task.status !== resultFilter) return false;
    return true;
  });

  // Status color mapping for table
  const statusMap = {
    PENDING: { color: 'default', text: 'Pending' },
    ASSIGNED: { color: 'blue', text: 'Assigned' },
    IN_PROGRESS: { color: 'orange', text: 'In Progress' },
    CONFIRMED: { color: 'green', text: 'Confirmed' },
    DISPUTED: { color: 'red', text: 'Disputed' },
    NO_CONTACT: { color: 'gold', text: 'No Contact' },
    ESCALATED: { color: 'magenta', text: 'Escalated' },
    CLOSED: { color: 'default', text: 'Closed' },
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'dueTime',
      key: 'dueTime',
      width: 160,
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Loan ID',
      dataIndex: 'loanId',
      key: 'loanId',
      width: 140,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 180,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 130,
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
      width: 130,
      render: (amount) => amount ? `₱${amount.toLocaleString()}` : '-',
    },
    {
      title: 'Result',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const info = statusMap[status] || { color: 'default', text: status || '-' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small">
          View
        </Button>
      ),
    },
  ];

  const handleExport = () => {
    message.info('Export functionality coming soon');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>My Call Results</Title>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Track your personal call performance and results.
      </Text>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Assigned"
              value={totalTasks}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={completedTasks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completion Rate"
              value={completionRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: completionRate > 70 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={pendingTasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Result Summary */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={5}>Result Summary</Title>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '12px', background: '#f6ffed', borderRadius: 8 }}>
              <div style={{ fontSize: 24, color: '#52c41a', fontWeight: 'bold' }}>
                {completedTasks}
              </div>
              <div style={{ color: '#888' }}>✅ Confirmed</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '12px', background: '#fff2f0', borderRadius: 8 }}>
              <div style={{ fontSize: 24, color: '#ff4d4f', fontWeight: 'bold' }}>
                {disputedTasks}
              </div>
              <div style={{ color: '#888' }}>⚠️ Disputed</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '12px', background: '#fffbe6', borderRadius: 8 }}>
              <div style={{ fontSize: 24, color: '#faad14', fontWeight: 'bold' }}>
                {noContactTasks}
              </div>
              <div style={{ color: '#888' }}>❌ No Contact</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '12px', background: '#e6f7ff', borderRadius: 8 }}>
              <div style={{ fontSize: 24, color: '#1890ff', fontWeight: 'bold' }}>
                {pendingTasks}
              </div>
              <div style={{ color: '#888' }}>⏳ Pending</div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Recent Calls Table */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={5}>Recent Calls</Title>
          <Space>
            <RangePicker
              onChange={(dates) => setDateRange(dates)}
              placeholder={['Start', 'End']}
              size="small"
            />
            <Select
              defaultValue="all"
              style={{ width: 140 }}
              onChange={(value) => setResultFilter(value)}
              size="small"
            >
              <Option value="all">All Results</Option>
              <Option value="CONFIRMED">Confirmed</Option>
              <Option value="DISPUTED">Disputed</Option>
              <Option value="NO_CONTACT">No Contact</Option>
            </Select>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default MyResults;