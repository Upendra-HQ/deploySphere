import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  ArrowLeft, 
  Terminal, 
  Clock, 
  GitCommit, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  RefreshCw,
  Server,
  FolderOpen
} from 'lucide-react';

interface ProjectInfo {
  id: string;
  name: string;
}

interface Deployment {
  id: string;
  projectId: string;
  commitHash: string | null;
  commitMsg: string | null;
  status: 'BUILDING' | 'SUCCESS' | 'FAILED';
  logs: string;
  duration: string | null;
  createdAt: string;
  project: ProjectInfo;
}

const DeploymentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [isWebSocketActive, setIsWebSocketActive] = useState(false);

  const fetchDeploymentDetails = async (isPoll = false) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`http://localhost:5000/api/deployments/${id}`, { headers });
      setDeployment(res.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching deployment details:', err);
      if (!isPoll) {
        setError('Failed to load deployment details.');
      }
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeploymentDetails();
  }, [id, token]);

  useEffect(() => {
    if (!id) return;

    let socket: WebSocket | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      console.log('[CLIENT] Launching HTTP fallback logs polling.');
      pollInterval = setInterval(() => {
        if (deployment?.status === 'BUILDING' || !deployment) {
          fetchDeploymentDetails(true);
        }
      }, 2000);
    };

    // Try to open WebSocket connection
    try {
      socket = new WebSocket('ws://localhost:5000');

      socket.onopen = () => {
        console.log('[CLIENT] WebSocket stream connected. Subscribing to build ID:', id);
        socket?.send(JSON.stringify({ type: 'subscribe', deploymentId: id }));
        setIsWebSocketActive(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.event === 'log' && payload.data) {
            setDeployment((prev) => {
              if (!prev) return null;
              // Append the logs chunk instantly
              return {
                ...prev,
                logs: prev.logs + payload.data + '\n',
              };
            });
          } else if (payload.event === 'status') {
            fetchDeploymentDetails(true);
          }
        } catch (err) {
          console.error('[CLIENT] Error parsing socket payload:', err);
        }
      };

      socket.onclose = () => {
        console.log('[CLIENT] WebSocket closed. Starting HTTP polling fallback.');
        setIsWebSocketActive(false);
        startPolling();
      };

      socket.onerror = () => {
        console.log('[CLIENT] WebSocket error encountered. Activating polling.');
        setIsWebSocketActive(false);
      };
    } catch (wsErr) {
      console.error('[CLIENT] WebSocket setup failed:', wsErr);
      startPolling();
    }

    return () => {
      if (socket) {
        socket.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [id, token, deployment?.status]);

  // Auto scroll to bottom of terminal log window
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deployment?.logs]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Connecting to build stream terminal...</p>
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div className="dashboard-page">
        <main className="dashboard-container" style={{ maxWidth: '800px', paddingTop: '4rem' }}>
          <div className="form-card text-center">
            <XCircle size={48} className="text-error" style={{ marginBottom: '1rem' }} />
            <h2>Deployment Logs Unavailable</h2>
            <p className="form-subtitle">{error || 'The requested deployment record could not be found.'}</p>
            <Link to="/projects" className="auth-btn" style={{ width: 'auto', marginTop: '1rem' }}>
              Back to Projects
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Helper to color log lines dynamically
  const parseLogLine = (line: string, index: number) => {
    if (line.startsWith('[SUCCESS]')) {
      return <div key={index} className="log-line text-green">{line}</div>;
    }
    if (line.startsWith('[ERROR]') || line.startsWith('[CRITICAL ERROR]')) {
      return <div key={index} className="log-line text-error">{line}</div>;
    }
    if (line.startsWith('[EXEC]')) {
      return <div key={index} className="log-line text-blue">{line}</div>;
    }
    if (line.startsWith('[WARNING]')) {
      return <div key={index} className="log-line" style={{ color: '#f59e0b' }}>{line}</div>;
    }
    return <div key={index} className="log-line">{line}</div>;
  };

  const getStatusBadgeClass = (status: Deployment['status']) => {
    switch (status) {
      case 'SUCCESS': return 'success';
      case 'FAILED': return 'failed';
      case 'BUILDING': return 'building';
    }
  };

  const getStatusIcon = (status: Deployment['status']) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle2 size={16} className="text-success" />;
      case 'FAILED': return <XCircle size={16} className="text-error" />;
      case 'BUILDING': return <Loader2 size={16} className="spin text-pulse" style={{ color: '#f59e0b' }} />;
    }
  };

  return (
    <div className="deployment-details-page">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-brand">
          <Terminal size={24} />
          <span>DeploySphere Console</span>
        </div>
        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/projects" className="nav-link">Projects</Link>
        </div>
        <div className="dashboard-nav-right">
          <Link to="/projects" className="dashboard-logout-btn" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}>
            Back to Projects
          </Link>
        </div>
      </nav>

      <main className="dashboard-container" style={{ maxWidth: '1000px' }}>
        <div className="projects-header-row" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1>Build Console Logs</h1>
            <p>Project: <strong style={{ color: 'var(--text-primary)' }}>{deployment.project.name}</strong></p>
          </div>
          <span className={`status-badge ${getStatusBadgeClass(deployment.status)}`}>
            {getStatusIcon(deployment.status)}
            {deployment.status}
          </span>
        </div>

        {/* METADATA BLOCK */}
        <div className="deployment-metadata-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitCommit size={18} className="text-blue" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COMMIT</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', fontFamily: 'monospace' }}>{deployment.commitHash || 'head'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} className="text-green" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DURATION</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{deployment.duration || 'Running...'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={18} className="text-purple" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DEPLOYMENT ID</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', fontFamily: 'monospace' }}>{deployment.id.substring(0, 8)}...</div>
            </div>
          </div>
        </div>

        {/* TERMINAL CONSOLE VIEW */}
        <div className="terminal-container" style={{ padding: '1.5rem', background: '#090d16', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5', color: '#cbd5e1', height: '500px', overflowY: 'auto' }}>
          <div className="terminal-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span>deploysphere-engine-cli v1.0.0</span>
            <span>stdout/stderr stream</span>
          </div>

          <div className="terminal-body">
            {deployment.logs.split('\n').map((line, idx) => parseLogLine(line, idx))}
            {deployment.status === 'BUILDING' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={12} className="spin" />
                <span>Streaming live build output...</span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeploymentDetails;
