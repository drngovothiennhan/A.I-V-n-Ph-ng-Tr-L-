import { createOrchestrationEnvelope } from '../ai-orchestrator-core-v32.js';
import { createOfficeRequest, freezeContract } from './contracts.js';
import { createOfficePlan } from './chief-of-staff.js';

export const OFFICE_V2_DELEGATION_VERSION='2.10.0-chief-delegation';

function canonicalEnvelope(task,instruction){
  const intent=task?.intentV32;
  if(!intent?.type)return createOrchestrationEnvelope(instruction,{channel:'task'});
  return {
    id:task?.orchestrationId||task?.id||null,
    createdAt:task?.createdAt||new Date().toISOString(),
    input:instruction,
    intent,
    context:{currentTaskId:task?.id||null},
    route:{
      sourceMode:intent?.source?.mode||'task-context',
      provider:intent?.source?.preferredProvider||'orchestrator',
      artifactFormats:Array.isArray(intent?.artifactFormats)?intent.artifactFormats:[],
      approvalRequired:Boolean(intent?.needsApproval)
    }
  };
}

export function createChiefDelegationContract(task={},instruction=''){
  const text=String(instruction||task?.originalMessage||task?.rootInstruction||task?.instruction||task?.title||'Công việc').trim()||'Công việc';
  const envelope=canonicalEnvelope(task,text);
  const request=createOfficeRequest({id:envelope.id||task?.id,text,channel:'task',context:{currentTaskId:task?.id||null},envelope});
  const plan=createOfficePlan(request);
  return freezeContract({
    version:OFFICE_V2_DELEGATION_VERSION,
    mode:plan.mode,
    intent:plan.intent,
    agents:[...plan.agents],
    knowledge:{mode:plan.knowledge.mode,providers:[...(plan.knowledge.providers||[])]},
    artifacts:[...plan.artifacts],
    approvalRequired:Boolean(plan.approval.required),
    verify:Boolean(plan.execution.verify),
    sideEffectAllowed:Boolean(plan.execution.sideEffectAllowed)
  });
}
