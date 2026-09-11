import { classifyInteractionV22, normalizeV22 } from './interaction-policy-v22.js';

export const AI_CORE_VERSION = '3.2.0-canonical-intent-contract';
export const CANONICAL_INTENTS = Object.freeze({
  QUESTION:'QUESTION',
  TASK:'TASK',
  DOCUMENT_TASK:'DOCUMENT_TASK',
  DATA_TASK:'DATA_TASK',
  SEARCH_TASK:'SEARCH_TASK',
  INTERNAL_KNOWLEDGE_TASK:'INTERNAL_KNOWLEDGE_TASK',
  COMMUNICATION_TASK:'COMMUNICATION_TASK',
  SYSTEM_COMMAND:'SYSTEM_COMMAND',
  APP_COMMAND:'APP_COMMAND',
  VOICE_COMMAND:'VOICE_COMMAND'
});

const INTERNAL_HINTS=/\b(tai lieu noi bo|tai lieu cua co quan|theo tai lieu|theo ho so|kho kien thuc|knowledge base|drive noi bo|google drive|du lieu co quan|du lieu to chuc)\b/;
const SEARCH_HINTS=/\b(tra cuu|nghien cuu|tim nguon|kiem chung|doi chieu nguon|nguon chinh thuc|moi nhat|cap nhat moi|tim tren web|tim tren internet|search)\b/;
const COMM_HINTS=/\b(email|gmail|thu dien tu|calendar|lich hop|lich lam viec|cuoc hop|meeting|tin nhan|thong bao)\b/;
const COMM_ACTIONS=/\b(gui|soan|tra loi|reply|forward|chuyen tiep|dat lich|tao lich|doi lich|huy lich|moi|len lich|cap nhat lich)\b/;
const APP_HINTS=/\b(module|trang|menu|dashboard|ai center|task center|cai dat|xiaozhi|voice|micro|mic)\b/;
const APP_ACTIONS=/^(mo|dong|chuyen|di toi|vao|bat|tat|quay lai)\b/;
const SYSTEM_HINTS=/\b(huy cong viec|huy lenh|bo lenh|dung cong viec|dung tac vu|huy phe duyet|huy tai len|huy xu ly|huy ket qua|toi uu he thong|kiem tra he thong|trang thai he thong|khoi dong lai)\b/;
const VOICE_CONTROLS=/\b(dung noi|ngung noi|noi lai|lap lai|doc lai|tiep tuc nghe|nghe tiep|bat lai micro|bat lai mic)\b/;
const DOCUMENT_OUTPUT=/\b(docx|word|file word|van ban|bao cao|ke hoach|cong van|to trinh|thong bao|quyet dinh|bien ban|giay moi)\b/;
const DATA_OUTPUT=/\b(xlsx|excel|csv|bang tinh|du lieu|danh sach|doi chieu|loc danh sach|thong ke|pivot)\b/;
const MUTATION=/\b(tao|soan|lap|xuat|loc|doi chieu|sua|cap nhat|trien khai|thuc hien|thi hanh|lam|gui|dang|xoa|ket noi|cau hinh)\b/;

function uniq(list=[]){return [...new Set(list.filter(Boolean))]}
function sourceDirective(type,n,context={}){
  const explicitInternal=INTERNAL_HINTS.test(n);
  const enabled=Boolean(context.internalOptIn||context.useInternal);
  if(type===CANONICAL_INTENTS.INTERNAL_KNOWLEDGE_TASK||explicitInternal){
    return {
      mode:'internal',
      internalRequested:true,
      internalAuthorized:enabled||explicitInternal,
      externalAllowed:Boolean(context.allowExternalWithInternal),
      preferredProvider:'gemini',
      reason:explicitInternal?'explicit-user-internal-request':'internal-intent'
    };
  }
  if(type===CANONICAL_INTENTS.SEARCH_TASK||type===CANONICAL_INTENTS.QUESTION){
    return {mode:'external-default',internalRequested:false,internalAuthorized:false,externalAllowed:true,preferredProvider:'gemini',reason:'gemini-first-default'};
  }
  return {mode:'task-context',internalRequested:false,internalAuthorized:false,externalAllowed:false,preferredProvider:'orchestrator',reason:'task-does-not-require-search-by-default'};
}
function artifactHints(n,interaction={}){
  const formats=[];
  if(/\b(docx|word|file word)\b/.test(n))formats.push('docx');
  if(/\b(xlsx|excel|bang tinh)\b/.test(n))formats.push('xlsx');
  if(/\b(pptx|powerpoint|slide|trinh chieu)\b/.test(n))formats.push('pptx');
  if(/\b(png|jpg|jpeg|webp|infographic|poster|hinh anh)\b/.test(n))formats.push('png');
  if(/\b(pdf)\b/.test(n))formats.push('pdf');
  if(!formats.length&&interaction?.taskKind==='admin'&&interaction?.mode==='task')formats.push('docx');
  if(!formats.length&&interaction?.taskKind==='data'&&interaction?.mode==='task')formats.push('xlsx');
  if(!formats.length&&interaction?.taskKind==='presentation'&&interaction?.mode==='task')formats.push('pptx');
  if(!formats.length&&interaction?.taskKind==='image'&&interaction?.mode==='task')formats.push('png');
  return uniq(formats);
}
function canonicalType(raw,n,interaction,context={}){
  if(interaction?.mode==='control'){
    if(['stop_speaking','repeat','resume_listening'].includes(interaction.control)||VOICE_CONTROLS.test(n))return CANONICAL_INTENTS.VOICE_COMMAND;
    return CANONICAL_INTENTS.SYSTEM_COMMAND;
  }
  if(VOICE_CONTROLS.test(n))return CANONICAL_INTENTS.VOICE_COMMAND;
  if(SYSTEM_HINTS.test(n))return CANONICAL_INTENTS.SYSTEM_COMMAND;
  if(APP_ACTIONS.test(n)&&APP_HINTS.test(n))return CANONICAL_INTENTS.APP_COMMAND;
  if(COMM_HINTS.test(n)&&COMM_ACTIONS.test(n))return CANONICAL_INTENTS.COMMUNICATION_TASK;
  if(INTERNAL_HINTS.test(n))return CANONICAL_INTENTS.INTERNAL_KNOWLEDGE_TASK;
  if(interaction?.mode==='hybrid'){
    if(interaction.taskKind==='data')return CANONICAL_INTENTS.DATA_TASK;
    if(interaction.taskKind==='admin')return CANONICAL_INTENTS.DOCUMENT_TASK;
    if(interaction.taskKind==='research')return CANONICAL_INTENTS.SEARCH_TASK;
    return CANONICAL_INTENTS.TASK;
  }
  if(interaction?.mode==='task'){
    if(interaction.taskKind==='data'||DATA_OUTPUT.test(n))return CANONICAL_INTENTS.DATA_TASK;
    if(interaction.taskKind==='admin'||(DOCUMENT_OUTPUT.test(n)&&MUTATION.test(n)))return CANONICAL_INTENTS.DOCUMENT_TASK;
    if(interaction.taskKind==='research'||SEARCH_HINTS.test(n))return CANONICAL_INTENTS.SEARCH_TASK;
    return CANONICAL_INTENTS.TASK;
  }
  if(SEARCH_HINTS.test(n))return CANONICAL_INTENTS.SEARCH_TASK;
  if(context.forceInternal===true)return CANONICAL_INTENTS.INTERNAL_KNOWLEDGE_TASK;
  return CANONICAL_INTENTS.QUESTION;
}

export function classifyCanonicalIntent(text='',context={}){
  const raw=String(text||'').trim();
  const n=normalizeV22(raw);
  const interaction=context.interaction||classifyInteractionV22(raw,{hasActiveTask:Boolean(context.hasActiveTask)});
  const type=canonicalType(raw,n,interaction,context);
  const artifacts=artifactHints(n,interaction);
  const source=sourceDirective(type,n,context);
  const confidence=Math.max(0.55,Math.min(0.99,Number(interaction?.confidence||0.7)));
  const needsApproval=Boolean(interaction?.needsApproval||interaction?.risk==='high');
  return {
    contractVersion:AI_CORE_VERSION,
    type,
    confidence,
    interactionMode:interaction?.mode||'question',
    legacyTaskKind:interaction?.taskKind||'general',
    control:interaction?.control||null,
    risk:interaction?.risk||'none',
    needsApproval,
    artifactFormats:artifacts,
    artifactRequested:artifacts.length>0,
    source,
    channel:context.channel||'text',
    continuation:Boolean(context.continuation),
    reasonCodes:uniq([
      interaction?.mode?`interaction:${interaction.mode}`:'interaction:unknown',
      interaction?.taskKind?`kind:${interaction.taskKind}`:'kind:general',
      source.reason,
      artifacts.length?`artifact:${artifacts.join('+')}`:''
    ])
  };
}

export function createOrchestrationEnvelope(text='',context={}){
  const intent=classifyCanonicalIntent(text,context);
  const id=globalThis.crypto?.randomUUID?.()||`req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  return {
    id,
    createdAt:new Date().toISOString(),
    input:String(text||'').trim(),
    intent,
    context:{
      conversationId:context.conversationId||null,
      currentTaskId:context.currentTaskId||null,
      selectedFiles:Array.isArray(context.selectedFiles)?context.selectedFiles.slice(0,20):[],
      selectedKnowledgeSource:context.selectedKnowledgeSource||null,
      approvalState:context.approvalState||null,
      cancelState:context.cancelState||null
    },
    route:{
      sourceMode:intent.source.mode,
      provider:intent.source.preferredProvider,
      artifactFormats:intent.artifactFormats,
      approvalRequired:intent.needsApproval
    }
  };
}

export function installAICoreOrchestrator(){
  if(typeof window==='undefined')return false;
  if(window.AIOfficeOrchestrator?.version===AI_CORE_VERSION)return true;
  window.AIOfficeOrchestrator={
    version:AI_CORE_VERSION,
    intents:CANONICAL_INTENTS,
    classifyIntent:classifyCanonicalIntent,
    createEnvelope:createOrchestrationEnvelope
  };
  window.dispatchEvent(new CustomEvent('ai-office-orchestrator-ready',{detail:{version:AI_CORE_VERSION}}));
  return true;
}
