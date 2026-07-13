import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Scholar, Grade, Renewal, Allowance, Violation } from '../types';

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-secondary',
  graduated: 'badge-primary',
  terminated: 'badge-error',
  pending: 'badge-warning',
  under_review: 'badge-primary',
  approved: 'badge-success',
  rejected: 'badge-error',
  released: 'badge-success',
  cancelled: 'badge-error'
};

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const ScholarDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const scholarId = Number(id);

  const [scholar, setScholar] = useState<Scholar | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [gradeForm, setGradeForm] = useState({ academicYear: '', semester: '', gpa: '' });
  const [allowanceForm, setAllowanceForm] = useState({ academicYear: '', semester: '', amount: '' });
  const [violationForm, setViolationForm] = useState({
    violationType: '',
    description: '',
    severity: 'low',
    actionTaken: ''
  });

  const load = async () => {
    try {
      const [scholarRecord, gradeList, renewalList, allowanceList, violationList] = await Promise.all([
        apiService.getScholar(scholarId),
        apiService.getGrades(scholarId),
        apiService.getRenewals(scholarId),
        apiService.getAllowances(scholarId),
        apiService.getViolations(scholarId)
      ]);
      setScholar(scholarRecord);
      setGrades(gradeList);
      setRenewals(renewalList);
      setAllowances(allowanceList);
      setViolations(violationList);
    } catch (err: any) {
      setError(err.message || 'Failed to load scholar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scholarId]);

  const runAction = async (action: () => Promise<any>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    runAction(() =>
      apiService.submitGrade(scholarId, {
        academicYear: gradeForm.academicYear,
        semester: gradeForm.semester,
        gpa: parseFloat(gradeForm.gpa)
      })
    ).then(() => setGradeForm({ academicYear: '', semester: '', gpa: '' }));
  };

  const handleAddAllowance = (e: React.FormEvent) => {
    e.preventDefault();
    runAction(() =>
      apiService.createAllowance(scholarId, {
        academicYear: allowanceForm.academicYear,
        semester: allowanceForm.semester,
        amount: parseFloat(allowanceForm.amount)
      })
    ).then(() => setAllowanceForm({ academicYear: '', semester: '', amount: '' }));
  };

  const handleAddViolation = (e: React.FormEvent) => {
    e.preventDefault();
    runAction(() => apiService.createViolation(scholarId, violationForm)).then(() =>
      setViolationForm({ violationType: '', description: '', severity: 'low', actionTaken: '' })
    );
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!scholar) {
    return (
      <div className="container">
        <p>Scholar not found.</p>
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/scholars" style={{ color: 'inherit', textDecoration: 'none' }}>
            ← Scholars
          </Link>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>{scholar.studentName}</h1>
          <p>
            {scholar.scholarshipName} — Scholar ID: {scholar.scholarIdNumber ?? '—'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              color: '#DC2626'
            }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Grades</h3>
            </div>
            {grades.map((grade) => (
              <p key={grade.id} style={{ fontSize: '0.9rem' }}>
                {grade.academicYear} {grade.semester}: GPA {grade.gpa}
              </p>
            ))}
            <form onSubmit={handleAddGrade} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                placeholder="2025-2026"
                value={gradeForm.academicYear}
                onChange={(e) => setGradeForm({ ...gradeForm, academicYear: e.target.value })}
                required
                style={{ flex: 1, minWidth: '100px' }}
              />
              <input
                placeholder="1st Semester"
                value={gradeForm.semester}
                onChange={(e) => setGradeForm({ ...gradeForm, semester: e.target.value })}
                required
                style={{ flex: 1, minWidth: '100px' }}
              />
              <input
                placeholder="GPA"
                type="number"
                step="0.01"
                value={gradeForm.gpa}
                onChange={(e) => setGradeForm({ ...gradeForm, gpa: e.target.value })}
                required
                style={{ width: '80px' }}
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
                Add
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Allowances</h3>
            </div>
            {allowances.map((allowance) => (
              <div key={allowance.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span>
                  {allowance.academicYear} {allowance.semester}: ₱{allowance.amount.toLocaleString()}{' '}
                  <span className={`badge ${STATUS_BADGE[allowance.status] ?? 'badge-secondary'}`}>{allowance.status}</span>
                </span>
                {allowance.status === 'pending' && (
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={busy}
                    onClick={() => runAction(() => apiService.releaseAllowance(allowance.id))}
                  >
                    Release
                  </button>
                )}
              </div>
            ))}
            <form onSubmit={handleAddAllowance} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                placeholder="2025-2026"
                value={allowanceForm.academicYear}
                onChange={(e) => setAllowanceForm({ ...allowanceForm, academicYear: e.target.value })}
                required
                style={{ flex: 1, minWidth: '100px' }}
              />
              <input
                placeholder="1st Semester"
                value={allowanceForm.semester}
                onChange={(e) => setAllowanceForm({ ...allowanceForm, semester: e.target.value })}
                required
                style={{ flex: 1, minWidth: '100px' }}
              />
              <input
                placeholder="Amount"
                type="number"
                step="0.01"
                value={allowanceForm.amount}
                onChange={(e) => setAllowanceForm({ ...allowanceForm, amount: e.target.value })}
                required
                style={{ width: '100px' }}
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
                Add
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Renewals</h3>
            </div>
            {renewals.length === 0 ? (
              <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>No renewal requests yet.</p>
            ) : (
              renewals.map((renewal) => (
                <div key={renewal.id} style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {renewal.academicYear} {renewal.semester} — submitted {formatDate(renewal.submissionDate)}
                    </span>
                    <span className={`badge ${STATUS_BADGE[renewal.status] ?? 'badge-secondary'}`}>{renewal.status}</span>
                  </div>
                  {renewal.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => runAction(() => apiService.reviewRenewal(renewal.id, 'approved'))}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={busy}
                        onClick={() => runAction(() => apiService.reviewRenewal(renewal.id, 'rejected'))}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Violations</h3>
            </div>
            {violations.map((violation) => (
              <p key={violation.id} style={{ fontSize: '0.9rem' }}>
                <strong>{violation.violationType}</strong> ({violation.severity}): {violation.description}
              </p>
            ))}
            <form onSubmit={handleAddViolation} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                placeholder="Violation type"
                value={violationForm.violationType}
                onChange={(e) => setViolationForm({ ...violationForm, violationType: e.target.value })}
                required
              />
              <input
                placeholder="Description"
                value={violationForm.description}
                onChange={(e) => setViolationForm({ ...violationForm, description: e.target.value })}
                required
              />
              <select
                value={violationForm.severity}
                onChange={(e) => setViolationForm({ ...violationForm, severity: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input
                placeholder="Action taken"
                value={violationForm.actionTaken}
                onChange={(e) => setViolationForm({ ...violationForm, actionTaken: e.target.value })}
                required
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
                Record Violation
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScholarDetailPage;
