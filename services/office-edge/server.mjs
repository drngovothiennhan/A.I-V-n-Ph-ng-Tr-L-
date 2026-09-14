import http from 'node:http';
import app from '../../api/app.ts';
import asset from '../../api/asset.ts';

const PORT = Number(process.env.PORT || 10000);
const neonOrigin = String(process.env.NEON_API_ORIGIN || '').replace(/\/+$/, '');
const MAX_BODY = 25 * 1024 * 1024;

function responseAdapter(nodeRes) {
  let statusCode = 200;
  return {
    setHeader(name, value) { nodeRes.setHeader(name, value); return this; },
    status(code) { statusCode = Number(code) || 200; nodeRes.statusCode = statusCode; return this; },
    json(value) {
      if (!nodeRes.hasHeader('content-type')) nodeRes.setHeader('content-type', 'application/json; charset=utf-8');
      nodeRes.statusCode = statusCode;
      nodeRes.end(JSON.stringify(value));
      return this;
    },
    send(value) {
      nodeRes.statusCode = statusCode;
      if (value == null) nodeRes.end();
      else if (Buffer.isBuffer(value) || typeof value === 'string') nodeRes.end(value);
      else {
        if (!nodeRes.hasHeader('content-type')) nodeRes.setHeader('content-type', 'application/json; charset=utf-8');
        nodeRes.end(JSON.stringify(value));
      }
      return this;
    },
    end(value) { nodeRes.statusCode = statusCode; nodeRes.end(value); return this; }
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('BODY_TOO_LARGE'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function makeLegacyReq(req, url, body) {
  let parsed = undefined;
  const type = String(req.headers['content-type'] || '');
  if (body?.length) {
    if (type.includes('application/json')) {
      try { parsed = JSON.parse(body.toString('utf8')); } catch { parsed = undefined; }
    } else parsed = body.toString('utf8');
  }
  return {
    method: req.method,
    headers: req.headers,
    query: Object.fromEntries(url.searchParams.entries()),
    body: parsed
  };
}

async function proxyApi(req, res, url) {
  if (!neonOrigin) {
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ error: 'NEON_API_ORIGIN_NOT_CONFIGURED' }));
    return;
  }
  const body = await readBody(req);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null || ['host', 'content-length', 'connection'].includes(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }
  headers.set('x-forwarded-host', String(req.headers.host || ''));
  headers.set('x-forwarded-proto', 'https');
  const upstream = await fetch(`${neonOrigin}${url.pathname}${url.search}`, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(String(req.method)) ? undefined : body,
    redirect: 'manual',
    signal: AbortSignal.timeout(60000)
  });
  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (!['content-encoding', 'transfer-encoding', 'content-length', 'connection'].includes(key.toLowerCase())) res.setHeader(key, value);
  });
  res.setHeader('x-ai-office-edge', 'render-neon');
  const data = Buffer.from(await upstream.arrayBuffer());
  res.end(data);
}

async function handleLocal(req, res, url) {
  const adapter = responseAdapter(res);
  const body = await readBody(req);
  const legacyReq = makeLegacyReq(req, url, body);
  if (url.pathname === '/') return app(legacyReq, adapter);

  let path = '';
  if (url.pathname === '/manifest.webmanifest') path = 'public/manifest.webmanifest';
  else if (url.pathname === '/sw.js') path = 'public/sw.js';
  else if (url.pathname.startsWith('/icons/')) path = `public${url.pathname}`;
  else if (url.pathname.startsWith('/src/')) path = url.pathname.slice(1);
  if (path) {
    legacyReq.query = { path };
    return asset(legacyReq, adapter);
  }
  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'NOT_FOUND' }));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/edge-health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, service: 'ai-office-edge', neonApiConfigured: Boolean(neonOrigin) }));
      return;
    }
    if (url.pathname.startsWith('/api/')) return await proxyApi(req, res, url);
    return await handleLocal(req, res, url);
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    console.error('office_edge_error', { status, message: String(error?.message || error).slice(0, 240) });
    if (!res.headersSent) res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    if (!res.writableEnded) res.end(JSON.stringify({ error: status === 413 ? 'BODY_TOO_LARGE' : 'EDGE_INTERNAL_ERROR' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'ai_office_edge_ready', port: PORT, neonApiConfigured: Boolean(neonOrigin) }));
});
