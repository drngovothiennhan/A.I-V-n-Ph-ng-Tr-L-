const VERSION='2.7.0-multisource-orchestrator';
const CANARY_QUERY='DBR-CANARY-2026-09-10';
const CANARY_FILE_ID='1AfqRLNHMM87hyDXEy5J15KXcnvNsfiXsrfLgTh_H2Zg';
const LOCAL_DOC_KEY='ai-office-drive-docs-v16';
const INTERNAL_PREF_KEY='ai-office-use-internal-v27';
const DRIVE_HEALTH_INTERVAL_MS=60000;
const MAX_SOURCE_TEXT=12000;
const STOPWORDS=new Set(['ai','gi','nao','la','co','khong','toi','ban','cho','biet','ve','cua','va','voi','mot','nhung','cac','nay','do','tai','tu','den','the','nhu','duoc','hay','can','muon','xin','vui','long','giup','thong','tin']);
const EXPLICIT_LOCAL_HINTS=[
  'file local','tep local','tai lieu local','file vua tai','tep vua tai','tai lieu vua tai',
  'file tai len','tep tai len','tai lieu tai len','upload local','file upload'
];

let installed=false;
let healthTimer=null;

function normalize(text=''){
  return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}
function stripMarkup(input=''){
  return String(input||'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}
function semanticWords(text=''){
  return normalize(text).split(/[^a-z0-9]+/).filter(word=>word.length>2&&!STOPWORDS.has(word));
}
function explicitLocalRequested(text=''){
  const n=normalize(text);
  return EXPLICIT_LOCAL_HINTS.some(x=>n.includes(x));
}
function isLocalSource(source={}){
  return /(^|[-_ ])local($|[-_ ])/i.test(String(source.kind||'')) || /^Local approved/i.test(String(source.source||''));
}
function isDriveSource(source={}){
  return source?.sourceOrigin==='drive' || /drive/i.test(String(source.kind||'')) || /drive\.google\.com/i.test(String(source.domain||source.url||''));
}
function isExternalSource(source={}){
  if(isDriveSource(source)||isLocalSource(source))return false;
  return Boolean(source?.url || /web|official|scholarly|pubmed|wikipedia|duck|research|google search/i.test(String(source.kind||source.source||'')));
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
function readLocalDocs(){
  try{return JSON.parse(localStorage.getItem(LOCAL_DOC_KEY)||'[]')||[]}catch{return[]}
}
export function internalSourcesEnabled(){
  try{
    if(window.AIOfficeSourcePreferences?.useInternal===true)return true;
    return localStorage.getItem(INTERNAL_PREF_KEY)==='1';
  }catch{return false}
}

function sourceSemanticScore(query,source={}){
  const terms=semanticWords(query);
  const title=normalize(`${source?.title||''} ${source?.source||''}`);
  const text=normalize(source?.text||source?.snippet||'');
  let score=0;
  for(const term of terms){
    if(title.includes(term))score+=3;
    if(text.includes(term))score+=1;
  }
  if(normalize(source?.approvalState||'').includes('approved'))score+=1.5;
  return score;
}

function relevantDriveSources(query,sources=[],policy={}){
  const terms=semanticWords(query);
  const min=terms.length>=4?2:1;
  return (Array.isArray(sources)?sources:[])
    .map(source=>({...source,_v27Score:sourceSemanticScore(query,source)}))
    .filter(source=>{
      if(policy?.mode==='admin_document'&&/template/i.test(String(source.kind||source.source||'')))return source._v27Score>=0.5;
      return source._v27Score>=min;
    })
    .sort((a,b)=>b._v27Score-a._v27Score)
    .slice(0,6);
}

function explicitLocalSources(query){
  if(!internalSourcesEnabled()||!explicitLocalRequested(query))return[];
  return readLocalDocs()
    .filter(doc=>doc?.status==='approved'&&!doc?.blocked&&doc?.text)
    .map(doc=>{
      const text=stripMarkup(doc.text).slice(0,MAX_SOURCE_TEXT);
      const source={
        kind:'local-approved-explicit',source:`Local approved (explicit) · ${doc.name||'Tài liệu'}`,
        title:doc.name||'Tài liệu local đã duyệt',url:'',domain:'',text,
        approvalState:'approved',sourceOrigin:'local'
      };
      return{...source,_v27Score:sourceSemanticScore(query,source)};
    })
    .filter(source=>source._v27Score>0)
    .sort((a,b)=>b._v27Score-a._v27Score)
    .slice(0,4);
}
function effectivePolicy(query,policy={}){
  const mode=String(policy?.mode||'');
  const enabled=internalSourcesEnabled();
  const eligible=mode!=='direct_runtime'&&mode!=='data_task';
  const local=enabled&&explicitLocalRequested(query);
  return{
    ...policy,
    useInternal:enabled,
    internalOptIn:enabled,
    useDrive:enabled&&eligible,
    useLocal:local,
    localRole:local?'explicit-supplement':'disabled-by-default',
    driveRole:enabled&&eligible?'opt-in-canonical':'disabled-until-user-opt-in',
    multiSourceV27:true
  };
}
function driveScopes(policy={}){
  if(policy?.mode==='admin_document')return['03_TEMPLATES','02_APPROVED','01_KNOWLEDGE','04_SKILLS'];
  return['02_APPROVED','01_KNOWLEDGE','04_SKILLS'];
}
async function driveRuntimeSources(query,policy={}){
  if(!policy?.internalOptIn||!policy?.useDrive)return[];
  try{
    const response=await fetch('/api/drive-brain',{
      method:'POST',headers:{'content-type':'application/json'},cache:'no-store',
      body:JSON.stringify({action:'search',query,scopes:driveScopes(policy),limit:7})
    });
    if(!response.ok)return[];
    const data=await response.json();
    if(!data?.configured||!Array.isArray(data?.sources))return[];
    const sources=data.sources.map(source=>({
      kind:source?.kind||'drive-document',source:source?.source||`Drive · ${source?.title||'Tài liệu'}`,
      title:source?.title||'Drive',url:source?.url||'',domain:source?.domain||'drive.google.com',
      text:stripMarkup(source?.text||source?.snippet||'').slice(0,MAX_SOURCE_TEXT),
      approvalState:source?.approvalState||'reference',provenance:source?.provenance||null,sourceOrigin:'drive'
    })).filter(source=>source.text||source.title);
    return relevantDriveSources(query,sources,policy);
  }catch{return[]}
}
async function researchWithCanonicalContext(query,policy={},canonicalContext=[]){
  if(!policy?.useWeb&&!canonicalContext.length)return{answer:'',sources:[],provider:'none',costTier:'zero-model'};
  try{
    const context=(Array.isArray(canonicalContext)?canonicalContext:[]).slice(0,6).map(source=>({
      title:source?.title||source?.source||'Context',
      text:stripMarkup(source?.text||'').slice(0,4500),
      sourceOrigin:source?.sourceOrigin||'drive'
    }));
    const response=await fetch('/api/research',{
      method:'POST',headers:{'content-type':'application/json'},cache:'no-store',
      body:JSON.stringify({
        query,
        mode:policy?.mode||'general_question',
        officialOnly:Boolean(policy?.officialOnly),
        useInternal:Boolean(policy?.internalOptIn),
        driveContext:context
      })
    });
    if(!response.ok)return{answer:'',sources:[],provider:'research-unavailable',status:response.status};
    const data=await response.json();
    return{
      answer:stripMarkup(data?.answer||''),
      sources:Array.isArray(data?.sources)?data.sources:[],
      provider:data?.provider||'research',
      model:data?.model||null,
      costTier:data?.costTier||null,
      sourceMode:data?.sourceMode||null,
      limitations:Array.isArray(data?.limitations)?data.limitations:[]
    };
  }catch{return{answer:'',sources:[],provider:'research-failed',limitations:['RESEARCH_RUNTIME_FAILED']}}
}
function annotateSources(sources=[]){
  return uniqSources(sources).map(source=>({
    ...source,
    text:stripMarkup(source?.text||source?.snippet||'').slice(0,MAX_SOURCE_TEXT),
    sourceOrigin:source?.sourceOrigin||(isLocalSource(source)?'local':isDriveSource(source)?'drive':'external')
  }));
}
async function probeDrive(){
  try{
    const response=await fetch('/api/drive-brain',{
      method:'POST',headers:{'content-type':'application/json'},cache:'no-store',body:JSON.stringify({action:'health'})
    });
    if(!response.ok)return{configured:false,live:false,status:response.status};
    const data=await response.json();
    return{configured:Boolean(data?.configured),live:true,...data};
  }catch{return{configured:false,live:false,reason:'DRIVE_RUNTIME_UNREACHABLE'}}
}
async function verifyCanary(){
  try{
    const response=await fetch('/api/drive-brain',{
      method:'POST',headers:{'content-type':'application/json'},cache:'no-store',
      body:JSON.stringify({action:'search',query:CANARY_QUERY,scopes:['02_APPROVED'],limit:5})
    });
    if(!response.ok)return{pass:false,configured:false,status:response.status};
    const data=await response.json();
    if(!data?.configured)return{pass:false,configured:false,reason:data?.reason||'DRIVE_RUNTIME_NOT_CONFIGURED'};
    const sources=Array.isArray(data?.sources)?data.sources:[];
    const match=sources.find(source=>source?.provenance?.fileId===CANARY_FILE_ID||String(source?.text||'').includes(CANARY_QUERY));
    return{
      pass:Boolean(match),configured:true,sourceCount:sources.length,fileId:match?.provenance?.fileId||null,
      scope:match?.provenance?.scope||match?.scope||null,approvalState:match?.approvalState||null
    };
  }catch{return{pass:false,configured:false,reason:'DRIVE_CANARY_PROBE_FAILED'}}
}
function updateUi(driveState,canaryState=null){
  const router=window.AIOfficeV20;if(router)router.driveState=driveState;
  const enabled=internalSourcesEnabled();
  const pill=document.getElementById('aiOfficeInternalSourcePill')||[...document.querySelectorAll('.pills .pill')][2];
  if(pill){
    pill.textContent=!enabled?'☁ Nội bộ: Tắt'
      :canaryState?.pass?'☁ Nội bộ: Bật · Drive verified'
      :driveState?.configured?'☁ Nội bộ: Bật · Drive online'
      :'☁ Nội bộ: Bật · Drive chưa kết nối';
    pill.classList.toggle('green',enabled);
    pill.classList.toggle('blue',!enabled);
  }
  const status=document.getElementById('v19Status');
  if(status&&enabled&&canaryState?.pass)status.textContent='Gemini-first · nội bộ opt-in · Drive canary PASS';
}
async function refreshDriveRuntime({verify=true}={}){
  const drive=await probeDrive();
  let canary=null;if(drive?.configured&&verify)canary=await verifyCanary();
  updateUi(drive,canary);
  const state={drive,canary,internalOptIn:internalSourcesEnabled(),checkedAt:new Date().toISOString()};
  if(window.AIOfficeMultiSourceV26)window.AIOfficeMultiSourceV26.state=state;
  window.dispatchEvent(new CustomEvent('ai-office-drive-runtime-state',{detail:state}));
  return state;
}
export function installMultiSourceOrchestrator(){
  if(installed)return true;
  const router=window.AIOfficeV20;
  if(!router?.gatherSources||!router?.classifySourcePolicy)return false;
  const originalClassify=router.classifySourcePolicy.bind(router);

  router.classifySourcePolicy=(text,baseIntent={})=>{
    const intent={...baseIntent,useInternal:internalSourcesEnabled(),internalOptIn:internalSourcesEnabled()};
    return effectivePolicy(text,originalClassify(text,intent));
  };
  router.gatherSources=async(text,policy)=>{
    const effective=effectivePolicy(text,policy||router.classifySourcePolicy(text,{kind:'question'}));

    // Isolation boundary: Drive and local knowledge are disabled until the user explicitly opts in.
    const drive=effective.internalOptIn?await driveRuntimeSources(text,effective):[];
    const local=effective.useLocal?explicitLocalSources(text):[];
    const canonicalContext=[...drive,...local].slice(0,6);
    const research=await researchWithCanonicalContext(text,effective,canonicalContext);
    const sources=annotateSources([...drive,...(research.sources||[]),...local])
      .filter(source=>effective.internalOptIn||(!isDriveSource(source)&&!isLocalSource(source)));
    const limitations=[...(research.limitations||[])];
    if(effective?.internalRequested&&!effective.internalOptIn)limitations.unshift('INTERNAL_SOURCES_DISABLED_BY_USER');

    return{
      sources,
      endpointAnswer:research.answer||'',
      provider:'multisource-v27',
      model:research.model||null,
      costTier:research.costTier||null,
      sourceMode:research.sourceMode||null,
      limitations,
      multiSource:{
        internalOptIn:Boolean(effective.internalOptIn),
        driveCount:sources.filter(isDriveSource).length,
        externalCount:sources.filter(isExternalSource).length,
        localCount:sources.filter(isLocalSource).length,
        localDependency:false,
        localAllowed:Boolean(effective.useLocal),
        localTransferredToGemini:Boolean(local.length),
        driveTransferredToGemini:Boolean(drive.length),
        finalSynthesis:effective.internalOptIn&&(drive.length||local.length)
          ?'single-pass-gemini-grounded-with-opt-in-internal-context'
          :'gemini-google-search-default'
      },
      effectivePolicy:effective
    };
  };

  installed=true;
  window.AIOfficeMultiSourceV26={
    version:VERSION,state:null,effectivePolicy,refreshDriveRuntime,verifyCanary,relevantDriveSources,
    internalSourcesEnabled,canary:{query:CANARY_QUERY,fileId:CANARY_FILE_ID}
  };
  void refreshDriveRuntime({verify:true});
  healthTimer=setInterval(()=>void refreshDriveRuntime({verify:true}),DRIVE_HEALTH_INTERVAL_MS);
  window.addEventListener('ai-office-source-preference-change',()=>void refreshDriveRuntime({verify:true}));
  window.addEventListener('online',()=>void refreshDriveRuntime({verify:true}));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshDriveRuntime({verify:true})});
  return true;
}
window.AIOfficeMultiSourceVersion=VERSION;
