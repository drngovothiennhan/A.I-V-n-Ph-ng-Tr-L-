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
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>A.I Văn phòng v${RELEASE}</title><style>body{font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f6f8ff;color:#152449}.box{background:#fff;border:1px solid #e2e8f5;border-radius:18px;padding:28px;max-width:560px;box-shadow:0 14px 40px #263d7717}h1{margin:0 0 10px;font-size:24px}p{color:#66708b}</style></head><body><div class="box"><h1>A.I Văn phòng v${RELEASE}</h1><p>${message}</p><p>Hệ thống sẽ tự tải lại.</p></div></body></html>`;
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
      .replace('Mặc định sản phẩm: DOCX · XLSX · PPTX · PNG. Chỉ báo hoàn tất sau khi bạn duyệt.', 'Mặc định: trả lời hoặc kết quả công việc ngay trong hội thoại. Chỉ tạo file khi bạn yêu cầu rõ.');

    html = html
      .replace(/<script type="module" src="\/src\/bootstrap-v17\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/office-v2\/ui-v2-shell\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/v72-smart-runtime\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/bootstrap-v18\.js(?:\?[^\"]*)?"><\/script>/g, '')
      .replace(/<script type="module" src="\/src\/release-v193\.js(?:\?[^\"]*)?"><\/script>/g, '');

    const preloads = '<link rel="modulepreload" href="/src/v72-smart-runtime.js?v=720"><link rel="modulepreload" href="/src/office-v2/ui-v2-shell.js?v=3002">';
    if (!html.includes('/src/v72-smart-runtime.js?v=720')) {
      html = html.includes('</head>') ? html.replace('</head>', `${preloads}</head>`) : `${preloads}${html}`;
    }

    const smartRuntime = '<script type="module" src="/src/v72-smart-runtime.js?v=720"></script>';
    const earlyUi = '<script type="module" src="/src/office-v2/ui-v2-shell.js?v=3002"></script>';
    const bootstrap = '<script type="module" src="/src/bootstrap-v18.js?v=193"></script>';
    const releaseSync = '<script type="module" src="/src/release-v193.js?v=193"></script>';
    const runtimeScripts = `${smartRuntime}${earlyUi}${bootstrap}${releaseSync}`;
    html = html.includes('</body>') ? html.replace('</body>', `${runtimeScripts}</body>`) : `${html}${runtimeScripts}`;
    return res.status(200).send(html);
  } catch (error) {
    console.error('app_shell_error', { message: String(error?.message || error).slice(0, 220) });
    return res.status(503).send(fallbackHtml('Không tải được dashboard canonical.'));
  }
}
