import dns from 'node:dns/promises';
import net from 'node:net';
import { createArtifact } from './_artifact-engine.js';

const MAX_BODY = 256 * 1024;
const ALLOWED_OPS = new Set(['chief', 'web', 'artifact']);
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const DEFAULT_THINKING_LEVEL = 'medium';
const CHIEF_TIMEOUT_MS = 12000;

function geminiModel() {
  return process.env.AI_OFFICE_GEMINI_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168);
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:');
  }
  return true;
}

async function assertPublicUrl(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('UNSUPPORTED_PROTOCOL');
  if (url.username || url.password) throw new Error('URL_CREDENTIALS_FORBIDDEN');
  const host = url.hostname.toLowerCase();
  if (['localhost', '0.0.0.0'].includes(host) || host.endsWith('.local')) throw new Error('PRIVATE_HOST_FORBIDDEN');
  const answers = await dns.lookup(host, { all: true, verbatim: true });
  if (!answers.length || answers.some((a) => isPrivateIp(a.address))) throw new Error('PRIVATE_IP_FORBIDDEN');
  return url;
}

function cleanText(input, max = 12000) {
  return String(input ?? '').replace(/\0/g, '').slice(0, max);
}

function isTimeoutError(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || '').toLowerCase();
  return name === 'TimeoutError' || name === 'AbortError' || message.includes('timeout') || message.includes('timed out');
}

function chiefThinkingLevel(body) {
  const requested = String(body?.thinkingLevel || '').toLowerCase();
  if (['minimal', 'low', 'medium', 'high'].includes(requested)) return requested;
  return DEFAULT_THINKING_LEVEL;
}

async function chief(body) {
  const message = cleanText(body?.message, 24000);
  if (!message) return { reply: '' };
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { reply: '', provider: 'local', fallback: true, providerHealth: 'not-configured' };
  const model = geminiModel();
  const thinkingLevel = chiefThinkingLevel(body);
  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`);
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingLevel }
        }
      }),
      signal: AbortSignal.timeout(CHIEF_TIMEOUT_MS)
    });
  } catch (error) {
    if (!isTimeoutError(error)) throw error;
    console.warn('chief_provider_timeout', { provider: 'gemini', timeoutMs: CHIEF_TIMEOUT_MS, model, thinkingLevel });
    return {
      reply: '',
      provider: 'local',
      fallback: true,
      providerHealth: 'degraded-timeout',
      limitation: 'GEMINI_TIMEOUT_FALLBACK',
      timeoutMs: CHIEF_TIMEOUT_MS,
      model,
      thinkingLevel
    };
  }
  if (!response.ok) return {
    reply: '',
    provider: 'local',
    fallback: true,
    providerHealth: [401, 403, 429].includes(response.status) ? 'degraded' : 'upstream-error',
    upstreamStatus: response.status,
    model,
    thinkingLevel
  };
  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || '';
  return { reply, provider: 'gemini', fallback: false, providerHealth: 'healthy', model, thinkingLevel };
}

async function webRead(body) {
  const url = await assertPublicUrl(cleanText(body?.url, 2048));
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'AI-Office/1.9.3 (+https://ai-van-phong-tro-ly.vercel.app)' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!/text|json|xml|html/i.test(type)) throw new Error('UNSUPPORTED_CONTENT_TYPE');
  const raw = (await response.text()).slice(0, 250000);
  const text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30000);
  return { url: url.toString(), text, contentType: type };
}

async function artifact(body, res) {
  try {
    const result = await createArtifact(body);
    res.setHeader('content-type', result.mime);
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`);
    res.setHeader('x-ai-office-artifact-engine', 'v1.9.3-structured');
    return res.status(200).send(result.buffer);
  } catch (error) {
    if (error?.code === 'UNSUPPORTED_ARTIFACT_FORMAT') {
      return res.status(400).json({ error: 'UNSUPPORTED_ARTIFACT_FORMAT', supported: error.supported || ['docx', 'xlsx', 'pptx'] });
    }
    throw error;
  }
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const op = String(req.query.op || '');
  if (!ALLOWED_OPS.has(op)) return res.status(400).json({ error: 'INVALID_OP' });
  const size = Number(req.headers['content-length'] || 0);
  if (size > MAX_BODY) return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
  try {
    if (op === 'chief') return res.status(200).json(await chief(req.body));
    if (op === 'web') return res.status(200).json(await webRead(req.body));
    if (op === 'artifact') return artifact(req.body, res);
    return res.status(400).json({ error: 'INVALID_OP' });
  } catch (error) {
    console.error('proxy_error', { op, message: String(error?.message || error).slice(0, 300) });
    return res.status(502).json({ error: 'OPERATION_FAILED', op });
  }
}
