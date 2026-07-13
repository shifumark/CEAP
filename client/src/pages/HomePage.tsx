const HomePage = () => {
  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">
          <span style={{ fontSize: '1.5rem' }}>✨</span>
          <span>ScholarshipHub</span>
        </div>
        <div className="navbar-actions">
          <a className="btn btn-primary" href="/login">Access Portal</a>
        </div>
      </nav>

      <main className="container">
        {/* Hero Section */}
        <section className="hero">
          <div>
            <h1>Modern scholarship platform</h1>
            <p>Streamline applications, document verification, awards, and renewals in one elegant system.</p>
            <div className="hero-buttons">
              <a className="btn btn-primary btn-lg" href="/register">Apply Now</a>
              <a className="btn btn-primary btn-lg" href="/login" style={{ background: 'white', color: '#8B5CF6', textDecoration: 'none' }}>Sign In</a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '3rem', textAlign: 'center', color: '#1F2937' }}>
            Powerful features
          </h2>
          <div className="features">
            <div className="card" style={{ padding: '2rem' }}>
              <div className="feature-icon">📊</div>
              <h3>Role-Based Access</h3>
              <p>Separate interfaces for super admins, administrators, and scholarship applicants with secure permission management.</p>
            </div>
            <div className="card" style={{ padding: '2rem' }}>
              <div className="feature-icon">📄</div>
              <h3>Document Management</h3>
              <p>Secure upload, verification workflow, and organized document tracking for all scholarship requirements.</p>
            </div>
            <div className="card" style={{ padding: '2rem' }}>
              <div className="feature-icon">📈</div>
              <h3>Analytics & Reports</h3>
              <p>Real-time dashboards, performance metrics, and detailed reports for data-driven scholarship management.</p>
            </div>
            <div className="card" style={{ padding: '2rem' }}>
              <div className="feature-icon">🔔</div>
              <h3>Notifications</h3>
              <p>Real-time alerts and announcements keep all stakeholders informed about important updates and deadlines.</p>
            </div>
            <div className="card" style={{ padding: '2rem' }}>
              <div className="feature-icon">🎓</div>
              <h3>Scholarship Management</h3>
              <p>Create, manage, and track multiple scholarship programs with flexible eligibility requirements.</p>
            </div>
            <div className="card" style={{ padding: '2rem' }}>
              <div className="feature-icon">⚙️</div>
              <h3>System Settings</h3>
              <p>Flexible configuration options and administrative controls for complete platform customization.</p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section style={{ marginTop: '4rem', marginBottom: '4rem' }}>
          <div className="stats">
            <div className="stat">
              <div className="stat-icon">1,248</div>
              <h3>Active Scholars</h3>
              <p>Currently supported</p>
            </div>
            <div className="stat">
              <div className="stat-icon">₱850M</div>
              <h3>Total Benefits</h3>
              <p>Distributed annually</p>
            </div>
            <div className="stat">
              <div className="stat-icon">42</div>
              <h3>Programs</h3>
              <p>Managed efficiently</p>
            </div>
            <div className="stat">
              <div className="stat-icon">98%</div>
              <h3>Satisfaction</h3>
              <p>User approval rate</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ 
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#1F2937' }}>Ready to transform scholarship management?</h2>
          <p style={{ color: '#6B7280', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Join thousands of institutions using ScholarshipHub to streamline their scholarship operations.
          </p>
          <a className="btn btn-primary btn-lg" href="/register">Get Started</a>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
