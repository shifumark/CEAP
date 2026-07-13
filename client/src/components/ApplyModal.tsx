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
 * Collects the applicant's school/year/course/address (saved to their
 * profile) and an optional grade/transcript file, then creates the
 * application in one step.
 */
const ApplyModal = ({ scholarship, onClose, onSuccess }: Props) => {
  const [schoolName, setSchoolName] = useState('');
  const [yearLevel, setYearLevel] = useState(YEAR_LEVELS[0]);
  const [courseName, setCourseName] = useState('');
  const [address, setAddress] = useState('');
  const [gradeFile, setGradeFile] = useState<File | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      await apiService.updateMyProfile({ schoolName, yearLevel, courseName, address });
      const application = await apiService.createApplication(scholarship.id);

      if (gradeFile) {
        await apiService.uploadDocument(application.id, 'Grades / Transcript', gradeFile);
      }

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
            <label htmlFor="schoolName">School</label>
            <input
              id="schoolName"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="yearLevel">Year Level</label>
            <select id="yearLevel" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
              {YEAR_LEVELS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="courseName">Course / Program</label>
            <input id="courseName" value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="address">Current Address</label>
            <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="gradeFile">Grades / Transcript (optional, PDF/JPG/PNG)</label>
            <input
              id="gradeFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setGradeFile(e.target.files?.[0] ?? null)}
            />
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
