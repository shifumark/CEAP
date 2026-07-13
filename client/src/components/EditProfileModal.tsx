import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import Modal from './Modal';

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'];

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Lets a student edit the school/year/course/address info attached to
 * their applicant profile after the fact — this data is shared across
 * all of their applications, not per-application.
 */
const EditProfileModal = ({ onClose, onSuccess }: Props) => {
  const [schoolName, setSchoolName] = useState('');
  const [yearLevel, setYearLevel] = useState(YEAR_LEVELS[0]);
  const [courseName, setCourseName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiService
      .getMyProfile()
      .then((profile) => {
        setSchoolName(profile.schoolName ?? '');
        setYearLevel(profile.yearLevel ?? YEAR_LEVELS[0]);
        setCourseName(profile.courseName ?? '');
        setAddress(profile.address ?? '');
      })
      .catch((err) => setError(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiService.updateMyProfile({ schoolName, yearLevel, courseName, address });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit My Information" onClose={onClose}>
      {loading ? (
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
            <label htmlFor="editSchoolName">School</label>
            <input id="editSchoolName" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required autoFocus />
          </div>

          <div className="form-group">
            <label htmlFor="editYearLevel">Year Level</label>
            <select id="editYearLevel" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
              {YEAR_LEVELS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="editCourseName">Course / Program</label>
            <input id="editCourseName" value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="editAddress">Current Address</label>
            <input id="editAddress" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn btn-outline" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EditProfileModal;
