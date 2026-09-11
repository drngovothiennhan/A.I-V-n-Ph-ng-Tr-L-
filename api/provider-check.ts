const RELEASE = '1.9.3-autonomous-office-orchestrator';
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const DEFAULT_XIAOZHI_WS = 'wss://ai-office-xiaozhi-gateway.onrender.com/xiaozhi/v1/';

function geminiModel() {
  return process.env.AI_OFFICE_GEMINI_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}
function xiaozhiUrl() {
  return process.env.XIAOZHI_WS_URL || process.env.XIAOZHI_ENDPOINT || DEFAULT_XIAOZHI_WS;
}
function json(res, status, body) {
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
  const data = await response.json();
  const candidate = data?.candidates?.[0] || {};
  const text = candidate?.content?.parts?.map((p) => p?.text || '').join('').trim() || '';
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
  const data = await response.json();
  const candidate = data?.candidates?.[0] || {};
  const text = candidate?.content?.parts?.map((p) => p?.text || '').join('').trim() || '';
  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  const domains = chunks.map((chunk) => {
    try { return new URL(chunk?.web?.uri || '').hostname.toLowerCase(); } catch { return ''; }
  }).filter(Boolean);
  return {
    pass: Boolean(text && chunks.length), configured: true, model,
    responseReceived: Boolean(text), groundingSourceCount: chunks.length,
    searchQueries: candidate?.groundingMetadata?.webSearchQueries || [], domains: domains.slice(0,8),
    finishReason: candidate?.finishReason || null, promptBlocked: Boolean(data?.promptFeedback?.blockReason),
    reason: text && chunks.length ? null : 'GEMINI_GROUNDING_NO_SOURCES'
  };
}

async function probeXiaozhi() {
  const raw = xiaozhiUrl();
  const protocolVersion = process.env.XIAOZHI_PROTOCOL_VERSION || '1';
  let target;
  try {
    target = new URL(raw);
    if (!['ws:', 'wss:'].includes(target.protocol)) throw new Error('protocol');
  } catch {
    return { pass: false, configured: true, reason: 'XIAOZHI_WS_URL_INVALID', protocolVersion, mode: 'render-direct-wss' };
  }
  const healthProtocol = target.protocol === 'wss:' ? 'https:' : 'http:';
  const healthUrl = `${healthProtocol}//${target.host}/health`;
  const base = {
    configured: true,
    secure: target.protocol === 'wss:',
    protocolVersion,
    endpoint: `${target.protocol}//${target.host}${target.pathname || '/xiaozhi/v1/'}`,
    healthEndpoint: healthUrl,
    mode: 'render-direct-wss',
    browserFallback: true
  };
  try {
    const response = await fetch(healthUrl, {
      headers: { 'user-agent': 'AI-Office-XiaoZhi-Probe/3.0' },
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) return { ...base, pass: false, gatewayReachable: false, upstreamConnected: false, fallbackReady: true, status: response.status, reason: 'XIAOZHI_HEALTH_REJECTED' };
    let data = {};
    try { data = await response.json(); } catch {}
    return {
      ...base,
      pass: true,
      gatewayReachable: true,
      upstreamConnected: Boolean(data?.upstreamConnected),
      fallbackReady: !data?.upstreamConnected,
      service: data?.service || null,
      gatewayRelease: data?.release || null,
      trustedOriginMode: Boolean(data?.trustedOriginMode),
      activeClients: Number.isFinite(Number(data?.activeClients)) ? Number(data.activeClients) : null
    };
  } catch {
    return { ...base, pass: false, gatewayReachable: false, upstreamConnected: false, fallbackReady: true, reason: 'XIAOZHI_HEALTH_UNREACHABLE' };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  const probe = String(req.query?.probe || 'config').toLowerCase();
  const source = (process.env.XIAOZHI_WS_URL || process.env.XIAOZHI_ENDPOINT) ? 'vercel-env' : 'render-direct-default';
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
      voiceRenderVersion: '3.0',
      readinessSemantics: 'https-health-probe-plus-browser-fallback',
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
