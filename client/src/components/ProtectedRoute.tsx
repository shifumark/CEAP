import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

// Where each role lands after login / when redirected off a page it can't access.
export const roleHome: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '/dashboard',
  [UserRole.ADMIN]: '/dashboard',
  [UserRole.VIEWER]: '/dashboard',
  [UserRole.APPLICANT]: '/my-application',
  [UserRole.GUEST]: '/'
};

/**
 * Redirects unauthenticated users to /login, and authenticated users whose
 * role isn't in `allowedRoles` to their own role's home page. This is a UX
 * convenience only — every ownership/role check that actually matters is
 * enforced again server-side.
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome[user.role]} replace />;
  }

  return <>{children}</>;
}
