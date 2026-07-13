import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { apiUrl } from '../config/api';
import { 
  Rocket, 
  Users, 
  Layers, 
  RefreshCw, 
  Trash2, 
  LogOut, 
  Server, 
  Cpu, 
  Activity, 
  Terminal, 
  CheckCircle2, 
  Database,
  History,
  LayoutGrid
} from 'lucide-react';

const ADMIN_URL = apiUrl('/api/admin');

interface UserDetail {
  id: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
  _count: { projects: number };
}

interface ProjectDetail {
  id: string;
  name: string;
  repositoryUrl: string;
  branch: string;
  framework: string;
  ownerEmail: string;
  createdAt: string;
  status: string;
  latestDeploymentId: string | null;
}

interface DeploymentDetail {
  id: string;
  projectId: string;
  projectName: string;
  ownerEmail: string;
  commitHash: string;
  commitMsg: string;
  status: string;
  duration: string;
  createdAt: string;
}

interface ServerDetail {
  hostname: string;
  platform: string;
  arch: string;
  release: string;
  totalMemory: string;
  freeMemory: string;
  cpuModel: string;
  cpuCores: number;
  dockerVersion: string;
  nginxActive: 'UP' | 'DOWN';
}

interface AuditLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  service: string;
  message: string;
}

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalDeployments: number;
  successRate: number;
  activeContainers: number;
  uptime: number;
}

const AdminPanel: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'projects' | 'deployments' | 'servers' | 'logs'>('stats');
  
  // Data States
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [projects, setProjects] = useState<ProjectDetail[]>([]);
  const [deployments, setDeployments] = useState<DeploymentDetail[]>([]);
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not admin email
  const isAdmin = user && (user.email === 'admin@deploysphere.local' || user.email.startsWith('admin@'));
  
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, loading, isAdmin, navigate]);

  const fetchAdminData = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    else setRefreshing(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, projectsRes, deploymentsRes, serverRes, logsRes] = await Promise.all([
        axios.get(`${ADMIN_URL}/stats`, { headers }),
        axios.get(`${ADMIN_URL}/users`, { headers }),
        axios.get(`${ADMIN_URL}/projects`, { headers }),
        axios.get(`${ADMIN_URL}/deployments`, { headers }),
        axios.get(`${ADMIN_URL}/servers`, { headers }),
        axios.get(`${ADMIN_URL}/logs`, { headers })
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
      setDeployments(deploymentsRes.data);
      setServer(serverRes.data);
      setLogs(logsRes.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching admin workspace data:', err);
      setError('Access forbidden or failed to fetch administrator records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
      // Poll stats every 10 seconds
      const interval = setInterval(() => fetchAdminData(true), 10000);
      return () => clearInterval(interval);
    }
  }, [token, isAdmin]);

  const handleDeleteUser = async (userId: string, email: string) => {
    if (window.confirm(`CRITICAL: Are you sure you want to permanently delete the user "${email}" and ALL their corresponding projects, deployments, and running Docker containers?`)) {
      setRefreshing(true);
      try {
        await axios.delete(`${ADMIN_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('User and all cascading data deleted successfully.');
        await fetchAdminData(true);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete user.');
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (window.confirm(`CRITICAL: Are you sure you want to permanently delete the project "${name}" and all of its deployments/container runtimes?`)) {
      setRefreshing(true);
      try {
        await axios.delete(`${ADMIN_URL}/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Project and all cascading configuration record states deleted successfully.');
        await fetchAdminData(true);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete project.');
      } finally {
        setRefreshing(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading Admin Workspace...</p>
      </div>
    );
  }

  // Format uptime
  const getUptimeString = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-brand">
          <Rocket size={24} />
          <span>DeploySphere</span>
        </div>
        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/projects" className="nav-link">Projects</Link>
          <Link to="/github-connect" className="nav-link">GitHub</Link>
          <Link to="/docker" className="nav-link">Docker</Link>
          <Link to="/monitoring" className="nav-link">Monitoring</Link>
          <Link to="/proxy" className="nav-link">Routing</Link>
          {isAdmin && <Link to="/admin" className="nav-link active">Admin</Link>}
          <Link to="/analytics" className="nav-link">Analytics</Link>
        </div>
        <div className="dashboard-nav-right">
          <button 
            className="dashboard-refresh-btn" 
            onClick={() => fetchAdminData(true)} 
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          <button className="dashboard-logout-btn" onClick={logout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <main className="dashboard-container">
        {error && (
          <div className="dashboard-alert dashboard-alert-error" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div className="projects-header-row" style={{ marginBottom: '2rem' }}>
          <div>
            <h1>Global Administration Panel</h1>
            <p>Monitor platform users, project repositories, global deployments, and server telemetry Spec logs</p>
          </div>
        </div>

        {/* ADMIN WORKSPACE TAB SECTIONS */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.95rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setActiveTab('stats')}
          >
            <LayoutGrid size={16} /> Overview
          </button>
          <button 
            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.95rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} /> Users ({users.length})
          </button>
          <button 
            className={`nav-link ${activeTab === 'projects' ? 'active' : ''}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.95rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setActiveTab('projects')}
          >
            <Layers size={16} /> Projects ({projects.length})
          </button>
          <button 
            className={`nav-link ${activeTab === 'deployments' ? 'active' : ''}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.95rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setActiveTab('deployments')}
          >
            <History size={16} /> Deployments ({deployments.length})
          </button>
          <button 
            className={`nav-link ${activeTab === 'servers' ? 'active' : ''}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.95rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setActiveTab('servers')}
          >
            <Server size={16} /> Host Server
          </button>
          <button 
            className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.95rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setActiveTab('logs')}
          >
            <Terminal size={16} /> Audit Logs
          </button>
        </div>

        {/* TAB CONTENTS */}

        {/* TAB 1: OVERVIEW STATS */}
        {activeTab === 'stats' && stats && (
          <section>
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
              <div className="stat-card">
                <div className="stat-icon-wrapper blue"><Users size={24} /></div>
                <div className="stat-content">
                  <h3>Registered Users</h3>
                  <p className="stat-number">{stats.totalUsers}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper orange"><Layers size={24} /></div>
                <div className="stat-content">
                  <h3>Total Projects</h3>
                  <p className="stat-number">{stats.totalProjects}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper green"><CheckCircle2 size={24} /></div>
                <div className="stat-content">
                  <h3>Success Rate</h3>
                  <p className="stat-number">{stats.successRate}%</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper purple"><Server size={24} /></div>
                <div className="stat-content">
                  <h3>Active Containers</h3>
                  <p className="stat-number">{stats.activeContainers}</p>
                </div>
              </div>
            </div>

            <div className="metric-chart-card" style={{ padding: '2rem' }}>
              <h3>System Overview Health</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>DeploySphere Platform parameters runtime telemetry status</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Host OS Kernel</span>
                  <h4 style={{ margin: '0.2rem 0 0 0', fontWeight: '600' }}>{server?.platform} ({server?.arch})</h4>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>System Uptime</span>
                  <h4 style={{ margin: '0.2rem 0 0 0', fontWeight: '600' }}>{getUptimeString(stats.uptime)}</h4>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Docker Daemon Spec</span>
                  <h4 style={{ margin: '0.2rem 0 0 0', fontWeight: '600', fontSize: '0.95rem' }}>{server?.dockerVersion}</h4>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nginx Gateway status</span>
                  <h4 style={{ margin: '0.2rem 0 0 0', fontWeight: '600', color: server?.nginxActive === 'UP' ? 'var(--success)' : 'var(--error)' }}>
                    {server?.nginxActive === 'UP' ? 'GATEWAY UP (PORT 80)' : 'GATEWAY DOWN'}
                  </h4>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: USERS LIST */}
        {activeTab === 'users' && (
          <section className="metric-chart-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Verified</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Registered On</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Projects count</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`project-status-text ${u.isVerified ? 'text-green' : 'text-error'}`} style={{ padding: 0 }}>
                        {u.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{u._count.projects}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        className="dashboard-logout-btn" 
                        style={{ padding: '0.35rem 0.6rem', margin: 0, border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        disabled={refreshing || u.email === user?.email}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 3: PROJECTS LIST */}
        {activeTab === 'projects' && (
          <section className="metric-chart-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Project Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Owner</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Framework</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Target Branch</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Runtime Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{p.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.ownerEmail}</td>
                    <td style={{ padding: '1rem' }}>{p.framework}</td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{p.branch}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`project-status-text ${p.status === 'SUCCESS' ? 'text-green' : p.status === 'FAILED' ? 'text-error' : p.status === 'BUILDING' ? 'text-pulse' : ''}`} style={{ padding: 0 }}>
                        {p.status === 'SUCCESS' ? 'Running' : p.status === 'FAILED' ? 'Failed' : p.status === 'BUILDING' ? 'Building' : 'Not Deployed'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        className="dashboard-logout-btn" 
                        style={{ padding: '0.35rem 0.6rem', margin: 0, border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}
                        onClick={() => handleDeleteProject(p.id, p.name)}
                        disabled={refreshing}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 4: DEPLOYMENTS TIMELINE */}
        {activeTab === 'deployments' && (
          <section className="metric-chart-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Deployment ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Project</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Owner</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Commit</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Deployed At</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{d.id.substring(0, 8)}</td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>
                      <Link to={`/projects/${d.projectId}/deployments`} style={{ color: 'var(--accent-hover)', textDecoration: 'none' }}>
                        {d.projectName}
                      </Link>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{d.ownerEmail}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.commitMsg}>
                        <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px', marginRight: '0.4rem', fontSize: '0.75rem' }}>{d.commitHash.substring(0, 7)}</span>
                        {d.commitMsg}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`project-status-text ${d.status === 'SUCCESS' ? 'text-green' : d.status === 'FAILED' ? 'text-error' : 'text-pulse'}`} style={{ padding: 0 }}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{d.duration}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(d.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 5: HOST SPECIFICATIONS */}
        {activeTab === 'servers' && server && (
          <section className="metrics-grid">
            <div className="metric-chart-card">
              <div className="metric-chart-header">
                <div className="metric-title-block">
                  <Cpu className="text-blue" />
                  <div>
                    <h3>Processor Specifications</h3>
                    <span>{server.cpuModel}</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>CPU Cores</span>
                  <span style={{ fontWeight: '500' }}>{server.cpuCores} Logic Units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Host Architecture</span>
                  <span style={{ fontWeight: '500', fontFamily: 'monospace' }}>{server.arch}</span>
                </div>
              </div>
            </div>

            <div className="metric-chart-card">
              <div className="metric-chart-header">
                <div className="metric-title-block">
                  <Activity className="text-green" />
                  <div>
                    <h3>Memory Allocation</h3>
                    <span>Physical System Memory Capacity</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Memory</span>
                  <span style={{ fontWeight: '500' }}>{server.totalMemory}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Available Memory</span>
                  <span style={{ fontWeight: '500' }}>{server.freeMemory}</span>
                </div>
              </div>
            </div>

            <div className="metric-chart-card">
              <div className="metric-chart-header">
                <div className="metric-title-block">
                  <Database className="text-purple" />
                  <div>
                    <h3>Engine Environments</h3>
                    <span>Underlying Daemon Spec configurations</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Docker Engine</span>
                  <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{server.dockerVersion}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Nginx Gateway</span>
                  <span style={{ fontWeight: '600', color: server.nginxActive === 'UP' ? 'var(--success)' : 'var(--error)' }}>
                    {server.nginxActive === 'UP' ? 'ONLINE (Port 80/443)' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 6: GLOBAL AUDIT LOGS */}
        {activeTab === 'logs' && (
          <section className="metric-chart-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Terminal size={18} className="text-blue" />
              <h3 style={{ margin: 0 }}>System Platform Audit Logs</h3>
            </div>
            
            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '1.5rem',
              borderRadius: 'var(--radius)',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#94a3b8',
              lineHeight: '1.5',
              height: '400px',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {logs.map((log) => {
                const color = log.level === 'ERROR' ? '#f87171' : log.level === 'WARNING' ? '#fbbf24' : '#34d399';
                return (
                  <div key={log.id} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.35rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span style={{ color, fontWeight: '600', minWidth: '70px' }}>{log.level}</span>
                    <span style={{ color: 'var(--accent-hover)', minWidth: '130px' }}>[{log.service}]</span>
                    <span>{log.message}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
