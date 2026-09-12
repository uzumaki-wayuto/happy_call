// fe/src/pages/UserManagement.jsx
import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Tag,
  Modal,
  Form,
  Select,
  Radio,
  Switch,
  message,
  Typography,
  Spin,
  Alert,
  Checkbox,
  Divider,
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { userApi } from '../api/userApi';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // ✅ Password change state
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ============ FETCH USERS ============
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userApi.getUsers({ search: searchText });

      let usersData = [];
      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        usersData = response.data.users;
      } else if (Array.isArray(response)) {
        usersData = response;
      } else if (response.data && typeof response.data === 'object') {
        usersData = Object.values(response.data).filter(
          (item) => typeof item === 'object' && item.id
        );
      }

      setUsers(usersData);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setError(error.message || 'Failed to load users');
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchText]);

  // ============ RESET PASSWORD STATE ============
  const resetPasswordState = () => {
    setChangePassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  // ============ MODAL OPEN HANDLERS ============
  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'VERIFIER', status: true });
    resetPasswordState();
    setIsModalOpen(true);
  };

  const handleEditUser = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      fullName: record.fullName,
      username: record.username,
      role: record.role,
      verificationType: record.verificationType,
      pbxExtension: record.pbxExtension,
      status: record.status === 'ACTIVE',
    });
    resetPasswordState();
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    resetPasswordState();
  };

  // ============ DELETE USER ============
  const handleDeleteUser = (record) => {
    Modal.confirm({
      title: 'Confirm Deactivation',
      content: `Are you sure you want to deactivate user "${record.fullName}"?`,
      okText: 'Yes, Deactivate',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await userApi.deactivateUser(record.id);
          message.success(`User "${record.fullName}" deactivated.`);
          fetchUsers();
        } catch (error) {
          console.error('Error deactivating user:', error);
          message.error('Failed to deactivate user');
        }
      },
    });
  };

  // ============ PASSWORD VALIDATION ============
  const validatePassword = () => {
    if (!changePassword) return true;

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // ============ SUBMIT ============
  const handleModalSubmit = async (values) => {
    // Validate password if enabled
    if (!validatePassword()) {
      return;
    }

    try {
      const { fullName, username, role, verificationType, pbxExtension, status } = values;

      if (editingUser) {
        // 1. Update user info
        await userApi.updateUser(editingUser.id, {
          fullName,
          role,
          verificationType: role === 'VERIFIER' ? verificationType : null,
          pbxExtension,
          status: status ? 'ACTIVE' : 'INACTIVE',
        });

        // 2. Change password if checkbox was checked
        if (changePassword) {
          try {
            await userApi.changePassword(editingUser.id, newPassword);
            message.success(`User "${fullName}" updated and password changed.`);
          } catch (pwError) {
            console.error('Password change failed:', pwError);
            const detail =
              pwError.response?.data?.details ||
              pwError.response?.data?.error ||
              'Unknown error';
            message.error(`User updated, but password change failed: ${detail}`);
            // Don't close modal - let admin retry
            return;
          }
        } else {
          message.success(`User "${fullName}" updated successfully!`);
        }
      } else {
        // Create new user (default password)
        const password = newPassword || 'changeme123';
        await userApi.createUser({
          username,
          password,
          fullName,
          role,
          verificationType: role === 'VERIFIER' ? verificationType : null,
          pbxExtension,
        });
        message.success(`User "${fullName}" created successfully!`);
      }

      setIsModalOpen(false);
      form.resetFields();
      resetPasswordState();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      message.error(error.response?.data?.error || 'Failed to save user');
    }
  };

  // ============ MAPS ============
  const roleMap = {
    ADMIN: { color: 'red', text: 'Admin' },
    SUPERVISOR: { color: 'orange', text: 'Supervisor' },
    VERIFIER: { color: 'blue', text: 'Agent' },
  };

  const verificationTypeMap = {
    DISBURSEMENT: { color: 'geekblue', text: 'Disbursement' },
    DEPOSIT: { color: 'green', text: 'Deposit' },
  };

  // ============ COLUMNS ============
  const columns = [
    {
      title: 'No.',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'User ID',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 180,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 130,
      render: (role) => {
        const info = roleMap[role] || { color: 'default', text: role };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: 'Verification Type',
      dataIndex: 'verificationType',
      key: 'verificationType',
      width: 140,
      render: (type) => {
        if (!type) return <span style={{ color: '#999' }}>—</span>;
        const info = verificationTypeMap[type] || { color: 'default', text: type };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: 'PBX Extension',
      dataIndex: 'pbxExtension',
      key: 'pbxExtension',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
            size="small"
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record)}
            size="small"
            disabled={record.role === 'ADMIN' || record.id === user?.id}
          >
            {record.status === 'ACTIVE' ? 'Deactivate' : 'Delete'}
          </Button>
        </Space>
      ),
    },
  ];

  // ============ EARLY RETURNS ============
  if (loading && users.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="Loading users..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="Error Loading Users"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" type="primary" onClick={fetchUsers}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <Title level={2} style={{ margin: 0 }}>User Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
          Add User
        </Button>
      </div>

      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <Input
          placeholder="Search by User ID, Name..."
          prefix={<SearchOutlined />}
          style={{ width: 400 }}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          style={{ height: '100%' }}
          scroll={{ x: 'max-content', y: 'calc(100% - 60px)' }}
        />
      </div>

      <Modal
        title={editingUser ? 'Edit User' : 'Add New User'}
        open={isModalOpen}
        onCancel={handleModalCancel}
        width={560}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleModalSubmit}
          initialValues={{
            role: 'VERIFIER',
            status: true,
          }}
        >
          <Form.Item
            name="fullName"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: 'Please enter username' },
                { min: 4, message: 'Username must be at least 4 characters' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: 'Only letters, numbers, and underscores' },
              ]}
            >
              <Input placeholder="Enter username" />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select role">
              <Option value="ADMIN">Admin</Option>
              <Option value="SUPERVISOR">Supervisor</Option>
              <Option value="VERIFIER">Agent (Verifier)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.role !== curr.role}
          >
            {({ getFieldValue }) =>
              getFieldValue('role') === 'VERIFIER' ? (
                <Form.Item
                  name="verificationType"
                  label="Verification Type"
                  rules={[{ required: true, message: 'Please select verification type' }]}
                  extra="⚠️ Single selection only – strictly enforces Segregation of Duties (SoD)"
                >
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="DISBURSEMENT">Disbursement Verifier</Radio.Button>
                    <Radio.Button value="DEPOSIT">Deposit Verifier</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="pbxExtension"
            label="PBX Extension"
            rules={[
              { required: true, message: 'Please enter PBX extension' },
              { pattern: /^\d{4}$/, message: 'Must be a 4-digit number' },
            ]}
          >
            <Input placeholder="e.g., 2001" maxLength={4} />
          </Form.Item>

          <Form.Item name="status" label="Status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          {/* ============ PASSWORD SECTION ============ */}
          {editingUser && (
            <>
              <Divider style={{ margin: '16px 0' }}>Password</Divider>

              <Form.Item style={{ marginBottom: 12 }}>
                <Checkbox
                  checked={changePassword}
                  onChange={(e) => {
                    setChangePassword(e.target.checked);
                    if (!e.target.checked) {
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }
                  }}
                >
                  <Text strong>Change password</Text>
                </Checkbox>
              </Form.Item>

              {changePassword && (
                <>
                  <Form.Item
                    label="New Password"
                    validateStatus={passwordError && !newPassword ? 'error' : ''}
                    style={{ marginBottom: 12 }}
                  >
                    <Input.Password
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Confirm Password"
                    validateStatus={
                      passwordError && newPassword && newPassword !== confirmPassword
                        ? 'error'
                        : ''
                    }
                    help={
                      passwordError && newPassword && newPassword !== confirmPassword
                        ? 'Passwords do not match'
                        : ''
                    }
                    style={{ marginBottom: 12 }}
                  >
                    <Input.Password
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                    />
                  </Form.Item>

                  {passwordError && (
                    <Alert
                      message={passwordError}
                      type="error"
                      showIcon
                      style={{ marginBottom: 12 }}
                    />
                  )}
                </>
              )}
            </>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;