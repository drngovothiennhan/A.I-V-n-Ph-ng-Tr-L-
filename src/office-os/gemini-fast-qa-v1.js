import { classifyInteractionV22, normalizeV22 } from '../interaction-policy-v22.js';
import { isWeatherQuery } from '../interaction-policy-v21.js';
import { classifySourcePolicy } from '../source-policy-v20.js';

export const GEMINI_FAST_QA_VERSION='1.0.0-p5';
const ACTIVE=new Set(['received','analyzing','planning','executing','verifying','delegated','processing','awaiting_input','awaiting_approval']);

function clean(input='',max=12000){return String(input??'').replace(/\0/g,'').replace(/\*\*/g,'').replace(/(^|\s)#{1,6}\s+/g,'$1').replace(/\s+/g,' ').trim().slice(0,max)}
function hasActiveTask(){try{const tasks=JSON.parse(localStorage.getItem('ai-office-tasks-v11')||'[]');return Array.isArray(tasks)&&tasks.some(task=>ACTIVE.has(task?.status))}catch{return false}}
function directClockAnswer(text=''){const n=normalizeV22(text).replace(/[?.!]+$/,'');if(!/^(bay gio( la)? may gio( roi)?|gio hien tai( la)? may gio( roi)?)$/.test(n))return'';const now=new Date();return`Bây giờ là ${now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}, ${now.toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}.`}
function workspaceSummaryIntent(text=''){const n=normalizeV22(text).replace(/[?.!]+$/,'');return /^(tom tat )?(viec|cong viec) can chu y$/.test(n)||/^(tom tat )?nhung viec can chu y$/.test(n)}
function vagueKnowledgeIntent(text=''){const n=normalizeV22(text).replace(/[?.!]+$/,'');return /^(tra cuu|tim|kiem tra|kiem chung)( thong tin)?( moi nhat)?$/.test(n)||/^(cho toi biet|thong tin)$/.test(n)}
function sourceLabel(source,index){const title=clean(source?.title||source?.source||`Nguồn ${index+1}`,160);const domain=clean(source?.domain||'',90);return`[${index+1}] ${title}${domain?` (${domain})`:''}`}
function addContainmentStyle(){
  if(document.getElementById('ai-gemini-fast-qa-style'))return;
  const style=document.createElement('style');
  style.id='ai-gemini-fast-qa-style';
  style.textContent=`
.aiosTask,.aiosTask>div,.aiosTaskTop,.aiosPanel,.aiosConversation,.aiosTurn,.aiosLiveAnswer{min-width:0;max-width:100%}
.aiosTask{overflow:hidden}.aiosTaskTitle{min-width:0;white-space:normal!important;overflow-wrap:anywhere;word-break:break-word}.aiosTurn,.aiosLiveAnswer{overflow-wrap:anywhere;word-break:break-word}
@media(max-width:820px){.aiosTaskTop{align-items:flex-start}.aiosTaskState{flex:0 0 auto}}
`;
  document.head.appendChild(style);
}
async function summarizeWorkspace(){
  try{
    const tasks=await window.AIOfficeV2Tasks?.list?.();
    const list=Array.isArray(tasks)?tasks:[];
    const active=list.filter(task=>ACTIVE.has(task?.status));
    const approval=list.filter(task=>task?.status==='awaiting_approval');
    const recentDone=list.filter(task=>task?.status==='completed').slice(0,3);
    if(!active.length&&!approval.length&&!recentDone.length)return'Hiện chưa có công việc nào cần chú ý.';
    const focus=[...active,...approval].slice(0,4).map(task=>clean(task?.title||task?.originalMessage||'Công việc',140));
    const parts=[];
    if(active.length)parts.push(`${active.length} việc đang xử lý`);
    if(approval.length)parts.push(`${approval.length} việc chờ duyệt`);
    if(recentDone.length)parts.push(`${recentDone.length} việc vừa hoàn tất`);
    return`Nhịp công việc: ${parts.join(', ')}.${focus.length?` Cần chú ý: ${focus.join('; ')}.`:''}`;
  }catch{return'Tôi chưa đọc được nhịp công việc hiện tại. Tôi không tự suy đoán nội dung.'}
}
async function askGeminiFast(text,policy){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch('/api/research',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({query:text,mode:policy?.mode||'general_question',officialOnly:Boolean(policy?.officialOnly),useInternal:false,fastAnswer:true}),
      signal:controller.signal,
      cache:'no-store'
    });
    let data=null;try{data=await response.json()}catch{}
    if(!response.ok||!data?.answer)return'Gemini + Google Search chưa trả lời được câu hỏi này trong thời gian cho phép. Tôi chưa dùng câu trả lời thay thế để tránh lệch ngữ cảnh.';
    const answer=clean(data.answer,7000);
    const sources=Array.isArray(data.sources)?data.sources.filter(source=>source?.url).slice(0,3):[];
    const verified=data.verificationStatus==='verified'&&data.grounded===true&&sources.length>0&&String(data.provider||'').startsWith('gemini');
    if(!verified)return /Cần kiểm chứng/i.test(answer)?answer:`${answer} ⚠ Cần kiểm chứng: nguồn công khai chưa đủ rõ.`;
    return`${answer} Nguồn Google: ${sources.map(sourceLabel).join(' · ')}`;
  }catch{return'Gemini + Google Search đang tạm không khả dụng. Tôi chưa suy đoán câu trả lời khác để tránh sai ngữ cảnh.'}
  finally{clearTimeout(timer)}
}

export function installGeminiFastQA(){
  if(typeof window==='undefined'||window.AIOfficeGeminiFastQA?.ready)return true;
  const gate=window.AIOfficeCanonicalInputGate;
  if(!gate?.dispatch)throw new Error('CANONICAL_GATE_NOT_READY_FOR_FAST_QA');
  const original=gate.dispatch.bind(gate);
  gate.dispatch=async(text,source='text')=>{
    const value=clean(text,12000);if(!value)return'';
    if(gate.isQuotedMetaQuestion?.(value))return original(value,source);
    const localTime=directClockAnswer(value);if(localTime)return localTime;
    if(workspaceSummaryIntent(value))return summarizeWorkspace();
    const interaction=classifyInteractionV22(value,{hasActiveTask:hasActiveTask()});
    if(interaction?.mode!=='question')return original(value,source);
    if(isWeatherQuery(value))return original(value,source);
    const policy=classifySourcePolicy(value,{kind:'question',confidence:0.99,action:'answer'});
    if(policy?.directAnswer)return clean(policy.directAnswer,3000);
    if(policy?.internalRequested)return original(value,source);
    if(vagueKnowledgeIntent(value))return'Bạn muốn tra cứu chủ đề nào? Hãy nêu đối tượng hoặc vấn đề cần tìm để tôi không tự đoán ngữ cảnh.';
    return askGeminiFast(value,policy);
  };
  gate.__geminiFastQA=GEMINI_FAST_QA_VERSION;
  addContainmentStyle();
  window.AIOfficeGeminiFastQA=Object.freeze({version:GEMINI_FAST_QA_VERSION,ready:true,provider:'gemini-google-search',scope:'knowledge-qa-only'});
  window.dispatchEvent(new CustomEvent('ai-office-gemini-fast-qa-ready',{detail:window.AIOfficeGeminiFastQA}));
  return true;
}
