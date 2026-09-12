import image from './image';

function json(res, status, body) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  return res.status(status).json(body);
}
function firstHeader(value = '') {
  return String(value || '').split(',')[0].trim().toLowerCase();
}
function sameOriginResourceRequest(req) {
  const host = firstHeader(req.headers?.['x-forwarded-host'] || req.headers?.host || '');
  const referer = String(req.headers?.referer || '');
  if (!host || !referer) return false;
  let refererHost = '';
  try { refererHost = new URL(referer).host.toLowerCase(); } catch { return false; }
  if (refererHost !== host) return false;
  const site = firstHeader(req.headers?.['sec-fetch-site'] || '');
  const mode = firstHeader(req.headers?.['sec-fetch-mode'] || '');
  const dest = firstHeader(req.headers?.['sec-fetch-dest'] || '');
  if (site && site !== 'same-origin') return false;
  if (mode && !['cors', 'same-origin'].includes(mode)) return false;
  if (dest && dest !== 'empty') return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }
  const contentType = firstHeader(req.headers?.['content-type'] || '');
  if (!contentType.startsWith('application/json')) {
    return json(res, 415, { error: 'JSON_CONTENT_TYPE_REQUIRED' });
  }
  if (!sameOriginResourceRequest(req)) {
    return json(res, 403, {
      error: 'AI_RESOURCE_SAME_ORIGIN_REQUIRED',
      providerCallMade: false
    });
  }
  return image(req, res);
}
