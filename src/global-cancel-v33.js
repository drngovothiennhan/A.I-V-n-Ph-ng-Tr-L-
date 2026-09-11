const VERSION='3.3.0-global-cancel';
const TASK_KEY='ai-office-tasks-v11';
const AUDIT_KEY='ai-office-cancel-audit-v33';
const ACTIVE=new Set(['received','analyzing','planning','executing','verifying','delegated','processing','creating_output','uploading']);
const PENDING=new Set(['queued','planning','awaiting_input','awaiting_approval','waiting_permission','waiting_approval','pending_action']);

const getJson=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const setJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const now=()=>new Date().toISOString();

function tasks(){return getJson(TASK_KEY,[])}
function audit(kind,result={}){
  const rows=getJson(AUDIT_KEY,[]);
  rows.push({kind,at:now(),taskId:result?.taskId||null,status:result?.status||null,source:'user-cancel'});
  setJson(AUDIT_KEY,rows.slice(-120));
}
function mutateLatest(predicate,mutator){
  const rows=tasks();
  const index=rows.findIndex(predicate);
  if(index<0)return null;
  const task=rows[index];mutator(task);rows[index]=task;setJson(TASK_KEY,rows);window.render?.();return task;
}
function cancelTaskLike(kind,reason,status='cancelled'){
  const v21=window.AIOfficeV21;
  v21?.cancelCurrentCommand?.();
  let task=v21?.cancelRunningTask?.()||null;
  if(!task){
    task=mutateLatest(t=>ACTIVE.has(t?.status),t=>{t.status=status;t.cancelledAt=now();t.cancelReason=reason;t.progress=Math.min(Number(t.progress||0),95)});
  }
  const result={kind,taskId:task?.id||null,status:task?.status||status,aborted:Boolean(task)||true};audit(kind,result);return result;
}
function clearFileInputs(){
  let cleared=0;
  document.querySelectorAll('input[type="file"]').forEach(input=>{try{if(input.value){input.value='';cleared++}}catch{}});
  return cleared;
}
function cancelUpload(){
  window.AIOfficeV21?.cancelCurrentCommand?.();
  const clearedInputs=clearFileInputs();
  const task=mutateLatest(t=>['uploading','pending_upload','processing_upload'].includes(t?.status),t=>{t.status='cancelled';t.cancelledAt=now();t.cancelReason='user_cancelled_upload';t.progress=Math.min(Number(t.progress||0),95)});
  window.dispatchEvent(new CustomEvent('ai-office-cancel-upload',{detail:{taskId:task?.id||null,clearedInputs}}));
  const result={kind:'upload',taskId:task?.id||null,status:task?.status||'cancelled',clearedInputs};audit('upload',result);return result;
}
function cancelOutput(){
  window.AIOfficeV21?.cancelCurrentCommand?.();
  const task=mutateLatest(t=>['creating_output','awaiting_approval','completed'].includes(t?.status),t=>{
    t.previousStatus=t.status;t.status='output_cancelled';t.outputValidity='cancelled';t.outputCancelledAt=now();t.cancelReason='user_cancelled_output';
  });
  window.dispatchEvent(new CustomEvent('ai-office-cancel-output',{detail:{taskId:task?.id||null}}));
  const result={kind:'output',taskId:task?.id||null,status:task?.status||'output_cancelled'};audit('output',result);return result;
}
function cancelPendingAction(){
  const task=mutateLatest(t=>PENDING.has(t?.status),t=>{t.previousStatus=t.status;t.status='cancelled';t.cancelledAt=now();t.cancelReason='user_cancelled_pending_action';t.progress=Math.min(Number(t.progress||0),95)});
  if(task?.previousStatus==='awaiting_approval')window.AIOfficeV21?.cancelLatestApproval?.();
  else if(task?.previousStatus==='awaiting_input')window.AIOfficeV21?.cancelInput?.();
  const result={kind:'pending_action',taskId:task?.id||null,status:task?.status||'cancelled'};audit('pending_action',result);return result;
}
export function cancelByKind(kind='command'){
  switch(kind){
    case 'command': window.AIOfficeV21?.cancelCurrentCommand?.(); break;
    case 'task': return cancelTaskLike('task','user_cancelled_running_task');
    case 'processing': return cancelTaskLike('processing','user_cancelled_processing');
    case 'ai_generation': return cancelTaskLike('ai_generation','user_cancelled_ai_generation');
    case 'approval': {const task=window.AIOfficeV21?.cancelLatestApproval?.();const r={kind,taskId:task?.id||null,status:task?.status||'approval_cancelled'};audit(kind,r);return r}
    case 'undo_approval': {const task=window.AIOfficeV21?.undoLatestApproval?.();const r={kind,taskId:task?.id||null,status:task?.status||'awaiting_approval'};audit(kind,r);return r}
    case 'input': {const p=window.AIOfficeV21?.cancelInput?.();const r={kind,status:'input_cancelled'};audit(kind,r);return p||r}
    case 'upload': return cancelUpload();
    case 'output': return cancelOutput();
    case 'pending_action': return cancelPendingAction();
    default: return cancelTaskLike('command','user_cancelled_command');
  }
  const result={kind,status:'cancelled'};audit(kind,result);return result;
}
function injectContextualControls(){
  const bar=document.getElementById('ai21Controls');if(!bar||bar.querySelector('[data-ai33="processing"]'))return;
  const stop=document.createElement('button');stop.type='button';stop.className='ai21Ctl danger';stop.dataset.ai33='processing';stop.textContent='■ Dừng xử lý';stop.onclick=()=>cancelByKind('processing');
  const output=document.createElement('button');output.type='button';output.className='ai21Ctl';output.dataset.ai33='output';output.textContent='⌫ Bỏ kết quả';output.onclick=()=>cancelByKind('output');
  bar.append(stop,output);
}
export function installGlobalCancel(){
  if(typeof window==='undefined')return false;
  if(window.AIOfficeGlobalCancelV33?.version===VERSION)return true;
  window.AIOfficeGlobalCancelV33={version:VERSION,cancel:cancelByKind,auditKey:AUDIT_KEY};
  injectContextualControls();
  window.addEventListener('ai-office-global-cancel',event=>cancelByKind(event?.detail?.kind||'command'));
  return true;
}
