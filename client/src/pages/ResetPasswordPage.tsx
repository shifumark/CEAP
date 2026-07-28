import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!token) {
      setError('This reset link is missing its token.');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.confirmPasswordReset(token, newPassword);
      navigate('/login', { state: { passwordResetSuccess: true } });
    } catch (err: any) {
      setError(err.message || 'This password reset link is invalid or has expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Choose a new password</h2>
        <p>Enter a new password for your account.</p>

        {error && (
          <div className="alert-error" style={{ padding: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {!token ? (
          <p>
            This reset link is missing its token — request a new one from the{' '}
            <Link to="/forgot-password">forgot password</Link> page.
          </p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        <p style={{ margin: '1.5rem 0 0', textAlign: 'center', fontSize: '0.9rem' }}>
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
