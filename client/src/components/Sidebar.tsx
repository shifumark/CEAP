import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { UserRole } from '../types';
import Avatar from './Avatar';
import connerSeal from '../assets/images/conner-seal.jpg';

// How often the sidebar re-checks the unread count while mounted (i.e.
// on every authenticated page) — frequent enough to notice a new
// notification within a minute without polling on every render.
const NOTIFICATION_POLL_MS = 60_000;

const NAV_ITEMS_BY_ROLE: Record<UserRole, Array<{ path: string; label: string; icon: string }>> = {
  [UserRole.SUPER_ADMIN]: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/programs', label: 'Programs', icon: '🎓' },
    { path: '/applications', label: 'Applications', icon: '📝' },
    { path: '/renewals', label: 'Renewal Requests', icon: '🔄' },
    { path: '/scholars', label: 'Scholars', icon: '👥' },
    { path: '/document-requirements', label: 'Documents', icon: '📄' },
    { path: '/reports', label: 'Reports', icon: '📋' },
    { path: '/payroll', label: 'Payroll', icon: '💰' },
    { path: '/users', label: 'Users', icon: '🔐' },
    { path: '/deletion-requests', label: 'Deletion Requests', icon: '🗑️' },
    { path: '/announcements', label: 'Announcements', icon: '📢' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/settings', label: 'Theme Settings', icon: '🎨' }
  ],
  [UserRole.ADMIN]: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/programs', label: 'Programs', icon: '🎓' },
    { path: '/applications', label: 'Applications', icon: '📝' },
    { path: '/renewals', label: 'Renewal Requests', icon: '🔄' },
    { path: '/scholars', label: 'Scholars', icon: '👥' },
    { path: '/document-requirements', label: 'Documents', icon: '📄' },
    { path: '/reports', label: 'Reports', icon: '📋' },
    { path: '/payroll', label: 'Payroll', icon: '💰' },
    { path: '/users', label: 'Users', icon: '🔐' },
    { path: '/deletion-requests', label: 'Deletion Requests', icon: '🗑️' },
    { path: '/announcements', label: 'Announcements', icon: '📢' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/settings', label: 'Theme Settings', icon: '🎨' }
  ],
  [UserRole.VIEWER]: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/programs', label: 'Programs', icon: '🎓' },
    { path: '/applications', label: 'Applications', icon: '📝' },
    { path: '/renewals', label: 'Renewal Requests', icon: '🔄' },
    { path: '/scholars', label: 'Scholars', icon: '👥' },
    { path: '/document-requirements', label: 'Documents', icon: '📄' },
    { path: '/reports', label: 'Reports', icon: '📋' },
    { path: '/announcements', label: 'Announcements', icon: '📢' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/settings', label: 'Theme Settings', icon: '🎨' }
  ],
  [UserRole.APPLICANT]: [
    { path: '/profile', label: 'My Profile', icon: '🧾' },
    { path: '/my-application', label: 'My Application', icon: '📝' },
    { path: '/programs', label: 'Programs', icon: '🎓' },
    { path: '/announcements', label: 'Announcements', icon: '📢' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/settings', label: 'Theme Settings', icon: '🎨' }
  ],
  [UserRole.GUEST]: []
};

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadUnreadCount = () => {
      // Skip the request entirely while the tab isn't visible — a
      // backgrounded/minimized tab doesn't need a live badge, and this
      // is a meaningful chunk of every logged-in session's baseline
      // request volume (every open tab, every 60s, forever) that adds
      // up fast when many people share one IP.
      if (document.hidden) return;
      apiService
        .getNotifications()
        .then((notifications) => {
          if (!cancelled) setUnreadCount(notifications.filter((n) => !n.isRead).length);
        })
        .catch(() => {
          // Non-fatal — the badge just stays at its last known count.
        });
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, NOTIFICATION_POLL_MS);
    // Catch up immediately on return instead of waiting for the next
    // tick, so the badge isn't stale for up to a full poll interval.
    document.addEventListener('visibilitychange', loadUnreadCount);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', loadUnreadCount);
    };
  }, [user]);

  // Only a Super Admin or an Admin the Super Admin flagged isDeletionReviewer
  // sees the Deletion Requests link — everyone else would just hit a 403.
  const canSeeDeletionReport = user?.role === UserRole.SUPER_ADMIN || (user?.role === UserRole.ADMIN && user.isDeletionReviewer);
  const navItems = user
    ? NAV_ITEMS_BY_ROLE[user.role].filter((item) => item.path !== '/deletion-requests' || canSeeDeletionReport)
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
          <img src={connerSeal} alt="" width={66} height={66} style={{ borderRadius: '50%', flexShrink: 0 }} />
          <span style={{ fontSize: '2rem' }}>ECEAP</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={closeMenu}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <span>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span
                    style={{
                      background: 'var(--notify-badge)',
                      color: 'white',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                      minWidth: '1.2rem',
                      textAlign: 'center',
                      lineHeight: 1.4
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            {user && (
              <Avatar
                userId={user.id}
                hasPicture={Boolean(user.profilePictureUrl)}
                name={`${user.firstName} ${user.lastName}`}
                size={36}
              />
            )}
            <strong style={{ fontSize: '0.85rem' }}>{user ? `${user.firstName} ${user.lastName}` : 'Guest'}</strong>
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
