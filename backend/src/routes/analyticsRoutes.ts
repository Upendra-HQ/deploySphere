import { Router } from 'express';
import { getAnalyticsSummary } from '../controllers/analyticsController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes with authentication middleware
router.use(protect);

router.get('/summary', getAnalyticsSummary);

export default router;
