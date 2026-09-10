import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/multisource-orchestrator-v26.js', import.meta.url), 'utf8');

const required = [
  ['version marker', /2\.6\.1-multisource-orchestrator/],
  ['approved canary id', /DBR-CANARY-2026-09-10/],
  ['approved scope canary search', /scopes:\['02_APPROVED'\]/],
  ['opportunistic Drive for questions', /QUESTION_DRIVE_MODES/],
  ['direct Drive runtime retrieval', /fetch\('\/api\/drive-brain'/],
  ['explicit local opt-in only', /explicitLocalRequested/],
  ['explicit local source reader', /explicitLocalSources/],
  ['external research policy disables Drive', /externalPolicy=\{\.\.\.effective,useDrive:false,useLocal:false/],
  ['external research never receives legacy Drive/local context', /externalResearchDriveContext:false/],
  ['derived external synthesis is labelled', /kind:'derived-research'/],
  ['derived research is not ground truth', /derived, not ground truth/],
  ['disable preliminary endpoint answer', /endpointAnswer:''/],
  ['preserve preliminary research only as metadata', /preliminaryExternalAnswer/],
  ['final Gemini synthesis contract', /gemini-over-relevance-gated-source-pack/],
  ['runtime health refresh', /refreshDriveRuntime/],
  ['periodic Drive re-probe', /DRIVE_HEALTH_INTERVAL_MS=60000/]
];

for (const [label, pattern] of required) {
  assert.match(source, pattern, `Multi-source contract missing: ${label}`);
}

assert.doesNotMatch(source, /originalGather\(text,effective\)/, 'legacy gather must never receive effective useDrive=true policy');
assert.doesNotMatch(source, /localDependency:true/, 'local dependency must never become the default');
assert.match(source, /localDependency:false/, 'local dependency must be explicitly disabled');

console.log('multisource-orchestrator-v26: Drive runtime isolated + external research + Gemini synthesis without local dependency PASS');
