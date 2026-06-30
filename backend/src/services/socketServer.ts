import { Server as HttpServer } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';

// Map storing connected WebSocket listeners subscribed to each deploymentId
// Map<deploymentId, Set<WebSocket>>
const subscribers = new Map<string, Set<WebSocket>>();

let wss: WebSocketServer | null = null;

export const initSocketServer = (server: HttpServer): void => {
  wss = new WebSocketServer({ server });

  console.log('[SOCKET] WebSocket Server initialized and attached to Express port.');

  wss.on('connection', (ws: WebSocket) => {
    let currentSubscriptionId: string | null = null;

    console.log('[SOCKET] Client connection established.');

    ws.on('message', (message: string) => {
      try {
        const payload = JSON.parse(message);

        if (payload.type === 'subscribe' && payload.deploymentId) {
          const depId = payload.deploymentId;
          currentSubscriptionId = depId;

          if (!subscribers.has(depId)) {
            subscribers.set(depId, new Set());
          }
          subscribers.get(depId)!.add(ws);
          console.log(`[SOCKET] Client subscribed to deployment stream: ${depId}`);
          
          // Send an initial success acknowledgement
          ws.send(JSON.stringify({ event: 'subscribed', deploymentId: depId }));
        }
      } catch (err) {
        console.error('[SOCKET] Error parsing message payload:', err);
      }
    });

    ws.on('close', () => {
      console.log('[SOCKET] Client connection closed.');
      if (currentSubscriptionId && subscribers.has(currentSubscriptionId)) {
        const set = subscribers.get(currentSubscriptionId)!;
        set.delete(ws);
        if (set.size === 0) {
          subscribers.delete(currentSubscriptionId);
        }
      }
    });

    ws.on('error', (err) => {
      console.error('[SOCKET] Socket error connection:', err);
    });
  });
};

// Emits build console stdout/stderr lines in real time to connected web sockets
export const emitBuildLog = (deploymentId: string, logMessage: string): void => {
  if (subscribers.has(deploymentId)) {
    const sockets = subscribers.get(deploymentId)!;
    console.log(`[SOCKET] Broadcasting real-time log delta to ${sockets.size} active subscribers.`);
    
    // Broadcast message to all subscribed sockets
    const payload = JSON.stringify({ event: 'log', data: logMessage });
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
};
