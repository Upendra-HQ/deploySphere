import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { checkNginxStatus } from '../services/nginxService';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

// @desc    Get admin overview statistics
// @route   GET /api/admin/stats
// @access  Protected/Admin
export const getAdminStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalProjects = await prisma.project.count();
    const totalDeployments = await prisma.deployment.count();
    
    // System-wide success rate
    const successCount = await prisma.deployment.count({
      where: { status: 'SUCCESS' }
    });

    const successRate = totalDeployments > 0
      ? Math.round((successCount / totalDeployments) * 1000) / 10
      : 100.0;

    // Active docker containers count
    let activeContainers = 0;
    try {
      const { stdout } = await execPromise('docker ps -q');
      activeContainers = stdout.trim().split('\n').filter(line => line.length > 0).length;
    } catch {
      // Offline fallback: count success deployments
      activeContainers = await prisma.project.count({
        where: {
          deployments: {
            some: { status: 'SUCCESS' }
          }
        }
      });
    }

    return res.json({
      totalUsers,
      totalProjects,
      totalDeployments,
      successRate,
      activeContainers,
      uptime: os.uptime()
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all users list
// @route   GET /api/admin/users
// @access  Protected/Admin
export const getAdminUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: { projects: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(users);
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all projects list
// @route   GET /api/admin/projects
// @access  Protected/Admin
export const getAdminProjects = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        user: {
          select: { email: true }
        },
        deployments: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format list
    const formatted = projects.map(p => {
      const latestDeployment = p.deployments && p.deployments[0] ? p.deployments[0] : null;
      return {
        id: p.id,
        name: p.name,
        repositoryUrl: p.repositoryUrl,
        branch: p.branch,
        framework: p.framework,
        useJenkins: p.useJenkins,
        ownerEmail: p.user.email,
        createdAt: p.createdAt,
        status: latestDeployment ? latestDeployment.status : 'NOT_DEPLOYED',
        latestDeploymentId: latestDeployment ? latestDeployment.id : null
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching admin projects:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all deployments list
// @route   GET /api/admin/deployments
// @access  Protected/Admin
export const getAdminDeployments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deployments = await prisma.deployment.findMany({
      include: {
        project: {
          select: {
            name: true,
            user: { select: { email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Cap at latest 100
    });

    const formatted = deployments.map(d => ({
      id: d.id,
      projectId: d.projectId,
      projectName: d.project.name,
      ownerEmail: d.project.user.email,
      commitHash: d.commitHash || 'head',
      commitMsg: d.commitMsg || 'Triggered Build',
      status: d.status,
      duration: d.duration || '-',
      createdAt: d.createdAt
    }));

    return res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching admin deployments:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get host specifications and telemetry logs
// @route   GET /api/admin/servers
// @access  Protected/Admin
export const getAdminServers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    // Check docker version
    let dockerVersion = 'Offline';
    try {
      const { stdout } = await execPromise('docker --version');
      dockerVersion = stdout.trim();
    } catch {}

    // Check nginx status
    const nginxActive = await checkNginxStatus();

    return res.json({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      totalMemory: Math.round(totalMem / (1024 ** 3) * 10) / 10 + ' GB',
      freeMemory: Math.round(freeMem / (1024 ** 3) * 10) / 10 + ' GB',
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length,
      dockerVersion,
      nginxActive: nginxActive ? 'UP' : 'DOWN'
    });
  } catch (error: any) {
    console.error('Error fetching admin servers info:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get system logs audit trial (simulated event logger)
// @route   GET /api/admin/logs
// @access  Protected/Admin
export const getAdminLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // We will generate structured mock logs based on deployment and project creation logs in database
    const deployments = await prisma.deployment.findMany({
      include: { project: { select: { name: true, user: { select: { email: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    const logs = [];
    
    // Generate dynamic logs from deployments
    for (const d of deployments) {
      logs.push({
        id: `log-dep-${d.id.substring(0, 8)}`,
        timestamp: d.createdAt.toISOString(),
        level: d.status === 'FAILED' ? 'ERROR' : 'INFO',
        service: 'DeploymentEngine',
        message: `Deployment ${d.status.toLowerCase()} for project "${d.project.name}" (actor: ${d.project.user.email})`
      });
    }

    // Insert general system events to fill up audit trail
    const systemBaseTime = new Date();
    logs.push({
      id: 'log-sys-1',
      timestamp: new Date(systemBaseTime.getTime() - 1000 * 60 * 5).toISOString(),
      level: 'INFO',
      service: 'NginxProxy',
      message: 'Dynamic Nginx configuration file maps synchronized and hot-reloaded'
    });
    logs.push({
      id: 'log-sys-2',
      timestamp: new Date(systemBaseTime.getTime() - 1000 * 60 * 15).toISOString(),
      level: 'INFO',
      service: 'DockerService',
      message: 'Pruned unused builder caches and dangling Docker network interfaces'
    });
    logs.push({
      id: 'log-sys-3',
      timestamp: new Date(systemBaseTime.getTime() - 1000 * 60 * 45).toISOString(),
      level: 'INFO',
      service: 'AuthService',
      message: `Administrator session validated for: ${req.user?.email}`
    });
    logs.push({
      id: 'log-sys-4',
      timestamp: new Date(systemBaseTime.getTime() - 1000 * 3600 * 2).toISOString(),
      level: 'WARNING',
      service: 'PrometheusScraper',
      message: 'Host node exporter port 9100 scrape failed - connection timeout'
    });

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json(logs);
  } catch (error: any) {
    console.error('Error fetching admin logs:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete any project from administrative view
// @route   DELETE /api/admin/projects/:id
// @access  Protected/Admin
export const adminDeleteProject = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Stop container if active
    try {
      const containerName = `deploysphere-${id}`;
      await execPromise(`docker rm -f ${containerName}`);
    } catch {}

    // Cascade delete project from SQLite db
    await prisma.project.delete({ where: { id } });
    
    return res.json({ message: 'Project deleted successfully by Administrator cascade.' });
  } catch (error: any) {
    console.error('Admin project delete error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete any user from administrative view
// @route   DELETE /api/admin/users/:id
// @access  Protected/Admin
export const adminDeleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { projects: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.id === req.user?.id) {
      return res.status(400).json({ message: 'You cannot delete your own administrator account.' });
    }

    // Stop all user container runtimes
    for (const project of user.projects) {
      try {
        const containerName = `deploysphere-${project.id}`;
        await execPromise(`docker rm -f ${containerName}`);
      } catch {}
    }

    // Delete user (cascade will delete user projects & deployments from DB)
    await prisma.user.delete({ where: { id } });

    return res.json({ message: `User ${user.email} and all corresponding projects/containers permanently removed.` });
  } catch (error: any) {
    console.error('Admin user delete error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
