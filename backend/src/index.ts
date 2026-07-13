import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import projectRoutes from './routes/projectRoutes';
import githubRoutes from './routes/githubRoutes';
import webhookRoutes from './routes/webhookRoutes';
import deploymentRoutes from './routes/deploymentRoutes';
import jenkinsRoutes from './routes/jenkinsRoutes';
import dockerRoutes from './routes/dockerRoutes';
import monitoringRoutes from './routes/monitoringRoutes';
import proxyRoutes from './routes/proxyRoutes';
import sslRoutes from './routes/sslRoutes';
import adminRoutes from './routes/adminRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import aiRoutes from './routes/aiRoutes';
import { initSocketServer } from './services/socketServer';
import { securityHeaders, rateLimiter } from './middleware/securityMiddleware';
import { CORS_ORIGINS } from './config/appConfig';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(securityHeaders);
app.use(rateLimiter(15 * 60 * 1000, 250)); // 250 requests per 15 minutes limit

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DeploySphere Backend is running' });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Dashboard Routes
app.use('/api/dashboard', dashboardRoutes);

// Project Routes
app.use('/api/projects', projectRoutes);

// GitHub Routes
app.use('/api/github', githubRoutes);

// Webhook Routes
app.use('/api/webhooks', webhookRoutes);

// Deployment Routes
app.use('/api/deployments', deploymentRoutes);

// Jenkins Routes
app.use('/api/jenkins', jenkinsRoutes);

// Docker Routes
app.use('/api/docker', dockerRoutes);

// Monitoring Routes
app.use('/api/monitoring', monitoringRoutes);

// Proxy Routes
app.use('/api/proxy', proxyRoutes);

// SSL Routes
app.use('/api/ssl', sslRoutes);

// Admin Routes
app.use('/api/admin', adminRoutes);

// Analytics Routes
app.use('/api/analytics', analyticsRoutes);

// AI Routes
app.use('/api/ai', aiRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Something went wrong on the server', error: err.message });
});

const server = http.createServer(app);

// Initialize real-time WebSocket logs server
initSocketServer(server);

server.listen(PORT, () => {
  console.log(`DeploySphere Backend Server listening on http://localhost:${PORT}`);
});
