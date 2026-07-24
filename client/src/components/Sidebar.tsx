import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const NAV_ITEMS_BY_ROLE: Record<UserRole, Array<{ path: string; label: string; icon: string }>> = {
  [UserRole.SUPER_ADMIN]: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/programs', label: 'Programs', icon: '🎓' },
    { path: '/applications', label: 'Applications', icon: '📝' },
    { path: '/scholars', label: 'Scholars', icon: '👥' },
    { path: '/document-requirements', label: 'Documents', icon: '📄' },
    { path: '/reports', label: 'Reports', icon: '📋' },
    { path: '/users', label: 'Users', icon: '🔐' },
    { path: '/deletion-report', label: 'Deletion Report', icon: '🗑️' },
    { path: '/announcements', label: 'Announcements', icon: '📢' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' }
  ],
  [UserRole.ADMIN]: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/programs', label: 'Programs', icon: '🎓' },
    { path: '/applications', label: 'Applications', icon: '📝' },
    { path: '/scholars', label: 'Scholars', icon: '👥' },
    { path: '/document-requirements', label: 'Documents', icon: '📄' },
    { path: '/reports', label: 'Reports', icon: '📋' },
    { path: '/users', label: 'Users', icon: '🔐' },
    { path: '/deletion-report', label: 'Deletion Report', icon: '🗑️' },
    { path: '/announcements', label: 'Announcements', icon: '📢' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' }
  ],
  [UserRole.VIEWER]: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/programs', label: 'Programs', icon: '🎓' },
    { path: '/applications', label: 'Applications', icon: '📝' },
    { path: '/scholars', label: 'Scholars', icon: '👥' },
    { path: '/document-requirements', label: 'Documents', icon: '📄' },
    { path: '/reports', label: 'Reports', icon: '📋' },
    { path: '/users', label: 'Users', icon: '🔐' },
    { path: '/announcements', label: 'Announcements', icon: '📢' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' }
  ],
  [UserRole.APPLICANT]: [
    { path: '/profile', label: 'My Profile', icon: '🧾' },
    { path: '/my-application', label: 'My Application', icon: '📝' },
    { path: '/programs', label: 'Programs', icon: '🎓' },
    { path: '/announcements', label: 'Announcements', icon: '📢' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' }
  ],
  [UserRole.GUEST]: []
};

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Only a Super Admin or an Admin the Super Admin flagged isDeletionReviewer
  // sees the Deletion Report link — everyone else would just hit a 403.
  const canSeeDeletionReport = user?.role === UserRole.SUPER_ADMIN || (user?.role === UserRole.ADMIN && user.isDeletionReviewer);
  const navItems = user
    ? NAV_ITEMS_BY_ROLE[user.role].filter((item) => item.path !== '/deletion-report' || canSeeDeletionReport)
    : [];

  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login');
  };

  return (
    <>
      <button
        className="sidebar-toggle"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {isOpen && <div className="sidebar-overlay" onClick={closeMenu} />}

      <aside className={`app-sidebar${isOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <span style={{ fontSize: '1.5rem' }}>✨</span>
          <span>ScholarshipHub</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <strong>
              {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
            </strong>
          </div>
          <div style={{ opacity: 0.8, fontSize: '0.8rem', marginBottom: '0.75rem' }}>
            {user?.role === UserRole.APPLICANT
              ? 'Student'
              : user?.role === UserRole.ADMIN
                ? 'Administrator'
                : user?.role === UserRole.VIEWER
                  ? 'Viewer (Read Only)'
                  : user?.role}
          </div>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
