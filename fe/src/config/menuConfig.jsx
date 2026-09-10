// src/config/menuConfig.js
import {
  DashboardOutlined,
  FolderOutlined,
  FileTextOutlined,
  ExceptionOutlined,
  ProjectOutlined,
  TagsOutlined,
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
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined />,
      path: '/agent/dashboard',
    },
    { key: 'queue', label: 'My Queue', icon: <PhoneOutlined /> },
    { key: 'history', label: 'Call History', icon: <HistoryOutlined /> },
    { key: 'my-results', label: 'My Results', icon: <BarChartOutlined /> },
    { key: 'callbacks', label: 'Callbacks', icon: <CalendarOutlined /> },
    { key: 'settings', label: 'Settings', icon: <SettingOutlined /> },
  ],
  // ✅ Alias for VERIFIER (same as AGENT)
  VERIFIER: [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined />,
      path: '/agent/dashboard',
    },
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
    { key: 'agents', label: 'Agent Performance', icon: <UserOutlined /> },
    { key: 'campaigns', label: 'Campaigns', icon: <FlagOutlined />,
      children: [
        {
          key: 'campaign-list',
          label: 'Campaign List',
          path: '/supervisor/campaigns',
        },
        {
          key: 'campaign-upload',
          label: 'Loan Data Upload',
          path: '/supervisor/upload',
        },
        {
          key: 'campaign-assignment', // NEW
          icon: <TagsOutlined />,
          label: 'Campaign Assignment',
          path: '/supervisor/campaign-assignment',
        },
      ],
    },
    { key: 'exceptions', label: 'Exceptions', icon: <ExceptionOutlined />,
      path: '/supervisor/exceptions',
    },
    { key: 'callbacks', label: 'Callback Mgmt', icon: <CalendarOutlined /> },
    { key: 'reports', label: 'Reports', icon: <BarChartOutlined />,
      path: '/supervisor/reports',
    },
    { key: 'settings', label: 'Settings', icon: <SettingOutlined /> },
    {
      key: 'tasks',
      icon: <FileTextOutlined />,
      label: 'Tasks',
      children: [
        {
          key: 'task-list',
          label: 'Task List',
          path: '/supervisor/tasks',
        },
        {
          key: 'task-assignment',
          label: 'Task Assignment',
          path: '/supervisor/task-assignment',
        },
      ],
    },
     {
      key: 'pbx',
      icon: <PhoneOutlined />,
      label: 'PBX Management',
      path: '/supervisor/pbx',
    },
  ],

  // 🔴 ADMIN – 7 items (core admin features only)
  ADMIN: [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined />, path: '/admin/dashboard', },
    { key: 'upload', label: 'Loan Data Upload', icon: <UploadOutlined />, path: '/admin/upload' },
    { key: 'assignment', label: 'Agent Assignment', icon: <SolutionOutlined /> },
    { key: 'users', label: 'User Management', icon: <UserOutlined />,  path: '/admin/users', },
    { key: 'campaigns', label: 'Campaigns', icon: <FolderOutlined />, children: [
        {
          key: 'campaign-list',
          label: 'Campaign List',
          path: '/admin/campaigns',
          icon: <UploadOutlined />,
        },
        {
          key: 'campaign-assignment', // NEW
          icon: <TagsOutlined />,
          label: 'Campaign Assignment',
          path: '/admin/campaign-assignment',
        },
      ],
    },
    {
      key: 'tasks',
      icon: <FileTextOutlined />,
      label: 'Tasks',
      children: [
        {
          key: 'task-list',
          label: 'Task List',
          path: '/admin/tasks',
        },
        {
          key: 'task-assignment',
          label: 'Task Assignment',
          path: '/admin/task-assignment',
        },
      ],
    },
    { key: 'reports', label: 'Reports', icon: <BarChartOutlined />,  path: '/admin/reports', },
    { key: 'settings', label: 'System Settings', icon: <SettingOutlined />, path: '/admin/settings', },
    {
      key: 'exceptions',
      icon: <ExceptionOutlined />,
      label: 'Exceptions',
      path: '/admin/exceptions',
    },
    {
      key: 'pbx',
      icon: <PhoneOutlined />,
      label: 'PBX Management',
      path: '/admin/pbx',
    },
  ],
};

// For logout, we'll handle it separately in the layout.
// Helper function to get menu items based on role
export const getMenuItems = (role) => {
 return MENU_ITEMS[role?.toUpperCase()] || MENU_ITEMS.AGENT;
};

// Helper function to get flattened menu paths
export const getMenuPaths = (role) => {
  const items = getMenuItems(role);
  const paths = [];
  
  const flatten = (menuItems) => {
    menuItems.forEach(item => {
      if (item.path) {
        paths.push(item.path);
      }
      if (item.children) {
        flatten(item.children);
      }
    });
  };
  
  flatten(items);
  return paths;
};