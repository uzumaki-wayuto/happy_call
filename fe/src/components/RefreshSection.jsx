// src/components/common/RefreshSection.jsx
import { useState, useEffect } from 'react';
import { RefreshButton, AutoRefreshIndicator } from './RefreshButton';
import { useAnalytics } from '../../hooks/useAnalytics';

export const RefreshSection = ({ 
  children, 
  onRefresh, 
  refreshInterval = 30000, // 30 seconds
  autoRefresh = true,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => {
    return new Date().toLocaleTimeString();
  });
  const { trackEvent } = useAnalytics();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
      setLastUpdated(new Date().toLocaleTimeString());
      trackEvent('Section_Refreshed', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(handleRefresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <AutoRefreshIndicator 
          isRefreshing={isRefreshing} 
          lastUpdated={lastUpdated} 
        />
        <RefreshButton 
          onRefresh={handleRefresh} 
          loading={isRefreshing} 
        />
      </div>
      {children}
    </div>
  );
};