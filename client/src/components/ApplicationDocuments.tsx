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
 * uploads for that application, with an inline upload control for
 * anything not yet uploaded.
 */
const ApplicationDocuments = ({ applicationId, scholarshipId }: Props) => {
  const [required, setRequired] = useState<RequiredDocument[]>([]);
  const [uploaded, setUploaded] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingType, setUploadingType] = useState<string | null>(null);

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

  const handleFileChange = async (documentType: string, file: File | undefined) => {
    if (!file) return;
    setUploadingType(documentType);
    setError('');
    try {
      await apiService.uploadDocument(applicationId, documentType, file);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploadingType(null);
    }
  };

  if (loading) {
    return <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.75rem' }}>Loading documents...</p>;
  }

  if (required.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
      <strong style={{ fontSize: '0.85rem' }}>Required Documents</strong>
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
                <span className={`badge ${VERIFICATION_BADGE[existing.verificationStatus]}`}>
                  {VERIFICATION_LABEL[existing.verificationStatus]}
                </span>
              ) : (
                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                  {uploadingType === doc.documentType ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    disabled={uploadingType === doc.documentType}
                    onChange={(e) => handleFileChange(doc.documentType, e.target.files?.[0])}
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

export default ApplicationDocuments;
