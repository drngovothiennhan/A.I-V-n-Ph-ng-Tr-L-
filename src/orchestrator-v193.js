import {
  classifyIntent as baseClassifyIntent,
  executeTask as baseExecuteTask,
  qaCheck,
  planFor,
  learnApproved,
  wrapApprovalHooks,
  contextSnapshot as baseContextSnapshot
} from './automation-core-v19.js';

const TASK_KEY = 'ai-office-tasks-v11';

function normalize(text='') {
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').trim();
}
function isContinuation(text='') {
  return /^(tiep tuc|lam tiep|sua tiep|cap nhat tiep|hoan thien|xuat tiep)\b/.test(normalize(text));
}
function getTasks() {
  try { return JSON.parse(localStorage.getItem(TASK_KEY) || '[]'); } catch { return []; }
}
function setTasks(tasks) {
  localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
}
function contextSnapshot() {
  const base = baseContextSnapshot?.() || {};
  const tasks = getTasks();
  const last = base.lastTask || tasks.find(t => t?.v19) || null;
  if (!last) return { ...base, lastTask: null };
  return {
    ...base,
    lastTask: {
      ...last,
      kind: last.kind || last.intent?.kind || last.category || 'general'
    }
  };
}
function docLabel(type='') {
  return ({
    plan:'Kế hoạch', report:'Báo cáo', official_letter:'Công văn', proposal:'Tờ trình',
    notice:'Thông báo', decision:'Quyết định', minutes:'Biên bản', invitation:'Giấy mời'
  })[type] || 'văn bản';
}
function artifactPhrase(task) {
  const formats = task?.artifactFormats || task?.intent?.artifactFormats || [];
  if (formats.includes('docx')) return ' và xuất Word DOCX';
  if (formats.includes('xlsx')) return ' và xuất Excel XLSX';
  if (formats.includes('pptx')) return ' và xuất PowerPoint PPTX';
  if (formats.includes('png')) return ' và xuất PNG';
  if (formats.includes('pdf')) return ' và xuất PDF';
  return '';
}
function enrichedContinuation(text, last) {
  const kind = last?.intent?.kind || last?.category || last?.kind || 'general';
  const prefix = {
    admin: `Tiếp tục soạn ${docLabel(last?.intent?.docType || last?.plan?.docType)}`,
    data: 'Tiếp tục đối chiếu và xử lý dữ liệu',
    presentation: 'Tiếp tục tạo trình bày slide',
    image: 'Tiếp tục tạo hình ảnh',
    tech: 'Tiếp tục triển khai hệ thống phần mềm',
    research: 'Tiếp tục nghiên cứu và kiểm chứng nguồn',
    general: 'Tiếp tục thực hiện công việc'
  }[kind] || 'Tiếp tục thực hiện công việc';
  const root = String(last?.rootInstruction || last?.originalMessage || last?.title || '').trim();
  const previous = String(last?.outputDraft || '').slice(0, 7000).trim();
  const follow = String(text || '').trim();
  return [
    `${prefix}${artifactPhrase(last)}.`,
    root ? `Nhiệm vụ gốc: ${root}` : '',
    previous ? `Kết quả đã làm trước đó:\n${previous}` : '',
    `Yêu cầu tiếp nối hiện tại: ${follow}`,
    'Không bắt đầu lại từ đầu nếu phần trước đã hoàn thành; tiếp tục đúng phần còn thiếu, giữ nguyên ràng buộc và dữ liệu đã được xác nhận.'
  ].filter(Boolean).join('\n\n');
}
function classifyIntent(text, context = contextSnapshot()) {
  if (isContinuation(text) && context?.lastTask) {
    const last = context.lastTask;
    const enriched = enrichedContinuation(text, last);
    const intent = baseClassifyIntent(enriched, { ...context, lastTask: { ...last, kind: last.kind || last.intent?.kind || last.category } });
    return {
      ...intent,
      kind: last.intent?.kind || last.category || last.kind || intent.kind,
      docType: last.intent?.docType || intent.docType,
      artifactFormats: (last.artifactFormats?.length ? last.artifactFormats : intent.artifactFormats) || [],
      userWantsFile: Boolean(last.requestedArtifact || last.artifactFormats?.length || intent.userWantsFile),
      continuation: true,
      continuationOf: last.id,
      continuationInstruction: enriched,
      confidence: Math.max(intent.confidence || 0, 0.97)
    };
  }
  return baseClassifyIntent(text, context);
}
async function executeTask(text, options = {}) {
  const ctx = contextSnapshot();
  const last = ctx.lastTask;
  const continuation = isContinuation(text) && Boolean(last);
  const effectiveText = continuation ? enrichedContinuation(text, last) : text;
  const task = await baseExecuteTask(effectiveText, options);
  if (!continuation || !last) return task;

  task.originalMessage = String(text || '').trim();
  task.rootInstruction = last.rootInstruction || last.originalMessage || last.title || '';
  task.continuationOf = last.id;
  task.title = `Tiếp tục: ${String(last.title || last.originalMessage || 'nhiệm vụ').slice(0, 78)}`;
  task.category = last.intent?.kind || last.category || task.category;
  task.intent = {
    ...(task.intent || {}),
    kind: last.intent?.kind || last.category || task.intent?.kind,
    docType: last.intent?.docType || task.intent?.docType,
    artifactFormats: last.artifactFormats?.length ? last.artifactFormats : (task.intent?.artifactFormats || []),
    continuation: true,
    continuationOf: last.id
  };
  task.artifactFormats = last.artifactFormats?.length ? last.artifactFormats : (task.artifactFormats || []);
  task.requestedArtifact = Boolean(last.requestedArtifact || task.requestedArtifact);

  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === task.id);
  if (idx >= 0) tasks[idx] = task; else tasks.unshift(task);
  setTasks(tasks);
  window.render?.();
  return task;
}

export {
  classifyIntent,
  executeTask,
  qaCheck,
  planFor,
  learnApproved,
  wrapApprovalHooks,
  contextSnapshot,
  isContinuation,
  enrichedContinuation
};
