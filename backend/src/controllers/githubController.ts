import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// In production, register your OAuth app and add these to .env
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:5000/api/github/callback';

const isMockMode = !GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET;

// @desc    Get GitHub Authorization URL
// @route   GET /api/github/auth-url
// @access  Protected
export const getAuthUrl = (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (isMockMode) {
    // Return a local mock authorization redirect URL
    const mockAuthUrl = `http://localhost:5000/api/github/callback?code=mock_code_for_user_${userId}&state=${userId}`;
    return res.json({ url: mockAuthUrl, mock: true });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo,admin:repo_hook&state=${userId}`;
  return res.json({ url: githubAuthUrl, mock: false });
};

// @desc    GitHub OAuth callback
// @route   GET /api/github/callback
// @access  Public
export const callback = async (req: Request | any, res: Response) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('No code returned from GitHub');
  }

  // State maps to userId
  const userId = state as string;

  try {
    let githubToken = '';
    let githubUsername = '';

    if (isMockMode || (code as string).startsWith('mock_code')) {
      // Simulation connection setup
      githubToken = `mock_access_token_${Math.random().toString(36).substring(2)}`;
      githubUsername = 'upendra-devops';
    } else {
      // Live Exchange token flow
      const tokenRes = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      githubToken = tokenRes.data.access_token;
      if (!githubToken) {
        throw new Error('Failed to retrieve GitHub access token');
      }

      // Fetch user profile from GitHub API
      const userProfileRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${githubToken}` },
      });
      githubUsername = userProfileRes.data.login;
    }

    // Save tokens inside User DB model
    await prisma.user.update({
      where: { id: userId },
      data: {
        githubToken,
        githubUsername,
      },
    });

    // Redirect user back to frontend connected settings
    return res.redirect('http://localhost:5173/github-connect?status=success');
  } catch (error: any) {
    console.error('GitHub OAuth Error:', error);
    return res.redirect('http://localhost:5173/github-connect?status=error&message=' + encodeURIComponent(error.message));
  }
};

// @desc    Get user's GitHub Repositories
// @route   GET /api/github/repos
// @access  Protected
export const getRepositories = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.githubToken) {
      return res.status(400).json({ message: 'GitHub account is not connected' });
    }

    // Simulated repositories fallback
    if (user.githubToken.startsWith('mock_')) {
      const mockRepos = [
        { name: 'deploysphere-service', fullName: `${user.githubUsername}/deploysphere-service`, url: `https://github.com/${user.githubUsername}/deploysphere-service` },
        { name: 'express-microservice', fullName: `${user.githubUsername}/express-microservice`, url: `https://github.com/${user.githubUsername}/express-microservice` },
        { name: 'react-dashboard-ui', fullName: `${user.githubUsername}/react-dashboard-ui`, url: `https://github.com/${user.githubUsername}/react-dashboard-ui` },
        { name: 'nginx-ingress-proxy', fullName: `${user.githubUsername}/nginx-ingress-proxy`, url: `https://github.com/${user.githubUsername}/nginx-ingress-proxy` },
      ];
      return res.json(mockRepos);
    }

    // Live API fetch
    const reposRes = await axios.get('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: { Authorization: `token ${user.githubToken}` },
    });

    const repos = reposRes.data.map((repo: any) => ({
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
    }));

    return res.json(repos);
  } catch (error: any) {
    console.error('Error fetching GitHub repos:', error);
    return res.status(500).json({ message: 'Failed to fetch repositories', error: error.message });
  }
};

// @desc    Get repository branches
// @route   GET /api/github/repos/:owner/:repo/branches
// @access  Protected
export const getBranches = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { owner, repo } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.githubToken) {
      return res.status(400).json({ message: 'GitHub account is not connected' });
    }

    // Simulated branches fallback
    if (user.githubToken.startsWith('mock_')) {
      const mockBranches = [{ name: 'main' }, { name: 'develop' }, { name: 'feature/monitoring' }];
      return res.json(mockBranches);
    }

    // Live API fetch
    const branchesRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: { Authorization: `token ${user.githubToken}` },
    });

    const branches = branchesRes.data.map((b: any) => ({ name: b.name }));
    return res.json(branches);
  } catch (error: any) {
    console.error('Error fetching branches:', error);
    return res.status(500).json({ message: 'Failed to fetch branches', error: error.message });
  }
};

// @desc    Disconnect GitHub account
// @route   POST /api/github/disconnect
// @access  Protected
export const disconnect = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        githubToken: null,
        githubUsername: null,
      },
    });

    return res.json({ message: 'GitHub account disconnected successfully' });
  } catch (error: any) {
    console.error('Error disconnecting GitHub:', error);
    return res.status(500).json({ message: 'Failed to disconnect account', error: error.message });
  }
};
