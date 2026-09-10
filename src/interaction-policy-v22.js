const CONTROL_RULES = [
  ['cancel_all', /^(huy tat ca|dung tat ca|dung het|cancel all|stop all)\b/],
  ['stop_speaking', /^(dung noi|ngung noi|im di|thoi noi|stop talking|be quiet)\b/],
  ['repeat', /^(noi lai|lap lai|doc lai|repeat)\b/],
  ['resume_listening', /^(tiep tuc nghe|nghe tiep|bat lai micro|bat lai mic|resume listening)\b/],
  ['status', /^(dang lam gi|tien do sao roi|tien do the nao|status|kiem tra tien do)\b/]
];

const QUESTION_START = /^(ai|gi|nao|tai sao|vi sao|khi nao|o dau|bao nhieu|may|the nao|nhu the nao|co phai|co nen|duoc khong|giai thich|cho toi biet|hay cho biet|thong tin ve|phan tich|danh gia|so sanh|nhan xet|tom tat)\b/;
const QUESTION_BODY = /\b(la gi|nghia la gi|tai sao|vi sao|bao nhieu|khi nao|o dau|the nao|nhu the nao|dung khong|co nen|duoc khong|khac nhau|nguyen nhan|tac dung|thong tin|giai thich)\b/;
const INFORMATION_VERBS = /\b(cho biet|giai thich|phan tich|danh gia|so sanh|nhan xet|tom tat|tra cuu|kiem chung|kiem tra thong tin|tim hieu)\b/;
const MUTATION_VERBS = /\b(tao|soan|lap|xuat|loc|doi chieu|sua|cap nhat|ket noi|trien khai|nang cap|cau hinh|build|deploy|gui|dang|xoa|ky|phe duyet|thanh toan|nop|phat hanh|dat lich|tao lich|them|chinh sua|doi ten|di chuyen|upload|tai len)\b/;
const ARTIFACT_TERMS = /\b(docx|word|xlsx|excel|csv|pptx|powerpoint|slide|pdf|png|jpg|jpeg|webp|file|tep|bang tinh|bao cao|ke hoach|cong van|to trinh|thong bao|quyet dinh|bien ban|giay moi|poster|infographic)\b/;
const SYSTEM_TERMS = /\b(code|api|vercel|github|supabase|phan mem|ung dung|app|he thong|repo|repository|database|server|website|web app|pwa)\b/;
const DATA_TERMS = /\b(excel|xlsx|csv|bang tinh|du lieu|danh sach|doi chieu|loc|tong hop so lieu|ty le|phan tich du lieu)\b/;
const ADMIN_TERMS = /\b(ke hoach|bao cao|cong van|to trinh|thong bao|quyet dinh|bien ban|giay moi|van ban hanh chinh)\b/;
const PRESENTATION_TERMS = /\b(pptx|powerpoint|slide|trinh bay|trinh chieu|thuyet trinh)\b/;
const IMAGE_TERMS = /\b(png|jpg|jpeg|webp|poster|infographic|hinh anh|tao anh|thiet ke anh)\b/;
const RESEARCH_TERMS = /\b(tra cuu|nghien cuu|tim nguon|kiem chung|doi chieu nguon|nguon chinh thuc|moi nhat|cap nhat moi)\b/;
const HIGH_RISK = /\b(xoa|delete|gui email|gui thu|gui cong van|dang len|cong bo|ky so|ky van ban|phe duyet|thanh toan|nop ho so|phat hanh|deploy production|dua len production|huy lich|xoa file|xoa du lieu)\b/;
const MEDIUM_RISK = /\b(sua|cap nhat|ket noi|cau hinh|deploy|upload|tai len|tao file|xuat file|dat lich|tao lich|di chuyen|doi ten)\b/;

export function normalizeV22(text='') {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}

function countMatches(text, re) {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  const copy = new RegExp(re.source, flags);
  return [...text.matchAll(copy)].length;
}

function controlIntent(n) {
  for (const [type, rule] of CONTROL_RULES) if (rule.test(n)) return type;
  return '';
}

function inferTaskKind(n) {
  if (PRESENTATION_TERMS.test(n)) return 'presentation';
  if (IMAGE_TERMS.test(n)) return 'image';
  if (/\b(excel|xlsx|csv|bang tinh|du lieu|danh sach|doi chieu|loc danh sach|tong hop so lieu|phan tich du lieu)\b/.test(n)) return 'data';
  if (ADMIN_TERMS.test(n)) return 'admin';
  if (SYSTEM_TERMS.test(n)) return 'tech';
  if (DATA_TERMS.test(n)) return 'data';
  if (RESEARCH_TERMS.test(n)) return 'research';
  return 'general';
}

function inferRisk(n) {
  if (HIGH_RISK.test(n)) return 'high';
  if (MEDIUM_RISK.test(n) || (MUTATION_VERBS.test(n) && ARTIFACT_TERMS.test(n))) return 'medium';
  if (MUTATION_VERBS.test(n)) return 'low';
  return 'none';
}

function splitHybrid(raw) {
  const patterns = [
    /\s+(?:roi|rồi)\s+(?=(?:hay\s+)?(?:tao|soan|lap|xuat|sua|cap nhat|trien khai|nang cap|gui|dang|xoa|ket noi)\b)/i,
    /\s+(?:sau do|sau đó)\s+(?=(?:hay\s+)?(?:tao|soan|lap|xuat|sua|cap nhat|trien khai|nang cap|gui|dang|xoa|ket noi)\b)/i,
    /\s+(?:dong thoi|đồng thời)\s+(?=(?:hay\s+)?(?:tao|soan|lap|xuat|sua|cap nhat|trien khai|nang cap|gui|dang|xoa|ket noi)\b)/i,
    /\s+và\s+(?=(?:hãy\s+)?(?:tạo|soạn|lập|xuất|sửa|cập nhật|triển khai|nâng cấp|gửi|đăng|xóa|kết nối)\b)/i,
    /\s+va\s+(?=(?:hay\s+)?(?:tao|soan|lap|xuat|sua|cap nhat|trien khai|nang cap|gui|dang|xoa|ket noi)\b)/i
  ];
  for (const re of patterns) {
    const m = re.exec(raw);
    if (!m || m.index < 2) continue;
    const left = raw.slice(0,m.index).trim().replace(/[;,]+$/,'');
    const right = raw.slice(m.index + m[0].length).trim();
    if (left && right) return {questionText:left, taskText:right};
  }
  return null;
}

function confidenceFromGap(a,b,base=0.65) {
  const high = Math.max(a,b), low=Math.min(a,b), gap=high-low;
  return Math.max(0.55, Math.min(0.99, base + high*0.055 + gap*0.035));
}

export function classifyInteractionV22(text='', context={}) {
  const raw = String(text || '').trim();
  const n = normalizeV22(raw);
  if (!n) return {mode:'empty',confidence:1,risk:'none',taskKind:'general'};

  const control = controlIntent(n);
  if (control) return {mode:'control',control,confidence:0.99,risk:control==='cancel_all'?'medium':'none',taskKind:'general'};

  if (/^(xin chao|chao|hello|hi|alo|cam on|thank you|thanks)(\b|$)/.test(n)) {
    return {mode:'casual',confidence:0.98,risk:'none',taskKind:'general'};
  }

  let questionScore = 0;
  let taskScore = 0;
  if (raw.endsWith('?')) questionScore += 3;
  if (QUESTION_START.test(n)) questionScore += 3;
  if (QUESTION_BODY.test(n)) questionScore += 2;
  if (INFORMATION_VERBS.test(n)) questionScore += 2;
  questionScore += Math.min(2,countMatches(n,/\b(ai|gi|nao|tai sao|vi sao|bao nhieu|khi nao|o dau|the nao)\b/));

  const mutationCount = countMatches(n,MUTATION_VERBS);
  if (mutationCount) taskScore += Math.min(5,2 + mutationCount);
  if (ARTIFACT_TERMS.test(n) && mutationCount) taskScore += 2;
  if (SYSTEM_TERMS.test(n) && /\b(sua|trien khai|nang cap|ket noi|cau hinh|build|deploy|cap nhat|tao)\b/.test(n)) taskScore += 3;
  if (/^(hay|vui long|giup toi|thuc hien|thi hanh|lam giup|tien hanh)\b/.test(n) && mutationCount) taskScore += 2;
  if (/^(tiep tuc|lam tiep|sua tiep|cap nhat tiep|hoan thien)\b/.test(n) && context?.hasActiveTask) taskScore += 4;

  const informationalOnly = INFORMATION_VERBS.test(n) && !MUTATION_VERBS.test(n);
  if (informationalOnly) questionScore += 2;

  const hybrid = splitHybrid(raw);
  if (hybrid && questionScore >= 3) {
    const taskN=normalizeV22(hybrid.taskText);
    if (MUTATION_VERBS.test(taskN)) {
      return {
        mode:'hybrid',confidence:0.95,risk:inferRisk(taskN),taskKind:inferTaskKind(taskN),
        questionText:hybrid.questionText,taskText:hybrid.taskText,answerFirst:true,needsApproval:inferRisk(taskN)==='high',
        scores:{question:questionScore,task:taskScore}
      };
    }
  }

  const risk=inferRisk(n);
  if (taskScore >= 4 && taskScore >= questionScore + 1) {
    return {mode:'task',confidence:confidenceFromGap(taskScore,questionScore,0.67),risk,taskKind:inferTaskKind(n),needsApproval:risk==='high',scores:{question:questionScore,task:taskScore}};
  }
  if (questionScore >= 2 || taskScore === 0) {
    return {mode:'question',confidence:confidenceFromGap(questionScore,taskScore,0.68),risk:'none',taskKind:'general',scores:{question:questionScore,task:taskScore}};
  }

  return {mode:'question',confidence:0.62,risk:'none',taskKind:'general',ambiguous:true,scores:{question:questionScore,task:taskScore}};
}

export function routingPrefixV22(kind='general') {
  const map={
    admin:'Soạn văn bản hành chính. ',data:'Xử lý dữ liệu. ',presentation:'Tạo trình bày PowerPoint. ',
    image:'Tạo hình ảnh. ',tech:'Triển khai phần mềm. ',research:'Nghiên cứu tra cứu nguồn. ',general:'Thực hiện nhiệm vụ. '
  };
  return map[kind] || map.general;
}
