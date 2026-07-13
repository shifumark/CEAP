import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Announcement, AnnouncementType, UserRole } from '../types';
import Modal from '../components/Modal';

const TYPE_LABEL: Record<AnnouncementType, string> = {
  [AnnouncementType.NEWS]: 'News',
  [AnnouncementType.DEADLINE]: 'Deadline',
  [AnnouncementType.EVENT]: 'Event',
  [AnnouncementType.SCHOLARSHIP_UPDATE]: 'Scholarship Update',
  [AnnouncementType.MAINTENANCE]: 'Maintenance'
};

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const emptyForm = { title: '', content: '', announcementType: AnnouncementType.NEWS, pinned: false, imageUrl: '' };

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const result = await apiService.getAnnouncements({ pageSize: 50 });
      setAnnouncements(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      announcementType: announcement.announcementType ?? AnnouncementType.NEWS,
      pinned: announcement.pinned,
      imageUrl: announcement.imageUrl ?? ''
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await apiService.updateAnnouncement(editing.id, form);
      } else {
        await apiService.createAnnouncement(form);
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this announcement?')) return;
    setError('');
    try {
      await apiService.deleteAnnouncement(id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete announcement');
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Announcements</div>
        {isAdmin && (
          <div className="navbar-actions">
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              New Announcement
            </button>
          </div>
        )}
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Announcements</h1>
          <p>News, deadlines, and updates from the program.</p>
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
        ) : announcements.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>No announcements yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {announcements.map((announcement) => (
              <div key={announcement.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {announcement.pinned && <span className="badge badge-warning">Pinned</span>}
                      {announcement.announcementType && (
                        <span className="badge badge-secondary">{TYPE_LABEL[announcement.announcementType]}</span>
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{formatDate(announcement.publishedAt)}</span>
                    </div>
                    <h3 style={{ marginBottom: '0.5rem' }}>{announcement.title}</h3>
                    <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{announcement.content}</p>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(announcement)}>
                        Edit
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(announcement.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Announcement' : 'New Announcement'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="annTitle">Title</label>
              <input
                id="annTitle"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="annContent">Content</label>
              <textarea
                id="annContent"
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="annType">Type</label>
              <select
                id="annType"
                value={form.announcementType}
                onChange={(e) => setForm({ ...form, announcementType: e.target.value as AnnouncementType })}
              >
                {Object.values(AnnouncementType).map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                  style={{ width: 'auto', marginRight: '0.5rem' }}
                />
                Pin to top
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AnnouncementsPage;
