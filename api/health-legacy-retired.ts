export default async function handler(_req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  return res.status(410).json({
    error: 'LEGACY_HEALTH_ROUTE_RETIRED',
    canonicalEndpoint: '/api/health',
    telemetryCurrent: false
  });
}
