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
      generationConfig: { maxOutputTokens: 256, thinkingConfig: { thinkingLevel: 'low' } }
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) return { pass: false, configured: true, model, status: response.status, reason: 'GEMINI_UPSTREAM_REJECTED' };
  const data: any = await response.json();
  const candidate = data?.candidates?.[0] || {};
  const text = candidate?.content?.parts?.map((p: any) => p?.text || '').join('').trim() || '';
  return {
    pass: Boolean(text), configured: true, model, responseReceived: Boolean(text),
    finishReason: candidate?.finishReason || null, promptBlocked: Boolean(data?.promptFeedback?.blockReason)
  };
}

async function probeGeminiGrounding() {
  const key = process.env.GEMINI_API_KEY || '';
  const model = geminiModel();
  if (!key) return { pass: false, configured: false, reason: 'GEMINI_API_KEY_MISSING', model };
  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Dùng Google Search và trả lời ngắn: trang chủ chính thức của Bộ Y tế Việt Nam là gì?' }] }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: 700 }
    }),
    signal: AbortSignal.timeout(22000)
  });
  if (!response.ok) {
    return { pass: false, configured: true, model, status: response.status, reason: 'GEMINI_GROUNDING_REJECTED' };
  }
  const data: any = await response.json();
  const candidate = data?.candidates?.[0] || {};
  const text = candidate?.content?.parts?.map((p: any) => p?.text || '').join('').trim() || '';
  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  const domains = chunks.map((chunk: any) => {
    try { return new URL(chunk?.web?.uri || '').hostname.toLowerCase(); } catch { return ''; }
  }).filter(Boolean);
  return {
    pass: Boolean(text && chunks.length),
    configured: true,
    model,
    responseReceived: Boolean(text),
    groundingSourceCount: chunks.length,
    searchQueries: candidate?.groundingMetadata?.webSearchQueries || [],
    domains: domains.slice(0,8),
    finishReason: candidate?.finishReason || null,
    promptBlocked: Boolean(data?.promptFeedback?.blockReason),
    reason: text && chunks.length ? null : 'GEMINI_GROUNDING_NO_SOURCES'
  };
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
  const headers: Record<string, string> = {
    'Protocol-Version': protocolVersion,
    'Client-Id': clientId,
    'Device-Id': deviceId,
    'User-Agent': 'AI-Office-XiaoZhi-Probe/2.5',
    Origin: PRODUCTION_ORIGIN
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return await new Promise((resolve) => {
    let settled = false;
    let opened = false;
    const base = {
      configured: true,
      secure: target.protocol === 'wss:',
      tokenConfigured: Boolean(token),
      protocolVersion,
      endpoint: target.origin,
      trustedOrigin: PRODUCTION_ORIGIN
    };
    const done = (value: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch {}
      resolve(value);
    };
    const socket = new WebSocket(target.toString(), { headers, handshakeTimeout: 6000, perMessageDeflate: false });
    const timer = setTimeout(() => done({
      ...base,
      pass: opened,
      gatewayReachable: opened,
      upstreamConnected: false,
      mode: opened ? 'gateway-open-status-timeout' : 'render-direct-wss',
      reason: opened ? 'XIAOZHI_PROTOCOL_STATUS_TIMEOUT' : 'XIAOZHI_CONNECT_TIMEOUT'
    }), 7000);

    socket.once('open', () => {
      opened = true;
      try {
        socket.send(JSON.stringify({ type: 'hello', client: 'ai-office-provider-check', language: 'vi-VN' }));
        socket.send(JSON.stringify({ type: 'status' }));
      } catch {}
    });
    socket.on('message', data => {
      let msg: any = null;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (!msg || !['provider', 'status', 'hello'].includes(String(msg.type || ''))) return;
      const transportMode = String(msg.mode || (msg.upstreamConnected ? 'xiaozhi-websocket-relay' : 'browser-fallback-transport'));
      done({
        ...base,
        pass: true,
        gatewayReachable: true,
        upstreamConnected: Boolean(msg.upstreamConnected),
        fallbackReady: !msg.upstreamConnected,
        mode: transportMode,
        sessionIdReceived: Boolean(msg.sessionId || msg.session_id)
      });
    });
    socket.once('unexpected-response', (_req, response) => done({
      ...base, pass: false, gatewayReachable: false, upstreamConnected: false,
      mode: 'render-direct-wss', status: response.statusCode, reason: 'XIAOZHI_HANDSHAKE_REJECTED'
    }));
    socket.once('error', () => done({
      ...base, pass: false, gatewayReachable: false, upstreamConnected: false,
      mode: 'render-direct-wss', reason: 'XIAOZHI_CONNECTION_FAILED'
    }));
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
      voiceRenderVersion: '2.5',
      readinessSemantics: 'gateway-reachable-is-not-upstream-connected',
      missing: []
    }
  };

  if (probe === 'config') return json(res, 200, config);
  if (probe === 'gemini') return json(res, 200, { ...config, probe: { gemini: await probeGemini() } });
  if (probe === 'gemini-grounding') return json(res, 200, { ...config, probe: { geminiGrounding: await probeGeminiGrounding() } });
  if (probe === 'xiaozhi') return json(res, 200, { ...config, probe: { xiaozhi: await probeXiaozhi() } });
  if (probe === 'all') {
    const [gemini, geminiGrounding, xiaozhi] = await Promise.all([probeGemini(), probeGeminiGrounding(), probeXiaozhi()]);
    return json(res, 200, { ...config, probe: { gemini, geminiGrounding, xiaozhi } });
  }
  return json(res, 400, { error: 'INVALID_PROBE', allowed: ['config', 'gemini', 'gemini-grounding', 'xiaozhi', 'all'] });
}
