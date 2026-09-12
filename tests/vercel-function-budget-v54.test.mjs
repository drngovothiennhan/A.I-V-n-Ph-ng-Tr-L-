import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const retired = await readFile(new URL('../api/research-legacy-retired.ts', import.meta.url), 'utf8');

const builds = Array.isArray(vercel.builds) ? vercel.builds : [];
assert.ok(builds.length > 0, 'explicit public function build entries are required');
assert.ok(builds.length <= 12, `Hobby production must stay within 12 serverless functions; found ${builds.length}`);
const srcs = new Set(builds.map(row => row?.src));
for (const required of [
  'api/app.ts','api/asset.ts','api/drive-brain-gateway.ts','api/health.ts',
  'api/image-gateway.ts','api/ingest-gateway.ts','api/provider-check.ts',
  'api/proxy-gateway.ts','api/research-gateway.ts','api/selftest.ts'
]) assert.ok(srcs.has(required), `missing public function entry ${required}`);
for (const internalOnly of [
  'api/drive-brain.ts','api/proxy.ts','api/research.ts','api/research-v28.js','api/research-v29.js',
  'api/research-v30.js','api/research-v31.js','api/image.ts','api/ingest.ts','api/ws-xiaozhi.ts','api/health-v17.ts'
]) assert.equal(srcs.has(internalOnly), false, `${internalOnly} must be bundled/delegated, not emitted as a standalone function`);

assert.equal(vercel.rewrites, undefined, 'legacy builds must not rely on high-level rewrites for function routing');
assert.equal(vercel.headers, undefined, 'legacy routes own response security headers in this build mode');
assert.equal(vercel.cleanUrls, undefined, 'legacy routes must map extensionless public paths explicitly');
const routes = Array.isArray(vercel.routes) ? vercel.routes : [];
assert.ok(routes.length >= 19, 'explicit public route map is required for legacy builders');
const route = source => routes.find(row => row?.src === source);
const expected = new Map([
  ['/', '/api/app.ts'],
  ['/api/health', '/api/health.ts'],
  ['/api/provider-check', '/api/provider-check.ts'],
  ['/api/selftest', '/api/selftest.ts'],
  ['/api/health-v17', '/api/health-legacy-retired.ts'],
  ['/api/ws-xiaozhi', '/api/research-legacy-retired.ts?kind=voice'],
  ['/api/drive-brain', '/api/drive-brain-gateway.ts'],
  ['/api/research', '/api/research-gateway.ts'],
  ['/api/research-v28', '/api/research-legacy-retired.ts'],
  ['/api/research-v29', '/api/research-legacy-retired.ts'],
  ['/api/research-v30', '/api/research-legacy-retired.ts'],
  ['/api/research-v31', '/api/research-legacy-retired.ts'],
  ['/api/proxy', '/api/proxy-gateway.ts'],
  ['/api/image', '/api/image-gateway.ts'],
  ['/api/ingest', '/api/ingest-gateway.ts'],
  ['/manifest.webmanifest', '/api/asset.ts?path=public/manifest.webmanifest'],
  ['/sw.js', '/api/asset.ts?path=public/sw.js'],
  ['/icons/(.*)', '/api/asset.ts?path=public/icons/$1'],
  ['/src/(.*)', '/api/asset.ts?path=src/$1']
]);
for (const [source, destination] of expected) {
  const row = route(source);
  assert.equal(row?.dest, destination, `route ${source} must map to ${destination}`);
  assert.equal(row?.headers?.['X-Content-Type-Options'], 'nosniff', `${source} must keep security headers`);
  assert.equal(row?.headers?.['X-Frame-Options'], 'DENY', `${source} must keep frame protection`);
}
assert.equal(route('/sw.js')?.headers?.['Service-Worker-Allowed'], '/', 'service worker scope must remain explicit');
assert.match(route('/manifest.webmanifest')?.headers?.['Content-Type'] || '', /application\/manifest\+json/i, 'manifest content type must remain explicit');
assert.match(retired,/kind === 'voice'/,'shared retired function must distinguish the legacy voice route');
assert.match(retired,/LEGACY_VERCEL_WS_BRIDGE_RETIRED/,'shared retired function must preserve voice retirement semantics');
assert.match(retired,/LEGACY_RESEARCH_ROUTE_RETIRED/,'shared retired function must preserve research retirement semantics');

console.log(`vercel-function-budget-v55: ${builds.length}/12 functions + ${routes.length} explicit routes PASS`);
