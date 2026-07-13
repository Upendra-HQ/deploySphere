const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

export const wsUrl = () => import.meta.env.VITE_WS_URL || API_BASE_URL.replace(/^http/, 'ws');

