import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Scholar } from '../types';
import Modal from '../components/Modal';

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-secondary',
  graduated: 'badge-primary',
  terminated: 'badge-error'
};

const STATUS_OPTIONS = ['active', 'inactive', 'graduated', 'terminated'];

interface ProgramGroup {
  scholarshipName: string;
  scholars: Scholar[];
}

function programKey(scholar: Scholar): string {
  return scholar.scholarshipName ?? `Scholarship #${scholar.scholarshipId}`;
}

// Groups by scholarship program, then orders each group by submissionDate
// ascending (earliest submitted first) so the row number reflects the
// order applicants actually submitted in — scholars with no known
// submission date (e.g. manually approved without ever being submitted)
// sort last within their group.
function groupByProgram(scholars: Scholar[]): ProgramGroup[] {
  const groups = new Map<string, Scholar[]>();
  for (const scholar of scholars) {
    const key = programKey(scholar);
    const group = groups.get(key);
    if (group) group.push(scholar);
    else groups.set(key, [scholar]);
  }

  return Array.from(groups.entries())
    .map(([scholarshipName, groupScholars]) => ({
      scholarshipName,
      scholars: [...groupScholars].sort((a, b) => {
        if (!a.submissionDate && !b.submissionDate) return 0;
        if (!a.submissionDate) return 1;
        if (!b.submissionDate) return -1;
        return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime();
      })
    }))
    .sort((a, b) => a.scholarshipName.localeCompare(b.scholarshipName));
}

const ScholarManagementPage = () => {
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingScholar, setDeletingScholar] = useState<Scholar | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    apiService
      .getScholars({ pageSize: 100 })
      .then((result) => setScholars(result.data))
      .catch((err) => setError(err.message || 'Failed to load scholars'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingScholar) return;
    setDeleting(true);
    setError('');
    try {
      await apiService.deleteScholar(deletingScholar.id);
      setDeletingScholar(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete scholar');
    } finally {
      setDeleting(false);
    }
  };

  // Folder tab counts always reflect the full scholar list (stable
  // navigation chrome), independent of the search/status filters below.
  const allGroups = groupByProgram(scholars);

  const filtered = scholars.filter((scholar) => {
    if (selectedProgram && programKey(scholar) !== selectedProgram) return false;
    if (statusFilter && scholar.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = scholar.studentName?.toLowerCase().includes(q);
      const matchesEmail = scholar.studentEmail?.toLowerCase().includes(q);
      if (!matchesName && !matchesEmail) return false;
    }
    return true;
  });

  const displayGroups = groupByProgram(filtered);

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Scholars</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Scholar Management</h1>
          <p>Track grades, renewals, allowances, and compliance for active scholars.</p>
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
        ) : scholars.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>
              No scholars yet — scholars are created automatically when an application is approved.
            </p>
          </div>
        ) : (
          <>
            {/* Program "folders" */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                className={`btn btn-sm ${selectedProgram === null ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedProgram(null)}
              >
                📁 All Programs ({scholars.length})
              </button>
              {allGroups.map((group) => (
                <button
                  key={group.scholarshipName}
                  className={`btn btn-sm ${selectedProgram === group.scholarshipName ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSelectedProgram(group.scholarshipName)}
                >
                  📁 {group.scholarshipName} ({group.scholars.length})
                </button>
              ))}
            </div>

            {/* Search + status filter */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
                  <label htmlFor="scholarSearch">Search</label>
                  <input
                    id="scholarSearch"
                    placeholder="Student name or email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
                  <label htmlFor="scholarStatusFilter">Status</label>
                  <select id="scholarStatusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {displayGroups.length === 0 ? (
              <div className="card">
                <p style={{ color: '#6B7280' }}>No scholars match this filter.</p>
              </div>
            ) : (
              displayGroups.map((group) => (
                <section key={group.scholarshipName} style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '0.75rem' }}>
                    {group.scholarshipName}{' '}
                    <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#6B7280' }}>
                      ({group.scholars.length} scholar{group.scholars.length === 1 ? '' : 's'})
                    </span>
                  </h3>
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Scholar ID</th>
                          <th>Student</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.scholars.map((scholar, index) => (
                          <tr key={scholar.id}>
                            <td>{index + 1}</td>
                            <td>{scholar.scholarIdNumber ?? '—'}</td>
                            <td>
                              <div>{scholar.studentName}</div>
                              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{scholar.studentEmail}</div>
                            </td>
                            <td>
                              <span className={`badge ${STATUS_BADGE[scholar.status] ?? 'badge-secondary'}`}>
                                {scholar.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Link className="btn btn-outline btn-sm" to={`/scholars/${scholar.id}`}>
                                  Manage
                                </Link>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: '#DC2626', borderColor: '#DC2626' }}
                                  onClick={() => setDeletingScholar(scholar)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>

      {deletingScholar && (
        <Modal title="Delete Scholar" onClose={() => setDeletingScholar(null)}>
          <p
            style={{
              padding: '0.85rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#DC2626'
            }}
          >
            Delete <strong>{deletingScholar.studentName}</strong> from <strong>{deletingScholar.scholarshipName}</strong>?
            This permanently removes the scholar record, their approved application, and all associated grades,
            renewals, allowances, and violations. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              type="button"
              style={{ background: '#DC2626' }}
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? 'Deleting...' : 'Delete Scholar'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setDeletingScholar(null)} disabled={deleting}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ScholarManagementPage;
