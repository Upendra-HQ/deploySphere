import { Router } from 'express';
import { 
  getAdminStats, 
  getAdminUsers, 
  getAdminProjects, 
  getAdminDeployments, 
  getAdminServers, 
  getAdminLogs, 
  adminDeleteProject, 
  adminDeleteUser 
} from '../controllers/adminController';
import { protect } from '../middleware/authMiddleware';
import { adminProtect } from '../middleware/adminMiddleware';

const router = Router();

// Protect all routes with authentication and administrator guards
router.use(protect);
router.use(adminProtect);

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.get('/projects', getAdminProjects);
router.get('/deployments', getAdminDeployments);
router.get('/servers', getAdminServers);
router.get('/logs', getAdminLogs);
router.delete('/projects/:id', adminDeleteProject);
router.delete('/users/:id', adminDeleteUser);

export default router;
