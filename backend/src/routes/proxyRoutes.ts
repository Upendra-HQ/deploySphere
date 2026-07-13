import { Router } from 'express';
import { 
  getProxyStatus, 
  getProxyRoutes, 
  postCustomDomain, 
  postProxyReload 
} from '../controllers/proxyController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Secure all endpoints with authentication guard
router.use(protect);

import { validateCustomDomain } from '../middleware/validationMiddleware';

router.get('/status', getProxyStatus);
router.get('/routes', getProxyRoutes);
router.post('/custom-domain', validateCustomDomain, postCustomDomain);
router.post('/reload', postProxyReload);

export default router;
