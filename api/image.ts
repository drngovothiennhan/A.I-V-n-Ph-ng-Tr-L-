const MAX_PROMPT = 5000;
const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';
const GROUNDED_IMAGE_MODEL = 'gemini-3.1-flash-image';
const RATIOS = new Set(['1:1','3:2','2:3','3:4','4:3','4:5','5:4','9:16','16:9','21:9']);

function clean(value, max=MAX_PROMPT) {
  return String(value ?? '').replace(/\0/g,'').replace(/\s+/g,' ').trim().slice(0,max);
}
function safeName(value='AI-Office-Image') {
  return clean(value,100).replace(/[\\/:*?"<>|]/g,'-') || 'AI-Office-Image';
}
function modelFor(grounded=false) {
  if (grounded) return process.env.AI_OFFICE_GEMINI_GROUNDED_IMAGE_MODEL || GROUNDED_IMAGE_MODEL;
  return process.env.AI_OFFICE_GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
}

export default async function handler(req,res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  }
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) return res.status(503).json({error:'IMAGE_PROVIDER_NOT_CONFIGURED'});

  const prompt = clean(req.body?.prompt);
  if (!prompt) return res.status(400).json({error:'PROMPT_REQUIRED'});
  const aspectRatio = RATIOS.has(String(req.body?.aspectRatio || '')) ? String(req.body.aspectRatio) : '16:9';
  const grounded = Boolean(req.body?.grounded);
  const model = modelFor(grounded);
  const fileName = `${safeName(req.body?.title || 'AI-Office-Image')}.png`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`;
    const generationConfig = {
      responseModalities:['IMAGE'],
      responseFormat:{image:{aspectRatio,imageSize:'1K'}}
    };
    const payload = {
      contents:[{parts:[{text:`Tạo một hình ảnh chuyên nghiệp, sạch, hiện đại, phù hợp môi trường hành chính/văn phòng. Bám sát yêu cầu, không tự thêm số liệu, huy hiệu, logo, con dấu, chữ ký hoặc biểu tượng cơ quan nhà nước nếu người dùng không cung cấp. Nếu có chữ tiếng Việt, ưu tiên ngắn, rõ, dễ đọc.\n\nYÊU CẦU: ${prompt}`}]}],
      generationConfig
    };
    if (grounded) payload.tools = [{google_search:{}}];

    const upstream = await fetch(endpoint,{
      method:'POST',
      headers:{'content-type':'application/json','x-goog-api-key':key},
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(45000)
    });
    if (!upstream.ok) {
      const errorText = clean(await upstream.text(),500);
      console.error('image_generation_upstream_error',{status:upstream.status,model,error:errorText});
      return res.status(502).json({error:'IMAGE_GENERATION_FAILED',status:upstream.status,model});
    }
    const data = await upstream.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(part => part?.inlineData?.data || part?.inline_data?.data);
    const inline = imagePart?.inlineData || imagePart?.inline_data;
    if (!inline?.data) return res.status(502).json({error:'IMAGE_NOT_RETURNED',model});

    const mime = clean(inline.mimeType || inline.mime_type || 'image/png',80);
    const buffer = Buffer.from(inline.data,'base64');
    if (!buffer.length) return res.status(502).json({error:'EMPTY_IMAGE',model});

    res.setHeader('cache-control','no-store');
    res.setHeader('content-type',mime.startsWith('image/') ? mime : 'image/png');
    res.setHeader('content-disposition',`attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('x-ai-provider','gemini');
    res.setHeader('x-ai-model',model);
    res.setHeader('x-ai-cost-tier',grounded ? 'image-grounded' : 'image-economy');
    return res.status(200).send(buffer);
  } catch(error) {
    console.error('image_generation_error',{message:String(error?.message || error).slice(0,220)});
    return res.status(502).json({error:'IMAGE_GENERATION_FAILED'});
  }
}
