import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  ArrowLeft, 
  History, 
  GitCommit, 
  Clock, 
  User, 
  Terminal, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  FolderOpen
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  repositoryUrl: string;
  branch: string;
  framework: string;
}

interface Deployment {
  id: string;
  projectId: string;
  commitHash: string | null;
  commitMsg: string | null;
  status: 'BUILDING' | 'SUCCESS' | 'FAILED';
  duration: string | null;
  createdAt: string;
}

const ProjectDeployments: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleRollback = async (depId: string) => {
    const bypassConfirm = new URLSearchParams(window.location.search).get('confirm') === 'true';
    if (!bypassConfirm && !window.confirm('Are you sure you want to trigger a rollback to this version?')) {
      return;
    }
    try {
      const res = await axios.post(`http://localhost:5000/api/deployments/rollback/${depId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/deployments/${res.data.deploymentId}`);
    } catch (err: any) {
      console.error('Error triggering rollback:', err);
      alert(err.response?.data?.message || 'Failed to trigger rollback.');
    }
  };

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // 1. Fetch project info
      const projRes = await axios.get(`http://localhost:5000/api/projects/${id}`, { headers });
      setProject(projRes.data);

      // 2. Fetch deployments list
      const depRes = await axios.get(`http://localhost:5000/api/deployments/project/${id}`, { headers });
      setDeployments(depRes.data);
      
      setError('');
    } catch (err: any) {
      console.error('Error fetching deployment history:', err);
      setError('Failed to load project deployments history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll history every 10 seconds to update build timeline in real-time
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [id, token]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading deployment history...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="dashboard-page">
        <main className="dashboard-container" style={{ maxWidth: '800px', paddingTop: '4rem' }}>
          <div className="form-card text-center">
            <XCircle size={48} className="text-error" style={{ marginBottom: '1rem' }} />
            <h2>History Unavailable</h2>
            <p className="form-subtitle">{error || 'The requested project could not be found.'}</p>
            <Link to="/projects" className="auth-btn" style={{ width: 'auto', marginTop: '1rem' }}>
              Back to Projects
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getStatusIcon = (status: Deployment['status']) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle2 size={18} className="text-green" />;
      case 'FAILED': return <XCircle size={18} className="text-error" />;
      case 'BUILDING': return <Loader2 size={18} className="spin" style={{ color: '#f59e0b' }} />;
    }
  };

  return (
    <div className="project-deployments-page">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-brand">
          <History size={24} />
          <span>DeploySphere History</span>
        </div>
        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/projects" className="nav-link">Projects</Link>
          <Link to="/github-connect" className="nav-link">GitHub</Link>
          <Link to="/docker" className="nav-link">Docker</Link>
        </div>
        <div className="dashboard-nav-right">
          <Link to="/projects" className="dashboard-logout-btn" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}>
            Back to Projects
          </Link>
        </div>
      </nav>

      <main className="dashboard-container" style={{ maxWidth: '900px' }}>
        <div className="projects-header-row" style={{ marginBottom: '2rem' }}>
          <div>
            <h1>Deployment History</h1>
            <p>Deployment timeline and version controls for <strong style={{ color: 'var(--text-primary)' }}>{project.name}</strong></p>
          </div>
          <span className="project-framework-tag" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            {project.framework}
          </span>
        </div>

        {/* PROJECT INFO CARD */}
        <div className="form-card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>REPOSITORY</div>
            <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-hover)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
              {project.repositoryUrl.replace('https://github.com/', '')}
              <ExternalLink size={14} />
            </a>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>TARGET BRANCH</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{project.branch}</div>
          </div>
          <div>
            <button 
              className="deploy-btn" 
              onClick={async () => {
                try {
                  const res = await axios.post(`http://localhost:5000/api/deployments/project/${project.id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  navigate(`/deployments/${res.data.deploymentId}`);
                } catch (err: any) {
                  alert(err.response?.data?.message || 'Failed to trigger deploy.');
                }
              }}
              style={{ padding: '0.5rem 1.25rem' }}
            >
              Deploy Latest Commit
            </button>
          </div>
        </div>

        {/* TIMELINE SECTION */}
        {deployments.length === 0 ? (
          <div className="empty-projects-state" style={{ padding: '3rem 1.5rem' }}>
            <GitCommit size={48} className="empty-icon" />
            <h2>No Deployments Found</h2>
            <p>This project has not been deployed yet. Click "Deploy Latest Commit" to start the compilation engine.</p>
          </div>
        ) : (
          <div className="timeline-container" style={{ position: 'relative', paddingLeft: '2.5rem', listStyle: 'none' }}>
            {/* CONNECTOR LINE */}
            <div className="timeline-line" style={{ position: 'absolute', top: '10px', bottom: '10px', left: '11px', width: '2px', background: 'var(--border-color)', zIndex: 1 }} />

            {deployments.map((dep, idx) => (
              <div key={dep.id} className="timeline-node-wrapper" style={{ position: 'relative', marginBottom: '2.5rem', zIndex: 2 }}>
                
                {/* NODE DOT INDICATOR */}
                <div className="timeline-dot" style={{ position: 'absolute', left: '-2.5rem', top: '6px', background: 'var(--bg-primary)', border: '2px solid var(--border-color)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(0,0,0,0.3)', bordercolor: dep.status === 'SUCCESS' ? '#10b981' : dep.status === 'FAILED' ? '#ef4444' : '#f59e0b' }}>
                  {getStatusIcon(dep.status)}
                </div>

                {/* TIMELINE INFO CARD */}
                <div className="timeline-card form-card" style={{ padding: '1.25rem', transition: 'var(--transition)', hover: { transform: 'translateY(-2px)' } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(dep.createdAt).toLocaleString()}
                      </span>
                      <h3 style={{ margin: '0.25rem 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
                        {dep.commitMsg || 'Triggered build'}
                      </h3>
                    </div>
                    <span className={`status-badge ${dep.status.toLowerCase()}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                      {dep.status}
                    </span>
                  </div>

                  {/* DETAILS GRID */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <GitCommit size={14} className="text-blue" />
                      <span>Commit: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{dep.commitHash || 'head'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Clock size={14} className="text-green" />
                      <span>Duration: <strong style={{ color: 'var(--text-primary)' }}>{dep.duration || 'Running...'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <User size={14} className="text-purple" />
                      <span>Deployed by: <strong style={{ color: 'var(--text-primary)' }}>User</strong></span>
                    </div>
                  </div>

                  {/* ACTION TRIGGER BUTTONS */}
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Link to={`/deployments/${dep.id}`} className="project-action-btn edit" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 1rem', width: 'auto', textDecoration: 'none', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <Terminal size={14} />
                      <span>View Build Console</span>
                    </Link>

                    {dep.status === 'SUCCESS' && idx > 0 && (
                      <button
                        onClick={() => handleRollback(dep.id)}
                        className="project-action-btn edit"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 1rem', width: 'auto', fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--accent-solid)' }}
                      >
                        <RotateCcw size={14} />
                        <span>Rollback to this version</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectDeployments;
