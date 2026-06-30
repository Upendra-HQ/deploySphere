import { Router } from 'express';
import { handleGithubPush } from '../controllers/webhookController';

const router = Router();

// Public webhook route called by GitHub
router.post('/github', handleGithubPush);

export default router;
