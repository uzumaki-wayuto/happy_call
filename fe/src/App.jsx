// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { AuthProvider, ROLES, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin'

// Lazy load pages with loading indicator
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
  }}>
    <Spin size="large" tip="Loading..." />
  </div>
);

const LazyRoute = ({ children }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
);

// Lazy load all pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SupervisorDashboard = lazy(() => import('./pages/SupervisorDashboard'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const QueueList = lazy(() => import('./pages/QueueList'));
const CallHistory = lazy(() => import('./pages/CallHistory'));
const MyResults = lazy(() => import('./pages/MyResults'));
const Callbacks = lazy(() => import('./pages/Callbacks'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const AgentPerformance = lazy(() => import('./pages/AgentPerformance'));
const Exceptions = lazy(() => import('./pages/Exceptions'));
const Reports = lazy(() => import('./pages/Reports'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const TargetListUpload = lazy(() => import('./pages/TargetListUpload'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const AgentAssignment = lazy(() => import('./pages/AgentAssignment'));
const AgentAssignmentDashboard = lazy(() => import('./pages/AgentAssignmentDashboard'));

// Wrapper to show correct dashboard based on role
const DashboardWrapper = () => {
  const { role } = useAuth();
  if (role === ROLES.ADMIN) return <AdminDashboard />;
  if (role === ROLES.SUPERVISOR) return <SupervisorDashboard />;
  return <AgentDashboard />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ===== PUBLIC ROUTES ===== */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} /> {/* ✅ Admin login route */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ===== ADMIN PORTAL (/admin/*) ===== */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout>
                  <AdminDashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout>
                  <UserManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/upload"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout>
                  <TargetListUpload />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/campaigns"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout>
                  <Campaigns />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          // Add route for admin/supervisor
<Route
    path="/admin/assignment"
    element={
        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
            <MainLayout>
                <AgentAssignmentDashboard />
            </MainLayout>
        </ProtectedRoute>
    }
/>
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout>
                  <SystemSettings />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
    path="/admin/assign"
    element={
        <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <MainLayout>
                <AgentAssignment />
            </MainLayout>
        </ProtectedRoute>
    }
/>

          {/* ===== SUPERVISOR + AGENT PORTAL (root) ===== */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR, ROLES.AGENT]}>
                <MainLayout>
                  <DashboardWrapper />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/queue"
            element={
              <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                <MainLayout>
                  <QueueList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                <MainLayout>
                  <CallHistory />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-results"
            element={
              <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                <MainLayout>
                  <MyResults />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/callbacks"
            element={
              <ProtectedRoute allowedRoles={[ROLES.AGENT, ROLES.SUPERVISOR]}>
                <MainLayout>
                  <Callbacks />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <MainLayout>
                  <Campaigns />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <MainLayout>
                  <AgentPerformance />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          // Add route for admin/supervisor
<Route
    path="/admin/assignment"
    element={
        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERVISOR]}>
            <MainLayout>
                <AgentAssignmentDashboard />
            </MainLayout>
        </ProtectedRoute>
    }
/>

          <Route
            path="/exceptions"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <MainLayout>
                  <Exceptions />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR, ROLES.AGENT]}>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR, ROLES.AGENT]}>
                <MainLayout>
                  <SystemSettings />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR, ROLES.AGENT]}>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;