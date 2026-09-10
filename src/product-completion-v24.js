const VERSION = '2.4-product-completion';
const TASK_KEY = 'ai-office-tasks-v11';
const IMAGE_CACHE = new Map();

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
function safeName(text='AI-Office-Image') {
  return strip(text).replace(/[\\/:*?"<>|]/g,'-').slice(0,100) || 'AI-Office-Image';
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
function inferAspect(task) {
  const text = strip(`${task?.title || ''} ${task?.originalMessage || ''}`).toLowerCase();
  if (/story|dọc|điện thoại|9:16/.test(text)) return '9:16';
  if (/poster|áp phích|infographic|4:5/.test(text)) return '4:5';
  if (/slide|banner|16:9|màn hình/.test(text)) return '16:9';
  return '1:1';
}
function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function prepareAiImage(task) {
  if (!task?.id || taskKind(task) !== 'image') return null;
  if (IMAGE_CACHE.has(task.id)) return IMAGE_CACHE.get(task.id);
  const prompt = strip(task.originalMessage || task.outputDraft || task.title).slice(0,3500);
  if (!prompt) return null;
  const response = await fetch('/api/image',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({prompt,title:task.title || 'AI-Office-Image',aspectRatio:inferAspect(task),grounded:false}),
    signal:AbortSignal.timeout(50000)
  });
  if (!response.ok) throw new Error(`IMAGE_HTTP_${response.status}`);
  const blob = await response.blob();
  if (!blob.size || !String(blob.type).startsWith('image/')) throw new Error('IMAGE_EMPTY');
  const item = {blob,model:response.headers.get('x-ai-model') || 'gemini-image',provider:response.headers.get('x-ai-provider') || 'gemini'};
  IMAGE_CACHE.set(task.id,item);
  return item;
}
async function completeDelivery(task) {
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
    artifactProvider: format === 'png' && kind === 'image' ? 'local-canvas-fallback' : 'office-artifact-engine',
    generatedAt: new Date().toISOString()
  };

  if (kind === 'image' && format === 'png' && task.delivery.fileReady) {
    try {
      const image = await prepareAiImage(task);
      if (image) task.delivery.artifactProvider = image.model;
    } catch(error) {
      console.warn('ai_image_fallback',{message:String(error?.message || error).slice(0,120)});
    }
  }

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
  panel.innerHTML = `<div class="ai24DeliveryCard"><b>Trình sản phẩm</b><p>${esc(task.delivery.summary)}</p><div class="ai24DeliveryMeta">${esc(qa)} · File ${esc(String(task.delivery.format).toUpperCase())} · ${esc(task.delivery.artifactProvider || 'artifact-engine')} · Mở mục “Sản phẩm” để duyệt/sửa/hủy.</div><div id="ai24ImageSlot"></div></div>`;

  const image = IMAGE_CACHE.get(task.id);
  const slot = panel.querySelector('#ai24ImageSlot');
  if (image && slot) {
    const url = URL.createObjectURL(image.blob);
    const img = document.createElement('img');
    img.className = 'ai24ImagePreview';
    img.alt = `Ảnh A.I: ${task.title || 'sản phẩm'}`;
    img.src = url;
    img.onload = ()=>setTimeout(()=>URL.revokeObjectURL(url),1000);
    const button = document.createElement('button');
    button.className = 'btn ai24ImageDownload';
    button.textContent = 'Tải PNG';
    button.onclick = ()=>downloadBlob(image.blob,`${safeName(task.title)}.png`);
    slot.append(img,button);
  }
}
function injectPolish() {
  if (document.getElementById('ai24-polish')) return;
  const style = document.createElement('style');
  style.id = 'ai24-polish';
  style.textContent = `
.nav a{font-size:12px;min-height:40px}.sub{font-size:12px;line-height:1.5}.pill,.badge{font-size:10px}.bubble{font-size:12px;line-height:1.55}.composer textarea{font-size:12px;line-height:1.5;min-height:56px}.btn,.formats button,.mode button{font-size:10px;min-height:36px}.meta{font-size:9px;line-height:1.4}.dept b,.know b,.approval b,.notice b,.agent b,.post b,.skill b{font-size:10px}.answer,.ai19Answer,.ai21Answer{font-size:11px;line-height:1.55}.card{transition:box-shadow .18s ease,transform .18s ease}.card:focus-within{box-shadow:0 14px 34px #23366c17}button:focus-visible,a:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #315fe830;outline-offset:2px}.ai24DeliveryCard{margin-top:8px;border:1px solid #d8e4ff;background:#fff;border-radius:13px;padding:11px;font-size:11px;line-height:1.5}.ai24DeliveryCard p{margin:6px 0}.ai24DeliveryMeta{font-size:9px;color:#66708b}.ai24ImagePreview{display:block;width:100%;max-height:360px;object-fit:contain;border:1px solid #e1e8f6;border-radius:12px;margin-top:10px;background:#f8faff}.ai24ImageDownload{margin-top:8px}@media(max-width:700px){.main,.app.mini .main{padding-left:14px;padding-right:14px}.composer{align-items:stretch}.send{min-width:58px}.nav a{font-size:12px}}
`;
  document.head.appendChild(style);
}
function wrapDownloads() {
  if (window.__ai24DownloadWrapped) return;
  const previous = typeof window.download === 'function' ? window.download.bind(window) : null;
  window.download = async function downloadV24(task,format) {
    const fmt = String(format || '').toLowerCase();
    if (fmt === 'png' && taskKind(task) === 'image') {
      try {
        const image = await prepareAiImage(task);
        if (image) {
          downloadBlob(image.blob,`${safeName(task?.title)}.png`);
          window.toast?.('Đã tạo PNG bằng A.I Image');
          return {format:'png',size:image.blob.size,provider:image.model};
        }
      } catch(error) {
        console.warn('ai_image_download_fallback',{message:String(error?.message || error).slice(0,120)});
      }
    }
    return previous ? previous(task,format) : undefined;
  };
  window.__ai24DownloadWrapped = true;
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
wrapDownloads();
if (!wrapRouter()) {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    wrapDownloads();
    if (wrapRouter() || attempts > 120) clearInterval(timer);
  }, 50);
}

window.AIOfficeProductCompletionV24 = {
  version: VERSION,
  completeDelivery,
  prepareAiImage,
  defaultFormats: { ...DEFAULT_FORMAT }
};
