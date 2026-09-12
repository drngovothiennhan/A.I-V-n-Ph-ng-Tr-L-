export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  const kind = String(req?.query?.kind || '').toLowerCase();
  if (kind === 'voice') {
    return res.status(410).json({
      error: 'LEGACY_VERCEL_WS_BRIDGE_RETIRED',
      voiceRuntime: '2.3-render-xiaozhi-direct',
      browserFallback: true,
      replacement: 'wss://ai-office-xiaozhi-gateway.onrender.com/xiaozhi/v1/'
    });
  }
  return res.status(410).json({
    error: 'LEGACY_RESEARCH_ROUTE_RETIRED',
    canonicalEndpoint: '/api/research',
    providerCallMade: false
  });
}
