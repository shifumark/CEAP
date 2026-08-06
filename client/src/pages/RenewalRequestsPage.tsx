import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Renewal, RenewalStatus, ScholarshipProgram, UserRole } from '../types';

const STATUS_LABEL: Record<RenewalStatus, string> = {
  [RenewalStatus.PENDING]: 'Received',
  [RenewalStatus.UNDER_REVIEW]: 'For Review',
  [RenewalStatus.APPROVED]: 'Approved',
  [RenewalStatus.REJECTED]: 'Rejected'
};

const STATUS_BADGE: Record<RenewalStatus, string> = {
  [RenewalStatus.PENDING]: 'badge-warning',
  [RenewalStatus.UNDER_REVIEW]: 'badge-primary',
  [RenewalStatus.APPROVED]: 'badge-success',
  [RenewalStatus.REJECTED]: 'badge-error'
};

// "Last name, First name, Middle initial" — same formatting used on
// Payroll — falls back to the plain "First Last" studentName when the
// split fields aren't available.
function formatFullName(renewal: Renewal): string {
  if (!renewal.studentLastName || !renewal.studentFirstName) return renewal.studentName ?? '—';
  const middleInitial = renewal.studentMiddleName?.trim() ? `${renewal.studentMiddleName.trim().charAt(0).toUpperCase()}.` : '';
  return [`${renewal.studentLastName}, ${renewal.studentFirstName}`, middleInitial].filter(Boolean).join(' ');
}

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const RenewalRequestsPage = () => {
  const { user } = useAuth();
  const isViewer = user?.role === UserRole.VIEWER;

  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState<RenewalStatus | ''>('');
  const [programFilter, setProgramFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setError('');
    try {
      const result = await apiService.getAllRenewals({ pageSize: 200 });
      setRenewals(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load renewal requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    apiService
      .getScholarships(1, 100)
      .then((result) => setPrograms(result.data))
      .catch(() => {
        // Non-fatal — the Program filter just won't have options if this fails.
      });
  }, []);

  const filtered = useMemo(() => {
    return renewals
      .filter((r) => (statusFilter ? r.status === statusFilter : true))
      .filter((r) => (programFilter ? r.scholarshipId === Number(programFilter) : true))
      .filter((r) => (nameSearch ? (r.studentName ?? '').toLowerCase().includes(nameSearch.toLowerCase()) : true));
  }, [renewals, statusFilter, programFilter, nameSearch]);

  const handleStartReview = async (id: number) => {
    setBusyId(id);
    setError('');
    try {
      const updated = await apiService.markRenewalUnderReview(id);
      setRenewals((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message || 'Failed to start review');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecision = async (id: number, decision: 'approved' | 'rejected') => {
    setBusyId(id);
    setError('');
    try {
      const updated = await apiService.reviewRenewal(id, decision);
      setRenewals((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message || 'Failed to record decision');
    } finally {
      setBusyId(null);
    }
  };

  const colCount = isViewer ? 6 : 7;

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Renewal Requests</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Renewal Requests</h1>
          <p>Track scholarship renewal requests as they move from Received to For Review to Approved.</p>
        </div>

        {error && (
          <div className="alert-error" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="grid grid-4" style={{ margin: 0 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="renewalStatus">Status</label>
              <select
                id="renewalStatus"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RenewalStatus | '')}
              >
                <option value="">All Statuses</option>
                <option value={RenewalStatus.PENDING}>Received</option>
                <option value={RenewalStatus.UNDER_REVIEW}>For Review</option>
                <option value={RenewalStatus.APPROVED}>Approved</option>
                <option value={RenewalStatus.REJECTED}>Rejected</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="renewalProgram">Program</label>
              <select id="renewalProgram" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                <option value="">All Programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="renewalName">Name</label>
              <input
                id="renewalName"
                placeholder="Search by name"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Scholar</th>
                    <th>Program</th>
                    <th>Academic Year</th>
                    <th>Semester</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    {!isViewer && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} style={{ color: 'var(--text-secondary)' }}>
                        No renewal requests match this filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((renewal) => (
                      <tr key={renewal.id}>
                        <td>{formatFullName(renewal)}</td>
                        <td>{renewal.scholarshipName ?? '—'}</td>
                        <td>{renewal.academicYear ?? '—'}</td>
                        <td>{renewal.semester ?? '—'}</td>
                        <td>{formatDate(renewal.submissionDate)}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[renewal.status]}`}>{STATUS_LABEL[renewal.status]}</span>
                        </td>
                        {!isViewer && (
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {renewal.status === RenewalStatus.PENDING && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  disabled={busyId === renewal.id}
                                  onClick={() => handleStartReview(renewal.id)}
                                >
                                  Start Review
                                </button>
                              )}
                              {(renewal.status === RenewalStatus.PENDING || renewal.status === RenewalStatus.UNDER_REVIEW) && (
                                <>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    disabled={busyId === renewal.id}
                                    onClick={() => handleDecision(renewal.id, 'approved')}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-outline btn-sm"
                                    style={{ color: 'var(--error-text)', borderColor: 'var(--error-text)' }}
                                    disabled={busyId === renewal.id}
                                    onClick={() => handleDecision(renewal.id, 'rejected')}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RenewalRequestsPage;
