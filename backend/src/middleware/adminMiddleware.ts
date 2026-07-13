import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

export const adminProtect = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user && (
    req.user.email === 'admin@deploysphere.local' || 
    req.user.email.startsWith('admin@') || 
    req.user.email === process.env.ADMIN_EMAIL
  )) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
};
