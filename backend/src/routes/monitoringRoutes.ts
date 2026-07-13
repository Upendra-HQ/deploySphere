import { Router } from 'express';
import { 
  getMonitoringStatus, 
  getMonitoringMetrics 
} from '../controllers/monitoringController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes with JWT auth
router.use(protect);

router.get('/status', getMonitoringStatus);
router.get('/metrics', getMonitoringMetrics);

export default router;
