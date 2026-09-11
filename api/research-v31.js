import v30 from './research-v30.js';

const VERSION='3.1.1-provider-health-aware';
const DEFAULT_MODEL='gemini-3.8-flash';
const FRESH_HINTS=['moi nhat','hom nay','hien nay','gan day','vua ','tin moi','tin tuc','thoi su','latest','today','recent','news'];
const STOPWORDS=new Set(['moi','nhat','hom','nay','hien','gan','day','vua','tin','tuc','thoi','su','latest','today','recent','news','la','gi','ve','cua','va','cho','biet','nhung','cac','mot','theo']);
const GEMINI_CIRCUIT_STATUSES=new Set([401,403,429]);

function clean(input,max=8000){return String(input??'').replace(/\0/g,'').replace(/\s+/g,' ').trim().slice(0,max)}
function normalize(input=''){return clean(input,16000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d')}
function robustLatest(text=''){const n=normalize(text);return FRESH_HINTS.some(h=>n.includes(h))}
function medicalMode(mode,query){return mode==='medical_question'||/(benh|thuoc|y hoc|y te|suc khoe|dieu tri|chan doan|medicine|health|disease|drug)/i.test(normalize(query))}
function officialIntent(query){return /(bo y te|chinh phu|quoc hoi|ubnd|uy ban nhan dan|van ban phap luat|nghi dinh|thong tu|quyet dinh|moh\.gov\.vn|chinhphu\.vn|vbpl\.vn)/i.test(normalize(query))}
function decodeEntities(input=''){return String(input).replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&#x27;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)||32))}
function stripMarkup(input=''){return decodeEntities(String(input)).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function sourceDomain(url=''){try{return new URL(url).hostname.toLowerCase()}catch{return''}}
function json(res,status,body){res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');res.setHeader('x-ai-office-freshness-entry',VERSION);return res.status(status).json(body)}
function model(){return process.env.AI_OFFICE_GEMINI_MODEL||process.env.GEMINI_MODEL||DEFAULT_MODEL}
function semanticTerms(query){return normalize(query).split(/[^a-z0-9]+/).filter(x=>x.length>2&&!STOPWORDS.has(x)).slice(0,14)}
function relevant(query,source){const terms=semanticTerms(query);if(!terms.length)return true;const hay=normalize(`${source.title||''} ${source.text||''}`);const matched=terms.filter(t=>hay.includes(t)).length;return matched>=Math.min(2,Math.max(1,Math.ceil(terms.length/4)))}
function circuitRejected(result){return Boolean(result?.rejected&&GEMINI_CIRCUIT_STATUSES.has(Number(result?.status)))}

async function fetchText(url,timeout=8000){const r=await fetch(url,{headers:{'user-agent':`AI-Office-Research/${VERSION}`,'accept-language':'vi-VN,vi;q=0.9,en;q=0.7'},signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error(`UPSTREAM_${r.status}`);return r.text()}
async function googleNews(query){try{const u=new URL('https://news.google.com/rss/search');u.search=new URLSearchParams({q:query,hl:'vi',gl:'VN',ceid:'VN:vi'}).toString();const xml=await fetchText(u.toString(),8000);return[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0,8).map(m=>{const b=m[1];const title=stripMarkup(b.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'');const url=decodeEntities(b.match(/<link>([\s\S]*?)<\/link>/i)?.[1]||'').trim();const text=stripMarkup(b.match(/<description>([\s\S]*?)<\/description>/i)?.[1]||title);const publishedAt=stripMarkup(b.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]||'');return{kind:'news-search',source:'Google News RSS',title,url,domain:sourceDomain(url),text:clean(text,1000),publishedAt}}).filter(s=>s.title&&s.url&&s.text&&!/(^|\.)wikipedia\.org$/i.test(s.domain||''));}catch(error){console.warn('research_v31_news_fetch_failed',{message:String(error?.message||error).slice(0,120)});return[]}}

async function gemini(prompt,{search=false,timeout=12000,maxOutputTokens=1100}={}){const key=process.env.GEMINI_API_KEY||'';if(!key)return null;try{const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent`;const body={contents:[{role:'user',parts:[{text:clean(prompt,14000)}]}],generationConfig:{maxOutputTokens}};if(search)body.tools=[{google_search:{}}];const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});if(!r.ok){console.warn('research_v31_gemini_rejected',{status:r.status,search});return{rejected:true,status:r.status}}const data=await r.json();const c=data?.candidates?.[0]||{};const answer=stripMarkup(c?.content?.parts?.map(p=>p?.text||'').join('')||'');const chunks=c?.groundingMetadata?.groundingChunks||[];return answer?{answer,chunks}:null}catch(error){console.warn('research_v31_gemini_timeout_or_error',{search,message:String(error?.message||error).slice(0,120)});return null}}

function sourcePack(sources){return sources.slice(0,5).map((s,i)=>`[${i+1}] ${clean(s.title,240)}${s.publishedAt?` | ${clean(s.publishedAt,90)}`:''}\nURL: ${clean(s.url,1000)}\nTÓM TẮT NGUỒN: ${clean(s.text,850)}`).join('\n\n')}
function deterministicAnswer(sources){const rows=sources.slice(0,5).map((s,i)=>`${i+1}. ${s.title}${s.publishedAt?` — ${s.publishedAt}`:''}`);return `Các nguồn thời sự mới nhất tôi truy xuất được:\n${rows.join('\n')}\n\nGemini đang tạm không hoàn tất bước tổng hợp trong giới hạn thời gian hoặc quota, nên tôi giữ nguyên tiêu đề và thời điểm nguồn thay vì suy đoán nội dung.`}

async function latestHandler(req,res){const original=clean(req.body?.query,1600);const mode=clean(req.body?.mode,80)||'general_question';const useInternal=req.body?.useInternal===true;const supplied=Array.isArray(req.body?.driveContext)?req.body.driveContext.slice(0,5):[];const limitations=[];if(!useInternal&&supplied.length)limitations.push('INTERNAL_CONTEXT_IGNORED_WITHOUT_OPT_IN');
  // High-stakes fresh queries keep the established v3.0 safety path (official/PubMed gates).
  if(medicalMode(mode,original)||Boolean(req.body?.officialOnly)||officialIntent(original))return v30(req,res);
  const nativePrompt=`Bạn là Trưởng phòng A.I. Dùng Google Search để trả lời thông tin MỚI NHẤT bằng tiếng Việt cho câu hỏi sau. Không dùng tài liệu nội bộ trừ khi người dùng bật rõ. CÂU HỎI: ${original}`;
  const native=await gemini(nativePrompt,{search:true,timeout:9000,maxOutputTokens:1200});
  const providerCircuitOpen=circuitRejected(native);
  if(native?.rejected)limitations.push(`GEMINI_GROUNDING_REJECTED_${Number(native.status)||'UNKNOWN'}`);
  if(providerCircuitOpen)limitations.push('GEMINI_SECOND_CALL_SKIPPED_PROVIDER_UNHEALTHY');
  if(native?.answer&&native.chunks?.length){const sources=native.chunks.map((c,i)=>({kind:'grounded-web',source:'Google Search',title:clean(c?.web?.title||`Nguồn ${i+1}`,220),url:clean(c?.web?.uri||'',1200),domain:sourceDomain(c?.web?.uri||''),text:'grounded'})).filter(s=>s.url&&!/(^|\.)wikipedia\.org$/i.test(s.domain||''));if(sources.length)return json(res,200,{configured:true,provider:'gemini-google-search',model:model(),answer:native.answer,sources,grounded:true,groundingMode:'native-google-search',freshnessPolicy:'latest-only-v31',internalOptIn:useInternal,providerHealth:'healthy',limitations});}
  let sources=(await googleNews(original)).filter(s=>relevant(original,s)).slice(0,6);
  if(!sources.length)sources=(await googleNews(`${original} trí tuệ nhân tạo`)).filter(s=>relevant(original,s)).slice(0,6);
  if(!sources.length)return json(res,200,{configured:true,provider:'fresh-source-unavailable',answer:'Chưa tìm thấy nguồn thời sự đủ liên quan để trả lời chắc chắn.',sources:[],grounded:false,freshnessPolicy:'latest-only-v31',internalOptIn:useInternal,providerHealth:providerCircuitOpen?'degraded':'unknown',limitations:[...limitations,'NO_FRESH_RELEVANT_SOURCE']});
  const internal=useInternal?supplied.map((s,i)=>`[INTERNAL-${i+1}] ${clean(s?.title,160)}\n${clean(s?.text,1500)}`).join('\n\n').slice(0,5000):'';
  const prompt=`Bạn là Trưởng phòng A.I. Native Google Search Grounding đang tạm không khả dụng. Hãy tổng hợp ngắn gọn CHỈ từ PUBLIC FRESH EVIDENCE bên dưới. Không dùng kiến thức bách khoa/lịch sử thay thế tin mới. Trả lời bằng tiếng Việt, ưu tiên 3-5 ý có giá trị nhất, ghi ngày/thời điểm khi nguồn có, gắn [1], [2] theo nguồn. Không bịa. ${useInternal?'Có thể đối chiếu INTERNAL CONTEXT vì người dùng đã bật.':'Không được dùng tài liệu nội bộ.'}\nCÂU HỎI: ${original}\nPUBLIC FRESH EVIDENCE:\n${sourcePack(sources)}\nINTERNAL CONTEXT:\n${internal}`;
  const generated=providerCircuitOpen?null:await gemini(prompt,{search:false,timeout:14000,maxOutputTokens:1200});
  if(generated?.answer)return json(res,200,{configured:true,provider:'gemini-fresh-search-synthesis-v31',model:model(),answer:generated.answer,sources,grounded:true,groundingMode:'google-news-gemini-synthesis',freshnessPolicy:'latest-only-v31',internalOptIn:useInternal,providerHealth:'degraded-grounding-only',limitations:[...limitations,'NATIVE_GOOGLE_SEARCH_GROUNDING_UNAVAILABLE_USING_FRESH_PUBLIC_RETRIEVAL']});
  return json(res,200,{configured:true,provider:'fresh-news-extractive-v31',answer:deterministicAnswer(sources),sources,grounded:true,groundingMode:'google-news-deterministic-fallback',freshnessPolicy:'latest-only-v31',internalOptIn:useInternal,providerHealth:providerCircuitOpen?'degraded':'unknown',limitations:[...limitations,providerCircuitOpen?'GEMINI_PROVIDER_UNHEALTHY_USING_DETERMINISTIC_FALLBACK':'GEMINI_SYNTHESIS_TIMEOUT_OR_UNAVAILABLE']});
}

export default async function handler(req,res){if(req.method!=='POST')return v30(req,res);const query=clean(req.body?.query,1600);if(!robustLatest(query))return v30(req,res);return latestHandler(req,res)}
export {VERSION,robustLatest,circuitRejected};
