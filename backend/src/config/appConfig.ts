export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export const CORS_ORIGINS = (process.env.CORS_ORIGINS || `${FRONTEND_URL},http://localhost:5173,http://127.0.0.1:5173`)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

