import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { PrismaClient } from '@prisma/client';

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

const NGINX_DIR = path.join(__dirname, '..', '..', '..', 'nginx');
const CONF_D_DIR = path.join(NGINX_DIR, 'conf.d');
const DOMAINS_FILE = path.join(NGINX_DIR, 'domains.json');

// Ensure folder paths exist
if (!fs.existsSync(NGINX_DIR)) {
  fs.mkdirSync(NGINX_DIR, { recursive: true });
}
if (!fs.existsSync(CONF_D_DIR)) {
  fs.mkdirSync(CONF_D_DIR, { recursive: true });
}
if (!fs.existsSync(DOMAINS_FILE)) {
  fs.writeFileSync(DOMAINS_FILE, JSON.stringify({}));
}

// Read custom domains map
export const getCustomDomainsRegistry = async (): Promise<Record<string, string>> => {
  try {
    if (fs.existsSync(DOMAINS_FILE)) {
      const content = fs.readFileSync(DOMAINS_FILE, 'utf-8');
      return JSON.parse(content || '{}');
    }
  } catch (err) {
    console.error('[NGINX SERVICE] Error reading domains registry:', err);
  }
  return {};
};

// Write custom domain mapping
export const setCustomDomainMapping = async (projectId: string, domain: string): Promise<void> => {
  try {
    const registry = await getCustomDomainsRegistry();
    if (domain && domain.trim().length > 0) {
      registry[projectId] = domain.trim();
    } else {
      delete registry[projectId];
    }
    fs.writeFileSync(DOMAINS_FILE, JSON.stringify(registry, null, 2));

    // Regenerate config if the container is running and has a port mapping
    await updateNginxConfigForProject(projectId);
  } catch (err) {
    console.error('[NGINX SERVICE] Error writing domain mapping:', err);
    throw err;
  }
};

// Find the host port for a project from running containers or success logs
export const findProjectHostPort = async (projectId: string): Promise<number | null> => {
  // Check if Docker is available
  let hasDocker = false;
  try {
    await execPromise('docker info');
    hasDocker = true;
  } catch {}

  if (hasDocker) {
    try {
      const containerName = `deploysphere-${projectId}`;
      const { stdout } = await execPromise(`docker inspect --format="{{range $p, $conf := .NetworkSettings.Ports}}{{(index $conf 0).HostPort}}{{end}}" ${containerName}`);
      const portStr = stdout.trim();
      if (portStr) {
        return parseInt(portStr);
      }
    } catch {
      // Container not running or failed inspect
    }
  }

  // Fallback to searching deployment logs
  const latestSuccess = await prisma.deployment.findFirst({
    where: { projectId, status: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
  });

  if (latestSuccess) {
    // Search ports matching "Live at http://localhost:(\d+)" or "established on http://localhost:(\d+)"
    const portMatchStr = latestSuccess.logs.match(/(?:Live at http:\/\/localhost:|established on http:\/\/localhost:)(\d+)/);
    if (portMatchStr) {
      return parseInt(portMatchStr[1]);
    }
  }

  return null;
};

// Generate Nginx .conf config block
export const generateNginxConfigBlock = (
  projectName: string, 
  projectId: string, 
  port: number, 
  customDomain?: string,
  strategy: 'STANDARD' | 'BLUE_GREEN' | 'CANARY' = 'STANDARD',
  canaryWeight: number = 10
): string => {
  const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const subdomain = `${sanitizedName}.deploysphere.local`;
  const hostnames = [subdomain];
  
  if (customDomain) {
    hostnames.push(customDomain);
  }

  const sslDir = path.join(__dirname, '..', '..', '..', 'nginx', 'ssl');
  let configBlocks = '';

  // 1. Generate Shared Upstream block if strategy is Blue-Green or Canary
  let proxyPassUrl = `http://host.docker.internal:${port}`;
  
  if (strategy === 'BLUE_GREEN') {
    proxyPassUrl = `http://deploysphere_upstream_${projectId}`;
    configBlocks += `upstream deploysphere_upstream_${projectId} {
    server host.docker.internal:${port}; # Active Blue Container
    server host.docker.internal:${port + 1} backup; # Standby Green Container (Failover Backup)
}

`;
  } else if (strategy === 'CANARY') {
    proxyPassUrl = `http://deploysphere_upstream_${projectId}`;
    const mainWeight = Math.max(0, 100 - canaryWeight);
    configBlocks += `upstream deploysphere_upstream_${projectId} {
    server host.docker.internal:${port} weight=${mainWeight}; # Primary Production Blue Container (${mainWeight}%)
    server host.docker.internal:${port + 1} weight=${canaryWeight}; # Canary Green Container (${canaryWeight}%)
}

`;
  }

  for (const host of hostnames) {
    const certPath = path.join(sslDir, `${host}.crt`);
    const keyPath = path.join(sslDir, `${host}.key`);
    const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

    if (hasSSL) {
      configBlocks += `server {
    listen 80;
    server_name ${host};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${host};

    ssl_certificate /etc/nginx/ssl/${host}.crt;
    ssl_certificate_key /etc/nginx/ssl/${host}.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass ${proxyPassUrl};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

`;
    } else {
      configBlocks += `server {
    listen 80;
    server_name ${host};

    location / {
        proxy_pass ${proxyPassUrl};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

`;
    }
  }

  return configBlocks;
};

// Write config to disk and trigger reload
export const updateNginxConfigForProject = async (projectId: string): Promise<void> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) return;

    const hostPort = await findProjectHostPort(projectId);
    if (!hostPort) {
      // No active success port found, remove the configuration file to avoid routing requests
      await removeNginxConfig(projectId);
      return;
    }

    const registry = await getCustomDomainsRegistry();
    const customDomain = registry[projectId];
    
    const configContent = generateNginxConfigBlock(
      project.name, 
      projectId, 
      hostPort, 
      customDomain,
      project.deploymentStrategy as any,
      project.canaryWeight
    );
    const confPath = path.join(CONF_D_DIR, `deploysphere-${projectId}.conf`);

    fs.writeFileSync(confPath, configContent);
    console.log(`[NGINX SERVICE] Wrote config for project ${project.name} (strategy: ${project.deploymentStrategy}) on host port ${hostPort}`);
    
    // Trigger Nginx Reload
    await reloadNginx();
  } catch (err) {
    console.error(`[NGINX SERVICE] Error updating config for project ${projectId}:`, err);
  }
};

// Delete config from disk and trigger reload
export const removeNginxConfig = async (projectId: string): Promise<void> => {
  try {
    const confPath = path.join(CONF_D_DIR, `deploysphere-${projectId}.conf`);
    if (fs.existsSync(confPath)) {
      fs.unlinkSync(confPath);
      console.log(`[NGINX SERVICE] Deleted config for project ID ${projectId}`);
      await reloadNginx();
    }
  } catch (err) {
    console.error(`[NGINX SERVICE] Error removing config for project ${projectId}:`, err);
  }
};

// Reload Nginx container natively if it is active
export const reloadNginx = async (): Promise<boolean> => {
  try {
    // Check if docker daemon is active
    try {
      await execPromise('docker info');
    } catch {
      console.log('[NGINX SERVICE] Docker daemon offline. Config written, simulator reload complete.');
      return false;
    }

    // Check if Nginx container is running
    const containerNames = ['deploysphere-nginx-gateway-prod', 'deploysphere-nginx'];
    const activeContainer = await findRunningContainer(containerNames);

    if (activeContainer) {
      await execPromise(`docker exec ${activeContainer} nginx -s reload`);
      console.log('[NGINX SERVICE] Executed native Nginx container config hot-reload.');
      return true;
    } else {
      console.log('[NGINX SERVICE] Nginx reverse proxy container not running. Simulator reload complete.');
    }
  } catch (err: any) {
    console.error('[NGINX SERVICE] Failed to execute Nginx reload: ', err.message);
  }
  return false;
};

const findRunningContainer = async (names: string[]): Promise<string | null> => {
  for (const name of names) {
    const { stdout } = await execPromise(`docker ps -q -f name=^/${name}$`);
    if (stdout.trim().length > 0) {
      return name;
    }
  }

  return null;
};

// Check Nginx daemon running state (listening on port 80)
export const checkNginxStatus = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 1000);

    // Standard Nginx listens on port 80
    socket.connect(80, 'localhost', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
  });
};

// Add standard import for net
import net from 'net';
