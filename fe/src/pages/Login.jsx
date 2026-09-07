// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Checkbox, Typography, Select, message, Modal, Alert } from 'antd';
import { UserOutlined, LockOutlined, SmileOutlined, 
  MailOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext'; 
import ParticleBackground from '../components/ParticleBackground';
import AnimatedLogo from '../components/AnimatedLogo';
import { LoginSkeleton } from '../components/common/LoadingSkeleton';
import { authApi } from '../api/client';

const { Title, Text } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotForm] = Form.useForm();
  const [isForgotLoading, setIsForgotLoading] = useState(false);

// Simulate page load
  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Show loading skeleton while page loads
  if (isPageLoading) {
    return <LoginSkeleton />;
  }


const onFinish = async (values) => {
    setLoading(true);
    try {
        const { username, password, role } = values;
        const response = await authApi.login({ username, password });
        const { token, user } = response.data;
        
        // Store token
        localStorage.setItem('token', token);
        
        // Login user
        login(user);
        
        message.success(`Welcome ${user.fullName || user.full_name || 'User'}!`);
        
      // Check role and redirect
        const userRole = user.role || role;
        if (userRole === ROLES.ADMIN) {
            navigate('/admin/dashboard');
        } else {
            navigate('/dashboard');
        }
    } catch (error) {
        console.error('Login error:', error);
        message.error(error.response?.data?.error || 'Login failed');
    } finally {
        setLoading(false);
    }
};

  const handleForgotPassword = async (values) => {
    setIsForgotLoading(true);
    // Simulate API call
    setTimeout(() => {
      message.success('Password reset link has been sent to your email.');
      setForgotPasswordVisible(false);
      forgotForm.resetFields();
      setIsForgotLoading(false);
    }, 1500);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Animated Particles Background */}
      <ParticleBackground />

      {/* Login Card - with entrance animation */}
{/* Login Card - with entrance animation */}
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
        {/* Animated Logo */}
        <AnimatedLogo />

        {/* Demo Credentials Alert */}
        <Alert
          message="Demo Credentials"
          description={
            <div style={{ fontSize: 12 }}>
              <div><strong>Supervisor:</strong> supervisor / sup123</div>
              <div><strong>Agent:</strong> agent1 / agent123</div>
              <div style={{ marginTop: 4, color: '#1890ff' }}>
                👤 <strong>Admin:</strong> <a href="/admin/login">Click here for Admin Login</a>
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
          icon={<MailOutlined />}
        />

      <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="username"
            label="User ID"
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
            <Button
              type="link"
              onClick={() => setForgotPasswordVisible(true)}
              style={{ padding: 0, fontSize: 14 }}
            >
              Forgot password?
            </Button>
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
              }}
              className="login-btn"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

         <div style={{ textAlign: 'center', marginTop: 16, color: '#aaa', fontSize: 12 }}>
          <span>Supervisor / Agent Portal</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <a href="/admin/login" style={{ color: '#1890ff' }}>Admin Login</a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8, color: '#aaa', fontSize: 12 }}>
          © 2025 MFL All rights reserved.
        </div>

        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(40px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4) !important;
          }

          .login-btn:active {
            transform: scale(0.98);
          }
        `}</style>

      </Card>

      {/* Forgot Password Modal */}
      <Modal
        title="Reset Password"
        open={forgotPasswordVisible}
        onCancel={() => {
          setForgotPasswordVisible(false);
          forgotForm.resetFields();
        }}
        footer={null}
        width={420}
        centered
        style={{ borderRadius: 12 }}
      >
        <Form
          form={forgotForm}
          layout="vertical"
          onFinish={handleForgotPassword}
          style={{ marginTop: 16 }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Enter your email"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => {
              setForgotPasswordVisible(false);
              forgotForm.resetFields();
            }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isForgotLoading}
              style={{ borderRadius: 8 }}
            >
              Send Reset Link
            </Button>
          </div>
        </Form>
      </Modal>

    </div>
  );
};

export default Login;