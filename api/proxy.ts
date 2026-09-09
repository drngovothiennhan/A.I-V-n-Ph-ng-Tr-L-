import type { VercelRequest, VercelResponse } from '@vercel/node';
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BODY = 64 * 1024;
const ALLOWED_OPS = new Set(['chief', 'web', 'artifact']);

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168);
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:');
  }
  return true;
}

async function assertPublicUrl(raw: string) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('UNSUPPORTED_PROTOCOL');
  if (url.username || url.password) throw new Error('URL_CREDENTIALS_FORBIDDEN');
  const host = url.hostname.toLowerCase();
  if (['localhost', '0.0.0.0'].includes(host) || host.endsWith('.local')) throw new Error('PRIVATE_HOST_FORBIDDEN');
  const answers = await dns.lookup(host, { all: true, verbatim: true });
  if (!answers.length || answers.some((a) => isPrivateIp(a.address))) throw new Error('PRIVATE_IP_FORBIDDEN');
  return url;
}

function cleanText(input: unknown, max = 12000) {
  return String(input ?? '').replace(/\0/g, '').slice(0, max);
}

async function chief(body: any) {
  const message = cleanText(body?.message, 16000);
  if (!message) return { reply: '' };

  const key = process.env.GEMINI_API_KEY;
  if (!key) return { reply: '', provider: 'local', fallback: true };

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`);
  endpoint.searchParams.set('key', key);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
    }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) return { reply: '', provider: 'local', fallback: true, upstreamStatus: response.status };
  const data: any = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '';
  return { reply, provider: 'gemini', fallback: false };
}

async function webRead(body: any) {
  const url = await assertPublicUrl(cleanText(body?.url, 2048));
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'AI-Office/1.7 (+https://ai-van-phong-tro-ly.vercel.app)' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!/text|json|xml|html/i.test(type)) throw new Error('UNSUPPORTED_CONTENT_TYPE');
  const raw = (await response.text()).slice(0, 250000);
  const text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30000);
  return { url: url.toString(), text, contentType: type };
}

async function artifact(body: any, res: VercelResponse) {
  const format = cleanText(body?.format, 12).toLowerCase();
  const title = cleanText(body?.title || body?.fileName || 'AI Office', 160);
  const content = cleanText(body?.content, 50000);

  if (format === 'docx') {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
      ...content.split(/\r?\n/).map((line) => new Paragraph({ children: [new TextRun(line)] }))
    ] }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(title)}.docx`);
    return res.status(200).send(buffer);
  }

  if (format === 'xlsx') {
    const XLSX = await import('xlsx');
    const rows = content.split(/\r?\n/).map((line) => [line]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['A.I Văn phòng'], [title], ...rows]), 'Output');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(title)}.xlsx`);
    return res.status(200).send(buffer);
  }

  if (format === 'pptx') {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'A.I Văn phòng';
    pptx.subject = title;
    const slide = pptx.addSlide();
    slide.addText(title, { x: 0.65, y: 0.55, w: 12, h: 0.6, fontSize: 26, bold: true, color: '1E2B50' });
    slide.addText(content.slice(0, 5000), { x: 0.7, y: 1.4, w: 11.8, h: 5.2, fontSize: 15, color: '34415F', breakLine: false, margin: 0.08 });
    const output: any = await pptx.write({ outputType: 'nodebuffer' });
    const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output);
    res.setHeader('content-type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(title)}.pptx`);
    return res.status(200).send(buffer);
  }

  return res.status(400).json({ error: 'UNSUPPORTED_ARTIFACT_FORMAT', supported: ['docx', 'xlsx', 'pptx'] });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const op = String(req.query.op || '');
  if (!ALLOWED_OPS.has(op)) return res.status(400).json({ error: 'INVALID_OP' });

  const size = Number(req.headers['content-length'] || 0);
  if (size > MAX_BODY) return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });

  try {
    if (op === 'chief') return res.status(200).json(await chief(req.body));
    if (op === 'web') return res.status(200).json(await webRead(req.body));
    if (op === 'artifact') return artifact(req.body, res);
    return res.status(400).json({ error: 'INVALID_OP' });
  } catch (error: any) {
    console.error('proxy_error', { op, message: String(error?.message || error).slice(0, 300) });
    return res.status(502).json({ error: 'OPERATION_FAILED', op });
  }
}
