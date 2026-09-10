import { PwaInstallController } from './install/pwa-install.js';
import { XiaozhiVoiceFabric } from './voice/xiaozhi-voice-fabric.js';
import { classifyIntent, executeTask, wrapApprovalHooks, contextSnapshot } from './automation-core-v19.js';
import { createClientArtifact } from './client-artifacts-v19.js';
import { parseOfficeFile } from './client-office-files-v19.js';
import { runLocalDataOperation } from './data-ops-v19.js';

const RELEASE = '1.9.2';
const CHAT_KEY = 'ai-office-conversation-v19';
const VOICE_KEY = 'ai-office-voice-continuous-v19';
const DOC_KEY = 'ai-office-drive-docs-v16';
const TASK_KEY = 'ai-office-tasks-v11';
const MAX_HISTORY = 24;
const RESEARCH_TIMEOUT = 8500;

const style = document.createElement('style');
style.textContent = `
#v19Dock{position:fixed;right:16px;bottom:16px;z-index:90;display:flex;gap:8px;align-items:center}
#v19Voice,#v19Install{border:1px solid #dce5f7;background:#fff;color:#315fe8;border-radius:999px;min-height:44px;padding:0 14px;font-weight:900;box-shadow:0 12px 30px #23366c22;cursor:pointer}
#v19Voice{width:52px;padding:0;font-size:20px}
#v19Voice[data-state="connected"],#v19Voice[data-state="browser-listening"]{background:#315fe8;color:#fff}
#v19Voice[data-mode="continuous"]{box-shadow:0 0 0 5px #315fe81b,0 12px 30px #23366c22}
#v19Status{font:700 9px/1.2 system-ui;color:#6f7892;background:#fff;border:1px solid #e2e8f5;border-radius:999px;padding:7px 9px;max-width:275px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ai19Answer{margin-top:8px;border:1px solid #d8e4ff;background:#eef4ff;border-radius:12px;padding:11px;font-size:10px;line-height:1.55;white-space:pre-wrap}
.ai19Sources{margin-top:7px;font-size:8px;color:#64708c}
@media(max-width:700px){#v19Dock{right:12px;bottom:12px}#v19Status{display:none}#v19Install{padding:0 11px}}
`;
document.head.appendChild(style);

document.title = 'A.I Văn phòng v1.9';
document.querySelector('.ey')?.replaceChildren(document.createTextNode('A.I VĂN PHÒNG · RELEASE 1.9'));
const brandSmall = document.querySelector('.brand small');
if (brandSmall) brandSmall.textContent = 'Autonomous Office Orchestrator · v1.9';
const subtitle = document.querySelector('.sub');
if (subtitle) subtitle.textContent = 'Intent Engine · Workflow thật · QA Gate · Office Artifact Engine';
const footer = document.querySelector('.footer');
if (footer) footer.textContent = 'A.I VĂN PHÒNG · 1.9.2 AUTONOMOUS OFFICE ORCHESTRATOR · Dashboard v1.5 approved';

const dock = document.createElement('div');
dock.id = 'v19Dock';
dock.innerHTML = '<span id="v19Status">Đang kiểm tra năng lực hệ thống…</span><button id="v19Install" hidden>Cài ứng dụng</button><button id="v19Voice" aria-label="Hội thoại giọng nói liên tục" title="Bật/tắt hội thoại giọng nói liên tục">🎙</button>';
document.body.appendChild(dock);

const install = new PwaInstallController({ button: document.getElementById('v19Install'), status: null }).start();
const voiceButton = document.getElementById('v19Voice');
const status = document.getElementById('v19Status');
const input = document.getElementById('msg');
const sendButton = document.getElementById('send');
const legacyMic = document.getElementById('mic');
const answerBox = document.getElementById('answer');
const bubble = document.getElementById('bubble');
const fileInput = document.getElementById('files');

let provider = { local:{configured:true}, gemini:{configured:false}, xiaozhi:{configured:false}, googleWorkspace:{configured:false} };
try {
  const r = await fetch('/api/health', { cache:'no-store' });
  if (r.ok) provider = (await r.json()).providers || provider;
} catch {}

const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const voice = new XiaozhiVoiceFabric({ wsUrl: provider.xiaozhi?.configured ? `${wsProtocol}//${location.host}/api/ws-xiaozhi` : null, language:'vi-VN' });
let continuousVoice = localStorage.getItem(VOICE_KEY) === '1';
let processing = false;
let speaking = false;
let ignoreTranscriptUntil = 0;

function getJson(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function setJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
function makeId(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`}
function loadHistory(){try{return JSON.parse(localStorage.getItem(CHAT_KEY)||'[]').slice(-MAX_HISTORY)}catch{return[]}}
function saveTurn(role,text,meta={}){const h=loadHistory();h.push({role,text:String(text||'').slice(0,8000),at:new Date().toISOString(),...meta});localStorage.setItem(CHAT_KEY,JSON.stringify(h.slice(-MAX_HISTORY)))}
function normalize(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function words(text){return normalize(text).split(/[^a-z0-9]+/).filter(x=>x.length>2)}
function localContext(query){try{return typeof window.ctx==='function'?String(window.ctx(query)||'').slice(0,12000):''}catch{return''}}
async function fetchJson(url,timeout=RESEARCH_TIMEOUT){const response=await fetch(url,{signal:AbortSignal.timeout(timeout),cache:'no-store'});if(!response.ok)throw new Error(`HTTP_${response.status}`);return response.json()}
async function wikiSources(query,lang='vi'){try{const u=new URL(`https://${lang}.wikipedia.org/w/api.php`);u.search=new URLSearchParams({action:'query',generator:'search',gsrsearch:query,gsrlimit:'3',prop:'extracts|info',exintro:'1',explaintext:'1',inprop:'url',format:'json',origin:'*'});const j=await fetchJson(u.toString());return Object.values(j?.query?.pages||{}).map(p=>({kind:'web',source:`Wikipedia ${lang.toUpperCase()}`,title:p.title||'',url:p.fullurl||`https://${lang}.wikipedia.org/?curid=${p.pageid}`,text:String(p.extract||'').replace(/\s+/g,' ').trim().slice(0,2600)})).filter(x=>x.text)}catch{return[]}}
async function duckSource(query){try{const u=new URL('https://api.duckduckgo.com/');u.search=new URLSearchParams({q:query,format:'json',no_html:'1',no_redirect:'1',skip_disambig:'0'});const j=await fetchJson(u.toString());if(!j?.AbstractText)return[];return[{kind:'web',source:j.AbstractSource||'DuckDuckGo',title:j.Heading||query,url:j.AbstractURL||'',text:String(j.AbstractText).slice(0,2600)}]}catch{return[]}}
async function pubmedSources(query){const medical=/\b(bệnh|thuốc|y học|y tế|sức khỏe|triệu chứng|điều trị|chẩn đoán|dược|medicine|health|disease|drug|therapy|diagnosis)\b/i.test(query);if(!medical)return[];try{const search=new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');search.search=new URLSearchParams({db:'pubmed',term:query,retmax:'3',sort:'relevance',retmode:'json'});const s=await fetchJson(search.toString()),ids=s?.esearchresult?.idlist||[];if(!ids.length)return[];const summary=new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');summary.search=new URLSearchParams({db:'pubmed',id:ids.join(','),retmode:'json'});const j=await fetchJson(summary.toString());return ids.map(id=>{const p=j?.result?.[id]||{};return{kind:'scholarly',source:'PubMed',title:p.title||`PubMed ${id}`,url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,text:[p.title,p.fulljournalname,p.pubdate].filter(Boolean).join(' · ')}})}catch{return[]}}
function localSources(context){if(!context)return[];return context.split('\n').filter(Boolean).slice(0,7).map((line,i)=>{const m=line.match(/^\[([^\]]+)\]\s*(.*)$/);return{kind:'internal',source:m?.[1]||`Internal ${i+1}`,title:m?.[1]||'Drive Brain',url:'',text:(m?.[2]||line).slice(0,2200)}})}
async function gatherSources(query){const local=localSources(localContext(query));const[vi,en,ddg,pubmed]=await Promise.all([wikiSources(query,'vi'),wikiSources(query,'en'),duckSource(query),pubmedSources(query)]);const seen=new Set();return[...local,...pubmed,...ddg,...vi,...en].filter(s=>{const key=`${s.url}|${s.title}|${s.text.slice(0,80)}`;if(!s.text||seen.has(key))return false;seen.add(key);return true}).slice(0,12)}
function groundedFallback(query,sources){const qWords=words(query),ranked=sources.map(s=>({...s,score:qWords.reduce((n,w)=>n+(String(s.text).toLowerCase().includes(w)?1:0),0)+(s.kind==='internal'?2:0)+(s.kind==='scholarly'?1:0)})).sort((a,b)=>b.score-a.score),best=ranked.filter(x=>x.text).slice(0,3);if(!best.length)return'Tôi chưa tìm được nguồn đủ tin cậy để trả lời chắc chắn. Hệ thống sẽ không tự bịa thông tin.';const sentences=best.flatMap(s=>String(s.text).split(/(?<=[.!?])\s+/).slice(0,2)).filter(Boolean).slice(0,5);return`${sentences.join(' ')}\n\nChế độ grounded fallback: chỉ sử dụng nội dung từ các nguồn vừa truy xuất.`}
async function reasonAnswer(query,sources){const history=loadHistory().slice(-10).map(x=>`${x.role}: ${x.text}`).join('\n').slice(0,7000),sourcePack=sources.map((s,i)=>`[${i+1}] ${s.source} | ${s.title}\n${s.text}`).join('\n\n').slice(0,18000);if(provider.gemini?.configured){try{const response=await fetch('/api/proxy?op=chief',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:`Bạn là Trưởng phòng A.I. Trả lời chính xác bằng tiếng Việt.\nChỉ dùng SOURCE PACK và lịch sử hội thoại. Không đủ nguồn thì nói rõ.\nGắn [n] sau mệnh đề tương ứng.\n\nLỊCH SỬ:\n${history}\n\nCÂU HỎI:\n${query}\n\nSOURCE PACK:\n${sourcePack}`})});if(response.ok){const j=await response.json();if(j?.reply?.trim())return j.reply.trim()}}catch{}}return groundedFallback(query,sources)}
function renderAnswer(answer,sources=[]){if(bubble)bubble.textContent=answer;if(!answerBox)return;const safe=String(answer).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));const refs=sources.slice(0,8).map((s,i)=>{const label=`[${i+1}] ${String(s.source).replace(/[&<>]/g,'')}`;if(!s.url)return`<span>${label}</span>`;try{const u=new URL(s.url);if(!['http:','https:'].includes(u.protocol))return`<span>${label}</span>`;return`<a href="${u.toString()}" target="_blank" rel="noopener noreferrer">${label}</a>`}catch{return`<span>${label}</span>`}}).join(' · ');answerBox.innerHTML=`<div class="ai19Answer"><b>Trưởng phòng A.I</b><br>${safe}<div class="ai19Sources">Nguồn: ${refs||'Drive Brain / dữ liệu nội bộ đã duyệt / local engine'}</div></div>`}
function speakThenResume(text){const clean=String(text||'').replace(/https?:\/\/\S+/g,'').replace(/\[[0-9]+\]/g,'').slice(0,3500);if(!continuousVoice||!('speechSynthesis'in window))return;speaking=true;voice.stopBrowserListening();window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clean);u.lang='vi-VN';u.rate=1.02;u.onend=u.onerror=()=>{speaking=false;ignoreTranscriptUntil=Date.now()+350;if(continuousVoice)setTimeout(()=>voice.startBrowserListening(),420)};window.speechSynthesis.speak(u)}
async function handleQuestion(text,{spoken=false}={}){status.textContent='Đang truy cập nguồn & suy luận…';if(bubble)bubble.textContent='Tôi đang đọc nguồn phù hợp và kiểm tra bằng chứng…';const sources=await gatherSources(text),answer=await reasonAnswer(text,sources);renderAnswer(answer,sources);saveTurn('user',text,{intent:'question'});saveTurn('assistant',answer,{intent:'answer',sourceCount:sources.length});status.textContent=continuousVoice?'Voice · hội thoại liên tục':'Sẵn sàng';if(spoken||continuousVoice)speakThenResume(answer);return answer}
function persistTask(task){const list=getJson(TASK_KEY,[]),i=list.findIndex(x=>x.id===task.id);if(i>=0)list[i]=task;else list.unshift(task);setJson(TASK_KEY,list);window.render?.()}
async function handleTask(text,{spoken=false}={}){status.textContent='Đang lập kế hoạch & thực thi…';if(bubble)bubble.textContent='Tôi đã xác định đây là nhiệm vụ. Đang thực hiện workflow thật và QA sản phẩm…';const task=await executeTask(text);if(task.intent?.kind==='data'){const localData=runLocalDataOperation(text);if(localData){task.outputDraft=localData.text;task.rows=localData.rows||undefined;task.dataMeta=localData.meta;if(localData.meta?.reason){task.status='awaiting_input';task.progress=35;task.qa={score:90,passed:false,issues:['Cần đủ dữ liệu đã duyệt để thực hiện phép đối chiếu thật.'],userFacts:[]}}else{task.status='awaiting_approval';task.progress=96;task.qa={score:100,passed:true,issues:[],userFacts:[]}}persistTask(task);renderAnswer(task.outputDraft,[])}}saveTurn('user',text,{intent:'task',kind:task.intent?.kind});saveTurn('assistant',task.outputDraft,{intent:'task_result',qaScore:task.qa?.score,engine:task.engine,dataMeta:task.dataMeta});status.textContent=task.status==='awaiting_input'?'Đang chờ dữ liệu đầu vào đã duyệt':task.intent?.irreversible?'Đã làm phần an toàn · chờ duyệt hành động ngoài':'Đã thực hiện · chờ duyệt';if(spoken||continuousVoice)speakThenResume(task.status==='awaiting_input'?'Tôi đã xác định đúng tác vụ nhưng cần đủ dữ liệu đầu vào đã duyệt để đối chiếu thật.':`Đã thực hiện nhiệm vụ. Điểm QA ${task.qa?.score??0} trên 100. ${task.intent?.irreversible?'Tôi đang dừng trước hành động bên ngoài để chờ duyệt.':''}`);return task}
async function handleMessage(text,options={}){const value=String(text||'').trim();if(!value||processing)return;processing=true;try{const intent=classifyIntent(value,contextSnapshot());return intent.kind==='question'?await handleQuestion(value,options):await handleTask(value,options)}finally{processing=false}}

const legacyDownload=typeof window.download==='function'?window.download:null;
window.download=async function downloadV19(task,format){const fmt=String(format||'').toLowerCase();if(['docx','xlsx','pptx'].includes(fmt)){try{createClientArtifact(task,fmt);window.toast?.(`Đã tạo ${fmt.toUpperCase()} bằng Artifact Engine v1.9`);return}catch(error){console.error('client_artifact_error',error)}}if(fmt==='png'&&typeof window.png==='function')return window.png(task);if(legacyDownload)return legacyDownload(task,fmt);window.toast?.(`Chưa hỗ trợ định dạng ${fmt.toUpperCase()}`)};

if(fileInput){fileInput.setAttribute('accept','.txt,.md,.csv,.tsv,.json,.xml,.html,.htm,.docx,.xlsx,.pptx');fileInput.addEventListener('change',async event=>{event.stopImmediatePropagation();const files=[...(event.target.files||[])];if(!files.length)return;const stored=getJson(DOC_KEY,[]);let ok=0,failed=0;status.textContent='Đang đọc tài liệu Office…';for(const file of files){const extension=file.name.split('.').pop()?.toLowerCase()||'';try{let text='';if(['docx','xlsx','pptx'].includes(extension))text=await parseOfficeFile(file);else if(['txt','md','csv','tsv','json','xml','html','htm'].includes(extension))text=(await file.text()).slice(0,180000);else throw new Error('UNSUPPORTED_FILE');stored.unshift({id:makeId(),name:file.name,status:'draft',blocked:false,text:String(text).slice(0,180000),parser:['docx','xlsx','pptx'].includes(extension)?'office-client-v19':'browser-text',at:new Date().toISOString()});ok++}catch(error){console.error('office_ingest_error',{name:file.name,error:String(error?.message||error)});stored.unshift({id:makeId(),name:file.name,status:'draft',blocked:true,text:'',parser:'failed',at:new Date().toISOString()});failed++}}setJson(DOC_KEY,stored.slice(0,120));window.renderDocs?.();fileInput.value='';status.textContent='Sẵn sàng';window.toast?.(`Đã nạp ${ok} tài liệu Draft${failed?` · ${failed} lỗi`:''}. Cần duyệt trước khi dùng.`)},true)}

voice.addEventListener('state',e=>{const state=e.detail.state;voiceButton.dataset.state=state;if(state==='connected')status.textContent='XiaoZhi realtime · đã kết nối';else if(state==='browser-listening')status.textContent=continuousVoice?'Voice · đang nghe liên tục…':'Đang nghe…';else if(state==='fallback')status.textContent='Voice Hybrid · Browser + Office Brain'});
voice.addEventListener('partial',e=>{if(input&&!speaking)input.value=e.detail.text||''});
voice.addEventListener('transcript',async e=>{if(Date.now()<ignoreTranscriptUntil||speaking||processing)return;const text=String(e.detail.text||'').trim();if(!text)return;if(input)input.value=text;if(continuousVoice)voice.stopBrowserListening();await handleMessage(text,{spoken:true})});
voice.addEventListener('assistant',e=>{const text=String(e.detail?.text||e.detail?.message||'').trim();if(text){renderAnswer(text,[]);saveTurn('assistant',text,{intent:'xiaozhi_external'});speakThenResume(text)}});
function toggleContinuousVoice(event){event?.preventDefault?.();event?.stopImmediatePropagation?.();continuousVoice=!continuousVoice;localStorage.setItem(VOICE_KEY,continuousVoice?'1':'0');voiceButton.dataset.mode=continuousVoice?'continuous':'off';if(!continuousVoice){window.speechSynthesis?.cancel();voice.stopBrowserListening();status.textContent='Hội thoại giọng nói đã tắt';return}if(provider.xiaozhi?.configured)voice.connect();const started=voice.startBrowserListening();status.textContent=started?'Voice · đang nghe liên tục…':'Hãy cấp quyền microphone để bắt đầu'}
voiceButton.addEventListener('click',toggleContinuousVoice,true);legacyMic?.addEventListener('click',toggleContinuousVoice,true);
if(sendButton)sendButton.addEventListener('click',async event=>{event.preventDefault();event.stopImmediatePropagation();const text=input?.value||'';if(input)input.value='';await handleMessage(text,{spoken:false})},true);
if(input)input.addEventListener('keydown',async event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.stopImmediatePropagation();const text=input.value;input.value='';await handleMessage(text,{spoken:false})}},true);

wrapApprovalHooks();setTimeout(wrapApprovalHooks,500);if(provider.xiaozhi?.configured)voice.connect();voiceButton.dataset.mode=continuousVoice?'continuous':'off';
const caps=[provider.gemini?.configured?'AI reasoning ON':'Local safe engine',provider.googleWorkspace?.configured?'Workspace ON':'Workspace chưa nối',provider.xiaozhi?.configured?'XiaoZhi ON':'Voice fallback','Client Office Engine ON'].join(' · ');
status.textContent=`v${RELEASE} · ${caps}`;
if(bubble)bubble.textContent='v1.9.2 đã kích hoạt: tự phân loại ý định, thực hiện phần an toàn, QA, đọc DOCX/XLSX/PPTX và tạo sản phẩm Office có cấu trúc; chỉ dừng trước hành động không thể hoàn tác.';
window.AIOfficeV19={install,voice,handleMessage,classifyIntent,gatherSources,loadHistory,executeTask,createClientArtifact,parseOfficeFile,runLocalDataOperation};
