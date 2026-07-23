import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { DocumentRequirement, User, UserRole, UploadedDocument } from '../types';
import Modal from '../components/Modal';

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function triggerDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

const DocumentRequirementsPage = () => {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newType, setNewType] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingRequirement, setDeletingRequirement] = useState<DocumentRequirement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [applicants, setApplicants] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDocuments, setUserDocuments] = useState<UploadedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    apiService
      .getDocumentRequirements()
      .then(setRequirements)
      .catch((err) => setError(err.message || 'Failed to load document requirements'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiService
      .getUsers()
      .then((users) => setApplicants(users.filter((u) => u.role === UserRole.APPLICANT)))
      .catch(() => {
        // Non-fatal — the applicant search just won't have anyone to find.
      });
  }, []);

  const openUser = async (user: User) => {
    setSelectedUser(user);
    setUserDocuments([]);
    setDocumentsError('');
    setDocumentsLoading(true);
    try {
      const docs = await apiService.getUserProfileDocuments(user.id);
      setUserDocuments(docs);
    } catch (err: any) {
      setDocumentsError(err.message || 'Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleViewDocument = async (documentId: number) => {
    setViewingId(documentId);
    setDocumentsError('');
    try {
      const { blob } = await apiService.downloadDocument(documentId);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err: any) {
      setDocumentsError(err.message || 'Failed to open document');
    } finally {
      setViewingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!selectedUser) return;
    setDownloadingAll(true);
    setDocumentsError('');
    try {
      const blob = await apiService.downloadMergedProfileDocumentsPdf(selectedUser.id);
      triggerDownload(blob, `${selectedUser.firstName}-${selectedUser.lastName}-Documentary-Requirements.pdf`);
    } catch (err: any) {
      setDocumentsError(err.message || 'Failed to download documents');
    } finally {
      setDownloadingAll(false);
    }
  };

  const filteredApplicants = applicants.filter((u) => {
    if (!userSearch) return false;
    const q = userSearch.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) return;
    setAdding(true);
    setError('');
    try {
      await apiService.createDocumentRequirement(newType.trim());
      setNewType('');
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to add document requirement');
    } finally {
      setAdding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRequirement) return;
    setDeleting(true);
    setError('');
    try {
      await apiService.deleteDocumentRequirement(deletingRequirement.id);
      setDeletingRequirement(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document requirement');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Document Requirements</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Documentary Requirements</h1>
          <p>
            Every document type listed here must be uploaded to a scholar's profile — this drives "VIII. Documentary
            Requirements" on every applicant's profile page.{' '}
            {!loading && <strong>Total: {requirements.length.toLocaleString()} requirement{requirements.length === 1 ? '' : 's'}</strong>}
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
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, minWidth: '280px', flex: 1 }}>
              <label htmlFor="newDocType">New document requirement</label>
              <input
                id="newDocType"
                placeholder="e.g. Barangay Clearance"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={adding || !newType.trim()}>
              {adding ? 'Adding...' : 'Add Requirement'}
            </button>
          </form>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : requirements.length === 0 ? (
          <div className="card">
            <p style={{ color: '#6B7280' }}>No document requirements yet — add one above.</p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Document Type</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((requirement, index) => (
                  <tr key={requirement.id}>
                    <td>{index + 1}</td>
                    <td>{requirement.documentType}</td>
                    <td>{formatDate(requirement.createdAt)}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: '#DC2626', borderColor: '#DC2626' }}
                        onClick={() => setDeletingRequirement(requirement)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="page-header" style={{ marginTop: '2.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span aria-hidden="true">📁</span> Documentary Requirements
          </h2>
          <p>Search a student to view and download everything they've uploaded to their profile.</p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ margin: 0, maxWidth: '360px' }}>
            <label htmlFor="applicantSearch">Search Users</label>
            <input
              id="applicantSearch"
              placeholder="Student name or email"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          {userSearch && (
            <div style={{ marginTop: '0.75rem' }}>
              {filteredApplicants.length === 0 ? (
                <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>No matching students.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {filteredApplicants.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        background: selectedUser?.id === u.id ? 'rgba(139, 92, 246, 0.1)' : undefined
                      }}
                      onClick={() => openUser(u)}
                    >
                      {u.firstName} {u.lastName} <span style={{ color: '#6B7280', marginLeft: '0.5rem' }}>{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="card">
            <div
              className="card-header"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}
            >
              <h3>
                {selectedUser.firstName} {selectedUser.lastName}'s Documents
              </h3>
              <button
                className="btn btn-primary btn-sm"
                disabled={downloadingAll || userDocuments.length === 0}
                onClick={handleDownloadAll}
              >
                {downloadingAll ? 'Preparing PDF...' : 'Download All as One PDF'}
              </button>
            </div>

            {documentsError && (
              <p style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{documentsError}</p>
            )}

            {documentsLoading ? (
              <p style={{ color: '#6B7280' }}>Loading...</p>
            ) : userDocuments.length === 0 ? (
              <p style={{ color: '#6B7280' }}>This student hasn't uploaded any documents yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {userDocuments.map((doc) => (
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
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{doc.fileName}</div>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={viewingId === doc.id}
                      onClick={() => handleViewDocument(doc.id)}
                    >
                      {viewingId === doc.id ? 'Opening...' : 'View'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {deletingRequirement && (
        <Modal title="Delete Document Requirement" onClose={() => setDeletingRequirement(null)}>
          <p
            style={{
              padding: '0.85rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#DC2626'
            }}
          >
            Remove <strong>{deletingRequirement.documentType}</strong> from the required documents list? Scholars will
            no longer be asked to upload it, and it will disappear from "VIII. Documentary Requirements" on their
            profile (any copy they already uploaded is not deleted).
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              type="button"
              style={{ background: '#DC2626' }}
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? 'Deleting...' : 'Delete Requirement'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setDeletingRequirement(null)} disabled={deleting}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DocumentRequirementsPage;
