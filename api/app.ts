const OWNER = 'drngovothiennhan';
const REPO = 'A.I-V-n-Ph-ng-Tr-L-';
const RELEASE = '1.9.3';

function sourceRef() {
  const ref = String(process.env.AI_OFFICE_SOURCE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
  return /^[0-9a-f]{40}$/i.test(ref) ? ref : 'main';
}

function sourceUrl(ref = sourceRef()) {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/index.html`;
}

function fallbackHtml(message = 'Đang khởi động A.I Văn phòng') {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>A.I Văn phòng · Personal Office OS</title><style>body{font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f6f8ff;color:#152449}.box{background:#fff;border:1px solid #e2e8f5;border-radius:18px;padding:28px;max-width:560px;box-shadow:0 14px 40px #263d7717}h1{margin:0 0 10px;font-size:24px}p{color:#66708b}</style></head><body><div class="box"><h1>Personal A.I Office OS</h1><p>${message}</p><p>Hệ thống sẽ tự tải lại.</p></div></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');
  const ref = sourceRef();
  res.setHeader('x-ai-office-ui-source-ref', ref);
  try {
    const upstream = await fetch(sourceUrl(ref), {
      headers: { 'user-agent': `AI-Office-Vercel/${RELEASE}` },
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return res.status(503).send(fallbackHtml(`Không đọc được giao diện canonical (${upstream.status}).`));
    let html = await upstream.text();
    html = html
      .replace(/A\.I Văn phòng v1\.(?:6|7|8|9(?:\.2)?)/g, `A.I Văn phòng v${RELEASE}`)
      .replace(/RELEASE 1\.(?:6|7|8|9(?:\.2)?)/g, `RELEASE ${RELEASE}`)
      .replace(/Drive Knowledge Brain · v1\.6/g, `Autonomous Office Orchestrator · v${RELEASE}`)
      .replace(/Second Brain · v1\.7/g, `Autonomous Office Orchestrator · v${RELEASE}`)
      .replace(/Continuous Second Brain · v1\.8/g, `Autonomous Office Orchestrator · v${RELEASE}`)
      .replace(/1\.6\.0 DRIVE KNOWLEDGE BRAIN/g, `${RELEASE} AUTONOMOUS OFFICE ORCHESTRATOR`)
      .replace(/1\.7\.1 SECOND BRAIN/g, `${RELEASE} AUTONOMOUS OFFICE ORCHESTRATOR`)
      .replace(/1\.8\.0 CONTINUOUS SECOND BRAIN/g, `${RELEASE} AUTONOMOUS OFFICE ORCHESTRATOR`)
      .replace('Mặc định sản phẩm: DOCX · XLSX · PPTX · PNG. Chỉ báo hoàn tất sau khi bạn duyệt.', 'Mặc định: trả lời ngắn gọn. Chỉ tạo nhiệm vụ hoặc file khi bạn yêu cầu rõ.')
      .replace(/<title>[^<]*<\/title>/i, '<title>A.I Văn phòng · Personal Office OS</title>');

    html = html
      .replace(/<script type="module" src="\/src\/canonical-input-gate-v71\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/bootstrap-v17\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/office-v2\/ui-v2-shell\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/office-v2\/lean-dashboard-v72\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/office-v2\/mobile-shell-v73\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/office-os\/office-shell-v1\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/bootstrap-v18\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/release-v193\.js(?:\?[^\"]*)?"><\/script>/g, '');

    const preloads = [
      '<link rel="modulepreload" href="/src/office-os/office-shell-v1.js?v=101">',
      '<link rel="modulepreload" href="/src/canonical-input-gate-v71.js?v=711">'
    ].join('');
    const criticalOfficeOS = '<style id="ai-office-os-critical">#app{display:none!important}#aiOfficeOSBoot{min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#f4f6fb,#fbfcfe);color:#18223b;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}#aiOfficeOSBoot>div{width:min(420px,92vw);padding:24px;border:1px solid #e4e9f2;border-radius:22px;background:#fff;box-shadow:0 12px 34px #24375c0b}#aiOfficeOSBoot b{display:block;font-size:14px;letter-spacing:.08em;color:#315fe8}#aiOfficeOSBoot span{display:block;margin-top:8px;font-size:12px;color:#718099}</style>';
    if (!html.includes('ai-office-os-critical')) {
      html = html.includes('</head>') ? html.replace('</head>', `${preloads}${criticalOfficeOS}</head>`) : `${preloads}${criticalOfficeOS}${html}`;
    }

    const bootFallback = '<div id="aiOfficeOSBoot" role="status" aria-live="polite"><div><b>PERSONAL A.I OFFICE OS</b><span>Đang mở văn phòng của bạn…</span></div></div>';
    if (!html.includes('id="aiOfficeOSBoot"')) {
      html = html.replace(/<body([^>]*)>/i, match => `${match}${bootFallback}`);
    }

    const bootChain = `<script type="module">
try { sessionStorage.setItem('ai-office-credentials-seen-v230','1'); } catch {}
try {
  await import('/src/office-os/office-shell-v1.js?v=101');
  document.getElementById('aiOfficeOSBoot')?.remove();
} catch (error) {
  console.error('ai_office_os_primary_boot_failed', { message:String(error?.message || error).slice(0,220) });
  const boot=document.getElementById('aiOfficeOSBoot');
  if(boot) boot.innerHTML='<div><b>PERSONAL A.I OFFICE OS</b><span>Không tải được giao diện mới. Hãy tải lại trang.</span></div>';
  throw error;
}
await import('/src/canonical-input-gate-v71.js?v=711');
await import('/src/bootstrap-v18.js?v=193');
await import('/src/release-v193.js?v=195');
</script>`;
    html = html.includes('</body>') ? html.replace('</body>', `${bootChain}</body>`) : `${html}${bootChain}`;
    return res.status(200).send(html);
  } catch (error) {
    console.error('app_shell_error', { message: String(error?.message || error).slice(0, 220) });
    return res.status(503).send(fallbackHtml('Không tải được Personal A.I Office OS.'));
  }
}