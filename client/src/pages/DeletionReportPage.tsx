import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuditLog, DeletionRequest, UserRole } from '../types';
import Modal from '../components/Modal';

const PAGE_SIZE = 50;

const ENTITY_LABEL: Record<string, string> = {
  applications: 'Application',
  scholars: 'Scholar',
  users: 'User',
  application: 'Application',
  scholar: 'Scholar',
  user: 'User'
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

  const [pending, setPending] = useState<DeletionRequest[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState('');
  const [approvingRequest, setApprovingRequest] = useState<DeletionRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<DeletionRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [acting, setActing] = useState(false);

  const [rows, setRows] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPending = async () => {
    setPendingLoading(true);
    setPendingError('');
    try {
      const result = await apiService.getPendingDeletionRequests();
      setPending(result.data);
    } catch (err: any) {
      setPendingError(err.message || 'Failed to load pending deletion requests');
    } finally {
      setPendingLoading(false);
    }
  };

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
    if (canView) {
      loadPending();
      load(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const handleApprove = async () => {
    if (!approvingRequest) return;
    setActing(true);
    setPendingError('');
    try {
      await apiService.approveDeletionRequest(approvingRequest.id);
      setApprovingRequest(null);
      await Promise.all([loadPending(), load(1)]);
    } catch (err: any) {
      setPendingError(err.message || 'Failed to approve deletion request');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    setActing(true);
    setPendingError('');
    try {
      await apiService.rejectDeletionRequest(rejectingRequest.id, rejectNote.trim() || undefined);
      setRejectingRequest(null);
      setRejectNote('');
      await loadPending();
    } catch (err: any) {
      setPendingError(err.message || 'Failed to reject deletion request');
    } finally {
      setActing(false);
    }
  };

  if (!canView) {
    return (
      <div>
        <nav className="navbar">
          <div className="navbar-brand">Deletion Requests</div>
        </nav>
        <div className="container">
          <div className="page-header">
            <h1>Deletion Requests</h1>
          </div>
          <div className="card">
            <p style={{ color: '#B9AFDA' }}>
              This page is only visible to the Super Admin and Admins assigned as Deletion Reviewers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Deletion Requests</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Deletion Requests</h1>
          <p>
            When an Admin (not Super Admin) deletes an Application, Scholar, or User, it's held here pending your
            approval or rejection — nothing is actually removed until you decide.
          </p>
        </div>

        {pendingError && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              color: '#F87171'
            }}
          >
            {pendingError}
          </div>
        )}

        <div className="card" style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <div className="card-header">
            <h3>Pending Approval</h3>
          </div>
          {pendingLoading ? (
            <p>Loading...</p>
          ) : pending.length === 0 ? (
            <p style={{ color: '#B9AFDA' }}>No deletion requests waiting on you right now.</p>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {['Requested', 'Type', 'Details', 'Requested By', ''].map((label) => (
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
                {pending.map((request) => (
                  <tr key={request.id}>
                    <td style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                      {formatDateTime(request.requestedAt)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                      {ENTITY_LABEL[request.entityType] ?? request.entityType}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                      {request.entityLabel}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                      {request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : 'Unknown'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => setApprovingRequest(request)}>
                          Approve
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: '#F87171', borderColor: '#F87171' }}
                          onClick={() => setRejectingRequest(request)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              color: '#F87171'
            }}
          >
            {error}
          </div>
        )}

        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-header">
            <h3>Deletion History</h3>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : rows.length === 0 ? (
            <p style={{ color: '#B9AFDA' }}>No deletions recorded yet.</p>
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
                <p style={{ fontSize: '0.85rem', color: '#B9AFDA', margin: 0 }}>
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

      {approvingRequest && (
        <Modal title="Approve Deletion" onClose={() => setApprovingRequest(null)}>
          <p
            style={{
              padding: '0.85rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#F87171'
            }}
          >
            Approve deleting {approvingRequest.entityLabel}? This permanently deletes the record. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" type="button" style={{ background: '#F87171' }} disabled={acting} onClick={handleApprove}>
              {acting ? 'Approving...' : 'Approve & Delete'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setApprovingRequest(null)} disabled={acting}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {rejectingRequest && (
        <Modal
          title="Reject Deletion Request"
          onClose={() => {
            setRejectingRequest(null);
            setRejectNote('');
          }}
        >
          <p>Reject the request to delete {rejectingRequest.entityLabel}? The record is left untouched.</p>
          <div className="form-group">
            <label htmlFor="rejectNote">Note to the requester (optional)</label>
            <textarea id="rejectNote" rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" type="button" disabled={acting} onClick={handleReject}>
              {acting ? 'Rejecting...' : 'Reject Request'}
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setRejectingRequest(null);
                setRejectNote('');
              }}
              disabled={acting}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DeletionReportPage;
