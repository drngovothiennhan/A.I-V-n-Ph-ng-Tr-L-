export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const providers = {
    local: { configured: true, mode: 'fallback' },
    gemini: { configured: Boolean(process.env.GEMINI_API_KEY), mode: 'primary' },
    xiaozhi: { configured: Boolean(process.env.XIAOZHI_WS_URL), mode: 'optional' },
    googleWorkspace: { configured: process.env.GOOGLE_WORKSPACE_ENABLED === 'true', mode: 'optional' }
  };

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'ok',
    release: '1.7.0-second-brain-voice-fabric',
    dashboard: 'v1.5-approved-design',
    pwa: {
      standalone: true,
      icons: ['192x192', '512x512', 'maskable-512x512'],
      serviceWorker: true,
      installController: true
    },
    brain: {
      approvedOnly: true,
      localRag: true,
      driveCanonical: true,
      fineTuning: false
    },
    voice: {
      xiaozhiFabric: true,
      browserFallback: true,
      realtimeConfigured: providers.xiaozhi.configured
    },
    artifacts: ['docx', 'xlsx', 'pptx', 'png-client'],
    providers,
    timestamp: new Date().toISOString()
  });
}
