import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { UploadedDocument } from '../types';

const VALID_ID_TYPE = 'Valid ID';
const VALID_ID_MAX_FILES = 5;

interface Props {
  onChange?: () => void;
}

/**
 * Inline photo upload for the applicant's ID, placed between the ID Type
 * and ID Number fields (Section I) rather than down in the general
 * Documentary Requirements checklist — same "Valid ID" document type
 * under the hood, so it's the same data either way.
 */
const ValidIdUpload = ({ onChange }: Props) => {
  const [uploaded, setUploaded] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    try {
      const docs = await apiService.getMyProfileDocuments();
      setUploaded(docs.filter((d) => d.documentType === VALID_ID_TYPE));
    } catch (err: any) {
      setError(err.message || 'Failed to load ID photos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusyKey('upload');
    setError('');
    try {
      await apiService.uploadDocument(VALID_ID_TYPE, file);
      await load();
      onChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to upload ID photo');
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
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err: any) {
      setError(err.message || 'Failed to open ID photo');
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
      setError(err.message || 'Failed to remove ID photo');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Loading...</p>;
  }

  return (
    <div className="form-group">
      {error && <p style={{ color: '#DC2626', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <label style={{ margin: 0 }}>
          Upload Photo of ID ({uploaded.length}/{VALID_ID_MAX_FILES})
        </label>
        <label
          className="btn btn-outline btn-sm"
          style={{
            cursor: uploaded.length < VALID_ID_MAX_FILES ? 'pointer' : 'not-allowed',
            opacity: uploaded.length < VALID_ID_MAX_FILES ? 1 : 0.5,
            margin: 0
          }}
        >
          {busyKey === 'upload' ? 'Uploading...' : 'Add File'}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            disabled={uploaded.length >= VALID_ID_MAX_FILES || busyKey === 'upload'}
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </label>
      </div>
      {uploaded.map((doc) => (
        <div
          key={doc.id}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}
        >
          <span style={{ color: '#6B7280' }}>{doc.fileName}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={() => handleView(doc.id)}>
              View File
            </button>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              disabled={busyKey === `delete:${doc.id}`}
              onClick={() => handleDelete(doc.id)}
            >
              Remove
            </button>
          </span>
        </div>
      ))}
    </div>
  );
};

export default ValidIdUpload;
