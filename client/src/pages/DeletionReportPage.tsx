import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuditLog, UserRole } from '../types';

const PAGE_SIZE = 50;

const ENTITY_LABEL: Record<string, string> = {
  applications: 'Application',
  scholars: 'Scholar',
  users: 'User'
};

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

const DeletionReportPage = () => {
  const { user } = useAuth();
  const canView = user?.role === UserRole.SUPER_ADMIN || (user?.role === UserRole.ADMIN && user.isDeletionReviewer);
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiService.getDeletionReport(targetPage, PAGE_SIZE);
      setRows(result.data);
      setTotalCount(result.total);
      setTotalPages(Math.max(1, result.totalPages));
      setPage(result.page);
    } catch (err: any) {
      setError(err.message || 'Failed to load deletion report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  if (!canView) {
    return (
      <div>
        <nav className="navbar">
          <div className="navbar-brand">Deletion Report</div>
        </nav>
        <div className="container">
          <div className="page-header">
            <h1>Deletion Report</h1>
          </div>
          <div className="card">
            <p style={{ color: '#6B7280' }}>
              This report is only visible to the Super Admin and Admins assigned as Deletion Reviewers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Deletion Report</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Deletion Report</h1>
          <p>
            Every Application, Scholar, and User record deleted, with the date and the account that performed the
            deletion. Visible only to the Super Admin and Admins assigned as Deletion Reviewers.
          </p>
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

        <div className="card" style={{ overflowX: 'auto' }}>
          {loading ? (
            <p>Loading...</p>
          ) : rows.length === 0 ? (
            <p style={{ color: '#6B7280' }}>No deletions recorded yet.</p>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}
              >
                <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>
                  <strong>{totalCount.toLocaleString()}</strong> deletion{totalCount === 1 ? '' : 's'} total — showing page {page}{' '}
                  of {totalPages}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
                    Previous
                  </button>
                  <button className="btn btn-outline btn-sm" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>
                    Next
                  </button>
                </div>
              </div>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {['Date', 'Deleted By', 'Type', 'Record ID'].map((label) => (
                      <th
                        key={label}
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid var(--border-light)',
                          background: 'rgba(139, 92, 246, 0.06)',
                          textAlign: 'left'
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                        {row.user ? `${row.user.firstName} ${row.user.lastName} (${row.user.email})` : 'Unknown'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                        {row.entityType ? ENTITY_LABEL[row.entityType] ?? row.entityType : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                        {row.entityId ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeletionReportPage;
