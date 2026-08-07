import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="home-shell">
      <nav className="navbar">
        <div className="navbar-brand">
          <span style={{ fontSize: '1.5rem' }}>✨</span>
          <span>ECEAP</span>
        </div>
      </nav>

      <main className="hero">
        <div>
          <h1>Modern scholarship platform</h1>
          <p>Streamline applications, document verification, awards, and renewals in one elegant system.</p>
          <div className="hero-buttons">
            <Link className="btn btn-primary btn-lg" to="/register">Apply Now</Link>
            <Link className="btn btn-primary btn-lg" to="/login" style={{ background: 'white', color: '#8B5CF6', textDecoration: 'none' }}>Sign In</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
