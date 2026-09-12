export const LEAN_DASHBOARD_VERSION='3.1.1-active-only';

const DONE_RE=/(hoàn tất|đã hủy|hủy xét duyệt|đã duyệt|completed|cancelled|rejected)/i;
const READY_ZERO_RE=/(sẵn sàng|0%|0 task|0 nhiệm vụ|chưa có)/i;
let scheduled=false;

function text(node){return String(node?.textContent||'').replace(/\s+/g,' ').trim()}
function titleOf(card){return text(card?.querySelector?.('h1,h2,h3,.headbar h2,.chiefTitle'))}
function findCard(re){return [...document.querySelectorAll('section.card,.card')].find(card=>re.test(titleOf(card)))||null}
function targetRequested(node){const id=node?.id;return Boolean(id&&location.hash===`#${id}`)}
function visible(nodes){return nodes.filter(node=>!node.hidden)}
function hideRest(nodes,max){let shown=0;for(const node of nodes){if(node.hidden)continue;shown+=1;if(shown>max)node.hidden=true}}
function setCard(card,show){if(!card)return;card.hidden=!show&&!targetRequested(card);card.dataset.aiV2Lean=show?'active':'hidden'}

function compactStats(){
  const stats=document.getElementById('tasks');if(!stats)return;
  for(const stat of stats.querySelectorAll('.stat')){
    const value=Number(stat.querySelector('b')?.textContent||0);
    const isDone=stat.querySelector('#sDone')!=null;
    stat.hidden=isDone||value<=0;
  }
  stats.hidden=visible([...stats.querySelectorAll('.stat')]).length===0;
}

function compactJobs(){
  const root=document.getElementById('aiV2TaskWorkspace');if(!root)return;
  const jobs=[...root.querySelectorAll('.aiV2Job')];
  for(const job of jobs){
    const status=text(job.querySelector('.aiV2JobState'));
    job.hidden=DONE_RE.test(status);
  }
  hideRest(jobs,3);
  const active=visible(jobs);
  const wait=active.filter(job=>/chờ duyệt/i.test(text(job.querySelector('.aiV2JobState')))).length;
  const summary=root.querySelector('.aiV2TaskSummary');if(summary)summary.textContent=`${Math.max(0,active.length-wait)} đang làm · ${wait} chờ duyệt`;
  root.querySelector('.aiV2TaskFoot')?.setAttribute('hidden','');
  root.hidden=active.length===0;
}

function compactDepartments(){
  const card=findCard(/tiến độ các bộ phận/i);if(!card)return;
  const rows=[...card.querySelectorAll('.dept')];
  for(const row of rows)row.hidden=READY_ZERO_RE.test(text(row));
  hideRest(rows,3);setCard(card,visible(rows).length>0);
}

function compactKnowledge(){
  const card=findCard(/kiến thức nền.*a\.i.*nội bộ/i);if(!card)return;
  const rows=[...card.querySelectorAll('.know')];
  for(const row of rows){const t=text(row);row.hidden=/nguồn mở/i.test(t)&&!/đã nạp|đã cập nhật|đang dùng/i.test(t)}
  hideRest(rows,3);setCard(card,visible(rows).length>0);
}

function compactApprovals(){
  const card=document.getElementById('approve')||findCard(/sản phẩm chờ duyệt/i);if(!card)return;
  const allRows=[...card.querySelectorAll('.approval')];
  for(const row of allRows)row.hidden=DONE_RE.test(text(row));
  const rows=visible(allRows);hideRest(rows,3);
  const heading=titleOf(card)||text(card.querySelector('.headbar'));
  setCard(card,!/\(0\)/.test(heading)&&visible(allRows).length>0);
}

function compactReports(){
  const card=findCard(/trưởng phòng báo cáo/i);if(!card)return;
  const rows=[...card.querySelectorAll('.notice')];
  for(const row of rows)row.hidden=DONE_RE.test(text(row));
  hideRest(rows,2);setCard(card,visible(rows).length>0);
}

function compactLearning(){
  const card=document.getElementById('learning')||findCard(/ai learning center/i);if(!card)return;
  const rows=[...card.querySelectorAll('.agent')];
  for(const row of rows){const t=text(row);row.hidden=/0\s*task/i.test(t)||/100%\s*duyệt/i.test(t)}
  hideRest(rows,3);setCard(card,visible(rows).length>0);
}

function compactCommunity(){
  const card=document.getElementById('community')||findCard(/cộng đồng.*skill/i);if(!card)return;
  const rows=[...card.querySelectorAll('.skill,.post')];
  for(const row of rows){const t=text(row);row.hidden=/approved.*0\s*lần dùng/i.test(t)||DONE_RE.test(t)}
  hideRest(rows,3);
  const hasDraft=Boolean(card.querySelector('input:not(:placeholder-shown),textarea:not(:placeholder-shown)'));
  setCard(card,hasDraft||visible(rows).length>0);
}

function reduceFloatingClutter(){
  if(innerWidth>700)return;
  const runtime=document.getElementById('cred22Launcher');if(runtime)runtime.hidden=true;
  for(const button of document.querySelectorAll('button,[role="button"]')){
    if(/runtime/i.test(text(button)))button.hidden=true;
  }
}

function addLeanCss(){
  if(document.getElementById('ai-v2-lean-style'))return;
  const style=document.createElement('style');style.id='ai-v2-lean-style';style.textContent=`
body.aiOfficeUIV2 .lower,body.aiOfficeUIV2 .brain,body.aiOfficeUIV2 .two{content-visibility:auto;contain-intrinsic-size:260px 520px}
body.aiOfficeUIV2 [hidden]{display:none!important}
@media(max-width:700px){body.aiOfficeUIV2 #cred22Launcher{display:none!important}body.aiOfficeUIV2 .footer{display:none}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2TaskHead p{display:none}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2JobMeta{opacity:.78}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2Delegation{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
`;
  document.head.appendChild(style);
}

export function applyLeanDashboard(){
  if(typeof document==='undefined')return false;
  addLeanCss();compactStats();compactJobs();compactDepartments();compactKnowledge();compactApprovals();compactReports();compactLearning();compactCommunity();reduceFloatingClutter();
  document.documentElement.dataset.aiOfficeLean='active-only';return true;
}

function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;applyLeanDashboard()})}
export function installLeanDashboard(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  if(window.__AIOfficeLeanDashboardV72){schedule();return true}
  window.__AIOfficeLeanDashboardV72=true;
  applyLeanDashboard();
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('hashchange',schedule);window.addEventListener('resize',schedule);
  window.addEventListener('ai-office-v2-tasks-updated',schedule);
  window.AIOfficeLeanDashboard=Object.freeze({version:LEAN_DASHBOARD_VERSION,refresh:applyLeanDashboard});
  return true;
}

if(typeof window!=='undefined')installLeanDashboard();
