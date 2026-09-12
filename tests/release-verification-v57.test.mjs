import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyOfficeRelease } from '../scripts/verify-office-release.mjs';

const sha = '1c0d13708339e705ae2f10e5e363f8f51d01b0a3';
const success = { pass: true, sourceCommit: sha, engine: 'internal-office-xml-v24',
  artifacts: Object.fromEntries(['docx','xlsx','pptx'].map(f => [f, { pass: true, bytes: 1000 }])) };
const rejected = { error: 'SELFTEST_RELEASE_MARKER_REQUIRED', artifactWorkPerformed: false };
function harness(results, healthSource = sha) {
  let posts = 0;
  return {
    posts: () => posts,
    options: { pause: async () => {}, log: () => {}, request: async (url, init) => {
      if (url.pathname === '/api/health') return new Response(JSON.stringify({ status: 'ok' }),
        { headers: { 'x-ai-office-source-commit': healthSource } });
      assert.equal(init.method, 'POST');
      assert.equal(init.redirect, 'error');
      assert.equal(init.headers['x-ai-office-selftest-source'], sha);
      const [status, body] = results[Math.min(posts++, results.length - 1)];
      return new Response(JSON.stringify(body), { status,
        headers: { 'x-ai-office-selftest-source': body.sourceCommit || '' } });
    } }
  };
}
test('waits for selftest convergence independently of health', async () => {
  const h = harness([[403, rejected], [200, success]]);
  assert.equal((await verifyOfficeRelease('https://example.test', sha, h.options)).pass, true);
  assert.equal(h.posts(), 2);
});
test('persistent marker rejection fails after six attempts', async () => {
  const h = harness([[403, rejected]]);
  await assert.rejects(verifyOfficeRelease('https://example.test', sha, h.options), /BOUNDED_WAIT/);
  assert.equal(h.posts(), 6);
});
test('health source mismatch performs no artifact work', async () => {
  const h = harness([[200, success]], '825dbf8073284eadc38800245f42d4f70f647c98');
  await assert.rejects(verifyOfficeRelease('https://example.test', sha, h.options), /HEALTH_SOURCE_MISMATCH/);
  assert.equal(h.posts(), 0);
});
test('wrong source or missing Office format cannot pass', async () => {
  for (const body of [{ ...success, sourceCommit: 'wrong' }, { ...success, artifacts: {} }]) {
    const h = harness([[200, body]]);
    await assert.rejects(verifyOfficeRelease('https://example.test', sha, h.options), /RESULT_INVALID/);
  }
});
test('unrelated forbidden response and artifact failure are not retried', async () => {
  for (const row of [[403, {error: 'OTHER'}], [500, {pass:false}]]) {
    const h = harness([row]);
    await assert.rejects(verifyOfficeRelease('https://example.test', sha, h.options), /SELFTEST_FAILED/);
    assert.equal(h.posts(), 1);
  }
});
test('live verification cannot deploy, promote, or roll back', () => {
  const workflow = readFileSync('.github/workflows/release-phase56-runtime-production.yml', 'utf8');
  assert.doesNotMatch(workflow, /vercel (?:deploy|promote|rollback)|projects\/.*\/(?:promote|rollback)\//);
  assert.match(workflow, /scripts\/verify-office-release.mjs/);
  assert.match(workflow, /v13\/deployments\/ai-van-phong-tro-ly.vercel.app/);
});
