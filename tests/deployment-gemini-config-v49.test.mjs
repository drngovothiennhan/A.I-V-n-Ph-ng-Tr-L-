import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');

const configuredChecks = workflow.match(/h\.providers\?\.gemini\?\.configured!==true/g) || [];
assert.ok(configuredChecks.length >= 2, 'candidate and production smoke must both require configured Gemini');
assert.match(workflow, /h\.providers\?\.gemini\?\.model!==['"]gemini-3\.8-flash['"]/);
assert.match(workflow, /h\.providers\?\.gemini\?\.economyModel!==['"]gemini-3\.5-flash-lite['"]/);
assert.doesNotMatch(workflow, /provider-check\?probe=gemini-grounding/, 'release smoke must not spend grounding quota');
assert.doesNotMatch(workflow, /provider-check\?probe=all/, 'release smoke must not run aggregate provider probes');

console.log('deployment Gemini configuration gate: PASS');
