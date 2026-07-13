import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Scholar, Grade, Renewal, Allowance, Violation } from '../types';

const SCHOLAR_STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-secondary',
  graduated: 'badge-primary',
  terminated: 'badge-error'
};

const RENEWAL_STATUS_BADGE: Record<string, string> = {
  pending: 'badge-warning',
  under_review: 'badge-primary',
  approved: 'badge-success',
  rejected: 'badge-error'
};

const ALLOWANCE_STATUS_BADGE: Record<string, string> = {
  pending: 'badge-warning',
  released: 'badge-success',
  cancelled: 'badge-error'
};

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Shown on the student dashboard once their application has been approved
 * and a Scholar record exists for them. Read-only except for requesting a
 * renewal, which the student initiates themselves.
 */
const MyScholarshipPanel = () => {
  const [scholar, setScholar] = useState<Scholar | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renewalYear, setRenewalYear] = useState('');
  const [renewalSemester, setRenewalSemester] = useState('');
  const [submittingRenewal, setSubmittingRenewal] = useState(false);

  const load = async () => {
    try {
      const record = await apiService.getMyScholarRecord();
      setScholar(record);

      if (record) {
        const [gradeList, renewalList, allowanceList, violationList] = await Promise.all([
          apiService.getGrades(record.id),
          apiService.getRenewals(record.id),
          apiService.getAllowances(record.id),
          apiService.getViolations(record.id)
        ]);
        setGrades(gradeList);
        setRenewals(renewalList);
        setAllowances(allowanceList);
        setViolations(violationList);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scholarship record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scholar || !renewalYear || !renewalSemester) return;
    setSubmittingRenewal(true);
    setError('');
    try {
      await apiService.requestRenewal(scholar.id, { academicYear: renewalYear, semester: renewalSemester });
      setRenewalYear('');
      setRenewalSemester('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to request renewal');
    } finally {
      setSubmittingRenewal(false);
    }
  };

  if (loading) return null;
  if (!scholar) return null;

  return (
    <section style={{ marginBottom: '3rem' }}>
      <div className="card">
        <div className="card-header">
          <h3>My Scholarship</h3>
          <span className={`badge ${SCHOLAR_STATUS_BADGE[scholar.status] ?? 'badge-secondary'}`}>{scholar.status}</span>
        </div>

        {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

        <p style={{ marginBottom: '1.5rem' }}>
          <strong>{scholar.scholarshipName}</strong>
          {scholar.scholarIdNumber && (
            <span style={{ color: '#6B7280' }}> — Scholar ID: {scholar.scholarIdNumber}</span>
          )}
        </p>

        <div className="grid grid-2">
          <div>
            <strong style={{ fontSize: '0.9rem' }}>Grades</strong>
            {grades.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.5rem' }}>No grades recorded yet.</p>
            ) : (
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
                {grades.map((grade) => (
                  <li key={grade.id}>
                    {grade.academicYear} {grade.semester}: GPA {grade.gpa}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <strong style={{ fontSize: '0.9rem' }}>Allowances</strong>
            {allowances.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.5rem' }}>No allowances recorded yet.</p>
            ) : (
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
                {allowances.map((allowance) => (
                  <li key={allowance.id}>
                    {allowance.academicYear} {allowance.semester}: ₱{allowance.amount.toLocaleString()}{' '}
                    <span className={`badge ${ALLOWANCE_STATUS_BADGE[allowance.status] ?? 'badge-secondary'}`}>
                      {allowance.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {violations.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <strong style={{ fontSize: '0.9rem' }}>Compliance Notes</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
              {violations.map((violation) => (
                <li key={violation.id}>
                  {violation.violationType}: {violation.description} ({violation.resolved ? 'resolved' : 'open'})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
          <strong style={{ fontSize: '0.9rem' }}>Renewals</strong>
          {renewals.length > 0 && (
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
              {renewals.map((renewal) => (
                <li key={renewal.id}>
                  {renewal.academicYear} {renewal.semester} — submitted {formatDate(renewal.submissionDate)}{' '}
                  <span className={`badge ${RENEWAL_STATUS_BADGE[renewal.status] ?? 'badge-secondary'}`}>
                    {renewal.status}
                  </span>
                  {renewal.notes && <div style={{ color: '#6B7280' }}>{renewal.notes}</div>}
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleRequestRenewal}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '1rem', flexWrap: 'wrap' }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="renewalYear">Academic Year</label>
              <input
                id="renewalYear"
                placeholder="2025-2026"
                value={renewalYear}
                onChange={(e) => setRenewalYear(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="renewalSemester">Semester</label>
              <input
                id="renewalSemester"
                placeholder="1st Semester"
                value={renewalSemester}
                onChange={(e) => setRenewalSemester(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={submittingRenewal}>
              {submittingRenewal ? 'Submitting...' : 'Request Renewal'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default MyScholarshipPanel;
