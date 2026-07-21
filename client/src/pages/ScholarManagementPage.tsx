import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Scholar } from '../types';

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-secondary',
  graduated: 'badge-primary',
  terminated: 'badge-error'
};

interface ProgramGroup {
  scholarshipName: string;
  scholars: Scholar[];
}

// Groups by scholarship program, then orders each group by submissionDate
// ascending (earliest submitted first) so the row number reflects the
// order applicants actually submitted in — scholars with no known
// submission date (e.g. manually approved without ever being submitted)
// sort last within their group.
function groupByProgram(scholars: Scholar[]): ProgramGroup[] {
  const groups = new Map<string, Scholar[]>();
  for (const scholar of scholars) {
    const key = scholar.scholarshipName ?? `Scholarship #${scholar.scholarshipId}`;
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

  useEffect(() => {
    apiService
      .getScholars({ pageSize: 100 })
      .then((result) => setScholars(result.data))
      .catch((err) => setError(err.message || 'Failed to load scholars'))
      .finally(() => setLoading(false));
  }, []);

  const groups = groupByProgram(scholars);

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
          groups.map((group) => (
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
                          <Link className="btn btn-outline btn-sm" to={`/scholars/${scholar.id}`}>
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default ScholarManagementPage;
