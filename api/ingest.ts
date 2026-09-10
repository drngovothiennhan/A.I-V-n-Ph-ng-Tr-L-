import { inflateRawSync } from 'node:zlib';

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const SUPPORTED = new Set(['docx', 'xlsx', 'pptx']);

function ext(name = '') {
  return String(name).split('.').pop()?.toLowerCase() || '';
}
function decodeXml(text = '') {
  return String(text)
    .replace(/<w:tab\/?>(?:<\/w:tab>)?/g, '\t')
    .replace(/<a:br\s*\/>/g, '\n')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function stripXml(xml = '') {
  return decodeXml(String(xml)
    .replace(/<w:tab\s*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<\/a:p>/g, '\n')
    .replace(/<a:br\s*\/>/g, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function findEocd(buf: Buffer) {
  const min = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}
function unzipEntries(buf: Buffer, wanted: (name: string) => boolean) {
  const eocd = findEocd(buf);
  if (eocd < 0) throw new Error('INVALID_ZIP');
  const total = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < total && ptr + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');
    if (wanted(name)) {
      if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('INVALID_LOCAL_HEADER');
      const localNameLen = buf.readUInt16LE(localOffset + 26);
      const localExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLen + localExtraLen;
      const compressed = buf.subarray(start, start + compSize);
      const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
      if (data) out.set(name, data);
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
function parseDocx(buf: Buffer) {
  const map = unzipEntries(buf, (name) => name === 'word/document.xml');
  const xml = map.get('word/document.xml');
  if (!xml) throw new Error('DOCX_DOCUMENT_XML_MISSING');
  return stripXml(xml.toString('utf8')).slice(0, 120000);
}
function parsePptx(buf: Buffer) {
  const map = unzipEntries(buf, (name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  const slides = [...map.entries()]
    .sort((a, b) => Number(a[0].match(/slide(\d+)/)?.[1] || 0) - Number(b[0].match(/slide(\d+)/)?.[1] || 0))
    .map(([, data], i) => `[Slide ${i + 1}]\n${stripXml(data.toString('utf8'))}`);
  if (!slides.length) throw new Error('PPTX_SLIDES_MISSING');
  return slides.join('\n\n').slice(0, 120000);
}
async function parseXlsx(buf: Buffer) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, dense: true });
  const parts: string[] = [];
  for (const name of wb.SheetNames.slice(0, 20)) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false, blankrows: false });
    parts.push(`[Sheet: ${name}]`);
    for (const row of rows.slice(0, 1500)) {
      parts.push(row.map((v) => String(v ?? '').replace(/\t/g, ' ')).join('\t'));
    }
  }
  return parts.join('\n').slice(0, 160000);
}

export default async function handler(req: any, res: any) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const name = String(req.body?.name || '').slice(0, 180);
    const extension = ext(name);
    if (!SUPPORTED.has(extension)) return res.status(400).json({ error: 'UNSUPPORTED_FILE_TYPE', supported: [...SUPPORTED] });
    const b64 = String(req.body?.dataBase64 || '');
    if (!b64 || b64.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 1000) {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', maxBytes: MAX_FILE_BYTES });
    }
    const data = Buffer.from(b64, 'base64');
    if (!data.length || data.length > MAX_FILE_BYTES) return res.status(413).json({ error: 'FILE_TOO_LARGE', maxBytes: MAX_FILE_BYTES });

    let text = '';
    if (extension === 'docx') text = parseDocx(data);
    else if (extension === 'pptx') text = parsePptx(data);
    else text = await parseXlsx(data);

    return res.status(200).json({ name, extension, text, textLength: text.length, parser: `office-v19-${extension}` });
  } catch (error: any) {
    console.error('ingest_error', { message: String(error?.message || error).slice(0, 220) });
    return res.status(422).json({ error: 'FILE_PARSE_FAILED' });
  }
}
