import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/research-safety-guard-v263.js', import.meta.url), 'utf8');
const release = await readFile(new URL('../src/release-v193.js', import.meta.url), 'utf8');

assert.match(source,/2\.6\.3-client-research-safety-guard/);
assert.match(source,/function\s+officialIntent\s*\(/,'official intent detection must exist');
assert.match(source,/function\s+coverage\s*\(/,'source coverage gate must exist');
assert.match(source,/policy\?\.mode==='medical_question'/,'medical questions must be high-stakes guarded');
assert.match(source,/official&&!grounded\)return officialSource\(source\)/,'non-grounded official answers must require official source');
assert.match(source,/medical&&!grounded\)return trustedMedical\(source\)/,'non-grounded medical answers must require trusted medical source');
assert.match(source,/Tôi chưa có nguồn chính thức đủ liên quan/,'official fail-safe message must exist');
assert.match(source,/Tôi chưa có nguồn y khoa đủ liên quan/,'medical fail-safe message must exist');
assert.match(source,/provider:'client-safety-guard'/,'rejected endpoint answer must be replaced by client safety response');
assert.match(release,/research-safety-guard-v263\.js\?v=263/,'release must activate the guard');

console.log('research-safety-guard-v263: official/medical client hotfix contract PASS');
