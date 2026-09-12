import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');

assert.match(workflow, /ai-office-phase32-post-promotion-rollback/,
  'phase32 branch must run canonical source QA');
assert.match(workflow, /- name: Capture current production deployment\n\s+id: previous/,
  'workflow must capture the currently serving production deployment before candidate work');
assert.match(workflow, /v13\/deployments\/ai-van-phong-tro-ly\.vercel\.app\?teamId=\$VERCEL_ORG_ID/,
  'capture must resolve the actual production hostname through Vercel deployment API');
assert.match(workflow, /echo "id=\$PREVIOUS_ID" >> "\$GITHUB_OUTPUT"/,
  'captured production deployment ID must be persisted as a step output');
assert.match(workflow, /- name: Promote verified candidate\n\s+id: promote/,
  'promotion step must expose outcome for rollback condition');
assert.match(workflow, /- name: Post-promotion production smoke\n\s+id: production-smoke/,
  'production smoke must remain a distinct post-promotion gate');
assert.match(workflow, /- name: Roll back failed promotion\n\s+if: failure\(\) && steps\.promote\.outcome == 'success' && steps\.previous\.outputs\.id != ''/,
  'rollback must run only after a successful promotion followed by job failure');
assert.match(workflow, /POST[^\n]*api\.vercel\.com\/v1\/projects\/\$VERCEL_PROJECT_ID\/rollback\/\$PREVIOUS_ID\?teamId=\$VERCEL_ORG_ID/,
  'rollback must target the exact pre-promotion deployment through the documented REST endpoint');
assert.match(workflow, /CURRENT_ID[^\n]*previous-deployment|CURRENT_ID[\s\S]*PREVIOUS_ID/,
  'rollback recovery must verify that production traffic resolves back to the captured deployment');
assert.match(workflow, /Rollback restored deployment:/,
  'successful recovery must be written to the job summary');

const captureIndex = workflow.indexOf('Capture current production deployment');
const candidateIndex = workflow.indexOf('Deploy production candidate without traffic');
const promoteIndex = workflow.indexOf('Promote verified candidate');
const smokeIndex = workflow.indexOf('Post-promotion production smoke');
const rollbackIndex = workflow.indexOf('Roll back failed promotion');
assert.ok(captureIndex >= 0 && candidateIndex > captureIndex && promoteIndex > candidateIndex && smokeIndex > promoteIndex && rollbackIndex > smokeIndex,
  'release order must be capture current -> candidate -> promote -> post-smoke -> conditional rollback');

assert.doesNotMatch(workflow.slice(captureIndex, candidateIndex), /rollback\/\$GITHUB_SHA/,
  'rollback target must never be the new candidate SHA');

console.log('deployment rollback recovery contract: PASS');
