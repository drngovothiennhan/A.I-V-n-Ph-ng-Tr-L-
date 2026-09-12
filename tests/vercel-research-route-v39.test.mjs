import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const vercel=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
const researchEntry=await readFile(new URL('../api/research.ts',import.meta.url),'utf8');
const researchGateway=await readFile(new URL('../api/research-gateway.ts',import.meta.url),'utf8');

const researchRewrite=(vercel.rewrites||[]).find(row=>row?.source==='/api/research');
assert.equal(researchRewrite?.destination,'/api/research-gateway','/api/research must route through the secure gateway');
assert.doesNotMatch(String(researchRewrite?.destination||''),/research-v2[89]/,'secure /api/research route must never pin a legacy v28/v29 implementation');
assert.match(researchGateway,/import research from '\.\/research\.ts'/,'secure research gateway must delegate to the stable research entrypoint');
assert.match(researchGateway,/function sameOriginRuntimeRequest\(req\)/,'research gateway must enforce same-origin request metadata');
assert.match(researchGateway,/AI_RUNTIME_SAME_ORIGIN_REQUIRED/,'research gateway must reject cross-site/direct-browser runtime calls before provider access');
assert.match(researchGateway,/providerCallMade:\s*false/,'rejected research requests must explicitly confirm no provider call was made');
assert.match(researchEntry,/import v31 from '\.\/research-v31\.js'/,'stable /api/research entrypoint must use research-v31');
assert.match(researchEntry,/export default v31/,'stable /api/research entrypoint must export v31');

console.log('vercel-research-route-v39: secure /api/research gateway preserves stable v31 entrypoint PASS');
