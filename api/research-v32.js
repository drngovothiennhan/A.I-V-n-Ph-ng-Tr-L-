import v31 from './research-v31.js';

export const VERSION='3.2.1-gemini-fast-qa-quota-fallback';
const DEFAULT_MODEL='gemini-3.8-flash';
const DEFAULT_ECONOMY_MODEL='gemini-3.5-flash-lite';
const MAX_QUERY=1800;
const TOTAL_DEADLINE_MS=11500;

function clean(input='',max=8000){return String(input??'').replace(/\0/g,'').replace(/\s+/g,' ').trim().slice(0,max)}
function normalize(input=''){return clean(input,MAX_QUERY).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d')}
function model(){return process.env.AI_OFFICE_GEMINI_MODEL||process.env.GEMINI_MODEL||DEFAULT_MODEL}
function economyModel(){return process.env.AI_OFFICE_GEMINI_ECONOMY_MODEL||DEFAULT_ECONOMY_MODEL}
function modelOrder(){return [...new Set([model(),economyModel()].map(value=>clean(value,120)).filter(Boolean))]}
function stripMarkup(input=''){return String(input??'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\*\*/g,'').replace(/(^|\s)#{1,6}\s+/g,'$1').replace(/\s+/g,' ').trim()}
function sourceDomain(url=''){try{return new URL(url).hostname.toLowerCase()}catch{return''}}
function json(res,status,body){res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');res.setHeader('x-ai-office-fast-qa',VERSION);return res.status(status).json(body)}
function highStakes(req){const mode=clean(req.body?.mode,80);const q=normalize(req.body?.query||'');return mode==='medical_question'||req.body?.officialOnly===true||/\b(chan doan|dieu tri|thuoc|lieu dung|cap cuu|luat|phap ly|nghi dinh|thong tu|quyet dinh)\b/.test(q)}
function retryableStatus(status){return [404,408,429,500,502,503,504].includes(Number(status))}

function groundedResult(data,usedModel,started,attempts){
  const candidate=data?.candidates?.[0]||{};
  const answer=stripMarkup(candidate?.content?.parts?.map(part=>part?.text||'').join('')||'');
  const sources=(candidate?.groundingMetadata?.groundingChunks||[]).map((chunk,index)=>({
    kind:'grounded-web',
    source:'Google Search',
    title:clean(chunk?.web?.title||`Nguồn ${index+1}`,220),
    url:clean(chunk?.web?.uri||'',1500),
    domain:sourceDomain(chunk?.web?.uri||''),
    text:'grounded'
  })).filter(source=>source.url);
  if(!answer)return null;
  const verified=sources.length>0;
  const finalAnswer=verified?answer:`${answer} ⚠ Cần kiểm chứng: Google Search chưa trả về nguồn trích dẫn rõ ràng cho câu trả lời này.`;
  return {
    configured:true,
    provider:'gemini-google-search-fast',
    model:usedModel,
    answer:finalAnswer,
    sources,
    grounded:verified,
    groundingMode:'native-google-search-fast',
    verificationStatus:verified?'verified':'needs_verification',
    contextPolicy:'current-query-only',
    internalOptIn:false,
    fallbackUsed:attempts.length>1,
    attemptCount:attempts.length,
    latencyMs:Date.now()-started
  };
}

async function generateWithModel({key,prompt,usedModel,timeoutMs}){
  const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(usedModel)}:generateContent`;
  const response=await fetch(endpoint,{
    method:'POST',
    headers:{'content-type':'application/json','x-goog-api-key':key},
    body:JSON.stringify({
      contents:[{role:'user',parts:[{text:prompt}]}],
      tools:[{google_search:{}}],
      generationConfig:{maxOutputTokens:600}
    }),
    signal:AbortSignal.timeout(Math.max(1000,timeoutMs))
  });
  if(!response.ok)return {ok:false,status:response.status};
  return {ok:true,status:response.status,data:await response.json()};
}

async function fastGemini(req,res){
  const query=clean(req.body?.query,MAX_QUERY);
  if(!query)return json(res,400,{error:'QUERY_REQUIRED'});
  const key=String(process.env.GEMINI_API_KEY||'').trim();
  if(!key)return json(res,503,{error:'GEMINI_NOT_CONFIGURED',provider:'gemini-google-search-fast',verificationStatus:'needs_verification'});
  const started=Date.now();
  const prompt=`Bạn là Trưởng phòng A.I của A.I Văn phòng Trợ lý. Chỉ trả lời CÂU HỎI HIỆN TẠI bên dưới, không suy diễn từ nhiệm vụ cũ, không tự đổi chủ đề và không dùng tài liệu nội bộ. Bắt buộc dùng Google Search để kiểm tra nguồn công khai trước khi kết luận. Trả lời tiếng Việt, ngắn gọn, trực tiếp, mặc định 2-5 câu. Không dùng Markdown trang trí. Không bịa. Nếu nguồn công khai không đủ rõ hoặc mâu thuẫn, nói rõ rằng cần kiểm chứng thay vì đoán.\n\nCÂU HỎI HIỆN TẠI:\n${query}`;
  const attempts=[];
  for(const usedModel of modelOrder()){
    const elapsed=Date.now()-started;
    const remaining=TOTAL_DEADLINE_MS-elapsed;
    if(remaining<1000)break;
    try{
      const result=await generateWithModel({key,prompt,usedModel,timeoutMs:Math.min(7000,remaining)});
      attempts.push({model:usedModel,status:result.status});
      if(result.ok){
        const payload=groundedResult(result.data,usedModel,started,attempts);
        if(payload)return json(res,200,payload);
        console.warn('research_v32_fast_gemini_empty',{model:usedModel});
        continue;
      }
      console.warn('research_v32_fast_gemini_rejected',{status:result.status,model:usedModel});
      if(!retryableStatus(result.status))break;
    }catch(error){
      attempts.push({model:usedModel,status:'error'});
      console.warn('research_v32_fast_gemini_error',{message:String(error?.message||error).slice(0,160),model:usedModel});
    }
  }
  return json(res,503,{
    error:'GEMINI_FAST_UNAVAILABLE',
    provider:'gemini-google-search-fast',
    model:model(),
    fallbackModel:economyModel(),
    attemptCount:attempts.length,
    verificationStatus:'needs_verification',
    latencyMs:Date.now()-started
  });
}

export default async function handler(req,res){
  if(req.method==='POST'&&req.body?.fastAnswer===true){
    if(highStakes(req))return v31(req,res);
    return fastGemini(req,res);
  }
  return v31(req,res);
}
