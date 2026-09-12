const OWNER = 'drngovothiennhan';
const REPO = 'A.I-V-n-Ph-ng-Tr-L-';
const ALLOWED_PREFIXES = ['src/', 'public/'];
const RELEASE = '1.9.3';

function sourceRef() {
  const ref = String(process.env.AI_OFFICE_SOURCE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
  return /^[0-9a-f]{40}$/i.test(ref) ? ref : 'main';
}

function contentType(path) {
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.webmanifest')) return 'application/manifest+json; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

function normalize(raw) {
  const path = String(raw || '').replace(/^\/+/, '');
  if (!path || path.includes('..') || !ALLOWED_PREFIXES.some((p) => path.startsWith(p))) throw new Error('ASSET_PATH_FORBIDDEN');
  return path;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const path = normalize(req.query.path);
    const ref = sourceRef();
    const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${path}`;
    const upstream = await fetch(url, {
      headers: { 'user-agent': `AI-Office-Asset-Gateway/${RELEASE}` },
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return res.status(upstream.status).send('Asset not found');
    const data = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('content-type', contentType(path));
    res.setHeader('cache-control', path.endsWith('sw.js') ? 'public, max-age=0, must-revalidate' : 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-ai-office-asset-source-ref', ref);
    if (path.endsWith('sw.js')) res.setHeader('service-worker-allowed', '/');
    return res.status(200).send(data);
  } catch (error) {
    console.error('asset_gateway_error', { message: String(error?.message || error).slice(0, 220) });
    return res.status(400).json({ error: 'INVALID_ASSET' });
  }
}
