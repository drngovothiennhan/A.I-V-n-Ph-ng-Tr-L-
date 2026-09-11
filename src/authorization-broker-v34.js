const VERSION='3.4.0-authorization-broker';
const HEALTH_URL='/api/health';
const SEEN=new Set();

const SERVICE=Object.freeze({
  gemini:{label:'Gemini',scope:'GEMINI_API_KEY · server-side only',mode:'setup',health:h=>Boolean(h?.providers?.gemini?.configured||h?.setup?.gemini?.ready)},
  drive:{label:'Google Drive',scope:'drive.readonly · thư mục A.I Văn phòng đã được chia sẻ',mode:'setup',health:h=>Boolean(h?.providers?.googleDriveRuntime?.configured||h?.brain?.driveRuntimeConfigured||h?.setup?.drive?.ready)},
  gmail:{label:'Gmail',scope:'Chỉ quyền thư cần cho thao tác được yêu cầu',mode:'workspace',health:h=>Boolean(h?.providers?.googleWorkspace?.configured)},
  calendar:{label:'Google Calendar',scope:'Chỉ quyền lịch cần cho thao tác được yêu cầu',mode:'workspace',health:h=>Boolean(h?.providers?.googleWorkspace?.configured)},
  workspace:{label:'Google Workspace',scope:'Least privilege theo từng công cụ',mode:'workspace',health:h=>Boolean(h?.providers?.googleWorkspace?.configured)}
});

const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function health(){try{const r=await fetch(`${HEALTH_URL}?t=${Date.now()}`,{cache:'no-store'});return r.ok?await r.json():{}}catch{return{}}}
function configFor(service){return SERVICE[String(service||'').toLowerCase()]||null}

function injectStyle(){
  if(document.getElementById('auth34-style'))return;
  const s=document.createElement('style');s.id='auth34-style';s.textContent=`
#auth34{position:fixed;inset:0;z-index:1700;background:#101a385c;backdrop-filter:blur(6px);display:none;place-items:center;padding:18px}#auth34.show{display:grid}
#auth34 .panel{width:min(470px,100%);background:#fff;border:1px solid #dce5f7;border-radius:20px;padding:18px;box-shadow:0 22px 70px #15244935;color:#1b294c}
#auth34 h3{margin:0 0 8px;font-size:17px}#auth34 p{margin:6px 0;color:#65718b;font-size:10.5px;line-height:1.55}.auth34scope{margin:11px 0;background:#f4f7ff;border:1px solid #dce5f7;border-radius:12px;padding:10px;font-size:9px;color:#40547e}.auth34resource{font-weight:750;color:#34476f}.auth34buttons{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:14px}.auth34buttons button{border:1px solid #dce5f7;border-radius:11px;padding:9px 12px;font-weight:850;cursor:pointer;background:#fff;color:#445275}.auth34buttons .connect{background:#315fe8;color:#fff;border-color:#315fe8}
`;document.head.appendChild(s);
}
function injectUi(){
  injectStyle();if(document.getElementById('auth34'))return;
  const root=document.createElement('div');root.id='auth34';root.innerHTML='<div class="panel" role="dialog" aria-modal="true" aria-labelledby="auth34Title"><h3 id="auth34Title">Cần kết nối dịch vụ</h3><p id="auth34Reason"></p><div class="auth34scope"><b>Quyền/phạm vi cần:</b><div id="auth34Scope"></div></div><p class="auth34resource" id="auth34Resource"></p><div class="auth34buttons"><button type="button" id="auth34Cancel">Hủy</button><button type="button" class="connect" id="auth34Connect">Mở cài đặt kết nối</button></div></div>';
  document.body.appendChild(root);
}
function showPopup({service,reason='',scope='',resource=''}){
  injectUi();const cfg=configFor(service);if(!cfg)return Promise.resolve({allowed:false,reason:'UNKNOWN_SERVICE'});
  const root=document.getElementById('auth34');root.querySelector('#auth34Title').textContent=`Cần kết nối ${cfg.label}`;
  root.querySelector('#auth34Reason').textContent=reason||`A.I cần ${cfg.label} để hoàn tất thao tác này.`;
  root.querySelector('#auth34Scope').textContent=scope||cfg.scope;
  root.querySelector('#auth34Resource').textContent=resource?`Tài nguyên: ${resource}`:'';
  root.classList.add('show');
  return new Promise(resolve=>{
    const finish=result=>{root.classList.remove('show');root.querySelector('#auth34Cancel').onclick=null;root.querySelector('#auth34Connect').onclick=null;resolve(result)};
    root.querySelector('#auth34Cancel').onclick=()=>finish({allowed:false,cancelled:true,service});
    root.querySelector('#auth34Connect').onclick=()=>{
      window.AIOfficeCredentialsV22?.open?.();
      finish({allowed:false,setupOpened:true,service,reason:'CONNECTION_SETUP_REQUIRED'});
    };
    root.onclick=e=>{if(e.target===root)finish({allowed:false,cancelled:true,service})};
  });
}
export async function serviceState(service){
  const cfg=configFor(service);if(!cfg)return{service,known:false,ready:false,reason:'UNKNOWN_SERVICE'};
  const h=await health();return{service,known:true,ready:Boolean(cfg.health(h)),label:cfg.label,scope:cfg.scope,mode:cfg.mode};
}
export async function ensureAuthorization({service,reason='',scope='',resource='',silent=false}={}){
  const state=await serviceState(service);
  if(state.ready)return{...state,allowed:true};
  if(silent)return{...state,allowed:false,reason:'SERVICE_NOT_READY'};
  const popup=await showPopup({service,reason,scope,resource});return{...state,...popup,ready:false,allowed:false};
}
function installDriveEventBridge(){
  window.addEventListener('ai-office-drive-runtime-state',event=>{
    const detail=event?.detail||{};
    if(!detail.internalOptIn||detail?.drive?.configured)return;
    const key='drive-internal-optin';if(SEEN.has(key))return;SEEN.add(key);
    void showPopup({service:'drive',reason:'Bạn đã bật tài liệu nội bộ nhưng Drive Runtime chưa được kết nối.',resource:'Kho kiến thức A.I Văn phòng'});
  });
}
export function installAuthorizationBroker(){
  if(typeof window==='undefined')return false;
  if(window.AIOfficeAuthorizationV34?.version===VERSION)return true;
  injectUi();installDriveEventBridge();
  window.AIOfficeAuthorizationV34={version:VERSION,ensure:ensureAuthorization,state:serviceState,services:SERVICE};
  window.dispatchEvent(new CustomEvent('ai-office-authorization-ready',{detail:{version:VERSION}}));return true;
}
