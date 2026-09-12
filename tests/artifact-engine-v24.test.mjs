import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createOfficeArtifact } from '../api/_office-artifacts.js';
import { parseOfficeBuffer } from '../api/_office-ingest.js';

const formats = ['docx', 'xlsx', 'pptx'];
const content = 'BÁO CÁO KIỂM THỬ\nI. Nội dung\n- A.I Văn phòng\n- Product Completion V2.4\nTên;Giá trị\nQA;PASS';

for (const format of formats) {
  const artifact = createOfficeArtifact({ format, title: `V24 ${format}`, content });
  assert.ok(Buffer.isBuffer(artifact.buffer), `${format}: output must be Buffer`);
  assert.ok(artifact.buffer.length > 500, `${format}: output too small`);
  assert.equal(artifact.buffer.subarray(0, 4).toString('hex'), '504b0304', `${format}: not a ZIP-based Office file`);

  const marker = format === 'docx' ? 'word/document.xml' : format === 'xlsx' ? 'xl/workbook.xml' : 'ppt/presentation.xml';
  assert.ok(artifact.buffer.includes(Buffer.from(marker)), `${format}: package marker missing`);

  const parsed = parseOfficeBuffer(format, artifact.buffer);
  assert.ok(parsed.length > 10, `${format}: round-trip parser returned empty content`);
  assert.match(parsed, /A\.I Văn phòng|BÁO CÁO KIỂM THỬ|QA/, `${format}: round-trip content mismatch`);
}

const imageGateway = await readFile(new URL('../api/image-gateway.ts', import.meta.url), 'utf8');
const ingestGateway = await readFile(new URL('../api/ingest-gateway.ts', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

for (const [name, gateway, delegate] of [
  ['image', imageGateway, 'image(req, res)'],
  ['ingest', ingestGateway, 'ingest(req, res)']
]) {
  assert.match(gateway, /req\.method !== 'POST'/, `${name}: gateway must reject non-POST requests`);
  assert.match(gateway, /application\/json/, `${name}: gateway must require JSON requests`);
  assert.match(gateway, /function sameOriginResourceRequest\(req\)/, `${name}: gateway must enforce same-origin metadata`);
  for (const marker of ['x-forwarded-host','referer','sec-fetch-site','sec-fetch-mode','sec-fetch-dest']) {
    assert.ok(gateway.includes(marker), `${name}: gateway must inspect ${marker}`);
  }
  assert.match(gateway, /site && site !== 'same-origin'/, `${name}: cross-site requests must be rejected`);
  assert.match(gateway, /AI_RESOURCE_SAME_ORIGIN_REQUIRED/, `${name}: rejection reason must be explicit`);
  assert.match(gateway, /providerCallMade:\s*false/, `${name}: rejected requests must confirm no provider/runtime call`);
  const guardIndex = gateway.indexOf('sameOriginResourceRequest(req)');
  const delegateIndex = gateway.lastIndexOf(delegate);
  assert.ok(guardIndex >= 0 && delegateIndex > guardIndex, `${name}: guard must execute before canonical handler`);
}

assert.match(imageGateway, /import image from '\.\/image'/, 'image gateway must delegate to canonical Gemini image handler');
assert.doesNotMatch(imageGateway, /from ['"]\.\/image\.ts['"]/,'image gateway import must remain TypeScript-build compatible');
assert.match(ingestGateway, /import ingest from '\.\/ingest'/, 'ingest gateway must delegate to canonical Office parser handler');
assert.doesNotMatch(ingestGateway, /from ['"]\.\/ingest\.ts['"]/,'ingest gateway import must remain TypeScript-build compatible');

function destination(source){
  const rewrite=(vercel.rewrites||[]).find(row=>row?.source===source);
  const route=(vercel.routes||[]).find(row=>row?.src===source);
  return String(rewrite?.destination||route?.dest||'').replace(/\.ts(?=\?|$)/,'');
}
assert.equal(destination('/api/image'), '/api/image-gateway', 'production /api/image must route through secure gateway');
assert.equal(destination('/api/ingest'), '/api/ingest-gateway', 'production /api/ingest must route through secure gateway');

console.log('artifact-engine-v24: DOCX/XLSX/PPTX round-trip + image/ingest resource gateways PASS');
