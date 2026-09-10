import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const upstreamUrl = process.env.XIAOZHI_WS_URL || '';
const upstreamToken = process.env.XIAOZHI_WS_TOKEN || process.env.XIAOZHI_TOKEN || '';
const protocolVersion = process.env.XIAOZHI_PROTOCOL_VERSION || '1';
const configuredClientId = process.env.XIAOZHI_CLIENT_ID || '';
const configuredDeviceId = process.env.XIAOZHI_DEVICE_ID || '';

const server = createServer();
const wss = new WebSocketServer({ server });

function safeUpstreamUrl() {
  if (!upstreamUrl) return null;
  const url = new URL(upstreamUrl);
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('INVALID_XIAOZHI_PROTOCOL');
  if (!url.pathname || url.pathname === '/') url.pathname = '/xiaozhi/v1/';
  return url.toString();
}

function connectionIdentity() {
  const id = randomUUID();
  return {
    clientId: configuredClientId || `ai-office-${id}`,
    deviceId: configuredDeviceId || `web-${id}`
  };
}

wss.on('connection', (client) => {
  let upstream: WebSocket | null = null;
  let closed = false;
  const identity = connectionIdentity();

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

    const headers: Record<string, string> = {
      'Protocol-Version': protocolVersion,
      'Client-Id': identity.clientId,
      'Device-Id': identity.deviceId,
      'User-Agent': 'AI-Office-XiaoZhi-Bridge/1.8'
    };
    if (upstreamToken) headers.Authorization = `Bearer ${upstreamToken}`;

    upstream = new WebSocket(target, {
      handshakeTimeout: 8000,
      perMessageDeflate: false,
      headers
    });

    upstream.on('open', () => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'provider',
          provider: 'xiaozhi',
          connected: true,
          protocolVersion
        }));
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

    upstream.on('close', (code) => {
      if (!closed && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'provider', provider: 'xiaozhi', connected: false, upstreamCode: code }));
        client.close(1012, 'upstream_closed');
      }
    });

    upstream.on('error', (error) => {
      console.error('xiaozhi_upstream_error', { message: String(error?.message || error).slice(0, 220) });
      fail('UPSTREAM_ERROR');
    });

    client.on('close', () => {
      closed = true;
      if (upstream && [WebSocket.OPEN, WebSocket.CONNECTING].includes(upstream.readyState)) upstream.close();
    });
  } catch (error) {
    console.error('xiaozhi_bridge_init_error', { message: String(error?.message || error).slice(0, 220) });
    fail('XIAOZHI_BRIDGE_INIT_FAILED');
    client.close(1011, 'bridge_init_failed');
  }
});

export default server;
