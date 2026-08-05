import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../components/ProtectedRoute';
import connerSeal from '../assets/images/conner-seal.jpg';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const passwordResetSuccess = Boolean((location.state as { passwordResetSuccess?: boolean } | null)?.passwordResetSuccess);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await login(email, password);
      navigate(roleHome[user.role]);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img
          src={connerSeal}
          alt="Municipality of Conner, Apayao seal"
          width={150}
          height={150}
          style={{ display: 'block', margin: '0 auto 1rem', borderRadius: '50%' }}
        />
        <h2>Welcome back</h2>
        <p>Sign in to access the scholarship management portal</p>

        {passwordResetSuccess && !error && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              color: '#34D399',
              fontSize: '0.9rem'
            }}
          >
            Your password has been reset — sign in with your new password.
          </div>
        )}

        {error && (
          <div className="alert-error" style={{ padding: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '3.5rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--login-toggle-color)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <Link to="/forgot-password" style={{ fontSize: '0.85rem', alignSelf: 'flex-end' }}>
              Forgot password?
            </Link>
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ margin: '1.5rem 0 0', textAlign: 'center', fontSize: '0.9rem' }}>
          New student? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
