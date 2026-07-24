import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, UserRole, UserStatus } from '../types';
import Modal from '../components/Modal';

// An Admin or Super Admin can promote/demote between these two roles
// only — Super Admin itself is deliberately excluded from this UI
// entirely (for every viewer, including a genuine Super Admin) so there
// is no self-service path to the highest privilege level. The server
// enforces this independently — see targetVisibleToCaller in routes.ts.
const ASSIGNABLE_ROLES = [UserRole.APPLICANT, UserRole.ADMIN, UserRole.VIEWER];

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.VIEWER]: 'Viewer',
  [UserRole.APPLICANT]: 'Student',
  [UserRole.GUEST]: 'Guest'
};

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-secondary',
  suspended: 'badge-warning',
  deactivated: 'badge-error'
};

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isViewer = currentUser?.role === UserRole.VIEWER;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [resetting, setResetting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: UserRole.APPLICANT
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    apiService
      .getUsers()
      .then(setUsers)
      .catch((err) => setError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRoleChange = async (targetUser: User, role: UserRole) => {
    setBusyUserId(targetUser.id);
    setError('');
    try {
      const updated = await apiService.updateUserAccount(targetUser.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleStatus = async (targetUser: User) => {
    setBusyUserId(targetUser.id);
    setError('');
    try {
      const nextStatus = targetUser.status === UserStatus.ACTIVE ? UserStatus.DEACTIVATED : UserStatus.ACTIVE;
      const updated = await apiService.updateUserAccount(targetUser.id, { status: nextStatus });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: any) {
      setError(err.message || 'Failed to update account status');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleConfirmReset = async () => {
    if (!resettingUser) return;
    setResetting(true);
    setError('');
    try {
      const result = await apiService.resetUserPassword(resettingUser.id);
      setTemporaryPassword(result.temporaryPassword);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const closeResetModal = () => {
    setResettingUser(null);
    setTemporaryPassword('');
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setCreateForm({ firstName: '', lastName: '', email: '', password: '', role: UserRole.ADMIN });
    setCreateError('');
  };

  const handleToggleReviewer = async (targetUser: User) => {
    setBusyUserId(targetUser.id);
    setError('');
    try {
      const updated = await apiService.updateUserAccount(targetUser.id, { isDeletionReviewer: !targetUser.isDeletionReviewer });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: any) {
      setError(err.message || 'Failed to update deletion reviewer status');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    setError('');
    try {
      await apiService.deleteUser(deletingUser.id);
      setDeletingUser(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setDeletingAll(true);
    setError('');
    try {
      await apiService.deleteAllUsers(deletableFilteredIds);
      setShowDeleteAll(false);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete users');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await apiService.createUser(createForm);
      closeCreateForm();
      load();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
      const matchesEmail = u.email.toLowerCase().includes(q);
      if (!matchesName && !matchesEmail) return false;
    }
    return true;
  });

  // Delete All is restricted to Student (Applicant) accounts only, and
  // only ever affects the currently filtered/searched rows.
  const deletableFilteredIds = filtered.filter((u) => u.role === UserRole.APPLICANT).map((u) => u.id);

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Users</div>
        <div className="navbar-actions">
          {isSuperAdmin && (
            <button
              className="btn btn-outline btn-sm"
              type="button"
              style={{ color: '#DC2626', borderColor: '#DC2626' }}
              disabled={deletableFilteredIds.length === 0}
              onClick={() => setShowDeleteAll(true)}
            >
              Delete All
            </button>
          )}
          {!isViewer && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(true)}>
              Register New User
            </button>
          )}
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>User Management</h1>
          <p>Assign roles, enable/disable accounts, and reset passwords for any user.</p>
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

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
              <label htmlFor="userSearch">Search</label>
              <input id="userSearch" placeholder="Name or email" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
              <label htmlFor="userRoleFilter">Role</label>
              <select id="userRoleFilter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">All roles</option>
                {Object.values(UserRole)
                  .filter((r) => r !== UserRole.GUEST)
                  .filter((r) => r !== UserRole.SUPER_ADMIN || currentUser?.role === UserRole.SUPER_ADMIN)
                  .map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
              <label htmlFor="userStatusFilter">Status</label>
              <select id="userStatusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {Object.values(UserStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>No users match this filter.</p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  {isSuperAdmin && <th>Deletion Reviewer</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const isSuperAdminRow = u.role === UserRole.SUPER_ADMIN;
                  const busy = busyUserId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        {u.firstName} {u.lastName}
                        {isSelf && <span style={{ fontSize: '0.75rem', color: '#6B7280' }}> (you)</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {isViewer || isSelf || isSuperAdminRow ? (
                          <span className="badge badge-secondary">{ROLE_LABEL[u.role]}</span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={busy}
                            onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                            style={{ minWidth: '120px' }}
                          >
                            {ASSIGNABLE_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABEL[role]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[u.status] ?? 'badge-secondary'}`}>{u.status}</span>
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                      {isSuperAdmin && (
                        <td>
                          {u.role === UserRole.ADMIN ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                              <input
                                type="checkbox"
                                checked={u.isDeletionReviewer}
                                disabled={busy}
                                onChange={() => handleToggleReviewer(u)}
                              />
                              Reviewer
                            </label>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td>
                        {!isViewer && !isSelf && !isSuperAdminRow && (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => handleToggleStatus(u)}>
                              {u.status === UserStatus.ACTIVE ? 'Disable' : 'Enable'}
                            </button>
                            <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setResettingUser(u)}>
                              Reset Password
                            </button>
                            {u.role === UserRole.APPLICANT && (
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ color: '#DC2626', borderColor: '#DC2626' }}
                                disabled={busy}
                                onClick={() => setDeletingUser(u)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resettingUser && (
        <Modal title="Reset Password" onClose={closeResetModal}>
          {temporaryPassword ? (
            <>
              <p style={{ color: '#065F46' }}>
                Password reset for <strong>{resettingUser.email}</strong>. Share this temporary password with them now —
                it will not be shown again.
              </p>
              <div
                style={{
                  padding: '0.85rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  textAlign: 'center'
                }}
              >
                {temporaryPassword}
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-primary" type="button" onClick={closeResetModal}>
                  Done
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                style={{
                  padding: '0.85rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#DC2626'
                }}
              >
                Reset <strong>{resettingUser.email}</strong>'s password? Their current password will stop working
                immediately.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" type="button" disabled={resetting} onClick={handleConfirmReset}>
                  {resetting ? 'Resetting...' : 'Reset Password'}
                </button>
                <button className="btn btn-outline" type="button" onClick={closeResetModal} disabled={resetting}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {showCreateForm && (
        <Modal title="Register New User" onClose={closeCreateForm}>
          <form onSubmit={handleCreateUser}>
            {createError && (
              <p
                style={{
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#DC2626',
                  marginBottom: '1rem'
                }}
              >
                {createError}
              </p>
            )}
            <div className="form-group">
              <label htmlFor="createFirstName">First Name</label>
              <input
                id="createFirstName"
                value={createForm.firstName}
                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="createLastName">Last Name</label>
              <input
                id="createLastName"
                value={createForm.lastName}
                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="createEmail">Email</label>
              <input
                id="createEmail"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="createPassword">Password</label>
              <input
                id="createPassword"
                type="text"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                minLength={8}
                required
              />
              <small style={{ color: '#6B7280' }}>At least 8 characters. Share this with them directly.</small>
            </div>
            <div className="form-group">
              <label htmlFor="createRole">Role</label>
              <select
                id="createRole"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Account'}
              </button>
              <button className="btn btn-outline" type="button" onClick={closeCreateForm} disabled={creating}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deletingUser && (
        <Modal title="Delete User" onClose={() => setDeletingUser(null)}>
          <p
            style={{
              padding: '0.85rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#DC2626'
            }}
          >
            Delete <strong>{deletingUser.firstName} {deletingUser.lastName}</strong> ({deletingUser.email})? This permanently
            removes their account, applicant profile, applications, and uploaded documents. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              type="button"
              style={{ background: '#DC2626' }}
              disabled={deleting}
              onClick={handleConfirmDeleteUser}
            >
              {deleting ? 'Deleting...' : 'Delete User'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setDeletingUser(null)} disabled={deleting}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showDeleteAll && (
        <Modal title="Delete All Students" onClose={() => setShowDeleteAll(false)}>
          <p
            style={{
              padding: '0.85rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#DC2626'
            }}
          >
            Delete <strong>{deletableFilteredIds.length}</strong> student account{deletableFilteredIds.length === 1 ? '' : 's'}{' '}
            matching the current filters/search? Admin and Super Admin accounts are never included. This permanently removes
            each account, applicant profile, applications, and uploaded documents. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              type="button"
              style={{ background: '#DC2626' }}
              disabled={deletingAll}
              onClick={handleConfirmDeleteAll}
            >
              {deletingAll ? 'Deleting...' : `Delete ${deletableFilteredIds.length} Student${deletableFilteredIds.length === 1 ? '' : 's'}`}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setShowDeleteAll(false)} disabled={deletingAll}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UserManagementPage;
