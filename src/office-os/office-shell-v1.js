import { buildTaskWorkspaceModel } from '../office-v2/task-workspace.js';

export const AI_OFFICE_OS_SHELL_VERSION='1.0.0-p1';

const VIEWS=Object.freeze(['home','work','assistant','knowledge','account']);
const VIEW_LABELS=Object.freeze({home:'Trang chủ',work:'Công việc',assistant:'A.I',knowledge:'Tài liệu',account:'Tài khoản'});
const VIEW_ICONS=Object.freeze({home:'⌂',work:'✓',assistant:'✦',knowledge:'▱',account:'○'});
const CHAT_KEY='ai-office-conversation-v19';

let activeView='home';
let root=null;
let taskModel=buildTaskWorkspaceModel([]);
let taskRenderGeneration=0;
let bubbleObserver=null;
let answerObserver=null;

function el(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!=null)node.textContent=String(text);
  return node;
}

function cleanText(value='',limit=8000){
  return String(value||'').replace(/\s+/g,' ').trim().slice(0,limit);
}

function formatTime(value){
  try{return new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return''}
}

function addStyle(){
  if(document.getElementById('ai-office-os-shell-style'))return;
  const style=document.createElement('style');
  style.id='ai-office-os-shell-style';
  style.textContent=`
:root{--os-bg:#f5f7fb;--os-panel:#fff;--os-text:#18223b;--os-muted:#718099;--os-line:#e4e9f2;--os-primary:#315fe8;--os-soft:#eef3ff;--os-ok:#16845a;--os-warn:#a96712;--os-danger:#b74253}
body.aiOfficeOS{margin:0;background:var(--os-bg)!important;color:var(--os-text);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;overflow-x:hidden}
body.aiOfficeOS>#app{display:none!important}
#aiOfficeOSRoot{min-height:100vh;background:linear-gradient(180deg,#f4f6fb 0,#fbfcfe 100%)}
#aiOfficeOSRoot *{box-sizing:border-box}
.aiosRail{position:fixed;inset:0 auto 0 0;width:210px;padding:22px 14px;background:#101a36;color:#fff;z-index:40;display:flex;flex-direction:column}
.aiosBrand{display:flex;align-items:center;gap:10px;padding:2px 7px 22px}.aiosMark{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#5fc8ff,#655bf1);font-weight:900;box-shadow:0 12px 28px #3259df4a}.aiosBrand strong{display:block;font-size:13px}.aiosBrand small{display:block;margin-top:3px;font-size:9px;color:#9fb0d4}
.aiosNav{display:grid;gap:5px}.aiosNav button{border:0;background:transparent;color:#afbedc;min-height:45px;padding:0 12px;border-radius:13px;display:flex;align-items:center;gap:10px;font:750 11px/1 system-ui;text-align:left;cursor:pointer}.aiosNav button i{font-style:normal;width:23px;text-align:center;font-size:17px}.aiosNav button[aria-current="page"]{background:#ffffff12;color:#fff;box-shadow:inset 3px 0 0 #7ec7ff}.aiosRailFoot{margin-top:auto;padding:14px 8px 4px;border-top:1px solid #ffffff12;color:#8fa0c5;font-size:9px;line-height:1.45}
.aiosMain{margin-left:210px;min-height:100vh;padding:24px 26px 132px;max-width:1420px}.aiosTop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.aiosEyebrow{font-size:9px;font-weight:900;letter-spacing:.16em;color:#61708d}.aiosTop h1{font-size:26px;letter-spacing:-.025em;margin:5px 0 6px}.aiosTop p{margin:0;color:var(--os-muted);font-size:11px;line-height:1.5}.aiosReady{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid var(--os-line);border-radius:999px;background:#fff;font-size:9px;font-weight:850;color:#53617a;white-space:nowrap}.aiosReady:before{content:'';width:7px;height:7px;border-radius:50%;background:#20a269;box-shadow:0 0 0 3px #20a26918}
.aiosView{display:none}.aiosView.active{display:block}.aiosHero{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.55fr);gap:14px}.aiosPanel{background:var(--os-panel);border:1px solid var(--os-line);border-radius:22px;padding:18px;box-shadow:0 12px 34px #24375c0b}.aiosPanel h2{margin:0;font-size:14px}.aiosPanelHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.aiosPanelHead p{margin:3px 0 0;color:var(--os-muted);font-size:9px}.aiosBadge{padding:6px 9px;border-radius:999px;background:var(--os-soft);color:#3159ca;font:800 8px/1 system-ui;white-space:nowrap}
.aiosBrief{min-height:148px;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(circle at 88% 12%,#deebff 0,transparent 31%),#fff}.aiosBrief strong{font-size:20px;letter-spacing:-.02em}.aiosBrief p{max-width:720px;margin:8px 0 0;color:#65738d;font-size:11px;line-height:1.6}.aiosBriefActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.aiosQuick{border:1px solid #dce5f5;background:#f9fbff;color:#3159ca;border-radius:12px;min-height:38px;padding:0 12px;font:800 9px/1 system-ui;cursor:pointer}
.aiosCounters{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.aiosCounter{border:1px solid var(--os-line);border-radius:15px;padding:12px;background:#fbfcff}.aiosCounter b{display:block;font-size:23px}.aiosCounter span{font-size:8px;color:var(--os-muted)}
.aiosTaskList{display:grid;gap:8px}.aiosTask{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:13px;border:1px solid var(--os-line);border-radius:16px;background:#fcfdff}.aiosTaskTop{display:flex;gap:8px;align-items:center;min-width:0}.aiosTaskState{padding:5px 7px;border-radius:999px;background:#eef3ff;color:#3159ca;font:800 8px/1 system-ui;white-space:nowrap}.aiosTaskState.wait{background:#fff5e8;color:#956015}.aiosTaskState.done{background:#eaf9f2;color:#16704d}.aiosTaskState.bad{background:#fff0f2;color:#ae4050}.aiosTaskTitle{font-size:11px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aiosTaskMeta{margin-top:6px;color:#77839a;font-size:8px;line-height:1.45}.aiosProgress{height:4px;margin-top:8px;background:#edf0f6;border-radius:99px;overflow:hidden}.aiosProgress i{display:block;height:100%;background:linear-gradient(90deg,#4d73ec,#6cb9ff)}.aiosTaskActions{display:flex;gap:6px;align-items:center}.aiosAction{border:1px solid #dce5f5;background:#fff;color:#3159ca;border-radius:10px;min-height:32px;padding:0 9px;font:800 8px/1 system-ui;cursor:pointer}.aiosAction.danger{color:#af4252;background:#fff7f8;border-color:#efd2d7}.aiosEmpty{padding:28px 14px;text-align:center;color:#7b879d;font-size:10px;border:1px dashed #dce3ef;border-radius:15px}
.aiosAnswer{min-height:290px;max-height:56vh;overflow:auto;padding:3px}.aiosConversation{display:grid;gap:9px}.aiosTurn{max-width:min(760px,94%);padding:11px 13px;border-radius:15px;background:#f3f6fb;color:#293650;font-size:11px;line-height:1.55;white-space:pre-wrap}.aiosTurn.user{margin-left:auto;background:#315fe8;color:#fff}.aiosTurnMeta{display:block;margin-top:5px;opacity:.65;font-size:8px}.aiosLiveAnswer{margin-top:12px;padding:13px;border:1px solid #dce5f5;border-radius:15px;background:#f9fbff;color:#25334f;font-size:11px;line-height:1.55;white-space:pre-wrap}
.aiosKnowledgeGrid,.aiosConnectionGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.aiosSource{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:center;padding:13px;border:1px solid var(--os-line);border-radius:16px;background:#fcfdff}.aiosSourceIcon{width:42px;height:42px;border-radius:13px;background:#edf3ff;display:grid;place-items:center;font-size:18px}.aiosSource b{display:block;font-size:10px}.aiosSource small{display:block;margin-top:4px;color:var(--os-muted);font-size:8px;line-height:1.35}.aiosSourceState{font:800 8px/1 system-ui;color:#5e6b82}.aiosSourceState.on{color:var(--os-ok)}
.aiosScopeNote{margin-top:12px;padding:12px 13px;border-radius:14px;background:#f7f9fd;color:#65738d;font-size:9px;line-height:1.55}.aiosScopeNote b{color:#2a3853}
.aiosComposer{position:fixed;left:236px;right:26px;bottom:18px;z-index:60;display:flex;align-items:flex-end;gap:7px;max-width:1120px;margin:0 auto;padding:7px;border:1px solid #dce3ef;border-radius:20px;background:#ffffffee;backdrop-filter:blur(20px);box-shadow:0 18px 48px #1c2c5224}.aiosComposer textarea{flex:1;min-width:0;min-height:46px;max-height:120px;padding:12px 10px;border:0;outline:none;background:transparent;resize:none;font:500 12px/1.4 system-ui;color:var(--os-text)}.aiosComposer button{flex:0 0 46px;width:46px;height:46px;border:0;border-radius:14px;display:grid;place-items:center;cursor:pointer}.aiosAttach{background:#f2f5fa;color:#4f6080;font-size:18px}.aiosSend{background:#315fe8;color:#fff;font-size:18px;font-weight:900}.aiosStop{display:none;background:#fff0f2;color:#ae4050;font-size:16px}.aiosComposer.busy .aiosSend{display:none}.aiosComposer.busy .aiosStop{display:grid}
.aiosBottomNav{display:none}
@media(max-width:820px){.aiosRail{display:none}.aiosMain{margin-left:0;padding:18px 14px 142px}.aiosHero{grid-template-columns:1fr}.aiosTop{padding-top:4px}.aiosTop h1{font-size:22px}.aiosReady{display:none}.aiosKnowledgeGrid,.aiosConnectionGrid{grid-template-columns:1fr}.aiosComposer{left:10px;right:10px;bottom:76px;max-width:none}.aiosBottomNav{position:fixed;left:8px;right:8px;bottom:8px;z-index:65;height:58px;padding:5px;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;border:1px solid #dce3ef;border-radius:20px;background:#ffffffee;backdrop-filter:blur(20px);box-shadow:0 15px 42px #1b2b5128}.aiosBottomNav button{border:0;border-radius:14px;background:transparent;color:#77839a;display:grid;place-items:center;align-content:center;gap:3px;font:750 8px/1 system-ui}.aiosBottomNav button i{font-style:normal;font-size:17px}.aiosBottomNav button[aria-current="page"]{background:#eef3ff;color:#3159ca}.aiosTask{grid-template-columns:1fr}.aiosTaskActions{justify-content:flex-start}.aiosCounters{grid-template-columns:repeat(3,1fr)}}
@media(max-width:480px){.aiosMain{padding:15px 11px 142px}.aiosPanel{padding:14px;border-radius:18px}.aiosBrief strong{font-size:18px}.aiosCounters{gap:6px}.aiosCounter{padding:10px}.aiosCounter b{font-size:20px}.aiosComposer textarea{font-size:13px}.aiosTop p{font-size:10px}}
`;
  document.head.appendChild(style);
}

function createNavigation(className){
  const nav=el('nav',className);
  for(const view of VIEWS){
    const button=el('button');
    button.type='button';button.dataset.view=view;button.setAttribute('aria-label',VIEW_LABELS[view]);
    const icon=el('i',null,VIEW_ICONS[view]),label=el('span',null,VIEW_LABELS[view]);
    button.append(icon,label);button.addEventListener('click',()=>setView(view));nav.append(button);
  }
  return nav;
}

function createShell(){
  const shell=el('div');shell.id='aiOfficeOSRoot';
  const rail=el('aside','aiosRail');
  const brand=el('div','aiosBrand');const mark=el('div','aiosMark','AI');const copy=el('div');copy.append(el('strong',null,'A.I VĂN PHÒNG'),el('small',null,'Personal Office OS'));brand.append(mark,copy);
  rail.append(brand,createNavigation('aiosNav'),el('div','aiosRailFoot','Một văn phòng · một bộ não điều phối · nhiều công cụ phía sau'));

  const main=el('main','aiosMain');
  const top=el('header','aiosTop');const topCopy=el('div');topCopy.append(el('div','aiosEyebrow','PERSONAL A.I OFFICE OS'),el('h1',null,'Văn phòng của bạn'),el('p',null,'Giao việc một lần. A.I tự hiểu ngữ cảnh, chọn công cụ, thực hiện và báo kết quả.'));top.append(topCopy,el('div','aiosReady','Sẵn sàng'));
  main.append(top,createHomeView(),createWorkView(),createAssistantView(),createKnowledgeView(),createAccountView());

  const composer=el('form','aiosComposer');composer.id='aiosComposer';
  const attach=el('button','aiosAttach','＋');attach.type='button';attach.title='Tài liệu';attach.addEventListener('click',()=>setView('knowledge'));
  const input=el('textarea');input.id='aiosInput';input.placeholder='Hỏi thông tin hoặc giao việc cho Văn phòng A.I…';input.rows=1;
  const send=el('button','aiosSend','➜');send.type='submit';send.title='Gửi';
  const stop=el('button','aiosStop','■');stop.type='button';stop.title='Dừng công việc đang chạy';stop.addEventListener('click',stopCurrentTask);
  composer.append(attach,input,send,stop);composer.addEventListener('submit',event=>{event.preventDefault();void submitInput()});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();composer.requestSubmit()}});

  shell.append(rail,main,composer,createNavigation('aiosBottomNav'));
  return shell;
}

function createHomeView(){
  const view=el('section','aiosView');view.dataset.viewPanel='home';
  const hero=el('div','aiosHero');
  const brief=el('section','aiosPanel aiosBrief');brief.id='aiosBrief';
  const briefBody=el('div');briefBody.append(el('strong',null,'Bạn cần tôi xử lý gì?'),el('p',null,'Tôi có thể trả lời câu hỏi nhanh hoặc nhận một công việc hoàn chỉnh. Việc lựa chọn A.I, công cụ và quy trình được thực hiện phía sau.'));
  const quick=el('div','aiosBriefActions');
  for(const text of ['Tóm tắt việc cần chú ý','Tìm tài liệu trong Drive','Tra cứu thông tin mới nhất']){const button=el('button','aiosQuick',text);button.type='button';button.dataset.command=text;button.addEventListener('click',()=>runQuick(text));quick.append(button)}
  brief.append(briefBody,quick);
  const side=el('section','aiosPanel');const head=el('div','aiosPanelHead');const h=el('div');h.append(el('h2',null,'Nhịp công việc'),el('p',null,'Chỉ hiển thị những gì cần quan tâm'));head.append(h,el('span','aiosBadge','LIVE'));
  const counters=el('div','aiosCounters');for(const [key,label] of [['active','Đang làm'],['waitingApproval','Chờ duyệt'],['completed','Hoàn tất']]){const c=el('div','aiosCounter');const value=el('b',null,'0');value.dataset.counter=key;c.append(value,el('span',null,label));counters.append(c)}side.append(head,counters);
  hero.append(brief,side);view.append(hero);
  const recent=el('section','aiosPanel');recent.style.marginTop='14px';const rhead=el('div','aiosPanelHead');const rh=el('div');rh.append(el('h2',null,'Công việc gần đây'),el('p',null,'Một luồng từ yêu cầu đến kết quả'));rhead.append(rh,el('button','aiosQuick','Xem tất cả'));rhead.lastChild.addEventListener('click',()=>setView('work'));recent.append(rhead);const list=el('div','aiosTaskList');list.id='aiosHomeTasks';recent.append(list);view.append(recent);return view;
}

function createWorkView(){
  const view=el('section','aiosView');view.dataset.viewPanel='work';const panel=el('section','aiosPanel');const head=el('div','aiosPanelHead');const h=el('div');h.append(el('h2',null,'Công việc'),el('p',null,'Không tách Nhiệm vụ và Sản phẩm thành hai hệ thống'));head.append(h,el('span','aiosBadge','WORKSTREAM'));panel.append(head);const list=el('div','aiosTaskList');list.id='aiosWorkTasks';panel.append(list);view.append(panel);return view;
}

function createAssistantView(){
  const view=el('section','aiosView');view.dataset.viewPanel='assistant';const panel=el('section','aiosPanel');const head=el('div','aiosPanelHead');const h=el('div');h.append(el('h2',null,'A.I Workspace'),el('p',null,'Một điểm giao tiếp cho hỏi đáp và giao việc'));head.append(h,el('span','aiosBadge','CHIEF A.I'));panel.append(head);const answer=el('div','aiosAnswer');answer.id='aiosAnswer';answer.append(el('div','aiosConversation'));panel.append(answer);view.append(panel);return view;
}

function createKnowledgeView(){
  const view=el('section','aiosView');view.dataset.viewPanel='knowledge';const panel=el('section','aiosPanel');const head=el('div','aiosPanelHead');const h=el('div');h.append(el('h2',null,'Tài liệu & tri thức'),el('p',null,'Nguồn do bạn cấp quyền; A.I tự chọn khi cần'));head.append(h,el('span','aiosBadge','KNOWLEDGE'));panel.append(head);
  const grid=el('div','aiosKnowledgeGrid');
  const sources=[['☁','Google Drive','Tài liệu cá nhân, học tập và công việc'],['✉','Email được cấp quyền','Thông tin cần tìm kiếm hoặc xử lý'],['⌕','Web & nguồn chuyên môn','Tra cứu bên ngoài theo yêu cầu'],['▣','Tệp tải lên','PDF, Word, bảng tính và tài liệu khác']];
  for(const [icon,name,desc] of sources){const item=el('div','aiosSource');item.append(el('div','aiosSourceIcon',icon));const text=el('div');text.append(el('b',null,name),el('small',null,desc));item.append(text,el('span','aiosSourceState','Theo quyền'));grid.append(item)}panel.append(grid);panel.append(el('div','aiosScopeNote','Tài liệu chỉ được dùng theo quyền bạn đã cấp. Chi tiết kỹ thuật, telemetry và runtime không xuất hiện trong giao diện người dùng.'));view.append(panel);return view;
}

function createAccountView(){
  const view=el('section','aiosView');view.dataset.viewPanel='account';const panel=el('section','aiosPanel');const head=el('div','aiosPanelHead');const h=el('div');h.append(el('h2',null,'Tài khoản & kết nối'),el('p',null,'Một nơi duy nhất cho nguồn dữ liệu và quyền tự động hóa'));head.append(h,el('span','aiosBadge','CONNECTORS'));panel.append(head);
  const grid=el('div','aiosConnectionGrid');
  const connectors=[['G','Google Workspace','Drive · Gmail · Calendar'],['✉','Mail công việc / trường học','Kết nối bằng phương thức được ủy quyền'],['AI','OpenAI / A.I Gateway','Bộ não và công cụ A.I'],['⌁','Dịch vụ mở rộng','Chỉ module đã được phê duyệt']];
  for(const [icon,name,desc] of connectors){const item=el('div','aiosSource');item.append(el('div','aiosSourceIcon',icon));const text=el('div');text.append(el('b',null,name),el('small',null,desc));item.append(text,el('span','aiosSourceState','Quản lý'));grid.append(item)}panel.append(grid);
  const note=el('div','aiosScopeNote');note.append(el('b',null,'Phạm vi đã khóa: '),document.createTextNode('không có connector Facebook, Zalo hoặc social scraping trong dự án.'));panel.append(note);view.append(panel);return view;
}

function setView(view){
  if(!VIEWS.includes(view))view='home';activeView=view;
  for(const panel of root.querySelectorAll('[data-view-panel]'))panel.classList.toggle('active',panel.dataset.viewPanel===view);
  for(const button of root.querySelectorAll('button[data-view]'))button.setAttribute('aria-current',button.dataset.view===view?'page':'false');
  document.documentElement.dataset.aiOfficeOsView=view;
  try{history.replaceState(null,'',`#os-${view}`)}catch{}
}

function runQuick(text){
  const input=document.getElementById('aiosInput');if(!input)return;input.value=text;input.focus();setView('assistant');
}

async function submitInput(){
  const input=document.getElementById('aiosInput');const message=cleanText(input?.value||'',12000);if(!message)return;
  input.value='';appendLocalTurn('user',message);setView('assistant');setBusy(true);
  try{
    const runtime=window.AIOfficeCanonicalInputGate;
    if(!runtime?.dispatch)throw new Error('canonical_runtime_unavailable');
    const result=await runtime.dispatch(message,'office-os');
    if(result)appendLocalTurn('assistant',cleanText(result,12000));
  }catch{
    appendLocalTurn('assistant','Bộ não điều phối chưa sẵn sàng. Yêu cầu chưa được thực thi để tránh xử lý sai.');
  }finally{setBusy(false);await refreshTasks();syncLegacyAnswer()}
}

function setBusy(value){document.getElementById('aiosComposer')?.classList.toggle('busy',Boolean(value))}
function stopCurrentTask(){try{window.AIOfficeV21?.cancelRunningTask?.()}catch{}setBusy(false);setTimeout(refreshTasks,80)}

function stateClass(task){if(task.status==='WAITING_APPROVAL')return' wait';if(task.status==='COMPLETED')return' done';if(task.status==='FAILED'||task.status==='CANCELLED')return' bad';return''}
function taskMeta(task){const parts=[];if(task.agents?.length)parts.push(`Phân công: ${task.agents.join(' + ')}`);if(task.updatedLabel)parts.push(task.updatedLabel);if(task.formats?.length)parts.push(task.formats.join(' · '));if(task.qaScore!=null)parts.push(`QA ${Math.round(task.qaScore)}/100`);return parts.join(' · ')}
function taskAction(task){
  const actions=el('div','aiosTaskActions');
  if(task.canOpenProduct){const b=el('button','aiosAction','Sản phẩm');b.type='button';b.addEventListener('click',()=>openLegacySection('approve'));actions.append(b)}
  if(task.canStop){const b=el('button','aiosAction danger','Dừng');b.type='button';b.addEventListener('click',stopCurrentTask);actions.append(b)}
  if(task.canCancelApproval){const b=el('button','aiosAction danger','Hủy duyệt');b.type='button';b.addEventListener('click',()=>{window.AIOfficeV21?.cancelLatestApproval?.();setTimeout(refreshTasks,80)});actions.append(b)}
  return actions;
}
function renderTasks(target,items){
  if(!target)return;target.replaceChildren();
  if(!items.length){target.append(el('div','aiosEmpty','Chưa có công việc. Bạn chỉ cần nhập một yêu cầu ở ô lệnh phía dưới.'));return}
  for(const task of items){const card=el('article','aiosTask');const main=el('div');const top=el('div','aiosTaskTop');top.append(el('span','aiosTaskState'+stateClass(task),task.statusLabel),el('div','aiosTaskTitle',task.title));main.append(top,el('div','aiosTaskMeta',taskMeta(task)));const bar=el('div','aiosProgress'),fill=el('i');fill.style.width=`${Math.max(0,Math.min(100,Number(task.progress)||0))}%`;bar.append(fill);main.append(bar);card.append(main,taskAction(task));target.append(card)}
}
function renderTaskModel(){
  for(const node of root.querySelectorAll('[data-counter]'))node.textContent=String(taskModel[node.dataset.counter]||0);
  renderTasks(document.getElementById('aiosHomeTasks'),taskModel.visible.slice(0,3));renderTasks(document.getElementById('aiosWorkTasks'),taskModel.visible);
  const working=taskModel.active>0;setBusy(working);
}
async function refreshTasks(){
  const generation=++taskRenderGeneration;
  try{const tasks=await window.AIOfficeV2Tasks?.list?.();if(generation!==taskRenderGeneration)return;taskModel=buildTaskWorkspaceModel(tasks||[])}catch{if(generation!==taskRenderGeneration)return;taskModel=buildTaskWorkspaceModel([])}
  renderTaskModel();
}

function readConversation(){
  try{const value=JSON.parse(localStorage.getItem(CHAT_KEY)||'[]');return Array.isArray(value)?value.slice(-20):[]}catch{return[]}
}
function appendLocalTurn(role,text){
  const clean=cleanText(text,12000);if(!clean)return;
  let history=readConversation();const last=history.at(-1);if(last?.role===role&&cleanText(last.text)===clean)return;
  history.push({role,text:clean,at:new Date().toISOString(),source:'office-os'});try{localStorage.setItem(CHAT_KEY,JSON.stringify(history.slice(-30)))}catch{}renderConversation();
}
function renderConversation(){
  const wrap=document.querySelector('#aiosAnswer .aiosConversation');if(!wrap)return;wrap.replaceChildren();
  const history=readConversation();
  if(!history.length){wrap.append(el('div','aiosEmpty','Hãy hỏi một câu hoặc giao một việc. Văn phòng A.I sẽ tự phân biệt và xử lý.'));return}
  for(const item of history){const turn=el('div',`aiosTurn ${item.role==='user'?'user':'assistant'}`,cleanText(item.text,12000));const meta=el('span','aiosTurnMeta',`${item.role==='user'?'Bạn':'Văn phòng A.I'}${item.at?` · ${formatTime(item.at)}`:''}`);turn.append(meta);wrap.append(turn)}
  const box=document.getElementById('aiosAnswer');if(box)box.scrollTop=box.scrollHeight;
}
function syncLegacyAnswer(){
  const source=document.getElementById('answer')||document.getElementById('bubble');const text=cleanText(source?.textContent||'',12000);if(!text)return;
  const panel=document.getElementById('aiosAnswer');if(!panel)return;let live=panel.querySelector('.aiosLiveAnswer');if(!live){live=el('div','aiosLiveAnswer');panel.append(live)}live.textContent=text;
}
function observeLegacy(){
  const bubble=document.getElementById('bubble');if(bubble&&typeof MutationObserver!=='undefined'){bubbleObserver?.disconnect();bubbleObserver=new MutationObserver(syncLegacyAnswer);bubbleObserver.observe(bubble,{childList:true,subtree:true,characterData:true})}
  const answer=document.getElementById('answer');if(answer&&typeof MutationObserver!=='undefined'){answerObserver?.disconnect();answerObserver=new MutationObserver(syncLegacyAnswer);answerObserver.observe(answer,{childList:true,subtree:true,characterData:true})}
}
function openLegacySection(id){
  const legacy=document.getElementById(id);if(!legacy)return;document.body.classList.remove('aiOfficeOS');legacy.scrollIntoView?.({behavior:'smooth',block:'start'});setTimeout(()=>document.body.classList.add('aiOfficeOS'),2500);
}
function routeFromHash(){const value=String(location.hash||'').replace(/^#os-/,'');return VIEWS.includes(value)?value:'home'}

export function installAIOfficeOSShell(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  if(document.getElementById('aiOfficeOSRoot'))return true;
  addStyle();root=createShell();document.body.append(root);document.body.classList.add('aiOfficeOS');
  window.addEventListener('ai-office-v2-tasks-updated',refreshTasks);window.addEventListener('ai-office-v2-task-bridge-ready',refreshTasks);window.addEventListener('hashchange',()=>setView(routeFromHash()));
  renderConversation();observeLegacy();syncLegacyAnswer();void refreshTasks();setView(routeFromHash());
  document.documentElement.dataset.aiOfficeOs='p1';
  window.AIOfficeOS=Object.freeze({version:AI_OFFICE_OS_SHELL_VERSION,setView,refreshTasks,scope:Object.freeze({socialConnectors:false,facebook:false,zalo:false})});
  window.dispatchEvent(new CustomEvent('ai-office-os-ready',{detail:{version:AI_OFFICE_OS_SHELL_VERSION}}));
  return true;
}

if(typeof window!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installAIOfficeOSShell,{once:true});else installAIOfficeOSShell();
}
