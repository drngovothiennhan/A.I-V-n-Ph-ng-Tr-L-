export const MOBILE_SHELL_VERSION='3.2.0-focus-navigation';

const MOBILE_QUERY='(max-width:760px)';
const VIEWS=new Set(['home','work','brain','learning','community']);
let media=null;
let pulseObserver=null;
let activeView='home';

function txt(node){return String(node?.textContent||'').replace(/\s+/g,' ').trim()}
function isMobile(){return Boolean(media?.matches ?? (typeof window!=='undefined'&&window.matchMedia(MOBILE_QUERY).matches))}
function byHeading(re){return [...document.querySelectorAll('section.card,.card')].find(card=>re.test(txt(card.querySelector('h1,h2,h3,.headbar h2,.chiefTitle'))))||null}
function value(id){const raw=String(document.getElementById(id)?.textContent||'0').replace(/[^0-9-]/g,'');return Number.parseInt(raw||'0',10)||0}

function addStyle(){
  if(document.getElementById('ai-office-mobile-v73-style'))return;
  const style=document.createElement('style');
  style.id='ai-office-mobile-v73-style';
  style.textContent=`
#aiMobileTopbar,#aiMobilePulse,#aiMobileBottomNav,#aiMobileMoreSheet,#aiMobileScrim,#aiMobileEmpty,#aiMobileToolsButton{display:none}
@media(max-width:760px){
  body.aiOfficeMobileV73{--m73-bg:#f6f7fb;--m73-card:#fff;--m73-text:#17213e;--m73-muted:#6f7b94;--m73-line:#e5e9f1;--m73-blue:#315fe8;background:var(--m73-bg)!important;color:var(--m73-text);overscroll-behavior-y:none;-webkit-tap-highlight-color:transparent}
  body.aiOfficeMobileV73 .side,body.aiOfficeMobileV73 .overlay,body.aiOfficeMobileV73 .mobile,body.aiOfficeMobileV73 .top,body.aiOfficeMobileV73 #tasks,body.aiOfficeMobileV73 .footer{display:none!important}
  body.aiOfficeMobileV73 .main,body.aiOfficeMobileV73 .app.mini .main{margin-left:0!important;max-width:none!important;padding:66px 12px calc(158px + env(safe-area-inset-bottom))!important}
  body.aiOfficeMobileV73 .two{display:contents!important}
  body.aiOfficeMobileV73 .chief,body.aiOfficeMobileV73 #aiV2TaskWorkspace,body.aiOfficeMobileV73 #brain,body.aiOfficeMobileV73 #knowledge,body.aiOfficeMobileV73 #learning,body.aiOfficeMobileV73 #community,body.aiOfficeMobileV73 #approve,body.aiOfficeMobileV73 #aiMobileDepartments,body.aiOfficeMobileV73 #aiMobileReports{display:none!important}
  body.aiOfficeMobileV73[data-ai-mobile-view="home"] .chief{display:block!important}
  body.aiOfficeMobileV73[data-ai-mobile-view="home"] #aiV2TaskWorkspace:not([hidden]),body.aiOfficeMobileV73[data-ai-mobile-view="work"] #aiV2TaskWorkspace:not([hidden]){display:block!important}
  body.aiOfficeMobileV73[data-ai-mobile-view="work"] #approve:not([hidden]),body.aiOfficeMobileV73[data-ai-mobile-view="work"] #aiMobileReports:not([hidden]){display:block!important}
  body.aiOfficeMobileV73[data-ai-mobile-view="brain"] #brain:not([hidden]),body.aiOfficeMobileV73[data-ai-mobile-view="brain"] #knowledge:not([hidden]){display:block!important}
  body.aiOfficeMobileV73[data-ai-mobile-view="learning"] #learning:not([hidden]){display:block!important}
  body.aiOfficeMobileV73[data-ai-mobile-view="community"] #community:not([hidden]){display:block!important}
  body.aiOfficeMobileV73 .card,body.aiOfficeMobileV73 #aiV2TaskWorkspace{border:1px solid var(--m73-line)!important;border-radius:20px!important;box-shadow:0 8px 24px #17213e0d!important;background:var(--m73-card)!important}
  body.aiOfficeMobileV73 .chief{padding:14px!important;margin:6px 0 12px!important;background:#fff!important}
  body.aiOfficeMobileV73 .chiefRow{display:block!important}
  body.aiOfficeMobileV73 .mascot,body.aiOfficeMobileV73 .chiefQuick{display:none!important}
  body.aiOfficeMobileV73 .chiefTitle{margin:0 0 8px!important;font-size:12px!important;letter-spacing:.01em;color:#51617e!important}
  body.aiOfficeMobileV73 .bubble{padding:12px 13px!important;border:0!important;border-radius:14px!important;background:#f3f6fc!important;box-shadow:none!important;color:#24304b!important;font-size:13px!important;line-height:1.48!important;max-height:132px;overflow:auto}
  body.aiOfficeMobileV73 .formats{display:none!important}
  body.aiOfficeMobileV73.aiMobileToolsOpen .formats{display:grid!important;position:fixed;left:12px;right:12px;bottom:calc(142px + env(safe-area-inset-bottom));z-index:92;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin:0!important;padding:10px!important;border:1px solid var(--m73-line);border-radius:18px;background:#fff;box-shadow:0 18px 48px #14203f2b}
  body.aiOfficeMobileV73.aiMobileToolsOpen .formats button{min-height:44px!important;font-size:12px!important;border-radius:13px!important}
  body.aiOfficeMobileV73 .composer{position:fixed!important;left:10px!important;right:10px!important;bottom:calc(72px + env(safe-area-inset-bottom))!important;z-index:93!important;display:flex!important;align-items:flex-end!important;gap:6px!important;margin:0 auto!important;max-width:680px;padding:6px!important;border:1px solid #dfe4ee!important;border-radius:20px!important;background:#fff!important;box-shadow:0 16px 40px #15203f26!important}
  body.aiOfficeMobileV73 .composer textarea{min-width:0!important;min-height:44px!important;max-height:94px!important;padding:11px 8px!important;border:0!important;background:transparent!important;font-size:15px!important;line-height:1.35!important;resize:none!important}
  body.aiOfficeMobileV73 .mic,body.aiOfficeMobileV73 .send,body.aiOfficeMobileV73 #aiMobileToolsButton{flex:0 0 44px!important;width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important;padding:0!important;display:grid!important;place-items:center;border-radius:14px!important;font-size:0!important}
  body.aiOfficeMobileV73 .mic{background:#f4f6fb!important;border:1px solid #e1e5ee!important;color:#3556ae!important}
  body.aiOfficeMobileV73 .mic:after{content:'🎙';font-size:18px}
  body.aiOfficeMobileV73 .send{background:#315fe8!important;color:#fff!important;border:0!important}
  body.aiOfficeMobileV73 .send:after{content:'➜';font-size:19px;font-weight:900}
  body.aiOfficeMobileV73 #aiMobileToolsButton{border:0;background:#f4f6fb;color:#3556ae;font-size:23px!important;font-weight:500;cursor:pointer}
  body.aiOfficeMobileV73 #aiV2TaskWorkspace{margin:10px 0!important;padding:13px!important}
  body.aiOfficeMobileV73 #aiV2TaskWorkspace .aiV2TaskHead{gap:6px!important;margin-bottom:8px!important}
  body.aiOfficeMobileV73 #aiV2TaskWorkspace .aiV2TaskHead h2{font-size:14px!important}
  body.aiOfficeMobileV73 #aiV2TaskWorkspace .aiV2TaskSummary{font-size:11px!important;border-radius:999px!important;padding:6px 9px!important}
  body.aiOfficeMobileV73 #aiV2TaskWorkspace .aiV2Job{padding:11px!important;border-radius:15px!important;background:#fafbfe!important}
  body.aiOfficeMobileV73 #aiV2TaskWorkspace .aiV2JobTitle{font-size:13px!important;line-height:1.35!important}
  body.aiOfficeMobileV73 #aiV2TaskWorkspace .aiV2JobState{font-size:10px!important;padding:5px 7px!important}
  body.aiOfficeMobileV73 #aiV2TaskWorkspace .aiV2Delegation,body.aiOfficeMobileV73 #aiV2TaskWorkspace .aiV2JobMeta{font-size:10px!important;line-height:1.35!important}
  body.aiOfficeMobileV73 #aiV2TaskWorkspace .aiV2JobBtn{min-height:38px!important;font-size:11px!important;padding:7px 10px!important}
  body.aiOfficeMobileV73 #brain,body.aiOfficeMobileV73 #knowledge,body.aiOfficeMobileV73 #learning,body.aiOfficeMobileV73 #community,body.aiOfficeMobileV73 #approve,body.aiOfficeMobileV73 #aiMobileReports{margin:8px 0 12px!important;padding:14px!important}
  body.aiOfficeMobileV73 .headbar{align-items:flex-start!important;margin-bottom:10px!important}
  body.aiOfficeMobileV73 .headbar h2{font-size:15px!important;line-height:1.35!important}
  body.aiOfficeMobileV73 .brainGrid,body.aiOfficeMobileV73 .grid3,body.aiOfficeMobileV73 .docs,body.aiOfficeMobileV73 .knowledgeGrid,body.aiOfficeMobileV73 .deptGrid{grid-template-columns:1fr!important;gap:8px!important}
  body.aiOfficeMobileV73 .brainBox,body.aiOfficeMobileV73 .know,body.aiOfficeMobileV73 .approval,body.aiOfficeMobileV73 .notice,body.aiOfficeMobileV73 .agent,body.aiOfficeMobileV73 .post,body.aiOfficeMobileV73 .skill{border-radius:15px!important;padding:11px!important}
  body.aiOfficeMobileV73 .btn,body.aiOfficeMobileV73 .upload,body.aiOfficeMobileV73 .field{min-height:42px!important;font-size:12px!important}
  #aiMobileTopbar{position:fixed;inset:0 0 auto 0;z-index:88;height:56px;padding:calc(7px + env(safe-area-inset-top)) 14px 7px;display:flex;align-items:center;justify-content:space-between;background:#f6f7fbeb;backdrop-filter:blur(18px);border-bottom:1px solid #e5e9f1}
  #aiMobileTopbar strong{font-size:16px;letter-spacing:-.01em}
  #aiMobileTopbar span{display:inline-flex;align-items:center;gap:6px;color:#66728a;font-size:11px;font-weight:800}
  #aiMobileTopbar span:before{content:'';width:7px;height:7px;border-radius:50%;background:#24a36d;box-shadow:0 0 0 3px #24a36d18}
  #aiMobilePulse{display:none;gap:8px;margin:4px 0 10px}
  body.aiOfficeMobileV73[data-ai-mobile-view="home"] #aiMobilePulse:not([hidden]),body.aiOfficeMobileV73[data-ai-mobile-view="work"] #aiMobilePulse:not([hidden]){display:flex}
  #aiMobilePulse button{flex:1;min-height:48px;padding:7px 10px;border:1px solid var(--m73-line);border-radius:15px;background:#fff;color:#1f2d49;text-align:left;font:inherit;box-shadow:0 5px 16px #17213e09}
  #aiMobilePulse b{display:block;font-size:16px;line-height:1.05}
  #aiMobilePulse small{display:block;margin-top:4px;color:#748098;font-size:10px;font-weight:700}
  #aiMobileBottomNav{position:fixed;left:8px;right:8px;bottom:calc(7px + env(safe-area-inset-bottom));z-index:94;height:58px;padding:5px;display:grid;grid-template-columns:repeat(4,1fr);gap:3px;border:1px solid #dfe4ee;border-radius:20px;background:#ffffffed;backdrop-filter:blur(20px);box-shadow:0 14px 40px #13203e2b}
  #aiMobileBottomNav button{min-width:0;border:0;border-radius:15px;background:transparent;color:#7a859a;display:grid;place-items:center;align-content:center;gap:2px;font:700 10px/1 system-ui;cursor:pointer}
  #aiMobileBottomNav button i{font-style:normal;font-size:19px;line-height:1}
  #aiMobileBottomNav button[aria-current="page"]{background:#eef3ff;color:#2d55cc}
  #aiMobileScrim{position:fixed;inset:0;z-index:89;background:#10182f4d;backdrop-filter:blur(2px)}
  #aiMobileMoreSheet{position:fixed;left:10px;right:10px;bottom:calc(73px + env(safe-area-inset-bottom));z-index:95;padding:10px;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;border:1px solid #e0e5ef;border-radius:20px;background:#fff;box-shadow:0 20px 56px #10203d36}
  body.aiOfficeMobileV73.aiMobileMoreOpen #aiMobileScrim,body.aiOfficeMobileV73.aiMobileMoreOpen #aiMobileMoreSheet{display:grid}
  #aiMobileMoreSheet button{min-height:58px;padding:10px;border:1px solid #e8ebf2;border-radius:15px;background:#f8f9fc;color:#23304b;text-align:left;font:800 12px/1.25 system-ui;cursor:pointer}
  #aiMobileMoreSheet button small{display:block;margin-top:4px;color:#7b869a;font-size:9px;font-weight:650}
  #aiMobileEmpty{margin:22px 5px;padding:18px;border:1px dashed #d4dbe8;border-radius:17px;color:#748098;background:#fafbfe;text-align:center;font-size:12px;line-height:1.45}
  body.aiOfficeMobileV73.aiMobileKeyboard #aiMobileBottomNav{display:none!important}
  body.aiOfficeMobileV73.aiMobileKeyboard .composer{bottom:calc(8px + env(safe-area-inset-bottom))!important}
  body.aiOfficeMobileV73.aiMobileKeyboard.aiMobileToolsOpen .formats{bottom:calc(66px + env(safe-area-inset-bottom))!important}
  body.aiOfficeMobileV73.aiMobileKeyboard .main{padding-bottom:calc(92px + env(safe-area-inset-bottom))!important}
  @media(prefers-reduced-motion:reduce){body.aiOfficeMobileV73 *{scroll-behavior:auto!important;transition:none!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
}
`;
  document.head.appendChild(style);
}

function ensureStableIds(){
  const departments=byHeading(/tiến độ các bộ phận/i);if(departments&&!departments.id)departments.id='aiMobileDepartments';
  const reports=byHeading(/trưởng phòng báo cáo/i);if(reports&&!reports.id)reports.id='aiMobileReports';
}

function makeButton(icon,label,mode){
  const button=document.createElement('button');button.type='button';button.dataset.aiMobileNav=mode;button.innerHTML=`<i>${icon}</i><span>${label}</span>`;return button;
}

function ensureChrome(){
  const main=document.querySelector('.main');if(!main)return false;
  if(!document.getElementById('aiMobileTopbar')){
    const top=document.createElement('div');top.id='aiMobileTopbar';top.setAttribute('role','banner');top.innerHTML='<strong>A.I Văn phòng</strong><span>Production</span>';document.body.appendChild(top);
  }
  if(!document.getElementById('aiMobilePulse')){
    const pulse=document.createElement('div');pulse.id='aiMobilePulse';pulse.innerHTML='<button type="button" data-ai-mobile-pulse="work"><b id="aiMobileActive">0</b><small>Đang xử lý</small></button><button type="button" data-ai-mobile-pulse="work"><b id="aiMobileWait">0</b><small>Chờ duyệt</small></button><button type="button" data-ai-mobile-pulse="work"><b id="aiMobileUrgent">0</b><small>Ưu tiên cao</small></button>';
    const chief=document.querySelector('.chief');main.insertBefore(pulse,chief||main.firstChild);
    pulse.addEventListener('click',event=>{if(event.target.closest('[data-ai-mobile-pulse]'))setView('work',{syncHash:true,scroll:true})});
  }
  if(!document.getElementById('aiMobileBottomNav')){
    const nav=document.createElement('nav');nav.id='aiMobileBottomNav';nav.setAttribute('aria-label','Điều hướng nhanh');
    nav.append(makeButton('⌂','Trang chủ','home'),makeButton('☷','Công việc','work'),makeButton('✦','Trợ lý','assistant'),makeButton('•••','Thêm','more'));
    nav.addEventListener('click',event=>{
      const button=event.target.closest('[data-ai-mobile-nav]');if(!button)return;
      const mode=button.dataset.aiMobileNav;
      if(mode==='more')return toggleMore();
      closeMore();
      if(mode==='assistant')return setView('home',{focus:true,syncHash:false,scroll:false,navMode:'assistant'});
      setView(mode,{syncHash:true,scroll:true});
    });
    document.body.appendChild(nav);
  }
  if(!document.getElementById('aiMobileScrim')){
    const scrim=document.createElement('div');scrim.id='aiMobileScrim';scrim.setAttribute('aria-hidden','true');scrim.addEventListener('click',closeMore);document.body.appendChild(scrim);
  }
  if(!document.getElementById('aiMobileMoreSheet')){
    const sheet=document.createElement('div');sheet.id='aiMobileMoreSheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Công cụ khác');
    sheet.innerHTML='<button type="button" data-ai-mobile-target="brain" data-hash="#brain">🧠 Drive Brain<small>Tài liệu & ngữ cảnh</small></button><button type="button" data-ai-mobile-target="brain" data-hash="#knowledge" data-scroll="#knowledge">▣ Kiến thức<small>Nguồn nội bộ</small></button><button type="button" data-ai-mobile-target="learning" data-hash="#learning">▥ AI Learning<small>Năng lực các agent</small></button><button type="button" data-ai-mobile-target="community" data-hash="#community">♟ Cộng đồng<small>Skill & workflow</small></button>';
    sheet.addEventListener('click',event=>{const button=event.target.closest('[data-ai-mobile-target]');if(!button)return;const view=button.dataset.aiMobileTarget;const hash=button.dataset.hash||'';const selector=button.dataset.scroll||'';closeMore();setView(view,{syncHash:true,hash,scroll:true});if(selector)setTimeout(()=>document.querySelector(selector)?.scrollIntoView({block:'start',behavior:'smooth'}),80)});
    document.body.appendChild(sheet);
  }
  if(!document.getElementById('aiMobileEmpty')){
    const empty=document.createElement('div');empty.id='aiMobileEmpty';empty.hidden=true;main.appendChild(empty);
  }
  const composer=document.querySelector('.composer');
  if(composer&&!document.getElementById('aiMobileToolsButton')){
    const tools=document.createElement('button');tools.type='button';tools.id='aiMobileToolsButton';tools.setAttribute('aria-label','Chọn loại sản phẩm');tools.setAttribute('aria-expanded','false');tools.textContent='+';
    tools.addEventListener('click',()=>toggleTools());composer.insertBefore(tools,composer.firstChild);
  }
  const msg=document.getElementById('msg');
  if(msg&&!msg.dataset.aiMobileKeyboardBound){
    msg.dataset.aiMobileKeyboardBound='1';
    msg.addEventListener('focus',()=>{if(!isMobile())return;document.body.classList.add('aiMobileKeyboard');updateNav('assistant')});
    msg.addEventListener('blur',()=>setTimeout(()=>{document.body.classList.remove('aiMobileKeyboard');if(activeView==='home')updateNav('home')},90));
  }
  return true;
}

function updateNav(mode=activeView){
  const nav=document.getElementById('aiMobileBottomNav');if(!nav)return;
  for(const button of nav.querySelectorAll('[data-ai-mobile-nav]')){
    const selected=button.dataset.aiMobileNav===mode;button.toggleAttribute('aria-current',selected);if(selected)button.setAttribute('aria-current','page');
  }
}

function closeMore(){document.body?.classList.remove('aiMobileMoreOpen');document.querySelector('[data-ai-mobile-nav="more"]')?.setAttribute('aria-expanded','false')}
function toggleMore(){if(!isMobile())return;const open=!document.body.classList.contains('aiMobileMoreOpen');document.body.classList.toggle('aiMobileMoreOpen',open);document.querySelector('[data-ai-mobile-nav="more"]')?.setAttribute('aria-expanded',String(open));if(open)updateNav('more');else updateNav(activeView)}
function closeTools(){document.body?.classList.remove('aiMobileToolsOpen');document.getElementById('aiMobileToolsButton')?.setAttribute('aria-expanded','false')}
function toggleTools(){if(!isMobile())return;const open=!document.body.classList.contains('aiMobileToolsOpen');document.body.classList.toggle('aiMobileToolsOpen',open);document.getElementById('aiMobileToolsButton')?.setAttribute('aria-expanded',String(open))}

function hashFor(view){return view==='work'?'#tasks':view==='brain'?'#brain':view==='learning'?'#learning':view==='community'?'#community':'#top'}
function viewForHash(hash){if(/^#(?:tasks|aiV2TaskWorkspace|approve)$/i.test(hash))return'work';if(/^#(?:brain|knowledge)$/i.test(hash))return'brain';if(hash==='#learning')return'learning';if(hash==='#community')return'community';return'home'}

function setView(view,options={}){
  if(!isMobile())return false;
  const next=VIEWS.has(view)?view:'home';activeView=next;document.body.dataset.aiMobileView=next;closeTools();
  if(options.syncHash&&typeof history!=='undefined')history.replaceState(null,'',options.hash||hashFor(next));
  updateNav(options.navMode||next);
  updateEmpty();
  window.AIOfficeLeanDashboard?.refresh?.();
  if(options.scroll)requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
  if(options.focus)setTimeout(()=>document.getElementById('msg')?.focus(),50);
  return true;
}

function updatePulse(){
  const active=value('sActive'),wait=value('sWait'),urgent=value('sUrgent');
  const pulse=document.getElementById('aiMobilePulse');if(!pulse)return;
  const a=document.getElementById('aiMobileActive'),w=document.getElementById('aiMobileWait'),u=document.getElementById('aiMobileUrgent');
  if(a)a.textContent=String(active);if(w)w.textContent=String(wait);if(u)u.textContent=String(urgent);
  const buttons=[...pulse.querySelectorAll('button')];if(buttons[0])buttons[0].hidden=active<=0;if(buttons[1])buttons[1].hidden=wait<=0;if(buttons[2])buttons[2].hidden=urgent<=0;
  pulse.hidden=active+wait+urgent<=0;
  updateEmpty();
}

function updateEmpty(){
  const empty=document.getElementById('aiMobileEmpty');if(!empty||!isMobile())return;
  let message='';
  if(activeView==='work'){
    const hasWork=value('sActive')+value('sWait')>0||[document.getElementById('aiV2TaskWorkspace'),document.getElementById('approve'),document.getElementById('aiMobileReports')].some(node=>node&&!node.hidden&&txt(node).length>40);
    if(!hasWork)message='Chưa có công việc đang chạy. Chọn “Trợ lý” để hỏi thông tin hoặc giao việc mới.';
  }else if(activeView==='learning'&&document.getElementById('learning')?.hidden)message='Chưa có dữ liệu Learning cần hiển thị.';
  else if(activeView==='community'&&document.getElementById('community')?.hidden)message='Chưa có Skill hoặc nội dung cộng đồng cần hiển thị.';
  empty.textContent=message;empty.hidden=!message;
}

function bindPulseObserver(){
  if(pulseObserver)return;
  const stats=document.getElementById('tasks');if(!stats)return;
  pulseObserver=new MutationObserver(()=>requestAnimationFrame(updatePulse));
  pulseObserver.observe(stats,{subtree:true,childList:true,characterData:true});
}

function refresh(){
  if(typeof document==='undefined')return false;
  ensureStableIds();ensureChrome();bindPulseObserver();updatePulse();
  if(isMobile()){
    document.body.classList.add('aiOfficeMobileV73');
    document.getElementById('side')?.classList.remove('open');document.getElementById('overlay')?.classList.remove('show');
    setView(viewForHash(location.hash),{syncHash:false,scroll:false});
  }
  return true;
}

function applyViewport(){
  const mobile=isMobile();document.body?.classList.toggle('aiOfficeMobileV73',mobile);
  if(mobile)refresh();
  else{
    document.body?.removeAttribute('data-ai-mobile-view');document.body?.classList.remove('aiMobileMoreOpen','aiMobileToolsOpen','aiMobileKeyboard');
    closeMore();closeTools();
  }
}

export function installMobileShell(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  addStyle();media=window.matchMedia(MOBILE_QUERY);
  if(!window.__AIOfficeMobileShellV73){
    window.__AIOfficeMobileShellV73=true;
    media.addEventListener?.('change',applyViewport);
    window.addEventListener('hashchange',()=>{if(isMobile())setView(viewForHash(location.hash),{syncHash:false,scroll:false})});
    window.addEventListener('ai-office-v2-task-bridge-ready',refresh);
    window.addEventListener('ai-office-v2-tasks-updated',updatePulse);
    window.addEventListener('ai-office-ui-v2-ready',refresh);
    setTimeout(refresh,0);setTimeout(refresh,300);setTimeout(refresh,1000);
  }
  applyViewport();
  window.AIOfficeMobileShell=Object.freeze({version:MOBILE_SHELL_VERSION,refresh,setView});
  return true;
}

if(typeof window!=='undefined')installMobileShell();
