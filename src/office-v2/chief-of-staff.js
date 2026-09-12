import { OFFICE_MODES, freezeContract, assertOfficePlan } from './contracts.js';
import { createKnowledgePlan } from './knowledge-gateway.js';

const ACTION_INTENTS=new Set(['SYSTEM_COMMAND','APP_COMMAND','VOICE_COMMAND','COMMUNICATION_TASK']);
const QUESTION_INTENTS=new Set(['QUESTION']);
const AGENT_MAP=Object.freeze({
  QUESTION:['answer'],TASK:['general','qa'],DOCUMENT_TASK:['document','qa'],DATA_TASK:['data','qa'],SEARCH_TASK:['research','qa'],
  INTERNAL_KNOWLEDGE_TASK:['knowledge','qa'],COMMUNICATION_TASK:['communication','qa'],SYSTEM_COMMAND:['system-action'],APP_COMMAND:['app-action'],VOICE_COMMAND:['voice-action']
});
const unique=(values=[])=>[...new Set(values.filter(Boolean))];

export function officeModeForIntent(type='QUESTION'){
  if(QUESTION_INTENTS.has(type))return OFFICE_MODES.ANSWER;
  if(ACTION_INTENTS.has(type))return OFFICE_MODES.ACTION;
  return OFFICE_MODES.TASK;
}

export function createOfficePlan(request,{knowledge={},forceApproval=false}={}){
  const envelope=request?.legacyEnvelope||{};
  const intent=envelope?.intent||request?.context?.intent||{};
  const type=String(intent.type||'QUESTION');
  const mode=officeModeForIntent(type);
  const agents=unique(AGENT_MAP[type]||['general','qa']);
  const approvalRequired=Boolean(forceApproval||envelope?.route?.approvalRequired||intent.needsApproval||intent.risk==='high');
  const artifacts=unique(envelope?.route?.artifactFormats||intent.artifactFormats||[]);
  const knowledgePlan=createKnowledgePlan(envelope,knowledge);
  const plan={contractVersion:'office-plan-v2',requestId:request?.id||envelope?.id||null,intent:type,mode,agents,knowledge:knowledgePlan,artifacts,
    approval:{required:approvalRequired,stage:approvalRequired?'before-side-effect':'none'},
    execution:{taskRequired:mode===OFFICE_MODES.TASK,sideEffectAllowed:mode!==OFFICE_MODES.ACTION?false:!approvalRequired,verify:mode===OFFICE_MODES.TASK||agents.includes('qa')}};
  assertOfficePlan(plan);return freezeContract(plan);
}
