import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const release=fs.readFileSync(new URL('../.github/workflows/release-phase53-scoped-production.yml',import.meta.url),'utf8');
const legacyQa=fs.readFileSync(new URL('../.github/workflows/quality-v20.yml',import.meta.url),'utf8');

test('Office OS production release remains candidate-first with exact-source gates and rollback',()=>{
  assert.match(release,/src\/office-v2\/\*\*/);
  assert.match(release,/src\/office-os\/\*\*/);
  assert.match(release,/office-v2-core\.test\.mjs/);
  assert.match(release,/office-v2-shadow-hook\.test\.mjs/);
  assert.match(release,/office-os-\*\.test\.mjs/);
  assert.match(release,/vercel deploy --prod --skip-domain/);
  assert.match(release,/x-ai-office-source-commit/);
  assert.match(release,/promote\/\$CANDIDATE_ID/);
  assert.match(release,/rollback\/\$PREVIOUS_ID/);
  assert.match(release,/group: ai-office-production-release/);
  assert.match(release,/cancel-in-progress: false/);
});

test('protected candidate smoke uses authenticated vercel curl and avoids ephemeral bypass mutation',()=>{
  assert.match(release,/Candidate exact-source smoke with authenticated Vercel CLI/);
  assert.match(release,/vercel curl "\$URL\/api\/health" --token="\$VERCEL_TOKEN"/);
  assert.match(release,/vercel curl "\$URL\/" --token="\$VERCEL_TOKEN"/);
  assert.match(release,/vercel curl "\$URL\/src\/research-safety-guard-v263\.js" --token="\$VERCEL_TOKEN"/);
  assert.match(release,/vercel curl "\$URL\/api\/selftest" --token="\$VERCEL_TOKEN"/);
  assert.doesNotMatch(release,/Generate ephemeral deployment share bypass/);
  assert.doesNotMatch(release,/Revoke ephemeral deployment share bypass/);
  assert.doesNotMatch(release,/_vercel_share=/);
  assert.doesNotMatch(release,/api\.vercel\.com\/aliases\/\$CANDIDATE_REF\/protection-bypass/);
  const smokeIndex=release.indexOf('Candidate exact-source smoke with authenticated Vercel CLI');
  const promoteIndex=release.indexOf('Promote verified candidate');
  assert.ok(smokeIndex>0&&promoteIndex>smokeIndex,'authenticated candidate smoke must pass before promotion');
});

test('Phase 66 keeps exactly one active production release pipeline',()=>{
  assert.match(legacyQa,/deploy-production:[\s\S]*?if: \$\{\{ false \}\}/,'legacy deploy job must remain permanently inert');
  assert.match(legacyQa,/retired legacy deploy path; canonical production release is release-phase53-scoped-production\.yml/);
  assert.match(release,/name: Office V2 Scoped Production Release/);
  assert.match(release,/branches: \[main\]/);
  assert.match(release,/Promote verified candidate by scoped REST API/);
});

test('Office OS release retains legacy production regression gates and function budget',()=>{
  assert.match(release,/vercel-function-budget-v54\.test\.mjs/);
  assert.match(release,/vercel-gateway-esm-runtime-v56\.test\.mjs/);
  assert.match(release,/ai-orchestrator-core-v32\.test\.mjs/);
  assert.match(release,/proxy-chief-resilience-v37\.test\.mjs/);
  assert.match(release,/provider-smoke-contract-v41\.test\.mjs/);
});
