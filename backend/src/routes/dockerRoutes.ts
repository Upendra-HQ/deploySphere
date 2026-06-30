import { Router } from 'express';
import { 
  getContainers, 
  postContainerAction, 
  getLogs 
} from '../controllers/dockerController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all endpoints with authentication check
router.use(protect);

router.get('/containers', getContainers);
router.post('/containers/:projectId/action', postContainerAction);
router.get('/containers/:projectId/logs', getLogs);

export default router;
