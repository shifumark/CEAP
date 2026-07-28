import { useState } from 'react';
import { apiService } from '../services/api';
import { ScholarshipProgram } from '../types';
import Modal from './Modal';
import ProfileDocuments from './ProfileDocuments';

interface Props {
  scholarship: ScholarshipProgram;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Just creates the draft application. School, course, address, and year
 * level all moved to the full Profile page — collecting them here too
 * was redundant, since the completeness gate already requires them there
 * before the application can be submitted.
 */
const ApplyModal = ({ scholarship, onClose, onSuccess }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      await apiService.createApplication(scholarship.id);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Apply: ${scholarship.name}`} onClose={onClose}>
      {error && (
        <div className="alert-error" style={{ padding: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <p style={{ color: '#B9AFDA' }}>
        This creates a draft application for <strong>{scholarship.name}</strong>. Complete your profile and upload
        the required documents before submitting it for review.
      </p>

      <div style={{ marginBottom: '1.25rem' }}>
        <strong style={{ fontSize: '0.85rem' }}>Documents</strong>
        <p style={{ fontSize: '0.8rem', color: '#B9AFDA', margin: '0.25rem 0 0.6rem' }}>
          Upload any missing document here — it's saved to your profile, so it's reused for every application and
          also appears under "VIII. Documentary Requirements" on your Profile page.
        </p>
        <ProfileDocuments />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <button className="btn btn-primary" type="button" disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'Applying...' : 'Apply'}
        </button>
        <button className="btn btn-outline" type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default ApplyModal;
