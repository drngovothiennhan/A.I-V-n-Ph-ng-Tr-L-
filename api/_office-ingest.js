import { inflateRawSync } from 'node:zlib';

export const OFFICE_LIMITS = {
  maxFileBytes: 3 * 1024 * 1024,
  maxZipEntries: 5000,
  maxEntryUncompressed: 8 * 1024 * 1024,
  maxTotalUncompressed: 24 * 1024 * 1024
};

function decodeXml(text = '') {
  return String(text)
    .replace(/<w:tab\/?>(?:<\/w:tab>)?/g, '\t')
    .replace(/<a:br\s*\/>/g, '\n')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 10)));
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
function findEocd(buf) {
  const min = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}
function unzipEntries(buf, wanted) {
  const eocd = findEocd(buf);
  if (eocd < 0) throw new Error('INVALID_ZIP');
  const total = buf.readUInt16LE(eocd + 10);
  if (total > OFFICE_LIMITS.maxZipEntries) throw new Error('ZIP_TOO_MANY_ENTRIES');
  let ptr = buf.readUInt32LE(eocd + 16);
  let expandedTotal = 0;
  const out = new Map();

  for (let i = 0; i < total && ptr + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error('INVALID_CENTRAL_HEADER');
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const uncompSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const nameEnd = ptr + 46 + nameLen;
    if (nameEnd > buf.length) throw new Error('INVALID_ZIP_NAME');
    const name = buf.subarray(ptr + 46, nameEnd).toString('utf8');

    if (wanted(name)) {
      if (uncompSize > OFFICE_LIMITS.maxEntryUncompressed) throw new Error('ZIP_ENTRY_TOO_LARGE');
      expandedTotal += uncompSize;
      if (expandedTotal > OFFICE_LIMITS.maxTotalUncompressed) throw new Error('ZIP_EXPANSION_TOO_LARGE');
      if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('INVALID_LOCAL_HEADER');
      const localNameLen = buf.readUInt16LE(localOffset + 26);
      const localExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLen + localExtraLen;
      const end = start + compSize;
      if (start < 0 || end > buf.length) throw new Error('INVALID_ZIP_BOUNDS');
      const compressed = buf.subarray(start, end);
      let data;
      if (method === 0) data = compressed;
      else if (method === 8) data = inflateRawSync(compressed, { maxOutputLength: OFFICE_LIMITS.maxEntryUncompressed });
      else throw new Error('UNSUPPORTED_COMPRESSION');
      if (data.length > OFFICE_LIMITS.maxEntryUncompressed) throw new Error('ZIP_ENTRY_TOO_LARGE');
      out.set(name, data);
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
function xmlAttr(attrs = '', name = '') {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(attrs).match(new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`, 'i'));
  return decodeXml(match?.[1] || '');
}
function textNodes(xml = '') {
  const out = [];
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi;
  let match;
  while ((match = re.exec(xml))) out.push(decodeXml(match[1].replace(/<[^>]+>/g, '')));
  return out.join('');
}
function colIndex(ref = 'A1') {
  const letters = String(ref).match(/^[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return Math.max(0, n - 1);
}
function normalizeZipPath(path = '') {
  const out = [];
  for (const part of String(path).replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}
function parseDocx(buf) {
  const map = unzipEntries(buf, name => name === 'word/document.xml');
  const xml = map.get('word/document.xml');
  if (!xml) throw new Error('DOCX_DOCUMENT_XML_MISSING');
  return stripXml(xml.toString('utf8')).slice(0, 120000);
}
function parsePptx(buf) {
  const map = unzipEntries(buf, name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  const slides = [...map.entries()]
    .sort((a, b) => Number(a[0].match(/slide(\d+)/)?.[1] || 0) - Number(b[0].match(/slide(\d+)/)?.[1] || 0))
    .slice(0, 100)
    .map(([, data], i) => `[Slide ${i + 1}]\n${stripXml(data.toString('utf8'))}`);
  if (!slides.length) throw new Error('PPTX_SLIDES_MISSING');
  return slides.join('\n\n').slice(0, 120000);
}
function parseXlsx(buf) {
  const map = unzipEntries(buf, name =>
    name === 'xl/sharedStrings.xml' ||
    name === 'xl/workbook.xml' ||
    name === 'xl/_rels/workbook.xml.rels' ||
    /^xl\/worksheets\/sheet\d+\.xml$/.test(name)
  );
  const workbook = map.get('xl/workbook.xml');
  if (!workbook) throw new Error('XLSX_WORKBOOK_MISSING');

  const shared = [];
  const sharedXml = map.get('xl/sharedStrings.xml')?.toString('utf8') || '';
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let si;
  while ((si = siRe.exec(sharedXml)) && shared.length < 200000) shared.push(textNodes(si[1]));

  const relMap = new Map();
  const relsXml = map.get('xl/_rels/workbook.xml.rels')?.toString('utf8') || '';
  const relRe = /<Relationship\b([^>]*)\/?\s*>/gi;
  let rel;
  while ((rel = relRe.exec(relsXml))) {
    const id = xmlAttr(rel[1], 'Id');
    const target = xmlAttr(rel[1], 'Target');
    if (id && target) relMap.set(id, target);
  }

  const workbookXml = workbook.toString('utf8');
  const sheetRe = /<sheet\b([^>]*)\/?\s*>/gi;
  const parts = [];
  let sheet;
  let sheetCount = 0;
  let charCount = 0;
  while ((sheet = sheetRe.exec(workbookXml)) && sheetCount < 20 && charCount < 180000) {
    const name = xmlAttr(sheet[1], 'name') || `Sheet ${sheetCount + 1}`;
    const rid = xmlAttr(sheet[1], 'r:id');
    const target = relMap.get(rid) || `worksheets/sheet${sheetCount + 1}.xml`;
    const path = normalizeZipPath(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
    const data = map.get(path);
    sheetCount += 1;
    if (!data) continue;

    const header = `[Sheet: ${name}]`;
    parts.push(header);
    charCount += header.length + 1;
    const xml = data.toString('utf8');
    const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
    let row;
    let rowCount = 0;
    while ((row = rowRe.exec(xml)) && rowCount < 1500 && charCount < 180000) {
      const cells = [];
      const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
      let cell;
      while ((cell = cellRe.exec(row[1]))) {
        const ref = xmlAttr(cell[1], 'r') || 'A1';
        const type = xmlAttr(cell[1], 't');
        const idx = colIndex(ref);
        if (idx > 16383) continue;
        const body = cell[2];
        const valueMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
        const raw = decodeXml(valueMatch?.[1]?.replace(/<[^>]+>/g, '') || '');
        let value = raw;
        if (type === 's') value = shared[Number(raw)] || '';
        else if (type === 'inlineStr') value = textNodes(body);
        else if (type === 'b') value = raw === '1' ? 'TRUE' : raw === '0' ? 'FALSE' : raw;
        cells[idx] = String(value).replace(/\t/g, ' ');
      }
      const line = cells.map(v => v ?? '').join('\t');
      parts.push(line);
      charCount += line.length + 1;
      rowCount += 1;
    }
  }
  if (!parts.length) throw new Error('XLSX_SHEETS_MISSING');
  return parts.join('\n').slice(0, 160000);
}

export function parseOfficeBuffer(extension, data) {
  const ext = String(extension || '').toLowerCase();
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || []);
  if (!['docx', 'xlsx', 'pptx'].includes(ext)) throw new Error('UNSUPPORTED_FILE_TYPE');
  if (!buffer.length || buffer.length > OFFICE_LIMITS.maxFileBytes) throw new Error('FILE_TOO_LARGE');
  if (ext === 'docx') return parseDocx(buffer);
  if (ext === 'pptx') return parsePptx(buffer);
  return parseXlsx(buffer);
}
