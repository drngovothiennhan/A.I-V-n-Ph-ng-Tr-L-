import { OFFICE_LIMITS, parseOfficeBuffer } from './_office-ingest.js';

const SUPPORTED = new Set(['docx', 'xlsx', 'pptx']);

function ext(name = '') {
  return String(name).split('.').pop()?.toLowerCase() || '';
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    const name = String(req.body?.name || '').slice(0, 180);
    const extension = ext(name);
    if (!SUPPORTED.has(extension)) {
      return res.status(400).json({ error: 'UNSUPPORTED_FILE_TYPE', supported: [...SUPPORTED] });
    }

    const b64 = String(req.body?.dataBase64 || '');
    const maxBase64 = Math.ceil(OFFICE_LIMITS.maxFileBytes * 4 / 3) + 1000;
    if (!b64 || b64.length > maxBase64) {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', maxBytes: OFFICE_LIMITS.maxFileBytes });
    }

    const data = Buffer.from(b64, 'base64');
    if (!data.length || data.length > OFFICE_LIMITS.maxFileBytes) {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', maxBytes: OFFICE_LIMITS.maxFileBytes });
    }

    const text = parseOfficeBuffer(extension, data);
    return res.status(200).json({
      name,
      extension,
      text,
      textLength: text.length,
      parser: `office-v24-safe-${extension}`
    });
  } catch (error) {
    console.error('ingest_error', { message: String(error?.message || error).slice(0, 220) });
    return res.status(422).json({ error: 'FILE_PARSE_FAILED' });
  }
}
