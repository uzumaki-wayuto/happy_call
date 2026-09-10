// src/pages/PbxManagement.jsx
import { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Table, Button, Typography,
  Space, Badge, Tag, message, Spin, Empty,
} from 'antd';
import {
  PhoneOutlined, ReloadOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { pbxApi } from '../api/pbxApi';

const { Title, Text } = Typography;

const PbxManagement = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ connected: false, activeCalls: 0 });
  const [calls, setCalls] = useState([]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await pbxApi.getStatus();
      const data = res.data || res || {};
      setStatus({
        connected: !!data.connected,
        activeCalls: data.activeCalls || 0,
      });
      // Active calls endpoint not implemented yet — leave empty
      setCalls(data.calls || []);
    } catch (err) {
      console.error('❌ PBX status error:', err);
      message.error('Failed to fetch PBX status');
      setStatus({ connected: false, activeCalls: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const callColumns = [
    { title: 'Call ID', dataIndex: 'callId', key: 'callId', width: 220 },
    { title: 'Agent', dataIndex: 'agentId', key: 'agentId', width: 100 },
    { title: 'Extension', dataIndex: 'agentExtension', key: 'agentExtension', width: 120 },
    { title: 'Customer', dataIndex: 'customerPhone', key: 'customerPhone', width: 160 },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      render: (s) => {
        const map = {
          initiating: 'blue', ringing: 'orange', connected: 'green',
          ended: 'default', failed: 'red',
        };
        return <Badge color={map[s] || 'default'} text={s} />;
      },
    },
    {
      title: 'Duration', dataIndex: 'duration', key: 'duration', width: 110,
      render: (sec) => {
        if (!sec) return '-';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}m ${s}s`;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>PBX Management</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchStatus} loading={loading}>
          Refresh
        </Button>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Monitor Asterisk PBX (AMI) connection and live call activity.
      </Text>

      {loading && calls.length === 0 && status.connected === false ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spin size="large" tip="Checking PBX status..." />
        </div>
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Connection Status"
                  value={status.connected ? 'Connected' : 'Disconnected'}
                  prefix={status.connected
                    ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  valueStyle={{ color: status.connected ? '#52c41a' : '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Active Calls"
                  value={status.activeCalls}
                  prefix={<PhoneOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="AMI Host"
                  value="127.0.0.1:5038"
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ fontSize: 18 }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Active Calls">
            {calls.length === 0 ? (
              <Empty description="No active calls" />
            ) : (
              <Table
                columns={callColumns}
                dataSource={calls}
                rowKey="callId"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default PbxManagement;