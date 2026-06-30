import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Listen for GitHub Webhook Push Events
// @route   POST /api/webhooks/github
// @access  Public (webhook verification optional in development)
export const handleGithubPush = async (req: Request, res: Response) => {
  const event = req.headers['x-github-event'];
  const { ref, repository, commits, pusher } = req.body;

  console.log('\n=================== GITHUB WEBHOOK EVENT ===================');
  console.log(`Event Type: ${event}`);
  console.log(`Repository: ${repository?.html_url}`);
  console.log(`Ref:        ${ref}`);
  console.log('============================================================\n');

  if (event !== 'push') {
    return res.json({ message: `Ignored event: ${event}` });
  }

  // Parse target branch from ref (e.g., refs/heads/main -> main)
  const branchName = ref ? ref.replace('refs/heads/', '') : 'main';
  const repoUrl = repository?.html_url;

  if (!repoUrl) {
    return res.status(400).json({ message: 'Missing repository url in webhook payload' });
  }

  try {
    // Locate the project matching repository and branch
    const project = await prisma.project.findFirst({
      where: {
        repositoryUrl: {
          contains: repoUrl, // handles trailing slashes or minor casing differences
        },
        branch: branchName,
      },
    });

    if (!project) {
      console.log(`[Webhook Warning] No active project matched repository URL "${repoUrl}" and branch "${branchName}".`);
      return res.status(404).json({ message: 'No matching project configuration found' });
    }

    const latestCommit = commits && commits.length > 0 ? commits[0] : null;
    const commitHash = latestCommit ? latestCommit.id.substring(0, 7) : 'head';
    const commitMsg = latestCommit ? latestCommit.message : 'Manual push hook trigger';
    const triggerAuthor = pusher ? pusher.email || pusher.name : 'GitHub Webhook';

    console.log(`[WEBHOOK TRIGGER] Found Project "${project.name}" (ID: ${project.id})`);
    console.log(`[WEBHOOK TRIGGER] Commit: ${commitHash} - "${commitMsg}"`);
    console.log(`[WEBHOOK TRIGGER] Triggering build environment simulator...\n`);

    // In later phases (Phase 5), this hook will delegate tasks directly to the deployment engine.
    // For Phase 4, we print to the console and return success.
    return res.json({
      message: `Webhook received. Triggered build for project "${project.name}" on branch "${branchName}".`,
      details: {
        projectId: project.id,
        commit: commitHash,
        message: commitMsg,
        author: triggerAuthor,
      },
    });
  } catch (error: any) {
    console.error('Error handling webhook push:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
