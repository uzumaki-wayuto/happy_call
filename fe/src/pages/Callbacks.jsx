// src/pages/Callbacks.jsx
import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  DatePicker,
  Typography,
  Badge,
  Modal,
  Form,
  Input,
  message,
  Row,
  Col,
  Statistic,
  Divider,
  Empty,
  Spin,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileExcelOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { callbackApi } from '../api/callbackApi';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const Callbacks = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [callbacks, setCallbacks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCallback, setSelectedCallback] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);

  // Get current user role (mock)
  const userRole = 'AGENT'; // 'AGENT' or 'SUPERVISOR'
  const SUPERVISOR_ROLES = ['SUPERVISOR', 'supervisor', 'Supervisor'];
  const isSupervisor = SUPERVISOR_ROLES.includes(user?.role);

  // ✅ Fetch callbacks from API
  const fetchCallbacks = async () => {
    setLoading(true);
    try {
      const params = {
        ...(isSupervisor ? {} : { agentId: user?.id }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
      };
      console.log(' fetching params:', params);
      console.log(' isSupervisor:' , isSupervisor);
      console.log('user:', user);

      const response = await callbackApi.getCallbacks(params);

      // Handle both shapes: raw array OR {data: [...]}
      const res = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
          
      setCallbacks(res);
    } catch (error) {
      console.error('Error fetching callbacks:', error);
      message.error('Failed to load callbacks');
      setCallbacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallbacks();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    console.log(' callbacks state changed:', callbacks);
  }, [callbacks]);
  
  // Statistics
  const totalCallbacks = callbacks.length;
  const pendingCallbacks = callbacks.filter((c) => c.status === 'PENDING').length;
  const completedCallbacks = callbacks.filter((c) => c.status === 'COMPLETED').length;
  const cancelledCallbacks = callbacks.filter((c) => c.status === 'CANCELLED').length;

  // Filter callbacks
  const filteredCallbacks = callbacks.filter((callback) => {
      // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      const match =
        callback.loanId.toLowerCase().includes(search) ||
        callback.customerName.toLowerCase().includes(search) ||
        callback.phone.includes(search);
      if (!match) return false;
    }
    // Status filter
    if (statusFilter !== 'all' && callback.status !== statusFilter) return false;
    // Type filter
    if (typeFilter !== 'all' && callback.type !== typeFilter) return false;
    // Date filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      // In real app, compare dates
    }
    return true;
  });

  // Status color mapping
  const statusMap = {
    PENDING: { color: 'orange', text: 'Pending' },
    COMPLETED: { color: 'green', text: 'Completed' },
    CANCELLED: { color: 'red', text: 'Cancelled' },
  };

  const handleAddCallback = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setSelectedCallback(record);
    setIsViewModalOpen(true);
  };

  const handleComplete = (record) => {
    Modal.confirm({
      title: 'Mark as Completed',
      content: `Mark callback for ${record.customerName} as completed?`,
      okText: 'Yes, Complete',
      onOk: async () => {
        try {
          await callbackApi.updateCallback(record.id, { status: 'COMPLETED' });
          message.success('Callback marked as completed.');
          fetchCallbacks();
        } catch (error) {
          console.error('Error completing callback:', error);
          message.error('Failed to complete callback');
        }
      },
    });
  };

  const handleCancel = (record) => {
    Modal.confirm({
      title: 'Cancel Callback',
      content: `Cancel callback for ${record.customerName}?`,
      okText: 'Yes, Cancel',
      okType: 'danger',
      onOk: async () => {
        try {
          await callbackApi.updateCallback(record.id, { status: 'CANCELLED' });
          message.warning('Callback cancelled.');
          fetchCallbacks();
        } catch (error) {
          console.error('Error cancelling callback:', error);
          message.error('Failed to cancel callback');
        }
      },
    });
  };

  const handleSave = async (values) => {
    try {
      const newCallback = {
        ...values,
        status: 'PENDING',
        assignedTo: user?.id,
        createdAt: new Date().toISOString(),
      };
      await callbackApi.createCallback(newCallback);
      message.success('Callback scheduled successfully!');
      setIsModalOpen(false);
      fetchCallbacks();
    } catch (error) {
      console.error('Error creating callback:', error);
      message.error('Failed to schedule callback');
    }
  };

  const handleExport = () => {
    if (callbacks.length === 0) {
      message.warning('No callbacks to export');
      return;
    }

    try {
      const exportData = callbacks.map((callback) => ({
        'Customer Name': callback.customerName,
        'Loan ID': callback.loanId,
        Phone: callback.phone,
        Type: callback.type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit',
        'Callback Date': callback.callbackDate,
        'Callback Time': callback.callbackTime,
        Reason: callback.reason,
        Status: callback.status,
        'Assigned To': callback.assignedTo,
        Notes: callback.notes || '',
        'Created At': callback.createdAt,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Callbacks');
      XLSX.writeFile(wb, `callbacks_${new Date().toISOString().slice(0, 10)}.xlsx`);
      message.success('Callback data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export callback data.');
    }
  };

  const columns = [
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 180,
    },
    {
      title: 'Loan ID',
      dataIndex: 'loanId',
      key: 'loanId',
      width: 140,
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
      title: 'Callback Date',
      dataIndex: 'callbackDate',
      key: 'callbackDate',
      width: 120,
    },
    {
      title: 'Time',
      dataIndex: 'callbackTime',
      key: 'callbackTime',
      width: 100,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 140,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const info = statusMap[status] || { color: 'default', text: status };
        return <Badge color={info.color} text={info.text} />;
      },
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 150,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            size="small"
          >
            View
          </Button>
          {record.status === 'PENDING' && (
            <>
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => handleComplete(record)}
                size="small"
                style={{ color: '#52c41a' }}
              >
                Complete
              </Button>
              <Button
                type="link"
                icon={<CloseCircleOutlined />}
                onClick={() => handleCancel(record)}
                size="small"
                style={{ color: '#ff4d4f' }}
              >
                Cancel
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

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
          Callback Management
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCallback}>
            Schedule Callback
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchCallbacks} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {isSupervisor
          ? 'View and manage all callbacks across the team.'
          : 'Manage your scheduled callbacks and follow-ups.'}
      </Text>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Callbacks"
              value={totalCallbacks}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={pendingCallbacks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={completedCallbacks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Cancelled"
              value={cancelledCallbacks}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="Search by Loan ID, Customer..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            defaultValue="all"
            style={{ width: 140 }}
            onChange={(value) => setStatusFilter(value)}
          >
            <Option value="all">All Status</Option>
            <Option value="PENDING">Pending</Option>
            <Option value="COMPLETED">Completed</Option>
            <Option value="CANCELLED">Cancelled</Option>
          </Select>
          <Select
            defaultValue="all"
            style={{ width: 140 }}
            onChange={(value) => setTypeFilter(value)}
          >
            <Option value="all">All Types</Option>
            <Option value="DISBURSEMENT">Disbursement</Option>
            <Option value="DEPOSIT">Deposit</Option>
          </Select>
          <RangePicker
            onChange={(dates) => setDateRange(dates)}
            placeholder={['Start Date', 'End Date']}
          />
          <Button
            onClick={() => {
              setSearchText('');
              setStatusFilter('all');
              setTypeFilter('all');
              setDateRange(null);
            }}
          >
            Reset Filters
          </Button>
        </Space>
      </Card>

      {/* Callbacks Table */}
      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" tip="Loading callbacks..." />
          </div>
        ) : filteredCallbacks.length === 0 ? (
          <Empty
            description={
              <span>
                <Text strong>No Callbacks</Text>
                <br />
                <Text type="secondary">
                  {callbacks.length === 0
                    ? 'No callbacks scheduled yet.'
                    : 'No callbacks match your current filters.'}
                </Text>
              </span>
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredCallbacks}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            bordered
          />
        )}
      </Card>

      {/* Schedule Callback Modal */}
      <Modal
        title="Schedule Callback"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={520}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="customerName"
            label="Customer Name"
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input placeholder="Enter customer name" />
          </Form.Item>

          <Form.Item
            name="loanId"
            label="Loan ID"
            rules={[{ required: true, message: 'Please enter loan ID' }]}
          >
            <Input placeholder="Enter loan ID" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Call Type"
            rules={[{ required: true, message: 'Please select call type' }]}
          >
            <Select placeholder="Select call type">
              <Option value="DISBURSEMENT">Disbursement</Option>
              <Option value="DEPOSIT">Deposit</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="callbackDate"
                label="Callback Date"
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="Select date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="callbackTime"
                label="Callback Time"
                rules={[{ required: true, message: 'Please select time' }]}
              >
                <DatePicker.TimePicker style={{ width: '100%' }} placeholder="Select time" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please enter reason' }]}
          >
            <Select placeholder="Select reason">
              <Option value="Customer busy">Customer Busy</Option>
              <Option value="No answer">No Answer</Option>
              <Option value="Line dropped">Line Dropped</Option>
              <Option value="Switched off">Switched Off</Option>
              <Option value="Customer requested">Customer Requested</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Add any additional notes..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Schedule Callback
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Callback Modal */}
      <Modal
        title="Callback Details"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        width={600}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Close
          </Button>,
          selectedCallback?.status === 'PENDING' && (
            <>
              <Button
                key="complete"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  if (selectedCallback) {
                    handleComplete(selectedCallback);
                    setIsViewModalOpen(false);
                  }
                }}
                style={{ background: '#52c41a', borderColor: '#52c41a', color: 'white' }}
              >
                Complete
              </Button>
              <Button
                key="cancel"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  if (selectedCallback) {
                    handleCancel(selectedCallback);
                    setIsViewModalOpen(false);
                  }
                }}
              >
                Cancel
              </Button>
            </>
          ),
        ]}
      >
        {selectedCallback && (
          <div>
            <Divider orientation="left">Customer Information</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Name: </Text>
                {selectedCallback.customerName}
              </Col>
              <Col span={12}>
                <Text strong>Phone: </Text>
                {selectedCallback.phone}
              </Col>
              <Col span={12}>
                <Text strong>Loan ID: </Text>
                {selectedCallback.loanId}
              </Col>
              <Col span={12}>
                <Text strong>Type: </Text>
                <Tag color={selectedCallback.type === 'DISBURSEMENT' ? 'blue' : 'green'}>
                  {selectedCallback.type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
                </Tag>
              </Col>
            </Row>

            <Divider orientation="left">Callback Details</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Date: </Text>
                {selectedCallback.callbackDate}
              </Col>
              <Col span={12}>
                <Text strong>Time: </Text>
                {selectedCallback.callbackTime}
              </Col>
              <Col span={12}>
                <Text strong>Status: </Text>
                <Badge
                  color={statusMap[selectedCallback.status]?.color || 'default'}
                  text={statusMap[selectedCallback.status]?.text || selectedCallback.status}
                />
              </Col>
              <Col span={12}>
                <Text strong>Assigned To: </Text>
                {selectedCallback.assignedTo}
              </Col>
              <Col span={24}>
                <Text strong>Reason: </Text>
                {selectedCallback.reason}
              </Col>
              <Col span={24}>
                <Text strong>Notes: </Text>
                {selectedCallback.notes || 'No notes provided.'}
              </Col>
              <Col span={24}>
                <Text strong>Created At: </Text>
                {selectedCallback.createdAt}
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Callbacks;
