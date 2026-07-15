import { useState } from 'react';
import { apiService } from '../services/api';
import { ScholarshipProgram } from '../types';
import Modal from './Modal';

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
        <div
          style={{
            padding: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            color: '#DC2626',
            fontSize: '0.9rem'
          }}
        >
          {error}
        </div>
      )}

      <p style={{ color: '#6B7280' }}>
        This creates a draft application for <strong>{scholarship.name}</strong>. Complete your profile and upload
        the required documents before submitting it for review.
      </p>

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
