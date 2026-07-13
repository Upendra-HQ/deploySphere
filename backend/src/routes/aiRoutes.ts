import { Router } from 'express';
import { postAIChat } from '../controllers/aiController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes with authentication middleware
router.use(protect);

router.post('/chat', postAIChat);

export default router;
