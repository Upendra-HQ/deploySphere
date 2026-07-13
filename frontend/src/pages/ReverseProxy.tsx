import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { apiUrl } from '../config/api';
import { 
  Rocket, 
  Server, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Code, 
  ChevronDown, 
  ChevronUp, 
  Network, 
  ArrowRight,
  LogOut,
  Edit2,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
  Unlock,
  Terminal,
  X
} from 'lucide-react';

const PROXY_ROUTES_API = apiUrl('/api/proxy/routes');
const PROXY_STATUS_API = apiUrl('/api/proxy/status');
const CUSTOM_DOMAIN_API = apiUrl('/api/proxy/custom-domain');
const RELOAD_API = apiUrl('/api/proxy/reload');
const SSL_GENERATE_API = apiUrl('/api/ssl/generate');
const SSL_DELETE_API = apiUrl('/api/ssl/delete');

interface SSLStatus {
  active: boolean;
  type: 'LET_ENCRYPT' | 'SELF_SIGNED' | 'NONE';
}

interface ProxyRoute {
  projectId: string;
  projectName: string;
  subdomain: string;
  customDomain: string;
  subdomainSSL: SSLStatus;
  customDomainSSL: SSLStatus;
  internalPort: number | null;
  status: 'RUNNING' | 'STOPPED';
  nginxConfig: string;
}

interface ProxyStatus {
  running: boolean;
  port: number;
  host: string;
  message: string;
  startupCmd: string;
}

const ReverseProxy: React.FC = () => {
  const { user, token, logout } = useAuth();
  const isAdmin = user && (user.email === 'admin@deploysphere.local' || user.email.startsWith('admin@'));
  const [routes, setRoutes] = useState<ProxyRoute[]>([]);
  const [status, setStatus] = useState<ProxyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Expanded config block list (set of project IDs)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Custom Domain Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempDomain, setTempDomain] = useState('');
  const [savingDomainId, setSavingDomainId] = useState<string | null>(null);

  // SSL Modal States
  const [showSSLModal, setShowSSLModal] = useState(false);
  const [sslProject, setSslProject] = useState<ProxyRoute | null>(null);
  const [sslDomain, setSslDomain] = useState('');
  const [sslMethod, setSslMethod] = useState<'selfsigned' | 'letsencrypt'>('selfsigned');
  const [sslEmail, setSslEmail] = useState('');
  const [sslGenerating, setSslGenerating] = useState(false);
  const [sslLogs, setSslLogs] = useState('');
  const [sslError, setSslError] = useState('');

  const fetchProxyData = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    else setRefreshing(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statusRes, routesRes] = await Promise.all([
        axios.get(PROXY_STATUS_API, { headers }),
        axios.get(PROXY_ROUTES_API, { headers })
      ]);

      setStatus(statusRes.data);
      setRoutes(routesRes.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching proxy data:', err);
      if (!isPoll) {
        setError('Failed to fetch reverse proxy configurations.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProxyData();
    // Poll router logs and status maps every 8 seconds
    const interval = setInterval(() => fetchProxyData(true), 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleReload = async () => {
    setRefreshing(true);
    try {
      const res = await axios.post(RELOAD_API, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      await fetchProxyData(true);
    } catch (err: any) {
      console.error('Error reloading proxy:', err);
      alert(err.response?.data?.message || 'Failed to reload Nginx gateway configuration.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveDomain = async (projectId: string) => {
    setSavingDomainId(projectId);
    try {
      await axios.post(
        CUSTOM_DOMAIN_API,
        { projectId, domain: tempDomain },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingId(null);
      await fetchProxyData(true);
    } catch (err: any) {
      console.error('Error updating domain mapping:', err);
      alert(err.response?.data?.message || 'Failed to update custom domain routing.');
    } finally {
      setSavingDomainId(null);
    }
  };

  const startEditing = (project: ProxyRoute) => {
    setEditingId(project.projectId);
    setTempDomain(project.customDomain);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTempDomain('');
  };

  const toggleExpandConfig = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  // Open SSL configuration triggers modal
  const openSSLModal = (project: ProxyRoute, defaultDomain: string) => {
    setSslProject(project);
    setSslDomain(defaultDomain);
    setSslMethod('selfsigned');
    setSslEmail('');
    setSslLogs('');
    setSslError('');
    setShowSSLModal(true);
  };

  const closeSSLModal = () => {
    setShowSSLModal(false);
    setSslProject(null);
    fetchProxyData(true);
  };

  // SSL Generation Trigger
  const handleGenerateSSL = async () => {
    if (!sslProject) return;
    setSslGenerating(true);
    setSslError('');
    setSslLogs('[INFO] Dispatching SSL validation request to API layer...\n');

    try {
      const res = await axios.post(
        SSL_GENERATE_API,
        {
          projectId: sslProject.projectId,
          domain: sslDomain,
          method: sslMethod,
          email: sslMethod === 'letsencrypt' ? sslEmail : undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSslLogs(res.data.logs || '[SUCCESS] SSL certificate processed successfully.');
    } catch (err: any) {
      console.error('Error generating SSL certificate:', err);
      setSslError(err.response?.data?.message || 'SSL Certificate request failed on the backend.');
      setSslLogs(prev => prev + `[ERROR] Verification failed: ${err.response?.data?.message || err.message}\n`);
    } finally {
      setSslGenerating(false);
    }
  };

  // SSL Certificate Deletion Trigger
  const handleDeleteSSL = async (project: ProxyRoute, targetDomain: string) => {
    if (!window.confirm(`Are you sure you want to delete the SSL configuration files for ${targetDomain}? This will downgrade connection security to HTTP-only.`)) {
      return;
    }

    setRefreshing(true);
    try {
      await axios.delete(SSL_DELETE_API, {
        headers: { Authorization: `Bearer ${token}` },
        data: { projectId: project.projectId, domain: targetDomain }
      });
      alert(`SSL Certificate for ${targetDomain} removed successfully.`);
      await fetchProxyData(true);
    } catch (err: any) {
      console.error('Error deleting SSL config:', err);
      alert(err.response?.data?.message || 'Failed to remove certificate files.');
    } finally {
      setRefreshing(false);
    }
  };

  const renderSSLBadge = (project: ProxyRoute, targetDomain: string, sslState: SSLStatus) => {
    if (!project.internalPort) {
      return null;
    }

    if (sslState.active) {
      const typeLabel = sslState.type === 'SELF_SIGNED' ? 'Self-Signed' : 'Let\'s Encrypt';
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
          <span 
            className="project-status-text text-green" 
            style={{ 
              fontSize: '0.75rem', 
              padding: '0.15rem 0.4rem', 
              borderRadius: '4px', 
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Lock size={12} />
            <span>HTTPS ({typeLabel})</span>
          </span>
          <button 
            onClick={() => handleDeleteSSL(project, targetDomain)}
            style={{ 
              fontSize: '0.75rem', 
              color: 'var(--error)', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            disabled={refreshing}
          >
            Remove SSL
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
        <span 
          className="project-status-text text-muted" 
          style={{ 
            fontSize: '0.75rem', 
            padding: '0.15rem 0.4rem', 
            borderRadius: '4px', 
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--text-muted)'
          }}
        >
          <Unlock size={12} />
          <span>HTTP Only</span>
        </span>
        <button 
          onClick={() => openSSLModal(project, targetDomain)}
          style={{ 
            fontSize: '0.75rem', 
            color: 'var(--accent-hover)', 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Enable SSL
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading routing configurations...</p>
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
          <Link to="/proxy" className="nav-link active">Routing</Link>
          {isAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
          <Link to="/analytics" className="nav-link">Analytics</Link>
        </div>
        <div className="dashboard-nav-right">
          <button 
            className="dashboard-refresh-btn" 
            onClick={() => fetchProxyData(true)} 
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

        {/* PROXY GATEWAY STATUS */}
        <section className="metrics-section" style={{ marginBottom: '2rem' }}>
          <div className="projects-header-row" style={{ margin: '0 0 1rem 0' }}>
            <div>
              <h1>Reverse Proxy & SSL Routing</h1>
              <p>Map domain names and provision secure SSL/TLS certificates dynamically</p>
            </div>
            <div>
              <button 
                className="dashboard-create-btn"
                onClick={handleReload}
                disabled={refreshing}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                <span>Reload Gateway</span>
              </button>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: status?.running ? '4px solid var(--success)' : '4px solid var(--error)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: status?.running ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: status?.running ? 'var(--success)' : 'var(--error)'
                }}>
                  <Network size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Nginx Proxy Gateway</h3>
                  <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {status?.message} Routing HTTP (port 80) and HTTPS (port 443).
                  </p>
                </div>
              </div>
              <div>
                <span className={`project-status-text ${status?.running ? 'text-green' : 'text-error'}`} style={{ fontSize: '1rem', fontWeight: '600' }}>
                  {status?.running ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <span>{status?.running ? 'Gateway Active' : 'Gateway Inactive'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* DOCKER RUN COMPOSE BANNER */}
          {!status?.running && (
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
                <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: '600' }}>Nginx Gateway Offline (Displaying Local Host Bindings)</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                  To start Nginx and route subdomains or custom domains to applications, execute the gateway compose setup in your terminal:
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
                  {status?.startupCmd || 'docker compose -f nginx/docker-compose.yml up -d'}
                </code>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(245, 158, 11, 0.8)' }}>
                  Note: Subdomain routing requires mapping DNS records or mapping hosts mapping targets in your local hosts file (e.g. <code>127.0.0.1 myservice.deploysphere.local</code>).
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ACTIVE ROUTES LIST */}
        <section className="metrics-section">
          <h2>Application Routing & Security Mappings</h2>
          {routes.length === 0 ? (
            <div className="empty-projects-state">
              <Globe size={48} className="empty-icon" />
              <h2>No Projects Found</h2>
              <p>Routing configurations are auto-generated when projects are created and successfully compiled.</p>
              <Link to="/projects/new" className="auth-btn" style={{ width: 'auto', marginTop: '1rem' }}>
                Create New Project
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {routes.map((route) => (
                <div key={route.projectId} className="project-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Row Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Server size={20} className="text-blue" />
                      <div>
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{route.projectName}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
                          <span className={`project-status-text ${route.status === 'RUNNING' ? 'text-green' : 'text-error'}`} style={{ padding: 0, background: 'none', border: 'none', fontSize: '0.8rem' }}>
                            {route.status === 'RUNNING' ? 'Running' : 'Stopped'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="dashboard-refresh-btn" 
                        onClick={() => toggleExpandConfig(route.projectId)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Code size={14} />
                        <span>Nginx Config</span>
                        {expandedId === route.projectId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Routing Mapping Details */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '1.25rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {/* INTERNAL BINDING */}
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Internal Destination</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                        <ArrowRight size={14} className="text-blue" />
                        {route.internalPort ? (
                          <span style={{ fontFamily: 'monospace' }}>http://localhost:{route.internalPort}</span>
                        ) : (
                          <span className="text-error" style={{ fontSize: '0.9rem' }}>Offline (No exposed port)</span>
                        )}
                      </div>
                    </div>

                    {/* GATEWAY SUBDOMAIN */}
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Local Gateway Subdomain</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Globe size={14} className="text-purple" />
                          {route.internalPort ? (
                            <a 
                              href={`${route.subdomainSSL.active ? 'https' : 'http'}://${route.subdomain}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ color: 'var(--accent-hover)', textDecoration: 'none', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <span>{route.subdomain}</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>{route.subdomain}</span>
                          )}
                        </div>
                        {renderSSLBadge(route, route.subdomain, route.subdomainSSL)}
                      </div>
                    </div>

                    {/* CUSTOM DOMAIN ENTRY */}
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Custom Routing Domain</span>
                      {editingId === route.projectId ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            className="auth-input" 
                            style={{ margin: 0, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                            value={tempDomain}
                            onChange={(e) => setTempDomain(e.target.value)}
                            placeholder="e.g. app.mybrand.com"
                            disabled={savingDomainId === route.projectId}
                          />
                          <button 
                            className="dashboard-create-btn"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            onClick={() => handleSaveDomain(route.projectId)}
                            disabled={savingDomainId === route.projectId}
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            className="dashboard-logout-btn"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', margin: 0, background: 'transparent', borderColor: 'var(--border-color)' }}
                            onClick={cancelEditing}
                            disabled={savingDomainId === route.projectId}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {route.customDomain ? (
                              <a 
                                href={`${route.customDomainSSL.active ? 'https' : 'http'}://${route.customDomain}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ color: 'var(--success)', textDecoration: 'none', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <span>{route.customDomain}</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No custom domain mapped</span>
                            )}
                            <button 
                              className="dashboard-refresh-btn"
                              style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
                              onClick={() => startEditing(route)}
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                          {route.customDomain && renderSSLBadge(route, route.customDomain, route.customDomainSSL)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* NGINX CODE PREVIEW BLOCK */}
                  {expandedId === route.projectId && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Generated Server Block Configuration (/etc/nginx/conf.d/deploysphere-{route.projectId}.conf)</span>
                      <pre style={{
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        padding: '1rem',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        color: '#34d399',
                        overflowX: 'auto',
                        border: '1px solid rgba(255,255,255,0.05)',
                        margin: 0
                      }}>
                        {route.nginxConfig}
                      </pre>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </section>

        {/* SSL PROVISIONING MODAL */}
        {showSSLModal && sslProject && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '2rem'
          }}>
            <div className="form-card" style={{ maxWidth: '650px', width: '100%', margin: 0, position: 'relative' }}>
              <button 
                onClick={closeSSLModal}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
                disabled={sslGenerating}
              >
                <X size={20} />
              </button>

              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck className="text-blue" />
                <span>SSL Certificate Provisioning</span>
              </h2>
              <p className="form-subtitle">Secure connection hostname <strong>{sslDomain}</strong> with dynamic TLS certificates.</p>

              {sslError && (
                <div className="dashboard-alert dashboard-alert-error" style={{ marginTop: '1rem' }}>
                  {sslError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                {/* Method selector */}
                <div>
                  <label className="auth-label">Verification Authority Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div 
                      onClick={() => !sslGenerating && setSslMethod('selfsigned')}
                      style={{
                        border: `1px solid ${sslMethod === 'selfsigned' ? 'var(--accent-solid)' : 'var(--border-color)'}`,
                        backgroundColor: sslMethod === 'selfsigned' ? 'rgba(99,102,241,0.05)' : 'transparent',
                        padding: '1rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Self-Signed Sandbox</h4>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Instant compilation. Perfect for local dev testing subdomains.
                      </p>
                    </div>
                    
                    <div 
                      onClick={() => !sslGenerating && setSslMethod('letsencrypt')}
                      style={{
                        border: `1px solid ${sslMethod === 'letsencrypt' ? 'var(--accent-solid)' : 'var(--border-color)'}`,
                        backgroundColor: sslMethod === 'letsencrypt' ? 'rgba(99,102,241,0.05)' : 'transparent',
                        padding: '1rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Let's Encrypt Authority</h4>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        HTTP-01 validation. Requires DNS mapping. Falls back to self-signed on failure.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Let's Encrypt Email */}
                {sslMethod === 'letsencrypt' && (
                  <div>
                    <label className="auth-label">Contact Notification Email</label>
                    <input 
                      type="email" 
                      className="auth-input" 
                      style={{ marginTop: '0.5rem' }}
                      value={sslEmail}
                      onChange={(e) => setSslEmail(e.target.value)}
                      placeholder="e.g. notifications@company.com"
                      required
                      disabled={sslGenerating}
                    />
                  </div>
                )}

                {/* LOGS CONSOLE */}
                {sslLogs && (
                  <div>
                    <label className="auth-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Terminal size={14} /> Provisioning Logs Console
                    </label>
                    <pre style={{
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      padding: '1rem',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      color: '#a855f7',
                      height: '150px',
                      overflowY: 'auto',
                      border: '1px solid rgba(255,255,255,0.05)',
                      marginTop: '0.5rem'
                    }}>
                      {sslLogs}
                    </pre>
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'end', marginTop: '0.5rem' }}>
                  <button 
                    className="dashboard-logout-btn"
                    style={{ margin: 0, background: 'transparent', borderColor: 'var(--border-color)' }}
                    onClick={closeSSLModal}
                    disabled={sslGenerating}
                  >
                    {sslLogs ? 'Close Portal' : 'Cancel'}
                  </button>
                  <button 
                    className="auth-btn"
                    style={{ width: 'auto', margin: 0, padding: '0.6rem 2rem' }}
                    onClick={handleGenerateSSL}
                    disabled={sslGenerating || (sslMethod === 'letsencrypt' && !sslEmail)}
                  >
                    {sslGenerating ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={16} className="spin" />
                        <span>Verifying...</span>
                      </span>
                    ) : (
                      <span>Generate SSL</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReverseProxy;
