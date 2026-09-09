import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

const upstreamUrl = process.env.XIAOZHI_WS_URL || '';
const upstreamToken = process.env.XIAOZHI_TOKEN || '';

const server = createServer();
const wss = new WebSocketServer({ server });

function safeUpstreamUrl() {
  if (!upstreamUrl) return null;
  const url = new URL(upstreamUrl);
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('INVALID_XIAOZHI_PROTOCOL');
  if (upstreamToken) url.searchParams.set('access_token', upstreamToken);
  return url.toString();
}

wss.on('connection', (client) => {
  let upstream: WebSocket | null = null;
  let closed = false;

  const fail = (code: string) => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'error', code }));
  };

  try {
    const target = safeUpstreamUrl();
    if (!target) {
      fail('XIAOZHI_NOT_CONFIGURED');
      client.close(1013, 'provider_not_configured');
      return;
    }

    upstream = new WebSocket(target, { handshakeTimeout: 8000 });

    upstream.on('open', () => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'provider', provider: 'xiaozhi', connected: true }));
      }
    });

    client.on('message', (data, isBinary) => {
      if (!upstream || upstream.readyState !== WebSocket.OPEN) {
        if (!isBinary) {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'ping' && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'pong', at: Date.now() }));
              return;
            }
          } catch {}
        }
        return fail('UPSTREAM_NOT_READY');
      }
      upstream.send(data, { binary: isBinary });
    });

    upstream.on('message', (data, isBinary) => {
      if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
    });

    upstream.on('close', () => {
      if (!closed && client.readyState === WebSocket.OPEN) client.close(1012, 'upstream_closed');
    });

    upstream.on('error', () => fail('UPSTREAM_ERROR'));

    client.on('close', () => {
      closed = true;
      if (upstream && [WebSocket.OPEN, WebSocket.CONNECTING].includes(upstream.readyState)) upstream.close();
    });

  } catch {
    fail('XIAOZHI_BRIDGE_INIT_FAILED');
    client.close(1011, 'bridge_init_failed');
  }
});

export default server;
