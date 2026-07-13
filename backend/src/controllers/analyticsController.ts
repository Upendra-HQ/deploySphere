import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// Helper to parse duration string (e.g. "14s" -> 14)
const parseDuration = (dur: string | null): number => {
  if (!dur) return 0;
  const num = parseInt(dur.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

// @desc    Get system analytics summary for the logged-in user
// @route   GET /api/analytics/summary
// @access  Protected
export const getAnalyticsSummary = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { projectId } = req.query;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // 1. Fetch projects filter
    const projectFilter: any = { userId };
    if (projectId) {
      projectFilter.id = projectId as string;
    }

    const projects = await prisma.project.findMany({
      where: projectFilter,
      include: {
        deployments: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (projects.length === 0) {
      return res.json({
        totalProjects: 0,
        totalDeployments: 0,
        successRate: 100,
        avgDuration: 0,
        activeRuntimes: 0,
        mostActiveProject: 'None',
        timeline: [],
        durationTrends: [],
        frameworkStats: [],
        projectStats: []
      });
    }

    // Accumulate all deployments
    const deployments = projects.flatMap(p => p.deployments.map(d => ({
      ...d,
      projectName: p.name
    })));

    deployments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const totalDeployments = deployments.length;
    const successes = deployments.filter(d => d.status === 'SUCCESS');
    const successRate = totalDeployments > 0
      ? Math.round((successes.length / totalDeployments) * 1000) / 10
      : 100;

    // Calculate average duration
    const validDurations = deployments
      .map(d => parseDuration(d.duration))
      .filter(d => d > 0);
    
    const avgDuration = validDurations.length > 0
      ? Math.round((validDurations.reduce((sum, val) => sum + val, 0) / validDurations.length) * 10) / 10
      : 0;

    // Active runtimes (projects that have at least one successful deployment)
    const activeRuntimes = projects.filter(p => 
      p.deployments.some(d => d.status === 'SUCCESS')
    ).length;

    // Find most active project
    let mostActiveProject = 'None';
    let maxDeploymentsCount = 0;
    for (const p of projects) {
      if (p.deployments.length > maxDeploymentsCount) {
        maxDeploymentsCount = p.deployments.length;
        mostActiveProject = p.name;
      }
    }

    // 2. Activity Timeline (grouped by day: YYYY-MM-DD)
    const timelineMap: { [key: string]: { date: string; success: number; failed: number } } = {};
    
    deployments.forEach(d => {
      const dateStr = d.createdAt.toISOString().split('T')[0];
      if (!timelineMap[dateStr]) {
        timelineMap[dateStr] = { date: dateStr, success: 0, failed: 0 };
      }
      if (d.status === 'SUCCESS') {
        timelineMap[dateStr].success++;
      } else if (d.status === 'FAILED') {
        timelineMap[dateStr].failed++;
      }
    });

    const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Build Duration trends (last 15 completed builds)
    const durationTrends = deployments
      .filter(d => d.status === 'SUCCESS' || d.status === 'FAILED')
      .slice(-15)
      .map(d => ({
        id: d.id.substring(0, 8),
        projectName: d.projectName,
        status: d.status,
        duration: parseDuration(d.duration),
        date: d.createdAt.toLocaleDateString()
      }));

    // 4. Framework distribution stats
    const frameworkMap: { [key: string]: number } = {};
    projects.forEach(p => {
      const fw = p.framework || 'Unknown';
      frameworkMap[fw] = (frameworkMap[fw] || 0) + 1;
    });

    const frameworkStats = Object.entries(frameworkMap).map(([name, count]) => ({
      name,
      value: count
    }));

    // 5. Per-Project statistics comparison
    const projectStats = projects.map(p => {
      const pD = p.deployments;
      const pSuccess = pD.filter(d => d.status === 'SUCCESS').length;
      const pRate = pD.length > 0 ? Math.round((pSuccess / pD.length) * 100) : 100;
      
      const pDurs = pD.map(d => parseDuration(d.duration)).filter(d => d > 0);
      const pAvg = pDurs.length > 0 ? Math.round(pDurs.reduce((s, v) => s + v, 0) / pDurs.length) : 0;

      return {
        id: p.id,
        name: p.name,
        framework: p.framework,
        totalBuilds: pD.length,
        successRate: pRate,
        avgDuration: pAvg
      };
    });

    return res.json({
      totalProjects: projects.length,
      totalDeployments,
      successRate,
      avgDuration,
      activeRuntimes,
      mostActiveProject,
      timeline,
      durationTrends,
      frameworkStats,
      projectStats
    });
  } catch (error: any) {
    console.error('Error fetching analytics summary:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
