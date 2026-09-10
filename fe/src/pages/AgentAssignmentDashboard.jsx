// src/pages/AgentAssignmentDashboard.jsx
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
} from 'antd';
import {
    UserOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    PhoneOutlined,
    TeamOutlined,
    FileTextOutlined,
    SearchOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { assignmentApi } from '../api/assignmentApi';
import { formatCurrency } from '../config/currency';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const AgentAssignmentDashboard = () => {
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

    // ✅ Fetch all data
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

    // ✅ Agent Workload Columns
    const workloadColumns = [
        {
            title: 'Agent',
            dataIndex: 'agentName',
            key: 'agentName',
            render: (text, record) => (
                <Space>
                    <UserOutlined />
                    <span>{text}</span>
                    <Tag color={record.agentStatus === 'ACTIVE' ? 'green' : 'red'}>
                        {record.agentStatus}
                    </Tag>
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
        {
            title: 'Extension',
            dataIndex: 'extension',
            key: 'extension',
        },
        {
            title: 'Active Tasks',
            dataIndex: 'activeTasks',
            key: 'activeTasks',
            render: (value) => <Badge count={value} />,
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
            render: (value) => <Badge color="orange" count={value} />,
        },
        {
            title: 'Completed',
            dataIndex: 'completed',
            key: 'completed',
            render: (value) => <Badge color="green" count={value} />,
        },
        {
            title: 'Disputed',
            dataIndex: 'disputed',
            key: 'disputed',
            render: (value) => <Badge color="red" count={value} />,
        },
        {
            title: 'No Contact',
            dataIndex: 'noContact',
            key: 'noContact',
            render: (value) => <Badge color="gold" count={value} />,
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

    // ✅ All Tasks Columns
    const taskColumns = [
        {
            title: 'Loan ID',
            dataIndex: 'loanId',
            key: 'loanId',
            render: (text) => <a>{text}</a>,
        },
        {
            title: 'Customer',
            dataIndex: 'customerName',
            key: 'customerName',
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
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
            render: (text, record) => (
                text ? (
                    <Space>
                        <UserOutlined />
                        <span>{text}</span>
                    </Space>
                ) : (
                    <Tag color="default">Unassigned</Tag>
                )
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
            render: (date) => date ? new Date(date).toLocaleString() : '-',
        },
        {
            title: 'Attempts',
            dataIndex: 'attempts',
            key: 'attempts',
        },
    ];

    // ✅ Performance Columns
    const performanceColumns = [
        {
            title: 'Agent',
            dataIndex: 'agentName',
            key: 'agentName',
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
        {
            title: 'Total Assigned',
            dataIndex: 'totalAssigned',
            key: 'totalAssigned',
        },
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
            render: (value) => <Badge color="green" count={value} />,
        },
        {
            title: 'Disputed',
            dataIndex: 'disputed',
            key: 'disputed',
            render: (value) => <Badge color="red" count={value} />,
        },
        {
            title: 'No Contact',
            dataIndex: 'noContact',
            key: 'noContact',
            render: (value) => <Badge color="gold" count={value} />,
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" tip="Loading assignment data..." />
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Agent Assignment Dashboard</Title>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                    Refresh
                </Button>
            </div>

            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Monitor agent workloads, task assignments, and performance metrics.
            </Text>

            {/* Summary Cards */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Active Tasks"
                            value={summary.totalTasks || 0}
                            prefix={<FileTextOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Assigned"
                            value={summary.assigned || 0}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Unassigned"
                            value={summary.unassigned || 0}
                            prefix={<ExclamationCircleOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Active Agents"
                            value={summary.activeAgents || 0}
                            prefix={<TeamOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
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
                        {agentWorkload.map(agent => (
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
                    <Button type="primary" onClick={fetchData}>Apply Filters</Button>
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