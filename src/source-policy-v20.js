const INTERNAL_HINTS = [
  'trong drive','trên drive','drive brain','tài liệu tôi','tài liệu đã','hồ sơ tôi','nội bộ',
  'cơ quan tôi','đơn vị tôi','mẫu của tôi','mẫu đã cung cấp','theo tài liệu','theo kế hoạch tôi'
];

const ADMIN_DOC_HINTS = [
  'kế hoạch','báo cáo','công văn','tờ trình','thông báo','quyết định','biên bản','giấy mời'
];

const MEDICAL_HINTS = [
  'bệnh','thuốc','y học','y tế','sức khỏe','triệu chứng','điều trị','chẩn đoán',
  'dược','sinh lý','giải phẫu','xét nghiệm','medicine','health','disease','drug','therapy'
];

const RESEARCH_HINTS = [
  'tra cứu','nghiên cứu','tìm nguồn','kiểm chứng','nguồn chính thức','mới nhất','hiện nay','cập nhật','hôm nay'
];

const ACTION_PREFIX = /^(hãy\s+|vui lòng\s+|giúp tôi\s+)?(soạn|lập|tạo|viết|xuất|lọc|đối chiếu|phân tích|triển khai|nâng cấp|sửa|cập nhật|kết nối|thực hiện|thi hành|chuẩn bị|gửi|đăng|xóa)\b/i;
const QUESTION_PREFIX = /^(ai|gì|nào|tại sao|vì sao|khi nào|ở đâu|bao nhiêu|mấy|thế nào|như thế nào|có phải|giải thích|cho tôi biết|thông tin|hôm nay)\b/i;

export function normalizeText(text='') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d')
    .replace(/\s+/g,' ')
    .trim();
}

export function stripMarkup(input='') {
  const raw = String(input || '');
  if (!raw) return '';
  try {
    if (typeof DOMParser !== 'undefined' && /<[^>]+>/.test(raw)) {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      return String(doc.body?.textContent || '')
        .replace(/\s+/g,' ')
        .replace(/\u00a0/g,' ')
        .trim();
    }
  } catch {}
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}

export function looksLikeQuestion(text='') {
  const raw = String(text || '').trim();
  if (!raw) return false;
  if (ACTION_PREFIX.test(raw)) return false;
  return raw.endsWith('?') || QUESTION_PREFIX.test(raw) || /\b(là gì|nghĩa là gì|vì sao|tại sao|bao nhiêu|khi nào|ở đâu|đúng không)\b/i.test(raw);
}

export function directRuntimeAnswer(text='', now = new Date()) {
  const n = normalizeText(text);
  const exactToday = /^(hom nay|hom nay la ngay gi|ngay hom nay|ngay hom nay la ngay gi|bay gio la ngay nao|nay la ngay gi)\??$/.test(n);
  const exactTime = /^(may gio|bay gio may gio|gio hien tai|bay gio la may gio)\??$/.test(n);
  const exactWeekday = /^(hom nay thu may|hom nay la thu may)\??$/.test(n);
  if (!exactToday && !exactTime && !exactWeekday) return null;
  const date = now.toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });
  const time = now.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' });
  if (exactTime) return `Bây giờ là ${time}, ${date}.`;
  if (exactWeekday) return `Hôm nay là ${date}.`;
  return `Hôm nay là ${date}.`;
}

function includesAny(n, list) {
  return list.some(x => n.includes(normalizeText(x)));
}

export function internalSourceOptIn(baseIntent={}) {
  if (baseIntent?.useInternal === true || baseIntent?.internalOptIn === true) return true;
  try {
    return typeof window !== 'undefined' && window.AIOfficeSourcePreferences?.useInternal === true;
  } catch {
    return false;
  }
}

export function classifySourcePolicy(text='', baseIntent={}) {
  const raw = String(text || '').trim();
  const n = normalizeText(raw);
  const direct = directRuntimeAnswer(raw);
  const question = looksLikeQuestion(raw) || baseIntent?.kind === 'question';
  const internalRequested = includesAny(n, INTERNAL_HINTS);
  const internalOptIn = internalSourceOptIn(baseIntent);
  const adminHint = includesAny(n, ADMIN_DOC_HINTS);
  const medical = includesAny(n, MEDICAL_HINTS);
  const research = includesAny(n, RESEARCH_HINTS);
  const explicitWeb = /\b(internet|web|truc tuyen|nguon ngoai|nguon mo|google|tim tren mang)\b/.test(n);

  if (direct) {
    return {
      mode:'direct_runtime', question:true, useDrive:false, useInternal:false, useWeb:false,
      internalOptIn:false, internalRequested:false, directAnswer:direct, priority:['runtime']
    };
  }
  if (baseIntent?.kind === 'data') {
    return {
      mode:'data_task', question:false, useDrive:false, useInternal:false, useWeb:false,
      internalOptIn:false, internalRequested:false, priority:['provided_data']
    };
  }
  if (baseIntent?.kind === 'admin' && !question) {
    return {
      mode:'admin_document', question:false, useDrive:internalOptIn, useInternal:internalOptIn, useWeb:true,
      internalOptIn, internalRequested, officialOnly:true,
      priority: internalOptIn
        ? ['gemini_google_search','drive_template_approved','drive_approved','official_web','reasoning']
        : ['gemini_google_search','official_web','reasoning']
    };
  }
  if (question && internalRequested) {
    return {
      mode: adminHint ? 'internal_admin_question' : 'internal_question',
      question:true, useDrive:internalOptIn, useInternal:internalOptIn, useWeb:true,
      internalOptIn, internalRequested:true, internalBlocked:!internalOptIn, officialOnly:adminHint,
      priority: internalOptIn
        ? ['gemini_google_search','drive_approved','drive_templates','drive_knowledge','official_web']
        : ['gemini_google_search','public_web']
    };
  }
  if (question && medical) {
    return {
      mode:'medical_question', question:true, useDrive:internalOptIn, useInternal:internalOptIn, useWeb:true,
      internalOptIn, internalRequested:false, officialOnly:false,
      priority: internalOptIn
        ? ['gemini_google_search','pubmed','who','moh','drive_approved']
        : ['gemini_google_search','pubmed','who','moh']
    };
  }
  if (question || baseIntent?.kind === 'research') {
    return {
      mode: research ? 'research_question' : 'general_question', question:true,
      useDrive:internalOptIn, useInternal:internalOptIn, useWeb:true,
      internalOptIn, internalRequested:false, officialOnly:false,
      priority: internalOptIn
        ? ['gemini_google_search','drive_approved','drive_knowledge','external_reasoning']
        : ['gemini_google_search','external_reasoning']
    };
  }
  return {
    mode: baseIntent?.kind || 'general_task', question:false,
    useDrive:internalOptIn, useInternal:internalOptIn,
    useWeb:Boolean(baseIntent?.kind === 'research' || explicitWeb),
    internalOptIn, internalRequested,
    officialOnly:Boolean(baseIntent?.kind === 'admin'),
    priority: internalOptIn ? ['task_context','drive_if_relevant','reasoning'] : ['task_context','reasoning']
  };
}

export function smartIntent(text='', baseClassifier, context={}) {
  const base = typeof baseClassifier === 'function' ? baseClassifier(text, context) : { kind:'question' };
  if (looksLikeQuestion(text)) {
    return {
      ...base, kind:'question', action:'answer', userWantsFile:false, artifactFormats:[], irreversible:false,
      confidence:Math.max(Number(base?.confidence || 0),0.97), correctedBy:'question-first-v27'
    };
  }
  return base;
}

export function rankSources(query='', sources=[], policy={}) {
  const q = normalizeText(query);
  const words = q.split(/[^a-z0-9]+/).filter(x => x.length > 2);
  return (Array.isArray(sources) ? sources : [])
    .map((source, index) => {
      const clean = stripMarkup(source?.text || source?.snippet || '');
      const hay = normalizeText(`${source?.title || ''} ${source?.source || ''} ${clean}`);
      let score = words.reduce((acc,w) => acc + (hay.includes(w) ? 1 : 0), 0);
      const kind = String(source?.kind || '').toLowerCase();
      const domain = String(source?.domain || source?.url || '').toLowerCase();
      if (/drive/.test(kind) && policy?.useDrive) score += 2.5;
      if (/approved/.test(String(source?.approvalState || '').toLowerCase())) score += 2.5;
      if (/template/.test(kind) && policy?.mode === 'admin_document' && policy?.useDrive) score += 3;
      if (/pubmed|who\.int|moh\.gov\.vn/.test(domain) && policy?.mode === 'medical_question') score += 3;
      if (/vbpl\.vn|vanban\.chinhphu\.vn|chinhphu\.vn|\.gov\.vn/.test(domain) && policy?.officialOnly) score += 3;
      if (/grounded-web|web|scholarly|official/.test(kind) && policy?.useWeb) score += 1;
      return { ...source, text: clean.slice(0,5000), _score:score, _index:index };
    })
    .filter(s => s.text || s.title)
    .sort((a,b) => b._score - a._score || a._index - b._index);
}

export function sourcePolicyLabel(policy={}) {
  if (policy?.internalOptIn) {
    if (policy?.mode === 'admin_document') return 'Gemini Search + tài liệu nội bộ đã bật';
    if (policy?.mode === 'medical_question') return 'Gemini Search + nội bộ + nguồn y khoa';
    return 'Gemini Search + tài liệu nội bộ';
  }
  const map = {
    direct_runtime:'Runtime trực tiếp',
    general_question:'Gemini Search mặc định',
    research_question:'Gemini Search đa nguồn',
    internal_question:'Gemini Search · nội bộ đang tắt',
    internal_admin_question:'Gemini Search · nội bộ đang tắt',
    medical_question:'Gemini Search + nguồn y khoa',
    admin_document:'Gemini Search + nguồn chính thức',
    data_task:'Dữ liệu được giao'
  };
  return map[policy?.mode] || 'Gemini Search mặc định';
}
