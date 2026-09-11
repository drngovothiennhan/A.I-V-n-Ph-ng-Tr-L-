import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = await readFile(new URL('../src/multisource-orchestrator-v26.js', import.meta.url), 'utf8');
const control = await readFile(new URL('../src/internal-source-control-v27.js', import.meta.url), 'utf8');
const research = await readFile(new URL('../api/research-v28.js', import.meta.url), 'utf8');
const researchEntry = await readFile(new URL('../api/research.ts', import.meta.url), 'utf8');
const release = await readFile(new URL('../src/release-v193.js', import.meta.url), 'utf8');
const controlPath=fileURLToPath(new URL('../src/internal-source-control-v27.js', import.meta.url));
const syntax=spawnSync(process.execPath,['--check',controlPath],{encoding:'utf8'});
assert.equal(syntax.status,0,`internal source control syntax error: ${syntax.stderr||syntax.stdout}`);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const required = [
  ['v2.7 version marker', /2\.7\.0-multisource-orchestrator/],
  ['approved canary id', /DBR-CANARY-2026-09-10/],
  ['approved scope canary search', /scopes:\['02_APPROVED'\]/],
  ['internal preference reader', /internalSourcesEnabled/],
  ['Drive requires explicit internal opt-in', /if\(!policy\?\.internalOptIn\|\|!policy\?\.useDrive\)return\[\]/],
  ['direct authenticated Drive runtime retrieval', /fetch\('\/api\/drive-brain'/],
  ['Drive relevance gate before synthesis', /relevantDriveSources/],
  ['explicit local source reader', /explicitLocalSources/],
  ['direct research endpoint', /fetch\('\/api\/research'/],
  ['server receives explicit internal consent', /useInternal:Boolean\(policy\?\.internalOptIn\)/],
  ['opt-in internal synthesis contract', /single-pass-gemini-grounded-with-opt-in-internal-context/],
  ['Gemini web default contract', /gemini-google-search-default/],
  ['local transfer audit flag', /localTransferredToGemini:Boolean\(local\.length\)/],
  ['Drive transfer audit flag', /driveTransferredToGemini:Boolean\(drive\.length\)/],
  ['local dependency disabled', /localDependency:false/],
  ['runtime health refresh', /refreshDriveRuntime/],
  ['periodic Drive re-probe', /DRIVE_HEALTH_INTERVAL_MS=60000/]
];
for (const [label, pattern] of required) assert.match(source, pattern, `Multi-source contract missing: ${label}`);

assert.doesNotMatch(executableSource, /QUESTION_DRIVE_MODES/, 'questions must not auto-enable Drive');
assert.doesNotMatch(executableSource, /localDependency:true/, 'local dependency must never become the default');
assert.match(executableSource, /effective\.internalOptIn\?await driveRuntimeSources\(text,effective\):\[\]/, 'Drive collection must require explicit opt-in');

assert.match(control,/ai-office-use-internal-v27/,'source toggle must have its own preference key');
assert.match(control,/localStorage\.getItem\(KEY\)==='1'/,'absence of preference must default to false');
assert.match(control,/Dùng tài liệu nội bộ/,'UI must expose a clear internal-source toggle');
assert.match(control,/Gemini Search mặc định/,'UI must disclose the default search provider');

assert.match(release,/internal-source-control-v27\.js\?v=270/,'production release chain must load internal source control');
assert.match(release,/sourceControl\.installInternalSourceControl\?\.\(\)/,'production release chain must activate internal source control');
assert.match(release,/multisource-orchestrator-v26\.js\?v=270/,'production release chain must load v2.7 multisource router');
const controlBoot=release.indexOf('installInternalSourceControl');
const multiBoot=release.indexOf('installMultiSourceOrchestrator');
assert.ok(controlBoot>=0&&multiBoot>controlBoot,'source-consent UI must initialize before multisource router');

assert.match(researchEntry,/import v31 from '\.\/research-v31\.js'/,'public research endpoint must route through v3.1 entry');
const geminiCall=research.indexOf('const grounded=await geminiGrounded');
const fallbackCall=research.indexOf('const fallback=await publicExtractive');
assert.ok(geminiCall>=0&&fallbackCall>geminiCall,'Gemini must be attempted before public fallback');
assert.match(research,/const\s+useInternal\s*=\s*req\.body\?\.useInternal\s*===\s*true/,'server must require explicit useInternal=true');
assert.match(research,/const\s+driveContext\s*=\s*useInternal\s*\?\s*suppliedContext\s*:\s*\[\]/,'server must discard internal context without consent');
assert.match(research,/INTERNAL_CONTEXT_IGNORED_WITHOUT_OPT_IN/,'server must audit rejected internal context');
assert.match(research,/tools:\[\{google_search:\{\}\}\]/,'Gemini must use Google Search grounding');

console.log('multisource-orchestrator-v31: Gemini-first + timeout-resilient fresh entry + opt-in internal sources PASS');
