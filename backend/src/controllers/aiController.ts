import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// @desc    Intelligent context-aware DevOps AI chat assistant
// @route   POST /api/ai/chat
// @access  Protected
export const postAIChat = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { message } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!message || message.trim() === '') {
    return res.status(400).json({ message: 'Please provide a chat prompt.' });
  }

  try {
    const prompt = message.toLowerCase();
    let reply = '';

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const failedDeployments = projects.flatMap((project) =>
      project.deployments
        .filter((deployment) => deployment.status === 'FAILED')
        .map((deployment) => ({ ...deployment, projectName: project.name }))
    );

    failedDeployments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latestFailed = failedDeployments[0];

    if (prompt.includes('fail') || prompt.includes('error') || prompt.includes('log')) {
      if (latestFailed) {
        const logSnippet = latestFailed.logs
          ? latestFailed.logs.split('\n').slice(-8).join('\n')
          : 'No compilation logs found.';

        reply = `I inspected your latest failed deployment for project **${latestFailed.projectName}** (ID: ${latestFailed.id.substring(0, 8)}).

Here is the traceback highlight from the compilation pipeline logs:
\`\`\`
${logSnippet}
\`\`\`

**DevOps Diagnosis**:
`;

        if (logSnippet.includes('npm ERR!') || logSnippet.includes('npm error')) {
          reply += `It looks like an **NPM dependency resolution error**.
- Please check that all dependencies in your \`package.json\` are compatible.
- Ensure that you are not referencing local modules that were not checked into git.`;
        } else if (logSnippet.includes('tsc') || logSnippet.includes('TypeScript') || logSnippet.includes('TS')) {
          reply += `I detected a **TypeScript compilation error**.
- Run \`npx tsc --noEmit\` locally to troubleshoot type incompatibilities before pushing.
- Make sure that TypeScript type declarations, such as \`@types/node\`, are added to devDependencies.`;
        } else if (logSnippet.includes('Docker') || logSnippet.includes('dockerfile') || logSnippet.includes('daemon')) {
          reply += `It looks like a **Docker engine error**.
- Ensure the Docker daemon is running on your host machine.
- Verify that your Dockerfile syntax is correct and does not copy missing source directories.`;
        } else {
          reply += `This compilation failure was triggered during the build/start phases.
- Verify that your project has a valid start script, such as \`npm run start\`, and matches the selected framework preset.`;
        }
      } else {
        reply = 'You have no failed deployments recorded in your database history. If a container fails later, check that the project has a valid start command configured in settings.';
      }
    } else if (prompt.includes('domain') || prompt.includes('custom domain') || prompt.includes('routing') || prompt.includes('ssl') || prompt.includes('https')) {
      reply = `You can configure subdomains and custom domains on the **Routing Portal** page.

Steps to secure your endpoints with SSL:
1. Navigate to the Routing panel and enter your target custom domain.
2. Click the check button to save the mapping.
3. Click **Enable SSL** next to the domain name.
4. Select either **Self-Signed Sandbox** for local testing or **Let's Encrypt** for HTTP-01 validation.

DeploySphere will dynamically rebuild and reload Nginx settings in the background.`;
    } else if (prompt.includes('monitoring') || prompt.includes('stats') || prompt.includes('cpu') || prompt.includes('ram') || prompt.includes('metrics')) {
      reply = `You can monitor host and container telemetry in the **Monitoring Workspace**.

The monitoring stack includes:
- **Node Exporter** for host CPU, RAM, and disk metrics.
- **cAdvisor** for container CPU shares, memory allocation, and network activity.

You can inspect container logs from the **Docker Management Console**.`;
    } else if (prompt.includes('blue') || prompt.includes('green') || prompt.includes('canary') || prompt.includes('strategy')) {
      reply = `DeploySphere supports advanced deployment routing strategies:
- **Standard**: routes traffic to a single active container.
- **Blue-Green**: shifts traffic to a standby container after a healthy update.
- **Canary**: splits traffic by weight, such as 10% canary and 90% production.

Configure these strategies under **Project Settings** when creating or editing a project.`;
    } else if (prompt.includes('admin') || prompt.includes('panel')) {
      reply = `The **Global Administration Panel** is available to admin users, for example \`admin@deploysphere.local\`.

Admin capabilities include:
- Viewing platform stats and registered users.
- Reviewing global projects and deployments.
- Inspecting host server details.
- Tracking platform audit logs.`;
    } else {
      reply = `Hello! I am your **DeploySphere DevOps Assistant**.

I can help you troubleshoot build failures, configure domain routing, provision SSL certificates, and monitor your containers.

Questions you can ask me:
- *'Why did my last build fail?'* I will scan failed build logs and point to the likely cause.
- *'How do I map custom domains and enable SSL?'*
- *'Where do I view host CPU and container RAM metrics?'*
- *'Explain Blue-Green and Canary deployment upstreams.'*
- *'What are the admin panel credentials?'*`;
    }

    return res.json({ reply });
  } catch (error: any) {
    console.error('AI chat controller error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
