import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Application, ApplicationStatus, ScholarshipProgram } from '../types';
import ApplicationDocuments from '../components/ApplicationDocuments';
import MyScholarshipPanel from '../components/MyScholarshipPanel';
import ApplyModal from '../components/ApplyModal';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  [ApplicationStatus.DRAFT]: 'Draft',
  [ApplicationStatus.SUBMITTED]: 'Submitted',
  [ApplicationStatus.UNDER_REVIEW]: 'Under Review',
  [ApplicationStatus.DOCUMENT_VERIFICATION]: 'Document Verification',
  [ApplicationStatus.INTERVIEW]: 'Interview',
  [ApplicationStatus.APPROVED]: 'Approved',
  [ApplicationStatus.REJECTED]: 'Rejected',
  [ApplicationStatus.NEEDS_REVISION]: 'Needs Revision'
};

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  [ApplicationStatus.DRAFT]: 'badge-secondary',
  [ApplicationStatus.SUBMITTED]: 'badge-primary',
  [ApplicationStatus.UNDER_REVIEW]: 'badge-primary',
  [ApplicationStatus.DOCUMENT_VERIFICATION]: 'badge-warning',
  [ApplicationStatus.INTERVIEW]: 'badge-warning',
  [ApplicationStatus.APPROVED]: 'badge-success',
  [ApplicationStatus.REJECTED]: 'badge-error',
  [ApplicationStatus.NEEDS_REVISION]: 'badge-warning'
};

function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const MyApplicationPage = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [scholarships, setScholarships] = useState<ScholarshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [applyingTo, setApplyingTo] = useState<ScholarshipProgram | null>(null);

  const loadData = async () => {
    setError('');
    try {
      const [applicationsResult, scholarshipsResult] = await Promise.all([
        apiService.getApplications({ pageSize: 50 }),
        apiService.getScholarships(1, 50)
      ]);
      setApplications(applicationsResult.data);
      setScholarships(scholarshipsResult.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplySuccess = () => {
    setApplyingTo(null);
    loadData();
  };

  const handleSubmit = async (applicationId: number) => {
    setBusyId(applicationId);
    setError('');
    try {
      await apiService.submitApplication(applicationId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setBusyId(null);
    }
  };

  const appliedScholarshipIds = new Set(applications.map((a) => a.scholarshipId));
  const availableScholarships = scholarships.filter(
    (s) => s.status === 'active' && !appliedScholarshipIds.has(s.id)
  );

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">My Application</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Welcome, {user?.firstName}</h1>
          <p>Apply for scholarships and track your application status here.</p>
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

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <MyScholarshipPanel />

            <section style={{ marginBottom: '3rem' }}>
              <div className="card">
                <div className="card-header">
                  <h3>My Applications</h3>
                </div>

                {applications.length === 0 ? (
                  <p style={{ color: '#6B7280' }}>
                    You haven't applied to any scholarship yet. Browse open programs below.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {applications.map((application) => (
                      <div
                        key={application.id}
                        style={{
                          padding: '1rem',
                          background: 'rgba(139, 92, 246, 0.05)',
                          borderRadius: '12px',
                          borderLeft: '3px solid #8B5CF6'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <strong style={{ color: '#1F2937' }}>{application.scholarshipName ?? `Scholarship #${application.scholarshipId}`}</strong>
                            <div style={{ marginTop: '0.35rem' }}>
                              <span className={`badge ${STATUS_BADGE[application.status]}`}>
                                {STATUS_LABEL[application.status]}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#6B7280' }}>
                            <div>Applied: {formatDate(application.createdAt)}</div>
                            {application.submissionDate && <div>Submitted: {formatDate(application.submissionDate)}</div>}
                          </div>
                        </div>

                        {application.comments && (
                          <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#6B7280' }}>
                            <strong>Reviewer note:</strong> {application.comments}
                          </p>
                        )}

                        {(application.status === ApplicationStatus.DRAFT ||
                          application.status === ApplicationStatus.NEEDS_REVISION) && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: '1rem' }}
                            disabled={busyId === application.id}
                            onClick={() => handleSubmit(application.id)}
                          >
                            {busyId === application.id ? 'Submitting...' : 'Submit Application'}
                          </button>
                        )}

                        <ApplicationDocuments applicationId={application.id} scholarshipId={application.scholarshipId} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="card">
                <div className="card-header">
                  <h3>Available Scholarships</h3>
                </div>

                {availableScholarships.length === 0 ? (
                  <p style={{ color: '#6B7280' }}>No open scholarships available to apply to right now.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {availableScholarships.map((scholarship) => (
                      <div
                        key={scholarship.id}
                        style={{
                          padding: '1rem',
                          border: '1px solid rgba(139, 92, 246, 0.15)',
                          borderRadius: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#1F2937' }}>{scholarship.name}</strong>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#6B7280' }}>
                            {scholarship.benefits}
                          </p>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => setApplyingTo(scholarship)}>
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {applyingTo && (
        <ApplyModal scholarship={applyingTo} onClose={() => setApplyingTo(null)} onSuccess={handleApplySuccess} />
      )}
    </div>
  );
};

export default MyApplicationPage;
