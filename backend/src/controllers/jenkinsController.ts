import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { generateJenkinsfile } from '../services/jenkinsService';

const prisma = new PrismaClient();

// @desc    Get generated Jenkinsfile configuration for a project
// @route   GET /api/jenkins/jenkinsfile/:projectId
// @access  Protected
export const getJenkinsfileForProject = async (req: AuthenticatedRequest, res: Response) => {
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

    const jenkinsfileText = generateJenkinsfile(project);

    return res.json({
      projectId,
      projectName: project.name,
      jenkinsfile: jenkinsfileText,
    });
  } catch (error: any) {
    console.error('Error generating Jenkinsfile:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
