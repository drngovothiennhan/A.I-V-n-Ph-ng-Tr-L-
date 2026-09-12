import { TASK_STATES, TERMINAL_TASK_STATES } from './contracts.js';

export const OFFICE_V2_TASK_WORKSPACE_VERSION='2.9.0-job-cards';
const MAX_VISIBLE_TASKS=6;
const ACTIVE=new Set([
  TASK_STATES.RECEIVED,TASK_STATES.PLANNING,TASK_STATES.WAITING_PERMISSION,TASK_STATES.WAITING_INPUT,
  TASK_STATES.RUNNING,TASK_STATES.PAUSED,TASK_STATES.VERIFYING,TASK_STATES.CREATING_OUTPUT
]);

const STATUS_LABEL=Object.freeze({
  [TASK_STATES.RECEIVED]:'Đã nhận',
  [TASK_STATES.PLANNING]:'Đang lập kế hoạch',
  [TASK_STATES.WAITING_PERMISSION]:'Chờ ủy quyền',
  [TASK_STATES.WAITING_APPROVAL]:'Chờ duyệt',
  [TASK_STATES.WAITING_INPUT]:'Chờ dữ liệu',
  [TASK_STATES.RUNNING]:'Đang thực hiện',
  [TASK_STATES.PAUSED]:'Đã tạm dừng',
  [TASK_STATES.VERIFYING]:'Đang kiểm định',
  [TASK_STATES.CREATING_OUTPUT]:'Đang tạo sản phẩm',
  [TASK_STATES.COMPLETED]:'Hoàn tất',
  [TASK_STATES.CANCELLED]:'Đã hủy',
  [TASK_STATES.FAILED]:'Cần xử lý lại'
});

function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
function progressFor(task){
  const explicit=finite(task?.metadata?.progress,NaN);
  if(Number.isFinite(explicit))return Math.max(0,Math.min(100,explicit));
  if(task?.status===TASK_STATES.COMPLETED)return 100;
  if(task?.status===TASK_STATES.WAITING_APPROVAL)return 96;
  if(task?.status===TASK_STATES.VERIFYING)return 88;
  if(task?.status===TASK_STATES.CREATING_OUTPUT)return 92;
  if(task?.status===TASK_STATES.RUNNING)return 55;
  if(task?.status===TASK_STATES.PLANNING)return 18;
  return 0;
}
function dateValue(value){const n=Date.parse(String(value||''));return Number.isFinite(n)?n:0}
function isActive(task){return ACTIVE.has(task?.status)}
function isTerminal(task){return TERMINAL_TASK_STATES.has(task?.status)||task?.status===TASK_STATES.FAILED}
function formatTime(value){
  try{return new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).format(new Date(value))}catch{return''}
}
function outputs(task){
  const formats=Array.isArray(task?.metadata?.artifactFormats)?task.metadata.artifactFormats.filter(Boolean).slice(0,4):[];
  if(formats.length)return formats.map(x=>String(x).toUpperCase());
  return finite(task?.metadata?.outputCount,0)>0?['Sản phẩm']:[];
}

export function buildTaskWorkspaceModel(tasks=[]){
  const sorted=(Array.isArray(tasks)?tasks:[]).filter(task=>task?.id).slice().sort((a,b)=>dateValue(b.updatedAt)-dateValue(a.updatedAt));
  const latestActive=sorted.find(isActive)?.id||null;
  const latestApproval=sorted.find(task=>task.status===TASK_STATES.WAITING_APPROVAL)?.id||null;
  const visible=sorted.slice(0,MAX_VISIBLE_TASKS).map(task=>({
    id:String(task.id),
    title:String(task.title||task.instruction||'Công việc').slice(0,180),
    status:task.status,
    statusLabel:STATUS_LABEL[task.status]||'Đang theo dõi',
    progress:progressFor(task),
    updatedLabel:formatTime(task.updatedAt||task.createdAt),
    qaScore:Number.isFinite(Number(task?.metadata?.qaScore))?Number(task.metadata.qaScore):null,
    formats:outputs(task),
    risk:task?.metadata?.risk||null,
    needsApproval:Boolean(task?.metadata?.needsApproval),
    active:isActive(task),
    terminal:isTerminal(task),
    canStop:task.id===latestActive&&isActive(task),
    canCancelApproval:task.id===latestApproval&&task.status===TASK_STATES.WAITING_APPROVAL,
    canOpenProduct:task.status===TASK_STATES.WAITING_APPROVAL
  }));
  return Object.freeze({
    total:sorted.length,
    active:sorted.filter(isActive).length,
    waitingApproval:sorted.filter(task=>task.status===TASK_STATES.WAITING_APPROVAL).length,
    completed:sorted.filter(task=>task.status===TASK_STATES.COMPLETED).length,
    visible
  });
}

function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=String(text);return node}
function addStyle(){
  if(document.getElementById('ai-v2-task-workspace-style'))return;
  const style=document.createElement('style');style.id='ai-v2-task-workspace-style';style.textContent=`
#aiV2TaskWorkspace{margin-top:10px;padding:13px 14px;background:#fff;border:1px solid var(--line,#e2e8f5);border-radius:17px;box-shadow:0 10px 30px #23366c0c}
.aiV2TaskHead{display:flex;gap:10px;align-items:center;justify-content:space-between}.aiV2TaskHead h2{font-size:13px;margin:0}.aiV2TaskHead p{margin:3px 0 0;color:var(--mut,#6f7892);font-size:8.5px}.aiV2TaskSummary{white-space:nowrap;border:1px solid #dfe7f7;background:#f7f9ff;color:#50607f;border-radius:999px;padding:6px 9px;font:800 8px/1 system-ui}
.aiV2TaskList{display:grid;gap:7px;margin-top:10px}.aiV2Job{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;border:1px solid #e2e8f5;border-radius:12px;padding:9px 10px;background:#fcfdff}.aiV2JobMain{min-width:0}.aiV2JobTop{display:flex;align-items:center;gap:7px;min-width:0}.aiV2JobTitle{font-size:9.5px;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aiV2JobState{flex:0 0 auto;border-radius:999px;padding:4px 6px;background:#eef4ff;color:#3159ca;font:800 7px/1 system-ui}.aiV2JobState.wait{background:#fff5e9;color:#986016}.aiV2JobState.done{background:#eafaf3;color:#14764f}.aiV2JobState.stop{background:#fff1f3;color:#b33e50}.aiV2JobMeta{margin-top:5px;color:#77829a;font-size:7.5px}.aiV2JobBar{height:4px;background:#edf0f7;border-radius:99px;overflow:hidden;margin-top:6px}.aiV2JobBar i{display:block;height:100%;background:linear-gradient(90deg,#4e75ed,#66b8ff);border-radius:99px}.aiV2JobActions{display:flex;gap:5px;align-items:center}.aiV2JobBtn{border:1px solid #dce5f7;background:#fff;color:#3559be;border-radius:9px;padding:6px 7px;font:800 7.5px/1 system-ui;cursor:pointer}.aiV2JobBtn.danger{color:#b33e50;background:#fff5f6;border-color:#f0cbd1}.aiV2Empty{padding:8px 2px;color:#7a849b;font-size:8.5px}.aiV2TaskFoot{margin-top:8px;color:#8a93a7;font-size:7.5px}
@media(max-width:700px){#aiV2TaskWorkspace{padding:11px}.aiV2Job{grid-template-columns:1fr}.aiV2JobActions{justify-content:flex-start}.aiV2TaskHead{align-items:flex-start}.aiV2TaskSummary{font-size:7px}.aiV2JobTitle{font-size:9px}}
`;
  document.head.appendChild(style);
}
function stateClass(task){if(task.status===TASK_STATES.WAITING_APPROVAL)return' wait';if(task.status===TASK_STATES.COMPLETED)return' done';if(task.status===TASK_STATES.CANCELLED||task.status===TASK_STATES.FAILED)return' stop';return''}
function metaText(task){
  const parts=[];
  if(task.updatedLabel)parts.push(task.updatedLabel);
  if(task.qaScore!=null)parts.push(`QA ${Math.round(task.qaScore)}/100`);
  if(task.formats.length)parts.push(task.formats.join(' · '));
  if(task.risk==='high')parts.push('Rủi ro cao');
  return parts.join(' · ');
}
function invokeStop(){return window.AIOfficeV21?.cancelRunningTask?.()}
function invokeCancelApproval(){return window.AIOfficeV21?.cancelLatestApproval?.()}
function openProducts(){document.getElementById('approve')?.scrollIntoView?.({behavior:'smooth',block:'start'})}

function renderWorkspace(root,model){
  root.replaceChildren();
  const head=el('div','aiV2TaskHead');const titleWrap=el('div');titleWrap.append(el('h2',null,'Công việc'),el('p',null,'Job Card · trạng thái được lưu liên tục trên thiết bị'));
  head.append(titleWrap,el('span','aiV2TaskSummary',`${model.active} đang làm · ${model.waitingApproval} chờ duyệt`));root.append(head);
  const list=el('div','aiV2TaskList');root.append(list);
  if(!model.visible.length){list.append(el('div','aiV2Empty','Chưa có công việc. Hãy giao việc cho Trưởng phòng A.I ở ô lệnh phía trên.'));return}
  for(const task of model.visible){
    const card=el('article','aiV2Job');card.dataset.taskId=task.id;
    const main=el('div','aiV2JobMain'),top=el('div','aiV2JobTop');top.append(el('span','aiV2JobState'+stateClass(task),task.statusLabel),el('div','aiV2JobTitle',task.title));
    main.append(top,el('div','aiV2JobMeta',metaText(task)));
    const bar=el('div','aiV2JobBar'),fill=el('i');fill.style.width=`${task.progress}%`;bar.append(fill);main.append(bar);
    const actions=el('div','aiV2JobActions');
    if(task.canOpenProduct){const b=el('button','aiV2JobBtn','Xem sản phẩm');b.type='button';b.onclick=openProducts;actions.append(b)}
    if(task.canStop){const b=el('button','aiV2JobBtn danger','Dừng việc');b.type='button';b.onclick=()=>{invokeStop();setTimeout(()=>window.AIOfficeV2Tasks?.sync?.(),50)};actions.append(b)}
    if(task.canCancelApproval){const b=el('button','aiV2JobBtn danger','Hủy duyệt');b.type='button';b.onclick=()=>{invokeCancelApproval();setTimeout(()=>window.AIOfficeV2Tasks?.sync?.(),50)};actions.append(b)}
    card.append(main,actions);list.append(card);
  }
  if(model.total>model.visible.length)root.append(el('div','aiV2TaskFoot',`Đang hiển thị ${model.visible.length}/${model.total} công việc gần nhất.`));
}

export function installOfficeV2TaskWorkspace(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  if(document.getElementById('aiV2TaskWorkspace'))return true;
  const anchor=document.getElementById('tasks');if(!anchor)return false;
  addStyle();
  const root=el('section');root.id='aiV2TaskWorkspace';root.setAttribute('aria-label','Công việc A.I');anchor.insertAdjacentElement('afterend',root);
  let renderGeneration=0;
  const render=async()=>{
    const generation=++renderGeneration;
    try{
      const tasks=await window.AIOfficeV2Tasks?.list?.();
      if(generation!==renderGeneration)return;
      renderWorkspace(root,buildTaskWorkspaceModel(tasks||[]));
    }catch{if(generation===renderGeneration)renderWorkspace(root,buildTaskWorkspaceModel([]))}
  };
  window.addEventListener('ai-office-v2-tasks-updated',render);
  window.addEventListener('ai-office-v2-task-bridge-ready',render);
  window.AIOfficeV2TaskWorkspace=Object.freeze({version:OFFICE_V2_TASK_WORKSPACE_VERSION,render,model:buildTaskWorkspaceModel});
  void window.AIOfficeV2Tasks?.sync?.().finally?.(render);
  void render();
  return true;
}
