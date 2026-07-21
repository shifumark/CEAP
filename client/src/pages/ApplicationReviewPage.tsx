import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Application, ApplicationStatus, UploadedDocument, DocumentVerificationStatus, Applicant, ScholarshipProgram } from '../types';
import Modal from '../components/Modal';
import ApplicantProfileView from '../components/ApplicantProfileView';

const DOC_STATUS_LABEL: Record<DocumentVerificationStatus, string> = {
  [DocumentVerificationStatus.PENDING]: 'Pending review',
  [DocumentVerificationStatus.VERIFIED]: 'Verified',
  [DocumentVerificationStatus.REJECTED]: 'Rejected',
  [DocumentVerificationStatus.REQUESTING_REVISION]: 'Revision requested'
};

const DOC_STATUS_BADGE: Record<DocumentVerificationStatus, string> = {
  [DocumentVerificationStatus.PENDING]: 'badge-warning',
  [DocumentVerificationStatus.VERIFIED]: 'badge-success',
  [DocumentVerificationStatus.REJECTED]: 'badge-error',
  [DocumentVerificationStatus.REQUESTING_REVISION]: 'badge-warning'
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  [ApplicationStatus.DRAFT]: 'Draft',
  [ApplicationStatus.SUBMITTED]: 'Submitted',
  [ApplicationStatus.UNDER_REVIEW]: 'Under Review',
  [ApplicationStatus.DOCUMENT_VERIFICATION]: 'Document Verification',
  [ApplicationStatus.INTERVIEW]: 'Interview',
  [ApplicationStatus.APPROVED]: 'Approved',
  [ApplicationStatus.REJECTED]: 'Rejected',
  [ApplicationStatus.NEEDS_REVISION]: 'Needs Revision'
};

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  [ApplicationStatus.DRAFT]: 'badge-secondary',
  [ApplicationStatus.SUBMITTED]: 'badge-primary',
  [ApplicationStatus.UNDER_REVIEW]: 'badge-primary',
  [ApplicationStatus.DOCUMENT_VERIFICATION]: 'badge-warning',
  [ApplicationStatus.INTERVIEW]: 'badge-warning',
  [ApplicationStatus.APPROVED]: 'badge-success',
  [ApplicationStatus.REJECTED]: 'badge-error',
  [ApplicationStatus.NEEDS_REVISION]: 'badge-warning'
};

// Drafts are the student's own in-progress work and are never shown to
// admins (server enforces this too) — excluded from both the filter and
// the decision dropdown.
const REVIEWABLE_STATUSES = Object.values(ApplicationStatus).filter((status) => status !== ApplicationStatus.DRAFT);

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const ApplicationReviewPage = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<ApplicationStatus | ''>('');
  const [draftComments, setDraftComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentActionId, setDocumentActionId] = useState<number | null>(null);
  const [applicantProfile, setApplicantProfile] = useState<Applicant | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [nameSearch, setNameSearch] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [programFilter, setProgramFilter] = useState<string>('');

  const loadApplications = async () => {
    setError('');
    try {
      const result = await apiService.getApplications({
        pageSize: 100,
        ...(statusFilter ? { status: statusFilter as ApplicationStatus } : {})
      });
      setApplications(result.data);
      setTotalCount(result.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadApplications();
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

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  // Numbered by submission order (earliest first) — same "who submitted
  // first" convention used in Scholar Management. Applications with no
  // submissionDate (drafts can't reach here; only possible for records
  // an admin fast-tracked without a formal submission) sort last.
  const filteredApplications = applications
    .filter((application) => {
      if (nameSearch && !application.applicantName?.toLowerCase().includes(nameSearch.toLowerCase())) return false;
      if (barangaySearch) {
        const q = barangaySearch.toLowerCase();
        const matchesBarangay = application.applicantBarangay?.toLowerCase().includes(q);
        // Some applicants entered their barangay as free text under the
        // legacy address field instead of the structured barangay field —
        // fall back to matching that too, so they're still findable.
        const matchesAddress = application.applicantAddress?.toLowerCase().includes(q);
        if (!matchesBarangay && !matchesAddress) return false;
      }
      if (programFilter && application.scholarshipId !== Number(programFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      if (!a.submissionDate && !b.submissionDate) return 0;
      if (!a.submissionDate) return 1;
      if (!b.submissionDate) return -1;
      return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime();
    });

  const loadDocuments = async (applicationId: number) => {
    setDocumentsLoading(true);
    try {
      const docs = await apiService.getApplicationDocuments(applicationId);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadApplicantProfile = async (applicantId: number) => {
    setProfileLoading(true);
    try {
      const profile = await apiService.getApplicantProfile(applicantId);
      setApplicantProfile(profile);
    } catch (err: any) {
      setError(err.message || 'Failed to load applicant profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const openReview = (application: Application) => {
    setSelectedId(application.id);
    setDraftStatus(application.status);
    setDraftComments(application.comments ?? '');
    setApplicantProfile(null);
    loadDocuments(application.id);
    loadApplicantProfile(application.applicantId);
  };

  const handleSave = async () => {
    if (!selected || !draftStatus) return;
    setSaving(true);
    setError('');
    try {
      await apiService.updateApplication(selected.id, { status: draftStatus, comments: draftComments });
      setSelectedId(null);
      await loadApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to update application');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDocument = async (documentId: number) => {
    try {
      const { blob } = await apiService.downloadDocument(documentId);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener');
      // Revoked after a delay rather than immediately — the new tab needs
      // time to actually load the blob URL before it's freed.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err: any) {
      setError(err.message || 'Failed to open document');
    }
  };

  const handleVerifyDocument = async (documentId: number, status: DocumentVerificationStatus) => {
    if (!selected) return;
    setDocumentActionId(documentId);
    setError('');
    try {
      await apiService.verifyDocument(documentId, status);
      await loadDocuments(selected.id);
    } catch (err: any) {
      setError(err.message || 'Failed to update document');
    } finally {
      setDocumentActionId(null);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Applications</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Application Review</h1>
          <p>
            Review submitted applications and record a decision.{' '}
            {!loading && <strong>Total: {totalCount.toLocaleString()} applicant{totalCount === 1 ? '' : 's'}</strong>}
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

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
              <label htmlFor="nameSearch">Search by Name</label>
              <input id="nameSearch" placeholder="Applicant name" value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
              <label htmlFor="barangaySearch">Search by Barangay</label>
              <input id="barangaySearch" value={barangaySearch} onChange={(e) => setBarangaySearch(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
              <label htmlFor="programFilter">Filter by Program</label>
              <select id="programFilter" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                <option value="">All programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, maxWidth: '280px' }}>
              <label htmlFor="statusFilter">Filter by status</label>
              <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {REVIEWABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredApplications.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>No applications match this filter.</p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Applicant</th>
                  <th>Scholarship</th>
                  <th>Status</th>
                  <th>Date Submitted</th>
                  <th>Date Received</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application, index) => (
                  <tr key={application.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div>{application.applicantName ?? `Applicant #${application.applicantId}`}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{application.applicantEmail}</div>
                    </td>
                    <td>{application.scholarshipName ?? `#${application.scholarshipId}`}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[application.status]}`}>
                        {STATUS_LABEL[application.status]}
                      </span>
                    </td>
                    <td>{formatDate(application.submissionDate)}</td>
                    <td>{formatDate(application.receivedDate)}</td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => openReview(application)}>
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
          <Modal title={`Review: ${selected.applicantName} — ${selected.scholarshipName}`} onClose={() => setSelectedId(null)}>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: 0 }}>
              <strong>Date Submitted:</strong> {formatDate(selected.submissionDate)}
              {' · '}
              <strong>Date Received:</strong> {formatDate(selected.receivedDate)}
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>Applicant Profile</strong>
              <ApplicantProfileView profile={applicantProfile} loading={profileLoading} email={selected.applicantEmail} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>Uploaded Documents</strong>
              {documentsLoading ? (
                <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.5rem' }}>Loading...</p>
              ) : documents.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.5rem' }}>No documents uploaded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <div>{doc.documentType}</div>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ marginTop: '0.25rem' }}
                          onClick={() => handleViewDocument(doc.id)}
                        >
                          View file
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${DOC_STATUS_BADGE[doc.verificationStatus]}`}>
                          {DOC_STATUS_LABEL[doc.verificationStatus]}
                        </span>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={documentActionId === doc.id}
                          onClick={() => handleVerifyDocument(doc.id, DocumentVerificationStatus.VERIFIED)}
                        >
                          Verify
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={documentActionId === doc.id}
                          onClick={() => handleVerifyDocument(doc.id, DocumentVerificationStatus.REJECTED)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="decisionStatus">Decision</label>
              <select
                id="decisionStatus"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as ApplicationStatus)}
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
              <label htmlFor="decisionComments">Comments (visible to the student)</label>
              <textarea
                id="decisionComments"
                rows={3}
                value={draftComments}
                onChange={(e) => setDraftComments(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save Decision'}
              </button>
              <button className="btn btn-outline" onClick={() => setSelectedId(null)}>
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default ApplicationReviewPage;
