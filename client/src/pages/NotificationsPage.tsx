import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Notification, UserRole } from '../types';

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
  const { user } = useAuth();
  const isApplicant = user?.role === UserRole.APPLICANT;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

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

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError('');
    try {
      await apiService.deleteNotification(id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    setError('');
    try {
      await apiService.deleteAllNotifications();
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete notifications');
    } finally {
      setDeletingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Notifications</div>
        {notifications.length > 0 && (
          <div className="navbar-actions" style={{ display: 'flex', gap: '0.5rem' }}>
            {unreadCount > 0 && (
              <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
            <button
              className="btn btn-outline btn-sm"
              style={{ color: '#DC2626', borderColor: '#DC2626' }}
              disabled={deletingAll}
              onClick={handleDeleteAll}
            >
              {deletingAll ? 'Deleting...' : 'Delete All'}
            </button>
          </div>
        )}
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Notifications</h1>
          <p>{unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}</p>
        </div>

        {isApplicant && (
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              color: '#92400E',
              fontSize: '0.85rem'
            }}
          >
            Notifications are automatically removed 2 days after they arrive — save anything important elsewhere.
          </div>
        )}

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
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    {!notification.isRead && (
                      <button className="btn btn-outline btn-sm" onClick={() => handleMarkRead(notification.id)}>
                        Mark as read
                      </button>
                    )}
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: '#DC2626', borderColor: '#DC2626' }}
                      disabled={deletingId === notification.id}
                      onClick={() => handleDelete(notification.id)}
                    >
                      {deletingId === notification.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
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
