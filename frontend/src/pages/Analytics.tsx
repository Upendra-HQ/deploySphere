import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { apiUrl } from '../config/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Rocket,
  RefreshCw,
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle2,
  ListFilter,
  Layers,
  PieChart as PieIcon,
  Activity
} from 'lucide-react';

const ANALYTICS_API = apiUrl('/api/analytics/summary');
const PROJECTS_API = apiUrl('/api/projects');

interface Project {
  id: string;
  name: string;
}

interface TimelinePoint {
  date: string;
  success: number;
  failed: number;
}

interface DurationTrendPoint {
  id: string;
  projectName: string;
  status: string;
  duration: number;
  date: string;
}

interface FrameworkStat {
  name: string;
  value: number;
}

interface ProjectStat {
  id: string;
  name: string;
  framework: string;
  totalBuilds: number;
  successRate: number;
  avgDuration: number;
}

interface AnalyticsData {
  totalProjects: number;
  totalDeployments: number;
  successRate: number;
  avgDuration: number;
  activeRuntimes: number;
  mostActiveProject: string;
  timeline: TimelinePoint[];
  durationTrends: DurationTrendPoint[];
  frameworkStats: FrameworkStat[];
  projectStats: ProjectStat[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const Analytics: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user && (user.email === 'admin@deploysphere.local' || user.email.startsWith('admin@'));

  const fetchAnalytics = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    else setRefreshing(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch projects list for filter dropdown if not fetched
      if (projectsList.length === 0) {
        const pRes = await axios.get(PROJECTS_API, { headers });
        setProjectsList(pRes.data);
      }

      // Fetch analytics summary with optional project filter
      let url = ANALYTICS_API;
      if (selectedProjectId) {
        url += `?projectId=${selectedProjectId}`;
      }

      const res = await axios.get(url, { headers });
      setData(res.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to fetch platform analytics reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token, selectedProjectId]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading compilation stats and analytics...</p>
      </div>
    );
  }

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
          {isAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
          <Link to="/analytics" className="nav-link active">Analytics</Link>
        </div>
        <div className="dashboard-nav-right">
          <button 
            className="dashboard-refresh-btn" 
            onClick={() => fetchAnalytics(true)} 
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
            <h1>Platform Performance Analytics</h1>
            <p>Track deployment trends, success parameters, compile durations, and framework layouts</p>
          </div>
          
          {/* FILTER DROPDOWN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
            <ListFilter size={16} className="text-muted" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Project filter:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ background: '#1e1b4b' }}>All Projects</option>
              {projectsList.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#1e1b4b' }}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {data && (
          <>
            {/* KPI STAT CARDS */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
              <div className="stat-card">
                <div className="stat-icon-wrapper green"><CheckCircle2 size={24} /></div>
                <div className="stat-content">
                  <h3>Build Success Rate</h3>
                  <p className="stat-number">{data.successRate}%</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper orange"><Clock size={24} /></div>
                <div className="stat-content">
                  <h3>Avg Compile Speed</h3>
                  <p className="stat-number">{data.avgDuration}s</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper blue"><Activity size={24} /></div>
                <div className="stat-content">
                  <h3>Total Deployments</h3>
                  <p className="stat-number">{data.totalDeployments}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper purple"><Layers size={24} /></div>
                <div className="stat-content">
                  <h3>Active Runtimes</h3>
                  <p className="stat-number">{data.activeRuntimes}</p>
                </div>
              </div>
            </div>

            {/* CHARTS CONTAINER */}
            <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
              
              {/* TIMELINE DEPLOYMENT FREQUENCY CHART */}
              <div className="metric-chart-card">
                <div className="metric-chart-header">
                  <div className="metric-title-block">
                    <TrendingUp className="text-blue" />
                    <div>
                      <h3>Daily Build Frequency</h3>
                      <span>Compilation success vs failure distributions</span>
                    </div>
                  </div>
                </div>
                <div style={{ width: '100%', height: '260px', marginTop: '1rem' }}>
                  {data.timeline.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      No build history timeline available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.timeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e1b4b', borderColor: 'var(--border-color)', color: '#fff' }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="success" name="Successful" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* DURATION TREND CHART */}
              <div className="metric-chart-card">
                <div className="metric-chart-header">
                  <div className="metric-title-block">
                    <Clock className="text-green" />
                    <div>
                      <h3>Compilation Speed Trends</h3>
                      <span>Build execution times (s) for last 15 runs</span>
                    </div>
                  </div>
                </div>
                <div style={{ width: '100%', height: '260px', marginTop: '1rem' }}>
                  {data.durationTrends.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      No compiler duration timeline available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.durationTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="id" stroke="var(--text-muted)" fontSize={11} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} unit="s" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e1b4b', borderColor: 'var(--border-color)', color: '#fff' }} />
                        <Line type="monotone" dataKey="duration" name="Duration (sec)" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* FRAMEWORK DISTRIBUTION PIE */}
              <div className="metric-chart-card">
                <div className="metric-chart-header">
                  <div className="metric-title-block">
                    <PieIcon className="text-purple" />
                    <div>
                      <h3>Framework Distribution</h3>
                      <span>Active project repository stack composition</span>
                    </div>
                  </div>
                </div>
                <div style={{ width: '100%', height: '260px', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {data.frameworkStats.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>No framework distribution data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.frameworkStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.frameworkStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e1b4b', borderColor: 'var(--border-color)', color: '#fff' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>

            {/* PROJECTS COMPARISON MATRIX */}
            <section className="metrics-section">
              <h2>Project Analytics Comparison Grid</h2>
              <div className="metric-chart-card" style={{ padding: '1.5rem', overflowX: 'auto', marginTop: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Project Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Stack Framework</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Total Builds</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Success Rate</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Average Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.projectStats.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '1rem', fontWeight: '500' }}>{p.name}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.framework}</td>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{p.totalBuilds}</td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`project-status-text ${p.successRate >= 80 ? 'text-green' : p.successRate >= 50 ? 'text-warning' : 'text-error'}`} style={{ padding: 0 }}>
                            {p.successRate}%
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '500' }}>{p.avgDuration}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
