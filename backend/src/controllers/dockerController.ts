import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { 
  listHostContainers, 
  executeContainerAction, 
  getContainerLogs 
} from '../services/dockerService';

const prisma = new PrismaClient();

// @desc    Get list of active containers
// @route   GET /api/docker/containers
// @access  Protected
export const getContainers = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const containers = await listHostContainers(userId);
    return res.json(containers);
  } catch (error: any) {
    console.error('Error fetching containers:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Trigger container action (start | stop | restart | delete)
// @route   POST /api/docker/containers/:projectId/action
// @access  Protected
export const postContainerAction = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { projectId } = req.params;
  const { action } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!['start', 'stop', 'restart', 'delete'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Supported: start, stop, restart, delete.' });
  }

  try {
    // Check project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const containerId = latestContainerId(projectId); // mock or mapping
    await executeContainerAction(containerId, projectId, action);

    return res.json({
      message: `Container action "${action}" executed successfully.`,
      projectId,
      action,
    });
  } catch (error: any) {
    console.error('Error executing container action:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get runtime container logs
// @route   GET /api/docker/containers/:projectId/logs
// @access  Protected
export const getLogs = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { projectId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const logs = await getContainerLogs(projectId);
    return res.json({ projectId, logs });
  } catch (error: any) {
    console.error('Error fetching container logs:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper mapping
const latestContainerId = (projectId: string): string => {
  return `deploysphere-${projectId}`;
};
