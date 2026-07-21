import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { DocumentRequirement } from '../types';
import Modal from '../components/Modal';

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const DocumentRequirementsPage = () => {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newType, setNewType] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingRequirement, setDeletingRequirement] = useState<DocumentRequirement | null>(null);
  const [deleting, setDeleting] = useState(false);

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
  }, []);

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
