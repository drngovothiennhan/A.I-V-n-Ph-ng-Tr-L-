import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const MIME: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

function cleanText(input: unknown, max = 80000) {
  return String(input ?? '').replace(/\0/g, '').replace(/\r\n/g, '\n').slice(0, max);
}
function safeName(input: unknown) {
  return cleanText(input || 'AI Office', 120).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'AI Office';
}
function linesOf(content: unknown) {
  return cleanText(content).split('\n').map((x) => x.trimEnd());
}
function isRomanHeading(line: string) {
  return /^(?:[IVXLCDM]+|\d+)\.[ \t]+\S/i.test(line.trim());
}
function isAllCapsHeading(line: string) {
  const t = line.trim();
  if (t.length < 4 || t.length > 100) return false;
  const letters = t.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
  return letters.length >= 4 && letters === letters.toUpperCase();
}
function classifyLine(line: string) {
  const t = line.trim();
  if (!t) return 'blank';
  if (/^[-•]\s+/.test(t)) return 'bullet';
  if (isRomanHeading(t) || isAllCapsHeading(t)) return 'heading';
  return 'body';
}
function parseDelimited(content: unknown) {
  const raw = linesOf(content).filter(Boolean);
  if (!raw.length) return [['Nội dung']];
  const markdown = raw.filter((x) => /^\s*\|.*\|\s*$/.test(x));
  if (markdown.length >= 2) {
    const rows = markdown
      .filter((x) => !/^\s*\|?\s*:?-{3,}/.test(x.replace(/\|\s*\|/g, '|')))
      .map((x) => x.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
    if (rows.length >= 2) return rows;
  }
  const candidates = ['\t', ';', ','];
  for (const delimiter of candidates) {
    const sample = raw.slice(0, Math.min(8, raw.length));
    const counts = sample.map((line) => line.split(delimiter).length);
    const good = counts.filter((n) => n >= 2);
    if (good.length >= Math.min(3, sample.length) && Math.max(...good) - Math.min(...good) <= 2) {
      return raw.map((line) => line.split(delimiter).map((c) => c.trim()));
    }
  }
  return [['STT', 'Nội dung'], ...raw.map((line, i) => [i + 1, line])];
}
function coerceCell(value: unknown): string | number {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/^0\d+$/.test(s)) return s;
  if (/^-?\d+(?:[.,]\d+)?%$/.test(s)) return Number(s.replace('%', '').replace(',', '.')) / 100;
  if (/^-?\d+(?:[.,]\d+)?$/.test(s) && s.length < 16) return Number(s.replace(',', '.'));
  return s;
}
function sectionsFromContent(content: unknown, title: string) {
  const lines = linesOf(content);
  const sections: Array<{ title: string; bullets: string[] }> = [];
  let current = { title: title || 'Nội dung', bullets: [] as string[] };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const type = classifyLine(line);
    if (type === 'heading' && current.bullets.length) {
      sections.push(current);
      current = { title: line.replace(/^[-•]\s+/, ''), bullets: [] };
      continue;
    }
    if (type === 'heading' && !current.bullets.length && sections.length === 0 && current.title === title) {
      current.title = line;
      continue;
    }
    current.bullets.push(line.replace(/^[-•]\s+/, ''));
  }
  if (current.bullets.length || !sections.length) sections.push(current);
  return sections;
}

async function buildDocx({ title, content, administrative = false }: { title: string; content: string; administrative?: boolean }) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageOrientation } = await import('docx');
  const children: any[] = [];
  for (const raw of linesOf(content)) {
    const line = raw.trim();
    if (!line) {
      children.push(new Paragraph({ children: [] }));
      continue;
    }
    const type = classifyLine(line);
    const isCountry = /CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM|Độc lập\s*-\s*Tự do\s*-\s*Hạnh phúc/i.test(line);
    const isTitle = type === 'heading' && (isAllCapsHeading(line) || /^(KẾ HOẠCH|BÁO CÁO|CÔNG VĂN|TỜ TRÌNH|THÔNG BÁO|QUYẾT ĐỊNH|BIÊN BẢN|GIẤY MỜI)/i.test(line));
    const bullet = type === 'bullet';
    const text = line.replace(/^[-•]\s+/, '');
    children.push(new Paragraph({
      alignment: (isCountry || isTitle) ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      heading: type === 'heading' && !isTitle ? HeadingLevel.HEADING_2 : undefined,
      bullet: bullet ? { level: 0 } : undefined,
      indent: (!bullet && type === 'body') ? { firstLine: 720 } : undefined,
      spacing: { before: 0, after: type === 'heading' ? 120 : 60, line: administrative ? 276 : 300 },
      children: [new TextRun({ text, bold: type === 'heading' || isCountry || isTitle, size: isTitle ? 30 : 26, font: 'Times New Roman' })]
    }));
  }
  if (!children.length) children.push(new Paragraph({ text: title }));
  const doc = new Document({
    creator: 'A.I Văn phòng',
    title,
    description: 'Sản phẩm được tạo bởi A.I Văn phòng v1.9 Artifact Engine',
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 26 }, paragraph: { spacing: { after: 60, line: 276 } } } },
      paragraphStyles: [{ id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { bold: true, font: 'Times New Roman', size: 26 }, paragraph: { spacing: { before: 120, after: 60 } } }]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: administrative ? { top: 1134, right: 1134, bottom: 1134, left: 1701 } : { top: 1134, right: 1134, bottom: 1134, left: 1417 }
        }
      },
      children
    }]
  });
  return Packer.toBuffer(doc);
}

async function buildXlsx({ title, content, rows, sheetName }: { title: string; content: string; rows?: unknown[][]; sheetName?: string }) {
  const XLSX = await import('xlsx');
  const data = Array.isArray(rows) && rows.length
    ? rows.map((r) => Array.isArray(r) ? r.map(coerceCell) : [coerceCell(r)])
    : parseDelimited(content).map((r) => r.map(coerceCell));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  const widthCount = Math.max(1, ...data.map((r) => r.length));
  ws['!cols'] = Array.from({ length: widthCount }, (_, c) => {
    const max = Math.max(8, ...data.slice(0, 250).map((r) => String(r[c] ?? '').length));
    return { wch: Math.min(45, max + 2) };
  });
  if (data.length > 1 && data[0].length > 1) {
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length - 1, c: data[0].length - 1 } }) };
  }
  const name = safeName(sheetName || 'Dữ liệu').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, name);
  const summary = XLSX.utils.aoa_to_sheet([
    ['A.I Văn phòng v1.9'],
    ['Tên sản phẩm', title],
    ['Số dòng dữ liệu', Math.max(0, data.length - 1)],
    ['Số cột', widthCount],
    ['Tạo lúc', new Date().toISOString()]
  ]);
  summary['!cols'] = [{ wch: 22 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, summary, 'Thông tin');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
}

async function buildPptx({ title, content }: { title: string; content: string }) {
  const PptxGenJS = require('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'A.I Văn phòng';
  pptx.company = 'A.I Văn phòng';
  pptx.subject = title;
  pptx.title = title;
  pptx.lang = 'vi-VN';
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'vi-VN' };

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: 'F6F8FF' };
  titleSlide.addText(title, { x: 0.75, y: 2.35, w: 11.8, h: 1.15, fontSize: 28, bold: true, color: '152449', align: 'center', margin: 0.05, fit: 'shrink' });
  titleSlide.addText('A.I Văn phòng · v1.9', { x: 0.75, y: 3.75, w: 11.8, h: 0.35, fontSize: 13, color: '60708F', align: 'center' });

  for (const section of sectionsFromContent(content, title).slice(0, 18)) {
    const chunks: string[][] = [];
    let chunk: string[] = [];
    let chars = 0;
    for (const item of section.bullets) {
      if (chunk.length >= 7 || chars + item.length > 850) { chunks.push(chunk); chunk = []; chars = 0; }
      chunk.push(item); chars += item.length;
    }
    if (chunk.length) chunks.push(chunk);
    for (let i = 0; i < Math.max(1, chunks.length); i++) {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      const heading = chunks.length > 1 ? `${section.title} (${i + 1}/${chunks.length})` : section.title;
      slide.addText(heading, { x: 0.65, y: 0.45, w: 12.0, h: 0.62, fontSize: 23, bold: true, color: '1E2B50', margin: 0.02, fit: 'shrink' });
      slide.addShape(pptx.ShapeType.line, { x: 0.65, y: 1.17, w: 12, h: 0, line: { color: 'DCE5F7', width: 1 } });
      const bullets = (chunks[i] || ['Không có nội dung chi tiết.']).map((text) => ({ text, options: { bullet: { indent: 16 }, hanging: 4, breakLine: true } }));
      slide.addText(bullets, { x: 0.82, y: 1.45, w: 11.6, h: 5.35, fontSize: 17, color: '34415F', valign: 'top', margin: 0.06, fit: 'shrink', paraSpaceAfterPt: 8 });
      slide.addText('A.I Văn phòng', { x: 10.5, y: 7.05, w: 1.9, h: 0.2, fontSize: 8, color: '8A93AC', align: 'right' });
    }
  }
  const output = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

export async function createArtifact(body: any = {}) {
  const format = cleanText(body.format, 12).toLowerCase();
  if (!MIME[format]) {
    const error: any = new Error('UNSUPPORTED_ARTIFACT_FORMAT');
    error.code = 'UNSUPPORTED_ARTIFACT_FORMAT';
    error.supported = Object.keys(MIME);
    throw error;
  }
  const title = safeName(body.title || body.fileName || 'AI Office');
  const content = cleanText(body.content, 80000);
  const input = { title, content, rows: body.rows, sheetName: body.sheetName, administrative: Boolean(body.administrative) };
  let buffer: Buffer;
  if (format === 'docx') buffer = await buildDocx(input);
  else if (format === 'xlsx') buffer = await buildXlsx(input);
  else buffer = await buildPptx(input);
  return { buffer, mime: MIME[format], fileName: `${title}.${format}`, format };
}
