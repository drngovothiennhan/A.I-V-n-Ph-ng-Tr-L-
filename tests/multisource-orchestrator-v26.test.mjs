import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/multisource-orchestrator-v26.js', import.meta.url), 'utf8');
const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const required = [
  ['version marker', /2\.6\.2-multisource-orchestrator/],
  ['approved canary id', /DBR-CANARY-2026-09-10/],
  ['approved scope canary search', /scopes:\['02_APPROVED'\]/],
  ['opportunistic Drive for questions', /QUESTION_DRIVE_MODES/],
  ['direct authenticated Drive runtime retrieval', /fetch\('\/api\/drive-brain'/],
  ['Drive relevance gate before synthesis', /relevantDriveSources/],
  ['explicit local opt-in only', /explicitLocalRequested/],
  ['explicit local source reader', /explicitLocalSources/],
  ['direct research endpoint', /fetch\('\/api\/research'/],
  ['canonical Drive context sent to grounded research', /driveContext:context/],
  ['single-pass synthesis contract', /single-pass-gemini-grounded-with-canonical-context/],
  ['cost-aware no-context fast path', /cost-aware-external-fast-path/],
  ['local transfer audit flag', /localTransferredToGemini:Boolean\(local\.length\)/],
  ['Drive transfer audit flag', /driveTransferredToGemini:Boolean\(drive\.length\)/],
  ['local dependency disabled', /localDependency:false/],
  ['runtime health refresh', /refreshDriveRuntime/],
  ['periodic Drive re-probe', /DRIVE_HEALTH_INTERVAL_MS=60000/]
];

for (const [label, pattern] of required) {
  assert.match(source, pattern, `Multi-source contract missing: ${label}`);
}

assert.doesNotMatch(executableSource, /\boriginalGather\s*\(/, 'legacy gather function must not be invoked by v2.6.2');
assert.doesNotMatch(executableSource, /\blocalApprovedSources\s*\(/, 'legacy local source function must not be invoked by v2.6.2');
assert.doesNotMatch(executableSource, /localDependency:true/, 'local dependency must never become the default');
assert.match(executableSource, /effective\.useLocal\?explicitLocalSources\(text\):\[\]/, 'local source collection must require explicit opt-in');

console.log('multisource-orchestrator-v26: single-pass Drive + Gemini grounded + external, no local dependency PASS');
