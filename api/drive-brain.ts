import dns from 'node:dns/promises';
import net from 'node:net';
import { sign as cryptoSign } from 'node:crypto';
import {
  DRIVE_BRAIN_REGISTRY,
  approvalStateForDriveScope,
  driveScopeMap
} from './_drive-registry.js';
import { parseOfficeBuffer } from './_office-ingest.js';

const ALLOWED_ACTIONS = new Set(['health', 'search', 'read', 'list']);
const PRODUCTION_SCOPES = new Set(DRIVE_BRAIN_REGISTRY.productionReadableScopes);
const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DOC = 'application/vnd.google-apps.document';
const GOOGLE_SHEET = 'application/vnd.google-apps.spreadsheet';
const GOOGLE_SLIDES = 'application/vnd.google-apps.presentation';
const GOOGLE_FOLDER = 'application/vnd.google-apps.folder';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const MAX_SERVICE_RESULTS = 120;
const SERVICE_SEARCH_TIMEOUT = 12000;

let serviceTokenCache = { token: '', expiresAt: 0 };
const folderScopeCache = new Map();

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
function normalize(input) {
  return clean(input, 24000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}
function semanticTerms(input) {
  return normalize(input).split(/[^a-z0-9]+/).filter(term => term.length > 2).slice(0, 12);
}
function unicodeSearchTerms(input) {
  return (clean(input, 1600).toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || [])
    .filter(term => term.length > 2)
    .slice(0, 6);
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

function bridgeConfigured() {
  return Boolean(process.env.DRIVE_BRAIN_BRIDGE_URL && process.env.DRIVE_BRAIN_TOKEN);
}
function parseServiceAccount() {
  const raw = clean(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '', 20000);
  if (!raw) return null;
  try {
    const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const data = JSON.parse(text);
    if (!data?.client_email || !data?.private_key) return null;
    return { clientEmail: clean(data.client_email, 320), privateKey: String(data.private_key) };
  } catch {
    return null;
  }
}
function serviceAccountConfigured() {
  return Boolean(parseServiceAccount());
}
function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}
async function serviceAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (serviceTokenCache.token && serviceTokenCache.expiresAt > now + 90) return serviceTokenCache.token;
  const account = parseServiceAccount();
  if (!account) throw new Error('SERVICE_ACCOUNT_NOT_CONFIGURED');
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: account.clientEmail,
    scope: DRIVE_READONLY_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const signature = cryptoSign('RSA-SHA256', Buffer.from(unsigned), account.privateKey).toString('base64url');
  const assertion = `${unsigned}.${signature}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`SERVICE_ACCOUNT_TOKEN_${response.status}`);
  const data = await response.json();
  if (!data?.access_token) throw new Error('SERVICE_ACCOUNT_TOKEN_MISSING');
  serviceTokenCache = { token: data.access_token, expiresAt: now + Math.max(300, Number(data.expires_in) || 3600) };
  return data.access_token;
}
async function driveFetch(path, token, options = {}) {
  const url = path.startsWith('https://') ? new URL(path) : new URL(`${DRIVE_API}${path}`);
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), authorization: `Bearer ${token}` },
    signal: options.signal || AbortSignal.timeout(SERVICE_SEARCH_TIMEOUT)
  });
  if (!response.ok) throw new Error(`DRIVE_API_${response.status}`);
  return response;
}
async function driveGetFile(fileId, token) {
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`);
  url.search = new URLSearchParams({
    fields: 'id,name,mimeType,modifiedTime,parents,webViewLink,size',
    supportsAllDrives: 'true'
  }).toString();
  return (await driveFetch(url.toString(), token)).json();
}
async function driveList(query, token, pageSize = 100) {
  const url = new URL(`${DRIVE_API}/files`);
  url.search = new URLSearchParams({
    q: query,
    pageSize: String(Math.min(100, Math.max(1, pageSize))),
    fields: 'files(id,name,mimeType,modifiedTime,parents,webViewLink,size)',
    orderBy: 'modifiedTime desc',
    spaces: 'drive',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true'
  }).toString();
  const data = await (await driveFetch(url.toString(), token)).json();
  return Array.isArray(data?.files) ? data.files : [];
}
async function resolveFolderScope(folderId, token, depth = 0) {
  if (!folderId || depth > 8) return '';
  if (folderScopeCache.has(folderId)) return folderScopeCache.get(folderId);
  for (const scope of DRIVE_BRAIN_REGISTRY.productionReadableScopes) {
    if (DRIVE_BRAIN_REGISTRY.scopes[scope] === folderId) {
      folderScopeCache.set(folderId, scope);
      return scope;
    }
  }
  if (folderId === DRIVE_BRAIN_REGISTRY.root.id) return '';
  try {
    const folder = await driveGetFile(folderId, token);
    for (const parent of folder?.parents || []) {
      const scope = await resolveFolderScope(parent, token, depth + 1);
      if (scope) {
        folderScopeCache.set(folderId, scope);
        return scope;
      }
    }
  } catch {}
  folderScopeCache.set(folderId, '');
  return '';
}
async function scopeForServiceFile(file, token) {
  for (const parent of file?.parents || []) {
    const scope = await resolveFolderScope(parent, token, 0);
    if (scope) return scope;
  }
  return '';
}
async function exportGoogleText(fileId, mimeType, token) {
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}/export`);
  url.search = new URLSearchParams({ mimeType }).toString();
  const response = await driveFetch(url.toString(), token, { signal: AbortSignal.timeout(12000) });
  return clean(await response.text(), 50000);
}
async function downloadBinary(fileId, token) {
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`);
  url.search = new URLSearchParams({ alt: 'media', supportsAllDrives: 'true' }).toString();
  const response = await driveFetch(url.toString(), token, { signal: AbortSignal.timeout(12000) });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 3 * 1024 * 1024) throw new Error('DRIVE_FILE_TOO_LARGE');
  return buffer;
}
async function serviceFileText(file, token) {
  try {
    if (file.mimeType === GOOGLE_DOC || file.mimeType === GOOGLE_SLIDES) {
      return await exportGoogleText(file.id, 'text/plain', token);
    }
    if (file.mimeType === GOOGLE_SHEET) {
      return await exportGoogleText(file.id, 'text/csv', token);
    }
    if (file.mimeType === DOCX) return parseOfficeBuffer('docx', await downloadBinary(file.id, token)).slice(0, 50000);
    if (file.mimeType === XLSX) return parseOfficeBuffer('xlsx', await downloadBinary(file.id, token)).slice(0, 50000);
    if (file.mimeType === PPTX) return parseOfficeBuffer('pptx', await downloadBinary(file.id, token)).slice(0, 50000);
    if (/^text\//i.test(file.mimeType || '') || /json|xml|csv|html/i.test(file.mimeType || '')) {
      return clean((await downloadBinary(file.id, token)).toString('utf8'), 50000);
    }
  } catch {}
  return '';
}
function serviceScore(query, source) {
  const terms = semanticTerms(query);
  const title = normalize(source?.title || '');
  const text = normalize(source?.text || '');
  let score = terms.reduce((n, term) => n + (title.includes(term) ? 4 : 0) + (text.includes(term) ? 1 : 0), 0);
  if (source?.scope === DRIVE_BRAIN_REGISTRY.approvalPolicy.groundTruthScope) score += 6;
  else if (source?.scope === '03_TEMPLATES') score += 2;
  else if (source?.scope === '04_SKILLS') score += 1;
  return score;
}
async function serviceSource(file, scope, token, includeText = true) {
  const text = includeText ? await serviceFileText(file, token) : '';
  return {
    kind: scope === '03_TEMPLATES' ? 'drive-template' : scope === '04_SKILLS' ? 'drive-skill' : 'drive-document',
    scope,
    source: `Drive API · ${scope}`,
    fileId: file.id,
    title: file.name || 'Tài liệu Drive',
    url: file.webViewLink || `https://drive.google.com/open?id=${encodeURIComponent(file.id)}`,
    mimeType: file.mimeType || '',
    modifiedTime: file.modifiedTime || '',
    approvalState: approvalStateForDriveScope(scope, ''),
    text
  };
}
function escapeDriveQuery(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
async function serviceSearch(payload, token) {
  const scopes = sanitizeScopes(payload.scopes);
  const limit = Math.min(20, Math.max(1, Number(payload.limit) || 8));
  const terms = unicodeSearchTerms(payload.query);
  const query = terms.length
    ? `trashed = false and (${terms.map(term => `fullText contains '${escapeDriveQuery(term)}'`).join(' or ')})`
    : 'trashed = false';
  const candidates = (await driveList(query, token, MAX_SERVICE_RESULTS)).filter(file => file.mimeType !== GOOGLE_FOLDER);
  const allowed = [];
  for (const file of candidates) {
    const scope = await scopeForServiceFile(file, token);
    if (!scope || !scopes.includes(scope)) continue;
    allowed.push({ file, scope });
    if (allowed.length >= Math.min(MAX_SERVICE_RESULTS, limit * 5)) break;
  }
  const sources = [];
  for (const item of allowed.slice(0, Math.max(limit * 3, 16))) {
    const source = await serviceSource(item.file, item.scope, token, true);
    source.score = serviceScore(payload.query, source);
    if (!payload.query || source.score > 0) sources.push(source);
  }
  sources.sort((a, b) => b.score - a.score || String(b.modifiedTime).localeCompare(String(a.modifiedTime)));
  return sources.slice(0, limit);
}
async function collectServiceFolder(folderId, scope, token, out, limit, depth = 0) {
  if (depth > 4 || out.length >= limit) return;
  const items = await driveList(`'${escapeDriveQuery(folderId)}' in parents and trashed = false`, token, Math.min(100, limit));
  for (const item of items) {
    if (out.length >= limit) break;
    if (item.mimeType === GOOGLE_FOLDER) await collectServiceFolder(item.id, scope, token, out, limit, depth + 1);
    else out.push({ file: item, scope });
  }
}
async function serviceList(payload, token) {
  const scopes = sanitizeScopes(payload.scopes);
  const limit = Math.min(20, Math.max(1, Number(payload.limit) || 8));
  const items = [];
  for (const scope of scopes) {
    const folderId = DRIVE_BRAIN_REGISTRY.scopes[scope];
    if (!folderId) continue;
    await collectServiceFolder(folderId, scope, token, items, limit, 0);
    if (items.length >= limit) break;
  }
  const sources = [];
  for (const item of items.slice(0, limit)) sources.push(await serviceSource(item.file, item.scope, token, false));
  return sources;
}
async function serviceRead(payload, token) {
  const fileId = clean(payload.fileId, 180);
  if (!fileId) throw new Error('FILE_ID_REQUIRED');
  const file = await driveGetFile(fileId, token);
  const scope = await scopeForServiceFile(file, token);
  if (!scope || !PRODUCTION_SCOPES.has(scope)) throw new Error('FILE_OUTSIDE_PRODUCTION_SCOPES');
  return serviceSource(file, scope, token, true);
}
async function callServiceAccount(action, body) {
  const token = await serviceAccessToken();
  if (action === 'health') {
    const root = await driveGetFile(DRIVE_BRAIN_REGISTRY.root.id, token);
    if (root?.mimeType !== GOOGLE_FOLDER) throw new Error('DRIVE_ROOT_NOT_FOLDER');
    return { configured: true, provider: 'google-drive-service-account', data: { health: 'ok' } };
  }
  if (action === 'search') return { configured: true, provider: 'google-drive-service-account', data: { sources: await serviceSearch(body, token) } };
  if (action === 'list') return { configured: true, provider: 'google-drive-service-account', data: { sources: await serviceList(body, token) } };
  if (action === 'read') return { configured: true, provider: 'google-drive-service-account', data: { source: await serviceRead(body, token) } };
  throw new Error('INVALID_ACTION');
}

async function callBridge(action, body) {
  const raw = process.env.DRIVE_BRAIN_BRIDGE_URL || '';
  const token = process.env.DRIVE_BRAIN_TOKEN || '';
  if (!raw || !token) return { configured: false, reason: !raw ? 'DRIVE_BRAIN_BRIDGE_URL_MISSING' : 'DRIVE_BRAIN_TOKEN_MISSING' };
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
    headers: { 'content-type': 'application/json', 'user-agent': 'AI-Office-Drive-Brain/2.5' },
    body: JSON.stringify(payload),
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`BRIDGE_${response.status}`);
  const data = await response.json();
  if (data?.ok === false) throw new Error(clean(data?.error, 120) || 'BRIDGE_REJECTED');
  return { configured: true, provider: 'google-drive-bridge', data };
}
async function callDriveProvider(action, body) {
  const failures = [];
  if (bridgeConfigured()) {
    try { return await callBridge(action, body); }
    catch (error) { failures.push(`bridge:${clean(error?.message, 90)}`); }
  }
  if (serviceAccountConfigured()) {
    try { return await callServiceAccount(action, body); }
    catch (error) { failures.push(`service-account:${clean(error?.message, 90)}`); }
  }
  if (!bridgeConfigured() && !serviceAccountConfigured()) {
    return {
      configured: false,
      reason: 'DRIVE_RUNTIME_CREDENTIALS_MISSING',
      alternatives: [
        ['DRIVE_BRAIN_BRIDGE_URL', 'DRIVE_BRAIN_TOKEN'],
        ['GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON']
      ]
    };
  }
  throw new Error(failures.join('|') || 'DRIVE_RUNTIME_FAILED');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  const action = clean(req.body?.action, 40).toLowerCase() || 'health';
  if (!ALLOWED_ACTIONS.has(action)) return json(res, 400, { error: 'INVALID_ACTION', allowed: [...ALLOWED_ACTIONS] });
  const scopes = sanitizeScopes(req.body?.scopes);
  try {
    const result = await callDriveProvider(action, {
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
        alternatives: result.alternatives || [],
        required: ['Bridge URL + token OR readonly Service Account JSON']
      });
    }
    const data = result.data || {};
    if (action === 'health') {
      return json(res, 200, {
        configured: true,
        live: true,
        provider: result.provider,
        registryVersion: DRIVE_BRAIN_REGISTRY.version,
        rootId: DRIVE_BRAIN_REGISTRY.root.id,
        scopes: [...DRIVE_BRAIN_REGISTRY.productionReadableScopes],
        approvalPolicy: DRIVE_BRAIN_REGISTRY.approvalPolicy,
        bridgeHealth: data?.health || 'ok',
        readonly: result.provider === 'google-drive-service-account'
      });
    }
    if (action === 'search' || action === 'list') {
      const sources = sanitizeSources(data);
      return json(res, 200, {
        configured: true,
        live: true,
        provider: result.provider,
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
        provider: result.provider,
        source: sources[0] || null
      });
    }
    return json(res, 400, { error: 'INVALID_ACTION' });
  } catch (error) {
    console.error('drive_brain_v25_error', { action, message: String(error?.message || error).slice(0, 220) });
    return json(res, 502, {
      configured: bridgeConfigured() || serviceAccountConfigured(),
      error: 'DRIVE_RUNTIME_FAILED'
    });
  }
}
