import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const release=fs.readFileSync(new URL('../.github/workflows/release-phase53-scoped-production.yml',import.meta.url),'utf8');

test('Office V2 production release remains candidate-first with exact-source gates and rollback',()=>{
  assert.match(release,/src\/office-v2\/\*\*/);
  assert.match(release,/office-v2-core\.test\.mjs/);
  assert.match(release,/office-v2-shadow-hook\.test\.mjs/);
  assert.match(release,/vercel deploy --prod --skip-domain/);
  assert.match(release,/x-ai-office-source-commit/);
  assert.match(release,/promote\/\$CANDIDATE_ID/);
  assert.match(release,/rollback\/\$PREVIOUS_ID/);
});

test('Office V2 release retains legacy production regression gates and function budget',()=>{
  assert.match(release,/vercel-function-budget-v54\.test\.mjs/);
  assert.match(release,/vercel-gateway-esm-runtime-v56\.test\.mjs/);
  assert.match(release,/ai-orchestrator-core-v32\.test\.mjs/);
  assert.match(release,/proxy-chief-resilience-v37\.test\.mjs/);
});
