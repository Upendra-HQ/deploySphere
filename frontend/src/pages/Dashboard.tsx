import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  Rocket, 
  Cpu, 
  HardDrive, 
  Activity, 
  Server, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  GitBranch,
  Terminal,
  User as UserIcon,
  Layers
} from 'lucide-react';
import axios from 'axios';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const API_URL = 'http://localhost:5000/api/dashboard';

interface Stats {
  totalProjects: number;
  activeDeployments: number;
  totalDeployments: number;
  successRate: number;
  uptime: number;
  totalContainers: number;
}

interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  uptime: number;
  cpuModel: string;
  cpuCores: number;
}

interface MetricHistoryPoint {
  time: string;
  value: number;
}

interface MetricDetail {
  usage: number;
  total?: number;
  used?: number;
  free?: number;
  history: MetricHistoryPoint[];
}

interface SystemMetrics {
  systemInfo: SystemInfo;
  cpu: MetricDetail & { cores: number; model: string };
  memory: MetricDetail & { total: number; used: number; free: number };
  disk: MetricDetail & { total: number; used: number; free: number };
}

interface Deployment {
  id: string;
  project: string;
  branch: string;
  commit: string;
  commitMessage: string;
  status: 'success' | 'failed' | 'building';
  duration: string;
  deployedAt: string;
  deployedBy: string;
}

const Dashboard: React.FC = () => {
  const { token, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, metricsRes, deploymentsRes] = await Promise.all([
        axios.get(`${API_URL}/stats`, { headers }),
        axios.get(`${API_URL}/system`, { headers }),
        axios.get(`${API_URL}/deployments`, { headers })
      ]);

      setStats(statsRes.data);
      setMetrics(metricsRes.data);
      setDeployments(deploymentsRes.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll metrics every 10 seconds for real-time update feel
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading Dashboard metrics...</p>
      </div>
    );
  }

  const getStatusIcon = (status: Deployment['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-success" />;
      case 'failed':
        return <XCircle size={16} className="text-error" />;
      case 'building':
        return <RefreshCw size={16} className="text-pulse spin" />;
    }
  };

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-brand">
          <Rocket size={24} />
          <span>DeploySphere</span>
        </div>
        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="nav-link active">Dashboard</Link>
          <Link to="/projects" className="nav-link">Projects</Link>
          <Link to="/github-connect" className="nav-link">GitHub</Link>
          <Link to="/docker" className="nav-link">Docker</Link>
        </div>
        <div className="dashboard-nav-right">
          <button 
            className="dashboard-refresh-btn" 
            onClick={() => fetchData(true)} 
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
          <div className="dashboard-alert dashboard-alert-error">
            {error}
          </div>
        )}

        {/* TOP STATS CARDS */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue">
              <Layers size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Projects</h3>
              <p className="stat-number">{stats?.totalProjects}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper orange">
              <RefreshCw size={24} />
            </div>
            <div className="stat-content">
              <h3>Active Tasks</h3>
              <p className="stat-number">{stats?.activeDeployments}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper green">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>Success Rate</h3>
              <p className="stat-number">{stats?.successRate}%</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper purple">
              <Server size={24} />
            </div>
            <div className="stat-content">
              <h3>Active Containers</h3>
              <p className="stat-number">{stats?.totalContainers}</p>
            </div>
          </div>
        </section>

        {/* METRICS & GRAPHS SECTION */}
        <section className="metrics-section">
          <h2>System Performance</h2>
          <div className="metrics-grid">
            {/* CPU CARD */}
            <div className="metric-chart-card">
              <div className="metric-chart-header">
                <div className="metric-title-block">
                  <Cpu size={20} className="text-blue" />
                  <div>
                    <h3>CPU Usage</h3>
                    <span>{metrics?.cpu.model}</span>
                  </div>
                </div>
                <div className="metric-value-block">
                  <span className="metric-current-value">{metrics?.cpu.usage}%</span>
                  <span>{metrics?.cpu.cores} Cores</span>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={metrics?.cpu.history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(99, 102, 241, 0.2)', color: '#f1f5f9' }} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU Usage %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RAM CARD */}
            <div className="metric-chart-card">
              <div className="metric-chart-header">
                <div className="metric-title-block">
                  <Activity size={20} className="text-green" />
                  <div>
                    <h3>RAM (Memory)</h3>
                    <span>System Memory Load</span>
                  </div>
                </div>
                <div className="metric-value-block">
                  <span className="metric-current-value">{metrics?.memory.usage}%</span>
                  <span>{metrics?.memory.used} / {metrics?.memory.total} GB</span>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={metrics?.memory.history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(99, 102, 241, 0.2)', color: '#f1f5f9' }} />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" name="RAM Usage %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DISK CARD */}
            <div className="metric-chart-card">
              <div className="metric-chart-header">
                <div className="metric-title-block">
                  <HardDrive size={20} className="text-purple" />
                  <div>
                    <h3>Disk Usage</h3>
                    <span>Virtual Storage Volume</span>
                  </div>
                </div>
                <div className="metric-value-block">
                  <span className="metric-current-value">{metrics?.disk.usage}%</span>
                  <span>{metrics?.disk.used} / {metrics?.disk.total} GB</span>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={metrics?.disk.history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(99, 102, 241, 0.2)', color: '#f1f5f9' }} />
                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorDisk)" name="Disk Usage %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* RECENT DEPLOYMENTS TABLE */}
        <section className="deployments-section">
          <div className="section-header">
            <h2>Recent Deployments</h2>
            <span className="badge">Activity Stream</span>
          </div>

          <div className="table-responsive">
            <table className="deployments-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Project</th>
                  <th>Source</th>
                  <th>Commit</th>
                  <th>Duration</th>
                  <th>Deployed At</th>
                  <th>Triggered By</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((dep) => (
                  <tr key={dep.id}>
                    <td className="status-cell">
                      <span className={`status-badge ${dep.status}`}>
                        {getStatusIcon(dep.status)}
                        {dep.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="project-name-cell">
                        <strong>{dep.project}</strong>
                        <span className="project-id-sub">{dep.id}</span>
                      </div>
                    </td>
                    <td>
                      <span className="branch-badge">
                        <GitBranch size={12} />
                        {dep.branch}
                      </span>
                    </td>
                    <td>
                      <div className="commit-cell">
                        <span className="commit-hash">
                          <Terminal size={12} />
                          {dep.commit}
                        </span>
                        <span className="commit-msg" title={dep.commitMessage}>
                          {dep.commitMessage}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="duration-cell">
                        <Clock size={12} />
                        {dep.duration}
                      </div>
                    </td>
                    <td className="date-cell">
                      {new Date(dep.deployedAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="user-cell">
                        <UserIcon size={12} />
                        {dep.deployedBy}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
