const VERSION = '2.4-product-completion';
const TASK_KEY = 'ai-office-tasks-v11';

const DEFAULT_FORMAT = {
  admin: 'docx',
  general: 'docx',
  research: 'docx',
  tech: 'docx',
  data: 'xlsx',
  presentation: 'pptx',
  image: 'png'
};

function getJson(key, fallback=[]) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}
function setJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function strip(text='') {
  return String(text || '')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function esc(text='') {
  return String(text).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function taskKind(task={}) {
  return task?.intentV22?.taskKind || task?.intent?.kind || task?.plan?.kind || task?.kind || task?.category || 'general';
}
function summarize(text='') {
  const clean = strip(text);
  if (!clean) return 'Đã xử lý yêu cầu; chi tiết sản phẩm đang chờ kiểm định/duyệt.';
  const sentences = clean.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const picked = sentences.slice(0,4).join(' ');
  return (picked || clean).slice(0,520);
}
function persistTask(task) {
  if (!task?.id) return;
  const tasks = getJson(TASK_KEY, []);
  const index = tasks.findIndex(item => item?.id === task.id);
  if (index >= 0) tasks[index] = task;
  else tasks.unshift(task);
  setJson(TASK_KEY, tasks);
  window.render?.();
}
function ensureArtifactStep(task, format) {
  const steps = task?.plan?.steps;
  if (!Array.isArray(steps) || steps.some(step => step?.id === 'artifact')) return;
  const step = { id:'artifact', label:`Chuẩn hóa sản phẩm ${format.toUpperCase()}`, status:'done' };
  const approvalIndex = steps.findIndex(item => item?.id === 'approval');
  if (approvalIndex >= 0) steps.splice(approvalIndex, 0, step);
  else steps.push(step);
}
function completeDelivery(task) {
  if (!task || typeof task !== 'object') return task;
  const kind = taskKind(task);
  if (kind === 'question' || ['casual','control'].includes(kind)) return task;

  if (!Array.isArray(task.artifactFormats) || !task.artifactFormats.length) {
    const format = DEFAULT_FORMAT[kind] || 'docx';
    task.artifactFormats = [format];
    task.requestedArtifact = true;
    if (task.intent && typeof task.intent === 'object') {
      task.intent.artifactFormats = [format];
      task.intent.userWantsFile = true;
    }
    ensureArtifactStep(task, format);
  }

  const format = task.artifactFormats[0];
  task.delivery = {
    version: VERSION,
    summary: summarize(task.outputDraft || task.originalMessage || task.title),
    format,
    fileReady: ['awaiting_approval','completed'].includes(task.status),
    qaScore: task?.qa?.score ?? null,
    generatedAt: new Date().toISOString()
  };
  persistTask(task);
  renderDelivery(task);
  return task;
}
function renderDelivery(task) {
  const box = document.getElementById('answer');
  if (!box || !task?.delivery) return;
  let panel = document.getElementById('ai24Delivery');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'ai24Delivery';
    box.appendChild(panel);
  }
  const qa = task.delivery.qaScore == null ? 'QA đang cập nhật' : `QA ${task.delivery.qaScore}/100`;
  panel.innerHTML = `<div class="ai24DeliveryCard"><b>Trình sản phẩm</b><p>${esc(task.delivery.summary)}</p><div class="ai24DeliveryMeta">${esc(qa)} · File ${esc(String(task.delivery.format).toUpperCase())} · Mở mục “Sản phẩm” để tải/duyệt/sửa/hủy.</div></div>`;
}
function injectPolish() {
  if (document.getElementById('ai24-polish')) return;
  const style = document.createElement('style');
  style.id = 'ai24-polish';
  style.textContent = `
.nav a{font-size:12px;min-height:40px}.sub{font-size:12px;line-height:1.5}.pill,.badge{font-size:10px}.bubble{font-size:12px;line-height:1.55}.composer textarea{font-size:12px;line-height:1.5;min-height:56px}.btn,.formats button,.mode button{font-size:10px;min-height:36px}.meta{font-size:9px;line-height:1.4}.dept b,.know b,.approval b,.notice b,.agent b,.post b,.skill b{font-size:10px}.answer,.ai19Answer,.ai21Answer{font-size:11px;line-height:1.55}.card{transition:box-shadow .18s ease,transform .18s ease}.card:focus-within{box-shadow:0 14px 34px #23366c17}button:focus-visible,a:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #315fe830;outline-offset:2px}.ai24DeliveryCard{margin-top:8px;border:1px solid #d8e4ff;background:#fff;border-radius:13px;padding:11px;font-size:11px;line-height:1.5}.ai24DeliveryCard p{margin:6px 0}.ai24DeliveryMeta{font-size:9px;color:#66708b}@media(max-width:700px){.main,.app.mini .main{padding-left:14px;padding-right:14px}.composer{align-items:stretch}.send{min-width:58px}.nav a{font-size:12px}}
`;
  document.head.appendChild(style);
}
function wrapRouter() {
  const router = window.AIOfficeV20;
  if (!router?.handleMessage || router.__productCompletionV24) return false;
  const original = router.handleMessage.bind(router);
  router.handleMessage = async (...args) => {
    const result = await original(...args);
    return completeDelivery(result);
  };
  router.__productCompletionV24 = true;
  return true;
}

injectPolish();
if (!wrapRouter()) {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (wrapRouter() || attempts > 120) clearInterval(timer);
  }, 50);
}

window.AIOfficeProductCompletionV24 = {
  version: VERSION,
  completeDelivery,
  defaultFormats: { ...DEFAULT_FORMAT }
};
