import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/multisource-orchestrator-v26.js', import.meta.url), 'utf8');

const required = [
  ['version marker', /2\.6-multisource-orchestrator/],
  ['approved canary id', /DBR-CANARY-2026-09-10/],
  ['approved scope canary search', /scopes:\['02_APPROVED'\]/],
  ['opportunistic Drive for questions', /QUESTION_DRIVE_MODES/],
  ['explicit local opt-in only', /explicitLocalRequested/],
  ['local source filter', /filter\(source=>allowLocal\|\|!isLocalSource\(source\)\)/],
  ['disable preliminary endpoint answer', /endpointAnswer:''/],
  ['preserve preliminary research only as metadata', /preliminaryExternalAnswer/],
  ['final Gemini synthesis contract', /gemini-over-relevance-gated-source-pack/],
  ['runtime health refresh', /refreshDriveRuntime/],
  ['periodic Drive re-probe', /DRIVE_HEALTH_INTERVAL_MS=60000/]
];

for (const [label, pattern] of required) {
  assert.match(source, pattern, `Multi-source contract missing: ${label}`);
}

assert.doesNotMatch(source, /localDependency:true/, 'local dependency must never become the default');
assert.match(source, /localDependency:false/, 'local dependency must be explicitly disabled');

console.log('multisource-orchestrator-v26: Drive + external + Gemini synthesis without local dependency PASS');
