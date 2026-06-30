import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

interface ContainerInfo {
  id: string;
  name: string;
  projectName: string;
  projectId: string;
  image: string;
  status: 'RUNNING' | 'STOPPED' | 'BUILDING';
  ports: string;
  created: string;
}

// In-memory overrides map for testing stop/start actions when Docker daemon is offline
// Map<containerId/name, statusState>
const simulatedContainerStates = new Map<string, 'RUNNING' | 'STOPPED'>();

const checkDockerDaemon = async (): Promise<boolean> => {
  try {
    await execPromise('docker info');
    return true;
  } catch {
    return false;
  }
};

export const listHostContainers = async (userId: string): Promise<ContainerInfo[]> => {
  const hasDocker = await checkDockerDaemon();

  // Fetch all user's projects
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      deployments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const projectIds = projects.map(p => p.id);

  if (hasDocker) {
    // --- NATIVE DOCKER DAEMON INTERFACING ---
    try {
      // Fetch containers list matching our DeploySphere naming conventions
      const { stdout } = await execPromise('docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}|{{.CreatedAt}}"');
      
      const lines = stdout.trim().split('\n').filter(line => line.length > 0);
      const containers: ContainerInfo[] = [];

      for (const line of lines) {
        const [id, name, image, rawStatus, ports, created] = line.split('|');
        
        // Check if this container belongs to any of the user's projects
        // Naming standard: deploysphere-{projectId}
        const match = name.match(/^deploysphere-(.+)$/);
        if (match) {
          const matchedProjectId = match[1];
          const matchedProject = projects.find(p => p.id === matchedProjectId);

          if (matchedProject) {
            const isRunning = rawStatus.toLowerCase().includes('up');
            containers.push({
              id,
              name,
              projectName: matchedProject.name,
              projectId: matchedProject.id,
              image,
              status: isRunning ? 'RUNNING' : 'STOPPED',
              ports: ports || '—',
              created: created || '—',
            });
          }
        }
      }

      return containers;
    } catch (err: any) {
      console.error('[DOCKER SERVICE] Error listing native docker containers:', err);
      // Fallback to simulated lists if command failed
    }
  }

  // --- SIMULATED CONTAINER REGISTRY FALLBACK ---
  const containers: ContainerInfo[] = [];

  for (const project of projects) {
    const latestSuccess = project.deployments.find(d => d.status === 'SUCCESS');
    
    if (latestSuccess) {
      const containerName = `deploysphere-${project.id}`;
      
      // Determine simulated state (default: RUNNING, unless override exists)
      if (!simulatedContainerStates.has(containerName)) {
        simulatedContainerStates.set(containerName, 'RUNNING');
      }

      const status = simulatedContainerStates.get(containerName)!;
      // Extract port from logs if possible (e.g. established on http://localhost:8168 -> 8168)
      const portMatch = latestSuccess.logs.match(/established on http:\/\/localhost:(\d+)/);
      const portBind = portMatch ? `${portMatch[1]} -> 80` : '8080 -> 80';

      containers.push({
        id: latestSuccess.id.substring(0, 12),
        name: containerName,
        projectName: project.name,
        projectId: project.id,
        image: `deploysphere-${project.name.toLowerCase()}:${latestSuccess.id.substring(0, 8)}`,
        status,
        ports: portBind,
        created: latestSuccess.createdAt.toLocaleString(),
      });
    }
  }

  return containers;
};

export const executeContainerAction = async (
  containerId: string,
  projectId: string,
  action: 'start' | 'stop' | 'restart' | 'delete'
): Promise<void> => {
  const hasDocker = await checkDockerDaemon();
  const containerName = `deploysphere-${projectId}`;

  if (hasDocker) {
    // --- NATIVE CONTAINER CONTROL ACTIONS ---
    try {
      let cmd = '';
      switch (action) {
        case 'start': cmd = `docker start ${containerName}`; break;
        case 'stop': cmd = `docker stop ${containerName}`; break;
        case 'restart': cmd = `docker restart ${containerName}`; break;
        case 'delete': cmd = `docker rm -f ${containerName}`; break;
      }
      await execPromise(cmd);
      return;
    } catch (err: any) {
      console.error(`[DOCKER SERVICE] Failed to execute ${action} natively on host container:`, err);
      // Fallback to simulated overrides update on error
    }
  }

  // --- SIMULATED OVERRIDES STATE UPDATE ---
  if (action === 'delete') {
    simulatedContainerStates.delete(containerName);
    // Delete corresponding deployments from database to clear history if desired,
    // or just remove simulated state so it disappears from active lists.
  } else if (action === 'stop') {
    simulatedContainerStates.set(containerName, 'STOPPED');
  } else if (action === 'start' || action === 'restart') {
    simulatedContainerStates.set(containerName, 'RUNNING');
  }
};

export const getContainerLogs = async (projectId: string): Promise<string> => {
  const hasDocker = await checkDockerDaemon();
  const containerName = `deploysphere-${projectId}`;

  if (hasDocker) {
    // --- NATIVE CONTAINER RUNTIME LOGS ---
    try {
      const { stdout } = await execPromise(`docker logs --tail 200 ${containerName}`);
      return stdout || 'Container running. Logs console empty.';
    } catch (err: any) {
      console.error('[DOCKER SERVICE] Error getting native container logs:', err);
    }
  }

  // --- SIMULATED LOGS ---
  // Return compilation logs of the latest deployment
  const latestDeployment = await prisma.deployment.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (latestDeployment) {
    return latestDeployment.logs + '\n\n[RUNTIME SIMULATOR] Application running in detached sandbox port.';
  }

  return 'No logs recorded for this container.';
};
