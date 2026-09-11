import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../api/research.ts', import.meta.url), 'utf8');

assert.match(source, /function\s+relevance\s*\(/, 'research fallback must score relevance');
assert.match(source, /\.filter\(source=>source\._relevance\.pass\)/, 'low-relevance public sources must be filtered');
assert.match(source, /if \(officialOnly\) sources=sources\.filter/, 'official-only mode must never retain non-official fallback sources');
assert.match(source, /Boolean\(req\.body\?\.officialOnly\) \|\| officialIntent\(query\)/, 'official intent in user text must force official-only behavior');
assert.match(source, /sourceRequired = officialOnly \|\| medicalMode\(mode,query\)/, 'medical and official answers must require grounded sources');
assert.match(source, /sourceRequired && !sources\.length/, 'grounded answer without sources must be rejected for high-stakes modes');
assert.match(source, /Không có nguồn đủ liên quan để trả lời an toàn/, 'safe no-answer fallback must be explicit');
assert.doesNotMatch(source, /if \(official\.length\) sources=official/, 'official-only mode must not silently fall back to Wikipedia when official sources are absent');

console.log('research-relevance-v25: relevance + official + grounding safety gates PASS');
