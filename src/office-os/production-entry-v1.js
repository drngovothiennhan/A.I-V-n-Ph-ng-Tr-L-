export const AI_OFFICE_PRODUCTION_ENTRY_VERSION='1.0.0-p4';

const CHAT_KEY='ai-office-conversation-v19';
const BAD_OBJECT='[object Object]';
const RUNTIME_ERROR_PREFIX='Bộ não điều phối chưa sẵn sàng.';

function cleanText(value='',limit=12000){
  return String(value??'').replace(/\s+/g,' ').trim().slice(0,limit);
}

function updateBoot(text,state='booting'){
  const boot=document.getElementById('aiOfficeOSBoot');
  const label=boot?.querySelector('[data-ai-office-boot-text]');
  if(label)label.textContent=text;
  if(boot)boot.dataset.state=state;
}

function suppressCompatibilityUi(){
  if(document.getElementById('ai-office-production-suppression'))return;
  const style=document.createElement('style');
  style.id='ai-office-production-suppression';
  style.textContent='#v19Dock,#cred22Launcher,#ai22State{display:none!important}';
  document.head.appendChild(style);
}

function cleanBrokenHistory(){
  try{
    const raw=JSON.parse(localStorage.getItem(CHAT_KEY)||'[]');
    if(!Array.isArray(raw))return;
    const cleaned=raw.filter(item=>{
      if(item?.role!=='assistant')return true;
      const text=cleanText(item?.text||'');
      return text!==BAD_OBJECT&&!text.startsWith(RUNTIME_ERROR_PREFIX);
    });
    if(cleaned.length!==raw.length)localStorage.setItem(CHAT_KEY,JSON.stringify(cleaned.slice(-30)));
  }catch{}
}

function normalizeCanonicalResult(result){
  if(result==null)return'';
  if(typeof result==='string')return cleanText(result);
  if(typeof result!=='object')return cleanText(result);

  const answer=typeof result.answer==='string'?cleanText(result.answer):'';
  const task=result.task&&typeof result.task==='object'?result.task:result;
  const output=typeof task?.outputDraft==='string'?cleanText(task.outputDraft):'';
  const message=typeof task?.message==='string'?cleanText(task.message):'';
  const status=cleanText(task?.status||'');

  if(answer&&output)return`${answer}\n\n${output}`.slice(0,12000);
  if(answer)return answer;
  if(output)return output;
  if(message)return message;
  if(status==='awaiting_approval')return'Đã xử lý nhiệm vụ và đang chờ duyệt.';
  if(status==='awaiting_input')return'Đã hiểu nhiệm vụ và đang chờ dữ liệu đầu vào.';
  if(status==='completed')return'Nhiệm vụ đã hoàn tất.';
  if(status==='cancelled')return'Nhiệm vụ đã được hủy.';
  return'';
}

function installCanonicalResultContract(){
  const gate=window.AIOfficeCanonicalInputGate;
  if(!gate?.dispatch)throw new Error('CANONICAL_GATE_NOT_READY');
  if(gate.__productionEntryNormalized)return;
  const dispatch=gate.dispatch.bind(gate);
  gate.dispatch=async(...args)=>normalizeCanonicalResult(await dispatch(...args));
  gate.__productionEntryNormalized=AI_OFFICE_PRODUCTION_ENTRY_VERSION;
}

function assertCanonicalRuntimeReady(){
  const checks={
    v19:Boolean(window.AIOfficeV19?.handleMessage),
    v20:Boolean(window.AIOfficeV20?.handleMessage),
    v22:Boolean(window.AIOfficeV22?.handleMessage),
    canonical:Boolean(window.AIOfficeCanonicalInputGate?.dispatch),
    tasks:Boolean(window.AIOfficeV2Tasks?.list)
  };
  const missing=Object.entries(checks).filter(([,ready])=>!ready).map(([name])=>name);
  if(missing.length)throw new Error(`PRODUCTION_RUNTIME_NOT_READY:${missing.join(',')}`);
  return checks;
}

async function bootProduction(){
  suppressCompatibilityUi();
  cleanBrokenHistory();
  try{sessionStorage.setItem('ai-office-credentials-seen-v230','1')}catch{}

  updateBoot('Đang khởi động bộ não điều phối…');
  await import('../bootstrap-v18.js');

  const aiCore=await import('../ai-orchestrator-core-v32.js?v=325');
  aiCore.installAICoreOrchestrator?.();

  const sourceControl=await import('../internal-source-control-v27.js?v=270');
  sourceControl.installInternalSourceControl?.();

  updateBoot('Đang kết nối nguồn tri thức…');
  await import('../knowledge-router-v20.js?v=271');
  const multiSource=await import('../multisource-orchestrator-v26.js?v=271');
  multiSource.installMultiSourceOrchestrator?.();

  const researchSafety=await import('../research-safety-guard-v263.js?v=263');
  researchSafety.installResearchSafetyGuard?.();
  const weather=await import('../weather-bridge-v21.js?v=211');
  const interactionV23=await import('../interaction-runtime-v23.js?v=230');
  await import('../interaction-control-v21.js?v=211');
  const globalCancel=await import('../global-cancel-v33.js?v=330');
  globalCancel.installGlobalCancel?.();
  await import('../credential-setup-v22.js?v=231');
  const authorization=await import('../authorization-broker-v34.js?v=340');
  authorization.installAuthorizationBroker?.();
  const operations=await import('../operations-center-v36.js?v=360');
  operations.installOperationsCenter?.();
  await import('../product-completion-v24.js?v=241');
  await import('../voice-render-bridge-v23.js?v=230');
  const voiceTurns=await import('../voice-turn-coordinator-v25.js?v=250');

  const taskBridge=await import('../office-v2/task-runtime-bridge.js?v=2102');
  taskBridge.installOfficeV2TaskRuntimeBridge?.();

  const connectors=await import('./connector-registry-v1.js?v=100');
  connectors.installConnectorRegistry?.();
  const answerRouter=await import('./chief-answer-router-v1.js?v=101');
  answerRouter.installChiefAnswerRouter?.();

  weather.patchVoice?.();
  window.AIOfficeV22?.attachAfterV21?.();
  interactionV23.attachGlobalCancelVoice?.();
  voiceTurns.installVoiceTurnCoordinator?.();

  updateBoot('Đang khóa cổng lệnh canonical…');
  const canonicalGate=await import('../canonical-input-gate-v71.js?v=712-p4');
  canonicalGate.installCanonicalInputGate?.();
  installCanonicalResultContract();
  const checks=assertCanonicalRuntimeReady();

  updateBoot('Đang mở Personal A.I Office OS…');
  const officeOS=await import('./office-shell-v1.js?v=102');
  officeOS.installAIOfficeOSShell?.();
  if(!document.getElementById('aiOfficeOSRoot'))throw new Error('OFFICE_OS_SHELL_NOT_MOUNTED');

  document.title='A.I Văn phòng · Personal Office OS';
  document.documentElement.dataset.aiOfficeProduction='ready';
  document.documentElement.dataset.aiOfficeProductionEntry='p4';
  window.AIOfficeRelease='1.9.3';
  window.AIOfficeProductionRuntime=Object.freeze({
    version:AI_OFFICE_PRODUCTION_ENTRY_VERSION,
    ready:true,
    checks:Object.freeze(checks),
    shell:'office-os',
    canonical:'AIOfficeCanonicalInputGate'
  });
  window.dispatchEvent(new CustomEvent('ai-office-production-ready',{detail:window.AIOfficeProductionRuntime}));
  document.getElementById('aiOfficeOSBoot')?.remove();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  bootProduction().catch(error=>{
    console.error('ai_office_production_boot_failed',{message:String(error?.message||error).slice(0,240)});
    document.documentElement.dataset.aiOfficeProduction='failed';
    updateBoot('Không thể khởi động an toàn. Hãy tải lại trang; hệ thống chưa nhận lệnh.', 'failed');
  });
}

export{normalizeCanonicalResult,assertCanonicalRuntimeReady};
