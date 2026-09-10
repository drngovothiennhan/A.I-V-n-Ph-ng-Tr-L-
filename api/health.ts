export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const driveRuntimeConfigured = Boolean(process.env.DRIVE_BRAIN_BRIDGE_URL && process.env.DRIVE_BRAIN_TOKEN);
  const providers = {
    local: { configured: true, mode: 'safe-fallback' },
    publicResearch: { configured: true, mode: 'sanitized-fallback' },
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      mode: 'primary-grounded-reasoning',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      googleSearchGrounding: Boolean(process.env.GEMINI_API_KEY)
    },
    xiaozhi: {
      configured: Boolean(process.env.XIAOZHI_WS_URL),
      authenticated: Boolean(process.env.XIAOZHI_WS_TOKEN || process.env.XIAOZHI_TOKEN),
      mode: 'optional-voice-fabric',
      protocolVersion: process.env.XIAOZHI_PROTOCOL_VERSION || '1'
    },
    googleDriveRuntime: {
      configured: driveRuntimeConfigured,
      mode: 'canonical-knowledge',
      rootId: '1q8fnN4-WYFlbGXUkRAWj8uqudNBW4qG0'
    },
    googleWorkspace: { configured: process.env.GOOGLE_WORKSPACE_ENABLED === 'true', mode: 'optional-actions' }
  };

  const setup = {
    gemini: {
      ready: providers.gemini.configured,
      requiredSecrets: ['GEMINI_API_KEY'],
      configuredDefaults: { GEMINI_MODEL: providers.gemini.model }
    },
    drive: {
      ready: driveRuntimeConfigured,
      requiredRuntime: ['DRIVE_BRAIN_BRIDGE_URL', 'DRIVE_BRAIN_TOKEN'],
      bridgeSource: 'integrations/google-apps-script/DriveBrainBridge.gs'
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
    release: '1.9.3-autonomous-office-orchestrator',
    knowledgeRouter: '2.0-unified-source-policy',
    dashboard: 'v1.5-approved-design',
    pwa: {
      standalone: true,
      icons: ['192x192', '512x512', 'maskable-512x512'],
      serviceWorker: true,
      installController: true
    },
    brain: {
      approvedOnly: true,
      localUploadRequired: false,
      localUploadRole: 'optional-supplement',
      driveCanonical: true,
      driveRuntimeConfigured,
      sourcePolicy: ['direct_runtime', 'general_question', 'internal_question', 'admin_document', 'research_question', 'medical_question', 'data_task'],
      externalResearch: ['Gemini Google Search grounding when configured', 'Wikipedia vi/en fallback', 'DuckDuckGo Instant Answer fallback', 'PubMed when medical'],
      questionFirstRouting: true,
      rawMarkupBlocked: true,
      continuationContext: true,
      decisionPolicy: ['execute-safe-internal', 'prepare-and-hold-irreversible'],
      workflow: ['understand', 'source-policy', 'context', 'execute', 'qa', 'artifact-if-requested', 'approval'],
      proceduralMemory: 'approved-only',
      trainingModel: 'retrieval + approved procedural memory + reflection + correction + benchmark',
      fineTuning: false
    },
    adminStudio: {
      templateFirst: true,
      driveScopes: ['03_TEMPLATES', '02_APPROVED', '01_KNOWLEDGE', '04_SKILLS'],
      officialWebPriority: ['vbpl.vn', 'vanban.chinhphu.vn', 'chinhphu.vn', 'moh.gov.vn'],
      noFabricatedLegalMetadata: true,
      missingFieldMarker: '[CHƯA CÓ DỮ LIỆU]'
    },
    officeEngine: {
      clientArtifactEngine: true,
      structuredArtifacts: ['docx', 'xlsx', 'pptx'],
      clientIngest: ['docx', 'xlsx', 'pptx', 'csv', 'tsv', 'txt', 'md'],
      approvedDataCompare: true,
      backendArtifactSourceReady: true,
      backendIngestSourceReady: true
    },
    quality: {
      qaGate: true,
      noSimulatedProgress: true,
      noFabricatedMetadata: true,
      auditDecisionLog: true,
      irreversibleApprovalGate: true
    },
    voice: {
      xiaozhiFabric: true,
      sameChiefRouterAsText: true,
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
