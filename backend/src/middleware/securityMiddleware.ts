import { Request, Response, NextFunction } from 'express';
import { BACKEND_URL, CORS_ORIGINS, FRONTEND_URL } from '../config/appConfig';

// Custom security headers middleware (mimics Helmet)
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent mime-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Refuse browser-side caching of sensitive endpoints
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  // Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Cross-Site Scripting protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  const connectSources = ['self', BACKEND_URL, FRONTEND_URL, ...CORS_ORIGINS].join(' ');
  res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${connectSources}; frame-ancestors 'none';`);

  next();
};

// Simple in-memory IP request rate limiter
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitDb: { [ip: string]: RateLimitRecord } = {};

export const rateLimiter = (windowMs: number, maxRequests: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    if (!rateLimitDb[ip] || now > rateLimitDb[ip].resetTime) {
      rateLimitDb[ip] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    rateLimitDb[ip].count++;

    if (rateLimitDb[ip].count > maxRequests) {
      return res.status(429).json({
        message: 'Too many requests from this IP. Please try again later.'
      });
    }

    next();
  };
};
