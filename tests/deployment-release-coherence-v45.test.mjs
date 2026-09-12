import fs from 'node:fs';
import assert from 'node:assert/strict';
import selftestHandler from '../api/selftest.ts';

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

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = String(value); },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; }
  };
}

const oldSource = process.env.AI_OFFICE_SOURCE_COMMIT;
process.env.AI_OFFICE_SOURCE_COMMIT = 'phase44-test-source';
try {
  const getRes = mockResponse();
  await selftestHandler({ method: 'GET', headers: {} }, getRes);
  assert.equal(getRes.statusCode, 405);
  assert.equal(getRes.body?.artifactWorkPerformed, false);

  const wrongRes = mockResponse();
  await selftestHandler({ method: 'POST', headers: { 'x-ai-office-selftest-source': 'wrong-source' } }, wrongRes);
  assert.equal(wrongRes.statusCode, 403);
  assert.equal(wrongRes.body?.artifactWorkPerformed, false);

  const validRes = mockResponse();
  await selftestHandler({ method: 'POST', headers: { 'x-ai-office-selftest-source': 'phase44-test-source' } }, validRes);
  assert.equal(validRes.statusCode, 200);
  assert.equal(validRes.body?.pass, true);
  assert.equal(validRes.body?.engine, 'internal-office-xml-v24');
  assert.equal(validRes.body?.sourceCommit, 'phase44-test-source');
  for (const format of ['docx', 'xlsx', 'pptx']) {
    assert.equal(validRes.body?.artifacts?.[format]?.pass, true, `${format}: real selftest artifact must pass`);
    assert.ok(validRes.body?.artifacts?.[format]?.bytes > 100, `${format}: real selftest artifact must contain bytes`);
  }
} finally {
  if (oldSource === undefined) delete process.env.AI_OFFICE_SOURCE_COMMIT;
  else process.env.AI_OFFICE_SOURCE_COMMIT = oldSource;
}

console.log('deployment release coherence + exact-source artifact selftest contract: PASS');
