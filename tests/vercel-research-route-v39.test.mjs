import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import retiredResearch from '../api/research-legacy-retired.ts';

const vercel=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
const researchEntry=await readFile(new URL('../api/research.ts',import.meta.url),'utf8');
const researchGateway=await readFile(new URL('../api/research-gateway.ts',import.meta.url),'utf8');
const v29=await readFile(new URL('../api/research-v29.js',import.meta.url),'utf8');
const v30=await readFile(new URL('../api/research-v30.js',import.meta.url),'utf8');
const v31=await readFile(new URL('../api/research-v31.js',import.meta.url),'utf8');

const researchRewrite=(vercel.rewrites||[]).find(row=>row?.source==='/api/research');
assert.equal(researchRewrite?.destination,'/api/research-gateway','/api/research must route through the secure gateway');
assert.doesNotMatch(String(researchRewrite?.destination||''),/research-v2[89]/,'secure /api/research route must never pin a legacy v28/v29 implementation');
assert.match(researchGateway,/import research from '\.\/research\.ts'/,'secure research gateway must delegate to the stable research entrypoint');
assert.match(researchGateway,/function sameOriginRuntimeRequest\(req\)/,'research gateway must enforce same-origin request metadata');
assert.match(researchGateway,/AI_RUNTIME_SAME_ORIGIN_REQUIRED/,'research gateway must reject cross-site/direct-browser runtime calls before provider access');
assert.match(researchGateway,/providerCallMade:\s*false/,'rejected research requests must explicitly confirm no provider call was made');
assert.match(researchEntry,/import v31 from '\.\/research-v31\.js'/,'stable /api/research entrypoint must use research-v31');
assert.match(researchEntry,/export default v31/,'stable /api/research entrypoint must export v31');

const retiredVersions=['v28','v29','v30','v31'];
for(const version of retiredVersions){
  const row=(vercel.rewrites||[]).find(item=>item?.source===`/api/research-${version}`);
  assert.equal(row?.destination,'/api/research-legacy-retired',`public /api/research-${version} must fail closed through retired route`);
}

assert.match(v31,/import v30 from '\.\/research-v30\.js'/,'v31 must keep internal v30 delegation');
assert.match(v30,/import v29 from '\.\/research-v29\.js'/,'v30 must keep internal v29 delegation');
assert.match(v29,/import v28 from '\.\/research-v28\.js'/,'v29 must keep internal v28 delegation');

const response={
  statusCode:200,
  headers:{},
  body:null,
  setHeader(name,value){this.headers[String(name).toLowerCase()]=String(value)},
  status(code){this.statusCode=code;return this},
  json(body){this.body=body;return body}
};
await retiredResearch({method:'POST'},response);
assert.equal(response.statusCode,410,'retired versioned research route must return 410');
assert.equal(response.body?.error,'LEGACY_RESEARCH_ROUTE_RETIRED');
assert.equal(response.body?.canonicalEndpoint,'/api/research');
assert.equal(response.body?.providerCallMade,false,'retired route must never invoke provider work');

console.log('vercel-research-route-v39: secure /api/research keeps v31 while public versioned routes fail closed PASS');
