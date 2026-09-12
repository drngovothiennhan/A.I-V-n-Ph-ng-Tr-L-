import { buildOfficeV2Shadow } from './legacy-bridge.js';

export const OFFICE_V2_SHADOW_VERSION='2.1.0-shadow-metrics';
export const OFFICE_V2_SHADOW_KEY='ai-office-v2-shadow-metrics';
const MAX_ROWS=120;

function safeStorage(){
  try{return typeof localStorage!=='undefined'?localStorage:null}catch{return null}
}
function readRows(storage=safeStorage()){
  if(!storage)return[];
  try{const parsed=JSON.parse(storage.getItem(OFFICE_V2_SHADOW_KEY)||'[]');return Array.isArray(parsed)?parsed:[]}catch{return[]}
}
function modeForLegacyIntent(type='QUESTION'){
  if(type==='QUESTION')return'ANSWER';
  if(['SYSTEM_COMMAND','APP_COMMAND','VOICE_COMMAND','COMMUNICATION_TASK'].includes(type))return'ACTION';
  return'TASK';
}
function structuralMetric(result){
  const legacyIntent=String(result?.request?.legacyEnvelope?.intent?.type||'UNKNOWN');
  const v2Mode=String(result?.plan?.mode||'UNKNOWN');
  const expectedMode=modeForLegacyIntent(legacyIntent);
  return Object.freeze({
    at:new Date().toISOString(),
    version:OFFICE_V2_SHADOW_VERSION,
    legacyIntent,
    expectedMode,
    v2Mode,
    parity:expectedMode===v2Mode,
    taskCreated:Boolean(result?.task),
    approvalRequired:Boolean(result?.plan?.approval?.required),
    knowledgeMode:String(result?.plan?.knowledge?.mode||'UNKNOWN'),
    agentCount:Array.isArray(result?.plan?.agents)?result.plan.agents.length:0,
    artifactCount:Array.isArray(result?.plan?.artifacts)?result.plan.artifacts.length:0
  });
}
export function recordShadowMetric(metric,storage=safeStorage()){
  if(!storage)return metric;
  const rows=readRows(storage);
  rows.unshift(metric);
  storage.setItem(OFFICE_V2_SHADOW_KEY,JSON.stringify(rows.slice(0,MAX_ROWS)));
  return metric;
}
export function evaluateOfficeV2Shadow(text='',context={},options={}){
  const result=buildOfficeV2Shadow(text,context,options);
  const metric=structuralMetric(result);
  if(options.persist!==false)recordShadowMetric(metric,options.storage||safeStorage());
  return {result,metric};
}
export function shadowSummary(storage=safeStorage()){
  const rows=readRows(storage);
  const total=rows.length,matched=rows.filter(row=>row?.parity===true).length;
  return Object.freeze({version:OFFICE_V2_SHADOW_VERSION,total,matched,mismatched:total-matched,parityRate:total?matched/total:1});
}
export function installOfficeV2ShadowRuntime(){
  if(typeof window==='undefined')return false;
  if(window.AIOfficeV2Shadow?.version===OFFICE_V2_SHADOW_VERSION)return true;
  window.AIOfficeV2Shadow=Object.freeze({
    version:OFFICE_V2_SHADOW_VERSION,
    evaluate:evaluateOfficeV2Shadow,
    summary:shadowSummary,
    storageKey:OFFICE_V2_SHADOW_KEY
  });
  window.dispatchEvent(new CustomEvent('ai-office-v2-shadow-ready',{detail:{version:OFFICE_V2_SHADOW_VERSION}}));
  return true;
}
