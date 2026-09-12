import { pathToFileURL } from 'node:url';

export async function verifyOfficeRelease(base, source, {
  request = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms)),
  attempts = 6, log = console.log
} = {}) {
  if (!/^[a-f0-9]{40}$/.test(source)) throw new Error('INVALID_EXPECTED_SOURCE');
  const root = new URL(base);
  if (root.protocol !== 'https:') throw new Error('HTTPS_REQUIRED');
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // A healthy endpoint does not establish convergence of a different Lambda.
    const health = await request(new URL('/api/health', root), {
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    const h = await health.json();
    if (health.status !== 200 || h.status !== 'ok' ||
        health.headers.get('x-ai-office-source-commit') !== source) {
      throw new Error('HEALTH_SOURCE_MISMATCH');
    }
    const response = await request(new URL('/api/selftest', root), {
      method: 'POST', redirect: 'error', cache: 'no-store',
      headers: { 'x-ai-office-selftest-source': source },
      signal: AbortSignal.timeout(20000)
    });
    const body = await response.json();
    // Record only release diagnostics, never credentials or user content.
    log(JSON.stringify({ attempt, status: response.status,
      requestSource: source, responseSource: body.sourceCommit || null,
      error: body.error || null, edge: response.headers.get('x-vercel-id') }));
    if (response.status === 200) {
      if (body.pass !== true || body.sourceCommit !== source ||
          response.headers.get('x-ai-office-selftest-source') !== source ||
          body.engine !== 'internal-office-xml-v24' ||
          !['docx', 'xlsx', 'pptx'].every(format =>
            body.artifacts?.[format]?.pass === true && body.artifacts[format].bytes > 100)) {
        throw new Error('SELFTEST_RESULT_INVALID');
      }
      return body;
    }
    // Retry only the observed, work-free marker rejection; never turn it into PASS.
    if (response.status !== 403 || body.error !== 'SELFTEST_RELEASE_MARKER_REQUIRED' ||
        body.artifactWorkPerformed !== false) throw new Error('SELFTEST_FAILED');
    if (attempt < attempts) await pause(2000);
  }
  throw new Error('SELFTEST_MARKER_REJECTED_AFTER_BOUNDED_WAIT');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyOfficeRelease(process.argv[2], process.argv[3]);
  console.log('Office release gate PASS: exact source, DOCX/XLSX/PPTX');
}
