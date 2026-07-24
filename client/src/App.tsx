import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProgramPage from './pages/ProgramPage';
import ApplicationReviewPage from './pages/ApplicationReviewPage';
import MyApplicationPage from './pages/MyApplicationPage';
import ProfilePage from './pages/ProfilePage';
import ScholarManagementPage from './pages/ScholarManagementPage';
import ScholarDetailPage from './pages/ScholarDetailPage';
import DocumentRequirementsPage from './pages/DocumentRequirementsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import UserManagementPage from './pages/UserManagementPage';
import DeletionReportPage from './pages/DeletionReportPage';
import Sidebar from './components/Sidebar';
import { UserRole } from './types';
import './styles.css';

const SIDEBAR_PATHS = [
  '/dashboard',
  '/programs',
  '/applications',
  '/my-application',
  '/profile',
  '/scholars',
  '/document-requirements',
  '/announcements',
  '/notifications',
  '/reports',
  '/users',
  '/deletion-report'
];

function AppLayout() {
  const location = useLocation();
  const showSidebar = SIDEBAR_PATHS.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  return (
    <div className={showSidebar ? 'app-layout' : ''}>
      {showSidebar && <Sidebar />}
      <div className={showSidebar ? 'app-main' : 'page-scroll'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER]}>
                <ApplicationReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-application"
            element={
              <ProtectedRoute allowedRoles={[UserRole.APPLICANT]}>
                <MyApplicationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={[UserRole.APPLICANT]}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/programs"
            element={
              <ProtectedRoute>
                <ProgramPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scholars"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER]}>
                <ScholarManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scholars/:id"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER]}>
                <ScholarDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/document-requirements"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER]}>
                <DocumentRequirementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER]}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deletion-report"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <DeletionReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                <AnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    // BASE_URL mirrors vite.config.ts's `base` — required so routes
    // resolve correctly under GitHub Pages' /scholarship-management-system/
    // subpath instead of assuming the app is served from the domain root.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
