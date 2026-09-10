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

export function classifySourcePolicy(text='', baseIntent={}) {
  const raw = String(text || '').trim();
  const n = normalizeText(raw);
  const direct = directRuntimeAnswer(raw);
  const question = looksLikeQuestion(raw) || baseIntent?.kind === 'question';
  const internal = includesAny(n, INTERNAL_HINTS);
  const adminHint = includesAny(n, ADMIN_DOC_HINTS);
  const medical = includesAny(n, MEDICAL_HINTS);
  const research = includesAny(n, RESEARCH_HINTS);
  const explicitWeb = /\b(internet|web|truc tuyen|nguon ngoai|nguon mo|google|tim tren mang)\b/.test(n);

  if (direct) {
    return { mode:'direct_runtime', question:true, useDrive:false, useWeb:false, directAnswer:direct, priority:['runtime'] };
  }
  if (baseIntent?.kind === 'data') {
    return { mode:'data_task', question:false, useDrive:false, useWeb:false, priority:['provided_data'] };
  }
  if (baseIntent?.kind === 'admin' && !question) {
    return {
      mode:'admin_document', question:false, useDrive:true, useWeb:true, officialOnly:true,
      priority:['drive_template_approved','drive_approved','official_web','reasoning']
    };
  }
  if (question && internal) {
    return {
      mode: adminHint ? 'internal_admin_question' : 'internal_question',
      question:true, useDrive:true, useWeb: explicitWeb || research || adminHint, officialOnly: adminHint,
      priority: adminHint ? ['drive_approved','drive_templates','official_web'] : ['drive_approved','drive_knowledge','web_if_needed']
    };
  }
  if (question && medical) {
    return {
      mode:'medical_question', question:true, useDrive:internal, useWeb:true, officialOnly:false,
      priority:['pubmed','who','moh','web','drive_if_requested']
    };
  }
  if (question || baseIntent?.kind === 'research') {
    return {
      mode: research ? 'research_question' : 'general_question', question:true,
      useDrive:false, useWeb:true, officialOnly:false,
      priority:['external_reasoning','web','drive_only_if_explicit']
    };
  }
  return {
    mode: baseIntent?.kind || 'general_task', question:false,
    useDrive: Boolean(baseIntent?.kind === 'admin'),
    useWeb: Boolean(baseIntent?.kind === 'research' || explicitWeb),
    officialOnly: Boolean(baseIntent?.kind === 'admin'), priority:['task_context','reasoning']
  };
}

export function smartIntent(text='', baseClassifier, context={}) {
  const base = typeof baseClassifier === 'function' ? baseClassifier(text, context) : { kind:'question' };
  if (looksLikeQuestion(text)) {
    return {
      ...base, kind:'question', action:'answer', userWantsFile:false, artifactFormats:[], irreversible:false,
      confidence:Math.max(Number(base?.confidence || 0),0.97), correctedBy:'question-first-v20'
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
      if (/template/.test(kind) && policy?.mode === 'admin_document') score += 3;
      if (/pubmed|who\.int|moh\.gov\.vn/.test(domain) && policy?.mode === 'medical_question') score += 3;
      if (/vbpl\.vn|vanban\.chinhphu\.vn|chinhphu\.vn|\.gov\.vn/.test(domain) && policy?.officialOnly) score += 3;
      if (/web|scholarly|official/.test(kind) && policy?.useWeb) score += 1;
      return { ...source, text: clean.slice(0,5000), _score:score, _index:index };
    })
    .filter(s => s.text || s.title)
    .sort((a,b) => b._score - a._score || a._index - b._index);
}

export function sourcePolicyLabel(policy={}) {
  const map = {
    direct_runtime:'Runtime trực tiếp', general_question:'Web độc lập', research_question:'Research đa nguồn',
    internal_question:'Drive ưu tiên', internal_admin_question:'Drive + nguồn chính thức',
    medical_question:'Nguồn y khoa ưu tiên', admin_document:'Mẫu Drive + nguồn chính thức', data_task:'Dữ liệu được giao'
  };
  return map[policy?.mode] || 'Điều phối theo ngữ cảnh';
}
