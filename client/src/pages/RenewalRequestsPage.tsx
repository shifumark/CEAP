import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Renewal, RenewalStatus, ScholarshipProgram, UserRole } from '../types';
import Modal from '../components/Modal';

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

// Shown in the decision dropdown — every status a reviewer might pick,
// including the request's own current one (so re-opening it shows the
// right selection rather than defaulting to whatever's listed first).
const REVIEWABLE_STATUSES = Object.values(RenewalStatus);

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
  const [totalCount, setTotalCount] = useState(0);

  const [statusFilter, setStatusFilter] = useState<RenewalStatus | ''>('');
  const [programFilter, setProgramFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<RenewalStatus | ''>('');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRenewals = async () => {
    setError('');
    try {
      const result = await apiService.getAllRenewals({
        pageSize: 200,
        ...(statusFilter ? { status: statusFilter } : {})
      });
      setRenewals(result.data);
      setTotalCount(result.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load renewal requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadRenewals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    apiService
      .getScholarships(1, 100)
      .then((result) => setPrograms(result.data))
      .catch(() => {
        // Non-fatal — the Program filter just won't have options if this fails.
      });
  }, []);

  const selected = renewals.find((r) => r.id === selectedId) ?? null;

  // Numbered by submission order (earliest first by default), same
  // convention as Application Review — reversible via the sort toggle.
  const filteredRenewals = renewals
    .filter((renewal) => {
      if (nameSearch && !renewal.studentName?.toLowerCase().includes(nameSearch.toLowerCase())) return false;
      if (barangaySearch && !renewal.studentBarangay?.toLowerCase().includes(barangaySearch.toLowerCase())) return false;
      if (programFilter && renewal.scholarshipId !== Number(programFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      if (!a.submissionDate && !b.submissionDate) return 0;
      if (!a.submissionDate) return 1;
      if (!b.submissionDate) return -1;
      const direction = sortOrder === 'asc' ? 1 : -1;
      return direction * (new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime());
    });

  const openReview = (renewal: Renewal) => {
    setSelectedId(renewal.id);
    setDraftStatus(renewal.status);
    setDraftNotes(renewal.notes ?? '');
  };

  const handleSave = async () => {
    if (!selected || !draftStatus || draftStatus === selected.status) {
      setSelectedId(null);
      return;
    }
    setSaving(true);
    setError('');
    try {
      let updated: Renewal;
      if (draftStatus === RenewalStatus.UNDER_REVIEW) {
        updated = await apiService.markRenewalUnderReview(selected.id);
      } else if (draftStatus === RenewalStatus.APPROVED || draftStatus === RenewalStatus.REJECTED) {
        updated = await apiService.reviewRenewal(selected.id, draftStatus, draftNotes || undefined);
      } else {
        // "Received" isn't a target a reviewer can move a request back
        // to — there's no such transition — so this is a no-op close.
        setSelectedId(null);
        return;
      }
      setRenewals((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update renewal request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Renewal Requests</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Renewal Requests</h1>
          <p>
            Track scholarship renewal requests from Received through For Review to a final decision.{' '}
            {!loading && <strong>Total: {totalCount.toLocaleString()} request{totalCount === 1 ? '' : 's'}</strong>}
          </p>
        </div>

        {error && (
          <div className="alert-error" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
              <label htmlFor="renewalNameSearch">Search by Name</label>
              <input
                id="renewalNameSearch"
                placeholder="Scholar name"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
              <label htmlFor="renewalBarangaySearch">Search by Barangay</label>
              <input id="renewalBarangaySearch" value={barangaySearch} onChange={(e) => setBarangaySearch(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
              <label htmlFor="renewalProgramFilter">Filter by Program</label>
              <select id="renewalProgramFilter" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                <option value="">All programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, maxWidth: '280px' }}>
              <label htmlFor="renewalStatusFilter">Filter by status</label>
              <select
                id="renewalStatusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RenewalStatus | '')}
              >
                <option value="">All statuses</option>
                {REVIEWABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
              <label htmlFor="renewalSortOrder">Sort by Date Submitted</label>
              <select id="renewalSortOrder" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}>
                <option value="asc">Ascending (earliest first)</option>
                <option value="desc">Descending (latest first)</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredRenewals.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--text-secondary)' }}>No renewal requests match this filter.</p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Scholar</th>
                  <th>Program</th>
                  <th>Academic Year</th>
                  <th>Semester</th>
                  <th>Date Submitted</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRenewals.map((renewal, index) => (
                  <tr key={renewal.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div>{formatFullName(renewal)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{renewal.studentBarangay ?? '—'}</div>
                    </td>
                    <td>{renewal.scholarshipName ?? `#${renewal.scholarshipId}`}</td>
                    <td>{renewal.academicYear ?? '—'}</td>
                    <td>{renewal.semester ?? '—'}</td>
                    <td>{formatDate(renewal.submissionDate)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[renewal.status]}`}>{STATUS_LABEL[renewal.status]}</span>
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => openReview(renewal)}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <Modal title={`Review: ${formatFullName(selected)} — ${selected.scholarshipName ?? ''}`} onClose={() => setSelectedId(null)}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 0 }}>
              <strong>Academic Year:</strong> {selected.academicYear ?? '—'} {selected.semester ?? ''}
              {' · '}
              <strong>Date Submitted:</strong> {formatDate(selected.submissionDate)}
            </p>

            {isViewer ? (
              <>
                <p style={{ fontSize: '0.85rem' }}>
                  <strong>Status:</strong> {STATUS_LABEL[selected.status]}
                </p>
                {selected.notes && (
                  <p style={{ fontSize: '0.85rem' }}>
                    <strong>Notes:</strong> {selected.notes}
                  </p>
                )}
                <button className="btn btn-outline" onClick={() => setSelectedId(null)}>
                  Close
                </button>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="renewalDecisionStatus">Decision</label>
                  <select
                    id="renewalDecisionStatus"
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value as RenewalStatus)}
                    autoFocus
                  >
                    {REVIEWABLE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="renewalDecisionNotes">Notes (visible to the scholar)</label>
                  <textarea id="renewalDecisionNotes" rows={3} value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                    {saving ? 'Saving...' : 'Save Decision'}
                  </button>
                  <button className="btn btn-outline" onClick={() => setSelectedId(null)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
};

export default RenewalRequestsPage;
