export const OFFICE_V2_VERSION='2.0.0-shadow';

export const OFFICE_MODES=Object.freeze({
  ANSWER:'ANSWER',
  TASK:'TASK',
  ACTION:'ACTION'
});

export const TASK_STATES=Object.freeze({
  RECEIVED:'RECEIVED',
  PLANNING:'PLANNING',
  WAITING_PERMISSION:'WAITING_PERMISSION',
  WAITING_APPROVAL:'WAITING_APPROVAL',
  WAITING_INPUT:'WAITING_INPUT',
  RUNNING:'RUNNING',
  PAUSED:'PAUSED',
  VERIFYING:'VERIFYING',
  CREATING_OUTPUT:'CREATING_OUTPUT',
  COMPLETED:'COMPLETED',
  FAILED:'FAILED',
  CANCELLED:'CANCELLED'
});

export const KNOWLEDGE_MODES=Object.freeze({
  AUTO:'AUTO',
  INTERNAL:'INTERNAL',
  VERIFIED:'VERIFIED',
  NONE:'NONE'
});

export const TERMINAL_TASK_STATES=new Set([
  TASK_STATES.COMPLETED,
  TASK_STATES.CANCELLED
]);

export function freezeContract(value){
  if(!value||typeof value!=='object')return value;
  Object.freeze(value);
  for(const item of Object.values(value))if(item&&typeof item==='object'&&!Object.isFrozen(item))freezeContract(item);
  return value;
}

export function createOfficeRequest({id,text='',channel='text',context={},envelope=null}={}){
  const instruction=String(text||'').trim();
  if(!instruction)throw new TypeError('office_request_instruction_required');
  return freezeContract({
    contractVersion:OFFICE_V2_VERSION,
    id:id||envelope?.id||globalThis.crypto?.randomUUID?.()||`office-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    createdAt:new Date().toISOString(),
    instruction,
    channel,
    context:{...context},
    legacyEnvelope:envelope||null
  });
}

export function assertOfficePlan(plan){
  if(!plan||typeof plan!=='object')throw new TypeError('office_plan_required');
  if(!Object.values(OFFICE_MODES).includes(plan.mode))throw new TypeError('office_plan_mode_invalid');
  if(!Array.isArray(plan.agents)||!plan.agents.length)throw new TypeError('office_plan_agents_required');
  if(!plan.knowledge||!Object.values(KNOWLEDGE_MODES).includes(plan.knowledge.mode))throw new TypeError('office_plan_knowledge_invalid');
  return plan;
}
