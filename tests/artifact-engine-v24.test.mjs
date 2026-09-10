import assert from 'node:assert/strict';
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

console.log('artifact-engine-v24: DOCX/XLSX/PPTX round-trip PASS');
