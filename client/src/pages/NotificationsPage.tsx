import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Notification } from '../types';

function formatDateTime(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const result = await apiService.getNotifications();
      setNotifications(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await apiService.markNotificationAsRead(id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update notifications');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Notifications</div>
        {unreadCount > 0 && (
          <div className="navbar-actions">
            <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          </div>
        )}
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Notifications</h1>
          <p>{unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}</p>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              color: '#DC2626'
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>No notifications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="card"
                style={{
                  borderLeft: notification.isRead ? undefined : '3px solid #8B5CF6',
                  opacity: notification.isRead ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div>
                    <strong>{notification.title}</strong>
                    <p style={{ margin: '0.35rem 0', color: '#374151' }}>{notification.message}</p>
                    <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{formatDateTime(notification.createdAt)}</span>
                    {notification.actionUrl && (
                      <>
                        {' · '}
                        <Link to={notification.actionUrl} style={{ fontSize: '0.8rem' }}>
                          View
                        </Link>
                      </>
                    )}
                  </div>
                  {!notification.isRead && (
                    <button className="btn btn-outline btn-sm" onClick={() => handleMarkRead(notification.id)}>
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
