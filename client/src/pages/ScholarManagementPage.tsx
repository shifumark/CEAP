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
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Scholar ID</th>
                  <th>Student</th>
                  <th>Scholarship</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {scholars.map((scholar) => (
                  <tr key={scholar.id}>
                    <td>{scholar.scholarIdNumber ?? '—'}</td>
                    <td>
                      <div>{scholar.studentName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{scholar.studentEmail}</div>
                    </td>
                    <td>{scholar.scholarshipName}</td>
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
        )}
      </div>
    </div>
  );
};

export default ScholarManagementPage;
