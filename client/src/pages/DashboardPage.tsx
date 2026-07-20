import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardStats } from '../types';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    apiService
      .getDashboardStats()
      .then(setStats)
      .catch((err) => setStatsError(err.message || 'Failed to load dashboard stats'));
  }, []);

  const statCards = [
    { label: 'Total Scholars', value: stats?.totalScholars ?? 0, icon: '👥', color: '#8B5CF6' },
    { label: 'Pending Applications', value: stats?.pendingApplications ?? 0, icon: '⏳', color: '#EC4899' },
    { label: 'Approved', value: stats?.approvedApplications ?? 0, icon: '✅', color: '#10B981' },
    { label: 'Renewals Due', value: stats?.renewalsDue ?? 0, icon: '🔄', color: '#F59E0B' }
  ];

  const applicantCategoryCards = [
    { label: 'Senior High Applicants', value: stats?.seniorHighApplicants ?? 0, icon: '🎒', color: '#3B82F6' },
    { label: 'College Applicants', value: stats?.collegeApplicants ?? 0, icon: '🎓', color: '#8B5CF6' },
    { label: 'Special Course Applicants', value: stats?.specialCourseApplicants ?? 0, icon: '📘', color: '#EC4899' },
    { label: 'ALS Applicants', value: stats?.alsApplicants ?? 0, icon: '📗', color: '#10B981' }
  ];

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Dashboard</div>
        <div className="navbar-actions">
          <div className="user-menu">
            <span>👤</span>
            <span>{user ? `${user.firstName} ${user.lastName}` : ''}</span>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Welcome back, {user?.firstName}</h1>
          <p>Here's what's happening with your scholarships today</p>
        </div>

        {statsError && (
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
            {statsError}
          </div>
        )}

        {/* Key Metrics */}
        <section style={{ marginBottom: '3rem' }}>
          <div className="stats">
            {statCards.map((item) => (
              <div className="stat" key={item.label}>
                <div className="stat-icon" style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}BB)` }}>
                  {item.icon}
                </div>
                <h3>{item.value.toLocaleString()}</h3>
                <p>{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Applicants by Category */}
        <section style={{ marginBottom: '3rem' }}>
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <h3>Applicants by Category</h3>
          </div>
          <div className="stats">
            {applicantCategoryCards.map((item) => (
              <div className="stat" key={item.label}>
                <div className="stat-icon" style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}BB)` }}>
                  {item.icon}
                </div>
                <h3>{item.value.toLocaleString()}</h3>
                <p>{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <div className="card">
            <div className="card-header">
              <h3>Quick Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                onClick={() => navigate('/applications')}
                style={{
                  padding: '1rem',
                  background: 'rgba(139, 92, 246, 0.05)',
                  border: '2px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#1F2937',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>📝</span>
                  <span>Review Applications</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.5rem 0 0 0' }}>
                  Applications awaiting a decision
                </p>
              </button>
              <button
                onClick={() => navigate('/scholars')}
                style={{
                  padding: '1rem',
                  background: 'rgba(236, 72, 153, 0.05)',
                  border: '2px solid rgba(236, 72, 153, 0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#1F2937',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>👥</span>
                  <span>Manage Scholars & Renewals</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.5rem 0 0 0' }}>
                  Grades, allowances, and pending renewal requests
                </p>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
