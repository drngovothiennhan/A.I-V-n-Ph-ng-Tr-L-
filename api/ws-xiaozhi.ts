export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  return res.status(410).json({
    error: 'LEGACY_VERCEL_WS_BRIDGE_RETIRED',
    voiceRuntime: '2.3-render-xiaozhi-direct',
    browserFallback: true,
    replacement: 'wss://ai-office-xiaozhi-gateway.onrender.com/xiaozhi/v1/'
  });
}
