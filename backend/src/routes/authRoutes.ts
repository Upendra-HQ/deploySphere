import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

import { validateRegister } from '../middleware/validationMiddleware';

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes test endpoint
router.get('/me', protect, (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'Authorized successfully!',
    user: req.user,
  });
});

export default router;
