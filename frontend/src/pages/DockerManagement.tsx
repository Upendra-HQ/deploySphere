import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Cpu, 
  RefreshCw, 
  Play, 
  Square, 
  RotateCw, 
  Trash2, 
  Terminal, 
  Info,
  Layers,
  X,
  Server,
  FolderOpen
} from 'lucide-react';

interface Container {
  id: string;
  name: string;
  projectName: string;
  projectId: string;
  image: string;
  status: 'RUNNING' | 'STOPPED' | 'BUILDING';
  ports: string;
  created: string;
}

const DockerManagement: React.FC = () => {
  const { token } = useAuth();
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Container action loaders
  const [actionId, setActionId] = useState<string | null>(null);

  // Log Modal States
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [containerLogs, setContainerLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  const fetchContainers = async (isPoll = false) => {
    try {
      const res = await axios.get('http://localhost:5000/api/docker/containers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContainers(res.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching containers:', err);
      if (!isPoll) {
        setError('Failed to fetch running container lists.');
      }
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
    // Poll containers every 6 seconds to update run states dynamically
    const interval = setInterval(() => fetchContainers(true), 6000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAction = async (projectId: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    if (action === 'delete' && !window.confirm('Are you sure you want to stop and delete this container instance?')) {
      return;
    }

    setActionId(`${projectId}-${action}`);
    try {
      await axios.post(
        `http://localhost:5000/api/docker/containers/${projectId}/action`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchContainers(true);
    } catch (err: any) {
      console.error(`Error executing action ${action} on project:`, err);
      alert(err.response?.data?.message || `Failed to execute ${action} on container.`);
    } finally {
      setActionId(null);
    }
  };

  const openLogsModal = async (container: Container) => {
    setSelectedContainer(container);
    setLogsLoading(true);
    setLogsError('');
    setContainerLogs('');

    try {
      const res = await axios.get(`http://localhost:5000/api/docker/containers/${container.projectId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContainerLogs(res.data.logs);
    } catch (err: any) {
      console.error('Error fetching container logs:', err);
      setLogsError('Failed to fetch active container logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const closeLogsModal = () => {
    setSelectedContainer(null);
    setContainerLogs('');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading docker containers...</p>
      </div>
    );
  }

  return (
    <div className="docker-management-page">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-brand">
          <Layers size={24} />
          <span>DeploySphere</span>
        </div>
        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/projects" className="nav-link">Projects</Link>
          <Link to="/github-connect" className="nav-link">GitHub</Link>
          <Link to="/docker" className="nav-link active">Docker</Link>
        </div>
        <div className="dashboard-nav-right">
          <button 
            className="dashboard-refresh-btn" 
            onClick={() => fetchContainers(false)} 
            style={{ marginRight: '1rem' }}
          >
            <RefreshCw size={16} />
            <span>Sync</span>
          </button>
        </div>
      </nav>

      <main className="dashboard-container">
        <div className="projects-header-row">
          <div>
            <h1>Docker Management</h1>
            <p>Monitor and control active container runtimes</p>
          </div>
        </div>

        {error && (
          <div className="dashboard-alert dashboard-alert-error" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {containers.length === 0 ? (
          <div className="empty-projects-state">
            <Server size={48} className="empty-icon" />
            <h2>No Active Containers Found</h2>
            <p>Start a container by deploying a project configuration first.</p>
            <Link to="/projects" className="auth-btn" style={{ width: 'auto', marginTop: '1rem' }}>
              View Projects
            </Link>
          </div>
        ) : (
          <div className="projects-grid">
            {containers.map((container) => (
              <div key={container.id} className="project-card">
                <div className="project-card-header">
                  <div className="project-card-title">
                    <Server size={20} className="project-type-icon text-blue" />
                    <div>
                      <h3>{container.name}</h3>
                      <span className="project-framework-tag" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: '0.7rem' }}>
                        ID: {container.id}
                      </span>
                    </div>
                  </div>
                  <span className={`status-badge ${container.status === 'RUNNING' ? 'success' : 'failed'}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                    {container.status}
                  </span>
                </div>

                <div className="project-card-body">
                  <div className="project-detail-item">
                    <span className="detail-label">Project Reference</span>
                    <span className="detail-value">{container.projectName}</span>
                  </div>

                  <div className="project-detail-item">
                    <span className="detail-label">Image Reference</span>
                    <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{container.image}</span>
                  </div>

                  <div className="project-detail-row">
                    <div className="project-detail-item">
                      <span className="detail-label">Port Mapping</span>
                      <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{container.ports}</span>
                    </div>
                    <div className="project-detail-item">
                      <span className="detail-label">Created At</span>
                      <span className="detail-value">{container.created.split(',')[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="project-card-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => openLogsModal(container)}
                    className="project-action-btn edit"
                    title="Container Logs"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', width: 'auto', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    <Terminal size={14} />
                    <span>Logs</span>
                  </button>

                  {container.status === 'RUNNING' ? (
                    <button
                      onClick={() => handleAction(container.projectId, 'stop')}
                      disabled={actionId === `${container.projectId}-stop`}
                      className="project-action-btn delete"
                      title="Stop Container"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', width: 'auto', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                    >
                      <Square size={12} fill="#ef4444" />
                      <span>{actionId === `${container.projectId}-stop` ? 'Stopping...' : 'Stop'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(container.projectId, 'start')}
                      disabled={actionId === `${container.projectId}-start`}
                      className="deploy-btn"
                      title="Start Container"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', width: 'auto' }}
                    >
                      <Play size={12} fill="#fff" />
                      <span>{actionId === `${container.projectId}-start` ? 'Starting...' : 'Start'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleAction(container.projectId, 'restart')}
                    disabled={actionId === `${container.projectId}-restart`}
                    className="project-action-btn edit"
                    title="Restart Container"
                    style={{ padding: '0.4rem 0.5rem', width: 'auto' }}
                  >
                    <RotateCw size={14} className={actionId === `${container.projectId}-restart` ? 'spin' : ''} />
                  </button>

                  <button
                    onClick={() => handleAction(container.projectId, 'delete')}
                    disabled={actionId === `${container.projectId}-delete`}
                    className="project-action-btn delete"
                    title="Delete Container"
                    style={{ padding: '0.4rem 0.5rem', width: 'auto' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* LOGS CONSOLE MODAL OVERLAY */}
      {selectedContainer && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', height: '80vh', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} className="text-blue" />
                <h3 style={{ margin: 0 }}>Runtime Logs: {selectedContainer.name}</h3>
              </div>
              <button 
                onClick={closeLogsModal}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ flex: 1, padding: '1.25rem', background: '#090d16', fontFamily: 'monospace', fontSize: '0.85rem', color: '#cbd5e1', overflowY: 'auto', lineHeight: '1.5' }}>
              {logsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={16} className="spin" />
                  <span>Loading container stdout streams...</span>
                </div>
              ) : logsError ? (
                <div className="text-error">{logsError}</div>
              ) : (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{containerLogs}</pre>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                className="dashboard-refresh-btn"
                onClick={() => openLogsModal(selectedContainer)}
                disabled={logsLoading}
              >
                <RefreshCw size={14} className={logsLoading ? 'spin' : ''} />
                <span>Refresh logs</span>
              </button>
              <button className="dashboard-logout-btn" onClick={closeLogsModal} style={{ background: 'transparent', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DockerManagement;
