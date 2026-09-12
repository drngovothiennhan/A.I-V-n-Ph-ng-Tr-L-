import { BrowserTaskRepository, DEFAULT_TASK_STORAGE_KEY } from './task-engine.js';
import { TASK_STATES, TERMINAL_TASK_STATES } from './contracts.js';
import { createChiefDelegationContract, OFFICE_V2_DELEGATION_VERSION } from './chief-delegation.js';

export const OFFICE_V2_TASK_BRIDGE_VERSION='2.10.0-chief-delegation-sync';
export const LEGACY_TASK_STORAGE_KEY='ai-office-tasks-v11';
const DEFAULT_POLL_MS=3000;

const STATUS_MAP=Object.freeze({
  received:TASK_STATES.RECEIVED,
  analyzing:TASK_STATES.PLANNING,
  planning:TASK_STATES.PLANNING,
  awaiting_permission:TASK_STATES.WAITING_PERMISSION,
  awaiting_approval:TASK_STATES.WAITING_APPROVAL,
  awaiting_input:TASK_STATES.WAITING_INPUT,
  executing:TASK_STATES.RUNNING,
  processing:TASK_STATES.RUNNING,
  delegated:TASK_STATES.RUNNING,
  running:TASK_STATES.RUNNING,
  paused:TASK_STATES.PAUSED,
  verifying:TASK_STATES.VERIFYING,
  creating_output:TASK_STATES.CREATING_OUTPUT,
  completed:TASK_STATES.COMPLETED,
  done:TASK_STATES.COMPLETED,
  cancelled:TASK_STATES.CANCELLED,
  canceled:TASK_STATES.CANCELLED,
  failed:TASK_STATES.FAILED,
  error:TASK_STATES.FAILED
});

function now(){return new Date().toISOString()}
function asText(value,max=8000){return String(value??'').trim().slice(0,max)}
function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
function safeStorage(storage){
  if(storage)return storage;
  try{return typeof localStorage!=='undefined'?localStorage:null}catch{return null}
}
function safeRows(storage=safeStorage()){
  if(!storage)return[];
  try{const rows=JSON.parse(storage.getItem(LEGACY_TASK_STORAGE_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}
}
function legacyStatus(value){return STATUS_MAP[String(value||'').toLowerCase()]||TASK_STATES.PLANNING}
function legacyInstruction(task){return asText(task?.originalMessage||task?.rootInstruction||task?.instruction||task?.title||'Công việc',8000)||'Công việc'}
function legacyTitle(task,instruction){return asText(task?.title||instruction,180)||'Công việc'}
function legacyFingerprint(task){
  return JSON.stringify([
    task?.id||null,task?.status||null,task?.updatedAt||null,task?.progress??null,task?.revision??null,
    task?.cancelledAt||null,task?.qa?.score??null,task?.intentV32?.type||task?.intentV22?.taskKind||null,
    task?.approval?.status||null,task?.artifacts?.length??task?.files?.length??null
  ]);
}
function operationalMetadata(task,fingerprint,instruction){
  const canonical=task?.intentV32||{};
  const interaction=task?.intentV22||{};
  let delegation=null;
  try{delegation=createChiefDelegationContract(task,instruction)}catch{}
  return {
    bridge:'legacy-v11',bridgeVersion:OFFICE_V2_TASK_BRIDGE_VERSION,legacyFingerprint:fingerprint,legacyStatus:String(task?.status||'unknown'),
    progress:Math.max(0,Math.min(100,finite(task?.progress,0))),
    orchestrationId:task?.orchestrationId||null,
    intent:canonical.type||interaction.taskKind||null,
    risk:canonical.risk||interaction.risk||null,
    needsApproval:Boolean(canonical.needsApproval??interaction.needsApproval??task?.approvalRequired),
    artifactFormats:Array.isArray(canonical.artifactFormats)?canonical.artifactFormats.slice(0,12):[],
    qaScore:Number.isFinite(Number(task?.qa?.score))?Number(task.qa.score):null,
    outputCount:Array.isArray(task?.artifacts)?task.artifacts.length:Array.isArray(task?.files)?task.files.length:0,
    delegationVersion:delegation?.version||null,
    delegation:delegation?{
      mode:delegation.mode,intent:delegation.intent,agents:[...delegation.agents],knowledgeMode:delegation.knowledge.mode,
      knowledgeProviders:[...delegation.knowledge.providers],artifacts:[...delegation.artifacts],approvalRequired:delegation.approvalRequired,
      verify:delegation.verify,sideEffectAllowed:delegation.sideEffectAllowed
    }:null
  };
}

export function normalizeLegacyTask(task,existing=null){
  if(!task||typeof task!=='object'||!task.id)return null;
  const fingerprint=legacyFingerprint(task);
  if(existing?.metadata?.legacyFingerprint===fingerprint&&existing?.metadata?.delegationVersion===OFFICE_V2_DELEGATION_VERSION)return existing;
  const instruction=legacyInstruction(task),at=now(),from=existing?.status||null,to=legacyStatus(task.status);
  return {
    id:String(task.id),requestId:task?.orchestrationId||existing?.requestId||null,
    title:legacyTitle(task,instruction),instruction,status:to,
    createdAt:asText(task?.createdAt||existing?.createdAt||at,80),updatedAt:asText(task?.updatedAt||at,80),
    attempt:Math.max(1,finite(task?.attempt,existing?.attempt||1)),revision:Number(existing?.revision||0)+1,
    plan:null,metadata:operationalMetadata(task,fingerprint,instruction),
    history:[...(Array.isArray(existing?.history)?existing.history:[]),{at,from,to,event:'legacy-sync',reason:null}]
  };
}

export async function syncLegacyTaskCollection(rows=[],repository=new BrowserTaskRepository()){
  const source=Array.isArray(rows)?rows:[];
  let changed=0,skipped=0;
  for(const legacy of source){
    if(!legacy?.id){skipped++;continue}
    const existing=await repository.get(String(legacy.id));
    const next=normalizeLegacyTask(legacy,existing);
    if(!next){skipped++;continue}
    if(existing===next){skipped++;continue}
    await repository.save(next);changed++;
  }
  const persisted=await repository.list();
  const active=persisted.filter(task=>!TERMINAL_TASK_STATES.has(task?.status)&&task?.status!==TASK_STATES.FAILED).length;
  return Object.freeze({version:OFFICE_V2_TASK_BRIDGE_VERSION,total:persisted.length,active,changed,skipped});
}

function collectionFingerprint(rows=[]){return JSON.stringify([OFFICE_V2_DELEGATION_VERSION,...(Array.isArray(rows)?rows:[]).map(legacyFingerprint)])}

export function installOfficeV2TaskRuntimeBridge({storage,pollMs=DEFAULT_POLL_MS}={}){
  if(typeof window==='undefined')return false;
  if(window.AIOfficeV2Tasks?.version===OFFICE_V2_TASK_BRIDGE_VERSION)return true;
  const resolved=safeStorage(storage),repository=new BrowserTaskRepository({storage:resolved,key:DEFAULT_TASK_STORAGE_KEY});
  let lastFingerprint='',lastSnapshot=Object.freeze({version:OFFICE_V2_TASK_BRIDGE_VERSION,total:0,active:0,changed:0,skipped:0});
  let syncing=false;
  const sync=async(force=false)=>{
    if(syncing)return lastSnapshot;
    const rows=safeRows(resolved),fingerprint=collectionFingerprint(rows);
    if(!force&&fingerprint===lastFingerprint)return lastSnapshot;
    syncing=true;
    try{
      lastSnapshot=await syncLegacyTaskCollection(rows,repository);lastFingerprint=fingerprint;
      window.dispatchEvent(new CustomEvent('ai-office-v2-tasks-updated',{detail:lastSnapshot}));
      return lastSnapshot;
    }finally{syncing=false}
  };
  const onFocus=()=>void sync(false).catch(()=>{});
  const onVisibility=()=>{if(document.visibilityState==='visible')onFocus()};
  const onStorage=event=>{if(event?.key===LEGACY_TASK_STORAGE_KEY)onFocus()};
  window.addEventListener('focus',onFocus);
  window.addEventListener('storage',onStorage);
  document.addEventListener('visibilitychange',onVisibility);
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')onFocus()},Math.max(1500,finite(pollMs,DEFAULT_POLL_MS)));
  window.AIOfficeV2Tasks=Object.freeze({
    version:OFFICE_V2_TASK_BRIDGE_VERSION,storageKey:DEFAULT_TASK_STORAGE_KEY,legacyKey:LEGACY_TASK_STORAGE_KEY,
    delegationVersion:OFFICE_V2_DELEGATION_VERSION,
    sync:()=>sync(true),list:()=>repository.list(),get:id=>repository.get(String(id||'')),snapshot:()=>lastSnapshot,
    stop:()=>{window.clearInterval(timer);window.removeEventListener('focus',onFocus);window.removeEventListener('storage',onStorage);document.removeEventListener('visibilitychange',onVisibility)}
  });
  void sync(true).catch(()=>{});
  window.dispatchEvent(new CustomEvent('ai-office-v2-task-bridge-ready',{detail:{version:OFFICE_V2_TASK_BRIDGE_VERSION,delegationVersion:OFFICE_V2_DELEGATION_VERSION}}));
  return true;
}
