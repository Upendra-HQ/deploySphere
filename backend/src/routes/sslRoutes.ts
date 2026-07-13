import { Router } from 'express';
import { 
  getDomainSSLStatus, 
  postGenerateSSL, 
  deleteDomainSSL 
} from '../controllers/sslController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes with authentication middleware
router.use(protect);

router.get('/status/:domain', getDomainSSLStatus);
router.post('/generate', postGenerateSSL);
router.delete('/delete', deleteDomainSSL);

export default router;
