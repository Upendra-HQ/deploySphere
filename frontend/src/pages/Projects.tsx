import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Plus, 
  Folder, 
  GitBranch, 
  Settings, 
  Trash2, 
  ExternalLink,
  Code,
  AlertTriangle,
  Layout,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface EnvVariable {
  id?: string;
  key: string;
  value: string;
}

interface Project {
  id: string;
  name: string;
  repositoryUrl: string;
  branch: string;
  framework: string;
  buildCommand?: string;
  startCommand?: string;
  envVariables: EnvVariable[];
}

const Projects: React.FC = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the project "${name}"? All configuration, environment variables, and records will be permanently lost.`)) {
      setDeletingId(id);
      try {
        await axios.delete(`http://localhost:5000/api/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjects(projects.filter(p => p.id !== id));
      } catch (err: any) {
        console.error('Error deleting project:', err);
        alert(err.response?.data?.message || 'Failed to delete project');
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-brand">
          <FolderOpen size={24} />
          <span>DeploySphere</span>
        </div>
        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/projects" className="nav-link active">Projects</Link>
          <Link to="/github-connect" className="nav-link">GitHub</Link>
        </div>
        <div className="dashboard-nav-right">
          <Link to="/projects/new" className="dashboard-create-btn">
            <Plus size={16} />
            <span>New Project</span>
          </Link>
        </div>
      </nav>

      <main className="dashboard-container">
        <div className="projects-header-row">
          <div>
            <h1>Projects</h1>
            <p>Manage and deploy your applications</p>
          </div>
        </div>

        {error && (
          <div className="dashboard-alert dashboard-alert-error">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="empty-projects-state">
            <Folder size={48} className="empty-icon" />
            <h2>No Projects Found</h2>
            <p>Get started by connecting your repository and setting up your first project.</p>
            <Link to="/projects/new" className="auth-btn" style={{ width: 'auto', marginTop: '1rem' }}>
              <Plus size={18} />
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project.id} className="project-card">
                <div className="project-card-header">
                  <div className="project-card-title">
                    <Code size={20} className="project-type-icon" />
                    <div>
                      <h3>{project.name}</h3>
                      <span className="project-framework-tag">{project.framework}</span>
                    </div>
                  </div>
                  <div className="project-card-actions">
                    <button 
                      onClick={() => navigate(`/projects/edit/${project.id}`)}
                      className="project-action-btn edit" 
                      title="Project Settings"
                    >
                      <Settings size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(project.id, project.name)}
                      className="project-action-btn delete" 
                      disabled={deletingId === project.id}
                      title="Delete Project"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="project-card-body">
                  <div className="project-detail-item">
                    <span className="detail-label">Git Repository</span>
                    <a 
                      href={project.repositoryUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="detail-value repo-link"
                    >
                      {project.repositoryUrl.replace('https://github.com/', '')}
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="project-detail-row">
                    <div className="project-detail-item">
                      <span className="detail-label">Branch</span>
                      <span className="detail-value branch">
                        <GitBranch size={12} />
                        {project.branch}
                      </span>
                    </div>
                    <div className="project-detail-item">
                      <span className="detail-label">Variables</span>
                      <span className="detail-value">
                        {project.envVariables.length} Configured
                      </span>
                    </div>
                  </div>
                </div>

                <div className="project-card-footer">
                  <span className="project-status-text">
                    <Layout size={14} />
                    Not Deployed
                  </span>
                  <button className="deploy-btn" onClick={() => alert('Deployment engine will be configured in Phase 5.')}>
                    Deploy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;
