import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Badge,
  DatePicker,
  Modal,
  Descriptions,
  Typography,
  message,
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { attemptApi } from '../api/attemptApi';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

const CallHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // State for the View Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);

  // Status color mapping
  const resultMap = {
    CONFIRMED: { color: 'green', text: 'Confirmed' },
    DISPUTED: { color: 'red', text: 'Disputed' },
    NO_CONTACT: { color: 'gold', text: 'No Contact' },
  };

  const typeColorMap = {
    DISBURSEMENT: 'blue',
    DEPOSIT: 'green',
  };

  // Handle filtering
  const applyFilters = () => {
    let data = [...history];

    // Search filter
    if (searchText) {
      const lower = searchText.toLowerCase();
      data = data.filter(
        (item) =>
          item.loanId.toLowerCase().includes(lower) ||
          item.customerName.toLowerCase().includes(lower)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      data = data.filter((item) => item.type === typeFilter);
    }

    // Result filter
    if (resultFilter !== 'all') {
      data = data.filter((item) => item.result === resultFilter);
    }

    // Date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      data = data.filter((item) => {
        const itemDate = dayjs(item.timestamp, 'YYYY-MM-DD hh:mm A');
        return itemDate.isBetween(start, end, null, '[]');
      });
    }

    setFilteredData(data);
  };

  // Trigger filter when any filter changes
  useEffect(() => {
    applyFilters();
  }, [searchText, typeFilter, resultFilter, dateRange, history]);

  const handleView = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  // ✅ Fetch history from API
  const fetchHistory = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await attemptApi.getMyAttempts(user.id, { limit: 1000 });
      const data = response.data || [];
       // Map the data to include all required fields
    const mappedData = data.map(item => ({
      id: item.id || item.attempt_id,
      loanId: item.loanId || item.loan_id,
      customerName: item.customerName || item.customer_name,
      phone: item.phone || item.customer_phone,
      type: item.type || item.task_type,
      agentName: item.agentName || item.agent || user?.fullName,
      method: item.callMethod || item.call_method || 'CLICK_TO_CALL',
      result: item.result,
      duration: item.duration || item.duration_sec || 0,
      notes: item.notes || '',
      timestamp: item.timestamp || item.createdAt || new Date().toISOString(),
      createdAt: item.createdAt || item.created_at,
    }));
      setHistory(mappedData);
      setFilteredData(mappedData);
    } catch (error) {
      console.error('Error fetching history:', error);
      message.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
    },
    {
      title: 'Loan ID',
      dataIndex: 'loanId',
      key: 'loanId',
      width: 140,
      render: (text) => <a>{text}</a>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 180,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type) => (
        <Tag color={typeColorMap[type] || 'default'}>
          {type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
        </Tag>
      ),
    },
    {
      title: 'Agent', // ✅ This will now show the agent name
      dataIndex: 'agentName', // ✅ Changed from 'agent' to 'agentName'
      key: 'agentName',
      width: 140,
      render: (text, record) => {
    // Fallback to agent, then fullName, then user's name, then 'Unknown'
    return text || record.agent || record.fullName || user?.fullName;
  },
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      width: 130,
      render: (method) => (
        <Tag color={method === 'CLICK_TO_CALL' ? 'blue' : 'orange'}>
          {method === 'CLICK_TO_CALL' ? 'Click-to-Call' : 'Manual'}
        </Tag>
      ),
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 130,
      render: (result) => {
        const info = resultMap[result] || { color: 'default', text: result };
        return <Badge color={info.color} text={info.text} />;
      },
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration) => `${duration}s`,
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)} size="small">
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Call History</h2>
        <Space>
          <Button onClick={applyFilters}>Refresh</Button>
        </Space>
      </div>

      {/* Filter Bar */}
      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker
          onChange={(dates) => setDateRange(dates)}
          placeholder={['Start Date', 'End Date']}
        />
        <Select
          defaultValue="all"
          style={{ width: 150 }}
          onChange={(value) => setTypeFilter(value)}
        >
          <Option value="all">All Types</Option>
          <Option value="DISBURSEMENT">Disbursement</Option>
          <Option value="DEPOSIT">Deposit</Option>
        </Select>
        <Select
          defaultValue="all"
          style={{ width: 150 }}
          onChange={(value) => setResultFilter(value)}
        >
          <Option value="all">All Results</Option>
          <Option value="CONFIRMED">Confirmed</Option>
          <Option value="DISPUTED">Disputed</Option>
          <Option value="NO_CONTACT">No Contact</Option>
        </Select>
        <Input
          placeholder="Search Loan ID / Name"
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'No call history found' }}
      />

      {/* Read-Only Detail Modal (SCR-004 Read-Only) */}
      <Modal
        title="Call Details (Read-Only)"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={640}
      >
        {selectedRecord && (
          <>
            <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Title level={5}>Customer & Loan Info</Title>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="Loan ID">{selectedRecord.loanId}</Descriptions.Item>
                <Descriptions.Item label="Customer">
                  {selectedRecord.customerName}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">{selectedRecord.phone}</Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag color={typeColorMap[selectedRecord.type] || 'default'}>
                    {selectedRecord.type === 'DISBURSEMENT' ? 'Disbursement' : 'Deposit'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>Call Details</Title>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="Agent">{selectedRecord.agent}</Descriptions.Item>
                <Descriptions.Item label="Method">
                  <Tag color={selectedRecord.method === 'CLICK_TO_CALL' ? 'blue' : 'orange'}>
                    {selectedRecord.method === 'CLICK_TO_CALL' ? 'Click-to-Call' : 'Manual'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Timestamp">{selectedRecord.timestamp}</Descriptions.Item>
                <Descriptions.Item label="Duration">{selectedRecord.duration}s</Descriptions.Item>
                <Descriptions.Item label="Result" span={2}>
                  <Badge
                    color={resultMap[selectedRecord.result]?.color || 'default'}
                    text={resultMap[selectedRecord.result]?.text || selectedRecord.result}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Notes" span={2}>
                  <Text type={selectedRecord.notes ? 'default' : 'secondary'}>
                    {selectedRecord.notes || 'No notes provided'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default CallHistory;
