// src/components/common/LoadingSkeleton.jsx
import { Skeleton, Card, Row, Col, Spin } from 'antd';

export const LoginSkeleton = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    background: '#f0f2f5',
  }}>
    <Card style={{ width: 420, padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Skeleton.Avatar 
          size={80} 
          active 
          shape="circle" 
          style={{ margin: '0 auto' }}
        />
        <Skeleton.Input 
          active 
          size="small" 
          style={{ width: 200, marginTop: 16 }}
        />
        <Skeleton.Input 
          active 
          size="small" 
          style={{ width: 150, marginTop: 8 }}
        />
      </div>
      <Skeleton.Input active block size="large" style={{ marginBottom: 16 }} />
      <Skeleton.Input active block size="large" style={{ marginBottom: 16 }} />
      <Skeleton.Input active block size="large" style={{ marginBottom: 16 }} />
      <Skeleton.Button active block size="large" style={{ height: 44 }} />
    </Card>
  </div>
);

export const DashboardSkeleton = () => (
  <div style={{ padding: 24 }}>
    <Skeleton.Input active style={{ width: 200, marginBottom: 24 }} />
    <Row gutter={16} style={{ marginBottom: 16 }}>
      {[1, 2, 3, 4].map((i) => (
        <Col span={6} key={i}>
          <Card>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        </Col>
      ))}
    </Row>
    <Card>
      <Skeleton active paragraph={{ rows: 6 }} />
    </Card>
  </div>
);

export const TableSkeleton = () => (
  <Card>
    <Skeleton active paragraph={{ rows: 8 }} />
  </Card>
);

export const KPISkeleton = () => (
  <Row gutter={16} style={{ marginBottom: 16 }}>
    {[1, 2, 3, 4].map((i) => (
      <Col span={6} key={i}>
        <Card>
          <Skeleton active paragraph={{ rows: 1 }} />
        </Card>
      </Col>
    ))}
  </Row>
);

// Loading overlay for buttons/actions
export const LoadingOverlay = ({ loading, children }) => {
  if (!loading) return children;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.7)',
        borderRadius: 8,
      }}>
        <Spin size="large" />
      </div>
    </div>
  );
};