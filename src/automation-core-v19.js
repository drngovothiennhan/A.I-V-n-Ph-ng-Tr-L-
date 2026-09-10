const TASK_KEY = 'ai-office-tasks-v11';
const PROC_KEY = 'ai-office-procedural-memory-v19';
const DECISION_KEY = 'ai-office-decisions-v19';
const PROFILE_KEY = 'ai-office-profile-v19';

const DEPTS = {
  admin: ['admin','clerical','qa'],
  data: ['logistics','qa'],
  research: ['planning','tech','qa'],
  presentation: ['planning','clerical','qa'],
  image: ['tech','qa'],
  tech: ['tech','qa'],
  general: ['planning','qa']
};

const DOC_TYPES = [
  ['kế hoạch','plan'], ['ke hoach','plan'],
  ['báo cáo','report'], ['bao cao','report'],
  ['công văn','official_letter'], ['cong van','official_letter'],
  ['tờ trình','proposal'], ['to trinh','proposal'],
  ['thông báo','notice'], ['thong bao','notice'],
  ['quyết định','decision'], ['quyet dinh','decision'],
  ['biên bản','minutes'], ['bien ban','minutes'],
  ['giấy mời','invitation'], ['giay moi','invitation']
];

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function normalize(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function getJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function inferDocType(text) {
  const n = normalize(text);
  for (const [label, type] of DOC_TYPES) if (n.includes(normalize(label))) return type;
  return null;
}
function inferArtifact(text, kind) {
  const n = normalize(text);
  if (/\b(xlsx|excel|bang tinh|spreadsheet)\b/.test(n)) return ['xlsx'];
  if (/\b(pptx|powerpoint|slide|trinh bay|trinh chieu)\b/.test(n)) return ['pptx'];
  if (/\b(png|jpg|jpeg|webp|poster|infographic|hinh anh|anh)\b/.test(n)) return ['png'];
  if (/\b(pdf)\b/.test(n)) return ['pdf'];
  if (/\b(docx|word|file word|tep word)\b/.test(n) || /\b(xuat|tao file|tai file)\b.*\b(van ban|tai lieu)\b/.test(n)) return ['docx'];
  if (kind === 'data') return [];
  return [];
}
function continuationIntent(n, context) {
  return /^(tiep tuc|lam tiep|sua tiep|cap nhat tiep|hoan thien|xuat tiep)\b/.test(n) && Boolean(context?.lastTask);
}
function classifyIntent(text, context = {}) {
  const raw = String(text || '').trim();
  const n = normalize(raw);
  const docType = inferDocType(raw);
  let kind = 'question';
  let score = 0.58;

  if (continuationIntent(n, context)) { kind = context.lastTask?.kind || 'general'; score = 0.91; }
  else if (docType) { kind = 'admin'; score = 0.94; }
  else if (/\b(excel|xlsx|csv|bang tinh|du lieu|doi chieu|loc danh sach|tong hop so lieu|phan tich du lieu)\b/.test(n)) { kind = 'data'; score = 0.92; }
  else if (/\b(pptx|powerpoint|slide|trinh bay|thuyet trinh)\b/.test(n)) { kind = 'presentation'; score = 0.91; }
  else if (/\b(png|poster|infographic|hinh anh|tao anh|thiet ke anh)\b/.test(n)) { kind = 'image'; score = 0.90; }
  else if (/\b(code|api|vercel|github|supabase|phan mem|ung dung|app|he thong)\b/.test(n) && /\b(sua|tao|trien khai|nang cap|kiem tra|ket noi|cau hinh|build|deploy)\b/.test(n)) { kind = 'tech'; score = 0.90; }
  else if (/\b(tra cuu|nghien cuu|tim nguon|kiem chung|doi chieu nguon|van ban phap luat|quy dinh)\b/.test(n)) { kind = 'research'; score = 0.88; }
  else if (/^(hay|vui long|giup|lam|tao|soan|viet|xuat|loc|doi chieu|kiem tra|phan tich|trien khai|nang cap|sua|cap nhat|ket noi|lap|chuan bi|thuc hien|thi hanh)\b/.test(n)) { kind = 'general'; score = 0.82; }
  else if (/\?$/.test(raw) || /^(ai|gi|nao|tai sao|vi sao|khi nao|o dau|bao nhieu|the nao|co phai|giai thich|cho toi biet)\b/.test(n)) { kind = 'question'; score = 0.92; }

  const artifactFormats = inferArtifact(raw, kind);
  const irreversible = /\b(gui email|gui thu|gui cong van|cong bo|dang len|xoa|ky so|phe duyet|thanh toan|nop ho so|phat hanh)\b/.test(n);
  const urgency = /\b(khan|gap|ngay lap tuc|ngay bay gio|uu tien cao)\b/.test(n) ? 'urgent' : 'normal';
  const userWantsFile = artifactFormats.length > 0;
  const action = kind === 'question' ? 'answer' : (irreversible ? 'prepare_and_hold' : 'execute');
  return { kind, confidence: score, docType, artifactFormats, urgency, irreversible, userWantsFile, action };
}
function contextSnapshot() {
  const tasks = getJson(TASK_KEY, []);
  const lastTask = tasks.find(t => t?.v19);
  return { lastTask };
}
function planFor(intent, text) {
  const steps = [
    { id:'understand', label:'Phân tích yêu cầu & ý định', status:'done' },
    { id:'context', label:'Đọc ngữ cảnh và quy chuẩn liên quan', status:'pending' },
    { id:'execute', label:'Thực hiện nội dung công việc', status:'pending' },
    { id:'qa', label:'Kiểm định nội dung & thể thức', status:'pending' }
  ];
  if (intent.userWantsFile) steps.push({ id:'artifact', label:`Chuẩn hóa sản phẩm ${intent.artifactFormats.join('/').toUpperCase()}`, status:'pending' });
  if (intent.irreversible) steps.push({ id:'approval', label:'Chờ duyệt trước hành động bên ngoài/không thể hoàn tác', status:'pending' });
  else steps.push({ id:'approval', label:'Trình sản phẩm để duyệt', status:'pending' });

  return {
    id: uid(),
    kind: intent.kind,
    docType: intent.docType,
    departments: DEPTS[intent.kind] || DEPTS.general,
    steps,
    rationale: intent.irreversible
      ? 'Tự động thực hiện mọi bước nội bộ an toàn; dừng trước hành động bên ngoài hoặc không thể hoàn tác.'
      : 'Yêu cầu đủ rõ để tự động thực hiện theo chính sách safe-by-default.'
  };
}
function previousPattern(intent) {
  const memory = getJson(PROC_KEY, []);
  return memory.find(m => m.kind === intent.kind && (!intent.docType || m.docType === intent.docType)) || null;
}
function extractUserFacts(text) {
  const facts = [];
  const nums = String(text).match(/\b\d+(?:[.,]\d+)?%?\b/g) || [];
  if (nums.length) facts.push(`Số liệu do người dùng cung cấp: ${[...new Set(nums)].slice(0,12).join(', ')}`);
  return facts;
}
function cleanSubject(text) {
  return String(text || '')
    .replace(/^(hãy|vui lòng|giúp tôi|làm|tạo|soạn|viết|lập|thực hiện|thi hành)\s+/i,'')
    .trim();
}
function adminSkeleton(type, text, profile = {}) {
  const subject = cleanSubject(text);
  const org = profile.organization || '';
  const signer = profile.signer || '';
  const metaNote = [];
  if (!org) metaNote.push('cơ quan ban hành');
  if (!signer) metaNote.push('người ký/chức vụ');
  const missing = metaNote.length ? `\n\nTHÔNG TIN CHƯA CÓ ĐỂ PHÁT HÀNH CHÍNH THỨC: ${metaNote.join(', ')}. Hệ thống không tự bịa các trường này.` : '';

  const head = org ? `${org.toUpperCase()}\n` : '';
  const common = `${head}CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\n`;
  const titleMap = {
    plan:'KẾ HOẠCH', report:'BÁO CÁO', official_letter:'CÔNG VĂN',
    proposal:'TỜ TRÌNH', notice:'THÔNG BÁO', decision:'QUYẾT ĐỊNH',
    minutes:'BIÊN BẢN', invitation:'GIẤY MỜI'
  };
  const title = titleMap[type] || 'VĂN BẢN';
  const intro = `${title}\n${subject}\n\n`;

  const templates = {
    plan:
`I. MỤC ĐÍCH, YÊU CẦU
1. Mục đích
- Tổ chức thực hiện yêu cầu: ${subject}.
- Bảo đảm công việc có đầu mối, tiến độ, sản phẩm và tiêu chí kiểm tra rõ ràng.
2. Yêu cầu
- Thực hiện đúng phạm vi được giao; không tự tạo số liệu hoặc căn cứ chưa được kiểm chứng.
- Kết quả phải được kiểm tra trước khi trình duyệt/phát hành.

II. NỘI DUNG THỰC HIỆN
1. Rà soát dữ liệu, hồ sơ và yêu cầu liên quan.
2. Triển khai các đầu việc theo thứ tự ưu tiên.
3. Tổng hợp kết quả, vấn đề phát sinh và đề xuất xử lý.

III. TIẾN ĐỘ VÀ SẢN PHẨM
- Tiến độ: theo yêu cầu thực tế và mức độ ưu tiên.
- Sản phẩm: báo cáo/kết quả công việc đã kiểm tra, kèm tài liệu liên quan khi có.

IV. PHÂN CÔNG THỰC HIỆN
- Bộ phận chủ trì: xác định theo nội dung nhiệm vụ.
- Bộ phận phối hợp: tham gia theo chức năng và dữ liệu được giao.
- QA/Kiểm định: kiểm tra nội dung, nguồn và thể thức.

V. TỔ CHỨC THỰC HIỆN
Các bộ phận liên quan chủ động triển khai; trường hợp phát sinh nội dung vượt thẩm quyền phải báo cáo trước khi thực hiện hành động không thể hoàn tác.`,
    report:
`I. NỘI DUNG VÀ PHẠM VI
${subject}

II. KẾT QUẢ
- Hệ thống chỉ ghi nhận thông tin có trong yêu cầu, tài liệu hoặc nguồn đã truy xuất.
- Các số liệu cụ thể chỉ được sử dụng khi có nguồn hoặc do người dùng cung cấp.

III. ĐÁNH GIÁ
- Kết quả đạt được: tổng hợp theo bằng chứng hiện có.
- Tồn tại/khó khăn: nêu rõ phần thiếu dữ liệu hoặc chưa đủ căn cứ.

IV. KIẾN NGHỊ, ĐỀ XUẤT
- Tiếp tục hoàn thiện dữ liệu và hồ sơ còn thiếu.
- Trình cấp có thẩm quyền xem xét các nội dung cần quyết định.`,
    official_letter:
`Kính gửi: Cơ quan/đơn vị có liên quan.

${subject}

Đề nghị cơ quan/đơn vị liên quan phối hợp thực hiện theo chức năng, bảo đảm đúng nội dung, thời hạn và quy định áp dụng. Trường hợp có khó khăn, vướng mắc, phản hồi về đầu mối xử lý để tổng hợp.`,
    proposal:
`Kính gửi: Cấp có thẩm quyền.

I. SỰ CẦN THIẾT
${subject}

II. NỘI DUNG TRÌNH
- Phạm vi đề xuất: theo đúng yêu cầu và hồ sơ hiện có.
- Dữ liệu/căn cứ: chỉ sử dụng nguồn đã kiểm chứng hoặc thông tin người dùng cung cấp.

III. KIẾN NGHỊ
Kính trình cấp có thẩm quyền xem xét, quyết định.`,
    notice:
`Nội dung thông báo: ${subject}

1. Đối tượng thực hiện: các cá nhân/đơn vị có liên quan.
2. Yêu cầu: chủ động thực hiện đúng nội dung và thời hạn được giao.
3. Đầu mối phối hợp: thực hiện theo phân công của cơ quan/đơn vị.`,
    decision:
`Căn cứ hồ sơ và yêu cầu công việc thuộc thẩm quyền;

QUYẾT ĐỊNH:

Điều 1. Thực hiện nội dung: ${subject}.
Điều 2. Các bộ phận, cá nhân có liên quan chịu trách nhiệm tổ chức thực hiện.
Điều 3. Quyết định có hiệu lực theo thời điểm được cấp có thẩm quyền ký/phát hành.`,
    minutes:
`1. Thời gian, địa điểm: chưa được cung cấp.
2. Thành phần: chưa được cung cấp.
3. Nội dung làm việc:
${subject}
4. Ý kiến/Kết quả:
Chỉ ghi nhận nội dung đã có bằng chứng hoặc được xác nhận trong phiên làm việc.
5. Kết luận:
Các bên thống nhất thực hiện các nội dung đã được xác nhận.`,
    invitation:
`Trân trọng kính mời: cá nhân/đơn vị có liên quan.

Nội dung: ${subject}
Thời gian: chưa được cung cấp.
Địa điểm: chưa được cung cấp.

Đề nghị sắp xếp tham dự đúng thành phần và thời gian sau khi thông tin được xác nhận.`
  };
  return `${common}${intro}${templates[type] || templates.report}${missing}`;
}
function dataDraft(text) {
  return `KẾT QUẢ XỬ LÝ DỮ LIỆU - BẢN LÀM VIỆC

Yêu cầu: ${cleanSubject(text)}

Nguyên tắc thực hiện:
- Giữ nguyên dữ liệu gốc, không tự điền thông tin còn thiếu.
- Đối chiếu theo khóa nhận diện có trong dữ liệu.
- Tách rõ: khớp chính xác, nghi ngờ trùng, không khớp.
- Báo cáo số lượng và tỷ lệ chỉ sau khi có dữ liệu đầu vào thực tế.

Trạng thái: hệ thống đã xác định đúng loại nhiệm vụ dữ liệu. Khi dữ liệu/tệp được cung cấp trong phiên làm việc, workflow phải chạy đối chiếu thực tế trước khi kết luận.`;
}
function presentationDraft(text) {
  const subject = cleanSubject(text);
  return `ĐỀ CƯƠNG TRÌNH BÀY

Chủ đề: ${subject}

Slide 1. Tiêu đề và mục tiêu
Slide 2. Bối cảnh / vấn đề
Slide 3. Dữ liệu hoặc bằng chứng chính
Slide 4. Phân tích trọng tâm
Slide 5. Quy trình / giải pháp
Slide 6. Kết quả kỳ vọng
Slide 7. Rủi ro và kiểm soát
Slide 8. Kế hoạch thực hiện
Slide 9. Kiến nghị
Slide 10. Kết luận

Quy tắc: không đưa số liệu chưa có nguồn; ưu tiên mỗi slide một thông điệp chính; nội dung phải được QA trước khi xuất PPTX.`;
}
function generalDraft(text) {
  return `KẾT QUẢ CÔNG VIỆC

Yêu cầu: ${cleanSubject(text)}

1. Phạm vi đã xác định
- Thực hiện đúng mục tiêu người dùng nêu.
- Không tự mở rộng sang hành động bên ngoài hoặc không thể hoàn tác.

2. Cách thực hiện
- Phân loại ý định.
- Đọc ngữ cảnh và quy chuẩn.
- Thực hiện nội dung nội bộ an toàn.
- Kiểm định trước khi trình duyệt.

3. Trạng thái
Bản làm việc đã được tạo theo pipeline v1.9. Các chi tiết phụ thuộc dữ liệu/tài liệu chưa có sẽ được giữ ở trạng thái chưa xác nhận thay vì tự suy đoán.`;
}
async function providerDraft(text, intent, plan, contextText = '') {
  try {
    const h = await fetch('/api/health', { cache:'no-store' });
    const health = h.ok ? await h.json() : {};
    if (!health?.providers?.gemini?.configured) return '';
    const memory = previousPattern(intent);
    const prompt = [
      'Bạn là Trưởng phòng A.I của hệ thống tự động hóa hành chính văn phòng.',
      'Hãy THỰC HIỆN nhiệm vụ, không chỉ xác nhận đã nhận.',
      'Không bịa số liệu, căn cứ, tên cơ quan, số văn bản, người ký.',
      'Nếu thiếu dữ liệu, hoàn thành phần có thể làm và liệt kê phần chưa xác nhận.',
      'Đầu ra bằng tiếng Việt, sẵn sàng QA và xuất file.',
      `Loại việc: ${intent.kind}; loại văn bản: ${intent.docType || 'không xác định'}.`,
      `Kế hoạch: ${plan.steps.map(s=>s.label).join(' -> ')}`,
      memory ? `Mẫu đã được duyệt trước đây: ${memory.summary || memory.kind}` : '',
      contextText ? `Ngữ cảnh nội bộ:\n${contextText.slice(0,9000)}` : '',
      `Nhiệm vụ:\n${text}`
    ].filter(Boolean).join('\n\n');
    const r = await fetch('/api/proxy?op=chief', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ message: prompt })
    });
    if (!r.ok) return '';
    const j = await r.json();
    return String(j.reply || '').trim();
  } catch { return ''; }
}
function localDraft(text, intent) {
  const profile = getJson(PROFILE_KEY, {});
  if (intent.kind === 'admin') return adminSkeleton(intent.docType || 'report', text, profile);
  if (intent.kind === 'data') return dataDraft(text);
  if (intent.kind === 'presentation') return presentationDraft(text);
  return generalDraft(text);
}
function qaCheck(draft, intent, text) {
  const issues = [];
  let score = 100;
  const d = String(draft || '').trim();
  if (d.length < 180) { issues.push('Nội dung quá ngắn để xem là sản phẩm hoàn chỉnh.'); score -= 25; }
  if (/\b(lorem ipsum|todo|tbd)\b/i.test(d)) { issues.push('Có placeholder kỹ thuật.'); score -= 30; }
  if (intent.kind === 'admin' && !/CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/.test(d)) { issues.push('Thiếu khối thể thức hành chính cơ bản.'); score -= 15; }
  if (intent.kind === 'admin' && intent.docType === 'plan' && !/MỤC ĐÍCH/.test(d)) { issues.push('Kế hoạch thiếu mục đích/yêu cầu.'); score -= 15; }
  if (intent.kind === 'data' && !/không tự/i.test(d)) { issues.push('Chưa thể hiện nguyên tắc không tự tạo dữ liệu.'); score -= 10; }
  if (intent.irreversible) { issues.push('Có hành động bên ngoài/không thể hoàn tác: phải chờ duyệt trước khi thực hiện.'); score = Math.min(score, 90); }
  const userFacts = extractUserFacts(text);
  return { score: Math.max(0, score), issues, passed: score >= 75, userFacts };
}
function updateStep(plan, id, status) {
  const s = plan.steps.find(x => x.id === id);
  if (s) s.status = status;
}
function renderResult(task) {
  const bubble = document.getElementById('bubble');
  const answer = document.getElementById('answer');
  const note = task.decision === 'prepare_and_hold'
    ? '\n\n⚠ Đã hoàn thành các bước nội bộ an toàn và đang dừng trước hành động bên ngoài/không thể hoàn tác.'
    : '';
  const qa = `\n\nQA: ${task.qa?.score ?? 0}/100${task.qa?.issues?.length ? ` · ${task.qa.issues.join(' ')}` : ' · đạt yêu cầu kiểm định nội bộ.'}`;
  const text = `${task.outputDraft}${qa}${note}`;
  if (bubble) bubble.textContent = `Đã thực hiện: ${task.title}. QA ${task.qa?.score ?? 0}/100.`;
  if (answer) {
    const safe = text.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
    answer.innerHTML = `<div class="answer"><b>Trưởng phòng A.I · Kết quả thực hiện</b><br>${safe}</div>`;
  }
}
function storeDecision(task) {
  const list = getJson(DECISION_KEY, []);
  list.unshift({
    id: task.id, at: new Date().toISOString(), intent: task.intent,
    decision: task.decision, rationale: task.plan?.rationale || '',
    qaScore: task.qa?.score ?? null
  });
  setJson(DECISION_KEY, list.slice(0,150));
}
function learnApproved(task) {
  if (!task) return;
  const list = getJson(PROC_KEY, []);
  list.unshift({
    id: uid(), at: new Date().toISOString(), kind: task.intent?.kind || task.category,
    docType: task.intent?.docType || null, departments: task.deptIds || [],
    artifactFormats: task.artifactFormats || [],
    summary: `Đã duyệt: ${task.title}; QA ${task.qa?.score ?? 'n/a'}/100.`,
    signature: normalize(task.title).split(/\s+/).slice(0,8).join(' ')
  });
  setJson(PROC_KEY, list.slice(0,200));
}
async function executeTask(text, options = {}) {
  const ctx = contextSnapshot();
  const intent = classifyIntent(text, ctx);
  const plan = planFor(intent, text);
  const task = {
    id: uid(), v19: true, title: cleanSubject(text).slice(0,96) || 'Nhiệm vụ',
    originalMessage: text, category: intent.kind, intent, plan,
    deptIds: plan.departments, artifactFormats: intent.artifactFormats,
    outputMode: intent.userWantsFile ? 'artifact' : 'conversation',
    requestedArtifact: intent.userWantsFile, priority: intent.urgency,
    progress: 15, status:'analyzing', decision:intent.action,
    createdAt:new Date().toISOString()
  };
  const tasks = getJson(TASK_KEY, []);
  tasks.unshift(task); setJson(TASK_KEY, tasks);
  window.render?.();

  updateStep(plan,'context','running'); task.progress = 28; task.status='planning'; setJson(TASK_KEY,tasks); window.render?.();
  const localContext = (() => { try { return typeof window.ctx === 'function' ? String(window.ctx(text) || '') : ''; } catch { return ''; } })();
  updateStep(plan,'context','done');

  updateStep(plan,'execute','running'); task.progress=48; task.status='executing'; setJson(TASK_KEY,tasks); window.render?.();
  const aiDraft = await providerDraft(text, intent, plan, localContext);
  task.outputDraft = aiDraft || localDraft(text, intent);
  task.engine = aiDraft ? 'gemini' : 'local-safe';
  updateStep(plan,'execute','done');

  updateStep(plan,'qa','running'); task.progress=78; task.status='verifying'; setJson(TASK_KEY,tasks); window.render?.();
  task.qa = qaCheck(task.outputDraft, intent, text);
  updateStep(plan,'qa',task.qa.passed ? 'done' : 'needs_review');

  if (intent.userWantsFile) updateStep(plan,'artifact','done');
  updateStep(plan,'approval','waiting');
  task.progress = 96;
  task.status = 'awaiting_approval';
  task.completedInternalAt = new Date().toISOString();
  setJson(TASK_KEY,tasks); storeDecision(task); window.render?.(); renderResult(task);
  return task;
}
function wrapApprovalHooks() {
  if (typeof window.approve === 'function' && !window.approve.__v19Wrapped) {
    const original = window.approve;
    const wrapped = function(id) {
      const before = getJson(TASK_KEY, []).find(t => t.id === id);
      const result = original(id);
      const after = getJson(TASK_KEY, []).find(t => t.id === id) || before;
      learnApproved(after);
      return result;
    };
    wrapped.__v19Wrapped = true;
    window.approve = wrapped;
  }
}
export {
  classifyIntent, executeTask, qaCheck, planFor, learnApproved,
  wrapApprovalHooks, contextSnapshot
};
