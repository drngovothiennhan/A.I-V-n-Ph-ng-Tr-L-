import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');

assert.match(workflow, /ai-office-phase30-promote-gate/, 'phase30 branch must run the canonical source QA workflow');
assert.match(workflow, /vercel deploy --prebuilt --prod --skip-domain[^\n]*AI_OFFICE_SOURCE_COMMIT=\$GITHUB_SHA/,
  'validated production bundle must deploy as a production-environment candidate without receiving production domains');
assert.match(workflow, /vercel curl \/api\/health --deployment "\$URL"/,
  'candidate health must be smoke-tested against the specific deployment before promotion');
assert.match(workflow, /vercel curl \/ --deployment "\$URL"/,
  'candidate dashboard shell must be smoke-tested before promotion');
assert.match(workflow, /vercel curl \/src\/research-safety-guard-v263\.js --deployment "\$URL"/,
  'candidate safety asset must be smoke-tested before promotion');
assert.match(workflow, /vercel curl \/api\/selftest --deployment "\$URL"/,
  'candidate artifact engine must be smoke-tested before promotion');
assert.match(workflow, /vercel promote "\$URL" --yes/,
  'only the verified candidate may be promoted');

const deployIndex = workflow.indexOf('Deploy production candidate without traffic');
const candidateSmokeIndex = workflow.indexOf('Candidate smoke test');
const promoteIndex = workflow.indexOf('Promote verified candidate');
const productionSmokeIndex = workflow.indexOf('Post-promotion production smoke');
assert.ok(deployIndex >= 0 && candidateSmokeIndex > deployIndex && promoteIndex > candidateSmokeIndex && productionSmokeIndex > promoteIndex,
  'deployment order must be candidate deploy -> candidate smoke -> promote -> production smoke');

const deploySection = workflow.slice(deployIndex, candidateSmokeIndex);
assert.doesNotMatch(deploySection, /vercel deploy --prebuilt --prod(?! --skip-domain)/,
  'candidate deploy must never assign production domains before smoke passes');
assert.match(workflow.slice(candidateSmokeIndex, promoteIndex), /x-ai-office-source-commit/i,
  'candidate smoke must verify the explicitly stamped source commit before promotion');
assert.match(workflow.slice(candidateSmokeIndex, promoteIndex), /x-ai-office-ui-source-ref/i,
  'candidate smoke must verify the dashboard source ref before promotion');
assert.match(workflow.slice(candidateSmokeIndex, promoteIndex), /x-ai-office-asset-source-ref/i,
  'candidate smoke must verify runtime asset source ref before promotion');
assert.match(workflow.slice(productionSmokeIndex), /https:\/\/ai-van-phong-tro-ly\.vercel\.app\/api\/health/,
  'production must be re-verified after promotion');

console.log('deployment candidate promotion gate contract: PASS');
