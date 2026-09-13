import { classifyAnswerPolicy, ANSWER_MODES, ANSWER_POLICY_VERSION } from './answer-policy-v1.js';

export const CHIEF_ANSWER_ROUTER_VERSION='1.0.0-p3';
const CHAT_KEY='ai-office-conversation-v19';
let installed=false;
let originalHandle=null;

function strip(text=''){return String(text||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function getHistory(){try{const value=JSON.parse(localStorage.getItem(CHAT_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
function setHistory(value){try{localStorage.setItem(CHAT_KEY,JSON.stringify(value.slice(-30)))}catch{}}
function saveTurnUnique(role,text,meta={}){
  const clean=strip(text).slice(0,8000);if(!clean)return;
  const history=getHistory(),last=history.at(-1);
  if(last?.role===role&&strip(last?.text||'')===clean)return;
  history.push({role,text:clean,at:new Date().toISOString(),...meta});setHistory(history);
}
function renderDirectAnswer(answer){
  const clean=strip(answer);
  const bubble=document.getElementById('bubble');if(bubble)bubble.textContent=clean;
  const box=document.getElementById('answer');
  if(box){box.replaceChildren();const wrap=document.createElement('div');wrap.className='ai21Answer';const title=document.createElement('b');title.textContent='Trưởng phòng A.I';const body=document.createElement('div');body.style.marginTop='5px';body.textContent=clean;const meta=document.createElement('div');meta.className='ai22ResultMeta';meta.textContent='Trả lời trực tiếp · không cần truy xuất nguồn';wrap.append(title,body,meta);box.append(wrap)}
  window.dispatchEvent(new CustomEvent('ai-office-direct-answer',{detail:{answer:clean,routerVersion:CHIEF_ANSWER_ROUTER_VERSION}}));
  return clean;
}
function directHistory(){return getHistory().slice(-8).map(item=>`${item.role==='assistant'?'assistant':'user'}: ${strip(item.text||'')}`).join('\n').slice(0,5000)}
async function chiefDirect(text){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch('/api/proxy?op=chief',{
      method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,
      body:JSON.stringify({message:`Bạn là Chief A.I của Personal A.I Office OS. Đây là câu hỏi ổn định hoặc yêu cầu suy luận không cần tra cứu nguồn. Hãy trả lời trực tiếp bằng tiếng Việt, chính xác, ngắn gọn và bám đúng câu hỏi. Không biến câu hỏi thành nhiệm vụ. Không bịa dữ kiện thời gian thực. Nếu câu hỏi thực sự phụ thuộc dữ liệu mới, pháp lý, y khoa, tài chính hoặc nguồn nội bộ thì trả đúng chuỗi NEED_GROUNDED_RESEARCH để router chuyển sang luồng kiểm chứng.\n\nNGỮ CẢNH GẦN:\n${directHistory()}\n\nCÂU HỎI:\n${text}`})
    });
    if(!response.ok)return'';
    const data=await response.json(),reply=strip(data?.reply||'');
    if(!reply||reply==='NEED_GROUNDED_RESEARCH')return'';
    return reply;
  }catch{return''}finally{clearTimeout(timer)}
}

export function policyForMessage(text='',canonicalType='QUESTION'){return classifyAnswerPolicy(text,{canonicalType})}

export function installChiefAnswerRouter(){
  if(typeof window==='undefined'||installed)return Boolean(installed);
  const runtime=window.AIOfficeV22;if(!runtime?.handleMessage)return false;
  if(window.AIOfficeChiefAnswerRouter?.version===CHIEF_ANSWER_ROUTER_VERSION){installed=true;return true}
  originalHandle=runtime.handleMessage.bind(runtime);
  runtime.handleMessage=async(text,options={})=>{
    const value=String(text||'').trim();if(!value)return originalHandle(text,options);
    let canonicalType='QUESTION';
    try{canonicalType=runtime.classifyCanonicalIntent?.(value,{channel:options.source==='voice'?'voice':'text'})?.type||window.AIOfficeOrchestrator?.classifyIntent?.(value,{channel:options.source==='voice'?'voice':'text'})?.type||'QUESTION'}catch{}
    const policy=classifyAnswerPolicy(value,{canonicalType});
    window.dispatchEvent(new CustomEvent('ai-office-answer-policy',{detail:{mode:policy.mode,reason:policy.reason,requiresSources:policy.requiresSources}}));
    if(canonicalType==='QUESTION'&&policy.mode===ANSWER_MODES.DIRECT){
      saveTurnUnique('user',value,{intent:'question',answerMode:'direct'});
      const answer=await chiefDirect(value);
      if(answer){renderDirectAnswer(answer);saveTurnUnique('assistant',answer,{intent:'answer',answerMode:'direct',policyVersion:ANSWER_POLICY_VERSION});return answer}
    }
    return originalHandle(value,options);
  };
  window.AIOfficeChiefAnswerRouter=Object.freeze({version:CHIEF_ANSWER_ROUTER_VERSION,answerPolicyVersion:ANSWER_POLICY_VERSION,policyFor:policyForMessage,getOriginalHandle:()=>originalHandle});
  installed=true;
  window.dispatchEvent(new CustomEvent('ai-office-chief-answer-router-ready',{detail:{version:CHIEF_ANSWER_ROUTER_VERSION}}));
  return true;
}
