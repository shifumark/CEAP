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

interface PanelProps {
  scholar: Scholar;
  // From the parent's Applicant profile — a locked profile also blocks
  // requesting a renewal, not just editing the profile itself.
  profileLocked: boolean;
}

/**
 * One scholarship's card — grades, allowances, compliance notes, and
 * renewal history/request form, all scoped to this single Scholar
 * record. A student can hold more than one (see MyScholarshipPanel
 * below), each rendered independently since their grades/renewals/etc.
 * are entirely separate per program.
 */
const SingleScholarshipPanel = ({ scholar, profileLocked }: PanelProps) => {
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
      const [gradeList, renewalList, allowanceList, violationList] = await Promise.all([
        apiService.getGrades(scholar.id),
        apiService.getRenewals(scholar.id),
        apiService.getAllowances(scholar.id),
        apiService.getViolations(scholar.id)
      ]);
      setGrades(gradeList);
      setRenewals(renewalList);
      setAllowances(allowanceList);
      setViolations(violationList);
    } catch (err: any) {
      setError(err.message || 'Failed to load scholarship record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scholar.id]);

  const handleRequestRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewalYear || !renewalSemester) return;
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

  const canRequestRenewal = !profileLocked && scholar.scholarshipStatus === 'active';

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <h3>{scholar.scholarshipName ?? 'My Scholarship'}</h3>
        <span className={`badge ${SCHOLAR_STATUS_BADGE[scholar.status] ?? 'badge-secondary'}`}>{scholar.status}</span>
      </div>

      {error && <p style={{ color: '#F87171', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

      {scholar.scholarIdNumber && (
        <p style={{ marginBottom: '1.5rem', color: '#B9AFDA' }}>Scholar ID: {scholar.scholarIdNumber}</p>
      )}

      {loading ? (
        <p style={{ fontSize: '0.85rem', color: '#B9AFDA' }}>Loading...</p>
      ) : (
        <>
          <div className="grid grid-2">
            <div>
              <strong style={{ fontSize: '0.9rem' }}>Grades</strong>
              {grades.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#B9AFDA', marginTop: '0.5rem' }}>No grades recorded yet.</p>
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
                <p style={{ fontSize: '0.85rem', color: '#B9AFDA', marginTop: '0.5rem' }}>No allowances recorded yet.</p>
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
                    {renewal.notes && <div style={{ color: '#B9AFDA' }}>{renewal.notes}</div>}
                  </li>
                ))}
              </ul>
            )}

            {canRequestRenewal ? (
              <form
                onSubmit={handleRequestRenewal}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '1rem', flexWrap: 'wrap' }}
              >
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor={`renewalYear-${scholar.id}`}>Academic Year</label>
                  <input
                    id={`renewalYear-${scholar.id}`}
                    placeholder="2025-2026"
                    value={renewalYear}
                    onChange={(e) => setRenewalYear(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor={`renewalSemester-${scholar.id}`}>Semester</label>
                  <input
                    id={`renewalSemester-${scholar.id}`}
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
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#B9AFDA', marginTop: '0.75rem' }}>
                {profileLocked
                  ? 'Renewal requests are unavailable while your profile is locked. Ask an administrator to unlock it.'
                  : 'Renewal requests are only open while this scholarship program is accepting them.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

interface Props {
  profileLocked: boolean;
}

/**
 * Shown on the student dashboard once at least one of their applications
 * has been approved and a Scholar record exists for them. A person can
 * hold a Scholar record in more than one program at once, so this
 * renders one independent card per record via SingleScholarshipPanel.
 */
const MyScholarshipPanel = ({ profileLocked }: Props) => {
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getMyScholarRecords()
      .then(setScholars)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (scholars.length === 0) return null;

  return (
    <section style={{ marginBottom: '3rem' }}>
      {scholars.length > 1 && <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>My Scholarships</h2>}
      {scholars.map((scholar) => (
        <SingleScholarshipPanel key={scholar.id} scholar={scholar} profileLocked={profileLocked} />
      ))}
    </section>
  );
};

export default MyScholarshipPanel;
