import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const url = new URL('../api/research-v28.js', import.meta.url);
const source = await readFile(url, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', fileURLToPath(url)], { encoding:'utf8' });
assert.equal(syntax.status, 0, `research-v28 syntax error: ${syntax.stderr || syntax.stdout}`);

assert.match(source, /function relevance\(/, 'research fallback must score relevance');
assert.match(source, /\.filter\(source=>source\._relevance\.pass\)/, 'low-relevance public sources must be filtered');
assert.match(source, /if\(officialOnly\)sources=sources\.filter/, 'official-only mode must never retain non-official fallback sources');
assert.match(source, /Boolean\(req\.body\?\.officialOnly\)\|\|officialIntent\(query\)/, 'official intent in user text must force official-only behavior');
assert.match(source, /tools:\[\{google_search:\{\}\}\]/, 'native Gemini Google Search must remain tier 1');
assert.match(source, /googleNews\(query\)/, 'latest queries need current public retrieval fallback');
assert.match(source, /duckHtml\(searchQuery\)/, 'general public search fallback must not depend on Wikipedia alone');
assert.match(source, /geminiRetrievedSynthesis\(/, 'retrieved web evidence must be synthesized by Gemini when native grounding is unavailable');
assert.match(source, /provider:'gemini-public-search-synthesis'/, 'quota fallback must remain Gemini-first');
assert.match(source, /NATIVE_GOOGLE_SEARCH_GROUNDING_UNAVAILABLE_USING_PUBLIC_RETRIEVAL_GEMINI_SYNTHESIS/, 'quota fallback must be auditable');
assert.match(source, /INTERNAL_CONTEXT_IGNORED_WITHOUT_OPT_IN/, 'internal context must remain opt-in');
assert.match(source, /Không có nguồn đủ liên quan để trả lời an toàn/, 'safe no-answer fallback must be explicit');
assert.doesNotMatch(source, /if \(official\.length\) sources=official/, 'official-only mode must not silently fall back to Wikipedia when official sources are absent');

console.log('research-relevance-v28: native grounding + public retrieval + Gemini synthesis PASS');
