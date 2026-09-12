import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');

assert.match(workflow, /h\.providers\?\.gemini\?\.model!==['"]gemini-3\.8-flash['"]/);
assert.match(workflow, /h\.providers\?\.gemini\?\.economyModel!==['"]gemini-3\.5-flash-lite['"]/);
assert.match(workflow, /Production source mismatch/);
assert.match(workflow, /SOURCE_COMMIT.*GITHUB_SHA/s);

console.log('provider smoke contract: PASS');
