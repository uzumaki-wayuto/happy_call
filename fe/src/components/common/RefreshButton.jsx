// src/components/common/RefreshButton.jsx
import { useState } from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useAnalytics } from '../../hooks/useAnalytics';

export const RefreshButton = ({ onRefresh, loading, label = 'Refresh' }) => {
  const [isRotating, setIsRotating] = useState(false);
  const { trackEvent } = useAnalytics();

  const handleRefresh = async () => {
    setIsRotating(true);
    trackEvent('Refresh_Clicked', { 
      page: window.location.pathname,
      timestamp: new Date().toISOString()
    });
    
    try {
      await onRefresh?.();
    } finally {
      // Keep rotation for a moment after refresh completes
      setTimeout(() => setIsRotating(false), 500);
    }
  };

  return (
    <Button
      icon={<ReloadOutlined />}
      onClick={handleRefresh}
      loading={loading}
      style={{
        transition: 'all 0.3s ease',
      }}
    >
      <span style={{ 
        display: 'inline-block',
        animation: isRotating ? 'spin 0.6s ease-in-out' : 'none',
      }}>
        {label}
      </span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Button>
  );
};

// Automatic refresh indicator
export const AutoRefreshIndicator = ({ isRefreshing, lastUpdated }) => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 8, 
      fontSize: 12, 
      color: '#888',
      animation: isRefreshing ? 'pulse 0.5s ease-in-out' : 'none',
    }}>
      <span style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: isRefreshing ? '#52c41a' : '#d9d9d9',
        transition: 'background 0.3s ease',
      }} />
      <span>
        {isRefreshing ? 'Updating...' : `Last updated: ${lastUpdated}`}
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};