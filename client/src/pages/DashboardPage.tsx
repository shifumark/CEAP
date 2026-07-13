const stats = [
  { label: 'Total Scholars', value: '1,248', icon: '👥', color: '#8B5CF6' },
  { label: 'Pending Applications', value: '84', icon: '⏳', color: '#EC4899' },
  { label: 'Approved', value: '612', icon: '✅', color: '#10B981' },
  { label: 'Renewals Due', value: '37', icon: '🔄', color: '#F59E0B' }
];

const activities = [
  { id: 1, title: 'Application #1042 Status Updated', description: 'Moved to Under Review', time: '2 hours ago', icon: '📋' },
  { id: 2, title: 'New Announcement', description: 'Scholarship renewal period extended', time: '4 hours ago', icon: '📢' },
  { id: 3, title: 'Document Verified', description: 'Maria Santos - Final transcript', time: '1 day ago', icon: '✓' },
  { id: 4, title: 'Scholarship Awarded', description: '45 new scholars approved', time: '2 days ago', icon: '🎓' },
];

const DashboardPage = () => {
  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Dashboard</div>
        <div className="navbar-actions">
          <div className="user-menu">
            <span>👤</span>
            <span>John Admin</span>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Welcome back, John</h1>
          <p>Here's what's happening with your scholarships today</p>
        </div>

        {/* Key Metrics */}
        <section style={{ marginBottom: '3rem' }}>
          <div className="stats">
            {stats.map((item) => (
              <div className="stat" key={item.label}>
                <div className="stat-icon" style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}BB)` }}>
                  {item.icon}
                </div>
                <h3>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Main Content Grid */}
        <section style={{ marginBottom: '3rem' }}>
          <div className="grid grid-2">
            {/* Activity Feed */}
            <div className="card">
              <div className="card-header">
                <h3>Recent Activity</h3>
                <a href="/applications" style={{ color: '#8B5CF6', fontSize: '0.9rem', fontWeight: 500 }}>View all →</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activities.map((activity) => (
                  <div key={activity.id} style={{
                    padding: '1rem',
                    background: 'rgba(139, 92, 246, 0.05)',
                    borderRadius: '12px',
                    borderLeft: '3px solid #8B5CF6'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>{activity.icon}</span>
                          <strong style={{ color: '#1F2937' }}>{activity.title}</strong>
                        </div>
                        <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>{activity.description}</p>
                      </div>
                      <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <div className="card-header">
                <h3>Quick Actions</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button style={{
                  padding: '1rem',
                  background: 'rgba(139, 92, 246, 0.05)',
                  border: '2px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#1F2937',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>👥</span>
                    <span>Review 5 Pending Documents</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.5rem 0 0 0' }}>
                    Documents awaiting verification
                  </p>
                </button>
                <button style={{
                  padding: '1rem',
                  background: 'rgba(236, 72, 153, 0.05)',
                  border: '2px solid rgba(236, 72, 153, 0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#1F2937',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>✉️</span>
                    <span>Approve 3 Renewals</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.5rem 0 0 0' }}>
                    Due by Friday
                  </p>
                </button>
                <button style={{
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '2px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#1F2937',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📊</span>
                    <span>View Performance Report</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.5rem 0 0 0' }}>
                    Monthly scholarship metrics
                  </p>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Section */}
        <section>
          <div className="card">
            <div className="card-header">
              <h3>Program Progress</h3>
            </div>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {[
                { name: 'STEM Excellence Scholarship', filled: 85, total: 100 },
                { name: 'Arts & Humanities Award', filled: 62, total: 80 },
                { name: 'Student Athlete Grant', filled: 45, total: 50 }
              ].map((prog) => (
                <div key={prog.name}>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500, color: '#1F2937' }}>{prog.name}</span>
                    <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>{prog.filled}/{prog.total} filled</span>
                  </div>
                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${(prog.filled / prog.total) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
