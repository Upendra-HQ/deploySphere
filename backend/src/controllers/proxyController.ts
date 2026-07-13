import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { 
  checkNginxStatus, 
  getCustomDomainsRegistry, 
  setCustomDomainMapping, 
  findProjectHostPort, 
  generateNginxConfigBlock, 
  reloadNginx,
  updateNginxConfigForProject
} from '../services/nginxService';
import { listHostContainers } from '../services/dockerService';

const prisma = new PrismaClient();

// @desc    Get Nginx reverse proxy status
// @route   GET /api/proxy/status
// @access  Protected
export const getProxyStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isRunning = await checkNginxStatus();
    return res.json({
      running: isRunning,
      port: 80,
      host: 'localhost',
      message: isRunning ? 'Nginx Gateway is active and listening.' : 'Nginx Gateway is offline.',
      startupCmd: 'docker compose -f nginx/docker-compose.yml up -d'
    });
  } catch (error: any) {
    console.error('Error fetching proxy status:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

import { getSSLStatus } from '../services/sslService';

// @desc    Get all application routing maps
// @route   GET /api/proxy/routes
// @access  Protected
export const getProxyRoutes = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // 1. Fetch user projects
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // 2. Fetch registry for domains
    const domainsRegistry = await getCustomDomainsRegistry();

    // 3. Fetch running containers list to check status & ports
    const activeContainers = await listHostContainers(userId);

    const routes = [];

    for (const project of projects) {
      const activeContainer = activeContainers.find(c => c.projectId === project.id);
      const isRunning = activeContainer ? activeContainer.status === 'RUNNING' : false;
      const hostPort = await findProjectHostPort(project.id);
      
      const customDomain = domainsRegistry[project.id] || '';
      const sanitizedName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const subdomain = `${sanitizedName}.deploysphere.local`;

      const generatedConfig = hostPort 
        ? generateNginxConfigBlock(project.name, project.id, hostPort, customDomain)
        : '# Deploy the project to generate Nginx proxy server configurations.';

      const subdomainSSL = await getSSLStatus(subdomain);
      const customDomainSSL = customDomain ? await getSSLStatus(customDomain) : { active: false, type: 'NONE' };

      routes.push({
        projectId: project.id,
        projectName: project.name,
        subdomain,
        customDomain,
        subdomainSSL,
        customDomainSSL,
        internalPort: hostPort || null,
        status: isRunning ? 'RUNNING' : 'STOPPED',
        nginxConfig: generatedConfig
      });
    }

    return res.json(routes);
  } catch (error: any) {
    console.error('Error fetching proxy routing list:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update custom domain mapping for a project
// @route   POST /api/proxy/custom-domain
// @access  Protected
export const postCustomDomain = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { projectId, domain } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required.' });
  }

  try {
    // Check project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await setCustomDomainMapping(projectId, domain);

    return res.json({
      message: 'Custom domain mapped successfully.',
      projectId,
      domain: domain || null
    });
  } catch (error: any) {
    console.error('Error setting custom domain:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Trigger hot reload of Nginx configurations
// @route   POST /api/proxy/reload
// @access  Protected
export const postProxyReload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await reloadNginx();
    return res.json({
      success,
      message: success 
        ? 'Nginx Gateway configuration reloaded successfully.' 
        : 'Nginx config reloaded (Simulation Mode).'
    });
  } catch (error: any) {
    console.error('Error triggering proxy reload:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
