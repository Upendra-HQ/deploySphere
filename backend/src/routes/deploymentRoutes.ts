import { Router } from 'express';
import {
  deployProject,
  getDeployments,
  getDeploymentDetails,
  rollbackDeployment,
} from '../controllers/deploymentController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes with auth check
router.use(protect);

router.post('/project/:projectId', deployProject);
router.get('/project/:projectId', getDeployments);
router.post('/rollback/:id', rollbackDeployment);
router.get('/:id', getDeploymentDetails);

export default router;
