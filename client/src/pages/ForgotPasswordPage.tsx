import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Shown after any successful submit, regardless of whether the email
  // is actually registered — the backend deliberately gives the same
  // response either way so this page can't be used to check who has an
  // account.
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await apiService.requestPasswordReset(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Reset your password</h2>
        <p>Enter your account email and we'll send you a link to reset your password.</p>

        {error && (
          <div className="alert-error" style={{ padding: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {submitted ? (
          <p>
            If that email is registered, a password reset link has been sent — check your inbox (and spam folder).
            The link expires in 1 hour.
          </p>
        ) : (
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
            <button className="btn btn-primary btn-lg" type="submit" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? 'Sending...' : 'Send reset link'}
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

export default ForgotPasswordPage;
