const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function cleanText(input, max = 80000) {
  return String(input ?? '').replace(/\0/g, '').replace(/\r\n/g, '\n').slice(0, max);
}
function safeName(input) {
  return cleanText(input || 'AI Office', 120).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'AI Office';
}
function xmlEscape(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n & 0xffff, 0); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b; }
function crc32(data) {
  let c = 0xffffffff;
  for (const x of data) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, value] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, 'utf8');
    const data = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc),
      u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data
    ]);
    locals.push(local);
    const central = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc),
      u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), nameBytes
    ]);
    centrals.push(central);
    offset += local.length;
  }
  const centralBlock = Buffer.concat(centrals);
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(centrals.length), u16(centrals.length),
    u32(centralBlock.length), u32(offset), u16(0)
  ]);
  return Buffer.concat([...locals, centralBlock, eocd]);
}

function classifyLine(line) {
  const t = String(line || '').trim();
  if (!t) return 'blank';
  if (/^[-•]\s+/.test(t)) return 'bullet';
  if (/^(?:[IVXLCDM]+|\d+)\.[ \t]+\S/i.test(t)) return 'heading';
  const letters = t.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
  if (t.length <= 100 && letters.length >= 4 && letters === letters.toUpperCase()) return 'heading';
  return 'body';
}
function linesOf(content) { return cleanText(content).split('\n').map(x => x.trimEnd()); }

export function buildDocx({ title, content, administrative = false }) {
  const paras = linesOf(content).map((raw) => {
    const line = raw.trim();
    if (!line) return '<w:p/>';
    const type = classifyLine(line);
    const bullet = type === 'bullet';
    const text = line.replace(/^[-•]\s+/, '');
    const isCenter = type === 'heading' && (/^(CỘNG HÒA|Độc lập|KẾ HOẠCH|BÁO CÁO|CÔNG VĂN|TỜ TRÌNH|THÔNG BÁO|QUYẾT ĐỊNH|BIÊN BẢN|GIẤY MỜI)/i.test(text) || text === text.toUpperCase());
    const pPr = [
      isCenter ? '<w:jc w:val="center"/>' : '<w:jc w:val="both"/>',
      type === 'body' ? '<w:ind w:firstLine="720"/>' : '',
      `<w:spacing w:after="${type === 'heading' ? 120 : 60}" w:line="${administrative ? 276 : 300}" w:lineRule="auto"/>`
    ].join('');
    const rPr = `<w:rPr>${type === 'heading' ? '<w:b/>' : ''}<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="${type === 'heading' ? 28 : 26}"/></w:rPr>`;
    return `<w:p><w:pPr>${pPr}</w:pPr><w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(bullet ? `• ${text}` : text)}</w:t></w:r></w:p>`;
  }).join('');
  const margins = administrative
    ? 'w:top="1134" w:right="1134" w:bottom="1134" w:left="1701"'
    : 'w:top="1134" w:right="1134" w:bottom="1134" w:left="1417"';
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>A.I Văn phòng</dc:creator></cp:coreProperties>`,
    'word/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/></w:rPr></w:style></w:styles>',
    'word/_rels/document.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras || '<w:p/>'}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar ${margins} w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`
  };
  return zipStore(files);
}

function parseDelimited(content) {
  const raw = linesOf(content).map(x => x.trim()).filter(Boolean);
  if (!raw.length) return [['Nội dung']];
  const markdown = raw.filter(x => /^\|.*\|$/.test(x));
  if (markdown.length >= 2) {
    const rows = markdown
      .filter(x => !/^\|?\s*:?-{3,}/.test(x.replace(/\|\s*\|/g, '|')))
      .map(x => x.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    if (rows.length >= 2) return rows;
  }
  for (const delimiter of ['\t', ';', ',']) {
    const sample = raw.slice(0, 8);
    const counts = sample.map(line => line.split(delimiter).length);
    const good = counts.filter(n => n >= 2);
    if (good.length >= Math.min(3, sample.length) && Math.max(...good) - Math.min(...good) <= 2) {
      return raw.map(line => line.split(delimiter).map(c => c.trim()));
    }
  }
  return [['STT', 'Nội dung'], ...raw.map((line, i) => [String(i + 1), line])];
}
function colName(n) {
  let s = '';
  for (n += 1; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
function numeric(value) {
  const s = String(value ?? '').trim();
  if (!s || /^0\d+$/.test(s)) return null;
  if (/^-?\d+(?:[.,]\d+)?%$/.test(s)) return Number(s.replace('%', '').replace(',', '.')) / 100;
  if (/^-?\d+(?:[.,]\d+)?$/.test(s) && s.length < 16) return Number(s.replace(',', '.'));
  return null;
}
function xlsxSheetXml(data) {
  const maxCols = Math.max(1, ...data.map(row => row.length));
  const rows = data.map((row, r) => `<row r="${r + 1}">${Array.from({ length: maxCols }, (_, c) => {
    const value = row[c] ?? '';
    const ref = `${colName(c)}${r + 1}`;
    const num = numeric(value);
    if (num !== null) return `<c r="${ref}"${r === 0 ? ' s="1"' : ''}><v>${num}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${r === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const widths = Array.from({ length: maxCols }, (_, c) => {
    const max = Math.max(8, ...data.slice(0, 300).map(row => String(row[c] ?? '').length));
    return `<col min="${c + 1}" max="${c + 1}" width="${Math.min(45, max + 2)}" customWidth="1"/>`;
  }).join('');
  const ref = `A1:${colName(maxCols - 1)}${Math.max(1, data.length)}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${rows}</sheetData>${data.length > 1 && maxCols > 1 ? `<autoFilter ref="${ref}"/>` : ''}</worksheet>`;
}
export function buildXlsx({ title, content, rows, sheetName = 'Dữ liệu' }) {
  const data = Array.isArray(rows) && rows.length
    ? rows.map(row => Array.isArray(row) ? row : [row])
    : parseDelimited(content);
  const summary = [
    ['A.I Văn phòng'],
    ['Tên sản phẩm', title],
    ['Số dòng dữ liệu', String(Math.max(0, data.length - 1))],
    ['Số cột', String(Math.max(1, ...data.map(row => row.length)))],
    ['Tạo lúc', new Date().toISOString()]
  ];
  const safeSheet = safeName(sheetName).slice(0, 31).replace(/[\[\]*?:\\/]/g, '-') || 'Dữ liệu';
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>A.I Văn phòng</dc:creator></cp:coreProperties>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(safeSheet)}" sheetId="1" r:id="rId1"/><sheet name="Thông tin" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    'xl/worksheets/sheet1.xml': xlsxSheetXml(data),
    'xl/worksheets/sheet2.xml': xlsxSheetXml(summary)
  };
  return zipStore(files);
}

function sectionsFromContent(content, title) {
  const sections = [];
  let current = { title: title || 'Nội dung', bullets: [] };
  for (const raw of linesOf(content)) {
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
function textRuns(lines, fontSize = 1800, bold = false) {
  return lines.map(text => `<a:p><a:r><a:rPr lang="vi-VN" sz="${fontSize}"${bold ? ' b="1"' : ''}/><a:t>${xmlEscape(text)}</a:t></a:r><a:endParaRPr lang="vi-VN" sz="${fontSize}"/></a:p>`).join('');
}
function shape(id, name, x, y, w, h, lines, { title = false } = {}) {
  const paragraphs = Array.isArray(lines) ? lines : [String(lines ?? '')];
  const body = title
    ? textRuns(paragraphs, 2600, true)
    : paragraphs.map((text, i) => `<a:p><a:pPr marL="${i ? 342900 : 0}" indent="${i ? -171450 : 0}"${i ? '><a:buChar char="•"/></a:pPr>' : '/>'}<a:r><a:rPr lang="vi-VN" sz="1800"/><a:t>${xmlEscape(text)}</a:t></a:r><a:endParaRPr lang="vi-VN" sz="1800"/></a:p>`).join('');
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlEscape(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" rtlCol="0" anchor="t"/><a:lstStyle/>${body}</p:txBody></p:sp>`;
}
function slideXml(title, items, isTitle = false) {
  const shapes = [shape(2, 'Title', 650000, isTitle ? 2050000 : 350000, 10800000, isTitle ? 1200000 : 650000, [title], { title: true })];
  if (isTitle) shapes.push(shape(3, 'Subtitle', 650000, 3500000, 10800000, 500000, ['A.I Văn phòng · Product Completion V2.4']));
  else shapes.push(shape(3, 'Body', 800000, 1250000, 10400000, 4900000, items.length ? items : ['Không có nội dung chi tiết.']));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}
export function buildPptx({ title, content }) {
  const slides = [{ title, items: [], isTitle: true }];
  for (const section of sectionsFromContent(content, title).slice(0, 18)) {
    let chunk = [];
    let chars = 0;
    for (const item of section.bullets) {
      if (chunk.length >= 7 || chars + item.length > 850) {
        slides.push({ title: section.title, items: chunk, isTitle: false });
        chunk = [];
        chars = 0;
      }
      chunk.push(item);
      chars += item.length;
    }
    if (chunk.length || !section.bullets.length) slides.push({ title: section.title, items: chunk, isTitle: false });
  }
  const slideOverrides = slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('');
  const slideIds = slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('');
  const presentationRels = slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('');
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${slideOverrides}</Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>A.I Văn phòng</dc:creator></cp:coreProperties>`,
    'ppt/presentation.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    'ppt/_rels/presentation.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${presentationRels}</Relationships>`,
    'ppt/slideMasters/slideMaster1.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>',
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>',
    'ppt/slideLayouts/slideLayout1.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>',
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>',
    'ppt/theme/theme1.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>'
  };
  slides.forEach((slide, index) => {
    files[`ppt/slides/slide${index + 1}.xml`] = slideXml(slide.title, slide.items, slide.isTitle);
    files[`ppt/slides/_rels/slide${index + 1}.xml.rels`] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>';
  });
  return zipStore(files);
}

export function createOfficeArtifact(body = {}) {
  const format = cleanText(body.format, 12).toLowerCase();
  if (!MIME[format]) {
    const error = new Error('UNSUPPORTED_ARTIFACT_FORMAT');
    error.code = 'UNSUPPORTED_ARTIFACT_FORMAT';
    error.supported = Object.keys(MIME);
    throw error;
  }
  const title = safeName(body.title || body.fileName || 'AI Office');
  const input = {
    title,
    content: cleanText(body.content, 80000),
    rows: body.rows,
    sheetName: body.sheetName,
    administrative: Boolean(body.administrative)
  };
  const buffer = format === 'docx' ? buildDocx(input) : format === 'xlsx' ? buildXlsx(input) : buildPptx(input);
  return { buffer, mime: MIME[format], fileName: `${title}.${format}`, format };
}
