import {
  V72_SMART_CORE_VERSION,
  answerLooksLikeFailure,
  cleanTaskRecord,
  metaQuestionAnswer,
  normalizeV72,
  requestsInternalKnowledge,
  requiresLiveEvidence,
  shouldSmartIntercept
} from './v72-smart-core.js';

export const V72_SMART_RUNTIME_VERSION='7.2.0-smart-question-fast-path';
const CHAT_KEY='ai-office-conversation-v19';
const TASK_KEY='ai-office-tasks-v11';
const CREDENTIAL_SEEN_KEY='ai-office-credentials-seen-v230';
let smartBusy=false;
let lastVoice={text:'',at:0};

try{
  if(new URLSearchParams(location.search).get('credentials')!=='1')sessionStorage.setItem(CREDENTIAL_SEEN_KEY,'1');
}catch{}

const esc=(text='')=>String(text).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const strip=(text='')=>String(text||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const getJson=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const setJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};

function saveTurn(role,text,meta={}){
  const history=getJson(CHAT_KEY,[]);history.push({role,text:strip(text).slice(0,8000),at:new Date().toISOString(),...meta});setJson(CHAT_KEY,history.slice(-30));
}

function state(name,text,label=''){
  const bar=document.getElementById('ai22State'),caption=document.getElementById('ai22StateText'),intent=document.getElementById('ai22Intent');
  if(bar)bar.dataset.state=name;if(caption)caption.textContent=text;if(intent&&label)intent.textContent=label;
  const status=document.getElementById('v19Status');if(status)status.textContent=text;
}

function renderAnswer(answer,sources=[],label='Trả lời A.I'){
  const clean=strip(answer);const bubble=document.getElementById('bubble'),box=document.getElementById('answer');
  if(bubble)bubble.textContent=clean;
  if(box){
    const refs=(Array.isArray(sources)?sources:[]).slice(0,6).map((source,index)=>{
      const name=`[${index+1}] ${source?.source||source?.title||'Nguồn'}`;
      const raw=String(source?.url||'');
      if(!raw)return`<span>${esc(name)}</span>`;
      try{const url=new URL(raw);return['http:','https:'].includes(url.protocol)?`<a href="${esc(url.toString())}" target="_blank" rel="noopener noreferrer">${esc(name)}</a>`:`<span>${esc(name)}</span>`}catch{return`<span>${esc(name)}</span>`}
    }).join(' · ');
    box.innerHTML=`<div class="ai21Answer v72Answer"><b>Trưởng phòng A.I</b><div class="v72AnswerBody">${esc(clean).replace(/\n/g,'<br>')}</div><div class="ai22ResultMeta">${esc(label)}${refs?`<br>Nguồn: ${refs}`:''}</div></div>`;
  }
  return clean;
}

function inferResearchMode(text=''){
  const n=normalizeV72(text);
  if(/\b(benh|thuoc|y hoc|y te|suc khoe|trieu chung|dieu tri|chan doan|duoc|sinh ly|giai phau|xet nghiem|vitamin|dinh duong)\b/.test(n))return'medical_question';
  if(/\b(tra cuu|nghien cuu|tim nguon|kiem chung|moi nhat|hien nay|hom nay|latest|current|recent|news)\b/.test(n))return'research_question';
  return'general_question';
}

async function fetchResearch(text){
  try{
    const response=await fetch('/api/research',{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',body:JSON.stringify({query:text,mode:inferResearchMode(text),useInternal:false}),signal:AbortSignal.timeout(18000)});
    if(!response.ok)return null;
    const data=await response.json();
    return{answer:strip(data?.answer||''),sources:Array.isArray(data?.sources)?data.sources:[],provider:data?.provider||'research',grounded:Boolean(data?.grounded),limitations:Array.isArray(data?.limitations)?data.limitations:[]};
  }catch{return null}
}

async function chiefKnowledgeAnswer(text,sources=[]){
  const sourcePack=(Array.isArray(sources)?sources:[]).slice(0,6).map((s,i)=>`[${i+1}] ${s?.title||s?.source||'Nguồn'}\n${s?.url||''}\n${strip(s?.text||s?.snippet||'').slice(0,2600)}`).join('\n\n').slice(0,14000);
  const history=getJson(CHAT_KEY,[]).slice(-8).map(row=>`${row.role}: ${row.text}`).join('\n').slice(0,4500);
  const prompt=`Bạn là Trưởng phòng A.I của ứng dụng A.I Văn phòng Trợ lý. Trả lời câu hỏi của người dùng bằng tiếng Việt, trực tiếp và hữu ích.\n- Với kiến thức ổn định/phổ thông, được phép dùng kiến thức mô hình để trả lời thay vì từ chối chỉ vì SOURCE PACK trống.\n- Không được bịa dữ liệu thời gian thực, tin mới, giá, lịch, chức danh hiện tại hoặc sự kiện đang diễn ra. Những nội dung đó phải dựa vào nguồn cập nhật.\n- Với y khoa: chỉ cung cấp thông tin giáo dục chung; không chẩn đoán hay kê đơn cá nhân hóa khi thiếu dữ kiện lâm sàng.\n- Không biến câu hỏi thành nhiệm vụ và không tạo file nếu người dùng không yêu cầu.\n- Nếu SOURCE PACK có nguồn phù hợp, ưu tiên dùng và có thể gắn [n].\n\nLỊCH SỬ NGẮN:\n${history}\n\nCÂU HỎI:\n${text}\n\nSOURCE PACK:\n${sourcePack}`;
  try{
    const response=await fetch('/api/proxy?op=chief',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:prompt,thinkingLevel:'medium'}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)return'';
    const data=await response.json();return strip(data?.reply||'');
  }catch{return''}
}

function isMetaClassification(text=''){
  const n=normalizeV72(text);return /\b(phan loai cau|cau hoi hay nhiem vu|day la cau hoi hay nhiem vu|giai thich vi sao cau|nhan xet cau|menh lenh tren|doan lenh)\b/.test(n);
}

async function smartQuestion(text,{spoken=false}={}){
  if(smartBusy)return null;smartBusy=true;
  state('working','Đang trả lời…','Câu hỏi');
  try{
    const classifier=window.AIOfficeV22?.classifyInteraction;
    if(isMetaClassification(text)&&typeof classifier==='function'){
      const direct=metaQuestionAnswer(text,classifier);
      if(direct){renderAnswer(direct,[],'Phân loại trực tiếp');saveTurn('user',text,{intent:'question',v72:true});saveTurn('assistant',direct,{intent:'answer',v72:true,sourceCount:0});state('done','Hoàn tất','Câu hỏi');if(spoken)window.AIOfficeV19?.voice?.speak?.(direct,{bargeIn:true,resumeListening:true,rate:1.02});return direct}
    }

    const research=await fetchResearch(text);
    let answer=research?.answer||'';let label=research?.grounded?'Gemini Search · có nguồn':'Gemini · trả lời trực tiếp';
    if(!answer||answerLooksLikeFailure(answer)){
      if(requiresLiveEvidence(text)){
        answer=answer||'Tôi chưa lấy được nguồn cập nhật đủ tin cậy cho câu hỏi thời gian thực này. Tôi sẽ không đoán dữ liệu hiện tại.';
        label='Cần nguồn cập nhật';
      }else{
        const modelAnswer=await chiefKnowledgeAnswer(text,research?.sources||[]);
        if(modelAnswer){answer=modelAnswer;label=(research?.sources?.length?'Gemini · đối chiếu nguồn':'Gemini · kiến thức chung')}
      }
    }
    if(!answer)answer='Tôi chưa hoàn tất được câu trả lời này. Hệ thống không ghi nhận đây là một nhiệm vụ và không tạo hành động ngoài.';
    renderAnswer(answer,research?.sources||[],label);
    saveTurn('user',text,{intent:'question',v72:true,provider:research?.provider||null});saveTurn('assistant',answer,{intent:'answer',v72:true,sourceCount:research?.sources?.length||0});
    state('done','Hoàn tất','Câu hỏi');
    if(spoken)window.AIOfficeV19?.voice?.speak?.(answer,{bargeIn:true,resumeListening:true,rate:1.02});
    return answer;
  }catch(error){
    console.error('v72_smart_question_error',{message:String(error?.message||error).slice(0,180)});
    const fallback='Tôi chưa hoàn tất được câu trả lời này do lỗi kết nối A.I. Không có nhiệm vụ hay hành động bên ngoài nào được tạo.';renderAnswer(fallback,[],'Lỗi kết nối an toàn');state('blocked','Chưa hoàn tất','Câu hỏi');return fallback;
  }finally{smartBusy=false}
}

function currentIntent(text){
  try{return window.AIOfficeV22?.classifyInteraction?.(text,{hasActiveTask:false})||null}catch{return null}
}
function internalOptIn(){try{return Boolean(window.AIOfficeSourcePreferences?.useInternal)}catch{return false}}
function canTakeQuestion(text,intent){return Boolean(intent&&shouldSmartIntercept(text,intent,{internalOptIn:internalOptIn()}))}

function sanitizeTaskTitles(){
  const rows=getJson(TASK_KEY,[]);if(!Array.isArray(rows)||!rows.length)return false;let changed=false;
  const next=rows.map(row=>{const result=cleanTaskRecord(row);if(result.changed)changed=true;return result.task});
  if(changed){setJson(TASK_KEY,next);window.render?.();window.AIOfficeV2Tasks?.sync?.().catch?.(()=>{})}
  return changed;
}
function scheduleTaskCleanup(){for(const delay of[350,1000,2200,4200])setTimeout(sanitizeTaskTitles,delay)}

function installQuestionInterceptors(){
  window.addEventListener('click',event=>{
    const target=event.target?.closest?.('#send');if(!target)return;
    const input=document.getElementById('msg'),text=String(input?.value||'').trim();if(!text)return;
    const intent=currentIntent(text);
    if(intent?.mode==='task'||intent?.mode==='hybrid'){scheduleTaskCleanup();return}
    if(!canTakeQuestion(text,intent))return;
    event.preventDefault();event.stopImmediatePropagation();if(input)input.value='';void smartQuestion(text,{spoken:false});
  },true);
  window.addEventListener('keydown',event=>{
    if(event.target?.id!=='msg'||event.key!=='Enter'||!(event.ctrlKey||event.metaKey))return;
    const input=document.getElementById('msg'),text=String(input?.value||'').trim();if(!text)return;const intent=currentIntent(text);
    if(intent?.mode==='task'||intent?.mode==='hybrid'){scheduleTaskCleanup();return}
    if(!canTakeQuestion(text,intent))return;
    event.preventDefault();event.stopImmediatePropagation();if(input)input.value='';void smartQuestion(text,{spoken:false});
  },true);
}

function patchVoiceDispatch(){
  const voice=window.AIOfficeV19?.voice;if(!voice?.dispatchEvent||!window.AIOfficeV22?.classifyInteraction)return false;
  if(voice.dispatchEvent.__v72Smart)return true;
  const previous=voice.dispatchEvent.bind(voice);
  const wrapped=function(event){
    if(event?.type==='transcript'){
      const text=String(event?.detail?.text||'').trim(),now=Date.now();if(text){
        const normalized=normalizeV72(text);if(lastVoice.text===normalized&&now-lastVoice.at<1800)return true;lastVoice={text:normalized,at:now};
        const intent=currentIntent(text);if(canTakeQuestion(text,intent)){const input=document.getElementById('msg');if(input)input.value=text;void smartQuestion(text,{spoken:true});return true}
      }
    }
    return previous(event);
  };
  wrapped.__v72Smart=true;voice.dispatchEvent=wrapped;return true;
}

function installStyle(){
  if(document.getElementById('v72-style'))return;const style=document.createElement('style');style.id='v72-style';style.textContent=`
body.aiOfficeV72 #cred22Launcher{display:none!important}body.aiOfficeV72 .v72OriginalAdvanced{display:none!important}
#v72Advanced{margin:8px 0 0;border:1px solid #e1e7f2;border-radius:12px;background:#fbfcff;overflow:hidden}#v72Advanced summary{cursor:pointer;list-style:none;padding:8px 10px;font:800 9px/1.2 system-ui;color:#67738e}#v72Advanced summary::-webkit-details-marker{display:none}#v72Advanced summary:before{content:'＋ ';color:#4e6fe8}#v72Advanced[open] summary:before{content:'− '}#v72Advanced .v72AdvancedBody{display:flex;flex-wrap:wrap;gap:6px;padding:0 9px 9px}#v72Advanced button{border:1px solid #dfe5f0;background:#fff;color:#53617e;border-radius:9px;padding:7px 9px;font:800 8px/1 system-ui;cursor:pointer}
.v72AnswerBody{margin-top:6px;line-height:1.58}body.aiOfficeV72 .sub{max-width:780px}body.aiOfficeV72 #uiV2SystemBar span{font-size:8.5px}
@media(max-width:700px){body.aiOfficeV72 .pills .pill:nth-child(n+4){display:none}#v72Advanced{margin-top:6px}}
`;document.head.appendChild(style);
}

function installAdvancedControls(){
  document.querySelectorAll('[data-ai21]:not([data-v72-control])').forEach(node=>node.classList.add('v72OriginalAdvanced'));
  if(document.getElementById('v72Advanced'))return;
  const anchor=document.getElementById('ai22State')||document.querySelector('.composer');if(!anchor)return;
  const details=document.createElement('details');details.id='v72Advanced';details.innerHTML='<summary>Tùy chọn nâng cao</summary><div class="v72AdvancedBody"></div>';const body=details.querySelector('.v72AdvancedBody');
  for(const [action,label] of [['command','Hủy lệnh'],['task','Dừng việc'],['approval','Hủy duyệt'],['input','Bỏ dữ liệu đầu vào']]){const button=document.createElement('button');button.type='button';button.dataset.ai21=action;button.dataset.v72Control='1';button.textContent=label;body.appendChild(button)}
  const runtime=document.createElement('button');runtime.type='button';runtime.textContent='Cấu hình hệ thống';runtime.onclick=()=>{if(window.AIOfficeCredentialsV22?.open)window.AIOfficeCredentialsV22.open();else setTimeout(()=>window.AIOfficeCredentialsV22?.open?.(),500)};body.appendChild(runtime);
  anchor.insertAdjacentElement('afterend',details);
}

async function refreshFriendlyStatus(){
  const subtitle=document.querySelector('.sub');if(subtitle)subtitle.textContent='Hỏi để nhận câu trả lời · Giao việc để A.I tự thực hiện · Theo dõi kết quả ở Job Card';
  const bar=document.getElementById('uiV2SystemBar');if(!bar)return;
  let health=null;try{const response=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(response.ok)health=await response.json()}catch{}
  const gemini=Boolean(health?.providers?.gemini?.configured);const voice=Boolean(health?.providers?.xiaozhi?.configured||health?.voice?.browserFallback);const drive=Boolean(health?.providers?.googleDriveRuntime?.configured);
  const labels=[gemini?'● A.I sẵn sàng':'● A.I dự phòng',voice?'● Giọng nói sẵn sàng':'● Giọng nói tùy chọn',drive?'● Tài liệu nội bộ đã kết nối':'● Tài liệu nội bộ tùy chọn'];bar.replaceChildren(...labels.map(text=>{const span=document.createElement('span');span.textContent=text;return span}));
}

function simplifyIntentLabel(){
  const node=document.getElementById('ai22Intent');if(!node||node.dataset.v72Observed)return;node.dataset.v72Observed='1';
  const update=()=>{const text=node.textContent||'';let friendly='';if(/QUESTION/.test(text))friendly='Câu hỏi';else if(/DATA_TASK/.test(text))friendly='Xử lý dữ liệu';else if(/DOCUMENT_TASK/.test(text))friendly='Soạn tài liệu';else if(/TASK/.test(text))friendly='Đang thực hiện';else if(/VOICE/.test(text))friendly='Giọng nói';if(friendly&&node.textContent!==friendly)node.textContent=friendly};
  new MutationObserver(update).observe(node,{childList:true,characterData:true,subtree:true});update();
}

function refreshUx(){document.body?.classList.add('aiOfficeV72');installStyle();installAdvancedControls();simplifyIntentLabel();void refreshFriendlyStatus();sanitizeTaskTitles()}

installQuestionInterceptors();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshUx,0),{once:true});else setTimeout(refreshUx,0);
window.addEventListener('ai-office-v2-task-bridge-ready',()=>{sanitizeTaskTitles();installAdvancedControls()});
let voiceAttempts=0;const voiceTimer=setInterval(()=>{voiceAttempts++;patchVoiceDispatch();if(voiceAttempts>24)clearInterval(voiceTimer)},500);
setTimeout(refreshUx,1400);setTimeout(refreshUx,3200);

window.AIOfficeV72=Object.freeze({version:V72_SMART_RUNTIME_VERSION,coreVersion:V72_SMART_CORE_VERSION,smartQuestion,sanitizeTaskTitles,refreshUx});
