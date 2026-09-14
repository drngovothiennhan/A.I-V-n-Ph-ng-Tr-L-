import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import v31 from './research-v31.js';

export const VERSION='3.2.3-gemini-gateway-grounded';
const DEFAULT_GROUNDED_MODEL='google/gemini-3.5-flash-lite';
const MAX_QUERY=1800;
const REQUEST_TIMEOUT_MS=11000;

function clean(input='',max=8000){return String(input??'').replace(/\0/g,'').replace(/\s+/g,' ').trim().slice(0,max)}
function normalize(input=''){return clean(input,MAX_QUERY).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d')}
function groundedModel(){return process.env.AI_OFFICE_GEMINI_GROUNDED_MODEL||DEFAULT_GROUNDED_MODEL}
function stripMarkup(input=''){return String(input??'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\*\*/g,'').replace(/(^|\s)#{1,6}\s+/g,'$1').replace(/\s+/g,' ').trim()}
function sourceDomain(url=''){try{return new URL(url).hostname.toLowerCase()}catch{return''}}
function json(res,status,body){res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');res.setHeader('x-ai-office-fast-qa',VERSION);return res.status(status).json(body)}
function highStakes(req){const mode=clean(req.body?.mode,80);const q=normalize(req.body?.query||'');return mode==='medical_question'||req.body?.officialOnly===true||/\b(chan doan|dieu tri|thuoc|lieu dung|cap cuu|luat|phap ly|nghi dinh|thong tu|quyet dinh)\b/.test(q)}

function normalizeSources(raw=[]){
  return (Array.isArray(raw)?raw:[]).map((item,index)=>{
    const url=clean(item?.url||item?.source?.url||'',1500);
    if(!url)return null;
    return {
      kind:'grounded-web',
      source:'Google Search',
      title:clean(item?.title||item?.source?.title||`Nguồn ${index+1}`,220),
      url,
      domain:sourceDomain(url),
      text:'grounded'
    };
  }).filter(Boolean);
}

async function fastGemini(req,res){
  const query=clean(req.body?.query,MAX_QUERY);
  if(!query)return json(res,400,{error:'QUERY_REQUIRED'});
  const started=Date.now();
  const usedModel=groundedModel();
  const prompt=`Bạn là Trưởng phòng A.I của A.I Văn phòng Trợ lý. Chỉ trả lời CÂU HỎI HIỆN TẠI bên dưới, không suy diễn từ nhiệm vụ cũ, không tự đổi chủ đề và không dùng tài liệu nội bộ. Bắt buộc dùng Google Search để kiểm tra nguồn công khai trước khi kết luận. Trả lời tiếng Việt, ngắn gọn, trực tiếp, mặc định 2-5 câu. Không dùng Markdown trang trí. Không bịa. Nếu nguồn công khai không đủ rõ hoặc mâu thuẫn, nói rõ rằng cần kiểm chứng thay vì đoán.\n\nCÂU HỎI HIỆN TẠI:\n${query}`;
  try{
    const result=await generateText({
      model:usedModel,
      prompt,
      tools:{google_search:google.tools.googleSearch({})},
      maxOutputTokens:600,
      abortSignal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      providerOptions:{gateway:{only:['google']}}
    });
    const answer=stripMarkup(result?.text||'');
    const sources=normalizeSources(result?.sources||[]);
    if(!answer)return json(res,503,{error:'GEMINI_GATEWAY_EMPTY',provider:'gemini-google-search-fast',model:usedModel,attemptCount:1,verificationStatus:'needs_verification',latencyMs:Date.now()-started});
    const verified=sources.length>0;
    const finalAnswer=verified?answer:`${answer} ⚠ Cần kiểm chứng: Google Search chưa trả về nguồn trích dẫn rõ ràng cho câu trả lời này.`;
    return json(res,200,{
      configured:true,
      provider:'gemini-google-search-fast',
      transport:'vercel-ai-gateway',
      model:usedModel,
      answer:finalAnswer,
      sources,
      grounded:verified,
      groundingMode:'native-google-search-gateway',
      verificationStatus:verified?'verified':'needs_verification',
      contextPolicy:'current-query-only',
      internalOptIn:false,
      fallbackUsed:false,
      attemptCount:1,
      latencyMs:Date.now()-started
    });
  }catch(error){
    console.warn('research_v32_gateway_gemini_error',{name:clean(error?.name||'Error',80),message:clean(error?.message||error,180),model:usedModel});
    return json(res,503,{error:'GEMINI_GATEWAY_UNAVAILABLE',provider:'gemini-google-search-fast',model:usedModel,attemptCount:1,verificationStatus:'needs_verification',latencyMs:Date.now()-started});
  }
}

export default async function handler(req,res){
  if(req.method==='POST'&&req.body?.fastAnswer===true){
    if(highStakes(req))return v31(req,res);
    return fastGemini(req,res);
  }
  return v31(req,res);
}
