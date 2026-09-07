// fe/src/pages/AdminLogin.jsx
import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Checkbox, Typography, message, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EyeInvisibleOutlined, EyeTwoTone, CrownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { authApi } from '../api/client';
import ParticleBackground from '../components/ParticleBackground';
import { LoginSkeleton } from '../components/common/LoadingSkeleton';

const { Title, Text } = Typography;

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isPageLoading) {
    return <LoginSkeleton />;
  }

  const onFinish = async (values) => {
    setLoading(true);
    try {
        const { username, password } = values;
        
        const response = await authApi.login({ username, password, role: ROLES.ADMIN });
        console.log('🔐 Admin login response:', response.data);
        
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        login(user);
        
        message.success(`Welcome ${user.fullName || user.full_name || 'Admin'}!`);
        navigate('/admin/dashboard');
    } catch (error) {
        console.error('Admin login error:', error);
        message.error(error.response?.data?.error || 'Login failed');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ParticleBackground />

      <Card
        style={{
          width: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          borderRadius: 16,
          position: 'relative',
          zIndex: 1,
          animation: 'slideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255,255,255,0.95)',
        }}
        bodyStyle={{ padding: 32 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            marginBottom: 12,
            boxShadow: '0 4px 20px rgba(245, 87, 108, 0.3)',
          }}>
            <CrownOutlined style={{ fontSize: 40, color: '#fff' }} />
          </div>
          <Title level={2} style={{ marginBottom: 4 }}>Admin Portal</Title>
          <Text type="secondary">Internal Control & Verification</Text>
        </div>

        <Alert
          message="Admin Access Only"
          description="This portal is restricted to system administrators."
          type="warning"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
          icon={<MailOutlined />}
        />

        <Form
          name="admin-login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="username"
            label="Admin User ID"
            rules={[{ required: true, message: 'Please input your User ID!' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Enter your user ID"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Enter your password"
              size="large"
              style={{ borderRadius: 8 }}
              iconRender={(visible) => 
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{
                height: 48,
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(245, 87, 108, 0.3)',
                transition: 'all 0.3s ease',
              }}
              className="admin-login-btn"
            >
              Sign In as Admin
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16, color: '#aaa', fontSize: 12 }}>
          <a href="/login" style={{ color: '#1890ff' }}>← Back to User Login</a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8, color: '#aaa', fontSize: 12 }}>
          © 2025 MFL All rights reserved.
        </div>
      </Card>

      <style>{`
        .admin-login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(245, 87, 108, 0.4) !important;
        }
        .admin-login-btn:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;