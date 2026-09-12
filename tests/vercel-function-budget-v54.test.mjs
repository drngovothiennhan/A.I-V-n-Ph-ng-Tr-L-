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

const voiceRewrite=(vercel.rewrites||[]).find(row=>row?.source==='/api/ws-xiaozhi');
assert.equal(voiceRewrite?.destination,'/api/research-legacy-retired?kind=voice','retired Vercel voice route must reuse an existing retired function');
assert.match(retired,/kind === 'voice'/,'shared retired function must distinguish the legacy voice route');
assert.match(retired,/LEGACY_VERCEL_WS_BRIDGE_RETIRED/,'shared retired function must preserve voice retirement semantics');
assert.match(retired,/LEGACY_RESEARCH_ROUTE_RETIRED/,'shared retired function must preserve research retirement semantics');

console.log(`vercel-function-budget-v54: ${builds.length}/12 public serverless functions PASS`);
