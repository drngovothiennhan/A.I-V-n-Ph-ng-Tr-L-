import dns from 'node:dns/promises';
import net from 'node:net';
import {
  DRIVE_BRAIN_REGISTRY,
  approvalStateForDriveScope,
  driveScopeMap
} from './_drive-registry.js';

const ALLOWED_ACTIONS = new Set(['health', 'search', 'read', 'list']);
const PRODUCTION_SCOPES = new Set(DRIVE_BRAIN_REGISTRY.productionReadableScopes);

function json(res, status, body) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  return res.status(status).json(body);
}
function clean(input, max = 12000) {
  return String(input ?? '').replace(/\0/g, '').trim().slice(0, max);
}
function stripMarkup(input) {
  return String(input ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
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
async function publicHttpsUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('HTTPS_REQUIRED');
  if (url.username || url.password) throw new Error('URL_CREDENTIALS_FORBIDDEN');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) throw new Error('PRIVATE_HOST_FORBIDDEN');
  const answers = await dns.lookup(host, { all: true, verbatim: true });
  if (!answers.length || answers.some(item => isPrivateIp(item.address))) throw new Error('PRIVATE_IP_FORBIDDEN');
  return url;
}
function sanitizeScopes(input) {
  const requested = Array.isArray(input) ? input : [];
  const names = requested
    .map(String)
    .filter(name => PRODUCTION_SCOPES.has(name))
    .slice(0, DRIVE_BRAIN_REGISTRY.productionReadableScopes.length);
  return names.length ? names : [...DRIVE_BRAIN_REGISTRY.defaultSearchScopes];
}
function sanitizeSources(data) {
  return (Array.isArray(data?.sources) ? data.sources : [])
    .slice(0, 20)
    .map(source => {
      const scope = clean(source?.scope, 40);
      if (!PRODUCTION_SCOPES.has(scope)) return null;
      return {
        kind: clean(source?.kind, 80) || 'drive',
        scope,
        source: clean(source?.source, 220) || `Drive · ${clean(source?.title, 180)}`,
        title: clean(source?.title, 220) || 'Tài liệu Drive',
        url: clean(source?.url, 2048),
        domain: 'drive.google.com',
        text: stripMarkup(source?.text || source?.snippet || '').slice(0, 20000),
        approvalState: approvalStateForDriveScope(scope, source?.approvalState),
        provenance: {
          fileId: clean(source?.fileId || source?.id, 180),
          scope,
          modifiedTime: clean(source?.modifiedTime, 80),
          revision: clean(source?.revision, 180),
          mimeType: clean(source?.mimeType, 180)
        }
      };
    })
    .filter(Boolean)
    .filter(source => source.title || source.text);
}
async function callBridge(action, body) {
  const raw = process.env.DRIVE_BRAIN_BRIDGE_URL || '';
  const token = process.env.DRIVE_BRAIN_TOKEN || '';
  if (!raw || !token) {
    return {
      configured: false,
      reason: !raw ? 'DRIVE_BRAIN_BRIDGE_URL_MISSING' : 'DRIVE_BRAIN_TOKEN_MISSING'
    };
  }
  const url = await publicHttpsUrl(raw);
  const payload = {
    token,
    action,
    rootId: DRIVE_BRAIN_REGISTRY.root.id,
    scopes: driveScopeMap(body.scopes),
    query: clean(body.query, 1600),
    fileId: clean(body.fileId, 180),
    limit: Math.min(20, Math.max(1, Number(body.limit) || 8))
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'AI-Office-Drive-Brain/2.4' },
    body: JSON.stringify(payload),
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`BRIDGE_${response.status}`);
  const data = await response.json();
  if (data?.ok === false) throw new Error(clean(data?.error, 120) || 'BRIDGE_REJECTED');
  return { configured: true, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  const action = clean(req.body?.action, 40).toLowerCase() || 'health';
  if (!ALLOWED_ACTIONS.has(action)) {
    return json(res, 400, { error: 'INVALID_ACTION', allowed: [...ALLOWED_ACTIONS] });
  }
  const scopes = sanitizeScopes(req.body?.scopes);
  try {
    const result = await callBridge(action, {
      scopes,
      query: req.body?.query,
      fileId: req.body?.fileId,
      limit: req.body?.limit
    });
    if (!result.configured) {
      return json(res, 200, {
        configured: false,
        live: true,
        registryVersion: DRIVE_BRAIN_REGISTRY.version,
        rootId: DRIVE_BRAIN_REGISTRY.root.id,
        scopes,
        approvalPolicy: DRIVE_BRAIN_REGISTRY.approvalPolicy,
        reason: result.reason,
        required: ['DRIVE_BRAIN_BRIDGE_URL', 'DRIVE_BRAIN_TOKEN']
      });
    }
    const data = result.data || {};
    if (action === 'health') {
      return json(res, 200, {
        configured: true,
        live: true,
        provider: 'google-drive-bridge',
        registryVersion: DRIVE_BRAIN_REGISTRY.version,
        rootId: DRIVE_BRAIN_REGISTRY.root.id,
        scopes: [...DRIVE_BRAIN_REGISTRY.productionReadableScopes],
        approvalPolicy: DRIVE_BRAIN_REGISTRY.approvalPolicy,
        bridgeHealth: data?.health || 'ok'
      });
    }
    if (action === 'search' || action === 'list') {
      const sources = sanitizeSources(data);
      return json(res, 200, {
        configured: true,
        live: true,
        provider: 'google-drive-bridge',
        sources,
        count: sources.length,
        approvedCount: sources.filter(source => source.approvalState === 'approved').length
      });
    }
    if (action === 'read') {
      const sources = sanitizeSources({ sources: data?.source ? [data.source] : (data?.sources || []) });
      return json(res, 200, {
        configured: true,
        live: true,
        provider: 'google-drive-bridge',
        source: sources[0] || null
      });
    }
    return json(res, 400, { error: 'INVALID_ACTION' });
  } catch (error) {
    console.error('drive_brain_v24_error', {
      action,
      message: String(error?.message || error).slice(0, 220)
    });
    return json(res, 502, {
      configured: Boolean(process.env.DRIVE_BRAIN_BRIDGE_URL && process.env.DRIVE_BRAIN_TOKEN),
      error: 'DRIVE_BRIDGE_FAILED'
    });
  }
}
