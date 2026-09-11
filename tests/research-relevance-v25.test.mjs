import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entryUrl = new URL('../api/research.ts', import.meta.url);
const v28Url = new URL('../api/research-v28.js', import.meta.url);
const v29Url = new URL('../api/research-v29.js', import.meta.url);
const v30Url = new URL('../api/research-v30.js', import.meta.url);
const proxyUrl = new URL('../api/proxy.ts', import.meta.url);
const entry = await readFile(entryUrl, 'utf8');
const v28 = await readFile(v28Url, 'utf8');
const v29 = await readFile(v29Url, 'utf8');
const v30 = await readFile(v30Url, 'utf8');
const proxy = await readFile(proxyUrl, 'utf8');
for (const url of [entryUrl,v28Url,v29Url,v30Url,proxyUrl]) {
  const syntax = spawnSync(process.execPath, ['--check', fileURLToPath(url)], { encoding:'utf8' });
  assert.equal(syntax.status, 0, `runtime syntax error: ${syntax.stderr || syntax.stdout}`);
}

assert.match(entry, /import v30 from '\.\/research-v30\.js'/, 'public research endpoint must route through v3.0 freshness entry');
assert.match(entry, /export default v30/, 'public research endpoint must export v3.0 handler');

assert.match(v28, /function relevance\(/, 'research fallback must score relevance');
assert.match(v28, /tools:\[\{google_search:\{\}\}\]/, 'native Gemini Google Search must remain tier 1');
assert.match(v28, /geminiRetrievedSynthesis\(/, 'retrieved web evidence must be synthesized by Gemini when native grounding is unavailable');
assert.match(v28, /INTERNAL_CONTEXT_IGNORED_WITHOUT_OPT_IN/, 'internal context must remain opt-in');

assert.match(v29, /function latestIntent\(/, 'v2.9 must identify latest/news intent');
assert.match(v29, /googleNews\(searchQuery\)/, 'latest queries must retrieve current Google News results');
assert.match(v29, /duckHtml\(searchQuery\)/, 'latest queries must retain current web search as secondary retrieval');
assert.ok(v29.includes('wikipedia\\.org$/i.test'), 'latest source policy must explicitly exclude Wikipedia domains');
assert.match(v29, /s\.kind==='news-search'\|\|s\.kind==='web-search'\|\|s\.kind==='scholarly'/, 'latest source policy must allow only fresh/search/scholarly classes');
assert.match(v29, /provider:'gemini-fresh-search-synthesis'/, 'latest quota fallback must stay Gemini synthesized');
assert.match(v29, /freshnessPolicy:'latest-only-v29'/, 'latest responses must expose freshness policy');
assert.match(v29, /NATIVE_GOOGLE_SEARCH_GROUNDING_UNAVAILABLE_USING_FRESH_PUBLIC_RETRIEVAL/, 'latest quota fallback must be auditable');
assert.match(v29, /if\(!latestIntent\(query\)\)return v28\(req,res\)/, 'non-latest queries must delegate to stable v2.8');
assert.doesNotMatch(v29, /wiki\(/, 'v2.9 latest policy layer must never retrieve Wikipedia');

assert.match(v30, /FRESH_HINTS=\['moi nhat','hom nay'/, 'v3.0 must use accent-insensitive fresh intent hints');
assert.match(v30, /function robustLatest\(/, 'v3.0 must expose robust freshness detection');
assert.match(v30, /query:`\$\{original\} news`/, 'v3.0 must force the stable ASCII freshness sentinel into v2.9');
assert.match(v30, /x-ai-office-freshness-entry/, 'v3.0 must expose a response marker for production QA');

assert.doesNotMatch(proxy, /\b(?:string|unknown|any)\b\s*[),]/, 'proxy runtime must not contain TypeScript parameter annotations that break the remote loader');
assert.doesNotMatch(proxy, /:\s*(?:string|unknown|any)\b/, 'proxy runtime must remain plain-JS parseable');
assert.match(proxy, /async function chief\(body\)/, 'proxy chief path must be plain JS compatible');
assert.match(proxy, /export default async function handler\(req, res\)/, 'proxy entry must be plain JS compatible');

console.log('research-relevance-v30: freshness entry + quota fallback + loader-compatible proxy PASS');
