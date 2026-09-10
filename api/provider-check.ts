import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';

const RELEASE = '1.9.3-autonomous-office-orchestrator';
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const DEFAULT_XIAOZHI_WS = 'wss://ai-office-xiaozhi-gateway.onrender.com/xiaozhi/v1/';
const PRODUCTION_ORIGIN = 'https://ai-van-phong-tro-ly.vercel.app';

function geminiModel() {
  return process.env.AI_OFFICE_GEMINI_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}
function xiaozhiUrl() {
  return process.env.XIAOZHI_WS_URL || DEFAULT_XIAOZHI_WS;
}
function json(res: any, status: number, body: any) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  return res.status(status).json(body);
}

async function probeGemini() {
  const key = process.env.GEMINI_API_KEY || '';
  const model = geminiModel();
  if (!key) return { pass: false, configured: false, reason: 'GEMINI_API_KEY_MISSING', model };

  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 16 }
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    return { pass: false, configured: true, model, status: response.status, reason: 'GEMINI_UPSTREAM_REJECTED' };
  }
  const data: any = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('').trim() || '';
  return { pass: Boolean(text), configured: true, model, responseReceived: Boolean(text) };
}

async function probeXiaozhi() {
  const raw = xiaozhiUrl();
  const token = process.env.XIAOZHI_WS_TOKEN || process.env.XIAOZHI_TOKEN || '';
  const protocolVersion = process.env.XIAOZHI_PROTOCOL_VERSION || '1';

  let target: URL;
  try {
    target = new URL(raw);
    if (!['ws:', 'wss:'].includes(target.protocol)) throw new Error('protocol');
    if (!target.pathname || target.pathname === '/') target.pathname = '/xiaozhi/v1/';
  } catch {
    return { pass: false, configured: true, reason: 'XIAOZHI_WS_URL_INVALID', protocolVersion, mode: 'render-direct-wss' };
  }

  const clientId = process.env.XIAOZHI_CLIENT_ID || `ai-office-probe-${randomUUID()}`;
  const deviceId = process.env.XIAOZHI_DEVICE_ID || `web-probe-${randomUUID()}`;
  const usingRenderDefault = target.hostname === 'ai-office-xiaozhi-gateway.onrender.com';
  const headers: Record<string, string> = {
    'Protocol-Version': protocolVersion,
    'Client-Id': clientId,
    'Device-Id': deviceId,
    'User-Agent': 'AI-Office-XiaoZhi-Probe/2.3',
    Origin: usingRenderDefault ? PRODUCTION_ORIGIN : PRODUCTION_ORIGIN
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return await new Promise((resolve) => {
    let settled = false;
    const done = (value: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch {}
      resolve(value);
    };
    const socket = new WebSocket(target.toString(), { headers, handshakeTimeout: 6000, perMessageDeflate: false });
    const timer = setTimeout(() => done({ pass: false, configured: true, secure: target.protocol === 'wss:', tokenConfigured: Boolean(token), protocolVersion, mode: 'render-direct-wss', endpoint: target.origin, reason: 'XIAOZHI_CONNECT_TIMEOUT' }), 7000);
    socket.once('open', () => done({ pass: true, configured: true, secure: target.protocol === 'wss:', tokenConfigured: Boolean(token), protocolVersion, mode: 'render-direct-wss', endpoint: target.origin, trustedOrigin: PRODUCTION_ORIGIN }));
    socket.once('unexpected-response', (_req, response) => done({ pass: false, configured: true, secure: target.protocol === 'wss:', tokenConfigured: Boolean(token), protocolVersion, mode: 'render-direct-wss', endpoint: target.origin, status: response.statusCode, reason: 'XIAOZHI_HANDSHAKE_REJECTED' }));
    socket.once('error', () => done({ pass: false, configured: true, secure: target.protocol === 'wss:', tokenConfigured: Boolean(token), protocolVersion, mode: 'render-direct-wss', endpoint: target.origin, reason: 'XIAOZHI_CONNECTION_FAILED' }));
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });

  const probe = String(req.query?.probe || 'config').toLowerCase();
  const source = process.env.XIAOZHI_WS_URL ? 'vercel-env' : 'render-direct-default';
  const config = {
    release: RELEASE,
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: geminiModel(),
      missing: process.env.GEMINI_API_KEY ? [] : ['GEMINI_API_KEY']
    },
    xiaozhi: {
      configured: true,
      source,
      mode: 'render-direct-wss',
      endpoint: xiaozhiUrl().replace(/\/xiaozhi\/v1\/?$/, ''),
      tokenConfigured: Boolean(process.env.XIAOZHI_WS_TOKEN || process.env.XIAOZHI_TOKEN),
      protocolVersion: process.env.XIAOZHI_PROTOCOL_VERSION || '1',
      stableIdentityConfigured: Boolean(process.env.XIAOZHI_CLIENT_ID && process.env.XIAOZHI_DEVICE_ID),
      browserFallback: true,
      voiceRenderVersion: '2.3',
      missing: []
    }
  };

  if (probe === 'config') return json(res, 200, config);
  if (probe === 'gemini') return json(res, 200, { ...config, probe: { gemini: await probeGemini() } });
  if (probe === 'xiaozhi') return json(res, 200, { ...config, probe: { xiaozhi: await probeXiaozhi() } });
  if (probe === 'all') {
    const [gemini, xiaozhi] = await Promise.all([probeGemini(), probeXiaozhi()]);
    return json(res, 200, { ...config, probe: { gemini, xiaozhi } });
  }
  return json(res, 400, { error: 'INVALID_PROBE', allowed: ['config', 'gemini', 'xiaozhi', 'all'] });
}
