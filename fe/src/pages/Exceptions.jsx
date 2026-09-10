// fe/src/pages/Exceptions.jsx
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
  Descriptions,
  Divider,
  Input,
  message,
  Row,
  Col,
  Statistic,
  Empty,
  Spin,
} from 'antd';
import {
  ExclamationCircleOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileExcelOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { taskApi } from '../api/taskApi';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../config/currency';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const Exceptions = () => {
  const { user } = useAuth();
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedException, setSelectedException] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);

  // ✅ Fetch exceptions from API
  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const response = await taskApi.getTasks({
        status: 'DISPUTED,ESCALATED',
        type: 'all',
      });
      setExceptions(response.data || []);
  } catch (error) {
    console.error('Error fetching exceptions:', error);
    message.error('Failed to load exceptions');
    setExceptions([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchExceptions();
  }, []);

  // Statistics
  const totalExceptions = exceptions.length;
  const criticalCount = exceptions.filter((e) => e.severity === 'CRITICAL').length;
  const highCount = exceptions.filter((e) => e.severity === 'HIGH').length;
  const disputedCount = exceptions.filter((e) => e.status === 'DISPUTED').length;
  const escalatedCount = exceptions.filter((e) => e.status === 'ESCALATED').length;

  // Severity color mapping
  const severityMap = {
    CRITICAL: { color: 'red', text: 'Critical' },
    HIGH: { color: 'orange', text: 'High' },
    MEDIUM: { color: 'gold', text: 'Medium' },
    LOW: { color: 'blue', text: 'Low' },
  };

  const statusMap = {
    DISPUTED: { color: 'orange', text: 'Disputed' },
    ESCALATED: { color: 'red', text: 'Escalated' },
    RESOLVED: { color: 'green', text: 'Resolved' },
    CLOSED: { color: 'default', text: 'Closed' },
  };

  const disputeReasonMap = {
    AMOUNT_MISMATCH: 'Amount Mismatch',
    NOT_RECEIVED: 'Not Received',
    OTHER: 'Other',
  };

  // Filter exceptions
  const filteredExceptions = exceptions.filter((exception) => {
    if (searchText) {
      const search = searchText.toLowerCase();
      const match =
        exception.loanId?.toLowerCase().includes(search) ||
        exception.customerName?.toLowerCase().includes(search) ||
        exception.phone?.includes(search);
      if (!match) return false;
    }
    if (statusFilter !== 'all' && exception.status !== statusFilter) return false;
    if (severityFilter !== 'all' && exception.severity !== severityFilter) return false;
    return true;
  });

  const handleView = (record) => {
    setSelectedException(record);
    setIsModalOpen(true);
  };

  const handleResolve = (record) => {
    Modal.confirm({
      title: 'Resolve Exception',
      content: `Mark this exception as RESOLVED for loan ${record.loanId}?`,
      okText: 'Yes, Resolve',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await taskApi.updateStatus(record.id, 'RESOLVED', user?.id);
          message.success(`Exception for ${record.loanId} resolved.`);
          fetchExceptions();
        } catch (error) {
          console.error('Error resolving exception:', error);
          message.error('Failed to resolve exception');
        }
      },
    });
  };

  const handleEscalate = (record) => {
    Modal.confirm({
      title: 'Escalate Exception',
      content: `Escalate this exception for loan ${record.loanId} to management?`,
      okText: 'Yes, Escalate',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await taskApi.updateStatus(record.id, 'ESCALATED', user?.id);
          message.warning(`Exception for ${record.loanId} escalated to management.`);
          fetchExceptions();
        } catch (error) {
          console.error('Error escalating exception:', error);
          message.error('Failed to escalate exception');
        }
      },
    });
  };

  const handleExport = () => {
    try {
      const exportData = filteredExceptions.map((exception) => ({
        'Loan ID': exception.loanId,
        'Customer Name': exception.customerName,
        Phone: exception.phone,
        Type: exception.type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit',
        Amount: exception.amount,
        Severity: exception.severity,
        Status: exception.status,
        'Dispute Reason': exception.disputeReason,
        Description: exception.description,
        'Reported By': exception.reportedBy,
        'Reported At': exception.reportedAt,
        Attempts: exception.attempts,
        Notes: exception.notes || '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Exceptions');
      XLSX.writeFile(wb, `exceptions_${new Date().toISOString().slice(0, 10)}.xlsx`);
      message.success('Exceptions data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export exceptions data.');
    }
  };

  const columns = [
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
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (text) => text || '-',
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
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 110,
      render: (severity) => {
        const info = severityMap[severity] || { color: 'default', text: severity || 'Unknown' };
        return <Tag color={info.color}>{info.text}</Tag>;
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
      title: 'Reported By',
      dataIndex: 'reportedBy',
      key: 'reportedBy',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Reported At',
      dataIndex: 'reportedAt',
      key: 'reportedAt',
      width: 160,
      render: (date) => (date ? new Date(date).toLocaleString() : '-'),
    },
    {
      title: 'Attempts',
      dataIndex: 'attempts',
      key: 'attempts',
      width: 80,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
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
          {record.status === 'DISPUTED' && (
            <Button
              type="link"
              icon={<AlertOutlined />}
              onClick={() => handleEscalate(record)}
              size="small"
              style={{ color: '#faad14' }}
            >
              Escalate
            </Button>
          )}
          {record.status !== 'RESOLVED' && record.status !== 'CLOSED' && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleResolve(record)}
              size="small"
              style={{ color: '#52c41a' }}
            >
              Resolve
            </Button>
          )}
        </Space>
      ),
    },
  ];

  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="Loading exceptions..." />
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
          Exception Management
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchExceptions} loading={loading}>
            Refresh
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExport}>
            Export
          </Button>
        </Space>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        View and manage all disputed and escalated cases. Take action to resolve or escalate as
        needed.
      </Text>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Exceptions"
              value={totalExceptions}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Critical"
              value={criticalCount}
              valueStyle={{ color: '#ff4d4f' }}
              suffix={`/${totalExceptions}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="High Priority"
              value={highCount}
              valueStyle={{ color: '#faad14' }}
              suffix={`/${totalExceptions}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Escalated"
              value={escalatedCount}
              valueStyle={{ color: '#eb2f96' }}
              suffix={`/${totalExceptions}`}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            placeholder="Search by Loan ID, Customer, Phone..."
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            defaultValue="all"
            style={{ width: 140 }}
            onChange={(value) => setSeverityFilter(value)}
          >
            <Option value="all">All Severity</Option>
            <Option value="CRITICAL">Critical</Option>
            <Option value="HIGH">High</Option>
            <Option value="MEDIUM">Medium</Option>
            <Option value="LOW">Low</Option>
          </Select>
          <Select
            defaultValue="all"
            style={{ width: 140 }}
            onChange={(value) => setStatusFilter(value)}
          >
            <Option value="all">All Status</Option>
            <Option value="DISPUTED">Disputed</Option>
            <Option value="ESCALATED">Escalated</Option>
            <Option value="RESOLVED">Resolved</Option>
          </Select>
          <RangePicker
            onChange={(dates) => setDateRange(dates)}
            placeholder={['Start Date', 'End Date']}
          />
          <Button
            onClick={() => {
              setSearchText('');
              setSeverityFilter('all');
              setStatusFilter('all');
              setDateRange(null);
            }}
          >
            Reset Filters
          </Button>
        </Space>
      </Card>

      {/* Exceptions Table */}
      <Card>
         {exceptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <Empty description="No exceptions found" />
          </div>
        ) : (
          <Table
            columns={[
              { title: 'Loan ID', dataIndex: 'loanId', key: 'loanId', width: 140 },
              { title: 'Customer', dataIndex: 'customerName', key: 'customerName', width: 180 },
              { title: 'Severity', dataIndex: 'severity', key: 'severity', width: 110, render: (s) => <Tag color={severityMap[s]?.color}>{severityMap[s]?.text || s}</Tag> },
              { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (s) => <Badge color={statusMap[s]?.color} text={statusMap[s]?.text || s} /> },
              { title: 'Reported By', dataIndex: 'reportedBy', key: 'reportedBy', width: 120 },
              { title: 'Reported At', dataIndex: 'reportedAt', key: 'reportedAt', width: 160, render: (d) => d ? new Date(d).toLocaleString() : '-' },
            ]}
          dataSource={filteredExceptions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
        />
          )}
      </Card>

      {/* Exception Detail Modal */}
      <Modal
        title={
          <span>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            Exception Details - {selectedException?.loanId}
          </span>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>,
          selectedException?.status !== 'RESOLVED' && selectedException?.status !== 'CLOSED' && (
            <Button
              key="resolve"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                if (selectedException) {
                  handleResolve(selectedException);
                  setIsModalOpen(false);
                }
              }}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Resolve
            </Button>
          ),
          selectedException?.status === 'DISPUTED' && (
            <Button
              key="escalate"
              danger
              icon={<AlertOutlined />}
              onClick={() => {
                if (selectedException) {
                  handleEscalate(selectedException);
                  setIsModalOpen(false);
                }
              }}
            >
              Escalate
            </Button>
          ),
        ]}
      >
        {selectedException && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <div>
                    <Text strong>Severity: </Text>
                    <Tag color={severityMap[selectedException.severity]?.color || 'default'}>
                      {severityMap[selectedException.severity]?.text ||
                        selectedException.severity ||
                        'Unknown'}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Status: </Text>
                    <Badge
                      color={statusMap[selectedException.status]?.color || 'default'}
                      text={
                        statusMap[selectedException.status]?.text ||
                        selectedException.status ||
                        'Unknown'
                      }
                    />
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <div>
                    <Text strong>Reported By: </Text>
                    {selectedException.reportedBy || '-'}
                  </div>
                  <div>
                    <Text strong>Reported At: </Text>
                    {selectedException.reportedAt
                      ? new Date(selectedException.reportedAt).toLocaleString()
                      : '-'}
                  </div>
                </Card>
              </Col>
            </Row>

            <Divider orientation="left">Customer Information</Divider>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Customer Name">
                {selectedException.customerName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedException.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Loan ID">
                {selectedException.loanId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Loan Amount">
                {selectedException.amount ? formatCurrency(selectedException.amount) : '-'};
              </Descriptions.Item>
              <Descriptions.Item label="Type" span={2}>
                <Tag color={selectedException.type === 'DISBURSEMENT' ? 'blue' : 'green'}>
                  {selectedException.type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Exception Details</Divider>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Dispute Reason">
                {disputeReasonMap[selectedException.disputeReason] ||
                  selectedException.disputeReason ||
                  '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedException.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Notes">
                {selectedException.notes || 'No additional notes.'}
              </Descriptions.Item>
              <Descriptions.Item label="Attempts">
                {selectedException.attempts || 0} call attempts
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Resolution Action</Divider>
            <TextArea
              rows={3}
              placeholder="Enter resolution notes or comments..."
              style={{ marginTop: 8 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Exceptions;
