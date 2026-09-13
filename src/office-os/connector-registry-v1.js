export const CONNECTOR_REGISTRY_VERSION='1.0.0-p2';

export const PERMISSION_LEVELS=Object.freeze({
  READ:'READ',
  PREPARE:'PREPARE',
  EXECUTE_WITH_APPROVAL:'EXECUTE_WITH_APPROVAL',
  TRUSTED_AUTOMATION:'TRUSTED_AUTOMATION'
});

const SOCIAL_IDS=new Set(['facebook','zalo','social','social_network','social-scraping']);
const DEFINITIONS=Object.freeze([
  Object.freeze({id:'google_workspace',label:'Google Workspace',category:'workspace',permissions:[PERMISSION_LEVELS.READ,PERMISSION_LEVELS.PREPARE,PERMISSION_LEVELS.EXECUTE_WITH_APPROVAL],capabilities:['drive.read','gmail.read','gmail.prepare','calendar.read','calendar.prepare']}),
  Object.freeze({id:'google_drive',label:'Google Drive',category:'knowledge',permissions:[PERMISSION_LEVELS.READ],capabilities:['knowledge.search','file.read']}),
  Object.freeze({id:'gmail',label:'Gmail',category:'communication',permissions:[PERMISSION_LEVELS.READ,PERMISSION_LEVELS.PREPARE,PERMISSION_LEVELS.EXECUTE_WITH_APPROVAL],capabilities:['mail.read','mail.prepare']}),
  Object.freeze({id:'google_calendar',label:'Google Calendar',category:'schedule',permissions:[PERMISSION_LEVELS.READ,PERMISSION_LEVELS.PREPARE,PERMISSION_LEVELS.EXECUTE_WITH_APPROVAL],capabilities:['calendar.read','calendar.prepare']}),
  Object.freeze({id:'work_school_email',label:'Mail công việc / trường học',category:'communication',permissions:[PERMISSION_LEVELS.READ,PERMISSION_LEVELS.PREPARE,PERMISSION_LEVELS.EXECUTE_WITH_APPROVAL],capabilities:['mail.read','mail.prepare']}),
  Object.freeze({id:'ai_gateway',label:'A.I Gateway',category:'intelligence',permissions:[PERMISSION_LEVELS.READ],capabilities:['reason','classify','plan','verify']})
]);

let state={version:CONNECTOR_REGISTRY_VERSION,checkedAt:null,connectors:DEFINITIONS.map(def=>({...def,connected:false,status:'UNKNOWN'}))};
let timer=null;

function bool(value){return value===true||value==='true'}
function sanitizeDefinition(def={}){
  const id=String(def.id||'').trim().toLowerCase();
  if(!id||SOCIAL_IDS.has(id)||id.includes('facebook')||id.includes('zalo'))throw new Error('CONNECTOR_OUT_OF_SCOPE');
  return Object.freeze({
    id,
    label:String(def.label||id).trim().slice(0,80),
    category:String(def.category||'extension').trim().slice(0,40),
    permissions:Object.freeze([...(def.permissions||[])].filter(x=>Object.values(PERMISSION_LEVELS).includes(x))),
    capabilities:Object.freeze([...(def.capabilities||[])].map(String).filter(Boolean).slice(0,30))
  });
}

export function connectorDefinitions(){return DEFINITIONS.map(def=>({...def,permissions:[...def.permissions],capabilities:[...def.capabilities]}))}

export function normalizeConnectorState(health={}){
  const providers=health?.providers||{};
  const setup=health?.setup||{};
  const workspace=bool(providers?.googleWorkspace?.configured)||bool(setup?.googleWorkspace?.ready)||bool(setup?.workspace?.ready);
  const drive=bool(providers?.googleDriveRuntime?.configured)||bool(health?.brain?.driveRuntimeConfigured)||bool(setup?.drive?.ready);
  const ai=bool(providers?.gemini?.configured)||bool(providers?.openai?.configured)||bool(setup?.gemini?.ready)||bool(setup?.openai?.ready);
  const mail=workspace||bool(providers?.email?.configured)||bool(setup?.email?.ready);
  const statusById={
    google_workspace:workspace,
    google_drive:drive,
    gmail:workspace,
    google_calendar:workspace,
    work_school_email:mail,
    ai_gateway:ai
  };
  return DEFINITIONS.map(def=>({
    ...def,
    permissions:[...def.permissions],capabilities:[...def.capabilities],
    connected:Boolean(statusById[def.id]),
    status:statusById[def.id]?'READY':'NOT_CONNECTED'
  }));
}

async function readHealth(){
  try{
    const response=await fetch(`/api/health?t=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`HEALTH_${response.status}`);
    return await response.json();
  }catch{return{}}
}

function renderAccountStatus(){
  const panel=document.querySelector('#aiOfficeOSRoot [data-view-panel="account"] .aiosPanel');
  if(!panel)return;
  let box=document.getElementById('aiosConnectorRegistryStatus');
  if(!box){box=document.createElement('div');box.id='aiosConnectorRegistryStatus';box.className='aiosScopeNote';panel.appendChild(box)}
  const ready=state.connectors.filter(item=>item.connected).length;
  const labels=state.connectors.filter(item=>item.connected).map(item=>item.label);
  box.replaceChildren();
  const strong=document.createElement('b');strong.textContent=`Kết nối sẵn sàng: ${ready}/${state.connectors.length}. `;box.appendChild(strong);
  box.appendChild(document.createTextNode(labels.length?labels.join(' · '):'Chưa có connector được xác minh.'));
}

export async function refreshConnectorRegistry(){
  const health=await readHealth();
  state={version:CONNECTOR_REGISTRY_VERSION,checkedAt:new Date().toISOString(),connectors:normalizeConnectorState(health)};
  renderAccountStatus();
  window.dispatchEvent(new CustomEvent('ai-office-connectors-updated',{detail:{version:state.version,checkedAt:state.checkedAt,connectors:state.connectors.map(x=>({id:x.id,label:x.label,connected:x.connected,status:x.status}))}}));
  return getConnectorRegistrySnapshot();
}

export function getConnectorRegistrySnapshot(){
  return {version:state.version,checkedAt:state.checkedAt,connectors:state.connectors.map(x=>({...x,permissions:[...x.permissions],capabilities:[...x.capabilities]}))};
}

export function validateExtensionConnector(def){return sanitizeDefinition(def)}

export function installConnectorRegistry(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  if(window.AIOfficeConnectors?.version===CONNECTOR_REGISTRY_VERSION)return true;
  window.AIOfficeConnectors=Object.freeze({
    version:CONNECTOR_REGISTRY_VERSION,
    permissionLevels:PERMISSION_LEVELS,
    list:()=>getConnectorRegistrySnapshot().connectors,
    snapshot:getConnectorRegistrySnapshot,
    refresh:refreshConnectorRegistry,
    validateExtension:validateExtensionConnector,
    socialConnectors:false
  });
  window.addEventListener('ai-office-os-ready',()=>void refreshConnectorRegistry(),{once:true});
  if(document.getElementById('aiOfficeOSRoot'))void refreshConnectorRegistry();
  timer=setInterval(()=>void refreshConnectorRegistry(),120000);
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer)},{once:true});
  return true;
}
