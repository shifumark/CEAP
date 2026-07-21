import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { UploadedDocument } from '../types';

const VALID_ID_TYPE = 'Valid ID';

interface Props {
  onChange?: () => void;
}

/**
 * Uploads here are profile-level (applicationId omitted) — once uploaded,
 * they're reused across every scholarship application, no re-upload
 * needed. "Valid ID" itself is handled separately by ValidIdUpload,
 * inline in Section I of the profile form — excluded from this list so
 * it isn't shown twice.
 *
 * The list of required types is admin-managed (DocumentRequirementService)
 * rather than hardcoded — newly added requirements automatically get an
 * upload row here for any scholar who hasn't uploaded that type yet.
 */
const ProfileDocuments = ({ onChange }: Props) => {
  const [uploaded, setUploaded] = useState<UploadedDocument[]>([]);
  const [requiredTypes, setRequiredTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    try {
      const [docs, requirements] = await Promise.all([
        apiService.getMyProfileDocuments(),
        apiService.getDocumentRequirements()
      ]);
      setUploaded(docs);
      setRequiredTypes(requirements.map((r) => r.documentType));
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (documentType: string, file: File | undefined) => {
    if (!file) return;
    setBusyKey(`upload:${documentType}`);
    setError('');
    try {
      await apiService.uploadDocument(documentType, file);
      await load();
      onChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setBusyKey(null);
    }
  };

  const handleView = async (documentId: number) => {
    setError('');
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

  const handleDelete = async (documentId: number) => {
    setBusyKey(`delete:${documentId}`);
    setError('');
    try {
      await apiService.deleteDocument(documentId);
      await load();
      onChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setBusyKey(null);
    }
  };

  // Replaces an already-uploaded single-file document type in one step —
  // removes the old row first so re-uploading never leaves two rows for
  // the same type.
  const handleReplace = async (documentType: string, existingDocumentId: number, file: File | undefined) => {
    if (!file) return;
    setBusyKey(`upload:${documentType}`);
    setError('');
    try {
      await apiService.deleteDocument(existingDocumentId);
      await apiService.uploadDocument(documentType, file);
      await load();
      onChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to replace document');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Loading documents...</p>;
  }

  const otherRequiredTypes = requiredTypes.filter((t) => t !== VALID_ID_TYPE);

  return (
    <div>
      {error && <p style={{ color: '#DC2626', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {otherRequiredTypes.map((documentType) => {
          const existing = uploaded.find((u) => u.documentType === documentType);
          return (
            <div
              key={documentType}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}
            >
              <div>
                <div>{documentType}</div>
                {existing && <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.15rem' }}>{existing.fileName}</div>}
              </div>
              {existing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => handleView(existing.id)}>
                    View File
                  </button>
                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                    {busyKey === `upload:${documentType}` ? 'Uploading...' : 'Upload File'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      disabled={busyKey === `upload:${documentType}` || busyKey === `delete:${existing.id}`}
                      onChange={(e) => handleReplace(documentType, existing.id, e.target.files?.[0])}
                    />
                  </label>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={busyKey === `delete:${existing.id}` || busyKey === `upload:${documentType}`}
                    onClick={() => handleDelete(existing.id)}
                  >
                    Remove
                  </button>
                </span>
              ) : (
                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                  {busyKey === `upload:${documentType}` ? 'Uploading...' : 'Upload File'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    disabled={busyKey === `upload:${documentType}`}
                    onChange={(e) => handleUpload(documentType, e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileDocuments;
