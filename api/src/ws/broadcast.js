const WebSocket = require('ws');

let wss = null;

// Track which sockets have authenticated as admin
const adminSockets = new WeakSet();

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      // Allow clients to authenticate as admin for targeted broadcasts
      if (msg.type === 'admin:auth') {
        if (msg.password === process.env.ADMIN_PASSWORD) {
          adminSockets.add(ws);
          ws.send(JSON.stringify({ type: 'admin:auth:ok' }));
        }
      }
    });

    ws.on('error', () => {});
  });
}

function broadcast(event, data, { adminOnly = false } = {}) {
  if (!wss) return;
  const msg = JSON.stringify({ event, data });
  wss.clients.forEach((ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (adminOnly && !adminSockets.has(ws)) return;
    ws.send(msg);
  });
}

module.exports = { setupWebSocket, broadcast };
