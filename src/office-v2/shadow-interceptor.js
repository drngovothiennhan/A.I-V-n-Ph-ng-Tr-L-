import { evaluateOfficeV2Shadow } from './shadow-runtime.js';

export const OFFICE_V2_SHADOW_INTERCEPTOR_VERSION='2.2.0-observe-only';
let installed=false;
let voicePatched=false;

function evaluate(text='',channel='text'){
  const value=String(text||'').trim();
  if(!value)return null;
  try{
    return evaluateOfficeV2Shadow(value,{channel},{persist:true});
  }catch{
    // Observe-only layer must never affect the canonical production path.
    return null;
  }
}
function installTextObserver(){
  window.addEventListener('click',event=>{
    if(!event.target?.closest?.('#send'))return;
    evaluate(document.getElementById('msg')?.value||'','text');
  },true);
  window.addEventListener('keydown',event=>{
    if(event.target?.id!=='msg'||event.key!=='Enter'||!(event.ctrlKey||event.metaKey))return;
    evaluate(document.getElementById('msg')?.value||'','text');
  },true);
}
function patchVoiceObserver(){
  if(voicePatched)return true;
  const voice=window.AIOfficeV19?.voice;
  if(!voice?.dispatchEvent)return false;
  const previous=voice.dispatchEvent.bind(voice);
  voice.dispatchEvent=event=>{
    if(event?.type==='transcript')evaluate(event?.detail?.text||'','voice');
    return previous(event);
  };
  voicePatched=true;
  return true;
}
export function installOfficeV2ShadowInterceptor(){
  if(typeof window==='undefined'||installed)return installed;
  installed=true;
  installTextObserver();
  patchVoiceObserver();
  window.addEventListener('ai-office-v2-repatch-voice',patchVoiceObserver);
  window.AIOfficeV2ShadowObserver=Object.freeze({version:OFFICE_V2_SHADOW_INTERCEPTOR_VERSION,repatchVoice:patchVoiceObserver});
  return true;
}
