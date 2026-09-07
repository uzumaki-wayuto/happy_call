// fe/src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Table,
  Button,
  Space,
  Typography,
  message,
} from 'antd';
import {
  FileExcelOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { reportApi } from '../api/reportApi';
import CallTrendChart from '../components/common/CallTrendChart';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  // State for API data
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [resultDistribution, setResultDistribution] = useState([]);

  // KPI calculations
  const totalTasks = agentPerformance.reduce((sum, a) => sum + (a.assigned || 0), 0);
  const totalCompleted = agentPerformance.reduce((sum, a) => sum + (a.completed || 0), 0);
  const totalConfirmed = agentPerformance.reduce((sum, a) => sum + (a.confirmed || 0), 0);
  const totalDisputed = agentPerformance.reduce((sum, a) => sum + (a.disputed || 0), 0);
  const totalNoContact = agentPerformance.reduce((sum, a) => sum + (a.noContact || 0), 0);

  const confirmedRate = totalTasks > 0 ? ((totalConfirmed / totalTasks) * 100).toFixed(1) : 0;
  const disputedRate = totalTasks > 0 ? ((totalDisputed / totalTasks) * 100).toFixed(1) : 0;
  const completionRate = totalTasks > 0 ? ((totalCompleted / totalTasks) * 100).toFixed(1) : 0;

  const avgHandleTime = agentPerformance.length > 0
    ? Math.round(agentPerformance.reduce((sum, a) => sum + (a.avgHandleTime || 0), 0) / agentPerformance.length)
    : 0;

  // ✅ Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    try {
      const [performanceRes, trendRes, distributionRes] = await Promise.all([
        reportApi.getAgentPerformance(),
        reportApi.getTrendData(),
        reportApi.getResultDistribution(),
      ]);
      setAgentPerformance(performanceRes.data || []);
      setTrendData(trendRes.data || []);
      setResultDistribution(distributionRes.data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
      message.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter agent performance data
  const filteredAgents = agentPerformance.filter((agent) => {
    if (agentFilter !== 'all' && agent.id !== agentFilter) return false;
    if (typeFilter !== 'all') {
      const typeMap = { DISBURSEMENT: 'Disbursement', DEPOSIT: 'Deposit' };
      if (agent.role !== typeMap[typeFilter]) return false;
    }
    return true;
  });

  const agentColumns = [
    { title: 'Agent ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: 'Agent Name', dataIndex: 'name', key: 'name', width: 160 },
    { title: 'Role', dataIndex: 'role', key: 'role', width: 130 },
    { title: 'Assigned', dataIndex: 'assigned', key: 'assigned', width: 100 },
    { title: 'Completed', dataIndex: 'completed', key: 'completed', width: 100 },
    { title: 'Confirmed', dataIndex: 'confirmed', key: 'confirmed', width: 100 },
    { title: 'Disputed', dataIndex: 'disputed', key: 'disputed', width: 100 },
    { title: 'No Contact', dataIndex: 'noContact', key: 'noContact', width: 100 },
    { title: 'Completion %', dataIndex: 'completionRate', key: 'completionRate', width: 120, render: (rate) => `${(rate || 0).toFixed(1)}%` },
    { title: 'Avg Handle Time', dataIndex: 'avgHandleTime', key: 'avgHandleTime', width: 140, render: (time) => formatDuration(time || 0) },
  ];

  const handleExport = () => {
    const exportData = agentPerformance.map((agent) => ({
      'Agent ID': agent.id,
      'Agent Name': agent.name,
      'Role': agent.role,
      'Assigned': agent.assigned,
      'Completed': agent.completed,
      'Confirmed': agent.confirmed,
      'Disputed': agent.disputed,
      'No Contact': agent.noContact,
      'Completion %': `${(agent.completionRate || 0).toFixed(1)}%`,
      'Avg Handle Time': formatDuration(agent.avgHandleTime || 0),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Agent Performance');
    XLSX.writeFile(wb, `agent_performance_${new Date().toISOString().slice(0, 10)}.xlsx`);
    message.success('Report exported successfully!');
  };

  const agentOptions = [
    { value: 'all', label: 'All Agents' },
    ...agentPerformance.map((a) => ({ value: a.id, label: a.name })),
  ];

  const COLORS = ['#52c41a', '#ff4d4f', '#faad14', '#1890ff'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Reports & Statistics</Title>
        <Button type="primary" icon={<FileExcelOutlined />} onClick={handleExport}>
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <RangePicker
            onChange={(dates) => setDateRange(dates)}
            placeholder={['Start Date', 'End Date']}
          />
          <Select
            defaultValue="all"
            style={{ width: 160 }}
            onChange={(value) => setTypeFilter(value)}
          >
            <Option value="all">All Types</Option>
            <Option value="DISBURSEMENT">Disbursement</Option>
            <Option value="DEPOSIT">Deposit</Option>
          </Select>
          <Select
            defaultValue="all"
            style={{ width: 160 }}
            onChange={(value) => setAgentFilter(value)}
          >
            {agentOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          <Button onClick={() => {
            setDateRange(null);
            setTypeFilter('all');
            setAgentFilter('all');
          }}>
            Reset Filters
          </Button>
        </Space>
      </Card>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Tasks"
              value={totalTasks}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
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
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Disputed Rate"
              value={disputedRate}
              suffix="%"
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Handle Time"
              value={formatDuration(avgHandleTime)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Call Trend Chart */}
      <CallTrendChart
        type="global"
        title="Detailed Call Trend Analysis"
        showAgentFilter={true}
      />

      {/* Charts Row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card title="Daily Processing Trend">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="disbursement"
                  stroke="#1890ff"
                  strokeWidth={2}
                  name="Disbursement"
                />
                <Line
                  type="monotone"
                  dataKey="deposit"
                  stroke="#52c41a"
                  strokeWidth={2}
                  name="Deposit"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Result Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resultDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resultDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Agent Performance Table */}
      <Card title="Agent Performance">
        <Table
          columns={agentColumns}
          dataSource={filteredAgents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
        />
      </Card>
    </div>
  );
};

export default Reports;