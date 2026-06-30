import { Router } from 'express';
import {
  deployProject,
  getDeployments,
  getDeploymentDetails,
} from '../controllers/deploymentController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes with auth check
router.use(protect);

router.post('/project/:projectId', deployProject);
router.get('/project/:projectId', getDeployments);
router.get('/:id', getDeploymentDetails);

export default router;
