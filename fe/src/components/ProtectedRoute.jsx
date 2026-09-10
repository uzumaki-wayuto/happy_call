import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  
  // Map VERIFIER to AGENT for role checking
  let userRole = role;
  if (role === 'VERIFIER') {
    userRole = ROLES.AGENT;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    if (role === ROLES.ADMIN) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;