import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { ScholarshipProgram } from '../types';
import Modal from './Modal';

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'];

interface Props {
  scholarship: ScholarshipProgram;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Creates the application and records the student's current year level.
 * School, course, and address moved to the full Profile page (Section
 * III/VI) — collecting them here too was redundant, since the completeness
 * gate already requires them there before the application can be submitted.
 */
const ApplyModal = ({ scholarship, onClose, onSuccess }: Props) => {
  const [yearLevel, setYearLevel] = useState(YEAR_LEVELS[0]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiService
      .getMyProfile()
      .then((profile) => {
        setYearLevel(profile.yearLevel ?? YEAR_LEVELS[0]);
      })
      .catch(() => {
        // No profile yet — the form just starts blank.
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await apiService.updateMyProfile({ yearLevel });
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
      {loadingProfile ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit}>
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

          <div className="form-group">
            <label htmlFor="yearLevel">Year Level</label>
            <select id="yearLevel" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} autoFocus>
              {YEAR_LEVELS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
            <button className="btn btn-outline" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ApplyModal;
