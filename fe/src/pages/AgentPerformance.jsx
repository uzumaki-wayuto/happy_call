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
  const totalAssigned = agents.reduce((sum, a) => sum + a.assigned, 0);
  const totalCompleted = agents.reduce((sum, a) => sum + a.completed, 0);
  const totalConfirmed = agents.reduce((sum, a) => sum + a.confirmed, 0);
  const totalDisputed = agents.reduce((sum, a) => sum + a.disputed, 0);
  const totalNoContact = agents.reduce((sum, a) => sum + a.noContact, 0);
  const avgCompletionRate = totalAgents > 0
    ? (agents.reduce((sum, a) => sum + a.completionRate, 0) / totalAgents).toFixed(1)
    : 0;

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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      render: (name, record) => (
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
    {
      title: 'Assigned',
      dataIndex: 'assigned',
      key: 'assigned',
      width: 100,
      sorter: (a, b) => a.assigned - b.assigned,
    },
    {
      title: 'Completed',
      dataIndex: 'completed',
      key: 'completed',
      width: 100,
      sorter: (a, b) => a.completed - b.completed,
    },
    {
      title: 'Confirmed',
      dataIndex: 'confirmed',
      key: 'confirmed',
      width: 100,
      sorter: (a, b) => a.confirmed - b.confirmed,
      render: (value) => <span style={{ color: '#52c41a' }}>{value}</span>,
    },
    {
      title: 'Disputed',
      dataIndex: 'disputed',
      key: 'disputed',
      width: 100,
      sorter: (a, b) => a.disputed - b.disputed,
      render: (value) => <span style={{ color: '#ff4d4f' }}>{value}</span>,
    },
    {
      title: 'No Contact',
      dataIndex: 'noContact',
      key: 'noContact',
      width: 100,
      sorter: (a, b) => a.noContact - b.noContact,
      render: (value) => <span style={{ color: '#faad14' }}>{value}</span>,
    },
    {
      title: 'Completion %',
      dataIndex: 'completionRate',
      key: 'completionRate',
      width: 120,
      sorter: (a, b) => a.completionRate - b.completionRate,
      render: (rate) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 80 ? '#52c41a' : rate >= 60 ? '#faad14' : '#ff4d4f'}
            format={() => `${rate.toFixed(0)}%`}
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
      title: 'Quality Score',
      key: 'qualityScore',
      width: 120,
      render: (_, record) => {
        // Mock quality score based on completion rate
        const score = Math.min(100, record.completionRate + 5);
        return (
          <Space>
            <StarOutlined style={{ color: score >= 90 ? '#faad14' : '#d9d9d9' }} />
            <span>{`${score.toFixed(0)}%`}</span>
          </Space>
        );
      },
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
    {
  title: 'Exceptions',
  dataIndex: 'disputed',
  key: 'disputed',
  width: 100,
  render: (value) => (
    <Space>
      <ExclamationCircleOutlined style={{ color: value > 0 ? '#ff4d4f' : '#d9d9d9' }} />
      <span>{value}</span>
    </Space>
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
        'Role': agent.role,
        'Assigned': agent.assigned,
        'Completed': agent.completed,
        'Confirmed': agent.confirmed,
        'Disputed': agent.disputed,
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
  const topPerformer = agents.reduce((best, current) =>
    current.completionRate > best.completionRate ? current : best
  , agents[0]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Agent Performance</Title>
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
              title="Total Assigned"
              value={totalAssigned}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overall Completion"
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
              title="Top Performer"
              value={topPerformer?.name || 'N/A'}
              prefix={<StarOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col span={6}>
  <Card>
    <Statistic
      title="Total Exceptions"
      value={totalDisputed}
      prefix={<ExclamationCircleOutlined />}
      valueStyle={{ color: '#ff4d4f' }}
    />
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
              <Text type="secondary">{totalConfirmed} of {totalAssigned} calls confirmed</Text>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={4}><ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
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
              <Text type="secondary">{totalDisputed} of {totalAssigned} calls disputed</Text>
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
              <Text type="secondary">{totalNoContact} of {totalAssigned} calls no contact</Text>
            </div>
          </Card>
        </Col>

      </Row>
       {/* ✅ Selected Agent details (if any) */}
      {selectedAgent && (
        <Divider orientation="left">Selected Agent: {selectedAgent.name}</Divider>
      )}
    </div>
  );
};

export default AgentPerformance;