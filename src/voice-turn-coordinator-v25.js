const VERSION='2.5-voice-turn-coordinator';
const TASK_KEY='ai-office-tasks-v11';
const MAX_QUEUE=4;
const ACTIVE_TASK_STATES=new Set(['received','analyzing','planning','executing','verifying','delegated','processing','awaiting_input','awaiting_approval']);
const READ_ONLY_MODES=new Set(['question','casual']);

let installed=false;
let draining=false;
let queue=[];
let lastTranscript={text:'',at:0};

function normalize(text=''){
  return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
}

function tasks(){
  try{return JSON.parse(localStorage.getItem(TASK_KEY)||'[]')||[]}catch{return[]}
}

function hasActiveTask(){
  return tasks().some(task=>ACTIVE_TASK_STATES.has(task?.status));
}

function classify(text){
  try{return window.AIOfficeV22?.classifyInteraction?.(text,{hasActiveTask:hasActiveTask()})||{mode:'question'}}catch{return{mode:'question'}}
}

function isDuplicate(text){
  const value=normalize(text),now=Date.now();
  if(!value)return true;
  if(lastTranscript.text===value&&now-lastTranscript.at<1800)return true;
  lastTranscript={text:value,at:now};
  return false;
}

function isImmediateCancel(text){
  const n=normalize(text);
  return /^(huy|cancel)\b/.test(n)||/\b(huy cong viec|huy lenh|huy duyet|huy xet duyet|huy dau vao|huy du lieu dau vao|huy tat ca)\b/.test(n);
}

function isStopSpeaking(text){
  const n=normalize(text);
  return /\b(dung noi|ngung noi|thoi noi|stop speaking|im lang)\b/.test(n);
}

function updateComposer(text){
  const input=document.getElementById('msg');
  if(input)input.value=String(text||'');
}

function updateQueueIndicator(){
  const tag=document.getElementById('ai22Intent');
  if(!tag)return;
  if(queue.length)tag.textContent=`Voice liên tục · ${queue.length} lượt đang chờ`;
}

function pushTurn(item){
  if(draining&&READ_ONLY_MODES.has(item.intent?.mode)){
    for(let i=queue.length-1;i>=0;i--){
      if(READ_ONLY_MODES.has(queue[i]?.intent?.mode)){
        queue[i]=item;
        updateQueueIndicator();
        return;
      }
    }
  }
  queue.push(item);
  if(queue.length>MAX_QUEUE)queue=queue.slice(-MAX_QUEUE);
  updateQueueIndicator();
}

async function runTurn(item){
  const runtime=window.AIOfficeV22;
  if(!runtime?.handleMessage)return null;
  return runtime.handleMessage(item.text,{spoken:true,source:'voice-turn-coordinator-v25'});
}

async function drain(){
  if(draining)return;
  draining=true;
  try{
    while(queue.length){
      const item=queue.shift();
      updateComposer(item.text);
      await runTurn(item);
    }
  }catch(error){
    console.error('voice_turn_coordinator_error',{message:String(error?.message||error).slice(0,220)});
  }finally{
    draining=false;
    updateQueueIndicator();
  }
}

function acceptTranscript(text){
  const value=String(text||'').trim();
  if(!value||isDuplicate(value))return true;
  updateComposer(value);

  const voice=window.AIOfficeV19?.voice;
  if(isStopSpeaking(value)){
    voice?.interrupt?.({keepListening:true});
    return true;
  }

  if(isImmediateCancel(value)){
    window.AIOfficeV22?.handleMessage?.(value,{spoken:true,source:'voice-turn-coordinator-v25-control'});
    return true;
  }

  pushTurn({text:value,intent:classify(value),at:Date.now()});
  void drain();
  return true;
}

export function installVoiceTurnCoordinator(){
  if(installed)return true;
  const voice=window.AIOfficeV19?.voice;
  if(!voice?.dispatchEvent||!window.AIOfficeV22?.handleMessage)return false;

  const previous=voice.dispatchEvent.bind(voice);
  voice.dispatchEvent=event=>{
    if(event?.type==='transcript')return acceptTranscript(event?.detail?.text||'');
    return previous(event);
  };

  installed=true;
  window.AIOfficeVoiceTurnCoordinator={
    version:VERSION,
    get queueLength(){return queue.length},
    get draining(){return draining},
    flush(){queue=[];updateQueueIndicator()},
    acceptTranscript
  };
  return true;
}

window.AIOfficeVoiceTurnCoordinatorVersion=VERSION;
