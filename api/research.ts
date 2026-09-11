const MAX_QUERY = 1600;
const MAX_CONTEXT = 24000;
const DEFAULT_PRIMARY_MODEL = 'gemini-3.8-flash';
const DEFAULT_ECONOMY_MODEL = 'gemini-3.5-flash-lite';
const OFFICIAL_DOMAINS = ['vbpl.vn','vanban.chinhphu.vn','chinhphu.vn','moh.gov.vn'];
const MEDICAL_DOMAINS = ['pubmed.ncbi.nlm.nih.gov','who.int','moh.gov.vn'];
const STOPWORDS = new Set(['ai','gi','nao','la','co','khong','toi','ban','cho','biet','ve','cua','va','voi','mot','nhung','cac','nay','do','tai','tu','den','the','nhu','duoc','hay','can','muon','xin','vui','long','giup','theo','nguoi','dan','nen','lam','de']);

function primaryModel() {
  return process.env.AI_OFFICE_GEMINI_MODEL || process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
}
function economyModel() {
  return process.env.AI_OFFICE_GEMINI_ECONOMY_MODEL || DEFAULT_ECONOMY_MODEL;
}
function clean(input, max = 8000) {
  return String(input ?? '').replace(/\0/g,'').replace(/\s+/g,' ').trim().slice(0,max);
}
function stripMarkup(input) {
  return String(input ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
    .replace(/\s+/g,' ').trim();
}
function normalize(input='') {
  return clean(input,16000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
}
function semanticTerms(input='') {
  return normalize(input).split(/[^a-z0-9]+/).filter(x=>x.length>2&&!STOPWORDS.has(x)).slice(0,20);
}
function json(res, status, body) {
  res.setHeader('cache-control','no-store');
  res.setHeader('x-content-type-options','nosniff');
  return res.status(status).json(body);
}
function medicalMode(mode, query) {
  return mode === 'medical_question' || /\b(bệnh|thuốc|y học|y tế|sức khỏe|điều trị|chẩn đoán|sốt|dịch|medicine|health|disease|drug)\b/i.test(query);
}
function officialIntent(query) {
  return /\b(bộ y tế|chính phủ|quốc hội|ubnd|ủy ban nhân dân|văn bản pháp luật|nghị định|thông tư|quyết định|moh\.gov\.vn|chinhphu\.vn|vbpl\.vn)\b/i.test(query);
}
function sourceDomain(url='') { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } }
function dedupe(sources=[]) {
  const seen = new Set();
  return sources.filter(s => {
    const key = `${s.url || ''}|${s.title || ''}|${String(s.text || '').slice(0,90)}`;
    if (!s.text || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function domainMatches(domain, list) {
  return list.some(d => domain === d || domain.endsWith(`.${d}`));
}
function relevance(query, source) {
  const terms = semanticTerms(query);
  const title = normalize(source?.title || '');
  const text = normalize(source?.text || '');
  const matched = terms.filter(term => title.includes(term) || text.includes(term));
  let score = matched.length;
  for (const term of terms) if (title.includes(term)) score += 2;
  for (let i=0;i<terms.length-1;i++) {
    const phrase = `${terms[i]} ${terms[i+1]}`;
    if (title.includes(phrase)) score += 5;
    else if (text.includes(phrase)) score += 2;
  }
  if (domainMatches(source?.domain || '', OFFICIAL_DOMAINS)) score += 3;
  if (domainMatches(source?.domain || '', MEDICAL_DOMAINS)) score += 3;
  const minMatched = terms.length >= 8 ? 3 : terms.length >= 4 ? 2 : 1;
  return { score, matched: matched.length, pass: matched.length >= minMatched && score >= minMatched + 1 };
}
function complexRequest(query, mode, officialOnly, driveContext=[]) {
  if (officialOnly || medicalMode(mode, query) || driveContext.length) return true;
  if (/admin|internal|legal|document/.test(mode)) return true;
  if (query.length > 520) return true;
  return /\b(phân tích|đánh giá|so sánh|tổng hợp|đề xuất|chiến lược|kiến trúc|lập luận|nguyên nhân|đa nguồn|quy định|pháp lý|an toàn|rủi ro|debug|thiết kế hệ thống)\b/i.test(query);
}
function modelForRequest(query, mode, officialOnly, driveContext=[]) {
  const primary = complexRequest(query, mode, officialOnly, driveContext);
  return { model: primary ? primaryModel() : economyModel(), costTier: primary ? 'reasoning' : 'economy' };
}

async function fetchJson(url, timeout=9000) {
  const response = await fetch(url, { headers:{'user-agent':'AI-Office-Research/2.7'}, signal:AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
  return response.json();
}
async function wiki(query, lang='vi') {
  try {
    const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    u.search = new URLSearchParams({action:'query',generator:'search',gsrsearch:query,gsrlimit:'4',prop:'extracts|info',exintro:'1',explaintext:'1',inprop:'url',format:'json',origin:'*'}).toString();
    const data = await fetchJson(u.toString());
    return Object.values(data?.query?.pages || {}).map((p) => ({kind:'web',source:`Wikipedia ${lang.toUpperCase()}`,title:p.title || '',url:p.fullurl || `https://${lang}.wikipedia.org/?curid=${p.pageid}`,domain:`${lang}.wikipedia.org`,text:stripMarkup(p.extract || '').slice(0,4000)})).filter(s=>s.text);
  } catch { return []; }
}
async function duck(query) {
  try {
    const u = new URL('https://api.duckduckgo.com/');
    u.search = new URLSearchParams({q:query,format:'json',no_html:'1',no_redirect:'1',skip_disambig:'0'}).toString();
    const data = await fetchJson(u.toString());
    if (!data?.AbstractText) return [];
    return [{kind:'web',source:data.AbstractSource || 'DuckDuckGo',title:data.Heading || query,url:data.AbstractURL || '',domain:sourceDomain(data.AbstractURL || ''),text:stripMarkup(data.AbstractText).slice(0,4000)}];
  } catch { return []; }
}
async function pubmed(query) {
  try {
    const s = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    s.search = new URLSearchParams({db:'pubmed',term:query,retmax:'5',sort:'relevance',retmode:'json'}).toString();
    const result = await fetchJson(s.toString());
    const ids = result?.esearchresult?.idlist || [];
    if (!ids.length) return [];
    const u = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
    u.search = new URLSearchParams({db:'pubmed',id:ids.join(','),retmode:'json'}).toString();
    const data = await fetchJson(u.toString());
    return ids.map(id => { const p=data?.result?.[id] || {}; return {kind:'scholarly',source:'PubMed',title:p.title || `PubMed ${id}`,url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,domain:'pubmed.ncbi.nlm.nih.gov',text:stripMarkup([p.title,p.fulljournalname,p.pubdate].filter(Boolean).join('. '))}; });
  } catch { return []; }
}
function extractive(query, sources) {
  const terms = semanticTerms(query);
  const picked=[];
  for (const source of sources.slice(0,6)) {
    const parts=stripMarkup(source.text).split(/(?<=[.!?])\s+/).filter(x=>x.length>=35&&x.length<=700);
    parts.sort((a,b)=>terms.filter(w=>normalize(b).includes(w)).length-terms.filter(w=>normalize(a).includes(w)).length);
    const candidate=parts.find(part => {
      const hay=normalize(part);
      const matched=terms.filter(term=>hay.includes(term)).length;
      const min=terms.length>=8?3:terms.length>=4?2:1;
      return matched>=min;
    });
    if (candidate) picked.push(candidate);
    if (picked.length>=4) break;
  }
  return picked.join(' ');
}
async function publicExtractive(query, mode, officialOnly) {
  const jobs=[wiki(query,'vi'),duck(query),wiki(query,'en')];
  if (medicalMode(mode,query)) jobs.unshift(pubmed(query));
  let sources=dedupe((await Promise.all(jobs)).flat());
  if (officialOnly) sources=sources.filter(s=>domainMatches(s.domain || '',OFFICIAL_DOMAINS));
  sources=sources
    .map(source=>({...source,_relevance:relevance(query,source)}))
    .filter(source=>source._relevance.pass)
    .sort((a,b)=>b._relevance.score-a._relevance.score)
    .map(({_relevance,...source})=>source);
  return { sources, answer:extractive(query,sources) };
}

async function geminiGrounded(query, mode, officialOnly, driveContext=[], useInternal=false) {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  const safeContext = useInternal && Array.isArray(driveContext) ? driveContext.slice(0,6) : [];
  const route = modelForRequest(query, mode, officialOnly, safeContext);
  const domainHint = officialOnly
    ? `Ưu tiên và kiểm chứng nguồn chính thức Việt Nam: ${OFFICIAL_DOMAINS.join(', ')}.`
    : medicalMode(mode,query)
      ? 'Ưu tiên nguồn y khoa đáng tin cậy như PubMed, WHO và Bộ Y tế; với khuyến cáo cho người dân Việt Nam ưu tiên Bộ Y tế.'
      : '';
  const maxContext = route.costTier === 'economy' ? 12000 : MAX_CONTEXT;
  const context = safeContext.map((s,i)=>`[INTERNAL-${i+1}] ${clean(s?.title,180)}\n${clean(s?.text,4500)}`).join('\n\n').slice(0,maxContext);
  const sourceRule = useInternal
    ? 'Người dùng đã bật tài liệu nội bộ. Hãy dùng Google Search làm nguồn công khai chính, đồng thời đối chiếu INTERNAL CONTEXT. Nêu rõ nếu nội bộ và nguồn công khai khác nhau; không coi nội bộ là đúng nếu bằng chứng web đáng tin cậy mâu thuẫn.'
    : 'Người dùng chưa bật tài liệu nội bộ. Tuyệt đối không suy đoán, yêu cầu hoặc sử dụng Drive/local/internal context; chỉ dùng Google Search và kiến thức mô hình để tổng hợp.';
  const prompt = `Bạn là Trưởng phòng A.I của A.I Văn phòng Trợ lý. Trả lời bằng tiếng Việt, trực tiếp, chính xác, bám sát ngữ cảnh và ưu tiên tốc độ. Mặc định phải dùng Google Search để tìm/kiểm chứng thông tin công khai. ${domainHint}\n${sourceRule}\nKhông bịa dữ kiện. Không xuất raw HTML/XML/JS. Nếu không đủ căn cứ, nói rõ giới hạn. Khi có INTERNAL CONTEXT, chỉ dùng đoạn thực sự liên quan và phải đối chiếu với web trước khi kết luận.\n\nCÂU HỎI: ${clean(query,MAX_QUERY)}\n\nINTERNAL CONTEXT (${useInternal?'OPT-IN':'DISABLED'}):\n${useInternal ? context : ''}`;
  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(route.model)}:generateContent`);
  const response = await fetch(endpoint,{
    method:'POST',
    headers:{'content-type':'application/json','x-goog-api-key':key},
    body:JSON.stringify({
      contents:[{role:'user',parts:[{text:prompt}]}],
      tools:[{google_search:{}}],
      generationConfig:{maxOutputTokens:route.costTier==='economy'?1600:3000}
    }),
    signal:AbortSignal.timeout(route.costTier==='economy'?18000:30000)
  });
  if (!response.ok) {
    console.warn('gemini_grounding_rejected',{status:response.status,model:route.model});
    return null;
  }
  const data = await response.json();
  const candidate=data?.candidates?.[0] || {};
  const answer=stripMarkup(candidate?.content?.parts?.map(p=>p?.text || '').join('') || '');
  const chunks=candidate?.groundingMetadata?.groundingChunks || [];
  const sources=chunks.map((c,i)=>({kind:'grounded-web',source:'Google Search',title:clean(c?.web?.title || `Nguồn ${i+1}`,240),url:clean(c?.web?.uri || '',2048),domain:sourceDomain(c?.web?.uri || ''),text:'grounded'})).filter(s=>s.url);
  const sourceRequired = officialOnly || medicalMode(mode,query);
  if (!answer || (sourceRequired && !sources.length)) {
    console.warn('gemini_grounding_insufficient',{model:route.model,sourceRequired,sourceCount:sources.length,finishReason:candidate?.finishReason || null});
    return null;
  }
  return {
    provider:'gemini-google-search',
    model:route.model,
    costTier:route.costTier,
    answer,
    sources,
    grounded:true,
    sourceMode:useInternal?'gemini-web+internal-opt-in':'gemini-web-only'
  };
}

export default async function handler(req,res) {
  if (req.method !== 'POST') return json(res,405,{error:'METHOD_NOT_ALLOWED'});
  const query=clean(req.body?.query,MAX_QUERY);
  if (!query) return json(res,400,{error:'QUERY_REQUIRED'});
  const mode=clean(req.body?.mode,80) || 'general_question';
  const officialOnly=Boolean(req.body?.officialOnly) || officialIntent(query);
  const useInternal=req.body?.useInternal === true;
  const suppliedContext=Array.isArray(req.body?.driveContext) ? req.body.driveContext.slice(0,6) : [];
  const driveContext=useInternal ? suppliedContext : [];
  const limitations=[];
  if (!useInternal && suppliedContext.length) limitations.push('INTERNAL_CONTEXT_IGNORED_WITHOUT_OPT_IN');

  try {
    // Gemini + Google Search is the default synthesis path for every externally answerable query.
    const grounded=await geminiGrounded(query,mode,officialOnly,driveContext,useInternal);
    if (grounded) return json(res,200,{configured:true,...grounded,internalOptIn:useInternal,limitations});

    // Deterministic public retrieval is fallback only when Gemini is unavailable or grounding fails.
    const fallback=await publicExtractive(query,mode,officialOnly);
    const safeAnswer=fallback.answer || '';
    return json(res,200,{
      configured:true,
      provider:'public-extractive-fallback',
      costTier:'zero-model',
      geminiConfigured:Boolean(process.env.GEMINI_API_KEY),
      primaryModel:primaryModel(),
      economyModel:economyModel(),
      answer:safeAnswer,
      sources:fallback.sources.slice(0,8),
      sourceMode:'public-fallback-no-internal',
      internalOptIn:useInternal,
      limitations:[...limitations,...(safeAnswer
        ? ['Gemini grounding không khả dụng; câu trả lời dùng fallback public đã vượt relevance gate. Tài liệu nội bộ không được gửi sang fallback.']
        : ['Không có nguồn đủ liên quan để trả lời an toàn; hệ thống không tạo câu trả lời suy đoán.'])]
    });
  } catch(error) {
    console.error('research_v27_error',{message:String(error?.message || error).slice(0,220)});
    return json(res,502,{error:'RESEARCH_FAILED'});
  }
}
