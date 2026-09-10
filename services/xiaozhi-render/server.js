import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 10000);
const TOKEN = String(process.env.XIAOZHI_WS_TOKEN || process.env.BRIDGE_TOKEN || '');
const PROTOCOL_VERSION = String(process.env.XIAOZHI_PROTOCOL_VERSION || '1');
const RELEASE = 'xiaozhi-render-gateway-1.0.0';

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

function authorized(req) {
  if (!TOKEN) return false;
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ')) return crypto.timingSafeEqual(Buffer.from(header.slice(7)), Buffer.from(TOKEN));
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const queryToken = url.searchParams.get('token') || '';
  if (!queryToken) return false;
  const a = Buffer.from(queryToken), b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

const heartbeat = setInterval(() => {
  const payload = JSON.stringify({ type: 'ping', at: Date.now(), provider: 'xiaozhi-render' });
  for (const ws of clients) if (ws.readyState === WebSocket.OPEN) ws.send(payload);
}, 25000);
heartbeat.unref?.();

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'started', release: RELEASE, port: PORT, authConfigured: Boolean(TOKEN), protocolVersion: PROTOCOL_VERSION }));
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
