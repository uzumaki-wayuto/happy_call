// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { AuthProvider, ROLES, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';

// Lazy load pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SupervisorDashboard = lazy(() => import('./pages/SupervisorDashboard'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const QueueList = lazy(() => import('./pages/QueueList'));
const CallHistory = lazy(() => import('./pages/CallHistory'));
const MyResults = lazy(() => import('./pages/MyResults'));
const Callbacks = lazy(() => import('./pages/Callbacks'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignAssignment = lazy(() => import('./pages/CampaignAssignment'));
const AgentPerformance = lazy(() => import('./pages/AgentPerformance'));
const Exceptions = lazy(() => import('./pages/Exceptions'));
const Reports = lazy(() => import('./pages/Reports'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const TargetListUpload = lazy(() => import('./pages/TargetListUpload'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const AgentAssignment = lazy(() => import('./pages/AgentAssignment'));
const AgentAssignmentDashboard = lazy(() => import('./pages/AgentAssignmentDashboard'));
const PbxManagement = lazy(() => import('./pages/PbxManagement'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" tip="Loading..." />
  </div>
);

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
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* ===== PUBLIC ===== */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin/" element={<AdminLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* ===== ADMIN PORTAL ===== */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><AdminDashboard /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><UserManagement /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/upload" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><TargetListUpload /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/campaigns" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><Campaigns /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/campaign-assignment" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><CampaignAssignment /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/tasks" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><AgentAssignmentDashboard /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/task-assignment" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><AgentAssignment /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/assignment" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <Navigate to="/admin/task-assignment" replace />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><Reports /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/exceptions" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><Exceptions /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><SystemSettings /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/pbx" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout><PbxManagement /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            } />

            {/* ===== SHARED (SUPERVISOR + AGENT) ===== */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR, ROLES.AGENT]}>
                <MainLayout><DashboardWrapper /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/queue" element={
              <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                <MainLayout><QueueList /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                <MainLayout><CallHistory /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/my-results" element={
              <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                <MainLayout><MyResults /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/callbacks" element={
              <ProtectedRoute allowedRoles={[ROLES.AGENT, ROLES.SUPERVISOR]}>
                <MainLayout><Callbacks /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR, ROLES.AGENT]}>
                <MainLayout><Reports /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR, ROLES.AGENT]}>
                <MainLayout><SystemSettings /></MainLayout>
              </ProtectedRoute>
            } />

            {/* ===== SUPERVISOR PORTAL ===== */}
            <Route path="/supervisor/tasks" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <MainLayout><AgentAssignmentDashboard /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/supervisor/task-assignment" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <MainLayout><AgentAssignment /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/supervisor/assignment" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <Navigate to="/supervisor/task-assignment" replace />
              </ProtectedRoute>
            } />
            <Route path="/supervisor/exceptions" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <MainLayout><Exceptions /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/supervisor/campaigns" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <MainLayout><Campaigns /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/supervisor/campaign-assignment" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <MainLayout><CampaignAssignment /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/agents" element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]}>
                <MainLayout><AgentPerformance /></MainLayout>
              </ProtectedRoute>
            } />

            {/* ===== CATCH-ALL ===== */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;