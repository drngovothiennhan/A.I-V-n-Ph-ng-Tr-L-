export const AI_OFFICE_UI_V2_VERSION='3.0.0-production-shell';

function addStyle(){
  if(document.getElementById('ai-office-ui-v2-style'))return;
  const style=document.createElement('style');
  style.id='ai-office-ui-v2-style';
  style.textContent=`
body.aiOfficeUIV2{--ui2-navy:#0f1b3d;--ui2-navy2:#172653;--ui2-blue:#5c7cff;--ui2-sky:#70c9ff;--ui2-bg:#f2f5fb;--ui2-card:#fff;--ui2-text:#17213e;--ui2-muted:#73809b;--ui2-line:#e4eaf4;background:radial-gradient(circle at 84% 8%,#dce8ff 0,transparent 26%),linear-gradient(180deg,#eef3fb 0,#f8faff 46%,#f4f7fb 100%);color:var(--ui2-text)}
body.aiOfficeUIV2 .side{width:252px;background:linear-gradient(180deg,#101a37 0,#132247 58%,#0c1733 100%);border-right:0;box-shadow:18px 0 46px #17234b24;padding:22px 14px;color:#fff}
body.aiOfficeUIV2 .brand{padding:5px 7px 24px;border-bottom:1px solid #ffffff14;margin-bottom:12px}body.aiOfficeUIV2 .brand b{font-size:16px;letter-spacing:.02em;color:#fff}body.aiOfficeUIV2 .brand small{font-size:10px;color:#aab9de}body.aiOfficeUIV2 .logo{width:46px;height:46px;border-radius:15px;background:linear-gradient(145deg,#63d7ff,#6d6cff);box-shadow:0 12px 28px #1e8cff40}
body.aiOfficeUIV2 .nav{gap:6px}body.aiOfficeUIV2 .nav a{padding:11px 12px;border-radius:13px;color:#b9c7e7;font-size:12px;font-weight:750;transition:.18s ease}body.aiOfficeUIV2 .nav a i{font-size:17px}body.aiOfficeUIV2 .nav a:hover,body.aiOfficeUIV2 .nav a.active{background:linear-gradient(90deg,#ffffff18,#ffffff0a);color:#fff;box-shadow:inset 3px 0 0 #72b7ff}body.aiOfficeUIV2 .sideFoot{left:21px;right:15px;color:#7f90b8;border-top:1px solid #ffffff12;padding-top:13px}body.aiOfficeUIV2 .toggle{background:#172653;color:#fff;border-color:#334675;box-shadow:6px 0 16px #0c183136}
body.aiOfficeUIV2 .main{margin-left:252px;padding:22px 26px 40px;max-width:1500px}body.aiOfficeUIV2 .app.mini .main{margin-left:78px}body.aiOfficeUIV2 .app.mini .side{width:78px}
body.aiOfficeUIV2 .top{position:relative;overflow:hidden;grid-template-columns:1fr auto;gap:20px;padding:24px 25px;border-radius:24px;background:radial-gradient(circle at 78% 22%,#7ec9ff30,transparent 28%),linear-gradient(135deg,#101c3f 0,#1a2f66 62%,#334b8e 100%);box-shadow:0 18px 46px #15285b24;color:#fff;margin-bottom:14px}body.aiOfficeUIV2 .top:after{content:"";position:absolute;width:180px;height:180px;border-radius:50%;right:-55px;bottom:-90px;border:1px solid #ffffff24;box-shadow:0 0 0 34px #ffffff09,0 0 0 68px #ffffff05;pointer-events:none}body.aiOfficeUIV2 .ey{color:#91d6ff;font-size:10px;letter-spacing:.2em}body.aiOfficeUIV2 .top h1{font-size:30px;letter-spacing:-.02em;margin:7px 0 6px;color:#fff}body.aiOfficeUIV2 .sub{font-size:12px;color:#c1cceb;max-width:760px}body.aiOfficeUIV2 .pills{margin-top:13px}body.aiOfficeUIV2 .pill{background:#ffffff10;border-color:#ffffff1c;color:#dce6ff;padding:7px 10px}body.aiOfficeUIV2 .pill.blue,body.aiOfficeUIV2 .pill.green{background:#ffffff16;color:#fff;border-color:#ffffff26}body.aiOfficeUIV2 .clock{position:relative;z-index:1;background:#ffffff10;border-color:#ffffff1d;box-shadow:none;color:#fff;backdrop-filter:blur(18px);min-width:170px}body.aiOfficeUIV2 .clock small{color:#c6d2ef!important}body.aiOfficeUIV2 .clock b{font-size:29px}
body.aiOfficeUIV2 #uiV2SystemBar{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}body.aiOfficeUIV2 #uiV2SystemBar span{display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border-radius:999px;background:#0f193c80;border:1px solid #ffffff18;color:#c8d9ff;font-size:9px;font-weight:800}
body.aiOfficeUIV2 .chief{padding:18px 19px;border-radius:22px;background:linear-gradient(145deg,#ffffff 0,#f6f9ff 66%,#edf4ff 100%);border:1px solid #dae4f5;box-shadow:0 16px 40px #21396f12;margin-bottom:12px}body.aiOfficeUIV2 .chiefRow{grid-template-columns:112px minmax(0,1fr) 190px;gap:16px}body.aiOfficeUIV2 .chiefTitle{font-size:14px;color:#2c55c7;margin-bottom:8px}body.aiOfficeUIV2 .bubble{border:0;background:#f4f7fd;padding:13px 14px;font-size:12px;line-height:1.55;color:#26324f;box-shadow:inset 0 0 0 1px #e0e7f4}body.aiOfficeUIV2 .chiefQuick{font-size:10px;line-height:1.55;border-color:#dfe6f4;background:#fff}body.aiOfficeUIV2 .mascot{height:100px}body.aiOfficeUIV2 .orb{width:96px;height:96px}body.aiOfficeUIV2 .head{width:76px;height:61px}
body.aiOfficeUIV2 .formats{margin:13px 0 10px;gap:8px}body.aiOfficeUIV2 .formats button,body.aiOfficeUIV2 .mode button,body.aiOfficeUIV2 .btn{border-color:#dce4f0;background:#fff;color:#3556ae;font-size:10px;border-radius:11px;transition:.16s ease}body.aiOfficeUIV2 .formats button:hover,body.aiOfficeUIV2 .btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px #315fe81c}body.aiOfficeUIV2 .composer{padding:7px;background:#fff;border:1px solid #dbe4f2;border-radius:16px;box-shadow:0 10px 24px #23376612}body.aiOfficeUIV2 .composer textarea{border:0;background:transparent;min-height:52px;font-size:12px;outline:none;resize:vertical}body.aiOfficeUIV2 .send{min-width:86px;border-radius:12px;background:linear-gradient(145deg,#446ce8,#5864dc)}body.aiOfficeUIV2 .mic{width:48px;height:48px;align-self:center;border-color:#d7e1f0;background:#f8fbff}
body.aiOfficeUIV2 .stats{gap:10px;margin:12px 0}body.aiOfficeUIV2 .stat{padding:14px 15px;border:1px solid #dfe6f1;border-radius:15px;box-shadow:0 10px 26px #20396a0c;background:#fff}body.aiOfficeUIV2 .stat b{font-size:24px}body.aiOfficeUIV2 .stat span{font-size:10px;color:#7a859c}body.aiOfficeUIV2 .stat i{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#edf3ff;font-size:16px}
body.aiOfficeUIV2 .card,body.aiOfficeUIV2 #aiV2TaskWorkspace{border:1px solid #dfe6f1;border-radius:18px;box-shadow:0 12px 30px #1e386b0d;background:#fff}body.aiOfficeUIV2 .card{padding:16px}body.aiOfficeUIV2 .headbar h2,body.aiOfficeUIV2 #aiV2TaskWorkspace h2{font-size:15px}body.aiOfficeUIV2 .meta{font-size:9px;line-height:1.45}body.aiOfficeUIV2 .dept b,body.aiOfficeUIV2 .know b,body.aiOfficeUIV2 .approval b,body.aiOfficeUIV2 .notice b,body.aiOfficeUIV2 .agent b,body.aiOfficeUIV2 .post b,body.aiOfficeUIV2 .skill b{font-size:10px}body.aiOfficeUIV2 .dept,body.aiOfficeUIV2 .know,body.aiOfficeUIV2 .approval,body.aiOfficeUIV2 .notice,body.aiOfficeUIV2 .agent,body.aiOfficeUIV2 .post,body.aiOfficeUIV2 .skill{border-color:#e3e9f3;border-radius:13px;background:#fcfdff}
body.aiOfficeUIV2 #aiV2TaskWorkspace{padding:15px 16px!important;margin:12px 0!important}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2TaskHead h2{font-size:15px!important}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2TaskHead p{font-size:10px!important}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2TaskSummary{font-size:9px!important;padding:7px 10px!important}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2Job{padding:11px 12px!important;border-radius:13px!important;border-color:#e0e7f2!important;background:#fafcff!important}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2JobTitle{font-size:11px!important}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2JobState{font-size:8px!important;padding:5px 7px!important}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2Delegation{font-size:9px!important;margin-top:6px!important}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2JobMeta{font-size:8.5px!important}body.aiOfficeUIV2 #aiV2TaskWorkspace .aiV2JobBtn{font-size:8.5px!important;padding:7px 9px!important}
body.aiOfficeUIV2 .brain{margin-top:12px}body.aiOfficeUIV2 .brainGrid{gap:12px}body.aiOfficeUIV2 .brainBox{padding:14px;border-radius:15px;border-color:#dfe6f1;background:#fcfdff}body.aiOfficeUIV2 .brainBox strong{font-size:12px}body.aiOfficeUIV2 .brainBox p{font-size:10px}body.aiOfficeUIV2 .two{gap:12px;margin-top:12px}body.aiOfficeUIV2 .footer{font-size:9px;color:#8791a8}
body.aiOfficeUIV2 .mobile{background:#101d42;color:#fff;border:0;box-shadow:0 10px 24px #15234b38}
@media(max-width:900px){body.aiOfficeUIV2 .main{padding:18px 18px 32px}body.aiOfficeUIV2 .top h1{font-size:26px}body.aiOfficeUIV2 .chiefRow{grid-template-columns:95px 1fr}body.aiOfficeUIV2 .chiefQuick{grid-column:1/-1}}
@media(max-width:700px){body.aiOfficeUIV2 .side{width:min(86vw,304px);border-radius:0 22px 22px 0}body.aiOfficeUIV2 .main,body.aiOfficeUIV2 .app.mini .main{margin-left:0;padding:68px 11px 24px}body.aiOfficeUIV2 .top{padding:18px 17px;border-radius:20px;grid-template-columns:1fr}body.aiOfficeUIV2 .top h1{font-size:24px}body.aiOfficeUIV2 .sub{font-size:11px;line-height:1.5}body.aiOfficeUIV2 .pills{gap:5px}body.aiOfficeUIV2 .pill{padding:6px 8px;font-size:8px}body.aiOfficeUIV2 .stats{grid-template-columns:repeat(2,1fr);gap:8px}body.aiOfficeUIV2 .stat{padding:12px}body.aiOfficeUIV2 .stat b{font-size:21px}body.aiOfficeUIV2 .chief{padding:13px;border-radius:18px}body.aiOfficeUIV2 .chiefRow{grid-template-columns:74px 1fr;gap:10px}body.aiOfficeUIV2 .chiefQuick{display:none}body.aiOfficeUIV2 .mascot{height:78px;transform:scale(.72)}body.aiOfficeUIV2 .bubble{font-size:11px;padding:11px}body.aiOfficeUIV2 .formats{grid-template-columns:repeat(2,1fr)}body.aiOfficeUIV2 .composer{position:sticky;bottom:8px;z-index:14;box-shadow:0 18px 40px #172b5b24}body.aiOfficeUIV2 .composer textarea{font-size:11px;min-height:48px}body.aiOfficeUIV2 .send{min-width:68px;padding:0 12px}body.aiOfficeUIV2 .brainGrid,body.aiOfficeUIV2 .two{grid-template-columns:1fr}body.aiOfficeUIV2 #uiV2SystemBar{display:none}body.aiOfficeUIV2 #aiV2TaskWorkspace{padding:12px!important}}
`;
  document.head.appendChild(style);
}

function enhanceCopy(){
  const ey=document.querySelector('#top .ey');if(ey)ey.textContent='A.I VĂN PHÒNG · PRODUCTION WORKSPACE';
  const title=document.querySelector('#top h1');if(title)title.textContent='Trung tâm điều hành A.I';
  const sub=document.querySelector('#top .sub');if(sub)sub.textContent='Giao việc một lần · Trưởng phòng tự phân công · Theo dõi bằng Job Card · Duyệt trước thao tác quan trọng';
  const brandSmall=document.querySelector('.brand small');if(brandSmall)brandSmall.textContent='AI Office Operating System';
  const chiefTitle=document.querySelector('.chiefTitle');if(chiefTitle)chiefTitle.textContent='✦ Trưởng phòng A.I · Chief of Staff';
  const sideFoot=document.querySelector('.sideFoot');if(sideFoot)sideFoot.innerHTML='AI Office V2<br>Production workspace';
}

function addSystemBar(){
  if(document.getElementById('uiV2SystemBar'))return;
  const topLead=document.querySelector('#top > div:first-child');
  if(!topLead)return;
  const bar=document.createElement('div');bar.id='uiV2SystemBar';
  for(const text of ['● Chief of Staff ON','● Task Persistence ON','● Gemini Ready']){const s=document.createElement('span');s.textContent=text;bar.appendChild(s)}
  topLead.appendChild(bar);
}

function reorderWorkspace(){
  const stats=document.getElementById('tasks');
  const chief=document.querySelector('.chief');
  const workspace=document.getElementById('aiV2TaskWorkspace');
  if(stats&&chief&&stats.parentElement===chief.parentElement&&stats.previousElementSibling!==chief)stats.parentElement.insertBefore(chief,stats);
  if(stats&&workspace&&stats.nextElementSibling!==workspace)stats.insertAdjacentElement('afterend',workspace);
}

export function installAIOfficeUIV2(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  if(document.body?.classList.contains('aiOfficeUIV2'))return true;
  document.body.classList.add('aiOfficeUIV2');
  addStyle();enhanceCopy();addSystemBar();reorderWorkspace();
  document.documentElement.dataset.aiOfficeUi='v2';
  window.AIOfficeUIV2=Object.freeze({version:AI_OFFICE_UI_V2_VERSION,refresh:()=>{enhanceCopy();addSystemBar();reorderWorkspace()}});
  window.addEventListener('ai-office-v2-task-bridge-ready',()=>window.AIOfficeUIV2.refresh());
  window.dispatchEvent(new CustomEvent('ai-office-ui-v2-ready',{detail:{version:AI_OFFICE_UI_V2_VERSION}}));
  return true;
}
