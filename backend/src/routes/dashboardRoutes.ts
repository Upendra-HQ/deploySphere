import { Router, Request, Response } from 'express';
import os from 'os';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Helper: generate realistic time-series data for system metrics
const generateTimeSeriesData = (points: number, baseValue: number, variance: number) => {
  const data = [];
  const now = Date.now();
  let currentValue = baseValue;

  for (let i = points - 1; i >= 0; i--) {
    // Random walk with mean reversion
    const change = (Math.random() - 0.5) * variance;
    const meanReversion = (baseValue - currentValue) * 0.1;
    currentValue = Math.max(5, Math.min(95, currentValue + change + meanReversion));

    const timestamp = new Date(now - i * 60 * 1000); // 1 point per minute
    data.push({
      time: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round(currentValue * 10) / 10,
    });
  }
  return data;
};

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Protected
router.get('/stats', protect, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User unauthorized' });
  }

  try {
    const projectCount = await prisma.project.count({
      where: { userId },
    });

    const stats = {
      totalProjects: projectCount,
      activeDeployments: 8, // simulated for now, will connect to deployment engine in later phase
      totalDeployments: 147, // simulated for now
      successRate: 94.5,
      uptime: 99.97,
      totalContainers: 15,
    };

    return res.json(stats);
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get system metrics (CPU/RAM/Disk)
// @route   GET /api/dashboard/system
// @access  Protected
router.get('/system', protect, (req: AuthenticatedRequest, res: Response) => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Real system info
  const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    cpuModel: cpus[0]?.model || 'Unknown',
    cpuCores: cpus.length,
  };

  // CPU usage approximation
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total) * 100;
  }, 0) / cpus.length;

  // Memory
  const memUsagePercent = (usedMem / totalMem) * 100;

  // Simulated disk (real disk info requires native modules)
  const diskTotal = 512; // GB
  const diskUsed = 187.4; // GB
  const diskUsagePercent = (diskUsed / diskTotal) * 100;

  // Time-series data for graphs (last 30 data points, 1 per minute)
  const cpuHistory = generateTimeSeriesData(30, Math.round(cpuUsage), 15);
  const memHistory = generateTimeSeriesData(30, Math.round(memUsagePercent), 8);
  const diskHistory = generateTimeSeriesData(30, Math.round(diskUsagePercent), 3);

  res.json({
    systemInfo,
    cpu: {
      usage: Math.round(cpuUsage * 10) / 10,
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      history: cpuHistory,
    },
    memory: {
      total: Math.round(totalMem / (1024 ** 3) * 10) / 10,
      used: Math.round(usedMem / (1024 ** 3) * 10) / 10,
      free: Math.round(freeMem / (1024 ** 3) * 10) / 10,
      usage: Math.round(memUsagePercent * 10) / 10,
      history: memHistory,
    },
    disk: {
      total: diskTotal,
      used: diskUsed,
      free: Math.round((diskTotal - diskUsed) * 10) / 10,
      usage: Math.round(diskUsagePercent * 10) / 10,
      history: diskHistory,
    },
  });
});

// @desc    Get recent deployments
// @route   GET /api/dashboard/deployments
// @access  Protected
router.get('/deployments', protect, (req: AuthenticatedRequest, res: Response) => {
  // Simulated recent deployments data
  const deployments = [
    {
      id: 'dep-001',
      project: 'deploysphere-frontend',
      branch: 'main',
      commit: 'a3f8c21',
      commitMessage: 'feat: add dashboard layout',
      status: 'success',
      duration: '2m 34s',
      deployedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      deployedBy: 'admin@deploysphere.com',
    },
    {
      id: 'dep-002',
      project: 'user-service',
      branch: 'develop',
      commit: 'b7e2d09',
      commitMessage: 'fix: resolve auth token refresh',
      status: 'success',
      duration: '1m 48s',
      deployedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      deployedBy: 'dev@deploysphere.com',
    },
    {
      id: 'dep-003',
      project: 'api-gateway',
      branch: 'main',
      commit: 'c4d1f87',
      commitMessage: 'chore: update dependencies',
      status: 'failed',
      duration: '3m 12s',
      deployedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      deployedBy: 'admin@deploysphere.com',
    },
    {
      id: 'dep-004',
      project: 'payment-service',
      branch: 'release/v2.1',
      commit: 'e9a3b56',
      commitMessage: 'feat: integrate Stripe webhooks',
      status: 'success',
      duration: '4m 05s',
      deployedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      deployedBy: 'dev@deploysphere.com',
    },
    {
      id: 'dep-005',
      project: 'notification-service',
      branch: 'main',
      commit: 'f2c8a41',
      commitMessage: 'fix: email template rendering',
      status: 'success',
      duration: '1m 22s',
      deployedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      deployedBy: 'admin@deploysphere.com',
    },
    {
      id: 'dep-006',
      project: 'deploysphere-backend',
      branch: 'feature/monitoring',
      commit: '1a7d3e2',
      commitMessage: 'feat: add Prometheus metrics endpoint',
      status: 'building',
      duration: '—',
      deployedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      deployedBy: 'admin@deploysphere.com',
    },
  ];

  res.json(deployments);
});

export default router;
