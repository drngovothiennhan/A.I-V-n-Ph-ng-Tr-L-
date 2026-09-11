const VERSION='2.3.0-credentials-runtime-verifier';
const VERCEL_ENV_URL='https://vercel.com/hiu-yhct/ai-van-phong-tro-ly/settings/environment-variables';
const APPS_SCRIPT_NEW_URL='https://script.google.com/home/projects/create';
const GOOGLE_SERVICE_ACCOUNTS_URL='https://console.cloud.google.com/iam-admin/serviceaccounts';
const DRIVE_ROOT_URL='https://drive.google.com/drive/folders/1q8fnN4-WYFlbGXUkRAWj8uqudNBW4qG0';
const BRIDGE_RAW_URL='https://raw.githubusercontent.com/drngovothiennhan/A.I-V-n-Ph-ng-Tr-L-/main/integrations/google-apps-script/DriveBrainBridge.gs';
const XIAOZHI_SERVER_URL='https://github.com/xinnan-tech/xiaozhi-esp32-server';
const HEALTH_URL='/api/health';
const DRIVE_TOKEN_SESSION_KEY='ai-office-drive-token-v230';
const DRIVE_CANARY='DBR-CANARY-2026-09-10';
const DRIVE_CANARY_FILE_ID='1AfqRLNHMM87hyDXEy5J15KXcnvNsfiXsrfLgTh_H2Zg';

const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));

function normalizeHealth(h={}){
  const p=h.providers||{};
  const setup=h.setup||{};
  const driveProvider=p.googleDriveRuntime||{};
  const gemini=Boolean(p.gemini?.configured||setup.gemini?.ready);
  const xiaozhi=Boolean(p.xiaozhi?.configured||setup.xiaozhi?.ready);
  const xiaozhiAuth=Boolean(p.xiaozhi?.authenticated);
  const drive=Boolean(driveProvider.configured||h.brain?.driveRuntimeConfigured||setup.drive?.ready);
  const workspace=Boolean(p.googleWorkspace?.configured);
  const driveProviders=Array.isArray(driveProvider.activeProviders)?driveProvider.activeProviders:[];
  return{gemini,xiaozhi,xiaozhiAuth,drive,workspace,driveProviders,driveProvider,
    optional:[...(!xiaozhi?['XIAOZHI_WS_URL']:[]),...(xiaozhi&&!xiaozhiAuth?['XIAOZHI_WS_TOKEN hoặc trusted-origin']:[]),...(!workspace?['GOOGLE_WORKSPACE_ENABLED=true']:[])]};
}
async function getHealth(){
  try{const r=await fetch(`${HEALTH_URL}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`health_${r.status}`);return await r.json()}catch{return{providers:{}}}
}
async function verifyGeminiGrounding(){
  try{
    const r=await fetch(`/api/provider-check?probe=gemini-grounding&t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)return{pass:false,reason:`GROUNDING_HTTP_${r.status}`};
    const data=await r.json();
    const probe=data?.probe?.geminiGrounding;
    if(!probe)return{pass:false,reason:'GROUNDING_PROBE_NOT_DEPLOYED'};
    return probe;
  }catch{return{pass:false,reason:'GROUNDING_PROBE_UNREACHABLE'}}
}
async function verifyDriveCanary(){
  try{
    if(window.AIOfficeMultiSourceV26?.verifyCanary)return await window.AIOfficeMultiSourceV26.verifyCanary();
    const r=await fetch('/api/drive-brain',{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',body:JSON.stringify({action:'search',query:DRIVE_CANARY,scopes:['02_APPROVED'],limit:5})});
    if(!r.ok)return{pass:false,configured:false,status:r.status};
    const data=await r.json();
    if(!data?.configured)return{pass:false,configured:false,reason:data?.reason||'DRIVE_RUNTIME_NOT_CONFIGURED'};
    const sources=Array.isArray(data?.sources)?data.sources:[];
    const match=sources.find(x=>x?.provenance?.fileId===DRIVE_CANARY_FILE_ID||String(x?.text||'').includes(DRIVE_CANARY));
    return{pass:Boolean(match),configured:true,provider:data?.provider||null,fileId:match?.provenance?.fileId||null,approvalState:match?.approvalState||null};
  }catch{return{pass:false,configured:false,reason:'DRIVE_CANARY_PROBE_FAILED'}}
}
function secureToken(bytes=36){const buf=new Uint8Array(bytes);crypto.getRandomValues(buf);return'drv_'+Array.from(buf,b=>b.toString(16).padStart(2,'0')).join('')}
function getDriveToken(){let token=sessionStorage.getItem(DRIVE_TOKEN_SESSION_KEY)||'';if(!token){token=secureToken();sessionStorage.setItem(DRIVE_TOKEN_SESSION_KEY,token)}return token}
async function copyText(text,button){try{await navigator.clipboard.writeText(text);const old=button?.textContent;if(button){button.textContent='Đã sao chép ✓';setTimeout(()=>button.textContent=old,1400)}return true}catch{return false}}
async function copyBridge(button){try{const r=await fetch(BRIDGE_RAW_URL,{cache:'no-store'});if(!r.ok)throw new Error('bridge_fetch');return copyText(await r.text(),button)}catch{return false}}

function injectStyle(){
  if(document.getElementById('cred22-style'))return;
  const s=document.createElement('style');s.id='cred22-style';s.textContent=`
#cred22{position:fixed;inset:0;z-index:1600;background:#0d173a70;backdrop-filter:blur(7px);display:none;place-items:center;padding:18px}#cred22.show{display:grid}
#cred22 .panel{width:min(800px,100%);max-height:min(92vh,900px);overflow:auto;background:#fff;border:1px solid #dce5f7;border-radius:22px;box-shadow:0 28px 90px #13224d45;padding:18px}
#cred22 .top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}#cred22 h3{margin:0;font-size:18px;color:#172448}#cred22 h4{font-size:11px;color:#24375f;margin:12px 0 5px}#cred22 p{font-size:10.5px;line-height:1.55;color:#66708b;margin:7px 0}
#cred22 .close{border:1px solid #dce5f7;background:#fff;border-radius:10px;width:34px;height:34px;cursor:pointer;font-weight:900;color:#61708e}
#cred22 .warn{margin:10px 0;background:#fff8ea;border:1px solid #f0d9ae;color:#805818;border-radius:12px;padding:9px 10px;font-size:9px;line-height:1.5}
#cred22 .rows{display:grid;gap:7px;margin:10px 0}.cred22row{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center;border:1px solid #e3e9f5;border-radius:12px;padding:10px}.cred22row b{font-size:10px}.cred22row small{display:block;color:#7d879f;margin-top:3px;font-size:8px}.cred22state{border-radius:999px;padding:5px 8px;font-size:8px;font-weight:850}.cred22state.ok{background:#eafaf3;color:#14764f}.cred22state.miss{background:#fff1f2;color:#b33e50}.cred22state.opt{background:#eef4ff;color:#315fe8}
.cred22grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.cred22steps{border:1px solid #e3e9f5;border-radius:14px;padding:10px;margin-top:10px;background:#fbfcff}.cred22steps.preferred{border-color:#bfd2ff;background:#f7f9ff}.cred22badge{display:inline-block;border-radius:999px;background:#eaf0ff;color:#315fe8;padding:3px 7px;font-size:8px;font-weight:850;margin-left:5px}.cred22steps ol{margin:7px 0 0 18px;padding:0}.cred22steps li{font-size:9px;color:#586782;line-height:1.55;margin:4px 0}
#cred22 .secretList{background:#f6f8ff;border:1px solid #dce5f7;border-radius:12px;padding:10px;font:700 9px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-word;white-space:pre-wrap}.cred22token{user-select:all;word-break:break-all}
#cred22 .buttons{display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap;margin-top:9px}.cred22btn{border:1px solid #dce5f7;background:#fff;color:#40547e;border-radius:11px;padding:9px 11px;font-size:9px;font-weight:850;cursor:pointer;text-decoration:none}.cred22btn.primary{background:#315fe8;color:#fff;border-color:#315fe8}.cred22btn.ok{background:#edfaf4;color:#14764f;border-color:#cbe9da}.cred22btn.secondary{background:#f2f5ff;color:#315fe8;border-color:#d8e1ff}
#cred22Launcher{position:fixed;right:16px;bottom:62px;z-index:1200;border:1px solid #dce5f7;background:#fff;color:#315fe8;border-radius:999px;padding:8px 11px;font:850 8px/1 system-ui;box-shadow:0 8px 24px #21346b1c;cursor:pointer}
@media(max-width:760px){#cred22 .panel{padding:14px;border-radius:18px}.cred22grid{grid-template-columns:1fr}.cred22row{grid-template-columns:1fr}.cred22state{width:max-content}#cred22Launcher{right:12px;bottom:58px}}
`;document.head.appendChild(s);
}
function row(label,detail,state){const cls=state==='ok'?'ok':state==='opt'?'opt':'miss';const txt=state==='ok'?'Đã xác minh':state==='opt'?'Tùy chọn':'Chưa đạt';return`<div class="cred22row"><div><b>${esc(label)}</b><small>${esc(detail)}</small></div><span class="cred22state ${cls}">${txt}</span></div>`}
function injectUi(){
  injectStyle();
  if(!document.getElementById('cred22')){
    const modal=document.createElement('div');modal.id='cred22';modal.innerHTML=`<div class="panel" role="dialog" aria-modal="true" aria-labelledby="cred22Title">
      <div class="top"><div><h3 id="cred22Title">Runtime A.I Văn phòng · xác minh thật</h3><p id="cred22Summary">Đang kiểm tra Gemini Grounding và Drive Approved…</p></div><button class="close" id="cred22Close" aria-label="Đóng">×</button></div>
      <div class="warn"><b>Quy tắc bảo mật:</b> không đưa API key, JSON service account hoặc token vào GitHub/frontend/chat. Drive chỉ chuyển xanh khi runtime đọc đúng canary <b>${DRIVE_CANARY}</b> trong <b>02_APPROVED</b>. Chỉ cần chọn <b>một</b> trong hai phương án Drive bên dưới.</div>
      <div class="rows" id="cred22Rows"></div>
      <div class="cred22grid">
        <div class="cred22steps preferred"><h4>Phương án A · Service Account chỉ-đọc <span class="cred22badge">Khuyến nghị</span></h4>
          <ol><li>Trong Google Cloud, tạo Service Account và bật Google Drive API cho project.</li><li>Tạo JSON key. Đây là secret: chỉ lưu cục bộ và Vercel, không gửi vào chat/GitHub.</li><li>Mở thư mục gốc A.I Văn phòng trên Drive và Share cho <b>client_email</b> của Service Account với quyền <b>Viewer</b>.</li><li>Vercel → Environment Variables: thêm <b>GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON</b> bằng toàn bộ JSON; áp dụng Production/Preview.</li><li>Redeploy. Hệ thống dùng OAuth scope <b>drive.readonly</b>, không có quyền ghi/xóa file.</li></ol>
          <div class="buttons"><a class="cred22btn secondary" href="${GOOGLE_SERVICE_ACCOUNTS_URL}" target="_blank" rel="noopener noreferrer">Google Service Accounts ↗</a><a class="cred22btn secondary" href="${DRIVE_ROOT_URL}" target="_blank" rel="noopener noreferrer">Mở Drive root ↗</a></div>
        </div>
        <div class="cred22steps"><h4>Phương án B · Apps Script Bridge</h4>
          <ol><li>Sao chép Bridge code và tạo Apps Script.</li><li>Script Properties: thêm <b>DRIVE_BRAIN_TOKEN</b> bằng token bên dưới.</li><li>Deploy Web App → Execute as Me → cấp quyền → lấy URL <b>/exec</b>.</li><li>Vercel: thêm <b>DRIVE_BRAIN_BRIDGE_URL</b> và <b>DRIVE_BRAIN_TOKEN</b>, rồi redeploy.</li><li>Nếu cả A và B cùng tồn tại: Bridge là primary, Service Account tự failover.</li></ol>
          <p><b>Token cục bộ cho Bridge</b></p><div class="secretList cred22token" id="driveToken"></div>
          <div class="buttons"><button class="cred22btn secondary" id="cred22CopyBridge">Sao chép Bridge code</button><a class="cred22btn secondary" href="${APPS_SCRIPT_NEW_URL}" target="_blank" rel="noopener noreferrer">Tạo Apps Script ↗</a><button class="cred22btn" id="cred22CopyDriveToken">Sao chép token</button><button class="cred22btn" id="cred22RotateDriveToken">Token mới</button></div>
        </div>
      </div>
      <div class="cred22steps"><h4>XiaoZhi Voice · không chặn hội thoại</h4><p>Browser voice vẫn là fallback. XiaoZhi upstream được kiểm tra riêng; không báo xanh chỉ vì WebSocket gateway mở được.</p><div class="buttons"><a class="cred22btn secondary" href="${XIAOZHI_SERVER_URL}" target="_blank" rel="noopener noreferrer">Xem XiaoZhi Server ↗</a></div></div>
      <div><p><b>Blocker còn lại</b></p><div class="secretList" id="cred22Missing"></div></div>
      <div class="buttons"><button class="cred22btn ok" id="cred22Check">Kiểm tra Grounding + Canary</button><a class="cred22btn primary" href="${VERCEL_ENV_URL}" target="_blank" rel="noopener noreferrer">Mở Vercel Credentials ↗</a></div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)closePopup()});
    modal.querySelector('#cred22Close').onclick=closePopup;
    modal.querySelector('#cred22Check').onclick=refreshPopup;
    modal.querySelector('#cred22CopyBridge').onclick=e=>copyBridge(e.currentTarget);
    modal.querySelector('#cred22CopyDriveToken').onclick=e=>copyText(getDriveToken(),e.currentTarget);
    modal.querySelector('#cred22RotateDriveToken').onclick=()=>{sessionStorage.setItem(DRIVE_TOKEN_SESSION_KEY,secureToken());renderDriveToken()};
  }
  if(!document.getElementById('cred22Launcher')){const b=document.createElement('button');b.id='cred22Launcher';b.type='button';b.textContent='⚙ Runtime';b.onclick=()=>openPopup();document.body.appendChild(b)}
}
function renderDriveToken(){const el=document.getElementById('driveToken');if(el)el.textContent=getDriveToken()}
function closePopup(){document.getElementById('cred22')?.classList.remove('show')}
async function refreshPopup(){
  injectUi();renderDriveToken();
  const modal=document.getElementById('cred22');
  const h=await getHealth();const s=normalizeHealth(h);
  const [grounding,canary]=await Promise.all([verifyGeminiGrounding(),s.drive?verifyDriveCanary():Promise.resolve({pass:false,configured:false,reason:'DRIVE_RUNTIME_NOT_CONFIGURED'})]);
  const driveVerified=Boolean(s.drive&&canary?.pass);const groundingVerified=Boolean(s.gemini&&grounding?.pass);
  const providerText=s.driveProviders.length?s.driveProviders.join(' → '):(s.drive?'Drive runtime configured':'Chọn Service Account readonly hoặc Apps Script Bridge');
  modal.querySelector('#cred22Rows').innerHTML=[
    row('Gemini reasoning','GEMINI_API_KEY',s.gemini?'ok':'miss'),
    row('Gemini Google Search Grounding',groundingVerified?`${grounding.groundingSourceCount||0} nguồn grounding`:grounding?.reason||'Chưa xác minh',groundingVerified?'ok':'miss'),
    row('Google Drive Brain runtime',providerText,s.drive?'ok':'miss'),
    row('Drive Approved canary',`${DRIVE_CANARY} · ${canary?.provider||'02_APPROVED'}`,driveVerified?'ok':'miss'),
    row('XiaoZhi voice gateway','Không chặn browser voice',s.xiaozhi?'opt':'opt'),
    row('Google Workspace actions','Tác vụ ghi là tùy chọn',s.workspace?'ok':'opt')
  ].join('');
  const blockers=[];
  if(!s.gemini)blockers.push('GEMINI_API_KEY');
  else if(!groundingVerified)blockers.push(`GEMINI_GROUNDING: ${grounding?.reason||'chưa PASS'}`);
  if(!s.drive)blockers.push('DRIVE_RUNTIME: chọn GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON hoặc DRIVE_BRAIN_BRIDGE_URL + DRIVE_BRAIN_TOKEN');
  else if(!driveVerified)blockers.push(`DRIVE_CANARY: ${canary?.reason||'Approved canary not found'}`);
  if(!s.gemini)modal.querySelector('#cred22Summary').textContent='Gemini chưa được cấu hình.';
  else if(!groundingVerified)modal.querySelector('#cred22Summary').textContent='Gemini cơ bản có thể hoạt động nhưng Google Search Grounding chưa PASS; hệ thống phải fail-safe thay vì trả nguồn lạc đề.';
  else if(!s.drive)modal.querySelector('#cred22Summary').textContent='Gemini Grounding đã sẵn sàng. Drive chưa cấp runtime; hệ thống vẫn trả lời bằng nguồn ngoài và không phụ thuộc local.';
  else if(!driveVerified)modal.querySelector('#cred22Summary').textContent='Drive credential đã có nhưng Approved canary chưa PASS; không bật trạng thái Drive xanh.';
  else modal.querySelector('#cred22Summary').textContent='Gemini Grounding + Drive Brain + Approved canary đều PASS. Orchestrator chạy đa nguồn và local không phải dependency.';
  modal.querySelector('#cred22Missing').textContent=blockers.length?blockers.join('\n'):'Không còn blocker bắt buộc.';
  return{...s,groundingVerified,grounding,driveVerified,canary};
}
export async function openPopup(){injectUi();const modal=document.getElementById('cred22');modal.classList.add('show');return refreshPopup()}

injectUi();
window.AIOfficeCredentialsV22={version:VERSION,open:openPopup,refresh:refreshPopup,close:closePopup,getDriveToken,verifyDriveCanary,verifyGeminiGrounding};
const params=new URLSearchParams(location.search);if(params.get('credentials')==='1'||!sessionStorage.getItem('ai-office-credentials-seen-v230')){sessionStorage.setItem('ai-office-credentials-seen-v230','1');setTimeout(()=>openPopup(),450)}
