import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Scholar, Grade, Renewal, Allowance, Violation, User, UserRole, UserStatus, Applicant } from '../types';
import ApplicantProfileView from '../components/ApplicantProfileView';

const ASSIGNABLE_ROLES = [UserRole.APPLICANT, UserRole.ADMIN];
const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.APPLICANT]: 'Student',
  [UserRole.GUEST]: 'Guest'
};

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
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const [scholar, setScholar] = useState<Scholar | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [account, setAccount] = useState<User | null>(null);
  const [profile, setProfile] = useState<Applicant | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

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

      if (isSuperAdmin) {
        try {
          setAccount(await apiService.getUser(scholarRecord.userId));
        } catch {
          // Non-fatal — the Account card just won't render.
        }
      }

      try {
        setProfile(await apiService.getApplicantProfileByUserId(scholarRecord.userId));
      } catch (err: any) {
        setError(err.message || 'Failed to load applicant profile');
      } finally {
        setProfileLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scholar');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (role: UserRole) => {
    if (!account) return;
    setAccountBusy(true);
    setError('');
    try {
      setAccount(await apiService.updateUserAccount(account.id, { role }));
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setAccountBusy(false);
    }
  };

  const handleToggleAccountStatus = async () => {
    if (!account) return;
    setAccountBusy(true);
    setError('');
    try {
      const nextStatus = account.status === UserStatus.ACTIVE ? UserStatus.DEACTIVATED : UserStatus.ACTIVE;
      setAccount(await apiService.updateUserAccount(account.id, { status: nextStatus }));
    } catch (err: any) {
      setError(err.message || 'Failed to update account status');
    } finally {
      setAccountBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!account) return;
    if (!window.confirm(`Reset ${account.email}'s password? Their current password will stop working immediately.`)) {
      return;
    }
    setAccountBusy(true);
    setError('');
    setTemporaryPassword('');
    try {
      const result = await apiService.resetUserPassword(account.id);
      setTemporaryPassword(result.temporaryPassword);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setAccountBusy(false);
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

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3>Profile</h3>
          </div>
          <ApplicantProfileView profile={profile} loading={profileLoading} email={scholar.studentEmail} />
        </div>

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

          {isSuperAdmin && account && (
            <div className="card">
              <div className="card-header">
                <h3>Account</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: '0 0 1rem' }}>{account.email}</p>

              <div className="form-group">
                <label htmlFor="accountRole">Role</label>
                <select
                  id="accountRole"
                  value={account.role}
                  disabled={accountBusy}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                <span>
                  Account status:{' '}
                  <span className={`badge ${account.status === UserStatus.ACTIVE ? 'badge-success' : 'badge-error'}`}>
                    {account.status}
                  </span>
                </span>
                <button className="btn btn-outline btn-sm" disabled={accountBusy} onClick={handleToggleAccountStatus}>
                  {account.status === UserStatus.ACTIVE ? 'Disable Account' : 'Re-enable Account'}
                </button>
              </div>

              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                <button className="btn btn-outline btn-sm" disabled={accountBusy} onClick={handleResetPassword}>
                  Reset Password
                </button>
                {temporaryPassword && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem'
                    }}
                  >
                    New temporary password (share this with the student now — it won't be shown again):
                    <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600, marginTop: '0.4rem', userSelect: 'all' }}>
                      {temporaryPassword}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScholarDetailPage;
