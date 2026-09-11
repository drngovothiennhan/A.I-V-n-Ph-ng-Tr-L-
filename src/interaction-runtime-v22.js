import { filterRelevantSources, casualAnswer, cancellationIntent, isWeatherQuery } from './interaction-policy-v21.js';
import { classifyInteractionV22, normalizeV22, routingPrefixV22 } from './interaction-policy-v22.js';
import { classifyCanonicalIntent, createOrchestrationEnvelope } from './ai-orchestrator-core-v32.js';

const VERSION='2.2.1-canonical-orchestrator';
const CHAT_KEY='ai-office-conversation-v19';
const TASK_KEY='ai-office-tasks-v11';
const VOICE_KEY='ai-office-voice-continuous-v19';
const ORCH_KEY='ai-office-orchestrator-context-v32';
const ACTIVE=new Set(['received','analyzing','planning','executing','verifying','delegated','processing','awaiting_input','awaiting_approval']);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const getJson=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const setJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const strip=(text='')=>String(text||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const esc=(text='')=>String(text).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

let core=null;
let router=null;
let voice=null;
let processing=false;
let attached=false;
let requestId=0;
let lastTranscript={text:'',at:0};
let lastAssistant='';
let lastEnvelope=null;
let continuousVoice=localStorage.getItem(VOICE_KEY)==='1';

async function waitRuntime(){
  for(let i=0;i<120;i++){
    if(window.AIOfficeV19?.voice&&window.AIOfficeV20?.gatherSources)return {core:window.AIOfficeV19,router:window.AIOfficeV20};
    await sleep(25);
  }
  throw new Error('AI_OFFICE_V20_NOT_READY');
}

function saveTurn(role,text,meta={}){
  const h=getJson(CHAT_KEY,[]);h.push({role,text:strip(text).slice(0,8000),at:new Date().toISOString(),...meta});setJson(CHAT_KEY,h.slice(-30));
}
function rememberEnvelope(envelope){
  if(!envelope?.id||!envelope?.intent)return;
  lastEnvelope=envelope;
  const recent=getJson(ORCH_KEY,[]);
  recent.push({
    id:envelope.id,
    createdAt:envelope.createdAt,
    type:envelope.intent.type,
    confidence:envelope.intent.confidence,
    risk:envelope.intent.risk,
    sourceMode:envelope.route?.sourceMode||null,
    provider:envelope.route?.provider||null,
    artifactFormats:envelope.route?.artifactFormats||[],
    approvalRequired:Boolean(envelope.route?.approvalRequired),
    channel:envelope.intent.channel||'text'
  });
  setJson(ORCH_KEY,recent.slice(-40));
  window.dispatchEvent(new CustomEvent('ai-office-orchestration-context',{detail:recent.at(-1)}));
}
function envelopeFor(text,interaction,options={}){
  const internalOptIn=Boolean(window.AIOfficeSourcePreferences?.useInternal);
  return createOrchestrationEnvelope(text,{
    interaction,
    hasActiveTask:hasActiveTask(),
    internalOptIn,
    channel:options.source==='voice'?'voice':'text',
    currentTaskId:getJson(TASK_KEY,[]).find(t=>ACTIVE.has(t.status))?.id||null
  });
}
function taskCanonicalMeta(envelope){
  if(!envelope?.intent)return null;
  return {
    contractVersion:envelope.intent.contractVersion,
    type:envelope.intent.type,
    confidence:envelope.intent.confidence,
    risk:envelope.intent.risk,
    needsApproval:envelope.intent.needsApproval,
    sourceMode:envelope.route?.sourceMode||null,
    provider:envelope.route?.provider||null,
    artifactFormats:envelope.route?.artifactFormats||[]
  };
}

function hasActiveTask(){return getJson(TASK_KEY,[]).some(t=>ACTIVE.has(t.status))}

function injectUi(){
  if(document.getElementById('ai22-style'))return;
  const style=document.createElement('style');style.id='ai22-style';style.textContent=`
#ai22State{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:8px;padding:7px 9px;border:1px solid #dce5f7;border-radius:11px;background:#fff;font:750 8.5px/1.2 system-ui;color:#52617f}
#ai22State .dot{width:7px;height:7px;border-radius:50%;background:#8b96ad;box-shadow:0 0 0 3px #8b96ad18}#ai22State[data-state="listening"] .dot{background:#315fe8;box-shadow:0 0 0 4px #315fe81d}#ai22State[data-state="understanding"] .dot,#ai22State[data-state="working"] .dot{background:#ff8a3d}#ai22State[data-state="speaking"] .dot{background:#7357f5}#ai22State[data-state="done"] .dot{background:#16a06a}#ai22State[data-state="blocked"] .dot{background:#ec5264}
#ai22Intent{margin-left:auto;color:#7b86a0;font-weight:800}.ai22ResultMeta{margin-top:7px;font-size:8px;color:#66708b}
@media(max-width:700px){#ai22State{font-size:8px}#ai22Intent{width:100%;margin-left:14px}}
`;
  document.head.appendChild(style);
  const composer=document.querySelector('.composer');if(!composer)return;
  const bar=document.createElement('div');bar.id='ai22State';bar.dataset.state='done';bar.innerHTML='<span class="dot"></span><span id="ai22StateText">Sẵn sàng</span><span id="ai22Intent">Auto · safe-by-default</span>';
  composer.insertAdjacentElement('afterend',bar);
  document.title='A.I Văn phòng · Voice Action Orchestrator v2.2';
  const subtitle=document.querySelector('.sub');if(subtitle)subtitle.textContent='Voice State Machine · Canonical Intent · Source Router · Cancellable Workflow · QA Gate';
}

function state(name,text,intent=''){
  const bar=document.getElementById('ai22State'),label=document.getElementById('ai22StateText'),tag=document.getElementById('ai22Intent');
  if(bar)bar.dataset.state=name;if(label)label.textContent=text;if(tag&&intent)tag.textContent=intent;
  const status=document.getElementById('v19Status');if(status)status.textContent=`v2.2 · ${text}`;
}

function renderAnswer(answer,sources=[],label='Trả lời có kiểm chứng'){
  const clean=strip(answer);lastAssistant=clean;
  const bubble=document.getElementById('bubble'),box=document.getElementById('answer');if(bubble)bubble.textContent=clean;if(!box)return clean;
  const refs=sources.slice(0,6).map((s,i)=>{const name=`[${i+1}] ${s.source||s.title||'Nguồn'}`;if(!s.url)return`<span>${esc(name)}</span>`;try{const u=new URL(s.url);return['http:','https:'].includes(u.protocol)?`<a href="${esc(u.toString())}" target="_blank" rel="noopener noreferrer">${esc(name)}</a>`:`<span>${esc(name)}</span>`}catch{return`<span>${esc(name)}</span>`}}).join(' · ');
  box.innerHTML=`<div class="ai21Answer"><b>Trưởng phòng A.I</b><div style="margin-top:5px">${esc(clean)}</div><div class="ai22ResultMeta">${esc(label)}${refs?`<br>Nguồn: ${refs}`:''}</div></div>`;
  return clean;
}

function strictFallback(query,sources){
  if(!sources.length)return'Tôi chưa tìm được nguồn đủ phù hợp để trả lời chắc chắn. Tôi không dùng tài liệu local ngẫu nhiên hoặc nội dung chỉ trùng từ khóa để thay thế.';
  const tokens=normalizeV22(query).split(/[^a-z0-9]+/).filter(x=>x.length>2),picked=[];
  for(const source of sources.slice(0,4)){
    const chunks=strip(source.text||source.snippet||'').split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(x=>x.length>=25&&x.length<=650);
    const ranked=chunks.map(sentence=>({sentence,score:tokens.reduce((n,t)=>n+(normalizeV22(sentence).includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    for(const item of ranked.slice(0,2)){picked.push(item.sentence);if(picked.length>=3)break}if(picked.length>=3)break;
  }
  return picked.length?picked.join(' '):'Tôi đã truy xuất nguồn nhưng chưa có bằng chứng đủ sát câu hỏi để kết luận chắc chắn.';
}

async function synthesizeQuestion(text,sources){
  if(!router?.providerState?.gemini?.configured)return strictFallback(text,sources);
  const history=getJson(CHAT_KEY,[]).slice(-8).map(x=>`${x.role}: ${x.text}`).join('\n').slice(0,5000);
  const pack=sources.slice(0,8).map((s,i)=>`[${i+1}] ${s.source||s.title}\n${s.url||''}\n${strip(s.text||s.snippet||'').slice(0,4200)}`).join('\n\n').slice(0,22000);
  try{
    const r=await fetch('/api/proxy?op=chief',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:`Bạn là Trưởng phòng A.I. Trả lời đúng câu hỏi bằng tiếng Việt, ưu tiên ngữ cảnh hiện tại. Không biến câu hỏi thành nhiệm vụ. Không trộn nguồn chỉ vì trùng từ khóa. Nếu bằng chứng không đủ, nói rõ. Gắn [n] theo nguồn.\n\nLỊCH SỬ:\n${history}\n\nCÂU HỎI:\n${text}\n\nNGUỒN ĐÃ QUA RELEVANCE GATE:\n${pack}`})});
    if(r.ok){const data=await r.json(),reply=strip(data?.reply||'');if(reply)return reply}
  }catch{}
  return strictFallback(text,sources);
}

async function answerQuestion(text,envelope=null){
  state('working','Đang chọn nguồn phù hợp…',`${envelope?.intent?.type||'QUESTION'} · source-grounded`);
  const base={kind:'question',confidence:0.99,action:'answer'};
  const policy=router.classifySourcePolicy(text,base);
  const turnMeta={intent:'question',canonicalIntent:envelope?.intent?.type||'QUESTION',orchestrationId:envelope?.id||null};
  if(policy?.directAnswer){renderAnswer(policy.directAnswer,[],'Runtime trực tiếp');saveTurn('user',text,turnMeta);saveTurn('assistant',policy.directAnswer,{intent:'answer',orchestrationId:envelope?.id||null});return policy.directAnswer}
  const gathered=await router.gatherSources(text,policy),relevant=filterRelevantSources(text,gathered?.sources||[],policy);
  let answer='';
  if(gathered?.endpointAnswer&&relevant.length)answer=strip(gathered.endpointAnswer);
  if(!answer)answer=await synthesizeQuestion(text,relevant);
  renderAnswer(answer,relevant,`Relevance Gate · ${policy?.mode||'question'}`);saveTurn('user',text,{...turnMeta,policy:policy?.mode});saveTurn('assistant',answer,{intent:'answer',orchestrationId:envelope?.id||null,sourceCount:relevant.length});return answer;
}

function markLateCancelled(task){
  if(!task||typeof task!=='object')return;
  task.status='cancelled';task.progress=Number(task.progress||0);task.cancelledAt=new Date().toISOString();task.cancelReason='late_result_after_user_cancel';task.outputDraft=`${String(task.outputDraft||'')}\n\nTRẠNG THÁI: Đã hủy theo yêu cầu người dùng. Kết quả đến sau thời điểm hủy không được coi là sản phẩm hợp lệ.`;
  const tasks=getJson(TASK_KEY,[]),i=tasks.findIndex(x=>x.id===task.id);if(i>=0)tasks[i]=task;else tasks.unshift(task);setJson(TASK_KEY,tasks);window.render?.();
}

function cleanRoutedTask(task,prefix,original){
  if(!task||typeof task!=='object')return task;
  task.originalMessage=original;
  task.rootInstruction=task.rootInstruction===`${prefix}${original}`?original:task.rootInstruction;
  if(task.title?.startsWith(prefix.trim()))task.title=task.title.slice(prefix.trim().length).replace(/^\s*[.:;-]?\s*/,'')||original.slice(0,96);
  if(typeof task.outputDraft==='string')task.outputDraft=task.outputDraft.split(`${prefix}${original}`).join(original).split(prefix.trim()).join('');
  task.v22=true;task.intentV22=task.intentV22||{};
  const tasks=getJson(TASK_KEY,[]),i=tasks.findIndex(x=>x.id===task.id);if(i>=0){tasks[i]=task;setJson(TASK_KEY,tasks);window.render?.()}
  return task;
}

async function executeTask(text,intent,envelope=null){
  state('working','Đang thực hiện workflow và QA…',`${envelope?.intent?.type||'TASK'} · ${intent.taskKind} · risk ${intent.risk}`);
  const prefix=routingPrefixV22(intent.taskKind),routed=`${prefix}${text}`;
  const task=await router.handleMessage(routed,{spoken:false});
  cleanRoutedTask(task,prefix,text);
  if(task){
    task.intentV22={mode:intent.mode,taskKind:intent.taskKind,risk:intent.risk,confidence:intent.confidence,needsApproval:intent.needsApproval};
    task.orchestrationId=envelope?.id||task.orchestrationId||null;
    task.intentV32=taskCanonicalMeta(envelope)||task.intentV32||null;
    cleanRoutedTask(task,prefix,text);
  }
  return task;
}

function conciseSpeech(result,intent){
  if(typeof result==='string'){
    const clean=strip(result).replace(/\[[0-9]+\]/g,'').replace(/https?:\/\/\S+/g,'');
    return clean.length>720?`${clean.slice(0,680).replace(/\s+\S*$/,'')}. Tôi đã hiển thị phần chi tiết và nguồn trên màn hình.`:clean;
  }
  if(result&&typeof result==='object'){
    if(result.status==='awaiting_input')return'Tôi đã hiểu nhiệm vụ nhưng đang thiếu dữ liệu đầu vào cần thiết. Chi tiết phần còn thiếu đã hiển thị trên màn hình.';
    if(result.status==='awaiting_approval'||intent?.needsApproval)return`Tôi đã thực hiện phần an toàn của nhiệm vụ và kiểm định kết quả${result.qa?.score!=null?`, QA ${result.qa.score} trên 100`:''}. Kết quả đang chờ bạn duyệt trước bước tiếp theo.`;
    if(result.status==='cancelled')return'Nhiệm vụ đã được hủy và kết quả đến muộn sẽ không được ghi nhận.';
    return'Tôi đã xử lý nhiệm vụ và cập nhật kết quả trên màn hình.';
  }
  return'Tôi đã xử lý yêu cầu.';
}

function speakResult(text){
  if(!continuousVoice||!voice)return false;
  state('speaking','Đang phản hồi bằng giọng nói…','Voice · có thể ngắt lời');
  return voice.speak(strip(text).slice(0,1400),{bargeIn:true,resumeListening:true,rate:1.02});
}

async function handleControl(intent){
  if(intent.control==='stop_speaking'){voice?.interrupt?.({keepListening:continuousVoice});state(continuousVoice?'listening':'done',continuousVoice?'Đã dừng nói · đang nghe':'Đã dừng nói','Điều khiển giọng nói');return'Đã dừng phản hồi bằng giọng nói.'}
  if(intent.control==='repeat'){
    const text=lastAssistant||[...getJson(CHAT_KEY,[])].reverse().find(x=>x.role==='assistant')?.text||'Chưa có phản hồi gần nhất để đọc lại.';speakResult(text);return text;
  }
  if(intent.control==='resume_listening'){continuousVoice=true;localStorage.setItem(VOICE_KEY,'1');voice?.startBrowserListening?.();state('listening','Đang nghe…','Voice liên tục');return'Đã tiếp tục nghe.'}
  if(intent.control==='status'){
    const tasks=getJson(TASK_KEY,[]),active=tasks.find(t=>ACTIVE.has(t.status));const text=active?`Công việc gần nhất đang ở trạng thái ${active.status}, tiến độ ${Number(active.progress||0)}%.`:'Hiện không có công việc đang chạy.';renderAnswer(text,[],'Trạng thái workflow');return text;
  }
  if(intent.control==='cancel_all'){
    voice?.interrupt?.({keepListening:false});window.AIOfficeV21?.cancelCurrentCommand?.();window.AIOfficeV21?.cancelRunningTask?.();state('done','Đã yêu cầu dừng toàn bộ','Control');return'Đã yêu cầu dừng phản hồi và công việc đang chạy.';
  }
  return'';
}

async function handleMessageV22(text,options={}){
  const value=String(text||'').trim();if(!value)return;
  const myId=++requestId,ctx={hasActiveTask:hasActiveTask()},intent=classifyInteractionV22(value,ctx);
  const canonical=classifyCanonicalIntent(value,{interaction:intent,hasActiveTask:ctx.hasActiveTask,channel:options.source==='voice'?'voice':'text',internalOptIn:Boolean(window.AIOfficeSourcePreferences?.useInternal)});
  const envelope=envelopeFor(value,intent,options);rememberEnvelope(envelope);
  state('understanding','Đang hiểu yêu cầu…',`${canonical.type} · ${Math.round((canonical.confidence||0)*100)}%`);

  const cancel=cancellationIntent(value);
  if(cancel&&window.AIOfficeV21){
    if(cancel==='command')window.AIOfficeV21.cancelCurrentCommand();else if(cancel==='task')window.AIOfficeV21.cancelRunningTask();else if(cancel==='approval')window.AIOfficeV21.cancelLatestApproval();else if(cancel==='undo_approval')window.AIOfficeV21.undoLatestApproval();else if(cancel==='input')window.AIOfficeV21.cancelInput();state('done','Đã thực hiện lệnh hủy',canonical.type);return;
  }
  if(intent.mode==='control')return handleControl(intent);
  if(processing){
    const msg='Tôi đang xử lý yêu cầu trước. Bạn có thể nói “hủy công việc” hoặc “hủy lệnh” để dừng trước khi giao yêu cầu mới.';
    if(options.spoken)speakResult(msg);
    return msg;
  }
  const casual=casualAnswer(value);if(intent.mode==='casual'&&casual){renderAnswer(casual,[],'Hội thoại trực tiếp');if(options.spoken)speakResult(casual);return casual}

  processing=true;
  try{
    let result;
    if(intent.mode==='question'&&isWeatherQuery(value)&&window.AIOfficeV21?.handleMessage){
      result=await window.AIOfficeV21.handleMessage(value,{spoken:false,__v22Internal:true});
      if(myId!==requestId)return;
      if(options.spoken)speakResult(conciseSpeech(result,intent));
    }else if(intent.mode==='hybrid'){
      const answer=await answerQuestion(intent.questionText,envelope);if(myId!==requestId)return;
      const task=await executeTask(intent.taskText,intent,envelope);result={answer,task,status:task?.status||'done',orchestrationId:envelope.id};
      const spoken=`${conciseSpeech(answer,{mode:'question'})} ${conciseSpeech(task,intent)}`;if(options.spoken)speakResult(spoken);
    }else if(intent.mode==='task'){
      result=await executeTask(value,intent,envelope);if(myId!==requestId){markLateCancelled(result);return}if(options.spoken)speakResult(conciseSpeech(result,intent));
    }else{
      result=await answerQuestion(value,envelope);if(myId!==requestId)return;if(options.spoken)speakResult(conciseSpeech(result,intent));
    }
    if(!options.spoken||!continuousVoice)state(result?.status==='awaiting_input'?'blocked':'done',result?.status==='awaiting_approval'?'Đã xử lý · chờ duyệt':result?.status==='awaiting_input'?'Đang chờ dữ liệu đầu vào':'Hoàn tất',`${canonical.type} · ${Math.round(canonical.confidence*100)}%`);
    return result;
  }catch(error){console.error('interaction_v22_error',{message:String(error?.message||error).slice(0,220),orchestrationId:envelope?.id||null});const msg='Tôi chưa hoàn tất được yêu cầu này do lỗi runtime. Không có hành động bên ngoài nào được coi là đã hoàn tất.';renderAnswer(msg,[],'Runtime error');state('blocked','Có lỗi · chưa hoàn tất','Safe failure');if(options.spoken)speakResult(msg);return null}
  finally{processing=false}
}

async function ensureMicPermission(){
  if(sessionStorage.getItem('ai-office-mic-v22')==='granted')return true;
  let ok=true;
  if(window.AIOfficeV21?.permissionPopup)ok=await window.AIOfficeV21.permissionPopup({title:'Cho phép microphone?',body:'A.I dùng microphone để nghe câu hỏi, lệnh và cho phép bạn ngắt lời khi A.I đang nói.',scope:'Âm thanh chỉ dùng cho phiên tương tác giọng nói; quyền hệ thống vẫn do trình duyệt/thiết bị kiểm soát.',allowLabel:'Cho phép microphone'});
  if(!ok)return false;
  try{if(navigator.mediaDevices?.getUserMedia){const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop())}sessionStorage.setItem('ai-office-mic-v22','granted');return true}catch{return false}
}

async function toggleVoice(){
  if(continuousVoice){continuousVoice=false;localStorage.setItem(VOICE_KEY,'0');voice?.interrupt?.({keepListening:false});voice?.stopBrowserListening?.();state('done','Hội thoại giọng nói đã tắt','Voice OFF');return}
  if(!(await ensureMicPermission())){renderAnswer('Chưa có quyền microphone. Bạn vẫn có thể nhập văn bản bình thường.',[],'Quyền thiết bị');state('blocked','Chưa có quyền microphone','Voice');return}
  continuousVoice=true;localStorage.setItem(VOICE_KEY,'1');if(router?.providerState?.xiaozhi?.configured)voice?.connect?.();const started=voice?.startBrowserListening?.();state(started?'listening':'blocked',started?'Đang nghe…':'Thiết bị chưa hỗ trợ nhận dạng giọng nói',started?'Voice liên tục · có barge-in':'Voice unavailable');
}

function installEarlyInterceptors(){
  window.addEventListener('click',async event=>{
    const target=event.target?.closest?.('#send,#mic,#v19Voice,[data-ai21]');if(!target)return;
    const action=target.dataset?.ai21||'';
    if(action&&!['command','task','approval','input'].includes(action))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(action){
      requestId++;
      if(action==='command')window.AIOfficeV21?.cancelCurrentCommand?.();
      else if(action==='task')window.AIOfficeV21?.cancelRunningTask?.();
      else if(action==='approval')window.AIOfficeV21?.cancelLatestApproval?.();
      else if(action==='input')window.AIOfficeV21?.cancelInput?.();
      state('done','Đã thực hiện lệnh hủy','Control');return;
    }
    if(target.id==='send'){const input=document.getElementById('msg'),text=input?.value||'';if(input)input.value='';await handleMessageV22(text,{spoken:false,source:'text'});return}
    await toggleVoice();
  },true);
  window.addEventListener('keydown',async event=>{
    if(event.target?.id!=='msg'||event.key!=='Enter'||!(event.ctrlKey||event.metaKey))return;event.preventDefault();event.stopImmediatePropagation();const input=document.getElementById('msg'),text=input?.value||'';if(input)input.value='';await handleMessageV22(text,{spoken:false,source:'text'});
  },true);
}

function attachAfterV21(){
  if(attached||!voice)return;attached=true;
  const previous=voice.dispatchEvent?.bind(voice);
  if(previous){voice.dispatchEvent=event=>{
    if(event?.type==='transcript'){
      const text=String(event?.detail?.text||'').trim();if(!text)return true;
      const n=normalizeV22(text),now=Date.now();if(lastTranscript.text===n&&now-lastTranscript.at<1800)return true;lastTranscript={text:n,at:now};
      const input=document.getElementById('msg');if(input)input.value=text;
      state('understanding','Đã nghe · đang hiểu…','Voice transcript');
      handleMessageV22(text,{spoken:true,source:'voice'}).finally(()=>{if(continuousVoice&&!voice.speaking&&!voice.recognitionActive)voice.startBrowserListening?.()});return true;
    }
    return previous(event);
  }}
  voice.addEventListener('partial',event=>{const text=String(event.detail?.text||'');const input=document.getElementById('msg');if(input&&text)input.value=text;if(!voice.speaking)state('listening','Đang nghe…','Voice · transcript tạm')});
  voice.addEventListener('speech-start',()=>state('speaking','Đang nói · bạn có thể ngắt lời','Voice · barge-in ON'));
  voice.addEventListener('speech-end',()=>{if(continuousVoice)state('listening','Đang nghe tiếp…','Voice liên tục');else state('done','Hoàn tất','Voice')});
  voice.addEventListener('interrupt',()=>{if(continuousVoice)state('listening','Đã ngắt lời · đang nghe bạn','Voice · redirected')});
  if(continuousVoice)state('done','Voice sẵn sàng · chạm micro để tiếp tục','Voice remembered');
}

injectUi();
({core,router}=await waitRuntime());voice=core.voice;installEarlyInterceptors();
window.AIOfficeV22={version:VERSION,handleMessage:handleMessageV22,classifyInteraction:classifyInteractionV22,classifyCanonicalIntent,toggleVoice,attachAfterV21,getLastEnvelope:()=>lastEnvelope};
state('done','Runtime v2.2 đã sẵn sàng','Canonical Intent · Voice Action');
