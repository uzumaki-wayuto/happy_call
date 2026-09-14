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
  Empty,
  Spin,
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PhoneOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  DisconnectOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { attemptApi } from '../api/attemptApi';
import { taskApi } from '../api/taskApi';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../config/currency';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const MyResults = () => {
  const { user } = useAuth();

  // ============ STATE ============
  const [callAttempts, setCallAttempts] = useState([]);
  const [taskStats, setTaskStats] = useState({
    totalTasks: 0,
    confirmedTasks: 0,
    disputedTasks: 0,
    escalatedTasks: 0,
    noContactTasks: 0,
    pendingTasks: 0,
    completionRate: 0,
  });
  const [callStats, setCallStats] = useState({
    totalCalls: 0,
    confirmedCalls: 0,
    disputedCalls: 0,
    noContactCalls: 0,
  });
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [resultFilter, setResultFilter] = useState('all');

  // ============ FETCH CALL ATTEMPTS ============
  const fetchCallAttempts = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await attemptApi.getMyAttempts(user.id, { limit: 1000 });
      const attempts = response.data || [];

      const formattedAttempts = attempts.map((attempt) => ({
        id: attempt.id || attempt.attempt_id,
        loanId: attempt.loanId || attempt.loan_id,
        customerName: attempt.customerName || attempt.customer_name,
        phone: attempt.phone || attempt.customer_phone,
        type: attempt.type || attempt.task_type,
        result: attempt.result,
        duration: attempt.duration || attempt.duration_sec || 0,
        notes: attempt.notes || '',
        timestamp: attempt.timestamp || attempt.createdAt || attempt.created_at,
        callMethod: attempt.callMethod || attempt.call_method || 'CLICK_TO_CALL',
      }));

      setCallAttempts(formattedAttempts);

      // Compute call-level stats from attempts
      setCallStats({
        totalCalls: formattedAttempts.length,
        confirmedCalls: formattedAttempts.filter((a) => a.result === 'CONFIRMED').length,
        disputedCalls: formattedAttempts.filter((a) => a.result === 'DISPUTED').length,
        noContactCalls: formattedAttempts.filter((a) => a.result === 'NO_CONTACT').length,
      });
    } catch (error) {
      console.error('Error fetching call attempts:', error);
      message.error('Failed to load your call history');
    } finally {
      setLoading(false);
    }
  };

  // ============ FETCH TASK STATS ============
  const fetchTaskStats = async () => {
    if (!user?.id) return;
    try {
      const response = await taskApi.getTasks({ agentId: user.id });
      const tasks = response.data || [];

      const total = tasks.length;
      const confirmed = tasks.filter((t) => t.status === 'CONFIRMED').length;
      const disputed = tasks.filter((t) => t.status === 'DISPUTED').length;
      const escalated = tasks.filter((t) => t.status === 'ESCALATED').length;
      const noContact = tasks.filter((t) => t.status === 'NO_CONTACT').length;
      const pending = tasks.filter((t) =>
        ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status)
      ).length;

      setTaskStats({
        totalTasks: total,
        confirmedTasks: confirmed,
        disputedTasks: disputed,
        escalatedTasks: escalated,
        noContactTasks: noContact,
        pendingTasks: pending,
        completionRate: total > 0 ? ((confirmed / total) * 100).toFixed(1) : 0,
      });
    } catch (error) {
      console.error('Error fetching task stats:', error);
    }
  };

  useEffect(() => {
    fetchCallAttempts();
    fetchTaskStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ============ FILTER CALL ATTEMPTS ============
  const getFilteredAttempts = () => {
    let data = [...callAttempts];

    if (resultFilter !== 'all') {
      data = data.filter((item) => item.result === resultFilter);
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day').toDate();
      const end = dateRange[1].endOf('day').toDate();
      data = data.filter((item) => {
        if (!item.timestamp) return true;
        const itemDate = new Date(item.timestamp);
        return itemDate >= start && itemDate <= end;
      });
    }

    return data;
  };

  const filteredAttempts = getFilteredAttempts();

  const resultMap = {
    CONFIRMED: { color: 'green', text: 'Confirmed' },
    DISPUTED: { color: 'red', text: 'Disputed' },
    NO_CONTACT: { color: 'gold', text: 'No Contact' },
    IN_PROGRESS: { color: 'orange', text: 'In Progress' },
  };

  const typeColorMap = {
    DISBURSEMENT: 'blue',
    DEPOSIT: 'green',
  };

  // ============ TABLE COLUMNS ============
  const columns = [
    {
      title: 'Date/Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (date) => (date ? new Date(date).toLocaleString() : '-'),
    },
    {
      title: 'Loan ID',
      dataIndex: 'loanId',
      key: 'loanId',
      width: 140,
      render: (text) => <a>{text || '-'}</a>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 180,
      render: (text) => text || '-',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type) => (
        <Tag color={typeColorMap[type] || 'default'}>
          {type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
        </Tag>
      ),
    },
    {
      title: 'Method',
      dataIndex: 'callMethod',
      key: 'callMethod',
      width: 130,
      render: (method) => (
        <Tag color={method === 'CLICK_TO_CALL' ? 'blue' : 'orange'}>
          {method === 'CLICK_TO_CALL' ? 'Click-to-Call' : 'Manual'}
        </Tag>
      ),
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 130,
      render: (result) => {
        const info = resultMap[result] || { color: 'default', text: result || '-' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration) => (duration ? `${duration}s` : '-'),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (notes) => notes || '-',
    },
  ];

  const handleExport = () => {
    if (filteredAttempts.length === 0) {
      message.warning('No data to export');
      return;
    }
    message.info('Export functionality coming soon');
  };

  // ============ RENDER ============
  return (
    <div>
      {/* ===== Header ===== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          My Results
        </Title>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Track your personal task completion and call activity.
      </Text>

      {/* ============================================
          SECTION 1: TASK-LEVEL SUMMARY
          ============================================ */}
      <Divider orientation="left">
        <Space>
          <PhoneOutlined />
          <span>Task Summary</span>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
            (Verification items assigned to you)
          </Text>
        </Space>
      </Divider>

      {/* Task KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Tasks"
              value={taskStats.totalTasks}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Confirmed Tasks"
              value={taskStats.confirmedTasks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completion Rate"
              value={taskStats.completionRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{
                color: taskStats.completionRate > 70 ? '#52c41a' : '#faad14',
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Tasks"
              value={taskStats.pendingTasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Task Status Breakdown */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>Task Status Breakdown</Title>
        <Row gutter={16}>
          <Col span={6}>
            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                background: '#f6ffed',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 24, color: '#52c41a', fontWeight: 'bold' }}>
                {taskStats.confirmedTasks}
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>✅ Confirmed</div>
            </div>
          </Col>
          <Col span={6}>
            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                background: '#fff2f0',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 24, color: '#ff4d4f', fontWeight: 'bold' }}>
                {taskStats.disputedTasks}
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>⚠️ Disputed</div>
            </div>
          </Col>
          <Col span={6}>
            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                background: '#fff0f6',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 24, color: '#eb2f96', fontWeight: 'bold' }}>
                {taskStats.escalatedTasks}
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>📌 Escalated</div>
            </div>
          </Col>
          <Col span={6}>
            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                background: '#fffbe6',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 24, color: '#faad14', fontWeight: 'bold' }}>
                {taskStats.noContactTasks}
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>📞 No Contact Tasks</div>
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Total Exceptions = Disputed ({taskStats.disputedTasks}) + Escalated (
            {taskStats.escalatedTasks}) ={' '}
            <strong>{taskStats.disputedTasks + taskStats.escalatedTasks}</strong>
          </Text>
        </div>
      </Card>

      {/* ============================================
          SECTION 2: CALL-LEVEL SUMMARY
          ============================================ */}
      <Divider orientation="left">
        <Space>
          <PhoneOutlined />
          <span>Call Activity Summary</span>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
            (Individual call attempts you made)
          </Text>
        </Space>
      </Divider>

      {/* Call KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Calls"
              value={callStats.totalCalls}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Confirmed Calls"
              value={callStats.confirmedCalls}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Disputed Calls"
              value={callStats.disputedCalls}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="No-Contact Calls"
              value={callStats.noContactCalls}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Call Result Breakdown */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>Call Result Breakdown</Title>
        <Row gutter={16}>
          <Col span={8}>
            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                background: '#f6ffed',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 24, color: '#52c41a', fontWeight: 'bold' }}>
                {callStats.confirmedCalls}
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>✅ Confirmed Calls</div>
            </div>
          </Col>
          <Col span={8}>
            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                background: '#fff2f0',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 24, color: '#ff4d4f', fontWeight: 'bold' }}>
                {callStats.disputedCalls}
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>⚠️ Disputed Calls</div>
            </div>
          </Col>
          <Col span={8}>
            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                background: '#fffbe6',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 24, color: '#faad14', fontWeight: 'bold' }}>
                {callStats.noContactCalls}
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>❌ No-Contact Calls</div>
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Total Calls = Confirmed ({callStats.confirmedCalls}) + Disputed (
            {callStats.disputedCalls}) + No-Contact ({callStats.noContactCalls}) ={' '}
            <strong>{callStats.totalCalls}</strong>
          </Text>
        </div>
      </Card>

      {/* ============================================
          SECTION 3: RECENT CALL HISTORY
          ============================================ */}
      <Divider orientation="left">Recent Call History</Divider>

      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Text strong>Individual call attempts</Text>
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

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" tip="Loading call history..." />
          </div>
        ) : filteredAttempts.length === 0 ? (
          <Empty
            description={
              <span>
                <Text strong>No Call History</Text>
                <br />
                <Text type="secondary">
                  {callAttempts.length === 0
                    ? "You haven't made any calls yet."
                    : 'No calls match your current filters.'}
                </Text>
              </span>
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredAttempts}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>
    </div>
  );
};

export default MyResults;
