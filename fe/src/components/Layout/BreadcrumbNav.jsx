// src/components/Layout/BreadcrumbNav.jsx
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useLocation, Link } from 'react-router-dom';

export const BreadcrumbNav = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  return (
    <Breadcrumb style={{ marginBottom: 16 }}>
      <Breadcrumb.Item>
        <Link to="/dashboard">
          <HomeOutlined />
        </Link>
      </Breadcrumb.Item>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        return (
          <Breadcrumb.Item key={name}>
            {isLast ? (
              name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
            ) : (
              <Link to={routeTo}>
                {name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')}
              </Link>
            )}
          </Breadcrumb.Item>
        );
      })}
    </Breadcrumb>
  );
};