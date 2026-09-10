const VERSION='2.6-multisource-orchestrator';
const CANARY_QUERY='DBR-CANARY-2026-09-10';
const CANARY_FILE_ID='1AfqRLNHMM87hyDXEy5J15KXcnvNsfiXsrfLgTh_H2Zg';
const DRIVE_HEALTH_INTERVAL_MS=60000;
const EXPLICIT_LOCAL_HINTS=[
  'file local','tep local','tai lieu local','file vua tai','tep vua tai','tai lieu vua tai',
  'file tai len','tep tai len','tai lieu tai len','upload local','file upload'
];
const QUESTION_DRIVE_MODES=new Set([
  'general_question','research_question','medical_question','internal_question','internal_admin_question','admin_document'
]);

let installed=false;
let healthTimer=null;

function normalize(text=''){
  return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}
function explicitLocalRequested(text=''){
  const n=normalize(text);
  return EXPLICIT_LOCAL_HINTS.some(x=>n.includes(x));
}
function isLocalSource(source={}){
  return /(^|[-_ ])local($|[-_ ])/i.test(String(source.kind||'')) || /^Local approved/i.test(String(source.source||''));
}
function isDriveSource(source={}){
  return /drive/i.test(String(source.kind||'')) || /drive\.google\.com/i.test(String(source.domain||source.url||''));
}
function isExternalSource(source={}){
  if(isDriveSource(source)||isLocalSource(source))return false;
  return Boolean(source?.url || /web|official|scholarly|pubmed|wikipedia|duck/i.test(String(source.kind||source.source||'')));
}
function uniqSources(sources=[]){
  const seen=new Set();
  return (Array.isArray(sources)?sources:[]).filter(source=>{
    const key=`${source?.url||''}|${source?.title||''}|${String(source?.text||source?.snippet||'').slice(0,160)}`;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function effectivePolicy(query, policy={}){
  const mode=String(policy?.mode||'');
  const local=explicitLocalRequested(query);
  const questionLike=Boolean(policy?.question || QUESTION_DRIVE_MODES.has(mode));
  const canUseDrive=questionLike && mode!=='direct_runtime' && mode!=='data_task';
  return {
    ...policy,
    useDrive: Boolean(policy?.useDrive || canUseDrive),
    useLocal: local,
    localRole: local?'explicit-supplement':'disabled-by-default',
    driveRole: canUseDrive?'opportunistic-canonical':'policy-default',
    multiSourceV26:true
  };
}

function annotateSources(sources=[]){
  return uniqSources(sources).map(source=>({
    ...source,
    sourceOrigin: isLocalSource(source)?'local':isDriveSource(source)?'drive':'external'
  }));
}

async function probeDrive(){
  try{
    const response=await fetch('/api/drive-brain',{
      method:'POST',
      headers:{'content-type':'application/json'},
      cache:'no-store',
      body:JSON.stringify({action:'health'})
    });
    if(!response.ok)return{configured:false,live:false,status:response.status};
    const data=await response.json();
    return{configured:Boolean(data?.configured),live:true,...data};
  }catch{return{configured:false,live:false,reason:'DRIVE_RUNTIME_UNREACHABLE'}}
}

async function verifyCanary(){
  try{
    const response=await fetch('/api/drive-brain',{
      method:'POST',
      headers:{'content-type':'application/json'},
      cache:'no-store',
      body:JSON.stringify({
        action:'search',
        query:CANARY_QUERY,
        scopes:['02_APPROVED'],
        limit:5
      })
    });
    if(!response.ok)return{pass:false,configured:false,status:response.status};
    const data=await response.json();
    if(!data?.configured)return{pass:false,configured:false,reason:data?.reason||'DRIVE_RUNTIME_NOT_CONFIGURED'};
    const sources=Array.isArray(data?.sources)?data.sources:[];
    const match=sources.find(s=>s?.provenance?.fileId===CANARY_FILE_ID || String(s?.text||'').includes(CANARY_QUERY));
    return{
      pass:Boolean(match),
      configured:true,
      sourceCount:sources.length,
      fileId:match?.provenance?.fileId||null,
      scope:match?.provenance?.scope||match?.scope||null,
      approvalState:match?.approvalState||null
    };
  }catch{return{pass:false,configured:false,reason:'DRIVE_CANARY_PROBE_FAILED'}}
}

function updateUi(driveState, canaryState=null){
  const router=window.AIOfficeV20;
  if(router)router.driveState=driveState;
  const pills=[...document.querySelectorAll('.pills .pill')];
  if(pills[2]){
    if(canaryState?.pass)pills[2].textContent='☁ Drive Brain verified · Approved canary PASS';
    else if(driveState?.configured)pills[2].textContent='☁ Drive Brain online · đang kiểm tra knowledge';
    else pills[2].textContent='☁ Drive canonical · cần cấp Bridge runtime';
  }
  const status=document.getElementById('v19Status');
  if(status&&canaryState?.pass)status.textContent='Multi-source v2.6 · Drive Approved verified · Gemini + external ready';
}

async function refreshDriveRuntime({verify=true}={}){
  const drive=await probeDrive();
  let canary=null;
  if(drive?.configured&&verify)canary=await verifyCanary();
  updateUi(drive,canary);
  const state={drive,canary,checkedAt:new Date().toISOString()};
  if(window.AIOfficeMultiSourceV26)window.AIOfficeMultiSourceV26.state=state;
  window.dispatchEvent(new CustomEvent('ai-office-drive-runtime-state',{detail:state}));
  return state;
}

export function installMultiSourceOrchestrator(){
  if(installed)return true;
  const router=window.AIOfficeV20;
  if(!router?.gatherSources||!router?.classifySourcePolicy)return false;

  const originalGather=router.gatherSources.bind(router);
  const originalClassify=router.classifySourcePolicy.bind(router);

  router.classifySourcePolicy=(text,baseIntent={})=>effectivePolicy(text,originalClassify(text,baseIntent));
  router.gatherSources=async(text,policy)=>{
    const effective=effectivePolicy(text,policy||router.classifySourcePolicy(text,{kind:'question'}));
    const result=await originalGather(text,effective);
    const allowLocal=Boolean(effective.useLocal);
    const sources=annotateSources(result?.sources||[]).filter(source=>allowLocal||!isLocalSource(source));
    const driveCount=sources.filter(isDriveSource).length;
    const externalCount=sources.filter(isExternalSource).length;
    return{
      ...result,
      sources,
      endpointAnswer:'',
      preliminaryExternalAnswer:result?.endpointAnswer||'',
      provider:'multisource-v26',
      multiSource:{
        driveCount,
        externalCount,
        localCount:sources.filter(isLocalSource).length,
        localDependency:false,
        localAllowed:allowLocal,
        finalSynthesis:'gemini-over-relevance-gated-source-pack'
      },
      effectivePolicy:effective
    };
  };

  installed=true;
  window.AIOfficeMultiSourceV26={
    version:VERSION,
    state:null,
    effectivePolicy,
    refreshDriveRuntime,
    verifyCanary,
    canary:{query:CANARY_QUERY,fileId:CANARY_FILE_ID}
  };

  void refreshDriveRuntime({verify:true});
  healthTimer=setInterval(()=>void refreshDriveRuntime({verify:true}),DRIVE_HEALTH_INTERVAL_MS);
  window.addEventListener('online',()=>void refreshDriveRuntime({verify:true}));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshDriveRuntime({verify:true})});
  return true;
}

window.AIOfficeMultiSourceVersion=VERSION;
