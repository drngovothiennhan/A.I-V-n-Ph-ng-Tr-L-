import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../api/proxy.ts',import.meta.url),'utf8');
const gateway=await readFile(new URL('../api/proxy-gateway.ts',import.meta.url),'utf8');
const vercel=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));

assert.match(source,/const CHIEF_TIMEOUT_MS = 12000;/,'chief provider timeout must be bounded to 12s');
assert.match(source,/function isTimeoutError\(error\)/,'timeout classification helper must exist');
assert.match(source,/if \(!isTimeoutError\(error\)\) throw error;/,'only provider timeout/abort errors may be converted to fallback');
assert.match(source,/chief_provider_timeout/,'timeout must leave an auditable warning without prompt content');
assert.match(source,/limitation: 'GEMINI_TIMEOUT_FALLBACK'/,'timeout fallback must be explicit to callers');
assert.match(source,/providerHealth: 'degraded-timeout'/,'timeout must report degraded provider health');
assert.match(source,/return res\.status\(200\)\.json\(await chief\(req\.body\)\)/,'chief timeout fallback must remain a successful operation response');
assert.doesNotMatch(source,/signal: AbortSignal\.timeout\(30000\)/,'legacy 30s chief timeout must be removed');
assert.doesNotMatch(source,/chief_provider_timeout[\s\S]{0,200}message\s*[:=]/,'timeout audit must not log user prompt/message');

assert.match(gateway,/import proxy from '\.\/proxy\.ts'/,'secure proxy gateway must delegate to the canonical proxy handler');
assert.match(gateway,/req\.method !== 'POST'/,'proxy gateway must reject non-POST requests');
assert.match(gateway,/application\/json/,'proxy gateway must require JSON requests');
assert.match(gateway,/function sameOriginRuntimeRequest\(req\)/,'proxy gateway must enforce same-origin request metadata');
for(const marker of ['x-forwarded-host','referer','sec-fetch-site','sec-fetch-mode','sec-fetch-dest']){
  assert.ok(gateway.includes(marker),`proxy gateway must inspect ${marker}`);
}
assert.match(gateway,/site && site !== 'same-origin'/,'cross-site runtime requests must be rejected');
assert.match(gateway,/AI_RUNTIME_SAME_ORIGIN_REQUIRED/,'proxy gateway must reject cross-site/direct-browser runtime calls before execution');
assert.match(gateway,/providerCallMade:\s*false/,'rejected proxy requests must explicitly confirm no provider call was made');
const guardIndex=gateway.indexOf('sameOriginRuntimeRequest(req)');
const delegateIndex=gateway.lastIndexOf('proxy(req, res)');
assert.ok(guardIndex>=0&&delegateIndex>guardIndex,'same-origin guard must run before canonical proxy execution');
const proxyRewrite=(vercel.rewrites||[]).find(row=>row?.source==='/api/proxy');
assert.equal(proxyRewrite?.destination,'/api/proxy-gateway','production /api/proxy must route through the secure runtime gateway');

console.log('proxy-chief-resilience-v37: bounded timeout + honest fallback + same-origin runtime gateway PASS');
