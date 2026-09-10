// fe/src/pages/CampaignAssignment.jsx
import { useState, useEffect } from 'react';
import {
  Table,
  Select,
  Button,
  message,
  Space,
  Card,
  Typography,
  Tag,
  Tabs,
  Alert,
  Row,
  Col,
  Statistic,
  Divider,
  Radio,
  Input,
  DatePicker,
  Popconfirm,
} from 'antd';
import {
  FolderOutlined,
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { campaignApi } from '../api/campaignApi';
import { loanApi } from '../api/loanApi';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const CampaignAssignment = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR';

  const [loans, setLoans] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('unassigned');
  const [filterType, setFilterType] = useState('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get campaigns (Supervisors only see their campaigns, Admins see all)
      const campaignsParams = isAdmin ? {} : { supervisorId: user?.id };
      const [loansRes, campaignsRes] = await Promise.all([
        loanApi.getLoans({
          campaignId: null, // Unassigned loans
          ...(isSupervisor ? { supervisorId: user?.id } : {}),
        }),
        campaignApi.getCampaigns({
          status: ['ACTIVE', 'DRAFT'],
          ...(isSupervisor ? { supervisorId: user?.id } : {}),
        }),
      ]);

      setLoans(loansRes.data || []);
      setCampaigns(campaignsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleAssign = async (loanId) => {
    const campaignId = selectedCampaign[loanId];
    if (!campaignId) {
      message.warning('Please select a campaign first');
      return;
    }

    try {
      await loanApi.assignToCampaign(loanId, campaignId);
      message.success('Loan assigned to campaign successfully');
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Error assigning loan:', error);
      message.error('Failed to assign loan');
    }
  };

  const handleBulkAssign = async () => {
    const selectedLoans = loans.filter((l) => l._selected);
    if (selectedLoans.length === 0) {
      message.warning('Please select at least one loan');
      return;
    }

    // Get the campaign ID from the first selected loan
    const campaignId = selectedCampaign[selectedLoans[0].loanId];
    if (!campaignId) {
      message.warning('Please select a campaign for the selected loans');
      return;
    }

    try {
      await loanApi.bulkAssignToCampaign(
        selectedLoans.map((l) => l.loanId),
        campaignId
      );
      message.success(`${selectedLoans.length} loans assigned to campaign`);
      fetchData();
    } catch (error) {
      console.error('Error bulk assigning:', error);
      message.error('Failed to assign loans');
    }
  };

  const columns = [
    {
      title: 'Loan ID',
      dataIndex: 'loan_id',
      key: 'loan_id',
      sorter: (a, b) => a.loan_id.localeCompare(b.loan_id),
      fixed: 'left',
      width: 150,
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      sorter: (a, b) => a.customer_name.localeCompare(b.customer_name),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `${amount.toLocaleString()} MMK`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Branch',
      dataIndex: 'branch_id',
      key: 'branch_id',
    },
    {
      title: 'Disbursement Date',
      dataIndex: 'disbursement_date',
      key: 'disbursement_date',
      render: (date) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      title: 'Task Type',
      dataIndex: 'task_type',
      key: 'task_type',
      render: (type) => <Tag color={type === 'DISBURSEMENT' ? 'blue' : 'orange'}>{type}</Tag>,
    },

    {
      title: 'Select Campaign',
      key: 'campaign',
      render: (_, record) => (
        <Select
          style={{ width: 200 }}
          placeholder="Select campaign"
          onChange={(value) =>
            setSelectedCampaign((prev) => ({ ...prev, [record.loan_id]: value }))
          }
          value={selectedCampaign[record.loan_id]}
          disabled={!isAdmin && !isSupervisor}
        >
          {campaigns.map((c) => (
            <Option key={c.id} value={c.id}>
              {c.name} ({c.type})
              {c.status === 'ACTIVE' && (
                <Tag color="green" size="small">
                  Active
                </Tag>
              )}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleAssign(record.loan_id)}
          disabled={!isAdmin && !isSupervisor}
        >
          Assign
        </Button>
      ),
    },
  ];

  // Filter loans based on tab
  const getFilteredLoans = () => {
    let filtered = loans;

    if (activeTab === 'unassigned') {
      filtered = filtered.filter((l) => !l.campaign_id);
    } else if (activeTab === 'assigned') {
      filtered = filtered.filter((l) => l.campaign_id);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((l) => l.task_type === filterType);
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.loan_id.toLowerCase().includes(search) ||
          l.customer_name.toLowerCase().includes(search) ||
          l.branch_id?.toLowerCase().includes(search)
      );
    }

    return filtered;
  };

  const filteredLoans = getFilteredLoans();
  const unassignedCount = loans.filter((l) => !l.campaign_id).length;
  const assignedCount = loans.filter((l) => l.campaign_id).length;
  const totalLoans = loans.length;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Title level={2} style={{ margin: 0 }}>
              <FolderOutlined /> Campaign Assignment
            </Title>
            <Text type="secondary">
              {isAdmin ? 'Manage loan assignments to campaigns' : 'Assign loans to your campaigns'}
              {isSupervisor && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  Supervisor View
                </Tag>
              )}
            </Text>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Refresh
            </Button>
          </Col>
        </Row>

        <Divider />

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="Total Loans" value={totalLoans} prefix={<FolderOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Unassigned Loans"
                value={unassignedCount}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Assigned Loans"
                value={assignedCount}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Radio.Group value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <Radio.Button value="all">All Types</Radio.Button>
            <Radio.Button value="DISBURSEMENT">Disbursement</Radio.Button>
            <Radio.Button value="DEPOSIT">Deposit</Radio.Button>
          </Radio.Group>

          <Input.Search
            placeholder="Search loan ID, customer, branch..."
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />

          {isAdmin && (
            <Button type="primary" onClick={handleBulkAssign}>
              Bulk Assign Selected
            </Button>
          )}
        </Space>

        {/* Tabs for Unassigned/Assigned */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'unassigned',
              label: (
                <span>
                  <ExclamationCircleOutlined />
                  Unassigned <Tag color="orange">{unassignedCount}</Tag>
                </span>
              ),
              children: (
                <Table
                  columns={columns}
                  dataSource={filteredLoans}
                  rowKey="loan_id"
                  loading={loading}
                  rowSelection={{
                    type: 'checkbox',
                    onChange: (selectedRowKeys, selectedRows) => {
                      setLoans(
                        loans.map((l) => ({
                          ...l,
                          _selected: selectedRowKeys.includes(l.loan_id),
                        }))
                      );
                    },
                  }}
                  pagination={{
                    pageSize: 20,
                    showTotal: (total) => `Total ${total} loans`,
                  }}
                  scroll={{ x: 1200 }}
                />
              ),
            },
            {
              key: 'assigned',
              label: (
                <span>
                  <CheckCircleOutlined />
                  Assigned <Tag color="green">{assignedCount}</Tag>
                </span>
              ),
              children: (
                <Table
                  columns={[
                    ...columns,
                    {
                      title: 'Campaign',
                      dataIndex: 'campaign_name',
                      key: 'campaign_name',
                      render: (name) => <Tag color="blue">{name}</Tag>,
                    },
                  ]}
                  dataSource={filteredLoans}
                  rowKey="loan_id"
                  loading={loading}
                  pagination={{
                    pageSize: 20,
                    showTotal: (total) => `Total ${total} loans`,
                  }}
                  scroll={{ x: 1200 }}
                />
              ),
            },
          ]}
        />

        {/* Permission Notice for Agents */}
        {!isAdmin && !isSupervisor && (
          <Alert
            message="View Only Mode"
            description="You don't have permission to assign campaigns. Please contact your supervisor."
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {/* Supervisor Notice */}
        {isSupervisor && (
          <Alert
            message="Supervisor Access"
            description="You can only assign loans to campaigns you have access to. Contact admin for additional campaigns."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </div>
  );
};

export default CampaignAssignment;
