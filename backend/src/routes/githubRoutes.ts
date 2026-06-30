import { Router } from 'express';
import {
  getAuthUrl,
  callback,
  getRepositories,
  getBranches,
  disconnect,
} from '../controllers/githubController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Public callback (GitHub redirects here)
router.get('/callback', callback);

// Protected routes
router.get('/auth-url', protect, getAuthUrl);
router.get('/repos', protect, getRepositories);
router.get('/repos/:owner/:repo/branches', protect, getBranches);
router.post('/disconnect', protect, disconnect);

export default router;
