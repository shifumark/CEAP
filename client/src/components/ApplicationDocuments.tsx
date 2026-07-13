import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { RequiredDocument, UploadedDocument, DocumentVerificationStatus } from '../types';

const VERIFICATION_LABEL: Record<DocumentVerificationStatus, string> = {
  [DocumentVerificationStatus.PENDING]: 'Pending review',
  [DocumentVerificationStatus.VERIFIED]: 'Verified',
  [DocumentVerificationStatus.REJECTED]: 'Rejected',
  [DocumentVerificationStatus.REQUESTING_REVISION]: 'Revision requested'
};

const VERIFICATION_BADGE: Record<DocumentVerificationStatus, string> = {
  [DocumentVerificationStatus.PENDING]: 'badge-warning',
  [DocumentVerificationStatus.VERIFIED]: 'badge-success',
  [DocumentVerificationStatus.REJECTED]: 'badge-error',
  [DocumentVerificationStatus.REQUESTING_REVISION]: 'badge-warning'
};

interface Props {
  applicationId: number;
  scholarshipId: number;
}

/**
 * Shows a scholarship's required documents next to the student's own
 * uploads for that application, with an upload control for anything not
 * yet uploaded — plus a general "upload anything else" control that
 * isn't gated behind the scholarship having required documents
 * configured, and a delete button on every uploaded file.
 */
const ApplicationDocuments = ({ applicationId, scholarshipId }: Props) => {
  const [required, setRequired] = useState<RequiredDocument[]>([]);
  const [uploaded, setUploaded] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [extraType, setExtraType] = useState('');

  const load = async () => {
    try {
      const [requiredDocs, uploadedDocs] = await Promise.all([
        apiService.getRequiredDocuments(scholarshipId),
        apiService.getApplicationDocuments(applicationId)
      ]);
      setRequired(requiredDocs);
      setUploaded(uploadedDocs);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, scholarshipId]);

  const handleUpload = async (documentType: string, file: File | undefined) => {
    if (!file || !documentType.trim()) return;
    setBusyKey(`upload:${documentType}`);
    setError('');
    try {
      await apiService.uploadDocument(applicationId, documentType, file);
      setExtraType('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDelete = async (documentId: number) => {
    setBusyKey(`delete:${documentId}`);
    setError('');
    try {
      await apiService.deleteDocument(documentId);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.75rem' }}>Loading documents...</p>;
  }

  const requiredTypes = new Set(required.map((d) => d.documentType));
  const extraDocs = uploaded.filter((u) => !requiredTypes.has(u.documentType ?? ''));

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
      <strong style={{ fontSize: '0.85rem' }}>Documents</strong>
      {error && <p style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
        {required.map((doc) => {
          const existing = uploaded.find((u) => u.documentType === doc.documentType);
          return (
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
              <span>
                {doc.documentType}
                {!doc.isRequired && ' (optional)'}
              </span>
              {existing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${VERIFICATION_BADGE[existing.verificationStatus]}`}>
                    {VERIFICATION_LABEL[existing.verificationStatus]}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={busyKey === `delete:${existing.id}`}
                    onClick={() => handleDelete(existing.id)}
                  >
                    Remove
                  </button>
                </span>
              ) : (
                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                  {busyKey === `upload:${doc.documentType}` ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    disabled={busyKey === `upload:${doc.documentType}`}
                    onChange={(e) => handleUpload(doc.documentType, e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          );
        })}

        {extraDocs.map((doc) => (
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
            <span>{doc.documentType ?? doc.fileName}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge ${VERIFICATION_BADGE[doc.verificationStatus]}`}>
                {VERIFICATION_LABEL[doc.verificationStatus]}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={busyKey === `delete:${doc.id}`}
                onClick={() => handleDelete(doc.id)}
              >
                Remove
              </button>
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <input
          placeholder="Document name (e.g. Grades, Barangay Certificate)"
          value={extraType}
          onChange={(e) => setExtraType(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <label
          className="btn btn-outline btn-sm"
          style={{ cursor: extraType.trim() ? 'pointer' : 'not-allowed', opacity: extraType.trim() ? 1 : 0.5, margin: 0 }}
        >
          {busyKey === `upload:${extraType}` ? 'Uploading...' : 'Upload File'}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            disabled={!extraType.trim() || busyKey === `upload:${extraType}`}
            onChange={(e) => handleUpload(extraType, e.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  );
};

export default ApplicationDocuments;
