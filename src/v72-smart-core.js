export const V72_SMART_CORE_VERSION = '7.2.0-smart-answer-clean-ux';

const LIVE_HINTS = /\b(hom nay|bay gio|hien tai|moi nhat|gan day|vua moi|tin moi|tin tuc|thoi su|gia vang|ty gia|gia co phieu|chung khoan|ket qua tran|ti so|lich thi dau|thoi tiet|nhiet do|du bao|dang mo cua|open now|today|current|latest|recent|news|weather|price|score)\b/i;
const INTERNAL_HINTS = /\b(trong drive|tren drive|drive brain|tai lieu noi bo|tai lieu cua co quan|kho kien thuc|knowledge base|google drive|du lieu co quan|du lieu to chuc|theo tai lieu toi|tai lieu toi)\b/i;
const FAILURE_HINTS = /\b(chua tim duoc nguon|chua co bang chung|khong du bang chung|khong the cung cap cau tra loi|khong the tra loi|nguon du lieu hien tai.*khong|chua truy cap duoc nguon|source unavailable)\b/i;
const WEATHER_HINTS = /\b(thoi tiet|nhiet do|du bao thoi tiet|mua|weather|temperature|forecast)\b/i;

export function normalizeV72(text='') {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}

export function extractQuotedInstruction(text='') {
  const raw = String(text || '');
  const patterns = [/“([^”\n]{1,1200})”/, /‘([^’\n]{1,1200})’/, /"([^"\n]{1,1200})"/, /'([^'\n]{1,1200})'/];
  for (const re of patterns) {
    const match = raw.match(re);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return '';
}

export function metaQuestionAnswer(text='', classifier) {
  const quoted = extractQuotedInstruction(text);
  if (!quoted || typeof classifier !== 'function') return '';
  const nested = classifier(quoted, { hasActiveTask:false }) || {};
  const mode = String(nested.mode || '').toLowerCase();
  if (mode === 'task' || mode === 'hybrid') return 'Nhiệm vụ. Câu được trích dẫn yêu cầu A.I thực hiện một hành động, không chỉ cung cấp thông tin.';
  if (mode === 'control') return 'Lệnh điều khiển. Câu được trích dẫn dùng để điều khiển trạng thái hoặc tác vụ của hệ thống.';
  if (mode === 'question' || mode === 'casual') return 'Câu hỏi. Câu được trích dẫn chủ yếu yêu cầu cung cấp hoặc giải thích thông tin.';
  return 'Câu hỏi. Không có tín hiệu đủ mạnh để coi nội dung được trích dẫn là một tác vụ thực thi.';
}

export function requiresLiveEvidence(text='') {
  return LIVE_HINTS.test(normalizeV72(text));
}

export function requestsInternalKnowledge(text='') {
  return INTERNAL_HINTS.test(normalizeV72(text));
}

export function isWeatherQuestion(text='') {
  return WEATHER_HINTS.test(normalizeV72(text));
}

export function answerLooksLikeFailure(text='') {
  return FAILURE_HINTS.test(normalizeV72(text));
}

export function shouldSmartIntercept(text='', intent={}, options={}) {
  if (String(intent?.mode || '') !== 'question') return false;
  if (options.internalOptIn || requestsInternalKnowledge(text)) return false;
  if (isWeatherQuestion(text)) return false;
  return true;
}

export function cleanTaskRecord(task={}) {
  if (!task || typeof task !== 'object') return { changed:false, task };
  const original = String(task.originalMessage || '').trim();
  const title = String(task.title || '').trim();
  if (!original || !title) return { changed:false, task };
  const nextTitle = original.slice(0,180);
  if (title === nextTitle) return { changed:false, task };
  const normalizedTitle = normalizeV72(title);
  const normalizedOriginal = normalizeV72(original).slice(0,60);
  const routedPrefix = /^(soan )?van ban hanh chinh\b|^xu ly du lieu\b|^tao trinh bay powerpoint\b|^tao hinh anh\b|^trien khai phan mem\b|^nghien cuu tra cuu nguon\b|^thuc hien nhiem vu\b/.test(normalizedTitle);
  if (!routedPrefix && normalizedOriginal && !normalizedTitle.includes(normalizedOriginal)) return { changed:false, task };
  return { changed:true, task:{ ...task, title:nextTitle } };
}
