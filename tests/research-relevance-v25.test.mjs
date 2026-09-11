import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entryUrl = new URL('../api/research.ts', import.meta.url);
const v28Url = new URL('../api/research-v28.js', import.meta.url);
const v29Url = new URL('../api/research-v29.js', import.meta.url);
const v30Url = new URL('../api/research-v30.js', import.meta.url);
const v31Url = new URL('../api/research-v31.js', import.meta.url);
const proxyUrl = new URL('../api/proxy.ts', import.meta.url);
const entry = await readFile(entryUrl, 'utf8');
const v28 = await readFile(v28Url, 'utf8');
const v29 = await readFile(v29Url, 'utf8');
const v30 = await readFile(v30Url, 'utf8');
const v31 = await readFile(v31Url, 'utf8');
const proxy = await readFile(proxyUrl, 'utf8');
for (const url of [entryUrl,v28Url,v29Url,v30Url,v31Url,proxyUrl]) {
  const syntax = spawnSync(process.execPath, ['--check', fileURLToPath(url)], { encoding:'utf8' });
  assert.equal(syntax.status, 0, `runtime syntax error: ${syntax.stderr || syntax.stdout}`);
}

assert.match(entry, /import v31 from '\.\/research-v31\.js'/, 'public research endpoint must route through v3.1 freshness entry');
assert.match(entry, /export default v31/, 'public research endpoint must export v3.1 handler');

assert.match(v28, /function relevance\(/, 'research fallback must score relevance');
assert.match(v28, /tools:\[\{google_search:\{\}\}\]/, 'native Gemini Google Search must remain tier 1');
assert.match(v28, /geminiRetrievedSynthesis\(/, 'retrieved web evidence must be synthesized by Gemini when native grounding is unavailable');
assert.match(v28, /INTERNAL_CONTEXT_IGNORED_WITHOUT_OPT_IN/, 'internal context must remain opt-in');

assert.match(v29, /function latestIntent\(/, 'v2.9 must identify latest/news intent');
assert.match(v29, /googleNews\(searchQuery\)/, 'latest queries must retrieve current Google News results');
assert.ok(v29.includes('wikipedia\\.org$/i.test'), 'latest source policy must explicitly exclude Wikipedia domains');
assert.doesNotMatch(v29, /wiki\(/, 'v2.9 latest policy layer must never retrieve Wikipedia');

assert.match(v30, /FRESH_HINTS=\['moi nhat','hom nay'/, 'v3.0 must use accent-insensitive fresh intent hints');
assert.match(v30, /function robustLatest\(/, 'v3.0 must expose robust freshness detection');
assert.match(v30, /query:`\$\{original\} news`/, 'v3.0 must force the stable ASCII freshness sentinel into v2.9');

assert.match(v31, /VERSION='3\.1\.0-timeout-resilient-freshness'/, 'v3.1 must expose timeout-resilient version');
assert.match(v31, /googleNews\(original\)/, 'v3.1 must retrieve fresh Google News evidence');
assert.match(v31, /timeout:14000,maxOutputTokens:1200/, 'v3.1 synthesis must have a bounded latency budget');
assert.match(v31, /fresh-news-extractive-v31/, 'v3.1 must return deterministic fresh evidence instead of HTTP 502 when Gemini synthesis times out');
assert.match(v31, /GEMINI_SYNTHESIS_TIMEOUT_OR_UNAVAILABLE/, 'v3.1 timeout fallback must be auditable');
assert.match(v31, /provider:'gemini-fresh-search-synthesis-v31'/, 'v3.1 must keep Gemini as preferred fresh synthesis provider');
assert.match(v31, /freshnessPolicy:'latest-only-v31'/, 'v3.1 fresh responses must expose freshness policy');
assert.doesNotMatch(v31, /wiki\(/, 'v3.1 must not retrieve Wikipedia for fresh queries');

assert.doesNotMatch(proxy, /\b(?:string|unknown|any)\b\s*[),]/, 'proxy runtime must not contain TypeScript parameter annotations that break the remote loader');
assert.doesNotMatch(proxy, /:\s*(?:string|unknown|any)\b/, 'proxy runtime must remain plain-JS parseable');
assert.match(proxy, /async function chief\(body\)/, 'proxy chief path must be plain JS compatible');
assert.match(proxy, /export default async function handler\(req, res\)/, 'proxy entry must be plain JS compatible');

console.log('research-relevance-v31: bounded fresh retrieval + deterministic timeout fallback + loader-compatible proxy PASS');
