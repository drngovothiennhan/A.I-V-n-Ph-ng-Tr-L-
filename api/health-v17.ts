export const config = { runtime: 'nodejs' };

type ProviderState = {
  configured: boolean;
  mode: 'primary' | 'fallback' | 'optional';
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const providers: Record<string, ProviderState> = {
    local: { configured: true, mode: 'fallback' },
    gemini: { configured: Boolean(process.env.GEMINI_API_KEY), mode: 'primary' },
    xiaozhi: { configured: Boolean(process.env.XIAOZHI_WS_URL), mode: 'optional' },
    googleWorkspace: { configured: Boolean(process.env.GOOGLE_WORKSPACE_ENABLED === 'true'), mode: 'optional' }
  };

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'ok',
    release: '1.7.0-second-brain-voice-fabric',
    pwa: {
      installableAssets: true,
      icons: ['192x192', '512x512', 'maskable-512x512'],
      serviceWorker: true
    },
    providers,
    timestamp: new Date().toISOString()
  });
}
