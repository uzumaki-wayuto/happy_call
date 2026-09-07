// src/config/menuConfig.js
import {
  DashboardOutlined,
  PhoneOutlined,
  HistoryOutlined,
  CalendarOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  UploadOutlined,
  FlagOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  SolutionOutlined,
} from '@ant-design/icons';

export const MENU_ITEMS = {
  // 🟢 AGENT – 6 items (no admin/supervisor stuff)
  AGENT: [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: 'queue', label: 'My Queue', icon: <PhoneOutlined /> },
    { key: 'history', label: 'Call History', icon: <HistoryOutlined /> },
    { key: 'my-results', label: 'My Results', icon: <BarChartOutlined /> },
    { key: 'callbacks', label: 'Callbacks', icon: <CalendarOutlined /> },
    { key: 'settings', label: 'Settings', icon: <SettingOutlined /> },
  ],
  // ✅ Alias for VERIFIER (same as AGENT)
  VERIFIER: [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: 'queue', label: 'My Queue', icon: <PhoneOutlined /> },
    { key: 'history', label: 'Call History', icon: <HistoryOutlined /> },
    { key: 'my-results', label: 'My Results', icon: <BarChartOutlined /> },
    { key: 'callbacks', label: 'Callbacks', icon: <CalendarOutlined /> },
    { key: 'settings', label: 'Settings', icon: <SettingOutlined /> },
  ],

  // 🟡 SUPERVISOR – 8 items (monitoring, exceptions, reports)
  SUPERVISOR: [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: 'assignment', label: 'Agent Assignment', icon: <SolutionOutlined /> },
    { key: 'campaigns', label: 'Campaigns', icon: <FlagOutlined /> },
    { key: 'agents', label: 'Agent Performance', icon: <UserOutlined /> },
    { key: 'exceptions', label: 'Exceptions', icon: <ExclamationCircleOutlined /> },
    { key: 'callbacks', label: 'Callback Mgmt', icon: <CalendarOutlined /> },
    { key: 'reports', label: 'Reports', icon: <BarChartOutlined /> },
    { key: 'settings', label: 'Settings', icon: <SettingOutlined /> },
  ],

  // 🔴 ADMIN – 7 items (core admin features only)
  ADMIN: [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: 'assignment', label: 'Agent Assignment', icon: <SolutionOutlined /> },
    { key: 'users', label: 'User Management', icon: <UserOutlined /> },
    { key: 'upload', label: 'Upload List', icon: <UploadOutlined /> },
    { key: 'campaigns', label: 'Campaigns', icon: <FlagOutlined /> },
    { key: 'reports', label: 'Reports', icon: <BarChartOutlined /> },
    { key: 'settings', label: 'System Settings', icon: <SettingOutlined /> },
  ],
};

// For logout, we'll handle it separately in the layout.
