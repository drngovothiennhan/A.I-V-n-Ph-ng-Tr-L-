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
  assert.match(release,/group: ai-office-production-release/);
  assert.match(release,/cancel-in-progress: false/);
});

test('protected candidate smoke uses deployment-scoped share bypass and revokes it before promotion',()=>{
  assert.match(release,/api\.vercel\.com\/aliases\/\$CANDIDATE_ID\/protection-bypass/);
  assert.match(release,/--data '\{\"ttl\":900\}'/);
  assert.match(release,/VERCEL_SHARE_BYPASS=\$SHARE_VALUE/);
  assert.match(release,/_vercel_share=\$VERCEL_SHARE_BYPASS/);
  assert.match(release,/--location/);
  assert.match(release,/--cookie-jar "\$COOKIE_JAR" --cookie "\$COOKIE_JAR"/);
  assert.match(release,/--post301 --post302 --post303/);
  assert.match(release,/revoke:\{secret:process\.argv\[1\],regenerate:false\}/);
  const revokeIndex=release.indexOf('Revoke ephemeral deployment share bypass');
  const promoteIndex=release.indexOf('Promote verified candidate');
  assert.ok(revokeIndex>0&&promoteIndex>revokeIndex,'deployment share bypass must be revoked before promotion');
  assert.doesNotMatch(release,/vercel curl/,'protected smoke must not depend on Vercel CLI user lookup');
  assert.doesNotMatch(release,/\/v1\/projects\/\$VERCEL_PROJECT_ID\/protection-bypass/,'release must not mutate project-wide automation bypass');
});

test('Office V2 release retains legacy production regression gates and function budget',()=>{
  assert.match(release,/vercel-function-budget-v54\.test\.mjs/);
  assert.match(release,/vercel-gateway-esm-runtime-v56\.test\.mjs/);
  assert.match(release,/ai-orchestrator-core-v32\.test\.mjs/);
  assert.match(release,/proxy-chief-resilience-v37\.test\.mjs/);
  assert.match(release,/provider-smoke-contract-v41\.test\.mjs/);
});
