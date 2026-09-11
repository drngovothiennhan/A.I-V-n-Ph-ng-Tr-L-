import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../api/proxy.ts',import.meta.url),'utf8');

assert.match(source,/const CHIEF_TIMEOUT_MS = 12000;/,'chief provider timeout must be bounded to 12s');
assert.match(source,/function isTimeoutError\(error\)/,'timeout classification helper must exist');
assert.match(source,/if \(!isTimeoutError\(error\)\) throw error;/,'only provider timeout/abort errors may be converted to fallback');
assert.match(source,/chief_provider_timeout/,'timeout must leave an auditable warning without prompt content');
assert.match(source,/limitation: 'GEMINI_TIMEOUT_FALLBACK'/,'timeout fallback must be explicit to callers');
assert.match(source,/providerHealth: 'degraded-timeout'/,'timeout must report degraded provider health');
assert.match(source,/return res\.status\(200\)\.json\(await chief\(req\.body\)\)/,'chief timeout fallback must remain a successful operation response');
assert.doesNotMatch(source,/signal: AbortSignal\.timeout\(30000\)/,'legacy 30s chief timeout must be removed');
assert.doesNotMatch(source,/chief_provider_timeout[\s\S]{0,200}message\s*[:=]/,'timeout audit must not log user prompt/message');

console.log('proxy-chief-resilience-v37: bounded provider timeout + honest local fallback PASS');
