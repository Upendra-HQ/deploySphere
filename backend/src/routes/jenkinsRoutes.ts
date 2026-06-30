import { Router } from 'express';
import { getJenkinsfileForProject } from '../controllers/jenkinsController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Require authorization for all endpoints
router.use(protect);

router.get('/jenkinsfile/:projectId', getJenkinsfileForProject);

export default router;
