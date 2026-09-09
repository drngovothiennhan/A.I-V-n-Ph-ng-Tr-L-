import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const result: any = { docx: null, xlsx: null, pptx: null };
  try {
    const { Document, Packer, Paragraph } = await import('docx');
    const doc = new Document({ sections: [{ children: [new Paragraph('A.I Văn phòng v1.7 self-test')] }] });
    const buf = await Packer.toBuffer(doc);
    result.docx = { pass: Buffer.isBuffer(buf) && buf.length > 100, bytes: buf.length };
  } catch (error: any) {
    result.docx = { pass: false, error: String(error?.message || error).slice(0, 180) };
  }
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['A.I Văn phòng v1.7 self-test']]), 'Test');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    result.xlsx = { pass: Buffer.isBuffer(buf) && buf.length > 100, bytes: buf.length };
  } catch (error: any) {
    result.xlsx = { pass: false, error: String(error?.message || error).slice(0, 180) };
  }
  try {
    const PptxGenJS = require('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    slide.addText('A.I Văn phòng v1.7 self-test', { x: 0.8, y: 0.8, w: 8, h: 0.5, fontSize: 24 });
    const out = await pptx.write({ outputType: 'nodebuffer' });
    const buf = Buffer.isBuffer(out) ? out : Buffer.from(out);
    result.pptx = { pass: buf.length > 100, bytes: buf.length };
  } catch (error: any) {
    result.pptx = { pass: false, error: String(error?.message || error).slice(0, 180) };
  }
  const pass = Object.values(result).every((x: any) => x?.pass === true);
  return res.status(pass ? 200 : 500).json({ pass, release: '1.7.1-second-brain-voice-fabric', artifacts: result, timestamp: new Date().toISOString() });
}
