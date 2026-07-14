import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Application, ApplicationStatus, UploadedDocument, DocumentVerificationStatus } from '../types';
import Modal from '../components/Modal';

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

  const loadApplications = async () => {
    setError('');
    try {
      const result = await apiService.getApplications({
        pageSize: 100,
        ...(statusFilter ? { status: statusFilter as ApplicationStatus } : {})
      });
      setApplications(result.data);
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

  const selected = applications.find((a) => a.id === selectedId) ?? null;

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

  const openReview = (application: Application) => {
    setSelectedId(application.id);
    setDraftStatus(application.status);
    setDraftComments(application.comments ?? '');
    loadDocuments(application.id);
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
          <p>Review submitted applications and record a decision.</p>
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
          <div className="form-group" style={{ maxWidth: '280px', margin: 0 }}>
            <label htmlFor="statusFilter">Filter by status</label>
            <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {Object.values(ApplicationStatus).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : applications.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>No applications match this filter.</p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Scholarship</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
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
                {Object.values(ApplicationStatus).map((status) => (
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
