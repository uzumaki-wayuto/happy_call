// src/pages/Campaigns.jsx
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
  InputNumber,
  message,
  Row,
  Col,
  Statistic,
  Divider,
  Progress,
  Spin,
} from 'antd';
import {
  FlagOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { campaignApi } from '../api/campaignApi';
import { formatCurrency } from '../config/currency';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const Campaigns = () => {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [campaigns, setCampaigns] = useState([]);

  // In the Campaigns component, add state for selected campaign loans
  const [selectedCampaignLoans, setSelectedCampaignLoans] = useState([]);
  const [showLoansModal, setShowLoansModal] = useState(false);
  // ✅ Fetch campaigns from API
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const response = await campaignApi.getCampaigns(params);
      const data = response.data || [];
      setCampaigns(data);
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error);
      message.error('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, typeFilter]);

  // Statistics from real data
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const completedCampaigns = campaigns.filter((c) => c.status === 'COMPLETED').length;
  const draftCampaigns = campaigns.filter((c) => c.status === 'DRAFT').length;
  const pausedCampaigns = campaigns.filter((c) => c.status === 'PAUSED').length;
  const totalLoans = campaigns.reduce((sum, c) => sum + (c.totalLoans || 0), 0);
  const totalCompleted = campaigns.reduce((sum, c) => sum + (c.completed || 0), 0);
  const overallCompletion = totalLoans > 0 ? ((totalCompleted / totalLoans) * 100).toFixed(1) : 0;

  // Filter campaigns (frontend filter for search)
  const filteredCampaigns = campaigns.filter((campaign) => {
    if (searchText) {
      const search = searchText.toLowerCase();
      if (!campaign.name?.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  const statusMap = {
    ACTIVE: { color: 'green', text: 'Active' },
    COMPLETED: { color: 'blue', text: 'Completed' },
    DRAFT: { color: 'default', text: 'Draft' },
    PAUSED: { color: 'orange', text: 'Paused' },
  };

  const handleAddCampaign = () => {
    setEditingCampaign(null);
    form.resetFields();
    form.setFieldsValue({ status: 'DRAFT', totalLoans: 0 });
    setIsModalOpen(true);
  };

  const handleEditCampaign = (record) => {
    setEditingCampaign(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      totalLoans: record.totalLoans,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      endDate: record.endDate ? dayjs(record.endDate) : null,
      description: record.description,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setSelectedCampaign(record);
    setIsViewModalOpen(true);
  };

 // ✅ View Loans handler
  const handleViewLoans = async (record) => {
    setSelectedCampaign(record);
    try {
      const response = await campaignApi.getCampaignLoans(record.id);
      setSelectedCampaignLoans(response.data || []);
      setShowLoansModal(true);
    } catch (error) {
      console.error('Error fetching campaign loans:', error);
      message.error('Failed to load campaign loans');
    }
  };

  const handleSave = async (values) => {
    try {
      const formattedValues = {
        name: values.name,
        type: values.type,
        description: values.description || '',
        totalLoans: values.totalLoans || 0,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
        status: values.status,
        createdBy: 1, // Default admin ID
      };

      if (editingCampaign) {
        await campaignApi.updateCampaign(editingCampaign.id, formattedValues);
        message.success('Campaign updated successfully!');
      } else {
        await campaignApi.createCampaign(formattedValues);
        message.success('Campaign created successfully!');
      }

      setIsModalOpen(false);
      fetchCampaigns(); // Refresh list
    } catch (error) {
      console.error('❌ Error saving campaign:', error);
      message.error(error.response?.data?.error || 'Failed to save campaign');
    }
  };

  const handleCloseCampaign = (record) => {
    Modal.confirm({
      title: 'Close Campaign',
      content: `Are you sure you want to close campaign "${record.name}"?`,
      onOk: async () => {
        try {
          await campaignApi.updateCampaign(record.id, { status: 'COMPLETED' });
          message.success('Campaign closed successfully.');
          fetchCampaigns();
        } catch (error) {
          console.error('❌ Error closing campaign:', error);
          message.error('Failed to close campaign');
        }
      },
    });
  };

  // ✅ Added missing delete function
  const handleDeleteCampaign = (record) => {
    Modal.confirm({
      title: 'Delete Campaign',
      content: `Are you sure you want to delete campaign "${record.name}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await campaignApi.deleteCampaign(record.id);
          message.success('Campaign deleted successfully.');
          fetchCampaigns();
        } catch (error) {
          console.error('❌ Error deleting campaign:', error);
          message.error('Failed to delete campaign');
        }
      },
    });
  };

  const handleExport = () => {
    if (campaigns.length === 0) {
      message.warning('No campaigns to export');
      return;
    }

    const exportData = campaigns.map((campaign) => ({
      'Campaign Name': campaign.name,
      Type: campaign.type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit',
      'Total Loans': campaign.totalLoans,
      Assigned: campaign.assigned,
      Completed: campaign.completed,
      Confirmed: campaign.confirmed,
      Disputed: campaign.disputed,
      Status: campaign.status,
      'Start Date': campaign.startDate,
      'End Date': campaign.endDate,
    }));

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Campaigns');
      XLSX.writeFile(wb, `campaigns_${new Date().toISOString().slice(0, 10)}.xlsx`);
      message.success('Campaign data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export campaign data.');
    }
  };

  // ✅ Export loans for a specific campaign
  const exportCampaignLoans = (loans) => {
    if (!loans || loans.length === 0) {
      message.warning('No loans to export');
      return;
    }

    const exportData = loans.map((loan) => ({
      'Loan ID': loan.loanId,
      'Customer Name': loan.customerName,
      Phone: loan.phone,
      Amount: loan.amount || 0,
      Branch: loan.branch || '',
      'Loan Officer': loan.loanOfficer || '',
      'Disbursement Date': loan.disbursementDate || '',
      'Maturity Date': loan.maturityDate || '',
      'Task Type': loan.taskType || '',
      'Task Status': loan.taskStatus || '',
      Attempts: loan.attempts || 0,
      'Assigned Agent': loan.agentName || 'Unassigned',
    }));

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Campaign Loans');

      // Generate filename with campaign name
      const campaignName = selectedCampaign?.name || 'campaign';
      const fileName = `${campaignName.replace(/\s/g, '_')}_loans_${new Date().toISOString().slice(0, 10)}.xlsx`;

      XLSX.writeFile(wb, fileName);
      message.success(`Exported ${loans.length} loans successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export loan data.');
    }
  };

  // Add columns for loan details modal
  const loanColumns = [
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
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Branch',
      dataIndex: 'branch',
      key: 'branch',
      width: 120,
    },
    {
      title: 'Task Status',
      dataIndex: 'taskStatus',
      key: 'taskStatus',
      width: 130,
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
  ];

  const columns = [
    {
      title: 'Campaign Name',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text, record) => <a onClick={() => handleView(record)}>{text}</a>,
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
      title: 'Loans',
      dataIndex: 'loanCount',
      key: 'loanCount',
      width: 80,
      render: (text, record) => <Badge count={record.actualLoans || 0} showZero />,
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 150,
      render: (_, record) => {
        const percent = record.totalLoans > 0 ? (record.completed / record.totalLoans) * 100 : 0;
        return (
          <Progress
            percent={percent}
            size="small"
            strokeColor={record.status === 'COMPLETED' ? '#52c41a' : '#1890ff'}
            format={() => `${percent.toFixed(0)}%`}
          />
        );
      },
    },

    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const info = statusMap[status] || { color: 'default', text: status || 'Unknown' };
        return <Badge color={info.color} text={info.text} />;
      },
    },
    {
      title: 'Date Range',
      key: 'dateRange',
      width: 180,
      render: (_, record) => `${record.startDate || 'N/A'} → ${record.endDate || 'N/A'}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleView(record)}
            size="small"
          >
            View
          </Button>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleViewLoans(record)}
            size="small"
          >
            Loans ({record.actualLoans || 0})
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditCampaign(record)}
            size="small"
          >
            Edit
          </Button>
          {record.status === 'ACTIVE' && (
            <Button type="link" size="small" onClick={() => handleCloseCampaign(record)}>
              Close
            </Button>
          )}
          {record.status === 'DRAFT' && (
            <Button type="link" danger size="small" onClick={() => handleDeleteCampaign(record)}>
              Delete
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading && campaigns.length === 0) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
      >
        <Spin size="large" tip="Loading campaigns..." />
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
          Campaign Management
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCampaigns}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCampaign}>
            New Campaign
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExport}>
            Export
          </Button>
        </Space>
      </div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Create and manage verification campaigns. Each campaign represents a batch of loans to be
        verified.
      </Text>
      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Campaigns"
              value={totalCampaigns}
              prefix={<FlagOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active"
              value={activeCampaigns}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={completedCampaigns}
              prefix={<FlagOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Draft"
              value={draftCampaigns}
              prefix={<FlagOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overall Completion"
              value={overallCompletion}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: overallCompletion >= 70 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="Search by campaign name..."
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
            <Option value="ACTIVE">Active</Option>
            <Option value="COMPLETED">Completed</Option>
            <Option value="DRAFT">Draft</Option>
            <Option value="PAUSED">Paused</Option>
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
          <Button
            onClick={() => {
              setSearchText('');
              setStatusFilter('all');
              setTypeFilter('all');
            }}
          >
            Reset Filters
          </Button>
        </Space>
      </Card>
      {/* Campaigns Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCampaigns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
          locale={{ emptyText: 'No campaigns found. Create a new campaign to get started.' }}
        />
      </Card>
      {/* Add/Edit Campaign Modal */}
      <Modal
        title={editingCampaign ? 'Edit Campaign' : 'New Campaign'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={580}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="name"
            label="Campaign Name"
            rules={[{ required: true, message: 'Please enter campaign name' }]}
          >
            <Input placeholder="Enter campaign name" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Campaign Type"
            rules={[{ required: true, message: 'Please select campaign type' }]}
          >
            <Select placeholder="Select campaign type">
              <Option value="DISBURSEMENT">Disbursement Verification</Option>
              <Option value="DEPOSIT">Deposit Verification</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="totalLoans"
            label="Total Loans"
            rules={[{ required: true, message: 'Please enter total loans' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter total number of loans"
              min={0}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="Select start date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="End Date"
                rules={[{ required: true, message: 'Please select end date' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="Select end date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Enter campaign description..." />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Option value="DRAFT">Draft</Option>
              <Option value="ACTIVE">Active</Option>
              <Option value="PAUSED">Paused</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      {/* View Campaign Modal */}
      <Modal
        title="Campaign Details"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        width={650}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Close
          </Button>,
          selectedCampaign?.status === 'ACTIVE' && (
            <Button
              key="edit"
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                if (selectedCampaign) {
                  handleEditCampaign(selectedCampaign);
                  setIsViewModalOpen(false);
                }
              }}
            >
              Edit Campaign
            </Button>
          ),
        ]}
      >
        {selectedCampaign && (
          <div>
            <Divider orientation="left">Campaign Information</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <Text strong>Name: </Text>
                {selectedCampaign.name}
              </Col>
              <Col span={12}>
                <Text strong>Type: </Text>
                <Tag color={selectedCampaign.type === 'DISBURSEMENT' ? 'blue' : 'green'}>
                  {selectedCampaign.type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong>Status: </Text>
                <Badge
                  color={statusMap[selectedCampaign.status]?.color || 'default'}
                  text={statusMap[selectedCampaign.status]?.text || selectedCampaign.status}
                />
              </Col>
              <Col span={12}>
                <Text strong>Total Loans: </Text>
                {selectedCampaign.totalLoans || 0}
              </Col>
              <Col span={12}>
                <Text strong>Created By: </Text>
                {selectedCampaign.createdBy}
              </Col>
              <Col span={12}>
                <Text strong>Start Date: </Text>
                {selectedCampaign.startDate}
              </Col>
              <Col span={12}>
                <Text strong>End Date: </Text>
                {selectedCampaign.endDate}
              </Col>
              <Col span={24}>
                <Text strong>Description: </Text>
                {selectedCampaign.description || 'No description provided.'}
              </Col>
            </Row>

            <Divider orientation="left">Statistics</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Total Loans"
                    value={selectedCampaign.totalLoans}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Completed"
                    value={selectedCampaign.completed}
                    suffix={`(${selectedCampaign.totalLoans > 0 ? ((selectedCampaign.completed / selectedCampaign.totalLoans) * 100).toFixed(0) : 0}%)`}
                    valueStyle={{ fontSize: 20, color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Disputed"
                    value={selectedCampaign.disputed}
                    valueStyle={{ fontSize: 20, color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 16 }}>
              <Progress
                percent={
                  selectedCampaign.totalLoans > 0
                    ? (selectedCampaign.completed / selectedCampaign.totalLoans) * 100
                    : 0
                }
                strokeColor={selectedCampaign.status === 'COMPLETED' ? '#52c41a' : '#1890ff'}
                format={() =>
                  `${selectedCampaign.totalLoans > 0 ? ((selectedCampaign.completed / selectedCampaign.totalLoans) * 100).toFixed(0) : 0}% Complete`
                }
              />
            </div>
          </div>
        )}
      </Modal>
       {/* Add Loans Modal */}
      <Modal
        title={`Loans in "${selectedCampaign?.name}"`}
        open={showLoansModal}
        onCancel={() => setShowLoansModal(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setShowLoansModal(false)}>
            Close
          </Button>,
          <Button
            key="export"
            icon={<FileExcelOutlined />}
            onClick={() => exportCampaignLoans(selectedCampaignLoans)}
          >
            Export
          </Button>,
        ]}
      >
        <Table
          columns={loanColumns}
          dataSource={selectedCampaignLoans}
          rowKey="loanId"
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 800 }}
        />
      </Modal>
    </div>
  );
};

export default Campaigns;
