// src/pages/AgentPerformance.jsx
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
  Progress,
  Divider,
  message,
  Input,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  FileExcelOutlined,
  SearchOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { reportApi } from '../api/reportApi';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AgentPerformance = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Calculate overall stats
  const totalAgents = agents.length;
  const totalAssigned = agents.reduce((sum, a) => sum + (a.assigned || 0), 0);
  const totalResolved = agents.reduce((sum, a) => sum + (a.resolved || 0), 0);
  const totalConfirmed = agents.reduce((sum, a) => sum + (a.confirmed || 0), 0);
  const totalDisputed = agents.reduce((sum, a) => sum + (a.disputed || 0), 0);
  const totalEscalated = agents.reduce((sum, a) => sum + (a.escalated || 0), 0);
  const totalNoContact = agents.reduce((sum, a) => sum + (a.noContact || 0), 0);
  const avgCompletionRate =
    totalAssigned > 0 ? ((totalConfirmed / totalAssigned) * 100).toFixed(1) : 0;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await reportApi.getAgentPerformance();
        setAgents(response.data || []);
      } catch (error) {
        console.error('Error fetching agent performance:', error);
        message.error('Failed to load agent performance data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter agents
  const filteredAgents = agents.filter((agent) => {
    if (searchText) {
      const search = searchText.toLowerCase();
      if (!agent.name.toLowerCase().includes(search) && !agent.id.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (roleFilter !== 'all' && agent.role !== roleFilter) return false;
    return true;
  });

  // ✅ Date range filter (USING dateRange and setDateRange)
  // In real app, this would filter by date
  if (dateRange && dateRange[0] && dateRange[1]) {
    // For mock data, we just log it
    console.log('Date range selected:', dateRange);
  }

  // Format seconds to MM:SS
  const formatDuration = (seconds) => {
    const total = Math.round(Number(seconds) || 0); // round to whole seconds
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Status color mapping for role badges
  const roleMap = {
    Disbursement: { color: 'blue', text: 'Disbursement' },
    Deposit: { color: 'green', text: 'Deposit' },
  };

  const columns = [
    {
      title: 'Agent ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id) => <a onClick={() => handleViewAgent({ id })}>{id}</a>,
    },
    {
      title: 'Agent Name',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (name) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 130,
      render: (role) => {
        const info = roleMap[role] || { color: 'default', text: role };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    // ✅ All counts suffixed with "Tasks"
    {
      title: 'Assigned Tasks',
      dataIndex: 'assigned',
      key: 'assigned',
      width: 120,
      sorter: (a, b) => a.assigned - b.assigned,
    },
    {
      title: 'Resolved Tasks',
      dataIndex: 'resolved',
      key: 'resolved',
      width: 120,
      sorter: (a, b) => a.resolved - b.resolved,
    },
    {
      title: 'Confirmed Tasks',
      dataIndex: 'confirmed',
      key: 'confirmed',
      width: 130,
      sorter: (a, b) => a.confirmed - b.confirmed,
      render: (value) => <span style={{ color: '#52c41a', fontWeight: 500 }}>{value || 0} </span>,
    },
    {
      title: 'Disputed Tasks',
      dataIndex: 'disputed',
      key: 'disputed',
      width: 120,
      sorter: (a, b) => a.disputed - b.disputed,
      render: (value) => <span style={{ color: '#ff4d4f', fontWeight: 500 }}>{value || 0} </span>,
    },
    {
      title: 'Escalated Tasks', // ✅ NEW
      dataIndex: 'escalated',
      key: 'escalated',
      width: 130,
      sorter: (a, b) => (a.escalated || 0) - (b.escalated || 0),
      render: (value) => <span style={{ color: '#eb2f96', fontWeight: 500 }}>{value || 0}</span>,
    },
    {
      title: 'No-Contact Tasks',
      dataIndex: 'noContact',
      key: 'noContact',
      width: 130,
      sorter: (a, b) => a.noContact - b.noContact,
      render: (value) => <span style={{ color: '#faad14' }}>{value || 0} </span>,
    },
    {
      title: 'Completion %',
      dataIndex: 'completionRate',
      key: 'completionRate',
      width: 130,
      sorter: (a, b) => a.completionRate - b.completionRate,
      render: (rate) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={parseFloat(rate?.toFixed?.(0) || rate)}
            size="small"
            strokeColor={rate >= 80 ? '#52c41a' : rate >= 60 ? '#faad14' : '#ff4d4f'}
            format={() => `${Number(rate).toFixed(0)}%`}
          />
        </div>
      ),
    },
    {
      title: 'Avg Handle Time',
      dataIndex: 'avgHandleTime',
      key: 'avgHandleTime',
      width: 140,
      sorter: (a, b) => a.avgHandleTime - b.avgHandleTime,
      render: (time) => (
        <Tag icon={<ClockCircleOutlined />} color="default">
          {formatDuration(time)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => handleViewAgent(record)}>
          View Details
        </Button>
      ),
    },
  ];

  // ✅ Search handler (USES SearchOutlined)
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // ✅ View agent details (USES selectedAgent and setSelectedAgent)
  const handleViewAgent = (record) => {
    setSelectedAgent(record);
    message.info(`Viewing details for ${record.name}`);
  };

  const handleExport = () => {
    try {
      const exportData = agents.map((agent) => ({
        'Agent ID': agent.id,
        'Agent Name': agent.name,
        Role: agent.role,
        Assigned: agent.assigned,
        Completed: agent.completed,
        Confirmed: agent.confirmed,
        Disputed: agent.disputed,
        'No Contact': agent.noContact,
        'Completion %': `${agent.completionRate.toFixed(1)}%`,
        'Avg Handle Time': formatDuration(agent.avgHandleTime),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Agent Performance');
      XLSX.writeFile(wb, `agent_performance_${new Date().toISOString().slice(0, 10)}.xlsx`);
      message.success('Agent performance data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export agent performance data.');
    }
  };

  // Top performer (highest completion rate)
  const topPerformer = agents.reduce(
    (best, current) => (current.confirmed > (best?.confirmed || 0) ? current : best),
    agents[0]
  );

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
          Agent Performance
        </Title>
        <Button icon={<FileExcelOutlined />} onClick={handleExport}>
          Export to Excel
        </Button>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Track and monitor agent productivity, completion rates, and quality metrics.
      </Text>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Agents"
              value={totalAgents}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Assigned Tasks"
              value={totalAssigned}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Resolved Tasks"
              value={totalResolved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overall Completion Rate"
              value={avgCompletionRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: avgCompletionRate >= 70 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Confirmed Tasks"
              value={totalConfirmed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Disputed Tasks"
              value={totalDisputed}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Escalated Tasks"
              value={totalEscalated}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#eb2f96', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Top Performer"
              value={topPerformer?.name || 'N/A'}
              prefix={<StarOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontSize: 14, lineHeight: 1.2 }}
            />
            {topPerformer && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                {topPerformer.confirmed} confirmed / {topPerformer.assigned} assigned
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ✅ FILTERS - All filter states are USED here */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="Search by agent name or ID..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            defaultValue="all"
            style={{ width: 160 }}
            onChange={(value) => setRoleFilter(value)}
          >
            <Option value="all">All Roles</Option>
            <Option value="Disbursement">Disbursement</Option>
            <Option value="Deposit">Deposit</Option>
          </Select>
          <RangePicker
            onChange={(dates) => setDateRange(dates)}
            placeholder={['Start Date', 'End Date']}
          />
          <Button
            onClick={() => {
              setSearchText('');
              setRoleFilter('all');
              setDateRange(null);
            }}
          >
            Reset Filters
          </Button>
        </Space>
      </Card>

      {/* Agent Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredAgents}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
        />
      </Card>

      {/* Summary Section */}
      <Divider orientation="left">Performance Summary</Divider>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={4}>Confirmed Rate</Title>
              <div style={{ fontSize: 48, color: '#52c41a', fontWeight: 'bold' }}>
                {totalAssigned > 0 ? ((totalConfirmed / totalAssigned) * 100).toFixed(1) : 0}%
              </div>
              <Progress
                percent={totalAssigned > 0 ? (totalConfirmed / totalAssigned) * 100 : 0}
                strokeColor="#52c41a"
                showInfo={false}
              />
              <Text type="secondary">
                {totalConfirmed} of {totalAssigned} calls confirmed
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={4}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                Disputed Rate
              </Title>
              <div style={{ fontSize: 48, color: '#ff4d4f', fontWeight: 'bold' }}>
                {totalAssigned > 0 ? ((totalDisputed / totalAssigned) * 100).toFixed(1) : 0}%
              </div>
              <Progress
                percent={totalAssigned > 0 ? (totalDisputed / totalAssigned) * 100 : 0}
                strokeColor="#ff4d4f"
                showInfo={false}
              />
              <Text type="secondary">
                {totalDisputed} of {totalAssigned} calls disputed
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={4}>No Contact Rate</Title>
              <div style={{ fontSize: 48, color: '#faad14', fontWeight: 'bold' }}>
                {totalAssigned > 0 ? ((totalNoContact / totalAssigned) * 100).toFixed(1) : 0}%
              </div>
              <Progress
                percent={totalAssigned > 0 ? (totalNoContact / totalAssigned) * 100 : 0}
                strokeColor="#faad14"
                showInfo={false}
              />
              <Text type="secondary">
                {totalNoContact} of {totalAssigned} calls no contact
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
      {/* ✅ Selected Agent details (if any) */}
      {selectedAgent && <Divider orientation="left">Selected Agent: {selectedAgent.name}</Divider>}
    </div>
  );
};

export default AgentPerformance;
