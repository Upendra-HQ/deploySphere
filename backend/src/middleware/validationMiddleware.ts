import { Request, Response, NextFunction } from 'express';

// Simple email regex validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Sanitization regex to prevent shell/command injection on inputs
const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
const projectNameRegex = /^[a-zA-Z0-9_-]{3,30}$/;

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  next();
};

export const validateCustomDomain = (req: Request, res: Response, next: NextFunction) => {
  const { domain } = req.body;

  // Domain can be empty/undefined (when deleting domain mapping)
  if (domain !== undefined && domain !== '') {
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ message: 'Invalid domain hostname structure. Examples: app.site.com, site.local' });
    }
  }

  next();
};

export const validateProjectName = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;

  if (!name || !projectNameRegex.test(name)) {
    return res.status(400).json({ 
      message: 'Project name must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens.' 
    });
  }

  next();
};
