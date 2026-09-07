// src/components/common/EmptyState.jsx
import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export const EmptyState = ({
  title,
  description,
  icon,
  actionText,
  onAction
}) => (
  <div style={{
    textAlign: 'center',
    padding: 48,
    background: '#fafafa',
    borderRadius: 12,
  }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>{icon || '📋'}</div>
    <h3 style={{ color: '#333' }}>{title || 'No Data Available'}</h3>
    <p style={{ color: '#888' }}>{description || 'There is no data to display at the moment.'}</p>
    {onAction && (
      <Button type="primary" icon={<PlusOutlined />} onClick={onAction} style={{ marginTop: 12 }}>
        {actionText || 'Add New'}
      </Button>
    )}
  </div>
);