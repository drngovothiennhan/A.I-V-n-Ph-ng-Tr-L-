import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');
const selftest = fs.readFileSync('api/selftest.ts', 'utf8');

assert.match(workflow, /x-ai-office-source-commit/i, 'health source commit must be smoke-checked');
assert.match(workflow, /x-ai-office-ui-source-ref/i, 'dashboard shell source ref must be smoke-checked');
assert.match(workflow, /x-ai-office-asset-source-ref/i, 'runtime asset source ref must be smoke-checked');
assert.match(workflow, /UI_SOURCE_REF[\s\S]*GITHUB_SHA/, 'UI shell ref must be compared with GITHUB_SHA');
assert.match(workflow, /ASSET_SOURCE_REF[\s\S]*GITHUB_SHA/, 'asset ref must be compared with GITHUB_SHA');
assert.match(workflow, /research-safety-guard-v263\.js/, 'known safety asset must remain part of the production smoke');

assert.match(selftest, /req\.method !== 'POST'/, 'artifact selftest must not run on public GET/navigation');
assert.match(selftest, /x-ai-office-selftest-source/, 'artifact selftest must require the release source marker');
assert.match(selftest, /suppliedSource !== expectedSource/, 'artifact selftest marker must exactly match runtime source commit');
const gateIndex = selftest.indexOf("suppliedSource !== expectedSource");
const artifactIndex = selftest.indexOf('createArtifact({');
assert.ok(gateIndex >= 0 && artifactIndex > gateIndex, 'release marker gate must run before artifact generation');
assert.match(selftest, /artifactWorkPerformed: false/, 'rejected selftest calls must state that artifact work did not run');

const candidateSelftest = /vercel curl \/api\/selftest --deployment "\$URL"[^\n]*--request POST[^\n]*x-ai-office-selftest-source: \$GITHUB_SHA/;
assert.match(workflow, candidateSelftest, 'candidate selftest must POST with exact GITHUB_SHA release marker');
const productionSelftest = /curl[^\n]*--request POST[^\n]*x-ai-office-selftest-source: \$GITHUB_SHA[^\n]*https:\/\/ai-van-phong-tro-ly\.vercel\.app\/api\/selftest/;
assert.match(workflow, productionSelftest, 'production selftest must POST with exact GITHUB_SHA release marker');
assert.match(workflow, /t\.sourceCommit!==process\.env\.GITHUB_SHA/, 'selftest response source commit must be verified against GITHUB_SHA');

console.log('deployment release coherence + exact-source artifact selftest contract: PASS');
