const VERSION='2.7.0-internal-source-control';
const KEY='ai-office-use-internal-v27';
const TOGGLE_ID='aiOfficeInternalSourceToggle';
const STATE_ID='aiOfficeInternalSourceState';

let installed=false;
let runtime={geminiConfigured:null,driveConfigured:null};

function readPreference(){
  try{return localStorage.getItem(KEY)==='1'}catch{return false}
}
function writePreference(value){
  try{localStorage.setItem(KEY,value?'1':'0')}catch{}
}
function currentPreference(){
  return Boolean(window.AIOfficeSourcePreferences?.useInternal);
}
function publish(value,reason='user'){
  const useInternal=Boolean(value);
  writePreference(useInternal);
  window.AIOfficeSourcePreferences={
    ...(window.AIOfficeSourcePreferences||{}),
    useInternal,
    version:VERSION,
    updatedAt:new Date().toISOString()
  };
  updateUi();
  window.dispatchEvent(new CustomEvent('ai-office-source-preference-change',{
    detail:{useInternal,reason,version:VERSION}
  }));
  if(useInternal)void window.AIOfficeMultiSourceV26?.refreshDriveRuntime?.({verify:true});
}
function sourceSummary(){
  const enabled=currentPreference();
  if(!enabled)return'Mặc định: Gemini tìm nguồn công khai. Tài liệu nội bộ không được đọc.';
  if(runtime.driveConfigured===false)return'Đã bật nội bộ, nhưng Drive Runtime chưa kết nối. Gemini vẫn tìm web và chỉ dùng nguồn nội bộ nào thực sự khả dụng.';
  return'Đã bật nội bộ: tìm nguồn nội bộ liên quan, đối chiếu với Gemini Search rồi mới kết luận.';
}
function updateUi(){
  const enabled=currentPreference();
  const checkbox=document.getElementById(TOGGLE_ID);
  if(checkbox)checkbox.checked=enabled;
  const state=document.getElementById(STATE_ID);
  if(state)state.textContent=sourceSummary();

  const pills=[...document.querySelectorAll('.pills .pill')];
  if(pills[0]){
    pills[0].id='aiOfficeGeminiSearchPill';
    pills[0].textContent=runtime.geminiConfigured===false?'✦ Gemini chưa sẵn sàng':'✦ Gemini Search mặc định';
  }
  if(pills[2]){
    pills[2].id='aiOfficeInternalSourcePill';
    pills[2].textContent=enabled
      ? runtime.driveConfigured===false?'☁ Nội bộ: Bật · Drive chưa kết nối':'☁ Nội bộ: Bật'
      : '☁ Nội bộ: Tắt';
    pills[2].classList.toggle('green',enabled);
    pills[2].classList.toggle('blue',!enabled);
  }
}
async function refreshRuntime(){
  try{
    const response=await fetch('/api/health',{cache:'no-store'});
    if(!response.ok)return;
    const health=await response.json();
    runtime={
      geminiConfigured:Boolean(health?.providers?.gemini?.configured),
      driveConfigured:Boolean(health?.providers?.googleDriveRuntime?.configured)
    };
    updateUi();
  }catch{}
}
function mount(){
  if(document.getElementById('aiOfficeInternalSourceControl'))return;
  const anchor=document.querySelector('.composer')||document.querySelector('.chief');
  if(!anchor)return;

  const style=document.createElement('style');
  style.id='aiOfficeInternalSourceStyle';
  style.textContent=`
  #aiOfficeInternalSourceControl{display:flex;align-items:center;gap:10px;margin-top:9px;padding:9px 11px;border:1px solid #dce5f7;border-radius:12px;background:#fff;font:700 9px/1.35 system-ui;color:#39445f}
  #aiOfficeInternalSourceControl .ais-copy{display:grid;gap:2px;flex:1;min-width:0}
  #aiOfficeInternalSourceControl b{font-size:10px;color:#22345f}
  #aiOfficeInternalSourceControl small{font-size:8px;color:#6f7892;font-weight:600}
  #aiOfficeInternalSourceControl input{position:absolute;opacity:0;pointer-events:none}
  #aiOfficeInternalSourceControl .ais-switch{width:42px;height:24px;border-radius:999px;background:#dce3f2;position:relative;flex:0 0 auto;transition:.2s;box-shadow:inset 0 0 0 1px #cdd7ea}
  #aiOfficeInternalSourceControl .ais-switch:after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;left:3px;top:3px;box-shadow:0 2px 7px #24365f33;transition:.2s}
  #aiOfficeInternalSourceControl input:checked+.ais-switch{background:#315fe8}
  #aiOfficeInternalSourceControl input:checked+.ais-switch:after{transform:translateX(18px)}
  @media(max-width:700px){#aiOfficeInternalSourceControl{align-items:flex-start}#aiOfficeInternalSourceControl small{font-size:7.5px}}
  `;
  document.head.appendChild(style);

  const label=document.createElement('label');
  label.id='aiOfficeInternalSourceControl';
  label.innerHTML=`<span class="ais-copy"><b>📚 Dùng tài liệu nội bộ</b><small id="${STATE_ID}"></small></span><input id="${TOGGLE_ID}" type="checkbox" aria-label="Dùng tài liệu nội bộ"><span class="ais-switch" aria-hidden="true"></span>`;
  anchor.insertAdjacentElement('afterend',label);
  const checkbox=document.getElementById(TOGGLE_ID);
  checkbox?.addEventListener('change',event=>publish(Boolean(event.target?.checked),'toggle'));
  updateUi();
}
export function internalSourcesEnabled(){
  return currentPreference();
}
export function installInternalSourceControl(){
  if(installed)return true;
  installed=true;
  window.AIOfficeSourcePreferences={useInternal:readPreference(),version:VERSION,updatedAt:new Date().toISOString()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  setTimeout(mount,0);
  setTimeout(updateUi,200);
  window.addEventListener('ai-office-drive-runtime-state',event=>{
    runtime.driveConfigured=Boolean(event?.detail?.drive?.configured);
    updateUi();
  });
  void refreshRuntime();
  window.AIOfficeInternalSourceControl={version:VERSION,enabled:internalSourcesEnabled,setEnabled:value=>publish(Boolean(value),'api'),refreshRuntime};
  return true;
}
window.AIOfficeInternalSourceControlVersion=VERSION;
