export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const providers = {
    local: { configured: true, mode: 'safe-fallback' },
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      mode: 'primary',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    },
    xiaozhi: {
      configured: Boolean(process.env.XIAOZHI_WS_URL),
      authenticated: Boolean(process.env.XIAOZHI_WS_TOKEN || process.env.XIAOZHI_TOKEN),
      mode: 'optional-voice',
      protocolVersion: process.env.XIAOZHI_PROTOCOL_VERSION || '1'
    },
    googleWorkspace: { configured: process.env.GOOGLE_WORKSPACE_ENABLED === 'true', mode: 'optional' }
  };

  const setup = {
    gemini: {
      ready: providers.gemini.configured,
      requiredSecrets: ['GEMINI_API_KEY'],
      configuredDefaults: { GEMINI_MODEL: providers.gemini.model }
    },
    xiaozhi: {
      ready: providers.xiaozhi.configured,
      requiredRuntime: ['XIAOZHI_WS_URL'],
      recommendedSecrets: ['XIAOZHI_WS_TOKEN'],
      optionalIdentity: ['XIAOZHI_CLIENT_ID', 'XIAOZHI_DEVICE_ID'],
      configuredDefaults: { XIAOZHI_PROTOCOL_VERSION: providers.xiaozhi.protocolVersion }
    }
  };

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'ok',
    release: '1.9.0-autonomous-office-orchestrator',
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
      externalResearch: ['Wikipedia vi', 'Wikipedia en', 'DuckDuckGo Instant Answer', 'PubMed when medical'],
      intentRouter: ['question', 'admin', 'data', 'research', 'presentation', 'image', 'tech', 'general', 'continuation'],
      decisionPolicy: ['execute-safe-internal', 'prepare-and-hold-irreversible'],
      workflow: ['understand', 'context', 'execute', 'qa', 'artifact-if-requested', 'approval'],
      proceduralMemory: 'approved-only',
      conversationMemory: true,
      fineTuning: false
    },
    quality: {
      qaGate: true,
      noSimulatedProgress: true,
      noFabricatedMetadata: true,
      auditDecisionLog: true
    },
    voice: {
      xiaozhiFabric: true,
      continuousConversation: true,
      autoResumeAfterTts: true,
      browserFallback: true,
      externalUpstreamConfigured: providers.xiaozhi.configured
    },
    defaultOutput: 'conversation',
    explicitArtifacts: ['docx', 'xlsx', 'pptx', 'pdf', 'png'],
    providers,
    setup,
    timestamp: new Date().toISOString()
  });
}
