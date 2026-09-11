const VERSION='3.5.0-bounded-context-manager';
const CHAT_KEY='ai-office-conversation-v19';
const TASK_KEY='ai-office-tasks-v11';
const CANCEL_KEY='ai-office-cancel-audit-v33';
const INTERNAL_PREF_KEY='ai-office-use-internal-v27';
const SELECTED_FILES_KEY='ai-office-selected-files-v35';
const ACTIVE=new Set(['received','analyzing','planning','executing','verifying','delegated','processing','creating_output','uploading','queued','waiting_permission','waiting_approval','awaiting_input','awaiting_approval']);
const TERMINAL=new Set(['completed','failed','cancelled','rejected','approval_cancelled','input_cancelled','output_cancelled']);

const getJson=(key,fallback=[])=>{try{if(typeof localStorage==='undefined')return fallback;return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const compactText=(text,max=1200)=>String(text||'').replace(/\s+/g,' ').trim().slice(0,max);
const compactTask=(task=null)=>task?{
  id:task.id||null,title:compactText(task.title||task.originalMessage||'',180),status:task.status||null,
  kind:task.intentV32?.type||task.intent?.kind||task.category||task.kind||null,
  progress:Number.isFinite(Number(task.progress))?Number(task.progress):null,
  outputSummary:compactText(task.outputDraft||task.result?.summary||'',700),
  artifactFormats:Array.isArray(task.artifactFormats)?task.artifactFormats.slice(0,5):[],
  orchestrationId:task.orchestrationId||null
}:null;
function selectedFiles(){
  const runtime=typeof window!=='undefined'&&Array.isArray(window.AIOfficeSelectedFiles)?window.AIOfficeSelectedFiles:[];
  const stored=getJson(SELECTED_FILES_KEY,[]);
  return [...runtime,...(Array.isArray(stored)?stored:[])].slice(0,20).map(file=>({
    id:file?.id||null,name:compactText(file?.name||file?.title||'',180),type:compactText(file?.type||file?.mimeType||'',100),source:file?.source||null
  })).filter(file=>file.name||file.id);
}
function compressedConversation(){
  const history=getJson(CHAT_KEY,[]);const recent=history.slice(-6).map(turn=>({
    role:turn?.role==='assistant'?'assistant':'user',text:compactText(turn?.text,1200),at:turn?.at||null,
    intent:turn?.canonicalIntent||turn?.intent||null,orchestrationId:turn?.orchestrationId||null
  }));
  const older=history.slice(0,Math.max(0,history.length-6));
  return{
    recent,
    compressedOlder:older.length?{
      turnCount:older.length,userTurns:older.filter(x=>x?.role==='user').length,assistantTurns:older.filter(x=>x?.role==='assistant').length,
      firstAt:older[0]?.at||null,lastAt:older.at?.(-1)?.at||older[older.length-1]?.at||null
    }:null
  };
}
function relevantTaskMemory(tasks,kind,currentId){
  return tasks.filter(t=>t?.id!==currentId&&(kind?String(t?.intentV32?.type||t?.intent?.kind||t?.category||t?.kind||'')===String(kind):true))
    .slice(0,3).map(compactTask);
}
export function createContextSnapshot({userInstruction='',kind='',channel='text'}={}){
  const tasks=getJson(TASK_KEY,[]);const current=tasks.find(t=>ACTIVE.has(t?.status))||null;
  const recentResult=tasks.find(t=>TERMINAL.has(t?.status))||null;
  const approval=tasks.find(t=>['awaiting_approval','waiting_approval'].includes(t?.status))||null;
  const cancels=getJson(CANCEL_KEY,[]);const cancelState=cancels.at?.(-1)||cancels[cancels.length-1]||null;
  const conversation=compressedConversation();
  const internalStored=typeof localStorage!=='undefined'&&localStorage.getItem(INTERNAL_PREF_KEY)==='1';
  const internalRuntime=typeof window!=='undefined'&&window.AIOfficeSourcePreferences?.useInternal===true;
  const driveState=typeof window!=='undefined'?window.AIOfficeMultiSourceV26?.state?.drive||null:null;
  const internalOptIn=internalStored||internalRuntime;
  return{
    version:VERSION,createdAt:new Date().toISOString(),channel,userInstruction:compactText(userInstruction,1800),
    conversation,
    currentTask:compactTask(current),recentTaskResult:compactTask(recentResult),
    selectedFiles:selectedFiles(),
    selectedKnowledgeSource:{internalOptIn:Boolean(internalOptIn),driveConfigured:Boolean(driveState?.configured),mode:internalOptIn?'internal-opt-in':'external-default'},
    approvalState:approval?{taskId:approval.id||null,status:approval.status||null,title:compactText(approval.title,180)}:null,
    cancelState:cancelState?{kind:cancelState.kind||null,status:cancelState.status||null,taskId:cancelState.taskId||null,at:cancelState.at||null}:null,
    taskMemory:relevantTaskMemory(tasks,kind,current?.id),
    limits:{recentConversationTurns:6,relevantTasks:3,turnTextChars:1200,userInstructionChars:1800}
  };
}
export function contextEnvelopeFields(snapshot={}){
  return{
    currentTaskId:snapshot?.currentTask?.id||null,
    selectedFiles:Array.isArray(snapshot?.selectedFiles)?snapshot.selectedFiles:[],
    selectedKnowledgeSource:snapshot?.selectedKnowledgeSource||null,
    approvalState:snapshot?.approvalState||null,
    cancelState:snapshot?.cancelState||null,
    conversation:snapshot?.conversation||null,
    recentTaskResult:snapshot?.recentTaskResult||null,
    taskMemory:Array.isArray(snapshot?.taskMemory)?snapshot.taskMemory:[]
  };
}
if(typeof window!=='undefined')window.AIOfficeContextV35={version:VERSION,snapshot:createContextSnapshot,envelope:contextEnvelopeFields};
