import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';

type Status = 'verifying' | 'success' | 'error';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    apiService
      .verifyEmail(token)
      .then((result) => {
        setStatus('success');
        setMessage(`${result.user.email} is confirmed.`);
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.message || 'This verification link is invalid or has expired.');
      });
  }, [token]);

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{status === 'verifying' ? 'Confirming your email...' : status === 'success' ? 'Email Confirmed' : 'Verification Failed'}</h2>
        <p>{status === 'verifying' ? 'Please wait a moment.' : message}</p>
        {status !== 'verifying' && (
          <Link className="btn btn-primary btn-lg" to="/login" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
            Go to Sign In
          </Link>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
