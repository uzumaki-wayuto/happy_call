// fe/src/components/Sidebar.jsx
import { useState, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMenuItems } from '../config/menuConfig';
import { useAuth } from '../hooks/useAuth';

const { Sider } = Layout;

const Sidebar = ({ collapsed, onCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [openKeys, setOpenKeys] = useState([]);

  const menuItems = getMenuItems(user?.role);

  useEffect(() => {
    // Find the selected key based on current path
    const findSelectedKey = (items) => {
      for (const item of items) {
        if (item.path && location.pathname === item.path) {
          return [item.key];
        }
        if (item.children) {
          const childKey = findSelectedKey(item.children);
          if (childKey) {
            // Set open keys to expand parent
            setOpenKeys(prev => [...prev, item.key]);
            return childKey;
          }
        }
      }
      return [];
    };

    const keys = findSelectedKey(menuItems);
    setSelectedKeys(keys);
  }, [location.pathname, menuItems]);

  const handleMenuClick = ({ key }) => {
    // Find the path for the clicked key
    const findPath = (items) => {
      for (const item of items) {
        if (item.key === key && item.path) {
          return item.path;
        }
        if (item.children) {
          const childPath = findPath(item.children);
          if (childPath) return childPath;
        }
      }
      return null;
    };

    const path = findPath(menuItems);
    if (path) {
      navigate(path);
    }
  };

  const handleOpenChange = (keys) => {
    setOpenKeys(keys);
  };

  return (
    <Sider 
      collapsible 
      collapsed={collapsed} 
      onCollapse={onCollapse}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      <div style={{ 
        height: 64, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        fontSize: collapsed ? 16 : 20,
        fontWeight: 'bold',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {collapsed ? 'HC' : 'Happy Call'}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        onClick={handleMenuClick}
        items={menuItems}
        style={{ borderRight: 'none' }}
      />
    </Sider>
  );
};

export default Sidebar;