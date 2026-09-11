const VERSION='2.6.3-client-research-safety-guard';
const STOPWORDS=new Set(['ai','gi','nao','la','co','khong','toi','ban','cho','biet','ve','cua','va','voi','mot','nhung','cac','nay','do','tai','tu','den','the','nhu','duoc','hay','can','muon','xin','vui','long','giup','theo','nguoi','dan','nen','lam','de']);
const OFFICIAL_DOMAINS=['moh.gov.vn','chinhphu.vn','vanban.chinhphu.vn','vbpl.vn'];
let installed=false;

function normalize(text=''){
  return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}
function terms(text=''){
  return normalize(text).split(/[^a-z0-9]+/).filter(word=>word.length>2&&!STOPWORDS.has(word)).slice(0,20);
}
function officialIntent(text=''){
  const n=normalize(text);
  return ['bo y te','chinh phu','quoc hoi','ubnd','uy ban nhan dan','nguon chinh thuc','van ban phap luat','nghi dinh','thong tu','quyet dinh'].some(hint=>n.includes(hint));
}
function sourceDomain(source={}){
  try{return new URL(source?.url||'').hostname.toLowerCase()}catch{return String(source?.domain||'').toLowerCase()}
}
function officialSource(source={}){
  const domain=sourceDomain(source);
  return OFFICIAL_DOMAINS.some(allowed=>domain===allowed||domain.endsWith(`.${allowed}`));
}
function sourceOrigin(source={}){
  const origin=String(source?.sourceOrigin||'').toLowerCase();
  const kind=String(source?.kind||'').toLowerCase();
  if(origin==='drive'||/drive/.test(kind))return'drive';
  if(origin==='local'||/local/.test(kind))return'local';
  return'external';
}
function coverage(query,source={}){
  const q=terms(query);
  const title=normalize(`${source?.title||''} ${source?.source||''}`);
  const body=normalize(source?.text||source?.snippet||'');
  const matched=q.filter(term=>title.includes(term)||body.includes(term));
  let score=matched.length;
  for(const term of q)if(title.includes(term))score+=2;
  for(let i=0;i<q.length-1;i++){
    const phrase=`${q[i]} ${q[i+1]}`;
    if(title.includes(phrase))score+=5;
    else if(body.includes(phrase))score+=2;
  }
  const minMatched=q.length>=8?3:q.length>=4?2:1;
  return{matched:matched.length,score,pass:matched.length>=minMatched&&score>=minMatched+1};
}
function trustedMedical(source={}){
  const domain=sourceDomain(source);
  return officialSource(source)||domain==='who.int'||domain.endsWith('.who.int')||domain==='pubmed.ncbi.nlm.nih.gov'||domain.endsWith('.pubmed.ncbi.nlm.nih.gov');
}
function sanitizeHighStakesResult(query,policy={},result={}){
  const official=Boolean(policy?.officialOnly||officialIntent(query));
  const medical=policy?.mode==='medical_question';
  if(!official&&!medical)return result;

  const provider=String(result?.provider||'').toLowerCase();
  const grounded=/gemini-google-search|grounded/.test(provider);
  const input=Array.isArray(result?.sources)?result.sources:[];
  const safeSources=input.filter(source=>{
    const origin=sourceOrigin(source);
    if(origin==='drive'||origin==='local')return true;
    const rel=coverage(query,source);
    if(!rel.pass)return false;
    if(official&&!grounded)return officialSource(source);
    if(medical&&!grounded)return trustedMedical(source);
    return true;
  });

  const relevantExternal=safeSources.filter(source=>sourceOrigin(source)==='external');
  const relevantCanonical=safeSources.filter(source=>sourceOrigin(source)!=='external');
  const endpoint=String(result?.endpointAnswer||'').trim();
  const acceptable=Boolean(endpoint&&(relevantExternal.length||relevantCanonical.length));
  if(acceptable)return{...result,sources:safeSources,safetyGuard:{pass:true,official,medical,grounded,version:VERSION}};

  const reason=official
    ? 'Tôi chưa có nguồn chính thức đủ liên quan để trả lời câu hỏi này một cách đáng tin cậy. Tôi không dùng Wikipedia hoặc nội dung lạc đề để thay thế nguồn chính thức.'
    : 'Tôi chưa có nguồn y khoa đủ liên quan để trả lời chắc chắn. Tôi không ghép các đoạn thông tin không liên quan hoặc suy đoán.';
  return{
    ...result,
    sources:safeSources,
    endpointAnswer:reason,
    provider:'client-safety-guard',
    limitations:[...(result?.limitations||[]),'CLIENT_HIGH_STAKES_RELEVANCE_GUARD'],
    safetyGuard:{pass:false,official,medical,grounded,version:VERSION}
  };
}

export function installResearchSafetyGuard(){
  if(installed)return true;
  const router=window.AIOfficeV20;
  if(!router?.gatherSources||!router?.classifySourcePolicy)return false;
  const previousGather=router.gatherSources.bind(router);
  const previousClassify=router.classifySourcePolicy.bind(router);

  router.classifySourcePolicy=(text,baseIntent={})=>{
    const policy=previousClassify(text,baseIntent);
    if(!officialIntent(text))return policy;
    return{...policy,useWeb:true,officialOnly:true,officialIntent:true,priority:['official_web',...(policy?.priority||[])]};
  };
  router.gatherSources=async(text,policy)=>{
    const effective=officialIntent(text)?{...(policy||router.classifySourcePolicy(text,{kind:'question'})),useWeb:true,officialOnly:true,officialIntent:true}:policy;
    const result=await previousGather(text,effective);
    return sanitizeHighStakesResult(text,effective||{},result||{});
  };

  installed=true;
  window.AIOfficeResearchSafetyV263={version:VERSION,officialIntent,coverage,sanitizeHighStakesResult};
  return true;
}

window.AIOfficeResearchSafetyVersion=VERSION;
