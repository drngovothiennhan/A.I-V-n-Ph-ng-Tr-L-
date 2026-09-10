import {
  normalizeV21,
  semanticTokens,
  isWeatherQuery,
  explicitPlaceFromWeather,
  cancellationIntent,
  casualAnswer,
  filterRelevantSources
} from './interaction-policy-v21.js';

const VERSION='2.1-interaction-control';
const TASK_KEY='ai-office-tasks-v11';
const DOC_KEY='ai-office-drive-docs-v16';
const CHAT_KEY='ai-office-conversation-v19';
const MEMORY_KEY='ai-office-memories-v14';
const TERMINAL=new Set(['completed','cancelled','rejected','approval_cancelled','input_cancelled']);
const ACTIVE=new Set(['received','analyzing','planning','executing','verifying','delegated','processing']);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const getJson=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const setJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const esc=(text='')=>String(text).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

let requestGeneration=0;
let taskCancelEpoch=0;
let activeAbort=null;
let permissionResolve=null;

async function waitSystem(){
  for(let i=0;i<100;i++){
    if(window.AIOfficeV20?.handleMessage&&window.AIOfficeV19?.voice)return {v20:window.AIOfficeV20,core:window.AIOfficeV19};
    await sleep(30);
  }
  throw new Error('AI_OFFICE_V20_NOT_READY');
}

function injectStyle(){
  if(document.getElementById('ai21-style'))return;
  const style=document.createElement('style');
  style.id='ai21-style';
  style.textContent=`
#ai21Controls{display:flex;gap:6px;overflow:auto;padding:8px 0 0;scrollbar-width:none}#ai21Controls::-webkit-scrollbar{display:none}
.ai21Ctl{border:1px solid #dce5f7;background:#fff;color:#4c5f89;border-radius:999px;padding:7px 10px;font:800 8px/1 system-ui;white-space:nowrap;cursor:pointer}.ai21Ctl.danger{color:#b33e50;background:#fff5f6;border-color:#f2cbd2}.ai21Ctl:disabled{opacity:.45;cursor:default}
#ai21Permission{position:fixed;inset:0;z-index:1000;background:#111a365e;display:none;place-items:center;padding:18px;backdrop-filter:blur(6px)}#ai21Permission.show{display:grid}
#ai21Permission .panel{width:min(430px,100%);background:#fff;border:1px solid #dce5f7;border-radius:20px;padding:18px;box-shadow:0 24px 70px #15244935}
#ai21Permission h3{margin:0 0 8px;font-size:17px}#ai21Permission p{margin:0;color:#66708b;font-size:11px;line-height:1.55}#ai21Permission .scope{margin:10px 0;background:#f4f7ff;border-radius:12px;padding:10px;font-size:9px;color:#415173}
#ai21Permission .buttons{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}#ai21Permission button{border:1px solid #dce5f7;border-radius:11px;padding:9px 12px;font-weight:850;cursor:pointer;background:#fff;color:#445275}#ai21Permission .allow{background:#315fe8;color:#fff;border-color:#315fe8}
.ai21CancelInline{border:1px solid #f0cbd1;background:#fff5f6;color:#b33e50;border-radius:9px;padding:6px 7px;font-size:7.5px;font-weight:800;cursor:pointer}
.ai21State{margin-top:6px;font-size:8px;color:#6f7892}.ai21Answer{margin-top:8px;border:1px solid #d8e4ff;background:#eef4ff;border-radius:12px;padding:11px;font-size:10px;line-height:1.55}.ai21Sources{margin-top:7px;font-size:8px;color:#64708c}
@media(max-width:700px){#ai21Controls{margin-left:0}.ai21Ctl{padding:7px 9px;font-size:7.5px}}
`;
  document.head.appendChild(style);
}

function injectPermissionModal(){
  if(document.getElementById('ai21Permission'))return;
  const modal=document.createElement('div');
  modal.id='ai21Permission';
  modal.innerHTML='<div class="panel" role="dialog" aria-modal="true" aria-labelledby="ai21PermTitle"><h3 id="ai21PermTitle">Cần ủy quyền</h3><p id="ai21PermBody"></p><div class="scope" id="ai21PermScope"></div><div class="buttons"><button type="button" id="ai21Deny">Không cho phép</button><button type="button" class="allow" id="ai21Allow">Cho phép</button></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('#ai21Deny').onclick=()=>finishPermission(false);
  modal.querySelector('#ai21Allow').onclick=()=>finishPermission(true);
  modal.addEventListener('click',e=>{if(e.target===modal)finishPermission(false)});
}

function finishPermission(value){
  const modal=document.getElementById('ai21Permission');
  modal?.classList.remove('show');
  const resolve=permissionResolve;permissionResolve=null;
  resolve?.(value);
}

function permissionPopup({title='Cần ủy quyền',body='',scope='',allowLabel='Cho phép'}={}){
  injectPermissionModal();
  const modal=document.getElementById('ai21Permission');
  if(permissionResolve)finishPermission(false);
  modal.querySelector('#ai21PermTitle').textContent=title;
  modal.querySelector('#ai21PermBody').textContent=body;
  modal.querySelector('#ai21PermScope').textContent=scope;
  modal.querySelector('#ai21Allow').textContent=allowLabel;
  modal.classList.add('show');
  return new Promise(resolve=>{permissionResolve=resolve});
}

function renderAnswer(answer,sources=[],policyLabel='Điều phối chính xác'){
  const clean=String(answer||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const bubble=document.getElementById('bubble');
  const box=document.getElementById('answer');
  if(bubble)bubble.textContent=clean;
  if(!box)return clean;
  const refs=sources.slice(0,6).map((s,i)=>{
    const label=`[${i+1}] ${s.source||s.title||'Nguồn'}`;
    if(!s.url)return `<span>${esc(label)}</span>`;
    try{const u=new URL(s.url);return ['http:','https:'].includes(u.protocol)?`<a href="${esc(u.toString())}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:`<span>${esc(label)}</span>`}catch{return `<span>${esc(label)}</span>`}
  }).join(' · ');
  box.innerHTML=`<div class="ai21Answer"><b>Trưởng phòng A.I</b><div style="margin-top:5px">${esc(clean)}</div><div class="ai21Sources">Điều phối: ${esc(policyLabel)}${refs?`<br>Nguồn: ${refs}`:''}</div></div>`;
  return clean;
}

function saveTurn(role,text,meta={}){
  const h=getJson(CHAT_KEY,[]);h.push({role,text:String(text||'').slice(0,8000),at:new Date().toISOString(),...meta});setJson(CHAT_KEY,h.slice(-24));
}

function addNotice(title,text){
  try{
    const key='ai-office-notices-v15';const a=getJson(key,[]);a.unshift({id:crypto.randomUUID?.()||String(Date.now()),title,text,at:new Date().toISOString()});setJson(key,a.slice(0,100));
  }catch{}
}

function beginRequest(){
  requestGeneration+=1;
  try{activeAbort?.abort()}catch{}
  activeAbort=new AbortController();
  return requestGeneration;
}
function isCurrent(gen){return gen===requestGeneration&&!activeAbort?.signal?.aborted}
function cancelCurrentCommand(){
  requestGeneration+=1;
  try{activeAbort?.abort()}catch{}
  try{window.speechSynthesis?.cancel()}catch{}
  renderAnswer('Đã hủy lệnh đang xử lý. Kết quả đến muộn từ lệnh này sẽ bị bỏ qua và không được ghi nhận.');
  const status=document.getElementById('v19Status');if(status)status.textContent='Đã hủy lệnh · sẵn sàng';
  return true;
}

function findLatestTask(predicate){return getJson(TASK_KEY,[]).find(predicate)||null}
function mutateTask(id,fn){
  const tasks=getJson(TASK_KEY,[]);const t=tasks.find(x=>x.id===id);if(!t)return null;fn(t);setJson(TASK_KEY,tasks);window.render?.();syncUi();return t;
}

function cancelRunningTask(){
  taskCancelEpoch+=1;
  const t=findLatestTask(x=>ACTIVE.has(x.status));
  if(!t){renderAnswer('Đã ghi nhận yêu cầu dừng. Hiện không có công việc đang chạy để hủy.');return null}
  const out=mutateTask(t.id,x=>{x.status='cancelled';x.cancelledAt=new Date().toISOString();x.cancelReason='user_cancelled_running_task';x.progress=Math.min(Number(x.progress||0),95)});
  addNotice('Đã hủy công việc',out.title||'Công việc đang xử lý');
  renderAnswer(`Đã hủy công việc đang làm: ${out.title}. Phần chưa hoàn tất sẽ không được đưa sang bước duyệt hoặc học kỹ năng.`);
  return out;
}

function cancelApprovalById(id){
  const out=mutateTask(id,x=>{x.status='approval_cancelled';x.approvalCancelledAt=new Date().toISOString();x.cancelReason='user_cancelled_approval';x.progress=Math.min(Number(x.progress||96),96)});
  if(out){addNotice('Đã hủy xét duyệt',out.title||'Sản phẩm');renderAnswer(`Đã hủy xét duyệt kết quả: ${out.title}. Kết quả này không được tính là hoàn tất và không được dùng để học.`)}
  return out;
}
function cancelLatestApproval(){
  const t=findLatestTask(x=>x.status==='awaiting_approval');
  if(!t){renderAnswer('Hiện không có kết quả nào đang chờ duyệt để hủy.');return null}
  return cancelApprovalById(t.id);
}

function undoLatestApproval(){
  const t=findLatestTask(x=>x.status==='completed'&&x.approvedAt);
  if(!t){renderAnswer('Không tìm thấy kết quả đã duyệt gần nhất để hoàn tác.');return null}
  const out=mutateTask(t.id,x=>{x.status='awaiting_approval';x.progress=96;x.approvalUndoneAt=new Date().toISOString();delete x.approvedAt;delete x.completedAt});
  const memories=getJson(MEMORY_KEY,[]).filter(m=>!(m?.type==='reflection'&&String(m.text||'').includes(t.title||'')));
  setJson(MEMORY_KEY,memories);
  renderAnswer(`Đã hoàn tác duyệt: ${out.title}. Sản phẩm trở lại trạng thái chờ duyệt và dấu học từ lần duyệt vừa rồi đã được gỡ khỏi bộ nhớ cục bộ.`);
  return out;
}

async function cancelInput(targetId=''){
  const input=document.getElementById('msg');
  if(input?.value?.trim()){input.value='';renderAnswer('Đã hủy nội dung đang nhập trong ô lệnh.');return {type:'composer'}}
  const waiting=findLatestTask(x=>x.status==='awaiting_input'||x.rows||x.dataMeta);
  if(waiting){
    const out=mutateTask(waiting.id,x=>{delete x.rows;delete x.dataMeta;x.status='input_cancelled';x.inputCancelledAt=new Date().toISOString();x.cancelReason='user_cancelled_input_data'});
    renderAnswer(`Đã hủy dữ liệu đầu vào của công việc: ${out.title}. Dữ liệu này sẽ không được dùng tiếp.`);return out;
  }
  const docs=getJson(DOC_KEY,[]);const doc=targetId?docs.find(d=>d.id===targetId):docs[0];
  if(!doc){renderAnswer('Hiện không có dữ liệu local đầu vào để hủy. Dữ liệu trên Drive không bị xóa bởi thao tác này.');return null}
  if(doc.status==='approved'){
    const ok=await permissionPopup({title:'Hủy dữ liệu đã duyệt?',body:`${doc.name} đang được đánh dấu đã duyệt trong bộ nhớ local.`,scope:'Thao tác chỉ xóa bản local khỏi A.I Văn phòng; không xóa file gốc trên Google Drive.',allowLabel:'Hủy dữ liệu'});
    if(!ok){renderAnswer('Đã giữ nguyên dữ liệu đầu vào.');return null}
  }
  setJson(DOC_KEY,docs.filter(d=>d.id!==doc.id));window.renderDocs?.();syncUi();renderAnswer(`Đã hủy dữ liệu đầu vào local: ${doc.name}. File gốc trên Drive (nếu có) không bị xóa.`);return doc;
}

function cancelByText(text){
  const type=cancellationIntent(text);
  if(!type)return false;
  if(type==='command')cancelCurrentCommand();
  else if(type==='task')cancelRunningTask();
  else if(type==='approval')cancelLatestApproval();
  else if(type==='undo_approval')undoLatestApproval();
  else if(type==='input')cancelInput();
  return true;
}

async function fetchCancelable(url,options={},timeout=10000){
  const controller=new AbortController();
  const relay=()=>controller.abort();
  activeAbort?.signal?.addEventListener('abort',relay,{once:true});
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(url,{...options,signal:controller.signal,cache:'no-store'})}
  finally{clearTimeout(timer);activeAbort?.signal?.removeEventListener?.('abort',relay)}
}

async function currentPosition(){
  if(!navigator.geolocation)throw new Error('GEOLOCATION_UNSUPPORTED');
  const cached=sessionStorage.getItem('ai-office-location-v21');
  if(cached){try{const c=JSON.parse(cached);if(Date.now()-c.at<30*60*1000)return c}catch{}}
  const ok=await permissionPopup({title:'Cho phép dùng vị trí?',body:'Câu hỏi thời tiết cần biết vị trí để trả lời đúng khu vực.',scope:'Chỉ dùng tọa độ cho dự báo thời tiết trong phiên hiện tại; không ghi vào Drive hoặc bộ nhớ học.',allowLabel:'Cho phép vị trí'});
  if(!ok)throw new Error('GEOLOCATION_DENIED_BY_USER');
  const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:600000}));
  const c={lat:pos.coords.latitude,lon:pos.coords.longitude,at:Date.now(),label:'vị trí hiện tại của bạn'};
  sessionStorage.setItem('ai-office-location-v21',JSON.stringify(c));return c;
}

async function geocodePlace(place){
  const u=new URL('https://geocoding-api.open-meteo.com/v1/search');u.search=new URLSearchParams({name:place,count:'5',language:'vi',format:'json'});
  const r=await fetchCancelable(u.toString(),{},9000);if(!r.ok)throw new Error(`GEOCODE_${r.status}`);const data=await r.json();const p=data?.results?.[0];if(!p)return null;
  return {lat:p.latitude,lon:p.longitude,label:[p.name,p.admin1,p.country].filter(Boolean).join(', ')};
}

function weatherDescription(code){
  const c=Number(code);
  if(c===0)return 'trời quang';
  if([1,2,3].includes(c))return 'có mây';
  if([45,48].includes(c))return 'có sương mù';
  if([51,53,55,56,57].includes(c))return 'có mưa phùn';
  if([61,63,65,66,67].includes(c))return 'có mưa';
  if([71,73,75,77,85,86].includes(c))return 'có tuyết';
  if([80,81,82].includes(c))return 'có mưa rào';
  if([95,96,99].includes(c))return 'có dông';
  return 'thời tiết biến đổi';
}

async function weatherAnswer(text){
  const gen=beginRequest();
  const status=document.getElementById('v19Status');if(status)status.textContent='Đang lấy dự báo thời tiết đúng vị trí…';
  let loc=null;const explicit=explicitPlaceFromWeather(text);
  if(explicit)loc=await geocodePlace(explicit);
  if(!loc&&explicit){renderAnswer(`Tôi chưa xác định chắc chắn địa điểm “${explicit}”. Hãy ghi rõ quận/huyện, tỉnh/thành hoặc cho phép dùng vị trí hiện tại.`);return}
  if(!loc)loc=await currentPosition();
  if(!isCurrent(gen))return;
  const u=new URL('https://api.open-meteo.com/v1/forecast');
  u.search=new URLSearchParams({latitude:String(loc.lat),longitude:String(loc.lon),current:'temperature_2m,apparent_temperature,precipitation,rain,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,rain_sum',timezone:'auto',forecast_days:'2'});
  const r=await fetchCancelable(u.toString(),{},10000);if(!r.ok)throw new Error(`WEATHER_${r.status}`);const data=await r.json();if(!isCurrent(gen))return;
  const cur=data.current||{},daily=data.daily||{};
  const prob=Number(daily.precipitation_probability_max?.[0]??0),sum=Number(daily.precipitation_sum?.[0]??0),rain=Number(daily.rain_sum?.[0]??0),temp=cur.temperature_2m,max=Number(daily.temperature_2m_max?.[0]),min=Number(daily.temperature_2m_min?.[0]);
  const rainNow=Number(cur.rain||0)>0.05||Number(cur.precipitation||0)>0.05;
  let verdict=prob>=60||rain>0.5?'Có khả năng mưa đáng kể':prob>=35||sum>0.2?'Có khả năng mưa':prob>=20?'Khả năng mưa thấp':'Khả năng mưa thấp';
  if(rainNow)verdict='Hiện đang có mưa hoặc mưa rất gần vị trí này';
  const answer=`${verdict} tại ${loc.label}. Xác suất mưa tối đa hôm nay khoảng ${Math.round(prob)}%, lượng mưa dự kiến ${sum.toFixed(1)} mm. Hiện tại ${weatherDescription(cur.weather_code)}, khoảng ${temp??'—'}°C; nhiệt độ hôm nay khoảng ${min.toFixed(0)}–${max.toFixed(0)}°C.`;
  const source={source:'Open-Meteo Forecast',title:`Dự báo ${loc.label}`,url:u.toString(),kind:'weather'};
  renderAnswer(answer,[source],'Thời tiết chuyên dụng · đúng vị trí');saveTurn('user',text,{intent:'weather'});saveTurn('assistant',answer,{intent:'weather_answer',source:'open-meteo'});if(status)status.textContent='Sẵn sàng · Weather intent';return answer;
}

function strictFallback(query,sources){
  const tokens=semanticTokens(query);if(!sources.length)return 'Tôi chưa tìm được nguồn đủ khớp với câu hỏi nên không trả lời bằng nội dung gần giống hoặc ghép kết quả ngẫu nhiên. Bạn có thể hỏi cụ thể hơn hoặc cho phép dùng nguồn chuyên dụng nếu câu hỏi cần vị trí/tài khoản.';
  const picked=[];
  for(const source of sources.slice(0,4)){
    const chunks=String(source.text||'').replace(/<[^>]+>/g,' ').split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(x=>x.length>=25&&x.length<=650);
    const ranked=chunks.map(sentence=>({sentence,score:tokens.reduce((n,t)=>n+(normalizeV21(sentence).includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    for(const item of ranked.slice(0,2)){picked.push(item.sentence);if(picked.length>=3)break}
    if(picked.length>=3)break;
  }
  return picked.length?picked.join(' '):'Tôi đã truy xuất nguồn nhưng chưa có đoạn nào đủ khớp để trả lời chắc chắn. Tôi không sử dụng các đoạn chỉ trùng từ khóa rời rạc.';
}

async function chiefSynthesis(text,sources,v20){
  if(!v20.providerState?.gemini?.configured)return strictFallback(text,sources);
  const history=getJson(CHAT_KEY,[]).slice(-8).map(x=>`${x.role}: ${x.text}`).join('\n').slice(0,5000);
  const pack=sources.slice(0,8).map((s,i)=>`[${i+1}] ${s.source||s.title}\n${s.url||''}\n${String(s.text||'').slice(0,4200)}`).join('\n\n').slice(0,22000);
  const r=await fetchCancelable('/api/proxy?op=chief',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:`Bạn là Trưởng phòng A.I. Trả lời đúng câu hỏi, không lan man, không trộn các nghĩa khác nhau chỉ vì trùng từ khóa. Nếu bằng chứng không đủ, nói rõ. Không in raw HTML/XML/JS. Gắn [n] theo nguồn.\n\nLỊCH SỬ:\n${history}\n\nCÂU HỎI:\n${text}\n\nNGUỒN ĐÃ QUA RELEVANCE GATE:\n${pack}`})},30000);
  if(!r.ok)return strictFallback(text,sources);const data=await r.json();return String(data?.reply||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()||strictFallback(text,sources);
}

async function strictQuestion(text,v20){
  const gen=beginRequest();const status=document.getElementById('v19Status');if(status)status.textContent='Đang chọn nguồn phù hợp…';
  const intent=v20.classifyIntent(text);const policy=v20.classifySourcePolicy(text,intent);
  const gathered=await v20.gatherSources(text,policy);if(!isCurrent(gen))return;
  const relevant=filterRelevantSources(text,gathered?.sources||[],policy);
  let answer='';
  if(gathered?.endpointAnswer&&relevant.length)answer=String(gathered.endpointAnswer).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  if(!answer)answer=await chiefSynthesis(text,relevant,v20);if(!isCurrent(gen))return;
  renderAnswer(answer,relevant,`Relevance Gate · ${policy?.mode||'question'}`);saveTurn('user',text,{intent:'question',policy:policy?.mode});saveTurn('assistant',answer,{intent:'answer',sourceCount:relevant.length});if(status)status.textContent='Sẵn sàng · Relevance Gate';return answer;
}

async function handleMessageV21(text,options={},system){
  const value=String(text||'').trim();if(!value)return;
  if(cancelByText(value))return;
  const casual=casualAnswer(value);if(casual){renderAnswer(casual,[],'Hội thoại trực tiếp');saveTurn('user',value,{intent:'casual'});saveTurn('assistant',casual,{intent:'casual_answer'});return casual}
  if(isWeatherQuery(value)){
    try{return await weatherAnswer(value)}catch(error){
      const msg=String(error?.message||error);if(/DENIED|PERMISSION_DENIED|1$/.test(msg))return renderAnswer('Tôi chưa có quyền vị trí nên không thể biết “hôm nay có mưa không” tại nơi bạn đang đứng. Hãy ghi rõ địa điểm trong câu hỏi hoặc cho phép vị trí khi popup xuất hiện.');
      if(msg==='GEOLOCATION_UNSUPPORTED')return renderAnswer('Thiết bị này không cung cấp vị trí cho ứng dụng. Hãy hỏi theo dạng “Hôm nay ở [địa điểm] có mưa không?”.');
      return renderAnswer('Tôi chưa lấy được dữ liệu thời tiết lúc này. Tôi không dùng bài viết có chữ “mưa” để thay cho dự báo thời tiết.');
    }
  }
  const intent=system.v20.classifyIntent(value);
  if(intent.kind==='question')return strictQuestion(value,system.v20);
  const epoch=taskCancelEpoch;
  const result=await system.v20.handleMessage(value,options);
  if(epoch!==taskCancelEpoch&&result?.id)mutateTask(result.id,x=>{x.status='cancelled';x.cancelledAt=x.cancelledAt||new Date().toISOString();x.cancelReason='user_cancelled_while_running';x.progress=Math.min(Number(x.progress||0),95)});
  syncUi();return result;
}

async function ensureMicrophoneAndReplay(target){
  if(sessionStorage.getItem('ai-office-mic-v21')==='granted')return false;
  const ok=await permissionPopup({title:'Cho phép microphone?',body:'A.I chỉ cần microphone khi bạn chủ động dùng nút giọng nói.',scope:'Âm thanh dùng cho nhận lệnh/hội thoại. Quyền hệ thống do trình duyệt quản lý.',allowLabel:'Cho phép microphone'});
  if(!ok){renderAnswer('Bạn chưa cấp quyền microphone. Bạn vẫn có thể dùng ô nhập văn bản bình thường.');return true}
  try{
    if(navigator.mediaDevices?.getUserMedia){const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop())}
    sessionStorage.setItem('ai-office-mic-v21','granted');target.dataset.ai21Bypass='1';target.click();
  }catch{renderAnswer('Trình duyệt hoặc hệ điều hành chưa cấp microphone. Bạn có thể bật quyền Microphone trong cài đặt trang/app rồi thử lại.')}
  return true;
}

function injectControls(){
  if(document.getElementById('ai21Controls'))return;
  const composer=document.querySelector('.composer');if(!composer)return;
  const bar=document.createElement('div');bar.id='ai21Controls';bar.innerHTML='<button class="ai21Ctl danger" data-ai21="command">✕ Hủy lệnh</button><button class="ai21Ctl danger" data-ai21="task">■ Dừng việc</button><button class="ai21Ctl" data-ai21="approval">↩ Hủy duyệt</button><button class="ai21Ctl" data-ai21="input">⌫ Hủy đầu vào</button>';
  composer.insertAdjacentElement('afterend',bar);
}

function augmentApprovals(){
  document.querySelectorAll('#approvals .approval').forEach(card=>{
    if(card.querySelector('.ai21CancelInline'))return;
    const title=card.querySelector('b')?.textContent?.trim()||'';const task=findLatestTask(t=>t.status==='awaiting_approval'&&t.title===title);if(!task)return;
    const actions=card.querySelector('.actions');if(!actions)return;const b=document.createElement('button');b.type='button';b.className='ai21CancelInline';b.textContent='Hủy duyệt';b.dataset.taskId=task.id;b.dataset.ai21='approval-id';actions.prepend(b);
  });
}

function augmentDocs(){
  const docs=getJson(DOC_KEY,[]);
  document.querySelectorAll('#docs .doc').forEach(card=>{
    if(card.querySelector('[data-ai21="doc-id"]'))return;
    const title=card.querySelector('b')?.textContent?.trim()||'';const doc=docs.find(d=>d.name===title);if(!doc)return;
    const b=document.createElement('button');b.type='button';b.className='ai21CancelInline';b.textContent='Hủy dữ liệu';b.dataset.ai21='doc-id';b.dataset.docId=doc.id;b.style.marginLeft='5px';card.appendChild(b);
  });
}

function fixStatsAndLearning(){
  const tasks=getJson(TASK_KEY,[]);const active=tasks.filter(t=>ACTIVE.has(t.status)),wait=tasks.filter(t=>t.status==='awaiting_approval'),done=tasks.filter(t=>t.status==='completed');
  const setText=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};setText('sActive',active.length);setText('sWait',wait.length);setText('sDone',done.length);setText('sUrgent',tasks.filter(t=>t.priority==='urgent'&&!TERMINAL.has(t.status)&&t.status!=='awaiting_approval').length);const wc=document.getElementById('waitCount');if(wc)wc.textContent=`(${wait.length})`;
  const deptIds=['admin','clerical','tech','planning','logistics','qa'];document.querySelectorAll('#deptGrid .dept').forEach((card,i)=>{const id=deptIds[i];if(!id)return;const ts=tasks.filter(t=>(t.deptIds||[]).includes(id)&&!TERMINAL.has(t.status)&&t.status!=='awaiting_approval'),p=ts.length?Math.round(ts.reduce((n,t)=>n+Number(t.progress||0),0)/ts.length):0;const meta=card.querySelector('.meta');if(meta)meta.textContent=ts.length?`${ts.length} nhiệm vụ`:'Sẵn sàng';const meter=card.querySelector('.meter i');if(meter)meter.style.width=`${p}%`;const bs=card.querySelectorAll('b');if(bs.length>1)bs[bs.length-1].textContent=`${p}%`});
  document.querySelectorAll('#agents .agent').forEach((card,i)=>{const id=deptIds[i];if(!id)return;const ts=tasks.filter(t=>(t.deptIds||[]).includes(id)&&!['cancelled','approval_cancelled','input_cancelled','rejected'].includes(t.status)),ok=ts.filter(t=>t.status==='completed').length,rate=ts.length?Math.round(ok/ts.length*100):0;const level=rate>=90&&ts.length>=10?'Expert':rate>=75&&ts.length>=5?'Advanced':ts.length>=2?'Practitioner':'Foundation';const meta=card.querySelector('.meta');if(meta)meta.textContent=`${level} · ${ts.length} task · ${rate}% duyệt`;const meter=card.querySelector('.meter i');if(meter)meter.style.width=`${rate}%`});
}

function syncUi(){setTimeout(()=>{augmentApprovals();augmentDocs();fixStatsAndLearning()},0)}

function wrapRenders(){
  if(window.render&&!window.render.__ai21){const original=window.render;const wrapped=function(...args){const r=original.apply(this,args);syncUi();return r};wrapped.__ai21=true;window.render=wrapped}
  if(window.renderDocs&&!window.renderDocs.__ai21){const original=window.renderDocs;const wrapped=function(...args){const r=original.apply(this,args);syncUi();return r};wrapped.__ai21=true;window.renderDocs=wrapped}
}

function installInterceptors(system){
  window.addEventListener('click',async event=>{
    const target=event.target?.closest?.('#send,#mic,#v19Voice,[data-ai21]');if(!target)return;
    if(target.dataset.ai21Bypass==='1'){delete target.dataset.ai21Bypass;return}
    if(target.id==='mic'||target.id==='v19Voice'){
      event.preventDefault();event.stopImmediatePropagation();await ensureMicrophoneAndReplay(target);return;
    }
    const action=target.dataset.ai21;
    if(action){event.preventDefault();event.stopImmediatePropagation();if(action==='command')cancelCurrentCommand();else if(action==='task')cancelRunningTask();else if(action==='approval')cancelLatestApproval();else if(action==='input')cancelInput();else if(action==='approval-id')cancelApprovalById(target.dataset.taskId);else if(action==='doc-id')cancelInput(target.dataset.docId);return}
    if(target.id==='send'){
      event.preventDefault();event.stopImmediatePropagation();const input=document.getElementById('msg'),text=input?.value||'';if(input)input.value='';await handleMessageV21(text,{spoken:false},system);return;
    }
  },true);
  window.addEventListener('keydown',async event=>{
    if(event.target?.id!=='msg'||event.key!=='Enter'||!(event.ctrlKey||event.metaKey))return;event.preventDefault();event.stopImmediatePropagation();const input=document.getElementById('msg'),text=input?.value||'';if(input)input.value='';await handleMessageV21(text,{spoken:false},system);
  },true);
  const voice=system.core.voice;if(voice&&!voice.__ai21DispatchPatched){const previous=voice.dispatchEvent?.bind(voice);if(previous){voice.dispatchEvent=event=>{if(event?.type==='transcript'){const text=String(event?.detail?.text||'').trim();if(text){const input=document.getElementById('msg');if(input)input.value=text;handleMessageV21(text,{spoken:true},system).catch(console.error)}return true}return previous(event)};voice.__ai21DispatchPatched=true}}
}

injectStyle();injectPermissionModal();injectControls();
const system=await waitSystem();
wrapRenders();installInterceptors(system);syncUi();
window.AIOfficeV21={version:VERSION,handleMessage:(text,options={})=>handleMessageV21(text,options,system),permissionPopup,cancelCurrentCommand,cancelRunningTask,cancelLatestApproval,undoLatestApproval,cancelInput,isWeatherQuery};
const status=document.getElementById('v19Status');if(status)status.textContent='Interaction v2.1 · Relevance Gate · Hủy/Hoàn tác ON';
const bubble=document.getElementById('bubble');if(bubble)bubble.textContent='Đã nâng cấp tương tác: câu hỏi thời tiết dùng nguồn chuyên dụng và xin vị trí khi cần; nguồn không khớp bị loại; có Hủy lệnh, Dừng việc, Hủy duyệt và Hủy đầu vào.';
