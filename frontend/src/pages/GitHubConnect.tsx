import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  GitBranch, 
  Github, 
  CheckCircle, 
  AlertTriangle,
  ArrowLeft,
  Loader,
  RefreshCw,
  LogOut,
  FolderOpen
} from 'lucide-react';

const GitHubConnect: React.FC = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Connection states
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Message alerts
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | ''>('');

  const checkConnectionStatus = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.user?.githubToken) {
        setConnected(true);
        setUsername(res.data.user.githubUsername || 'Connected User');
      } else {
        setConnected(false);
        setUsername('');
      }
    } catch (err) {
      console.error('Error fetching connection status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
    
    // Parse redirect params
    const status = searchParams.get('status');
    const msg = searchParams.get('message');
    
    if (status === 'success') {
      setMsgType('success');
      setMessage('GitHub account connected successfully! You can now link your projects.');
      // Clear URL params
      setSearchParams({});
    } else if (status === 'error') {
      setMsgType('error');
      setMessage(msg || 'An error occurred during authentication.');
      setSearchParams({});
    }
  }, [token]);

  const handleConnect = async () => {
    setActionLoading(true);
    setErrorAlert('');
    try {
      const res = await axios.get('http://localhost:5000/api/github/auth-url', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Redirect browser to authorization URI
      window.location.href = res.data.url;
    } catch (err: any) {
      console.error('Error getting authorization URL:', err);
      setMsgType('error');
      setMessage(err.response?.data?.message || 'Failed to initialize authorization flow.');
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect your GitHub account? Connected projects will no longer fetch dynamic repositories or branches.')) {
      setActionLoading(true);
      setErrorAlert('');
      try {
        await axios.post('http://localhost:5000/api/github/disconnect', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConnected(false);
        setUsername('');
        setMsgType('success');
        setMessage('GitHub account disconnected successfully.');
      } catch (err: any) {
        console.error('Error disconnecting account:', err);
        setMsgType('error');
        setMessage(err.response?.data?.message || 'Failed to disconnect account.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const setErrorAlert = (msg: string) => {
    setMsgType('');
    setMessage(msg);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading GitHub integration status...</p>
      </div>
    );
  }

  return (
    <div className="github-connect-page">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-brand">
          <FolderOpen size={24} />
          <span>DeploySphere</span>
        </div>
        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/projects" className="nav-link">Projects</Link>
          <Link to="/github-connect" className="nav-link active">GitHub</Link>
          <Link to="/docker" className="nav-link">Docker</Link>
        </div>
        <div className="dashboard-nav-right">
          <Link to="/projects" className="dashboard-logout-btn" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}>
            Back
          </Link>
        </div>
      </nav>

      <main className="dashboard-container" style={{ maxWidth: '600px' }}>
        <Link to="/dashboard" className="auth-link auth-back-link" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <div className="form-card text-center">
          <div className="github-large-logo" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
            <Github size={40} className="text-primary" />
          </div>
          
          <h2>GitHub Integration</h2>
          <p className="form-subtitle">Connect your GitHub profile to load repositories and manage build triggers automatically.</p>

          {message && (
            <div className={`auth-alert ${msgType === 'success' ? 'auth-alert-success' : 'auth-alert-error'}`} style={{ marginTop: '1rem', justifyContent: 'center' }}>
              {msgType === 'success' && <CheckCircle size={16} />}
              {msgType === 'error' && <AlertTriangle size={16} />}
              <span>{message}</span>
            </div>
          )}

          <div className="connection-status-box" style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(30, 41, 59, 0.4)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
            {connected ? (
              <div className="connected-state">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: '600', marginBottom: '0.5rem' }}>
                  <CheckCircle size={18} />
                  <span>Linked Successfully</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Connected as: <strong style={{ color: 'var(--accent-hover)' }}>@{username}</strong>
                </p>
              </div>
            ) : (
              <div className="disconnected-state">
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Your GitHub profile is not linked to DeploySphere.
                </p>
              </div>
            )}
          </div>

          {connected ? (
            <button 
              onClick={handleDisconnect} 
              className="auth-btn" 
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.25)', boxShadow: 'none' }}
              disabled={actionLoading}
            >
              {actionLoading ? 'Disconnecting...' : 'Disconnect GitHub Account'}
            </button>
          ) : (
            <button 
              onClick={handleConnect} 
              className="auth-btn"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader size={18} className="spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Github size={18} />
                  Link GitHub Profile
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default GitHubConnect;
