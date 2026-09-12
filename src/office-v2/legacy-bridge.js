import { createOrchestrationEnvelope } from '../ai-orchestrator-core-v32.js';
import { createOfficeRequest } from './contracts.js';
import { createOfficePlan } from './chief-of-staff.js';
import { createTask } from './task-engine.js';

export function buildOfficeV2Shadow(text='',context={},options={}){
  const envelope=createOrchestrationEnvelope(text,context);
  const request=createOfficeRequest({text,channel:context.channel||'text',context,envelope});
  const plan=createOfficePlan(request,options);
  const task=plan.execution.taskRequired?createTask({requestId:request.id,title:text,instruction:text,plan}):null;
  return {mode:'shadow',request,plan,task};
}
