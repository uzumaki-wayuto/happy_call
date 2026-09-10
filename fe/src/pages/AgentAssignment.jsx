// src/pages/AgentAssignment.jsx
import { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Tag,
    Button,
    Space,
    Select,
    Typography,
    message,
    Modal,
    Row,
    Col,
    Statistic,
    Progress,
    Badge,
    Tooltip,
    Spin,
    Alert,
} from 'antd';
import {
    UserOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    ReloadOutlined,
    UserAddOutlined,
    BarChartOutlined,
    PhoneOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { taskApi } from '../api/taskApi';
import { userApi } from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../config/currency';

const { Title, Text } = Typography;
const { Option } = Select;

const AgentAssignment = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [unassignedTasks, setUnassignedTasks] = useState([]);
    const [agents, setAgents] = useState([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [assignmentSuggestions, setAssignmentSuggestions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [autoAssignLoading, setAutoAssignLoading] = useState(false);

    // Fetch unassigned tasks and agents
    const fetchData = async () => {
        setLoading(true);
        try {
            const [tasksRes, agentsRes] = await Promise.all([
                taskApi.getUnassignedTasks({ status: 'PENDING' }),
                userApi.getUsers({ role: 'VERIFIER', status: 'ACTIVE' })
            ]);

            setUnassignedTasks(tasksRes.data || []);
            setAgents(agentsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            message.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Get assignment suggestions for selected tasks
    const getSuggestions = async () => {
        if (selectedTaskIds.length === 0) {
            message.warning('Please select at least one task');
            return;
        }

        try {
            const response = await taskApi.getAssignmentSuggestions(selectedTaskIds[0]);
            setAssignmentSuggestions(response.data?.suggestions || []);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error getting suggestions:', error);
            message.error('Failed to get assignment suggestions');
        }
    };

    // Assign selected tasks to agent
    const handleAssign = async () => {
        if (!selectedAgentId) {
            message.warning('Please select an agent');
            return;
        }
        if (selectedTaskIds.length === 0) {
            message.warning('No tasks selected');
            return;
        }

        try {
            await taskApi.assignTasksToAgents({
                taskIds: selectedTaskIds,
                agentId: selectedAgentId
            });
            message.success(`Assigned ${selectedTaskIds.length} tasks successfully`);
            setIsModalOpen(false);
            setSelectedTaskIds([]);
            setSelectedAgentId(null);
            fetchData();
        } catch (error) {
            console.error('Error assigning tasks:', error);
            message.error('Failed to assign tasks');
        }
    };

    // Auto-assign all pending tasks
    const handleAutoAssign = async () => {
        Modal.confirm({
            title: 'Auto-Assign All Tasks',
            content: 'This will automatically distribute all pending tasks to available agents based on workload.',
            okText: 'Auto-Assign',
            cancelText: 'Cancel',
            onOk: async () => {
                setAutoAssignLoading(true);
                try {
                    const response = await taskApi.autoAssignPendingTasks();
                    message.success(response.data?.message || 'Tasks auto-assigned successfully');
                    fetchData();
                } catch (error) {
                    console.error('Error auto-assigning:', error);
                    message.error('Failed to auto-assign tasks');
                } finally {
                    setAutoAssignLoading(false);
                }
            }
        });
    };

    // Calculate statistics
    const totalUnassigned = unassignedTasks.length;
    const disbursementTasks = unassignedTasks.filter(t => t.type === 'DISBURSEMENT').length;
    const depositTasks = unassignedTasks.filter(t => t.type === 'DEPOSIT').length;
    const availableAgents = agents.length;

    const columns = [
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
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            width: 140,
            render: (phone) => {
                // Mask phone number
                if (phone && phone.length > 4) {
                    const masked = phone.slice(0, 4) + '****' + phone.slice(-4);
                    return <span>{masked}</span>;
                }
                return phone;
            }
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 120,
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
            render: (amount) => formatCurrency(amount),
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (date) => date ? new Date(date).toLocaleString() : '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => (
                <Badge color="default" text="Pending" />
            ),
        },
    ];

    // Row selection configuration
    const rowSelection = {
        selectedRowKeys: selectedTaskIds,
        onChange: (selectedRowKeys) => {
            setSelectedTaskIds(selectedRowKeys);
        },
        getCheckboxProps: (record) => ({
            disabled: record.status !== 'PENDING',
        }),
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Agent Assignment</Title>
                <Space>
                    <Button 
                        icon={<ReloadOutlined />} 
                        onClick={fetchData}
                        loading={loading}
                    >
                        Refresh
                    </Button>
                    <Button
                        type="primary"
                        icon={<TeamOutlined />}
                        onClick={handleAutoAssign}
                        loading={autoAssignLoading}
                    >
                        Auto-Assign All
                    </Button>
                </Space>
            </div>

            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Assign pending verification tasks to available agents. Auto-assignment uses load balancing algorithm.
            </Text>

            {/* KPI Cards */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Pending Tasks"
                            value={totalUnassigned}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Disbursement"
                            value={disbursementTasks}
                            prefix={<PhoneOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Deposit"
                            value={depositTasks}
                            prefix={<PhoneOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Available Agents"
                            value={availableAgents}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Agent Status Summary */}
            <Card style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col span={24}>
                        <Space wrap>
                            <Text strong>Active Agents:</Text>
                            {agents.map(agent => (
                                <Tag key={agent.id} color="green" icon={<UserOutlined />}>
                                    {agent.fullName}
                                    {agent.currentLoad !== undefined && (
                                        <span style={{ marginLeft: 8, color: '#888' }}>
                                            ({agent.currentLoad || 0} tasks)
                                        </span>
                                    )}
                                </Tag>
                            ))}
                            {agents.length === 0 && (
                                <Text type="secondary">No active agents available</Text>
                            )}
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Selection Toolbar */}
            {selectedTaskIds.length > 0 && (
                <Alert
                    message={
                        <Space>
                            <Text strong>{selectedTaskIds.length}</Text>
                            <Text>tasks selected</Text>
                            <Select
                                style={{ width: 200 }}
                                placeholder="Select agent to assign"
                                onChange={(value) => setSelectedAgentId(value)}
                                value={selectedAgentId}
                            >
                                {agents.map(agent => (
                                    <Option key={agent.id} value={agent.id}>
                                        {agent.fullName} ({agent.currentLoad || 0} tasks)
                                    </Option>
                                ))}
                            </Select>
                            <Button
                                type="primary"
                                icon={<UserAddOutlined />}
                                onClick={handleAssign}
                                disabled={!selectedAgentId}
                            >
                                Assign Selected
                            </Button>
                            <Button onClick={getSuggestions} icon={<BarChartOutlined />}>
                                Get Suggestions
                            </Button>
                            <Button 
                                danger 
                                size="small"
                                onClick={() => {
                                    setSelectedTaskIds([]);
                                    setSelectedAgentId(null);
                                }}
                            >
                                Clear
                            </Button>
                        </Space>
                    }
                    type="info"
                    showIcon
                />
            )}

            {/* Tasks Table */}
            <Card>
                <Table
                    rowSelection={rowSelection}
                    columns={columns}
                    dataSource={unassignedTasks}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    bordered
                    locale={{ emptyText: 'No pending tasks. All tasks are assigned!' }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            {/* Assignment Suggestions Modal */}
            <Modal
                title="Assignment Suggestions"
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    setAssignmentSuggestions([]);
                }}
                footer={[
                    <Button key="close" onClick={() => setIsModalOpen(false)}>
                        Close
                    </Button>
                ]}
                width={700}
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Recommended agents based on performance and current workload:
                </Text>
                {assignmentSuggestions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                        No suggestions available
                    </div>
                ) : (
                    <Table
                        columns={[
                            {
                                title: 'Agent',
                                dataIndex: 'agentName',
                                key: 'agentName',
                                render: (text) => <Text strong>{text}</Text>
                            },
                            {
                                title: 'Current Load',
                                dataIndex: 'currentLoad',
                                key: 'currentLoad',
                                render: (value) => (
                                    <Badge color={value < 5 ? 'green' : value < 8 ? 'orange' : 'red'}>
                                        {value} tasks
                                    </Badge>
                                )
                            },
                            {
                                title: 'Success Rate',
                                dataIndex: 'successRate',
                                key: 'successRate',
                                render: (value) => (
                                    <Progress 
                                        percent={parseFloat(value) || 0} 
                                        size="small"
                                        strokeColor={value >= 80 ? '#52c41a' : value >= 60 ? '#faad14' : '#ff4d4f'}
                                    />
                                )
                            },
                            {
                                title: 'Avg Handle Time',
                                dataIndex: 'avgHandleTime',
                                key: 'avgHandleTime',
                                render: (value) => {
                                    const mins = Math.floor(value / 60);
                                    const secs = value % 60;
                                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                                }
                            },
                            {
                                title: 'Score',
                                dataIndex: 'score',
                                key: 'score',
                                render: (value) => (
                                    <Tag color={value >= 0.7 ? 'green' : value >= 0.4 ? 'orange' : 'red'}>
                                        {(value * 100).toFixed(0)}%
                                    </Tag>
                                )
                            }
                        ]}
                        dataSource={assignmentSuggestions}
                        rowKey="agentId"
                        pagination={false}
                        size="small"
                    />
                )}
            </Modal>
        </div>
    );
};

export default AgentAssignment;