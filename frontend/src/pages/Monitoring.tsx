import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { apiUrl } from '../config/api';
import { 
  Rocket,
  Server, 
  Cpu, 
  Activity, 
  HardDrive, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Network,
  LogOut
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const METRICS_API = apiUrl('/api/monitoring/metrics');
const STATUS_API = apiUrl('/api/monitoring/status');

interface ServiceStatus {
  stackRunning: boolean;
  services: {
    prometheus: 'UP' | 'DOWN';
    grafana: 'UP' | 'DOWN';
    nodeExporter: 'UP' | 'DOWN';
    cadvisor: 'UP' | 'DOWN';
  };
  endpoints: {
    prometheus: string;
    grafana: string;
    nodeExporter: string;
    cadvisor: string;
  };
}

interface ContainerMetric {
  projectId: string;
  projectName: string;
  containerName: string;
  status: 'RUNNING' | 'STOPPED';
  metrics: {
    cpu: number;
    memory: number;
    networkRx: number;
    networkTx: number;
  };
}

interface HostMetrics {
  cpu: number;
  memory: number;
  disk: number;
}

interface HistoryPoint {
  time: string;
  cpu: number;
  memory: number;
}

const Monitoring: React.FC = () => {
  const { user, token, logout } = useAuth();
  const isAdmin = user && (user.email === 'admin@deploysphere.local' || user.email.startsWith('admin@'));
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [hostMetrics, setHostMetrics] = useState<HostMetrics>({ cpu: 0, memory: 0, disk: 0 });
  const [containers, setContainers] = useState<ContainerMetric[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStatusAndMetrics = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    else setRefreshing(true);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statusRes, metricsRes] = await Promise.all([
        axios.get(STATUS_API, { headers }),
        axios.get(METRICS_API, { headers })
      ]);

      setStatus(statusRes.data);
      setHostMetrics(metricsRes.data.host);
      setContainers(metricsRes.data.containers);
      
      // Update historical metrics data list (max 15 points)
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setHistory(prev => {
        const next = [...prev, {
          time: timeStr,
          cpu: metricsRes.data.host.cpu,
          memory: metricsRes.data.host.memory,
        }];
        if (next.length > 15) {
          next.shift();
        }
        return next;
      });

      setError('');
    } catch (err: any) {
      console.error('Error fetching monitoring data:', err);
      if (!isPoll) {
        setError('Failed to fetch metrics database. Please verify connection and try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatusAndMetrics();
    // Poll metrics every 5 seconds for real-time monitoring graphs
    const interval = setInterval(() => {
      fetchStatusAndMetrics(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading monitoring metrics...</p>
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
          <Link to="/monitoring" className="nav-link active">Monitoring</Link>
          <Link to="/proxy" className="nav-link">Routing</Link>
          {isAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
          <Link to="/analytics" className="nav-link">Analytics</Link>
        </div>
        <div className="dashboard-nav-right">
          <button 
            className="dashboard-refresh-btn" 
            onClick={() => fetchStatusAndMetrics(true)} 
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

        {/* MONITORING SERVICE BADGES */}
        <section className="metrics-section" style={{ marginBottom: '2rem' }}>
          <div className="projects-header-row" style={{ margin: '0 0 1rem 0' }}>
            <div>
              <h1>Monitoring Dashboard</h1>
              <p>Host server and docker container telemetry status</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a 
                href="http://localhost:3000" 
                target="_blank" 
                rel="noreferrer" 
                className="dashboard-create-btn"
                style={{ 
                  textDecoration: 'none', 
                  backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ExternalLink size={14} />
                <span>Open Grafana</span>
              </a>
              <a 
                href="http://localhost:9090" 
                target="_blank" 
                rel="noreferrer" 
                className="dashboard-create-btn"
                style={{ 
                  textDecoration: 'none', 
                  backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ExternalLink size={14} />
                <span>Open Prometheus</span>
              </a>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div className="stat-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prometheus</span>
                <h4 style={{ margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {status?.services.prometheus === 'UP' ? (
                    <span className="text-green" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}><CheckCircle2 size={16} /> Online</span>
                  ) : (
                    <span className="text-error" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}><XCircle size={16} /> Offline</span>
                  )}
                </h4>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Grafana</span>
                <h4 style={{ margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {status?.services.grafana === 'UP' ? (
                    <span className="text-green" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}><CheckCircle2 size={16} /> Online</span>
                  ) : (
                    <span className="text-error" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}><XCircle size={16} /> Offline</span>
                  )}
                </h4>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Node Exporter</span>
                <h4 style={{ margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {status?.services.nodeExporter === 'UP' ? (
                    <span className="text-green" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}><CheckCircle2 size={16} /> Online</span>
                  ) : (
                    <span className="text-error" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}><XCircle size={16} /> Offline</span>
                  )}
                </h4>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>cAdvisor</span>
                <h4 style={{ margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {status?.services.cadvisor === 'UP' ? (
                    <span className="text-green" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}><CheckCircle2 size={16} /> Online</span>
                  ) : (
                    <span className="text-error" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}><XCircle size={16} /> Offline</span>
                  )}
                </h4>
              </div>
            </div>
          </div>

          {/* WARNING BANNER */}
          {!status?.stackRunning && (
            <div className="dashboard-alert" style={{ 
              backgroundColor: 'rgba(245, 158, 11, 0.1)', 
              borderColor: 'rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              padding: '1.25rem',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'start',
              gap: '0.75rem',
              marginBottom: '2rem'
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: '600' }}>Monitoring Stack Offline (Displaying Simulation Data)</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                  Prometheus metrics gathering is offline. To deploy Node Exporter, cAdvisor, and Prometheus, run:
                </p>
                <code style={{
                  display: 'block',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  color: '#fff',
                  fontFamily: 'monospace',
                  margin: '0.5rem 0',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  docker compose -f monitoring/docker-compose.yml up -d
                </code>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(245, 158, 11, 0.8)' }}>
                  Grafana dashboard credential: <strong>admin</strong> / <strong>admin</strong>.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* HOST PERFORMANCE TRENDS */}
        <section className="metrics-section" style={{ marginBottom: '2.5rem' }}>
          <h2>Server Host Health</h2>
          <div className="metrics-grid">
            <div className="metric-chart-card">
              <div className="metric-chart-header">
                <div className="metric-title-block">
                  <Cpu size={20} className="text-blue" />
                  <div>
                    <h3>Host CPU Load</h3>
                    <span>Total active processor allocation</span>
                  </div>
                </div>
                <div className="metric-value-block">
                  <span className="metric-current-value">{hostMetrics.cpu}%</span>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHostCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(99, 102, 241, 0.2)', color: '#f1f5f9' }} />
                    <Area type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorHostCpu)" name="CPU Usage %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="metric-chart-card">
              <div className="metric-chart-header">
                <div className="metric-title-block">
                  <Activity size={20} className="text-green" />
                  <div>
                    <h3>Host Memory Load</h3>
                    <span>Host system allocated memory load</span>
                  </div>
                </div>
                <div className="metric-value-block">
                  <span className="metric-current-value">{hostMetrics.memory}%</span>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHostMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.05)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(10, 185, 129, 0.2)', color: '#f1f5f9' }} />
                    <Area type="monotone" dataKey="memory" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorHostMem)" name="Memory Usage %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="metric-chart-card">
              <div className="metric-chart-header">
                <div className="metric-title-block">
                  <HardDrive size={20} className="text-purple" />
                  <div>
                    <h3>Disk Capacity</h3>
                    <span>Overall volume consumption</span>
                  </div>
                </div>
                <div className="metric-value-block">
                  <span className="metric-current-value">{hostMetrics.disk}%</span>
                </div>
              </div>
              <div className="chart-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '160px', padding: '0 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>Used Space</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{hostMetrics.disk}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    width: `${hostMetrics.disk}%`,
                    height: '100%',
                    background: 'var(--accent-gradient)',
                    borderRadius: '10px',
                    transition: 'width 0.5s ease-in-out'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Mounted: /</span>
                  <span>512 GB Total</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTAINER RUNTIME METRICS BREAKDOWN */}
        <section className="metrics-section">
          <h2>Container Runtime Status</h2>
          {containers.length === 0 ? (
            <div className="empty-projects-state">
              <Server size={48} className="empty-icon" />
              <h2>No Active Containers Found</h2>
              <p>Metrics collection requires successfully running application containers.</p>
              <Link to="/projects" className="auth-btn" style={{ width: 'auto', marginTop: '1rem' }}>
                Deploy Projects
              </Link>
            </div>
          ) : (
            <div className="projects-grid">
              {containers.map((container) => (
                <div key={container.projectId} className="project-card" style={{ padding: '1.5rem' }}>
                  <div className="project-card-header" style={{ marginBottom: '1.25rem' }}>
                    <div className="project-card-title">
                      <Server size={20} className="project-type-icon text-blue" />
                      <div>
                        <h3 style={{ fontSize: '1.1rem' }}>{container.projectName}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {container.containerName}
                        </span>
                      </div>
                    </div>
                    <span className="project-status-text text-green" style={{ border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      <CheckCircle2 size={12} />
                      <span style={{ fontSize: '0.8rem' }}>Running</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {/* CPU */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                          <Cpu size={14} /> CPU Allocation
                        </span>
                        <span style={{ fontWeight: '600' }}>{container.metrics.cpu}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px' }}>
                        <div style={{ 
                          width: `${Math.min(100, container.metrics.cpu * 5)}%`, 
                          height: '100%', 
                          backgroundColor: '#6366f1', 
                          borderRadius: '3px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>

                    {/* Memory */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                          <Activity size={14} /> Memory Usage
                        </span>
                        <span style={{ fontWeight: '600' }}>{container.metrics.memory} MB</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px' }}>
                        <div style={{ 
                          width: `${Math.min(100, (container.metrics.memory / 512) * 100)}%`, 
                          height: '100%', 
                          backgroundColor: '#10b981', 
                          borderRadius: '3px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>

                    {/* Network RX/TX */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '1rem', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      fontSize: '0.8rem'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Network Rx (In)</span>
                        <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                          <Network size={12} className="text-blue" />
                          {container.metrics.networkRx} KB/s
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Network Tx (Out)</span>
                        <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                          <Network size={12} className="text-purple" />
                          {container.metrics.networkTx} KB/s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Monitoring;
