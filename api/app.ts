const SOURCE = 'https://raw.githubusercontent.com/drngovothiennhan/A.I-V-n-Ph-ng-Tr-L-/main/index.html';

function fallbackHtml(message = 'Đang khởi động A.I Văn phòng') {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>A.I Văn phòng v1.7</title><style>body{font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f6f8ff;color:#152449}.box{background:#fff;border:1px solid #e2e8f5;border-radius:18px;padding:28px;max-width:560px;box-shadow:0 14px 40px #263d7717}h1{margin:0 0 10px;font-size:24px}p{color:#66708b}</style></head><body><div class="box"><h1>A.I Văn phòng v1.7</h1><p>${message}</p><p>Hệ thống sẽ tự tải lại.</p></div></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
  try {
    const upstream = await fetch(SOURCE, {
      headers: { 'user-agent': 'AI-Office-Vercel/1.7' },
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return res.status(503).send(fallbackHtml(`Không đọc được giao diện canonical (${upstream.status}).`));
    let html = await upstream.text();
    html = html
      .replace(/A\.I Văn phòng v1\.6/g, 'A.I Văn phòng v1.7')
      .replace(/RELEASE 1\.6/g, 'RELEASE 1.7')
      .replace(/Drive Knowledge Brain · v1\.6/g, 'Second Brain · v1.7')
      .replace(/1\.6\.0 DRIVE KNOWLEDGE BRAIN/g, '1.7.0 SECOND BRAIN');

    if (!html.includes('/src/bootstrap-v17.js')) {
      const mount = '<script type="module" src="/src/bootstrap-v17.js"></script>';
      html = html.includes('</body>') ? html.replace('</body>', `${mount}</body>`) : `${html}${mount}`;
    }
    return res.status(200).send(html);
  } catch (error) {
    console.error('app_shell_error', { message: String(error?.message || error).slice(0, 220) });
    return res.status(503).send(fallbackHtml('Không tải được dashboard canonical.'));
  }
}
