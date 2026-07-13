import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Rocket, Loader } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { verifyEmail } = useAuth();
  const hasVerified = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (hasVerified.current) return;
      hasVerified.current = true;
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token. Please check your email link.');
        return;
      }

      const result = await verifyEmail(token);
      if (result.success) {
        setStatus('success');
        setMessage(result.message);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-bg-decoration">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
        <div className="auth-bg-orb auth-bg-orb-3" />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Rocket size={32} />
          </div>
          <h1>Email Verification</h1>
        </div>

        <div className="auth-verify-status">
          {status === 'loading' && (
            <div className="auth-verify-loading">
              <Loader size={48} className="auth-spinner" />
              <p>Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="auth-verify-success">
              <CheckCircle size={48} />
              <p>{message}</p>
              <Link to="/login" className="auth-btn" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="auth-verify-error">
              <XCircle size={48} />
              <p>{message}</p>
              <Link to="/register" className="auth-link" style={{ marginTop: '1rem', display: 'inline-block' }}>
                Try registering again
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
