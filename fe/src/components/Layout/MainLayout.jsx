// fe/src/components/Layout/MainLayout.jsx
import { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Space, Tag, Button, Avatar, Badge } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MENU_ITEMS } from '../../config/menuConfig';
import { DashboardSkeleton } from '../common/LoadingSkeleton';
import { socketService } from '../../services/socket';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, role } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pbxStatus, setPbxStatus] = useState({
    connected: false,
    activeCalls: 0,
    isReady: false,
  });

  const handlersRegistered = useRef(false);
  const statusReceivedRef = useRef(false);

  // Simulate loading state for route transitions
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // ============ PBX STATUS ============
  useEffect(() => {
    socketService.connect();

    const handleConnect = () => {
      console.log('✅ Socket connected, getting PBX status...');
      setTimeout(() => {
        socketService.getPBXStatus();
      }, 500);
    };

    const handlePBXStatus = (data) => {
      console.log('📡 PBX Status received:', data);
      setPbxStatus((prev) => {
        if (
          prev.connected === data.connected &&
          prev.activeCalls === data.activeCalls &&
          prev.isReady === true
        ) {
          return prev;
        }
        return { ...data, isReady: true };
      });
    };

    if (!handlersRegistered.current) {
      console.log('📌 Registering socket handlers...');

      if (socketService.isConnected()) {
        handleConnect();
      }

      socketService.on('connect', handleConnect);
      socketService.on('pbx:status', handlePBXStatus);

      handlersRegistered.current = true;
    }

    return () => {
      if (handlersRegistered.current) {
        console.log('🧹 Cleaning up socket handlers...');
        socketService.off('connect', handleConnect);
        socketService.off('pbx:status', handlePBXStatus);
        handlersRegistered.current = false;
        statusReceivedRef.current = false;
      }
    };
  }, []);

  // ✅ Menu items (must be computed BEFORE any early return that uses them)
  const menuItems = MENU_ITEMS[role] || [];

  // ✅ Find path in nested menu by key
  const findPath = (items, key) => {
    for (const item of items) {
      if (item.key === key && item.path) return item.path;
      if (item.children) {
        const found = findPath(item.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  const handleMenuClick = (e) => {
    if (e.key === 'logout') {
      logout();
      navigate('/login');
      return;
    }

    const path = findPath(menuItems, e.key);
    if (path) {
      navigate(path);
    } else {
      // Fallback for items without a defined path
      const prefix = role === 'ADMIN' ? '/admin' : '';
      navigate(`${prefix}/${e.key}`);
    }
  };

  // If loading, show skeleton (AFTER hooks are declared)
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Determine selected key from current path
  const currentPath = location.pathname.replace(/^\/(admin|supervisor|agent)\//, '');
  const selectedKey = currentPath || 'dashboard';

  // Role-based styling
  const roleColor = role === 'ADMIN' ? 'red' : role === 'SUPERVISOR' ? 'orange' : 'blue';
  const roleLabel = role === 'ADMIN' ? 'Admin' : role === 'SUPERVISOR' ? 'Supervisor' : 'Agent';

  const getPageTitle = () => {
    const path = location.pathname.split('/').pop() || 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
  };

  const getUserInitials = () => {
    const name = user?.fullName || 'User';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const SIDEBAR_WIDTH = 240;
  const COLLAPSED_WIDTH = 80;

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={SIDEBAR_WIDTH}
        collapsedWidth={COLLAPSED_WIDTH}
        theme="dark"
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: collapsed ? 'none' : '2px 0 12px rgba(0,0,0,0.15)',
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          style={{
            padding: '16px 12px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            overflow: 'hidden',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10,
              width: '100%',
              paddingLeft: collapsed ? 0 : 4,
              transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <SmileOutlined
              style={{
                fontSize: collapsed ? 28 : 22,
                color: '#fff',
                flexShrink: 0,
                transition: 'font-size 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                opacity: collapsed ? 0 : 1,
                maxWidth: collapsed ? 0 : '180px',
                transition: 'opacity 0.5s ease-in-out, max-width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  transition: 'font-size 0.5s ease',
                }}
              >
                Happy Call
              </span>
              <span
                style={{
                  color: '#ffc32d',
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                  marginTop: 1,
                }}
              >
                NongHyup
              </span>
            </div>
          </div>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={handleMenuClick}
          items={menuItems}
          style={{
            borderRight: 'none',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 80 : 240,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          transition: 'margin-left 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
      >
        <Header
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 64,
            flexShrink: 0,
            zIndex: 999,
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '18px',
                width: 48,
                height: 48,
                color: '#fff',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 8,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
            />
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#fff',
                letterSpacing: '0.5px',
              }}
            >
              {getPageTitle()}
            </div>
          </div>

          <Space size="middle">
            {pbxStatus.isReady && (
              <Badge
                status={pbxStatus.connected ? 'success' : 'error'}
                text={
                  <span style={{ color: '#fff', fontSize: 12, opacity: 0.9 }}>
                    PBX {pbxStatus.connected ? 'Online' : 'Offline'}
                    {pbxStatus.activeCalls > 0 && ` (${pbxStatus.activeCalls} calls)`}
                  </span>
                }
              />
            )}

            <Avatar
              style={{
                backgroundColor: roleColor,
                color: '#fff',
                cursor: 'pointer',
                border: '2px solid rgba(255,255,255,0.3)',
              }}
              icon={<UserOutlined />}
            >
              {getUserInitials()}
            </Avatar>
            <span style={{ color: '#fff', fontWeight: 500 }}>{user?.fullName || 'User'}</span>
            <Tag color={roleColor} style={{ background: 'rgba(255,255,255,0.9)', border: 'none' }}>
              {roleLabel}
            </Tag>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{ color: '#fff', fontWeight: 500 }}
            >
              Logout
            </Button>
          </Space>
        </Header>

        <Content
          style={{
            padding: 24,
            background: '#f0f2f5',
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
            width: '100%',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              minHeight: '100%',
              width: '100%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
