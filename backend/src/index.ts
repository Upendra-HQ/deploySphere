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
import { initSocketServer } from './services/socketServer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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
