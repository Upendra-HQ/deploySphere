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

    // Fetch matching projects
    const projects = await prisma.project.findMany({
      where: { userId },
      select: { id: true },
    });

    const projectIds = projects.map(p => p.id);

    // Compute deployments count
    const totalDeployments = await prisma.deployment.count({
      where: {
        projectId: { in: projectIds },
      },
    });

    // Compute success rate
    const successCount = await prisma.deployment.count({
      where: {
        projectId: { in: projectIds },
        status: 'SUCCESS',
      },
    });

    const successRate = totalDeployments > 0 
      ? Math.round((successCount / totalDeployments) * 1000) / 10 
      : 0.0;

    const activeDeploymentsCount = await prisma.deployment.count({
      where: {
        projectId: { in: projectIds },
        status: 'BUILDING',
      },
    });

    const activeContainersCount = await prisma.deployment.count({
      where: {
        projectId: { in: projectIds },
        status: 'SUCCESS',
      },
    });

    const stats = {
      totalProjects: projectCount,
      activeDeployments: activeDeploymentsCount,
      totalDeployments: totalDeployments,
      successRate: successRate,
      uptime: 99.99,
      totalContainers: activeContainersCount,
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
router.get('/deployments', protect, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Fetch user's project IDs
    const projects = await prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    const projectIds = projects.map(p => p.id);

    // Fetch matching deployment records
    const deployments = await prisma.deployment.findMany({
      where: {
        projectId: { in: projectIds },
      },
      include: {
        project: {
          select: { name: true, branch: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // return top 10 recent
    });

    // Format the response payload
    const formatted = deployments.map(dep => ({
      id: dep.id,
      project: dep.project.name,
      branch: dep.project.branch,
      commit: dep.commitHash || 'head',
      commitMessage: dep.commitMsg || 'Triggered build',
      status: dep.status.toLowerCase() as 'success' | 'failed' | 'building',
      duration: dep.duration || '—',
      deployedAt: dep.createdAt.toISOString(),
      deployedBy: 'User',
    }));

    return res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching dashboard deployments:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
