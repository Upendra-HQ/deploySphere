import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { apiUrl } from '../config/api';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Info,
  FolderPlus,
  Settings,
  PlusCircle,
  Github,
  ToggleLeft,
  ToggleRight,
  Loader,
  Copy,
  Cpu,
  Terminal
} from 'lucide-react';

interface EnvVarInput {
  key: string;
  value: string;
}

interface GithubRepo {
  name: string;
  fullName: string;
  url: string;
}

interface GithubBranch {
  name: string;
}

const ProjectForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const { token } = useAuth();
  const navigate = useNavigate();

  // Form Fields
  const [name, setName] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [framework, setFramework] = useState('React');
  const [buildCommand, setBuildCommand] = useState('');
  const [startCommand, setStartCommand] = useState('');
  const [envVariables, setEnvVariables] = useState<EnvVarInput[]>([]);
  const [deploymentStrategy, setDeploymentStrategy] = useState<'STANDARD' | 'BLUE_GREEN' | 'CANARY'>('STANDARD');
  const [canaryWeight, setCanaryWeight] = useState(10);

  // Jenkins Config States
  const [useJenkins, setUseJenkins] = useState(false);
  const [jenkinsUrl, setJenkinsUrl] = useState('');
  const [jenkinsUser, setJenkinsUser] = useState('');
  const [jenkinsToken, setJenkinsToken] = useState('');
  const [jenkinsJobName, setJenkinsJobName] = useState('');
  const [jenkinsfile, setJenkinsfile] = useState('');
  const [showJenkinsfilePanel, setShowJenkinsfilePanel] = useState(false);

  // GitHub Integration States
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [githubBranches, setGithubBranches] = useState<GithubBranch[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [manualInputMode, setManualInputMode] = useState(false);

  // Loaders
  const [loading, setLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Framework Default Commands Helper
  const applyFrameworkDefaults = (fw: string) => {
    switch (fw) {
      case 'React':
      case 'Vue':
      case 'Svelte':
        setBuildCommand('npm run build');
        setStartCommand('npm run preview');
        break;
      case 'Next.js':
        setBuildCommand('npm run build');
        setStartCommand('npm start');
        break;
      case 'Node.js':
        setBuildCommand('');
        setStartCommand('npm start');
        break;
      case 'Static':
        setBuildCommand('');
        setStartCommand('');
        break;
      default:
        break;
    }
  };

  // 1. Initial configuration load
  useEffect(() => {
    const initializeForm = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Check if user has connected GitHub
        const meRes = await axios.get(apiUrl('/api/auth/me'), { headers });
        const hasGithub = !!meRes.data.user?.githubToken;
        setIsGithubConnected(hasGithub);
        if (hasGithub) {
          setGithubUsername(meRes.data.user.githubUsername || '');
        }

        // If editing, load project details
        if (isEditMode) {
          const projectRes = await axios.get(apiUrl(`/api/projects/${id}`), { headers });
          const project = projectRes.data;
          setName(project.name);
          setRepositoryUrl(project.repositoryUrl);
          setBranch(project.branch);
          setFramework(project.framework);
          setBuildCommand(project.buildCommand || '');
          setStartCommand(project.startCommand || '');
          setEnvVariables(project.envVariables.map((v: any) => ({ key: v.key, value: v.value })));
          setUseJenkins(project.useJenkins || false);
          setJenkinsUrl(project.jenkinsUrl || '');
          setJenkinsUser(project.jenkinsUser || '');
          setJenkinsToken(project.jenkinsToken || '');
          setJenkinsJobName(project.jenkinsJobName || '');
          setDeploymentStrategy(project.deploymentStrategy || 'STANDARD');
          setCanaryWeight(project.canaryWeight !== undefined ? project.canaryWeight : 10);
          
          if (project.useJenkins) {
            try {
              const jkRes = await axios.get(apiUrl(`/api/jenkins/jenkinsfile/${id}`), { headers });
              setJenkinsfile(jkRes.data.jenkinsfile);
            } catch {}
          }
          
          // Switch to manual input mode for edits (standard way)
          setManualInputMode(true);
        } else {
          applyFrameworkDefaults('React');
          // If GitHub is connected, set mode to selection
          setManualInputMode(!hasGithub);
        }

        // Load repository lists if connected and not in manual mode
        if (hasGithub && !isEditMode) {
          setReposLoading(true);
          const reposRes = await axios.get(apiUrl('/api/github/repos'), { headers });
          setGithubRepos(reposRes.data);
          setReposLoading(false);
        }
      } catch (err: any) {
        console.error('Error initializing form:', err);
        setError('Failed to load initial configurations.');
      } finally {
        setLoading(false);
      }
    };

    initializeForm();
  }, [id, token]);

  // 2. Fetch branches when repository changes
  useEffect(() => {
    const fetchRepoBranches = async () => {
      if (!selectedRepo || manualInputMode) return;

      const repo = githubRepos.find(r => r.fullName === selectedRepo);
      if (!repo) return;

      // Set defaults based on repo fullName
      setRepositoryUrl(repo.url);
      if (!isEditMode) {
        // Set name to repo name if not edited
        setName(repo.name);
      }

      setBranchesLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [owner, repoName] = repo.fullName.split('/');
        const res = await axios.get(apiUrl(`/api/github/repos/${owner}/${repoName}/branches`), { headers });
        setGithubBranches(res.data);
        if (res.data.length > 0) {
          setBranch(res.data[0].name);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
        setError('Failed to fetch repository branches.');
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchRepoBranches();
  }, [selectedRepo, manualInputMode, githubRepos, token]);

  const handleFrameworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setFramework(selected);
    applyFrameworkDefaults(selected);
  };

  // Env variables management
  const addEnvVarField = () => {
    setEnvVariables([...envVariables, { key: '', value: '' }]);
  };

  const removeEnvVarField = (index: number) => {
    const updated = [...envVariables];
    updated.splice(index, 1);
    setEnvVariables(updated);
  };

  const handleEnvVarChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVariables];
    updated[index][field] = val;
    setEnvVariables(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !repositoryUrl) {
      setError('Project name and Git repository URL are required.');
      return;
    }

    if (!repositoryUrl.startsWith('http://') && !repositoryUrl.startsWith('https://')) {
      setError('Repository URL must start with http:// or https://');
      return;
    }

    // Validate env variables
    const validEnvVars = envVariables.filter(env => env.key.trim() !== '');
    const keys = validEnvVars.map(v => v.key.trim());
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      setError('Duplicate environment variable keys are not allowed.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        repositoryUrl,
        branch,
        framework,
        buildCommand,
        startCommand,
        useJenkins,
        jenkinsUrl,
        jenkinsUser,
        jenkinsToken,
        jenkinsJobName,
        deploymentStrategy,
        canaryWeight,
        envVariables: validEnvVars.map(v => ({ key: v.key.trim(), value: v.value.trim() }))
      };

      const headers = { Authorization: `Bearer ${token}` };

      if (isEditMode) {
        await axios.put(apiUrl(`/api/projects/${id}`), payload, { headers });
      } else {
        await axios.post(apiUrl('/api/projects'), payload, { headers });
      }

      navigate('/projects');
    } catch (err: any) {
      console.error('Error saving project:', err);
      setError(err.response?.data?.message || 'Something went wrong while saving your project.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading project settings...</p>
      </div>
    );
  }

  return (
    <div className="project-form-page">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-brand">
          {isEditMode ? <Settings size={24} /> : <FolderPlus size={24} />}
          <span>{isEditMode ? 'Edit Configuration' : 'Configure Project'}</span>
        </div>
        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/projects" className="nav-link active">Projects</Link>
        </div>
        <div className="dashboard-nav-right">
          <Link to="/projects" className="dashboard-logout-btn" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}>
            Cancel
          </Link>
        </div>
      </nav>

      <main className="dashboard-container" style={{ maxWidth: '800px' }}>
        <Link to="/projects" className="auth-link auth-back-link" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} />
          Back to Projects
        </Link>

        <div className="form-card">
          <h2>{isEditMode ? 'Project Configuration Settings' : 'Initialize New Project'}</h2>
          <p className="form-subtitle">Define git configurations, build paths, and environment settings.</p>

          {/* GitHub quick connect block */}
          {!isEditMode && (
            <div className="form-github-status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Github size={20} className={isGithubConnected ? 'text-blue' : 'text-muted'} />
                <span style={{ fontSize: '0.85rem' }}>
                  {isGithubConnected 
                    ? `Connected to GitHub as @${githubUsername}` 
                    : 'GitHub not connected'}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {isGithubConnected ? (
                  <button 
                    type="button" 
                    onClick={() => setManualInputMode(!manualInputMode)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: 'none', color: 'var(--accent-hover)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}
                  >
                    {manualInputMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    <span>Manual URL Input</span>
                  </button>
                ) : (
                  <Link to="/github-connect" className="auth-link" style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                    Connect Account
                  </Link>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="auth-alert auth-alert-error" style={{ marginTop: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="project-form">
            <section className="form-section">
              <h3>General Configurations</h3>
              <div className="form-grid">
                <div className="auth-input-group">
                  <label htmlFor="proj-name">Project Name</label>
                  <input
                    id="proj-name"
                    type="text"
                    placeholder="my-awesome-service"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-input-group">
                  <label htmlFor="proj-framework">Framework Presets</label>
                  <select
                    id="proj-framework"
                    value={framework}
                    onChange={handleFrameworkChange}
                    className="form-select"
                  >
                    <option value="React">React</option>
                    <option value="Next.js">Next.js</option>
                    <option value="Vue">Vue</option>
                    <option value="Svelte">Svelte</option>
                    <option value="Node.js">Node.js / Express</option>
                    <option value="Static">Static HTML / CSS</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="form-section">
              <h3>Repository Configurations</h3>
              <div className="form-grid">
                {isGithubConnected && !manualInputMode && !isEditMode ? (
                  // Dropdown selection mode
                  <>
                    <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>
                      <label htmlFor="github-repo-select">GitHub Repository</label>
                      {reposLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px', padding: '0 1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                          <Loader size={16} className="spin text-muted" />
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Fetching repository list...</span>
                        </div>
                      ) : (
                        <select
                          id="github-repo-select"
                          value={selectedRepo}
                          onChange={(e) => setSelectedRepo(e.target.value)}
                          className="form-select"
                          required
                        >
                          <option value="">-- Select GitHub Repository --</option>
                          {githubRepos.map((repo) => (
                            <option key={repo.fullName} value={repo.fullName}>
                              {repo.fullName}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="auth-input-group">
                      <label htmlFor="github-branch-select">Target Branch</label>
                      {branchesLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px', padding: '0 1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                          <Loader size={16} className="spin text-muted" />
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading branches...</span>
                        </div>
                      ) : (
                        <select
                          id="github-branch-select"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="form-select"
                          required
                          disabled={!selectedRepo}
                        >
                          {githubBranches.length === 0 ? (
                            <option value="">-- No Branches --</option>
                          ) : (
                            githubBranches.map((b) => (
                              <option key={b.name} value={b.name}>
                                {b.name}
                              </option>
                            ))
                          )}
                        </select>
                      )}
                    </div>
                  </>
                ) : (
                  // Manual input mode
                  <>
                    <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>
                      <label htmlFor="proj-repo">Git Repository URL</label>
                      <input
                        id="proj-repo"
                        type="url"
                        placeholder="https://github.com/username/repository-name"
                        value={repositoryUrl}
                        onChange={(e) => setRepositoryUrl(e.target.value)}
                        required
                        disabled={isEditMode} // lock repo url on edit
                      />
                    </div>

                    <div className="auth-input-group">
                      <label htmlFor="proj-branch">Deployment Branch</label>
                      <input
                        id="proj-branch"
                        type="text"
                        placeholder="main"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="form-section">
              <h3>Build & Runtime Executables</h3>
              <div className="form-grid">
                <div className="auth-input-group">
                  <label htmlFor="proj-build">Build Command</label>
                  <input
                    id="proj-build"
                    type="text"
                    placeholder="npm run build"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                  />
                  <span className="input-helper">Executed during compilation phase.</span>
                </div>

                <div className="auth-input-group">
                  <label htmlFor="proj-start">Start Command</label>
                  <input
                    id="proj-start"
                    type="text"
                    placeholder="npm start"
                    value={startCommand}
                    onChange={(e) => setStartCommand(e.target.value)}
                  />
                  <span className="input-helper">Executed during production container run.</span>
                </div>
              </div>
            </section>

            <section className="form-section">
              <h3>Deployment Strategy & Traffic Mappings</h3>
              <div className="form-grid">
                <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="proj-strategy">Routing Strategy</label>
                  <select
                    id="proj-strategy"
                    value={deploymentStrategy}
                    onChange={(e) => setDeploymentStrategy(e.target.value as any)}
                    className="auth-input"
                    style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '0.6rem' }}
                  >
                    <option value="STANDARD">Standard Upstream (Direct Single Container)</option>
                    <option value="BLUE_GREEN">Blue-Green (Failover standby backup container)</option>
                    <option value="CANARY">Canary upstreams (Weighted split traffic)</option>
                  </select>
                </div>

                {deploymentStrategy === 'CANARY' && (
                  <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label htmlFor="canary-weight">Canary Traffic Weight (Green Container): {canaryWeight}%</label>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-hover)' }}>Production Weight (Blue): {100 - canaryWeight}%</span>
                    </div>
                    <input
                      id="canary-weight"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={canaryWeight}
                      onChange={(e) => setCanaryWeight(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: 'var(--accent-solid)' }}
                    />
                    <span className="input-helper">Determine what percentage of network request loads are automatically routed to the secondary Canary container.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="form-section">
              <div className="section-title-row">
                <h3>Environment Variables (Secrets)</h3>
                <button 
                  type="button" 
                  onClick={addEnvVarField}
                  className="add-env-btn"
                >
                  <PlusCircle size={14} />
                  Add Variable
                </button>
              </div>

              {envVariables.length === 0 ? (
                <div className="empty-env-box">
                  <Info size={16} />
                  <span>No environment variables added. Application will run with default configs.</span>
                </div>
              ) : (
                <div className="env-inputs-list">
                  {envVariables.map((env, index) => (
                    <div key={index} className="env-var-row">
                      <input
                        type="text"
                        placeholder="KEY"
                        value={env.key}
                        onChange={(e) => handleEnvVarChange(index, 'key', e.target.value.toUpperCase())}
                        className="env-key-input"
                        required
                      />
                      <input
                        type="text"
                        placeholder="VALUE"
                        value={env.value}
                        onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                        className="env-val-input"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => removeEnvVarField(index)}
                        className="remove-env-row-btn"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Jenkins CI/CD Settings Section */}
            <section className="form-section">
              <div className="section-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={18} className="text-blue" />
                  <h3>Jenkins CI/CD Pipeline</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setUseJenkins(!useJenkins)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  {useJenkins ? (
                    <ToggleRight size={38} className="text-blue" />
                  ) : (
                    <ToggleLeft size={38} style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
              </div>

              {useJenkins && (
                <div className="jenkins-form-block" style={{ marginTop: '1.25rem', display: 'grid', gap: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <div className="form-grid">
                    <div className="auth-input-group">
                      <label htmlFor="jk-url">Jenkins Server URL</label>
                      <input
                        id="jk-url"
                        type="url"
                        placeholder="http://localhost:8080"
                        value={jenkinsUrl}
                        onChange={(e) => setJenkinsUrl(e.target.value)}
                        required={useJenkins}
                      />
                    </div>
                    <div className="auth-input-group">
                      <label htmlFor="jk-job">Job / Pipeline Name</label>
                      <input
                        id="jk-job"
                        type="text"
                        placeholder="deploysphere-service-pipeline"
                        value={jenkinsJobName}
                        onChange={(e) => setJenkinsJobName(e.target.value)}
                        required={useJenkins}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="auth-input-group">
                      <label htmlFor="jk-user">Jenkins Username</label>
                      <input
                        id="jk-user"
                        type="text"
                        placeholder="admin"
                        value={jenkinsUser}
                        onChange={(e) => setJenkinsUser(e.target.value)}
                      />
                    </div>
                    <div className="auth-input-group">
                      <label htmlFor="jk-token">API Token / Password</label>
                      <input
                        id="jk-token"
                        type="password"
                        placeholder="Enter API token"
                        value={jenkinsToken}
                        onChange={(e) => setJenkinsToken(e.target.value)}
                      />
                    </div>
                  </div>

                  {isEditMode && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="add-env-btn"
                        style={{ border: '1px solid var(--border-color)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)' }}
                        onClick={async () => {
                          try {
                            const jkRes = await axios.get(apiUrl(`/api/jenkins/jenkinsfile/${id}`), {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            setJenkinsfile(jkRes.data.jenkinsfile);
                            setShowJenkinsfilePanel(true);
                          } catch {
                            alert('Failed to generate Jenkinsfile pipeline.');
                          }
                        }}
                      >
                        <Terminal size={14} />
                        {showJenkinsfilePanel ? 'Regenerate Jenkinsfile Pipeline' : 'View Generated Jenkinsfile Pipeline'}
                      </button>

                      {showJenkinsfilePanel && jenkinsfile && (
                        <div style={{ marginTop: '1rem', background: '#090d16', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', padding: '1rem', position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            <span>Declarative Jenkinsfile</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(jenkinsfile);
                                alert('Jenkinsfile code successfully copied to clipboard!');
                              }}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                            >
                              <Copy size={12} />
                              Copy Code
                            </button>
                          </div>
                          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.4', overflowX: 'auto', maxHeight: '250px', color: '#cbd5e1', whiteSpace: 'pre' }}>
                            {jenkinsfile}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            <button type="submit" className="auth-btn submit-form-btn" disabled={submitting}>
              {submitting ? (
                <span className="auth-btn-loading">Saving Configuration...</span>
              ) : (
                <>
                  <Save size={18} />
                  Save Configuration
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProjectForm;
