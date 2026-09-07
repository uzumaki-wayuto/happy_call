// src/pages/QueueList.jsx
import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Input, Select, Badge, message, Statistic, Card, Row, Col } from 'antd';
import { PhoneOutlined, SearchOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { taskApi } from '../api/taskApi';
import { attemptApi } from '../api/attemptApi';
import { useAuth } from '../context/AuthContext';
import CallExecutionDrawer from '../components/CallExecutionDrawer';
import { formatCurrency } from '../config/currency';

const { Option } = Select;

const QueueList = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filters, setFilters] = useState({ type: 'all', status: 'active' });
  const [searchText, setSearchText] = useState('');
  const [callStats, setCallStats] = useState({
    todayCalls: 0,
    completedToday: 0,
    pendingToday: 0,
    exceptionsToday: 0,
  });

  // ✅ Fetch tasks from API
  const fetchTasks = async () => {

     if (!user?.id) {
      console.log('⚠️ No user ID available, skipping fetch');
      return;
    }
    
    setLoading(true);
    try {

      // ✅ Ensure agentId is a number
        const agentId = parseInt(user.id);
        console.log('📡 Agent ID (parsed):', agentId);
        console.log('📡 Agent ID (original):', user.id);

      const params = {
        agentId: user?.id,
        status: filters.status === 'active' ? 'ASSIGNED,IN_PROGRESS' : undefined,
        type: filters.type !== 'all' ? filters.type : undefined,
        searchText: searchText || undefined,
      };
      const response = await taskApi.getTasks(params);

      let data = response.data || [];
      
const filteredData = data.filter(task => task.agentId === user.id);

 if (filteredData.length !== data.length) {
            console.warn(`⚠️ Some tasks don't match agentId. Total: ${data.length}, Filtered: ${filteredData.length}`);
        }

       if (data.length > 0) {
            console.log('📡 Sample task:', data[0]);
        }

       // ✅ Fetch call stats for today
      await fetchCallStats();

      // Apply search filter
      if (searchText) {
        const search = searchText.toLowerCase();
        data = data.filter(
          (task) =>
            task.loanId.toLowerCase().includes(search) ||
            task.customerName.toLowerCase().includes(search)
        );
      }

     setTasks(filteredData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      message.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

   // ✅ Fetch call statistics for this agent
  const fetchCallStats = async () => {
    if (!user?.id) return;
    try {
      const response = await attemptApi.getMyAttempts(user.id, { limit: 1000 });
      const attempts = response.data || [];
      
      const today = new Date().toISOString().slice(0, 10);
      const todayAttempts = attempts.filter(a => 
        a.createdAt && a.createdAt.startsWith(today)
      );
      
      setCallStats({
        todayCalls: todayAttempts.length,
        completedToday: todayAttempts.filter(a => a.result === 'CONFIRMED').length,
        pendingToday: todayAttempts.filter(a => a.result === 'IN_PROGRESS').length,
        exceptionsToday: todayAttempts.filter(a => a.result === 'DISPUTED').length,
      });
    } catch (error) {
      console.error('Error fetching call stats:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTasks();
    }
  }, [user, filters, searchText]);



  // Status color mapping
  const statusMap = {
    PENDING: { color: 'default', text: 'Pending' },
    ASSIGNED: { color: 'blue', text: 'Assigned' },
    IN_PROGRESS: { color: 'orange', text: 'In Progress' },
    CONFIRMED: { color: 'green', text: 'Confirmed' },
    DISPUTED: { color: 'red', text: 'Disputed' },
    NO_CONTACT: { color: 'gold', text: 'No Contact' },
    ESCALATED: { color: 'magenta', text: 'Escalated' },
    CLOSED: { color: 'default', text: 'Closed' },
  };

  // Open drawer when Call button is clicked
  const handleCall = (record) => {
    setSelectedTask(record);
    setDrawerOpen(true);
  };

  // Close drawer
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedTask(null);
    fetchTasks(); // Refresh after closing
  };

  // Save call attempt and update task status
  const handleSaveAttempt = async (payload) => {
    try {
      // Ensure agentId is set
      if (!payload.agentId) {
        payload.agentId = user?.id;
      }
      
      // Save attempt to API
      await taskApi.saveAttempt(payload);
      message.success('Call attempt saved successfully!');
      await fetchTasks(); // Refresh list
    } catch (error) {
      console.error('Error saving attempt:', error);
      message.error('Failed to save call attempt');
    }
    setDrawerOpen(false);
    setSelectedTask(null);
  };



  const columns = [
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
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 130,
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const info = statusMap[status] || { color: 'default', text: status };
        return <Badge color={info.color} text={info.text} />;
      },
    },
    {
      title: 'Attempts',
      dataIndex: 'attempts',
      key: 'attempts',
      width: 90,
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="primary"
          icon={<PhoneOutlined />}
          size="small"
          onClick={() => handleCall(record)}
          disabled={record.status === 'CLOSED' || record.status === 'CONFIRMED'}
          loading={loading}
        >
          Call
        </Button>
      ),
    },
  ];

  // ✅ Calculate total tasks to do today
  const totalTasksToday = tasks.filter(t => t.status !== 'CONFIRMED' && t.status !== 'CLOSED').length;
  const completedToday = tasks.filter(t => t.status === 'CONFIRMED').length;



  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      width: '100%',
      padding: 0,
    }}>
      {/* Header - Fixed at top */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        flexShrink: 0,
      }}>
       <h2 style={{ margin: 0 }}>My Queue</h2>
        <Button onClick={fetchTasks} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* ✅ Call Stats Cards - Shows agent's daily call count */}
      <Row gutter={16} style={{ marginBottom: 16, flexShrink: 0 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="📞 Total Calls Today"
              value={callStats.todayCalls}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="✅ Completed Today"
              value={callStats.completedToday}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${totalTasksToday + completedToday}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="⏳ Pending"
              value={totalTasksToday}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="⚠️ Exceptions"
              value={callStats.exceptionsToday}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>


      {/* Filter Bar - Fixed */}
      <div style={{ 
        flexShrink: 0,
        marginBottom: 16,
      }}>
        <Space wrap>
          <Select defaultValue="all" style={{ width: 150 }} onChange={(value) => setFilters({ ...filters, type: value })}
          >
            <Option value="all">All Types</Option>
            <Option value="DISBURSEMENT">Disbursement</Option>
            <Option value="DEPOSIT">Deposit</Option>
          </Select>
          <Select defaultValue="active" style={{ width: 150 }} onChange={(value) => setFilters({ ...filters, status: value })}>

            <Option value="active">Active</Option>
            <Option value="all">All Status</Option>
          </Select>
          <Input
            placeholder="Search Loan ID / Name"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
          />
        </Space>
      </div>

      {/* ✅ Table - Takes ALL remaining space */}
      <div style={{ 
        flex: 1, 
        minHeight: 0,
        width: '100%',
      }}>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
           loading={loading}
          pagination={{ pageSize: 10 }}
          style={{ 
            height: '100%',
            width: '100%',
          }}
          scroll={{ 
            x: 'max-content',
            y: 'calc(100% - 70px)', // Leaves room for pagination
          }}
        />
      </div>

      <CallExecutionDrawer
        key={selectedTask?.id}
        open={drawerOpen}
        task={selectedTask}
        onClose={handleDrawerClose}
        onSave={handleSaveAttempt}
      />
    </div>
  );
};

export default QueueList;