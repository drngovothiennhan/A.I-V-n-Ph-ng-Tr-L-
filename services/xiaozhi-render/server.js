import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 10000);
const GATEWAY_TOKEN = String(process.env.XIAOZHI_WS_TOKEN || process.env.BRIDGE_TOKEN || '');
const UPSTREAM_URL = String(process.env.XIAOZHI_UPSTREAM_WS_URL || '');
const UPSTREAM_TOKEN = String(process.env.XIAOZHI_UPSTREAM_TOKEN || '');
const PROTOCOL_VERSION = String(process.env.XIAOZHI_PROTOCOL_VERSION || '1');
const CONFIGURED_CLIENT_ID = String(process.env.XIAOZHI_CLIENT_ID || '');
const CONFIGURED_DEVICE_ID = String(process.env.XIAOZHI_DEVICE_ID || '');
const RELEASE = 'xiaozhi-render-gateway-1.2.0';
const TRUSTED_ORIGINS = new Set([
  'https://ai-van-phong-tro-ly.vercel.app',
  'https://ai-van-phong-tro-ly-hiu-yhct.vercel.app'
]);
const MAX_QUEUE_MESSAGES = 32;
const MAX_QUEUE_BYTES = 256 * 1024;
const CLIENT_STALE_MS = 65000;

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
  if (!GATEWAY_TOKEN) return false;
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ') && safeEqual(header.slice(7), GATEWAY_TOKEN)) return true;
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  return safeEqual(url.searchParams.get('token') || '', GATEWAY_TOKEN);
}

function upstreamTarget() {
  if (!UPSTREAM_URL) return null;
  const url = new URL(UPSTREAM_URL);
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('INVALID_UPSTREAM_PROTOCOL');
  const host = url.hostname.toLowerCase();
  if (host === 'ai-office-xiaozhi-gateway.onrender.com') throw new Error('UPSTREAM_RECURSION_FORBIDDEN');
  return url.toString();
}

function sendJson(ws, body) {
  if (ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(body));
  return true;
}

function connectionIdentity(req) {
  const generated = crypto.randomUUID();
  const clientId = CONFIGURED_CLIENT_ID || String(req.headers['client-id'] || '') || `ai-office-${generated}`;
  const deviceId = CONFIGURED_DEVICE_ID || String(req.headers['device-id'] || '') || `web-${generated}`;
  return { clientId, deviceId };
}

function protocolHello() {
  const version = Math.max(1, Number(PROTOCOL_VERSION) || 1);
  return {
    type: 'hello',
    version,
    features: { mcp: true, aec: false },
    transport: 'websocket',
    audio_params: {
      format: 'opus',
      sample_rate: 16000,
      channels: 1,
      frame_duration: 60
    }
  };
}

let configuredUpstream = null;
let upstreamConfigError = '';
try {
  configuredUpstream = upstreamTarget();
} catch (error) {
  upstreamConfigError = String(error?.message || error).slice(0, 160);
  console.error(JSON.stringify({ event: 'upstream_config_error', error: upstreamConfigError }));
}

const clients = new Map();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/ready')) {
    const upstreamReadyClients = [...clients.values()].filter(session => session.upstreamReady).length;
    return json(res, 200, {
      ok: true,
      service: 'ai-office-xiaozhi-render-gateway',
      release: RELEASE,
      websocketPath: '/xiaozhi/v1/',
      protocolVersion: PROTOCOL_VERSION,
      authConfigured: Boolean(GATEWAY_TOKEN),
      trustedOriginMode: true,
      trustedOrigins: [...TRUSTED_ORIGINS],
      activeClients: clients.size,
      upstreamConfigured: Boolean(configuredUpstream),
      upstreamReadyClients,
      upstreamMode: configuredUpstream ? 'xiaozhi-websocket-relay' : 'browser-fallback-transport',
      upstreamConfigError: upstreamConfigError || null,
      protocolProfile: 'xiaozhi-websocket-v1-compatible',
      timestamp: new Date().toISOString()
    });
  }
  return json(res, 404, { error: 'NOT_FOUND' });
});

const wss = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
  maxPayload: 2 * 1024 * 1024
});

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
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

function queueForUpstream(session, data, isBinary) {
  const bytes = Buffer.byteLength(data);
  if (session.queue.length >= MAX_QUEUE_MESSAGES || session.queueBytes + bytes > MAX_QUEUE_BYTES) return false;
  session.queue.push({ data, isBinary });
  session.queueBytes += bytes;
  return true;
}

function flushUpstreamQueue(session) {
  if (!session.upstream || session.upstream.readyState !== WebSocket.OPEN) return;
  for (const item of session.queue.splice(0)) {
    session.upstream.send(item.data, { binary: item.isBinary });
  }
  session.queueBytes = 0;
}

function closeUpstream(session, code = 1000, reason = 'client_closed') {
  const upstream = session.upstream;
  session.upstream = null;
  session.upstreamReady = false;
  if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
  session.reconnectTimer = null;
  if (upstream && [WebSocket.OPEN, WebSocket.CONNECTING].includes(upstream.readyState)) {
    try { upstream.close(code, reason); } catch {}
  }
}

function scheduleUpstreamReconnect(session) {
  if (session.closed || !configuredUpstream || session.reconnectTimer) return;
  const attempt = Math.min(session.reconnectAttempt++, 6);
  const delay = Math.min(12000, 600 * (2 ** attempt)) + Math.floor(Math.random() * 250);
  session.reconnectTimer = setTimeout(() => {
    session.reconnectTimer = null;
    if (!session.closed && session.client.readyState === WebSocket.OPEN) connectUpstream(session);
  }, delay);
}

function connectUpstream(session) {
  if (!configuredUpstream || session.closed) {
    sendJson(session.client, {
      type: 'provider',
      provider: 'xiaozhi-render',
      connected: true,
      upstreamConnected: false,
      mode: 'browser-fallback-transport',
      sessionId: session.sessionId,
      protocolVersion: PROTOCOL_VERSION
    });
    return;
  }
  if (session.upstream && [WebSocket.OPEN, WebSocket.CONNECTING].includes(session.upstream.readyState)) return;

  const headers = {
    'Protocol-Version': PROTOCOL_VERSION,
    'Client-Id': session.identity.clientId,
    'Device-Id': session.identity.deviceId,
    'User-Agent': `AI-Office-XiaoZhi-Relay/${RELEASE}`
  };
  if (UPSTREAM_TOKEN) headers.Authorization = `Bearer ${UPSTREAM_TOKEN}`;

  const upstream = new WebSocket(configuredUpstream, {
    headers,
    handshakeTimeout: 8000,
    perMessageDeflate: false,
    maxPayload: 2 * 1024 * 1024
  });
  session.upstream = upstream;

  upstream.on('open', () => {
    if (session.closed || session.upstream !== upstream) return;
    session.upstreamReady = true;
    session.reconnectAttempt = 0;
    upstream.send(JSON.stringify(protocolHello()));
    flushUpstreamQueue(session);
    sendJson(session.client, {
      type: 'provider',
      provider: 'xiaozhi-render',
      connected: true,
      upstreamConnected: true,
      mode: 'xiaozhi-websocket-relay',
      sessionId: session.sessionId,
      protocolVersion: PROTOCOL_VERSION
    });
    console.log(JSON.stringify({ event: 'upstream_connected', sessionId: session.sessionId }));
  });

  upstream.on('message', (data, isBinary) => {
    if (session.closed || session.client.readyState !== WebSocket.OPEN) return;
    session.client.send(data, { binary: isBinary });
  });

  upstream.on('close', code => {
    if (session.upstream === upstream) {
      session.upstream = null;
      session.upstreamReady = false;
    }
    if (session.closed) return;
    sendJson(session.client, {
      type: 'provider',
      provider: 'xiaozhi-render',
      connected: true,
      upstreamConnected: false,
      upstreamCode: code,
      mode: 'browser-fallback-transport',
      sessionId: session.sessionId
    });
    console.log(JSON.stringify({ event: 'upstream_closed', sessionId: session.sessionId, code }));
    scheduleUpstreamReconnect(session);
  });

  upstream.on('error', error => {
    console.error(JSON.stringify({
      event: 'upstream_error',
      sessionId: session.sessionId,
      message: String(error?.message || error).slice(0, 180)
    }));
  });
}

wss.on('connection', (client, req) => {
  const sessionId = crypto.randomUUID();
  const origin = String(req.headers.origin || '');
  const session = {
    client,
    sessionId,
    identity: connectionIdentity(req),
    upstream: null,
    upstreamReady: false,
    queue: [],
    queueBytes: 0,
    reconnectAttempt: 0,
    reconnectTimer: null,
    lastPongAt: Date.now(),
    closed: false,
    upstreamWarningSent: false
  };
  clients.set(client, session);

  console.log(JSON.stringify({ event: 'ws_connected', sessionId, origin: origin || 'server-client', clients: clients.size }));
  sendJson(client, {
    type: 'provider',
    provider: 'xiaozhi-render',
    connected: true,
    upstreamConnected: false,
    sessionId,
    protocolVersion: PROTOCOL_VERSION,
    mode: configuredUpstream ? 'upstream-connecting' : 'browser-fallback-transport'
  });
  connectUpstream(session);

  client.on('message', (data, isBinary) => {
    if (isBinary) {
      if (session.upstream?.readyState === WebSocket.OPEN) {
        session.upstream.send(data, { binary: true });
      } else if (configuredUpstream) {
        if (!queueForUpstream(session, data, true)) sendJson(client, { type: 'error', code: 'UPSTREAM_QUEUE_FULL', sessionId });
      } else if (!session.upstreamWarningSent) {
        session.upstreamWarningSent = true;
        sendJson(client, { type: 'error', code: 'XIAOZHI_UPSTREAM_NOT_CONFIGURED', fallback: 'browser', sessionId });
      }
      return;
    }

    let msg;
    try { msg = JSON.parse(data.toString()); } catch { msg = { type: 'text', text: data.toString() }; }

    if (msg.type === 'pong') {
      session.lastPongAt = Date.now();
      return;
    }
    if (msg.type === 'ping') {
      session.lastPongAt = Date.now();
      sendJson(client, { type: 'pong', at: Date.now(), sessionId });
      return;
    }
    if (msg.type === 'hello') {
      sendJson(client, {
        type: 'hello',
        transport: 'websocket',
        session_id: sessionId,
        protocolVersion: PROTOCOL_VERSION,
        upstreamConnected: session.upstreamReady,
        audio_params: { format: 'opus', sample_rate: 24000, channels: 1, frame_duration: 60 }
      });
      return;
    }
    if (msg.type === 'status') {
      sendJson(client, {
        type: 'status',
        connected: true,
        upstreamConnected: session.upstreamReady,
        mode: session.upstreamReady ? 'xiaozhi-websocket-relay' : 'browser-fallback-transport',
        sessionId,
        protocolVersion: PROTOCOL_VERSION
      });
      return;
    }
    if (msg.type === 'interrupt') {
      if (session.upstream?.readyState === WebSocket.OPEN) {
        session.upstream.send(JSON.stringify({ type: 'abort', session_id: msg.session_id || sessionId, reason: 'user_interrupt' }));
      }
      sendJson(client, { type: 'interrupt', ok: true, sessionId });
      return;
    }

    if (session.upstream?.readyState === WebSocket.OPEN) {
      session.upstream.send(data, { binary: false });
      return;
    }
    if (configuredUpstream) {
      if (!queueForUpstream(session, data, false)) sendJson(client, { type: 'error', code: 'UPSTREAM_QUEUE_FULL', sessionId });
      return;
    }
    if (!session.upstreamWarningSent) {
      session.upstreamWarningSent = true;
      sendJson(client, {
        type: 'provider',
        provider: 'xiaozhi-render',
        connected: true,
        upstreamConnected: false,
        mode: 'browser-fallback-transport',
        reason: 'XIAOZHI_UPSTREAM_NOT_CONFIGURED',
        sessionId
      });
    }
  });

  client.on('close', () => {
    session.closed = true;
    closeUpstream(session, 1000, 'client_closed');
    clients.delete(client);
    console.log(JSON.stringify({ event: 'ws_closed', sessionId, clients: clients.size }));
  });
  client.on('error', () => {
    session.closed = true;
    closeUpstream(session, 1011, 'client_error');
    clients.delete(client);
  });
});

const heartbeat = setInterval(() => {
  const now = Date.now();
  for (const [ws, session] of clients) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    if (now - session.lastPongAt > CLIENT_STALE_MS) {
      try { ws.terminate(); } catch {}
      continue;
    }
    sendJson(ws, { type: 'ping', at: now, provider: 'xiaozhi-render' });
  }
}, 25000);
heartbeat.unref?.();

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({
    event: 'started',
    release: RELEASE,
    port: PORT,
    authConfigured: Boolean(GATEWAY_TOKEN),
    trustedOriginMode: true,
    protocolVersion: PROTOCOL_VERSION,
    upstreamConfigured: Boolean(configuredUpstream),
    upstreamMode: configuredUpstream ? 'xiaozhi-websocket-relay' : 'browser-fallback-transport'
  }));
});

function shutdown(signal) {
  clearInterval(heartbeat);
  for (const [ws, session] of clients) {
    session.closed = true;
    closeUpstream(session, 1001, 'server_shutdown');
    try { ws.close(1001, 'server_shutdown'); } catch {}
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
  console.log(JSON.stringify({ event: 'shutdown', signal }));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
