const RELEASE='1.9.3';

function sourceRef(){
  const ref=String(process.env.AI_OFFICE_SOURCE_COMMIT||process.env.VERCEL_GIT_COMMIT_SHA||'').trim();
  return /^[0-9a-f]{40}$/i.test(ref)?ref:'main';
}

function officeShellHtml(){
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f6f8ff"><link rel="manifest" href="/manifest.webmanifest"><link rel="modulepreload" href="/src/office-os/production-entry-v1.js?v=100"><title>A.I Văn phòng · Personal Office OS</title><style>:root{color-scheme:light}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#f5f7fb;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#18223b}#aiOfficeOSBoot{min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#f4f6fb,#fbfcfe)}#aiOfficeOSBoot>div{width:min(430px,92vw);padding:24px;border:1px solid #e4e9f2;border-radius:22px;background:#fff;box-shadow:0 12px 34px #24375c0b}#aiOfficeOSBoot b{display:block;font-size:14px;letter-spacing:.08em;color:#315fe8}#aiOfficeOSBoot span{display:block;margin-top:8px;font-size:12px;line-height:1.5;color:#718099}#aiOfficeOSBoot[data-state="failed"] b{color:#b74253}</style></head><body><div id="aiOfficeOSBoot" role="status" aria-live="polite"><div><b>PERSONAL A.I OFFICE OS</b><span data-ai-office-boot-text>Đang mở văn phòng của bạn…</span></div></div><script type="module" src="/src/office-os/production-entry-v1.js?v=100"></script></body></html>`;
}

export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  const ref=sourceRef();
  res.setHeader('content-type','text/html; charset=utf-8');
  res.setHeader('cache-control','public, max-age=0, s-maxage=30, stale-while-revalidate=300');
  res.setHeader('x-ai-office-ui-source-ref',ref);
  res.setHeader('x-ai-office-production-entry','office-os-p4');
  if(req.method==='HEAD')return res.status(200).end();
  return res.status(200).send(officeShellHtml());
}
