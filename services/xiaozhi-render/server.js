import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 10000);
const TOKEN = String(process.env.XIAOZHI_WS_TOKEN || process.env.BRIDGE_TOKEN || '');
const PROTOCOL_VERSION = String(process.env.XIAOZHI_PROTOCOL_VERSION || '1');
const RELEASE = 'xiaozhi-render-gateway-1.1.0';
const TRUSTED_ORIGINS = new Set([
  'https://ai-van-phong-tro-ly.vercel.app',
  'https://ai-van-phong-tro-ly-hiu-yhct.vercel.app'
]);

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-length': Buffer.byteLength(text)
  });
  res.end(text);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function authorized(req) {
  const origin = String(req.headers.origin || '').replace(/\/$/, '');
  if (TRUSTED_ORIGINS.has(origin)) return true;
  if (!TOKEN) return false;
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ') && safeEqual(header.slice(7), TOKEN)) return true;
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  return safeEqual(url.searchParams.get('token') || '', TOKEN);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/ready')) {
    return json(res, 200, {
      ok: true,
      service: 'ai-office-xiaozhi-render-gateway',
      release: RELEASE,
      websocketPath: '/xiaozhi/v1/',
      protocolVersion: PROTOCOL_VERSION,
      authConfigured: Boolean(TOKEN),
      trustedOriginMode: true,
      trustedOrigins: [...TRUSTED_ORIGINS],
      activeClients: clients.size,
      timestamp: new Date().toISOString()
    });
  }
  return json(res, 404, { error: 'NOT_FOUND' });
});

const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 2 * 1024 * 1024 });
const clients = new Set();

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname !== '/xiaozhi/v1/' && url.pathname !== '/xiaozhi/v1') {
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  if (!authorized(req)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws, req) => {
  clients.add(ws);
  const sessionId = crypto.randomUUID();
  const origin = String(req.headers.origin || '');
  console.log(JSON.stringify({ event: 'ws_connected', sessionId, origin: origin || 'server-client', clients: clients.size }));
  ws.send(JSON.stringify({ type: 'provider', provider: 'xiaozhi-render', connected: true, sessionId, protocolVersion: PROTOCOL_VERSION }));

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      ws.send(data, { binary: true });
      return;
    }
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { msg = { type: 'text', text: data.toString() }; }
    if (msg.type === 'ping') return ws.send(JSON.stringify({ type: 'pong', at: Date.now(), sessionId }));
    if (msg.type === 'hello') return ws.send(JSON.stringify({ type: 'hello', ok: true, provider: 'xiaozhi-render', sessionId, protocolVersion: PROTOCOL_VERSION }));
    if (msg.type === 'interrupt') return ws.send(JSON.stringify({ type: 'interrupt', ok: true, sessionId }));
    if (msg.type === 'status') return ws.send(JSON.stringify({ type: 'status', connected: true, sessionId, protocolVersion: PROTOCOL_VERSION }));
    ws.send(JSON.stringify({ type: 'message', echo: msg, sessionId }));
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(JSON.stringify({ event: 'ws_closed', sessionId, clients: clients.size }));
  });
  ws.on('error', () => clients.delete(ws));
});

const heartbeat = setInterval(() => {
  const payload = JSON.stringify({ type: 'ping', at: Date.now(), provider: 'xiaozhi-render' });
  for (const ws of clients) if (ws.readyState === WebSocket.OPEN) ws.send(payload);
}, 25000);
heartbeat.unref?.();

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'started', release: RELEASE, port: PORT, authConfigured: Boolean(TOKEN), trustedOriginMode: true, protocolVersion: PROTOCOL_VERSION }));
});

function shutdown(signal) {
  clearInterval(heartbeat);
  for (const ws of clients) {
    try { ws.close(1001, 'server_shutdown'); } catch {}
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
  console.log(JSON.stringify({ event: 'shutdown', signal }));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
