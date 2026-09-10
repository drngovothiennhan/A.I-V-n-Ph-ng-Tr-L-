const VERSION='2.2.2-credentials-wizard';
const VERCEL_ENV_URL='https://vercel.com/hiu-yhct/ai-van-phong-tro-ly/settings/environment-variables';
const APPS_SCRIPT_NEW_URL='https://script.google.com/home/projects/create';
const BRIDGE_RAW_URL='https://raw.githubusercontent.com/drngovothiennhan/A.I-V-n-Ph-ng-Tr-L-/main/integrations/google-apps-script/DriveBrainBridge.gs';
const XIAOZHI_SERVER_URL='https://github.com/xinnan-tech/xiaozhi-esp32-server';
const HEALTH_URL='/api/health';
const DRIVE_TOKEN_SESSION_KEY='ai-office-drive-token-v222';

const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function normalizeHealth(h={}){
  const p=h.providers||{};
  const setup=h.setup||{};
  const gemini=Boolean(p.gemini?.configured||setup.gemini?.ready);
  const xiaozhi=Boolean(p.xiaozhi?.configured||setup.xiaozhi?.ready);
  const xiaozhiAuth=Boolean(p.xiaozhi?.authenticated);
  const drive=Boolean(p.googleDriveRuntime?.configured||h.brain?.driveRuntimeConfigured||setup.drive?.ready);
  const workspace=Boolean(p.googleWorkspace?.configured);
  return {
    gemini,xiaozhi,xiaozhiAuth,drive,workspace,
    blocking:[...(!gemini?['GEMINI_API_KEY']:[]),...(!drive?['DRIVE_BRAIN_BRIDGE_URL','DRIVE_BRAIN_TOKEN']:[])],
    optional:[...(!xiaozhi?['XIAOZHI_WS_URL']:[]),...(xiaozhi&&!xiaozhiAuth?['XIAOZHI_WS_TOKEN']:[]),...(!workspace?['GOOGLE_WORKSPACE_ENABLED']:[])]
  };
}

async function getHealth(){
  try{const r=await fetch(`${HEALTH_URL}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`health_${r.status}`);return await r.json()}catch{return {providers:{}}}
}

function secureToken(bytes=36){
  const buf=new Uint8Array(bytes);crypto.getRandomValues(buf);
  return 'drv_'+Array.from(buf,b=>b.toString(16).padStart(2,'0')).join('');
}
function getDriveToken(){
  let token=sessionStorage.getItem(DRIVE_TOKEN_SESSION_KEY)||'';
  if(!token){token=secureToken();sessionStorage.setItem(DRIVE_TOKEN_SESSION_KEY,token)}
  return token;
}
async function copyText(text,button){
  try{await navigator.clipboard.writeText(text);const old=button?.textContent;if(button){button.textContent='Đã sao chép ✓';setTimeout(()=>button.textContent=old,1400)}return true}catch{return false}
}
async function copyBridge(button){
  try{const r=await fetch(BRIDGE_RAW_URL,{cache:'no-store'});if(!r.ok)throw new Error('bridge_fetch');return copyText(await r.text(),button)}catch{return false}
}

function injectStyle(){
  if(document.getElementById('cred22-style'))return;
  const s=document.createElement('style');s.id='cred22-style';s.textContent=`
#cred22{position:fixed;inset:0;z-index:1600;background:#0d173a70;backdrop-filter:blur(7px);display:none;place-items:center;padding:18px}#cred22.show{display:grid}
#cred22 .panel{width:min(720px,100%);max-height:min(90vh,820px);overflow:auto;background:#fff;border:1px solid #dce5f7;border-radius:22px;box-shadow:0 28px 90px #13224d45;padding:18px}
#cred22 .top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}#cred22 h3{margin:0;font-size:18px;color:#172448}#cred22 h4{font-size:11px;color:#24375f;margin:12px 0 5px}#cred22 p{font-size:10.5px;line-height:1.55;color:#66708b;margin:7px 0}
#cred22 .close{border:1px solid #dce5f7;background:#fff;border-radius:10px;width:34px;height:34px;cursor:pointer;font-weight:900;color:#61708e}
#cred22 .warn{margin:10px 0;background:#fff8ea;border:1px solid #f0d9ae;color:#805818;border-radius:12px;padding:9px 10px;font-size:9px;line-height:1.5}
#cred22 .rows{display:grid;gap:7px;margin:10px 0}.cred22row{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center;border:1px solid #e3e9f5;border-radius:12px;padding:10px}.cred22row b{font-size:10px}.cred22row small{display:block;color:#7d879f;margin-top:3px;font-size:8px}.cred22state{border-radius:999px;padding:5px 8px;font-size:8px;font-weight:850}.cred22state.ok{background:#eafaf3;color:#14764f}.cred22state.miss{background:#fff1f2;color:#b33e50}.cred22state.opt{background:#eef4ff;color:#315fe8}
#cred22 .secretList{background:#f6f8ff;border:1px solid #dce5f7;border-radius:12px;padding:10px;font:700 9px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;user-select:all}.cred22steps{border:1px solid #e3e9f5;border-radius:14px;padding:10px;margin-top:10px;background:#fbfcff}.cred22steps ol{margin:7px 0 0 18px;padding:0}.cred22steps li{font-size:9px;color:#586782;line-height:1.55;margin:4px 0}
#cred22 .buttons{display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap;margin-top:9px}.cred22btn{border:1px solid #dce5f7;background:#fff;color:#40547e;border-radius:11px;padding:9px 11px;font-size:9px;font-weight:850;cursor:pointer;text-decoration:none}.cred22btn.primary{background:#315fe8;color:#fff;border-color:#315fe8}.cred22btn.ok{background:#edfaf4;color:#14764f;border-color:#cbe9da}.cred22btn.secondary{background:#f2f5ff;color:#315fe8;border-color:#d8e1ff}
#cred22Launcher{position:fixed;right:16px;bottom:62px;z-index:1200;border:1px solid #dce5f7;background:#fff;color:#315fe8;border-radius:999px;padding:8px 11px;font:850 8px/1 system-ui;box-shadow:0 8px 24px #21346b1c;cursor:pointer}
@media(max-width:700px){#cred22 .panel{padding:14px;border-radius:18px}.cred22row{grid-template-columns:1fr}.cred22state{width:max-content}#cred22Launcher{right:12px;bottom:58px}}
`;
  document.head.appendChild(s);
}

function row(label,detail,state){const cls=state==='ok'?'ok':state==='opt'?'opt':'miss';const txt=state==='ok'?'Đã cấu hình':state==='opt'?'Tùy chọn':'Còn thiếu';return `<div class="cred22row"><div><b>${esc(label)}</b><small>${esc(detail)}</small></div><span class="cred22state ${cls}">${txt}</span></div>`}

function injectUi(){
  injectStyle();
  if(!document.getElementById('cred22')){
    const modal=document.createElement('div');modal.id='cred22';modal.innerHTML=`<div class="panel" role="dialog" aria-modal="true" aria-labelledby="cred22Title">
      <div class="top"><div><h3 id="cred22Title">Thiết lập kết nối A.I Văn phòng</h3><p id="cred22Summary">Đang kiểm tra cấu hình…</p></div><button class="close" id="cred22Close" aria-label="Đóng">×</button></div>
      <div class="warn"><b>Không đưa API key/token vào GitHub hoặc mã frontend.</b> Wizard chỉ tạo token Drive trong phiên trình duyệt để bạn sao chép sang Apps Script + Vercel. Token không được gửi về server A.I Văn phòng.</div>
      <div class="rows" id="cred22Rows"></div>
      <div class="cred22steps" id="driveWizard"><h4>Google Drive Brain · hoàn tất 5 bước</h4>
        <ol><li>Bấm <b>Sao chép Bridge code</b>.</li><li>Bấm <b>Tạo Apps Script</b>, xóa code mặc định và dán Bridge code.</li><li>Project Settings → Script Properties → thêm <b>DRIVE_BRAIN_TOKEN</b> bằng token được tạo bên dưới.</li><li>Deploy → New deployment → Web app → Execute as: Me → cấp quyền → copy URL kết thúc bằng <b>/exec</b>.</li><li>Mở Vercel Credentials và thêm <b>DRIVE_BRAIN_BRIDGE_URL</b> = URL /exec, <b>DRIVE_BRAIN_TOKEN</b> = đúng token bên dưới; áp dụng Production + Preview.</li></ol>
        <p><b>Token Drive được tạo cục bộ trong phiên này</b></p><div class="secretList" id="driveToken"></div>
        <div class="buttons"><button class="cred22btn secondary" id="cred22CopyBridge">Sao chép Bridge code</button><a class="cred22btn secondary" href="${APPS_SCRIPT_NEW_URL}" target="_blank" rel="noopener noreferrer">Tạo Apps Script ↗</a><button class="cred22btn" id="cred22CopyDriveToken">Sao chép Drive token</button><button class="cred22btn" id="cred22RotateDriveToken">Tạo token mới</button></div>
      </div>
      <div class="cred22steps"><h4>XiaoZhi Voice · tùy chọn nâng cao</h4><p>Voice browser của A.I Văn phòng vẫn hoạt động khi chưa có XiaoZhi upstream. Để dùng XiaoZhi production cần một server WebSocket riêng; không dùng URL/token giả hoặc server công cộng không kiểm soát.</p><div class="buttons"><a class="cred22btn secondary" href="${XIAOZHI_SERVER_URL}" target="_blank" rel="noopener noreferrer">Xem XiaoZhi Server ↗</a></div></div>
      <div id="cred22MissingWrap"><p><b>Cấu hình chặn tính năng chính còn thiếu</b></p><div class="secretList" id="cred22Missing"></div></div>
      <div class="buttons"><button class="cred22btn ok" id="cred22Check">Kiểm tra lại</button><a class="cred22btn primary" id="cred22Vercel" href="${VERCEL_ENV_URL}" target="_blank" rel="noopener noreferrer">Mở Vercel Credentials ↗</a></div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)closePopup()});
    modal.querySelector('#cred22Close').onclick=closePopup;
    modal.querySelector('#cred22Check').onclick=refreshPopup;
    modal.querySelector('#cred22CopyBridge').onclick=e=>copyBridge(e.currentTarget);
    modal.querySelector('#cred22CopyDriveToken').onclick=e=>copyText(getDriveToken(),e.currentTarget);
    modal.querySelector('#cred22RotateDriveToken').onclick=()=>{sessionStorage.setItem(DRIVE_TOKEN_SESSION_KEY,secureToken());renderDriveToken()};
  }
  if(!document.getElementById('cred22Launcher')){const b=document.createElement('button');b.id='cred22Launcher';b.type='button';b.textContent='⚙ Credentials';b.onclick=()=>openPopup();document.body.appendChild(b)}
}
function renderDriveToken(){const el=document.getElementById('driveToken');if(el)el.textContent=getDriveToken()}
function closePopup(){document.getElementById('cred22')?.classList.remove('show')}

async function refreshPopup(){
  injectUi();renderDriveToken();
  const modal=document.getElementById('cred22');const h=await getHealth(),s=normalizeHealth(h);
  modal.querySelector('#cred22Rows').innerHTML=[
    row('Gemini reasoning','GEMINI_API_KEY',s.gemini?'ok':'miss'),
    row('Google Drive Brain runtime','DRIVE_BRAIN_BRIDGE_URL + DRIVE_BRAIN_TOKEN',s.drive?'ok':'miss'),
    row('XiaoZhi voice upstream','XIAOZHI_WS_URL',s.xiaozhi?'ok':'opt'),
    row('XiaoZhi authentication','XIAOZHI_WS_TOKEN',s.xiaozhi?(s.xiaozhiAuth?'ok':'miss'):'opt'),
    row('Google Workspace actions','GOOGLE_WORKSPACE_ENABLED=true',s.workspace?'ok':'opt')
  ].join('');
  modal.querySelector('#cred22Summary').textContent=s.blocking.length?`Còn ${s.blocking.length} biến chặn tính năng chính. XiaoZhi và Workspace được xem là tùy chọn, không chặn hội thoại/voice browser.`:'Gemini + Drive Brain đã sẵn sàng. XiaoZhi/Workspace có thể bổ sung sau.';
  const miss=modal.querySelector('#cred22Missing');miss.textContent=s.blocking.length?s.blocking.join('\n'):'Không còn biến bắt buộc đang thiếu.';
  return s;
}

export async function openPopup(){injectUi();const modal=document.getElementById('cred22');modal.classList.add('show');return await refreshPopup()}

injectUi();
window.AIOfficeCredentialsV22={version:VERSION,open:openPopup,refresh:refreshPopup,close:closePopup,getDriveToken};
const params=new URLSearchParams(location.search);if(params.get('credentials')==='1'||!sessionStorage.getItem('ai-office-credentials-seen-v222')){sessionStorage.setItem('ai-office-credentials-seen-v222','1');setTimeout(()=>openPopup(),450)}
