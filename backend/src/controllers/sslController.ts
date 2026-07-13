import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { 
  getSSLStatus, 
  generateSelfSignedSSL, 
  generateLetsEncryptSSL, 
  deleteSSL 
} from '../services/sslService';

const prisma = new PrismaClient();

// @desc    Get SSL Certificate status for a domain
// @route   GET /api/ssl/status/:domain
// @access  Protected
export const getDomainSSLStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { domain } = req.params;

  if (!domain) {
    return res.status(400).json({ message: 'Domain is required.' });
  }

  try {
    const status = await getSSLStatus(domain);
    return res.json(status);
  } catch (error: any) {
    console.error('Error fetching SSL status:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Request SSL generation (Let's Encrypt / Self-Signed)
// @route   POST /api/ssl/generate
// @access  Protected
export const postGenerateSSL = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { domain, method, email, projectId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!domain || !method || !projectId) {
    return res.status(400).json({ message: 'Domain, method, and projectId are required.' });
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

    let logs = '';
    if (method === 'letsencrypt') {
      if (!email) {
        return res.status(400).json({ message: 'Contact email is required for Let\'s Encrypt validation.' });
      }
      logs = await generateLetsEncryptSSL(domain, email, projectId);
    } else if (method === 'selfsigned') {
      logs = await generateSelfSignedSSL(domain, projectId);
    } else {
      return res.status(400).json({ message: 'Invalid SSL generation method. Supported: letsencrypt, selfsigned.' });
    }

    const finalStatus = await getSSLStatus(domain);

    return res.json({
      success: true,
      message: 'SSL configuration processed successfully.',
      logs,
      status: finalStatus
    });
  } catch (error: any) {
    console.error('Error generating SSL certificate:', error);
    return res.status(500).json({ message: 'SSL Generation failed on server', error: error.message });
  }
};

// @desc    Delete SSL Certificate
// @route   DELETE /api/ssl/delete
// @access  Protected
export const deleteDomainSSL = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { domain, projectId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!domain || !projectId) {
    return res.status(400).json({ message: 'Domain and projectId are required.' });
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

    await deleteSSL(domain, projectId);

    return res.json({
      success: true,
      message: 'SSL configuration deleted successfully.'
    });
  } catch (error: any) {
    console.error('Error deleting SSL certificate:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
