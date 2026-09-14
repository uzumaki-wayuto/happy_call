// fe/src/components/common/CallTrendChart.jsx
import { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Radio, Space, DatePicker, Typography, message, Spin } from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { trendApi } from '../../api/trendApi';
import { useAuth, ROLES } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const CallTrendChart = ({
  type = 'global',
  agentId = null,
  title = 'Call Trend Analysis',
  showAgentFilter = true,
}) => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [viewType, setViewType] = useState('line');
  const [selectedAgent, setSelectedAgent] = useState(agentId || 'all');
  const [data, setData] = useState([]);
  const [agentOptions, setAgentOptions] = useState([]);

  const isAdminOrSupervisor = role === ROLES.ADMIN || role === ROLES.SUPERVISOR;

  // ✅ Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    try {
      let response;

      if (type === 'personal' && user?.id) {
        // Personal trend for agent
        response = await trendApi.getAgentTrend(user.id, { timeFrame });
      } else if (selectedAgent !== 'all' && isAdminOrSupervisor) {
        // Admin/Supervisor viewing specific agent
        response = await trendApi.getAgentTrend(selectedAgent, { timeFrame });
      } else {
        // Global trend
        response = await trendApi.getGlobalTrend({ timeFrame });
      }

      setData(response.data || []);
    } catch (error) {
      console.error('Error fetching trend data:', error);
      message.error('Failed to load trend data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch agent list for dropdown
  const fetchAgents = async () => {
    if (!isAdminOrSupervisor) return;
    try {
      const response = await trendApi.getAgentPerformance();
      const agents = response.data || [];
      setAgentOptions(
        agents.map((a) => ({
          value: a.id,
          label: `${a.name} (${a.id})`,
        }))
      );
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  useEffect(() => {
    fetchData();
    if (isAdminOrSupervisor) {
      fetchAgents();
    }
  }, [timeFrame, selectedAgent, type]);

  // Calculate summary stats
  const getSummaryStats = () => {
    const totalCompleted = data.reduce((sum, d) => sum + (d.completed || 0), 0);
    const totalExceptions = data.reduce((sum, d) => sum + (d.exceptions || 0), 0);
    const totalNoContact = data.reduce((sum, d) => sum + (d.noContact || 0), 0);
    const totalCalls = totalCompleted + totalExceptions + totalNoContact;

    const avgCompleted = totalCalls > 0 ? ((totalCompleted / totalCalls) * 100).toFixed(1) : 0;
    const avgExceptions = totalCalls > 0 ? ((totalExceptions / totalCalls) * 100).toFixed(1) : 0;
    const avgNoContact = totalCalls > 0 ? ((totalNoContact / totalCalls) * 100).toFixed(1) : 0;

    return {
      totalCompleted,
      totalExceptions,
      totalNoContact,
      totalCalls,
      avgCompleted,
      avgExceptions,
      avgNoContact,
      avgDaily: totalCalls > 0 ? (totalCalls / data.length).toFixed(0) : 0,
    };
  };

  const stats = getSummaryStats();

  const colors = {
    completed: '#52c41a',
    exceptions: '#ff4d4f',
    noContact: '#faad14',
    total: '#1890ff',
  };

  const xKey = 'bucket';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: '#fff',
            padding: 12,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid #f0f0f0',
          }}
        >
          <p style={{ fontWeight: 'bold', marginBottom: 4 }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: 2 }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    if (viewType === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tickFormatter={(v) => {
              // v = '2026-09-01' or '14:00'
              if (v && v.includes('-')) {
                const [y, m, d] = v.split('-');
                return `${m}-${d}`; // → '09-01'
              }
              return v; // → '14:00'
            }}
            interval="preserveStartEnd"
            tick={{ fontSize: 11 }}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="completed" fill={colors.completed} name="Completed" />
          <Bar dataKey="exceptions" fill={colors.exceptions} name="Disputed Calls" />
          <Bar dataKey="noContact" fill={colors.noContact} name="No Contact" />
        </BarChart>
      );
    }

    if (viewType === 'area') {
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tickFormatter={(v) => {
              // v = '2026-09-01' or '14:00'
              if (v && v.includes('-')) {
                const [y, m, d] = v.split('-');
                return `${m}-${d}`; // → '09-01'
              }
              return v; // → '14:00'
            }}
            interval="preserveStartEnd"
            tick={{ fontSize: 11 }}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="completed"
            stackId="1"
            stroke={colors.completed}
            fill={colors.completed}
            fillOpacity={0.6}
            name="Completed"
          />
          <Area
            type="monotone"
            dataKey="exceptions"
            stackId="1"
            stroke={colors.exceptions}
            fill={colors.exceptions}
            fillOpacity={0.6}
            name="Disputed Calls"
          />
          <Area
            type="monotone"
            dataKey="noContact"
            stackId="1"
            stroke={colors.noContact}
            fill={colors.noContact}
            fillOpacity={0.6}
            name="No Contact"
          />
        </AreaChart>
      );
    }

    // Default: Line chart
    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickFormatter={(v) => {
            // v = '2026-09-01' or '14:00'
            if (v && v.includes('-')) {
              const [y, m, d] = v.split('-');
              return `${m}-${d}`; // → '09-01'
            }
            return v; // → '14:00'
          }}
          interval="preserveStartEnd"
          tick={{ fontSize: 11 }}
        />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="completed"
          stroke={colors.completed}
          strokeWidth={2}
          name="Completed"
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="exceptions"
          stroke={colors.exceptions}
          strokeWidth={2}
          name="Disputed Calls"
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="noContact"
          stroke={colors.noContact}
          strokeWidth={2}
          name="No Contact"
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke={colors.total}
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Total"
          dot={{ r: 3 }}
        />
      </LineChart>
    );
  };

  return (
    <Card
      title={title}
      extra={
        <Space>
          {isAdminOrSupervisor && showAgentFilter && (
            <Select
              value={selectedAgent}
              onChange={setSelectedAgent}
              style={{ width: 150 }}
              placeholder="Select Agent"
              loading={loading}
            >
              <Option value="all">All Agents</Option>
              {agentOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          )}
          <Radio.Group
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="daily">Daily</Radio.Button>
            <Radio.Button value="weekly">Weekly</Radio.Button>
            <Radio.Button value="monthly">Monthly</Radio.Button>
          </Radio.Group>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {loading ? (
        <div
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}
        >
          <Spin size="large" tip="Loading trend data..." />
        </div>
      ) : data.length === 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 350,
            color: '#999',
          }}
        >
          No trend data available
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <div
                style={{ textAlign: 'center', padding: 12, background: '#f6ffed', borderRadius: 8 }}
              >
                <div style={{ fontSize: 24, color: colors.completed, fontWeight: 'bold' }}>
                  {stats.totalCompleted}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  ✅ Completed ({stats.avgCompleted}%)
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{ textAlign: 'center', padding: 12, background: '#fff2f0', borderRadius: 8 }}
              >
                <div style={{ fontSize: 24, color: colors.exceptions, fontWeight: 'bold' }}>
                  {stats.totalExceptions}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  ⚠️ Disputed Calls ({stats.avgExceptions}%)
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{ textAlign: 'center', padding: 12, background: '#fffbe6', borderRadius: 8 }}
              >
                <div style={{ fontSize: 24, color: colors.noContact, fontWeight: 'bold' }}>
                  {stats.totalNoContact}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  ❌ No Contact ({stats.avgNoContact}%)
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{ textAlign: 'center', padding: 12, background: '#e6f7ff', borderRadius: 8 }}
              >
                <div style={{ fontSize: 24, color: colors.total, fontWeight: 'bold' }}>
                  {stats.totalCalls}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  📞 Total Calls (Avg {stats.avgDaily}/day)
                </div>
              </div>
            </Col>
          </Row>

          {/* Chart Type Selector */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text>Chart Type:</Text>
              <Radio.Group
                value={viewType}
                onChange={(e) => setViewType(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="line">Line</Radio.Button>
                <Radio.Button value="bar">Bar</Radio.Button>
                <Radio.Button value="area">Area</Radio.Button>
              </Radio.Group>
            </Space>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={350}>
            {renderChart()}
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
};

export default CallTrendChart;
