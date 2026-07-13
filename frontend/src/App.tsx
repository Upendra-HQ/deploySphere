import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AIAssistantDrawer from './components/AIAssistantDrawer';
import './index.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectForm = lazy(() => import('./pages/ProjectForm'));
const GitHubConnect = lazy(() => import('./pages/GitHubConnect'));
const DeploymentDetails = lazy(() => import('./pages/DeploymentDetails'));
const DockerManagement = lazy(() => import('./pages/DockerManagement'));
const ProjectDeployments = lazy(() => import('./pages/ProjectDeployments'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const ReverseProxy = lazy(() => import('./pages/ReverseProxy'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<div className="loading-screen"><div className="loading-spinner" /><p>Loading DeploySphere...</p></div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/projects/new" element={<ProtectedRoute><ProjectForm /></ProtectedRoute>} />
            <Route path="/projects/edit/:id" element={<ProtectedRoute><ProjectForm /></ProtectedRoute>} />
            <Route path="/github-connect" element={<ProtectedRoute><GitHubConnect /></ProtectedRoute>} />
            <Route path="/deployments/:id" element={<ProtectedRoute><DeploymentDetails /></ProtectedRoute>} />
            <Route path="/projects/:id/deployments" element={<ProtectedRoute><ProjectDeployments /></ProtectedRoute>} />
            <Route path="/docker" element={<ProtectedRoute><DockerManagement /></ProtectedRoute>} />
            <Route path="/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
            <Route path="/proxy" element={<ProtectedRoute><ReverseProxy /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
        <AIAssistantDrawer />
      </Router>
    </AuthProvider>
  );
}

export default App;
