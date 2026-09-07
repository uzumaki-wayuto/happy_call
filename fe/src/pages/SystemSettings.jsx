// src/pages/SystemSettings.jsx
import { Card, Form, Input, Switch, Button, Divider, Select, InputNumber, Row, Col, Typography } from 'antd';
import { SaveOutlined, GlobalOutlined, PhoneOutlined, SettingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// Full Asia timezone list
const ASIA_TIMEZONES = [
  'Asia/Yangon (GMT+6:30)',
  'Asia/Bangkok (GMT+7:00)',
  'Asia/Jakarta (GMT+7:00)',
  'Asia/Ho_Chi_Minh (GMT+7:00)',
  'Asia/Singapore (GMT+8:00)',
  'Asia/Kuala_Lumpur (GMT+8:00)',
  'Asia/Manila (GMT+8:00)',
  'Asia/Shanghai (GMT+8:00)',
  'Asia/Hong_Kong (GMT+8:00)',
  'Asia/Taipei (GMT+8:00)',
  'Asia/Tokyo (GMT+9:00)',
  'Asia/Seoul (GMT+9:00)',
  'Asia/Kolkata (GMT+5:30)',
  'Asia/Colombo (GMT+5:30)',
  'Asia/Kathmandu (GMT+5:45)',
  'Asia/Dhaka (GMT+6:00)',
  'Asia/Karachi (GMT+5:00)',
  'Asia/Dubai (GMT+4:00)',
  'Asia/Riyadh (GMT+3:00)',
  'Asia/Jerusalem (GMT+2:00)',
  'Asia/Beirut (GMT+2:00)',
  'Asia/Istanbul (GMT+3:00)',
];

const SystemSettings = () => {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    console.log('Settings saved:', values);
    // In real app, send to API
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Title level={2} style={{ marginBottom: 4 }}>System Settings</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Configure system-wide preferences and telephony settings
      </Text>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Card style={{ maxWidth: 900, margin: '0 auto' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              systemName: 'Happy Call System',
              organization: 'MFI',
              timezone: 'Asia/Yangon (GMT+6:30)',
              businessHoursStart: '08:00',
              businessHoursEnd: '17:00',
              autoLogout: 30,
              clickToCall: true,
              manualCall: true,
              autoNext: false,
              smsNoAnswer: false,
              recordingEnabled: true,
              maxRetryAttempts: 3,
              retryInterval: 60,
            }}
          >
            {/* ✅ General Settings */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <SettingOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                <Title level={4} style={{ margin: 0 }}>General Settings</Title>
              </div>

              <Row gutter={[24, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="System Name"
                    name="systemName"
                    rules={[{ required: true, message: 'Please enter system name' }]}
                  >
                    <Input placeholder="Enter system name" style={{ maxWidth: 300 }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Organization"
                    name="organization"
                    rules={[{ required: true, message: 'Please enter organization name' }]}
                  >
                    <Input placeholder="Enter organization name" style={{ maxWidth: 300 }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[24, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Timezone"
                    name="timezone"
                    rules={[{ required: true, message: 'Please select timezone' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Select timezone"
                      style={{ maxWidth: 300 }}
                      optionFilterProp="children"
                    >
                      {ASIA_TIMEZONES.map((tz) => (
                        <Option key={tz} value={tz}>{tz}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Auto Logout (minutes)"
                    name="autoLogout"
                    rules={[{ required: true, message: 'Please enter auto logout time' }]}
                  >
                    <InputNumber
                      min={5}
                      max={120}
                      style={{ maxWidth: 150 }}
                      addonAfter="min"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[24, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Business Hours Start"
                    name="businessHoursStart"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="HH:MM" style={{ maxWidth: 150 }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Business Hours End"
                    name="businessHoursEnd"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="HH:MM" style={{ maxWidth: 150 }} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* ✅ Telephony Settings */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <PhoneOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                <Title level={4} style={{ margin: 0 }}>Telephony Settings</Title>
              </div>

              <Row gutter={[24, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Enable Click to Call"
                    name="clickToCall"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="On" unCheckedChildren="Off" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Enable Manual Call"
                    name="manualCall"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="On" unCheckedChildren="Off" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[24, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Auto Next after Save"
                    name="autoNext"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="On" unCheckedChildren="Off" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Enable SMS for No Answer"
                    name="smsNoAnswer"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="On" unCheckedChildren="Off" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[24, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Enable Call Recording"
                    name="recordingEnabled"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="On" unCheckedChildren="Off" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Max Retry Attempts"
                    name="maxRetryAttempts"
                  >
                    <InputNumber
                      min={1}
                      max={5}
                      style={{ maxWidth: 120 }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[24, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Retry Interval (minutes)"
                    name="retryInterval"
                  >
                    <InputNumber
                      min={15}
                      max={120}
                      style={{ maxWidth: 120 }}
                      addonAfter="min"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* ✅ Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => form.resetFields()}>Reset</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large">
                Save Settings
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SystemSettings;