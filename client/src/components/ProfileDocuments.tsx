import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { UploadedDocument, DocumentVerificationStatus } from '../types';
import { REQUIRED_PROFILE_DOCUMENT_TYPES } from '../constants/profileOptions';

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

const VALID_ID_TYPE = 'Valid ID';
const VALID_ID_MAX_FILES = 5;

interface Props {
  onChange?: () => void;
}

/**
 * Uploads here are profile-level (applicationId omitted) — once uploaded,
 * they're reused across every scholarship application, no re-upload
 * needed. "Valid ID" is the one type that allows up to 5 files instead
 * of just one.
 */
const ProfileDocuments = ({ onChange }: Props) => {
  const [uploaded, setUploaded] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    try {
      const docs = await apiService.getMyProfileDocuments();
      setUploaded(docs);
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

  if (loading) {
    return <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Loading documents...</p>;
  }

  const validIdDocs = uploaded.filter((u) => u.documentType === VALID_ID_TYPE);
  const otherRequiredTypes = REQUIRED_PROFILE_DOCUMENT_TYPES.filter((t) => t !== VALID_ID_TYPE);

  return (
    <div>
      {error && <p style={{ color: '#DC2626', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {/* Valid ID: up to 5 files */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>
              {VALID_ID_TYPE} ({validIdDocs.length}/{VALID_ID_MAX_FILES})
            </span>
            <label
              className="btn btn-outline btn-sm"
              style={{
                cursor: validIdDocs.length < VALID_ID_MAX_FILES ? 'pointer' : 'not-allowed',
                opacity: validIdDocs.length < VALID_ID_MAX_FILES ? 1 : 0.5,
                margin: 0
              }}
            >
              {busyKey === `upload:${VALID_ID_TYPE}` ? 'Uploading...' : 'Add File'}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                disabled={validIdDocs.length >= VALID_ID_MAX_FILES || busyKey === `upload:${VALID_ID_TYPE}`}
                onChange={(e) => handleUpload(VALID_ID_TYPE, e.target.files?.[0])}
              />
            </label>
          </div>
          {validIdDocs.map((doc) => (
            <div
              key={doc.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', paddingLeft: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}
            >
              <span style={{ color: '#6B7280' }}>{doc.fileName}</span>
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

        {/* Every other required document type: single file */}
        {otherRequiredTypes.map((documentType) => {
          const existing = uploaded.find((u) => u.documentType === documentType);
          return (
            <div
              key={documentType}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}
            >
              <span>{documentType}</span>
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
                  {busyKey === `upload:${documentType}` ? 'Uploading...' : 'Upload'}
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
