import health from '../api/health.ts';
import providerCheck from '../api/provider-check.ts';
import selftest from '../api/selftest.ts';
import healthLegacy from '../api/health-legacy-retired.ts';
import researchLegacy from '../api/research-legacy-retired.ts';
import driveBrain from '../api/drive-brain-gateway.ts';
import research from '../api/research-gateway.ts';
import proxy from '../api/proxy-gateway.ts';
import image from '../api/image-gateway.ts';
import ingest from '../api/ingest-gateway.ts';

const handlers = new Map([
  ['/api/health', health],
  ['/api/provider-check', providerCheck],
  ['/api/selftest', selftest],
  ['/api/health-v17', healthLegacy],
  ['/api/ws-xiaozhi', researchLegacy],
  ['/api/drive-brain', driveBrain],
  ['/api/research', research],
  ['/api/research-v28', researchLegacy],
  ['/api/research-v29', researchLegacy],
  ['/api/research-v30', researchLegacy],
  ['/api/research-v31', researchLegacy],
  ['/api/proxy', proxy],
  ['/api/image', image],
  ['/api/ingest', ingest]
]);

async function readBody(request: Request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try { return await request.json(); } catch { return undefined; }
  }
  try { return await request.text(); } catch { return undefined; }
}

function makeResponseAdapter() {
  let statusCode = 200;
  const headers = new Headers();
  let response: Response | null = null;
  const finish = (body?: BodyInit | null) => {
    if (!response) response = new Response(body ?? null, { status: statusCode, headers });
    return adapter;
  };
  const adapter: any = {
    setHeader(name: string, value: any) {
      if (Array.isArray(value)) headers.set(name, value.join(', '));
      else headers.set(name, String(value));
      return adapter;
    },
    getHeader(name: string) { return headers.get(name); },
    status(code: number) { statusCode = Number(code) || 200; return adapter; },
    json(value: any) {
      if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
      return finish(JSON.stringify(value));
    },
    send(value: any) {
      if (value == null) return finish(null);
      if (typeof value === 'object' && !(value instanceof Uint8Array) && !(value instanceof ArrayBuffer)) {
        if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
        return finish(JSON.stringify(value));
      }
      return finish(value);
    },
    end(value?: any) { return finish(value ?? null); },
    get response() { return response; }
  };
  return adapter;
}

async function invoke(handler: any, request: Request) {
  const url = new URL(request.url);
  const req: any = {
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    query: Object.fromEntries(url.searchParams.entries()),
    body: await readBody(request)
  };
  const res = makeResponseAdapter();
  try {
    const returned = await handler(req, res);
    if (res.response) return res.response;
    if (returned instanceof Response) return returned;
    return Response.json({ error: 'HANDLER_DID_NOT_COMPLETE' }, { status: 500 });
  } catch (error: any) {
    console.error('office_api_unhandled', { path: url.pathname, message: String(error?.message || error).slice(0, 240) });
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500, headers: { 'cache-control': 'no-store' } });
  }
}

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/healthz') {
      return Response.json({ ok: true, service: 'ai-office-neon-api', release: 'cutover-20260914' }, { headers: { 'cache-control': 'no-store' } });
    }
    const handler = handlers.get(url.pathname);
    if (!handler) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    return invoke(handler, request);
  }
};
