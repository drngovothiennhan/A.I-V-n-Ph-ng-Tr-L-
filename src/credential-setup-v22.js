const VERSION='2.2-credentials-setup';
const VERCEL_ENV_URL='https://vercel.com/hiu-yhct/ai-van-phong-tro-ly/settings/environment-variables';
const HEALTH_URL='/api/health';

const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function normalizeHealth(h={}){
  const p=h.providers||{};
  const setup=h.setup||{};
  const gemini=Boolean(p.gemini?.configured||setup.gemini?.ready);
  const xiaozhi=Boolean(p.xiaozhi?.configured||setup.xiaozhi?.ready);
  const xiaozhiAuth=Boolean(p.xiaozhi?.authenticated||(!xiaozhi?false:true));
  const drive=Boolean(p.googleDriveRuntime?.configured||h.brain?.driveRuntimeConfigured||setup.drive?.ready);
  const workspace=Boolean(p.googleWorkspace?.configured);
  return {
    gemini,
    xiaozhi,
    xiaozhiAuth,
    drive,
    workspace,
    missing:[
      ...(!gemini?['GEMINI_API_KEY']:[]),
      ...(!xiaozhi?['XIAOZHI_WS_URL']:[]),
      ...(xiaozhi&&!xiaozhiAuth?['XIAOZHI_WS_TOKEN']:[]),
      ...(!drive?['DRIVE_BRAIN_BRIDGE_URL','DRIVE_BRAIN_TOKEN']:[]),
      ...(!workspace?['GOOGLE_WORKSPACE_ENABLED']:[])
    ]
  };
}

async function getHealth(){
  try{
    const r=await fetch(`${HEALTH_URL}?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error(`health_${r.status}`);
    return await r.json();
  }catch{return {providers:{}}}
}

function injectStyle(){
  if(document.getElementById('cred22-style'))return;
  const s=document.createElement('style');s.id='cred22-style';s.textContent=`
#cred22{position:fixed;inset:0;z-index:1600;background:#0d173a70;backdrop-filter:blur(7px);display:none;place-items:center;padding:18px}#cred22.show{display:grid}
#cred22 .panel{width:min(610px,100%);max-height:min(86vh,760px);overflow:auto;background:#fff;border:1px solid #dce5f7;border-radius:22px;box-shadow:0 28px 90px #13224d45;padding:18px}
#cred22 .top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}#cred22 h3{margin:0;font-size:18px;color:#172448}#cred22 p{font-size:10.5px;line-height:1.55;color:#66708b;margin:7px 0}
#cred22 .close{border:1px solid #dce5f7;background:#fff;border-radius:10px;width:34px;height:34px;cursor:pointer;font-weight:900;color:#61708e}
#cred22 .warn{margin:10px 0;background:#fff8ea;border:1px solid #f0d9ae;color:#805818;border-radius:12px;padding:9px 10px;font-size:9px;line-height:1.5}
#cred22 .rows{display:grid;gap:7px;margin:10px 0}.cred22row{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center;border:1px solid #e3e9f5;border-radius:12px;padding:10px}.cred22row b{font-size:10px}.cred22row small{display:block;color:#7d879f;margin-top:3px;font-size:8px}.cred22state{border-radius:999px;padding:5px 8px;font-size:8px;font-weight:850}.cred22state.ok{background:#eafaf3;color:#14764f}.cred22state.miss{background:#fff1f2;color:#b33e50}
#cred22 .secretList{background:#f6f8ff;border:1px solid #dce5f7;border-radius:12px;padding:10px;font:700 9px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-word}
#cred22 .buttons{display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}.cred22btn{border:1px solid #dce5f7;background:#fff;color:#40547e;border-radius:11px;padding:9px 11px;font-size:9px;font-weight:850;cursor:pointer;text-decoration:none}.cred22btn.primary{background:#315fe8;color:#fff;border-color:#315fe8}.cred22btn.ok{background:#edfaf4;color:#14764f;border-color:#cbe9da}
#cred22Launcher{position:fixed;right:16px;bottom:62px;z-index:1200;border:1px solid #dce5f7;background:#fff;color:#315fe8;border-radius:999px;padding:8px 11px;font:850 8px/1 system-ui;box-shadow:0 8px 24px #21346b1c;cursor:pointer}
@media(max-width:700px){#cred22 .panel{padding:14px;border-radius:18px}.cred22row{grid-template-columns:1fr}.cred22state{width:max-content}#cred22Launcher{right:12px;bottom:58px}}
`;
  document.head.appendChild(s);
}

function row(label,detail,ok){return `<div class="cred22row"><div><b>${esc(label)}</b><small>${esc(detail)}</small></div><span class="cred22state ${ok?'ok':'miss'}">${ok?'Đã cấu hình':'Còn thiếu'}</span></div>`}

function injectUi(){
  injectStyle();
  if(!document.getElementById('cred22')){
    const modal=document.createElement('div');modal.id='cred22';modal.innerHTML=`<div class="panel" role="dialog" aria-modal="true" aria-labelledby="cred22Title"><div class="top"><div><h3 id="cred22Title">Cấp credentials cho A.I Văn phòng</h3><p id="cred22Summary">Đang kiểm tra cấu hình…</p></div><button class="close" id="cred22Close" aria-label="Đóng">×</button></div><div class="warn"><b>Không nhập API key trực tiếp vào giao diện A.I Văn phòng.</b> Secret phải được lưu trong Vercel Environment Variables hoặc dịch vụ quản lý secret tương đương. Popup này chỉ kiểm tra trạng thái và dẫn bạn đến đúng nơi cấu hình.</div><div class="rows" id="cred22Rows"></div><div id="cred22MissingWrap"><p><b>Biến cần bổ sung</b></p><div class="secretList" id="cred22Missing"></div></div><div class="buttons"><button class="cred22btn" id="cred22Copy">Sao chép tên biến</button><button class="cred22btn ok" id="cred22Check">Kiểm tra lại</button><a class="cred22btn primary" id="cred22Vercel" href="${VERCEL_ENV_URL}" target="_blank" rel="noopener noreferrer">Mở Vercel Credentials ↗</a></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)closePopup()});
    modal.querySelector('#cred22Close').onclick=closePopup;
    modal.querySelector('#cred22Check').onclick=refreshPopup;
    modal.querySelector('#cred22Copy').onclick=async()=>{
      const text=modal.querySelector('#cred22Missing')?.dataset?.raw||'';
      if(!text)return;
      try{await navigator.clipboard.writeText(text);modal.querySelector('#cred22Copy').textContent='Đã sao chép ✓';setTimeout(()=>modal.querySelector('#cred22Copy').textContent='Sao chép tên biến',1500)}catch{}
    };
  }
  if(!document.getElementById('cred22Launcher')){
    const b=document.createElement('button');b.id='cred22Launcher';b.type='button';b.textContent='⚙ Credentials';b.onclick=()=>openPopup();document.body.appendChild(b);
  }
}

function closePopup(){document.getElementById('cred22')?.classList.remove('show')}

async function refreshPopup(){
  injectUi();
  const modal=document.getElementById('cred22');
  const h=await getHealth(),s=normalizeHealth(h);
  const rows=modal.querySelector('#cred22Rows');
  rows.innerHTML=[
    row('Gemini reasoning','GEMINI_API_KEY',s.gemini),
    row('XiaoZhi voice upstream','XIAOZHI_WS_URL',s.xiaozhi),
    row('XiaoZhi authentication','XIAOZHI_WS_TOKEN',s.xiaozhiAuth),
    row('Google Drive Brain runtime','DRIVE_BRAIN_BRIDGE_URL + DRIVE_BRAIN_TOKEN',s.drive),
    row('Google Workspace actions','GOOGLE_WORKSPACE_ENABLED=true',s.workspace)
  ].join('');
  const summary=modal.querySelector('#cred22Summary');
  summary.textContent=s.missing.length?`Còn ${s.missing.length} credential/cấu hình cần bổ sung để bật đầy đủ reasoning, Drive và XiaoZhi.`:'Các credential chính đã được cấu hình. Có thể đóng popup và kiểm tra workflow.';
  const miss=modal.querySelector('#cred22Missing'),wrap=modal.querySelector('#cred22MissingWrap');
  if(s.missing.length){const raw=s.missing.join('\n');miss.textContent=raw;miss.dataset.raw=raw;wrap.style.display='block'}else{miss.textContent='Không còn biến bắt buộc đang thiếu.';miss.dataset.raw='';wrap.style.display='block'}
  return s;
}

export async function openPopup(){
  injectUi();
  const modal=document.getElementById('cred22');modal.classList.add('show');
  return await refreshPopup();
}

injectUi();
window.AIOfficeCredentialsV22={version:VERSION,open:openPopup,refresh:refreshPopup,close:closePopup};
setTimeout(()=>openPopup(),500);
