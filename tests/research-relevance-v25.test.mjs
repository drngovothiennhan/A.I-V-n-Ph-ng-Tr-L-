import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const v28Url = new URL('../api/research-v28.js', import.meta.url);
const v29Url = new URL('../api/research-v29.js', import.meta.url);
const v28 = await readFile(v28Url, 'utf8');
const v29 = await readFile(v29Url, 'utf8');
for (const url of [v28Url,v29Url]) {
  const syntax = spawnSync(process.execPath, ['--check', fileURLToPath(url)], { encoding:'utf8' });
  assert.equal(syntax.status, 0, `research syntax error: ${syntax.stderr || syntax.stdout}`);
}

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

console.log('research-relevance-v29: latest-only freshness + Gemini synthesis PASS');
