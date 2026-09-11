import { cancellationIntent } from './interaction-policy-v21.js';

const VERSION='2.3.0-global-cancel-bridge';
const GLOBAL_KINDS=new Set(['upload','processing','ai_generation','output','pending_action']);
let voicePatched=false;

function cancelKind(text=''){const kind=cancellationIntent(text);return GLOBAL_KINDS.has(kind)?kind:''}
function executeCancel(kind){
  if(!kind)return null;
  if(window.AIOfficeGlobalCancelV33?.cancel)return window.AIOfficeGlobalCancelV33.cancel(kind);
  if(kind==='processing'||kind==='ai_generation'){
    window.AIOfficeV21?.cancelCurrentCommand?.();
    return window.AIOfficeV21?.cancelRunningTask?.()||{kind,status:'cancelled'};
  }
  if(kind==='upload')return window.AIOfficeV21?.cancelInput?.()||{kind,status:'cancelled'};
  if(kind==='output')return window.AIOfficeV21?.cancelLatestApproval?.()||{kind,status:'output_cancelled'};
  if(kind==='pending_action')return window.AIOfficeV21?.cancelRunningTask?.()||window.AIOfficeV21?.cancelLatestApproval?.()||{kind,status:'cancelled'};
  return null;
}
function consumeTextCancellation(event,text,input){
  const kind=cancelKind(text);if(!kind)return false;
  event?.preventDefault?.();event?.stopImmediatePropagation?.();if(input)input.value='';
  executeCancel(kind);return true;
}
function installTextPreInterceptor(){
  if(window.__AIOfficeGlobalCancelTextV23)return;
  window.__AIOfficeGlobalCancelTextV23=true;
  window.addEventListener('click',event=>{
    const target=event.target?.closest?.('#send');if(!target)return;
    const input=document.getElementById('msg'),text=input?.value||'';consumeTextCancellation(event,text,input);
  },true);
  window.addEventListener('keydown',event=>{
    if(event.target?.id!=='msg'||event.key!=='Enter'||!(event.ctrlKey||event.metaKey))return;
    const input=document.getElementById('msg'),text=input?.value||'';consumeTextCancellation(event,text,input);
  },true);
}

installTextPreInterceptor();
await import('./interaction-runtime-v22.js?v=221');

export function attachGlobalCancelVoice(){
  if(voicePatched)return true;
  const voice=window.AIOfficeV19?.voice;if(!voice?.dispatchEvent)return false;
  const previous=voice.dispatchEvent.bind(voice);
  voice.dispatchEvent=event=>{
    if(event?.type==='transcript'){
      const text=String(event?.detail?.text||'').trim(),kind=cancelKind(text);
      if(kind){const input=document.getElementById('msg');if(input)input.value='';executeCancel(kind);return true}
    }
    return previous(event);
  };
  voicePatched=true;return true;
}

window.AIOfficeV23={version:VERSION,cancelKind,executeCancel,attachGlobalCancelVoice};
