import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { triggerDeployment } from '../services/deploymentService';

const prisma = new PrismaClient();

// @desc    Trigger manual deployment build
// @route   POST /api/deployments/project/:projectId
// @access  Protected
export const deployProject = async (req: AuthenticatedRequest, res: Response) => {
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

    // Capture dynamic mock commit credentials for manual triggers
    const commitHash = Math.random().toString(16).substring(2, 9);
    const commitMsg = req.body.commitMsg || `Manual compilation trigger via dashboard`;

    const deploymentId = await triggerDeployment({
      projectId,
      commitHash,
      commitMsg,
      deployedBy: req.user?.email || 'User',
    });

    return res.status(202).json({
      message: 'Deployment build triggered successfully.',
      deploymentId,
    });
  } catch (error: any) {
    console.error('Error triggering manual deploy:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get deployments list for project
// @route   GET /api/deployments/project/:projectId
// @access  Protected
export const getDeployments = async (req: AuthenticatedRequest, res: Response) => {
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

    const deployments = await prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(deployments);
  } catch (error: any) {
    console.error('Error fetching deployments:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get detailed logs for specific deployment
// @route   GET /api/deployments/:id
// @access  Protected
export const getDeploymentDetails = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    });

    if (!deployment) {
      return res.status(404).json({ message: 'Deployment record not found' });
    }

    if (deployment.project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json(deployment);
  } catch (error: any) {
    console.error('Error fetching deployment details:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Trigger rollback to a previous successful deployment
// @route   POST /api/deployments/rollback/:id
// @access  Protected
export const rollbackDeployment = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // 1. Find the target historical deployment to rollback to
    const targetDeployment = await prisma.deployment.findUnique({
      where: { id },
      include: {
        project: true
      }
    });

    if (!targetDeployment) {
      return res.status(404).json({ message: 'Target deployment record not found' });
    }

    if (targetDeployment.project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (targetDeployment.status !== 'SUCCESS') {
      return res.status(400).json({ message: 'Can only rollback to successful deployments.' });
    }

    // 2. Trigger a new deployment pipeline using the target's commit hash & message
    const commitHash = targetDeployment.commitHash || 'head';
    const commitMsg = `[ROLLBACK] Rollback to build ${targetDeployment.id.substring(0, 8)}: ${targetDeployment.commitMsg || 'manual commit'}`;

    const deploymentId = await triggerDeployment({
      projectId: targetDeployment.projectId,
      commitHash,
      commitMsg,
      deployedBy: req.user?.email || 'User',
    });

    return res.status(202).json({
      message: 'Rollback pipeline initialized successfully.',
      deploymentId,
    });
  } catch (error: any) {
    console.error('Error triggering rollback build:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
