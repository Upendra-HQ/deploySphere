import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// @desc    Get all projects for authenticated user
// @route   GET /api/projects
// @access  Protected
export const getProjects = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User unauthorized' });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        envVariables: {
          select: {
            id: true,
            key: true,
            value: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(projects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get details for single project
// @route   GET /api/projects/:id
// @access  Protected
export const getProjectById = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'User unauthorized' });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        envVariables: {
          select: {
            id: true,
            key: true,
            value: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json(project);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Protected
export const createProject = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, repositoryUrl, branch, framework, buildCommand, startCommand, useJenkins, jenkinsUrl, jenkinsUser, jenkinsToken, jenkinsJobName, envVariables, deploymentStrategy, canaryWeight } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'User unauthorized' });
  }

  if (!name || !repositoryUrl) {
    return res.status(400).json({ message: 'Please provide a name and repository URL' });
  }

  // Security: check URL schema to block injection payloads
  if (!repositoryUrl.startsWith('http://') && !repositoryUrl.startsWith('https://')) {
    return res.status(400).json({ message: 'Repository URL must start with http:// or https://' });
  }

  try {
    const project = await prisma.project.create({
      data: {
        name,
        repositoryUrl,
        branch: branch || 'main',
        framework: framework || 'React',
        buildCommand: buildCommand || '',
        startCommand: startCommand || '',
        useJenkins: useJenkins || false,
        jenkinsUrl: jenkinsUrl || '',
        jenkinsUser: jenkinsUser || '',
        jenkinsToken: jenkinsToken || '',
        jenkinsJobName: jenkinsJobName || '',
        deploymentStrategy: deploymentStrategy || 'STANDARD',
        canaryWeight: canaryWeight !== undefined ? parseInt(canaryWeight, 10) : 10,
        userId,
        envVariables: envVariables && envVariables.length > 0 
          ? {
              create: envVariables.map((env: { key: string; value: string }) => ({
                key: env.key,
                value: env.value,
              })),
            }
          : undefined,
      },
      include: {
        envVariables: true,
      },
    });

    return res.status(201).json(project);
  } catch (error: any) {
    console.error('Error creating project:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Protected
export const updateProject = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { name, repositoryUrl, branch, framework, buildCommand, startCommand, useJenkins, jenkinsUrl, jenkinsUser, jenkinsToken, jenkinsJobName, envVariables, deploymentStrategy, canaryWeight } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'User unauthorized' });
  }

  // Security: check URL schema to block injection payloads
  if (repositoryUrl && !repositoryUrl.startsWith('http://') && !repositoryUrl.startsWith('https://')) {
    return res.status(400).json({ message: 'Repository URL must start with http:// or https://' });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update main fields
    await prisma.project.update({
      where: { id },
      data: {
        name: name || project.name,
        repositoryUrl: repositoryUrl || project.repositoryUrl,
        branch: branch || project.branch,
        framework: framework || project.framework,
        buildCommand: buildCommand !== undefined ? buildCommand : project.buildCommand,
        startCommand: startCommand !== undefined ? startCommand : project.startCommand,
        useJenkins: useJenkins !== undefined ? useJenkins : project.useJenkins,
        jenkinsUrl: jenkinsUrl !== undefined ? jenkinsUrl : project.jenkinsUrl,
        jenkinsUser: jenkinsUser !== undefined ? jenkinsUser : project.jenkinsUser,
        jenkinsToken: jenkinsToken !== undefined ? jenkinsToken : project.jenkinsToken,
        jenkinsJobName: jenkinsJobName !== undefined ? jenkinsJobName : project.jenkinsJobName,
        deploymentStrategy: deploymentStrategy !== undefined ? deploymentStrategy : project.deploymentStrategy,
        canaryWeight: canaryWeight !== undefined ? parseInt(canaryWeight, 10) : project.canaryWeight,
      },
    });

    // Handle environment variables synchronization
    if (envVariables !== undefined) {
      // 1. Delete all current variables
      await prisma.envVariable.deleteMany({
        where: { projectId: id },
      });

      // 2. Insert new variables
      if (envVariables.length > 0) {
        await prisma.envVariable.createMany({
          data: envVariables.map((env: { key: string; value: string }) => ({
            key: env.key,
            value: env.value,
            projectId: id,
          })),
        });
      }
    }

    const updatedProject = await prisma.project.findUnique({
      where: { id },
      include: {
        envVariables: true,
      },
    });

    return res.json(updatedProject);
  } catch (error: any) {
    console.error('Error updating project:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Protected
export const deleteProject = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'User unauthorized' });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Cascade delete project (Prisma schema handles cascades on delete)
    await prisma.project.delete({
      where: { id },
    });

    return res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
