const VERSION='3.6.0-unified-operations-center';
const TASK_KEY='ai-office-tasks-v11';
const HEALTH_URL='/api/health';
const ACTIVE_STATES=new Set(['QUEUED','PLANNING','WAITING_PERMISSION','WAITING_APPROVAL','WAITING_INPUT','RUNNING','VERIFYING','CREATING_OUTPUT']);
let taskTimer=null;
let activeTab='tasks';
let healthCache=null;
let healthRtt=null;

const getJson=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const esc=(text='')=>String(text).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clean=(text='',max=260)=>String(text||'').replace(/\s+/g,' ').trim().slice(0,max);
const date=(value='')=>{try{return value?new Date(value).toLocaleString('vi-VN'):'—'}catch{return'—'}};

export function canonicalTaskState(status=''){
  const s=String(status||'').toLowerCase();
  if(s==='queued')return'QUEUED';
  if(['received','analyzing','planning'].includes(s))return'PLANNING';
  if(['waiting_permission','awaiting_permission'].includes(s))return'WAITING_PERMISSION';
  if(['waiting_approval','awaiting_approval'].includes(s))return'WAITING_APPROVAL';
  if(['waiting_input','awaiting_input'].includes(s))return'WAITING_INPUT';
  if(['running','executing','delegated','processing'].includes(s))return'RUNNING';
  if(s==='verifying')return'VERIFYING';
  if(['creating_output','packaging'].includes(s))return'CREATING_OUTPUT';
  if(s==='completed')return'COMPLETED';
  if(s==='failed')return'FAILED';
  if(['cancelled','rejected','approval_cancelled','input_cancelled','output_cancelled'].includes(s))return'CANCELLED';
  return s?String(status).toUpperCase():'QUEUED';
}
function currentStep(task){
  const state=canonicalTaskState(task?.status);
  return clean(task?.currentStep||task?.step||task?.statusLabel||state,120);
}
function measuredProgress(task){
  return task?.progressMode==='measured'&&Number.isFinite(Number(task?.progress))?Math.max(0,Math.min(100,Number(task.progress))):null;
}
function taskTitle(task){return clean(task?.title||task?.originalMessage||task?.rootInstruction||'Công việc',180)}
function taskInstruction(task){return clean(task?.originalMessage||task?.rootInstruction||'',1800)}
function outputLabel(task){
  const names=[];
  if(task?.artifact?.name)names.push(task.artifact.name);
  if(Array.isArray(task?.artifacts))for(const item of task.artifacts)if(item?.name)names.push(item.name);
  if(Array.isArray(task?.artifactFormats))for(const fmt of task.artifactFormats)names.push(String(fmt).toUpperCase());
  return [...new Set(names)].slice(0,4).join(' · ');
}
function latestCompleted(tasks){return tasks.find(t=>canonicalTaskState(t?.status)==='COMPLETED')||null}

function injectStyle(){
  if(document.getElementById('ops36-style'))return;
  const style=document.createElement('style');style.id='ops36-style';style.textContent=`
#ops36{position:fixed;inset:0;z-index:1650;background:#101a3854;backdrop-filter:blur(5px);display:none;justify-content:flex-end}#ops36.show{display:flex}
#ops36Panel{width:min(720px,94vw);height:100%;background:#f8faff;border-left:1px solid #dce5f7;box-shadow:-22px 0 70px #15244928;display:flex;flex-direction:column;color:#172448}
.ops36Head{display:flex;align-items:center;gap:10px;padding:15px 16px;background:#fff;border-bottom:1px solid #e2e8f5}.ops36Head strong{font-size:14px}.ops36Tabs{display:flex;gap:6px;margin-left:auto}.ops36Tabs button,.ops36Close,.ops36Btn{border:1px solid #dce5f7;background:#fff;border-radius:10px;padding:7px 9px;color:#445275;font-weight:800;cursor:pointer;font-size:9px}.ops36Tabs button.active{background:#315fe8;color:#fff;border-color:#315fe8}.ops36Close{font-size:15px;padding:4px 9px}.ops36Body{padding:14px;overflow:auto}.ops36Toolbar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.ops36Toolbar input,.ops36Toolbar select{border:1px solid #dce5f7;border-radius:9px;background:#fff;padding:8px;font:inherit;font-size:9px}.ops36Toolbar input{flex:1;min-width:160px}.ops36Grid{display:grid;gap:8px}.ops36Task,.ops36Health{background:#fff;border:1px solid #e0e7f3;border-radius:13px;padding:11px}.ops36TaskHead,.ops36HealthHead{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}.ops36Task b,.ops36Health b{font-size:10px}.ops36Meta{font-size:8px;color:#6d7892;line-height:1.5;margin-top:4px}.ops36State{border-radius:999px;padding:5px 7px;font-size:7.5px;font-weight:900;background:#eef3ff;color:#3159ca;white-space:nowrap}.ops36State.ok{background:#eafaf3;color:#14764f}.ops36State.bad{background:#fff0f2;color:#b43a4e}.ops36State.warn{background:#fff7e8;color:#9a6515}.ops36Actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.ops36Empty{background:#fff;border:1px dashed #cdd8eb;border-radius:13px;padding:18px;text-align:center;color:#79839b;font-size:9px}.ops36Summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:10px}.ops36Metric{background:#fff;border:1px solid #e0e7f3;border-radius:11px;padding:9px}.ops36Metric b{display:block;font-size:16px}.ops36Metric span{font-size:7.5px;color:#758099}.ops36Issue{border-left:3px solid #ff8a3d}.ops36Healthy{border-left:3px solid #16a06a}.ops36Unknown{border-left:3px solid #9ca7bb}
@media(max-width:700px){#ops36Panel{width:100vw}.ops36Summary{grid-template-columns:repeat(2,1fr)}.ops36Head{padding:12px}.ops36Body{padding:10px}.ops36Tabs button{padding:7px 8px}}
`;document.head.appendChild(style);
}
function injectUi(){
  injectStyle();if(document.getElementById('ops36'))return;
  const root=document.createElement('div');root.id='ops36';root.innerHTML=`<aside id="ops36Panel" role="dialog" aria-modal="true" aria-labelledby="ops36Title"><div class="ops36Head"><strong id="ops36Title">Operations Center</strong><div class="ops36Tabs"><button type="button" data-ops36-tab="tasks">Task Center</button><button type="button" data-ops36-tab="ai">AI Center</button></div><button class="ops36Close" type="button" aria-label="Đóng">×</button></div><div class="ops36Body" id="ops36Body"></div></aside>`;document.body.appendChild(root);
  root.querySelector('.ops36Close').onclick=closeCenter;
  root.addEventListener('click',event=>{if(event.target===root)closeCenter()});
  root.querySelectorAll('[data-ops36-tab]').forEach(btn=>btn.onclick=()=>openCenter(btn.dataset.ops36Tab));
}
function stateClass(state){return state==='COMPLETED'?'ok':state==='FAILED'||state==='CANCELLED'?'bad':state.startsWith('WAITING')?'warn':''}
function summaryCounts(tasks){
  const states=tasks.map(t=>canonicalTaskState(t?.status));
  return{active:states.filter(s=>ACTIVE_STATES.has(s)).length,approval:states.filter(s=>s==='WAITING_APPROVAL').length,failed:states.filter(s=>s==='FAILED').length,done:states.filter(s=>s==='COMPLETED').length};
}
function taskCard(task,index){
  const state=canonicalTaskState(task?.status),progress=measuredProgress(task),instruction=taskInstruction(task),out=outputLabel(task);
  const isCurrent=index===0&&ACTIVE_STATES.has(state),retry=['FAILED','CANCELLED'].includes(state)&&instruction;
  return `<article class="ops36Task" data-task-id="${esc(task?.id||'')}"><div class="ops36TaskHead"><div><b>${esc(taskTitle(task))}</b><div class="ops36Meta">Tạo: ${esc(date(task?.createdAt||task?.at))} · Bước: ${esc(currentStep(task))}${progress!==null?` · Tiến độ đo được: ${progress}%`:''}${out?`<br>Đầu ra: ${esc(out)}`:''}</div></div><span class="ops36State ${stateClass(state)}">${esc(state)}</span></div><div class="ops36Actions">${isCurrent?'<button class="ops36Btn" data-ops36-action="cancel">Hủy công việc</button>':''}${retry?'<button class="ops36Btn" data-ops36-action="retry">Thử lại</button>':''}</div></article>`;
}
function renderTasks(){
  const body=document.getElementById('ops36Body');if(!body)return;
  const all=getJson(TASK_KEY,[]),counts=summaryCounts(all);
  body.innerHTML=`<div class="ops36Summary"><div class="ops36Metric"><b>${counts.active}</b><span>Đang xử lý</span></div><div class="ops36Metric"><b>${counts.approval}</b><span>Chờ duyệt</span></div><div class="ops36Metric"><b>${counts.failed}</b><span>Lỗi</span></div><div class="ops36Metric"><b>${counts.done}</b><span>Hoàn tất</span></div></div><div class="ops36Toolbar"><input id="ops36Search" placeholder="Tìm công việc"><select id="ops36Filter"><option value="all">Tất cả trạng thái</option><option value="active">Đang xử lý</option><option value="WAITING_APPROVAL">Chờ duyệt</option><option value="FAILED">Lỗi</option><option value="COMPLETED">Hoàn tất</option><option value="CANCELLED">Đã hủy</option></select></div><div class="ops36Grid" id="ops36TaskList"></div>`;
  const repaint=()=>{
    const q=clean(document.getElementById('ops36Search')?.value||'',120).toLowerCase(),filter=document.getElementById('ops36Filter')?.value||'all';
    const rows=all.filter(task=>{const state=canonicalTaskState(task?.status);const stateOk=filter==='all'||(filter==='active'&&ACTIVE_STATES.has(state))||state===filter;return stateOk&&(!q||taskTitle(task).toLowerCase().includes(q)||taskInstruction(task).toLowerCase().includes(q))});
    const list=document.getElementById('ops36TaskList');if(list)list.innerHTML=rows.length?rows.map((task,i)=>taskCard(task,i)).join(''):'<div class="ops36Empty">Không có công việc phù hợp.</div>';
  };
  body.querySelector('#ops36Search').oninput=repaint;body.querySelector('#ops36Filter').onchange=repaint;repaint();
}
async function retryTask(taskId){
  const task=getJson(TASK_KEY,[]).find(t=>String(t?.id||'')===String(taskId||'')),instruction=taskInstruction(task);
  if(!task||!instruction)return;
  closeCenter();await window.AIOfficeV22?.handleMessage?.(instruction,{spoken:false,source:'task-center-retry'});
}
function cancelCurrent(){window.AIOfficeGlobalCancelV33?.cancel?.('task');renderTasks()}
function taskAction(event){
  const button=event.target?.closest?.('[data-ops36-action]');if(!button)return;
  const card=button.closest('[data-task-id]'),id=card?.dataset?.taskId||'';
  if(button.dataset.ops36Action==='cancel')cancelCurrent();
  if(button.dataset.ops36Action==='retry')void retryTask(id);
}
function statusRow(name,status,detail='',kind='unknown'){
  const cls=kind==='issue'?'ops36Issue':kind==='healthy'?'ops36Healthy':'ops36Unknown';
  return `<article class="ops36Health ${cls}"><div class="ops36HealthHead"><div><b>${esc(name)}</b><div class="ops36Meta">${esc(detail||'Không có telemetry chi tiết.')}</div></div><span class="ops36State ${kind==='issue'?'warn':kind==='healthy'?'ok':''}">${esc(status)}</span></div></article>`;
}
async function fetchHealth(){
  const start=performance.now();
  try{const response=await fetch(`${HEALTH_URL}?t=${Date.now()}`,{cache:'no-store'});healthRtt=Math.round(performance.now()-start);if(!response.ok)throw new Error(`HTTP_${response.status}`);const data=await response.json();healthCache={data,sourceCommit:response.headers.get('x-ai-office-source-commit')||'',checkedAt:new Date().toISOString(),error:''};return healthCache}catch(error){healthRtt=Math.round(performance.now()-start);healthCache={data:{},sourceCommit:'',checkedAt:new Date().toISOString(),error:String(error?.message||error)};return healthCache}
}
function healthRows(cache,showAll=false){
  const h=cache?.data||{},providers=h?.providers||{},setup=h?.setup||{},tasks=getJson(TASK_KEY,[]),failed=tasks.filter(t=>canonicalTaskState(t?.status)==='FAILED'),last=latestCompleted(tasks);
  const gemini=Boolean(providers?.gemini?.configured||setup?.gemini?.ready),xiaozhi=Boolean(providers?.xiaozhi?.runtimeReady||h?.voice?.renderGatewayReady),drive=Boolean(providers?.googleDriveRuntime?.configured||h?.brain?.driveRuntimeConfigured),workspace=Boolean(providers?.googleWorkspace?.configured);
  const rows=[
    {name:'Gemini',status:gemini?'CONFIGURED':'NOT CONFIGURED',detail:gemini?'API key có cấu hình; AI Center không tự tiêu quota để probe grounding.':'Thiếu cấu hình Gemini.',kind:gemini?'unknown':'issue'},
    {name:'XiaoZhi Voice',status:xiaozhi?'READY':'DEGRADED',detail:xiaozhi?'Gateway voice sẵn sàng; browser fallback được giữ.':'Voice gateway chưa báo ready.',kind:xiaozhi?'healthy':'issue'},
    {name:'Drive Knowledge',status:drive?'READY':'NOT CONFIGURED',detail:drive?'Drive Runtime đã được cấu hình.':'Tài liệu nội bộ chưa có Drive Runtime; external-default vẫn hoạt động.',kind:drive?'healthy':'issue'},
    {name:'Google Workspace',status:workspace?'READY':'NOT CONFIGURED',detail:workspace?'Workspace actions đã cấu hình.':'Gmail/Calendar chưa có runtime action provider.',kind:workspace?'healthy':'issue'},
    {name:'Knowledge Index',status:drive?'DIRECT RETRIEVAL':'UNAVAILABLE',detail:'Hiện chỉ xác nhận direct retrieval + relevance ranking; durable semantic index/delta sync chưa có telemetry.',kind:'unknown'},
    {name:'AI Request Count',status:'NO TELEMETRY',detail:'Không suy diễn request count từ số task.',kind:'unknown'},
    {name:'AI Latency',status:'NO TELEMETRY',detail:`Health API RTT đo được: ${healthRtt??'—'} ms; đây không phải AI model latency.`,kind:'unknown'},
    {name:'Provider Quota',status:'NO TELEMETRY',detail:'Chỉ hiển thị quota khi provider API cung cấp số liệu đáng tin cậy.',kind:'unknown'},
    {name:'Recent Errors',status:failed.length?`${failed.length} FAILED TASK`:'NO TASK ERROR',detail:failed[0]?`Gần nhất: ${taskTitle(failed[0])}`:'Không có failed task trong task store.',kind:failed.length?'issue':'healthy'},
    {name:'Scheduler',status:'NO TELEMETRY',detail:'Runtime hiện chưa expose scheduler/cron health vào endpoint này.',kind:'unknown'},
    {name:'Last Successful Execution',status:last?'AVAILABLE':'NONE',detail:last?`${taskTitle(last)} · ${date(last.completedAt||last.updatedAt||last.createdAt)}`:'Chưa có completed task trong task store.',kind:last?'healthy':'unknown'},
    {name:'Deployment API',status:cache?.error?'UNREACHABLE':'LIVE',detail:cache?.error?cache.error:`Source commit: ${cache?.sourceCommit||'không được expose'} · Health RTT ${healthRtt??'—'} ms`,kind:cache?.error?'issue':'healthy'}
  ];
  return showAll?rows:rows.filter(row=>row.kind==='issue'||row.kind==='unknown');
}
async function renderAi({refresh=false}={}){
  const body=document.getElementById('ops36Body');if(!body)return;
  if(refresh||!healthCache){body.innerHTML='<div class="ops36Empty">Đang đọc trạng thái runtime…</div>';await fetchHealth()}
  const checked=healthCache?.checkedAt?date(healthCache.checkedAt):'—';
  body.innerHTML=`<div class="ops36Toolbar"><button class="ops36Btn" id="ops36Refresh">↻ Làm mới health</button><button class="ops36Btn" id="ops36Config">Cài đặt kết nối</button><label class="ops36Meta"><input type="checkbox" id="ops36All"> Hiện cả trạng thái tốt</label><span class="ops36Meta">Kiểm tra: ${esc(checked)}</span></div><div class="ops36Grid" id="ops36HealthList"></div>`;
  const repaint=()=>{const all=Boolean(document.getElementById('ops36All')?.checked),list=document.getElementById('ops36HealthList');if(list)list.innerHTML=healthRows(healthCache,all).map(row=>statusRow(row.name,row.status,row.detail,row.kind)).join('')};
  body.querySelector('#ops36Refresh').onclick=()=>void renderAi({refresh:true});body.querySelector('#ops36Config').onclick=()=>window.AIOfficeCredentialsV22?.open?.();body.querySelector('#ops36All').onchange=repaint;repaint();
}
function syncTabs(){document.querySelectorAll('[data-ops36-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.ops36Tab===activeTab))}
function startTaskRefresh(){stopTaskRefresh();taskTimer=setInterval(()=>{if(document.getElementById('ops36')?.classList.contains('show')&&activeTab==='tasks')renderTasks()},2500)}
function stopTaskRefresh(){if(taskTimer){clearInterval(taskTimer);taskTimer=null}}
export function openCenter(tab='tasks'){
  injectUi();activeTab=tab==='ai'?'ai':'tasks';document.getElementById('ops36')?.classList.add('show');syncTabs();
  if(activeTab==='tasks'){renderTasks();startTaskRefresh()}else{stopTaskRefresh();void renderAi({refresh:!healthCache})}
}
export function closeCenter(){document.getElementById('ops36')?.classList.remove('show');stopTaskRefresh()}
function installNavigation(){
  const nav=document.querySelector('.nav');if(nav&&!nav.querySelector('[data-ops36-nav="ai"]')){
    const ai=document.createElement('a');ai.href='#ai-center';ai.dataset.ops36Nav='ai';ai.innerHTML='<i>◉</i><span>AI Center</span>';const drive=[...nav.querySelectorAll('a')].find(a=>(a.textContent||'').includes('Drive Brain'));(drive||nav.lastElementChild)?.insertAdjacentElement('afterend',ai);ai.onclick=e=>{e.preventDefault();openCenter('ai')};
  }
  const taskLink=[...document.querySelectorAll('.nav a')].find(a=>(a.textContent||'').trim().includes('Nhiệm vụ'));if(taskLink&&!taskLink.dataset.ops36Bound){taskLink.dataset.ops36Bound='1';taskLink.onclick=e=>{e.preventDefault();openCenter('tasks')}};
  document.querySelectorAll('#tasks .stat').forEach(stat=>{if(stat.dataset.ops36Bound)return;stat.dataset.ops36Bound='1';stat.onclick=()=>openCenter('tasks')});
}
export function installOperationsCenter(){
  if(typeof window==='undefined')return false;
  if(window.AIOfficeOperationsV36?.version===VERSION)return true;
  injectUi();installNavigation();document.getElementById('ops36Body')?.addEventListener('click',taskAction);
  window.AIOfficeOperationsV36={version:VERSION,open:openCenter,close:closeCenter,taskState:canonicalTaskState,refreshHealth:fetchHealth};
  window.dispatchEvent(new CustomEvent('ai-office-operations-ready',{detail:{version:VERSION}}));return true;
}
