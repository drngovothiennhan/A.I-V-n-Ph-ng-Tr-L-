export const config = { runtime: 'nodejs' };

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const DEFAULT_GEMINI_ECONOMY_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';
const DEFAULT_GEMINI_GROUNDED_IMAGE_MODEL = 'gemini-3.1-flash-image';
const VOICE_RENDER_HEALTH = 'https://ai-office-xiaozhi-gateway.onrender.com/health';
const VOICE_RENDER_WS = 'wss://ai-office-xiaozhi-gateway.onrender.com/xiaozhi/v1/';

function geminiModel() {
  return process.env.AI_OFFICE_GEMINI_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}
function economyModel() {
  return process.env.AI_OFFICE_GEMINI_ECONOMY_MODEL || DEFAULT_GEMINI_ECONOMY_MODEL;
}
function imageModel() {
  return process.env.AI_OFFICE_GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL;
}
function groundedImageModel() {
  return process.env.AI_OFFICE_GEMINI_GROUNDED_IMAGE_MODEL || DEFAULT_GEMINI_GROUNDED_IMAGE_MODEL;
}

async function probeVoiceRender() {
  try {
    const response = await fetch(VOICE_RENDER_HEALTH, {
      headers: { 'user-agent': 'AI-Office-Health/1.9.3' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return { ok: false, status: response.status, endpoint: VOICE_RENDER_HEALTH };
    const data: any = await response.json();
    return {
      ok: Boolean(data?.ok),
      endpoint: VOICE_RENDER_HEALTH,
      websocketUrl: VOICE_RENDER_WS,
      service: data?.service || 'ai-office-xiaozhi-gateway',
      release: data?.release || null,
      protocolVersion: data?.protocolVersion || process.env.XIAOZHI_PROTOCOL_VERSION || '1',
      trustedOriginMode: Boolean(data?.trustedOriginMode),
      activeClients: Number.isFinite(Number(data?.activeClients)) ? Number(data.activeClients) : null
    };
  } catch {
    return { ok: false, endpoint: VOICE_RENDER_HEALTH, websocketUrl: VOICE_RENDER_WS, reason: 'VOICE_RENDER_UNREACHABLE' };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const driveRuntimeConfigured = Boolean(process.env.DRIVE_BRAIN_BRIDGE_URL && process.env.DRIVE_BRAIN_TOKEN);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const model = geminiModel();
  const voiceRender = await probeVoiceRender();
  const providers = {
    local: { configured: true, mode: 'safe-fallback', costTier: 'zero-model' },
    publicResearch: { configured: true, mode: 'sanitized-fallback', costTier: 'zero-model' },
    gemini: {
      configured: geminiConfigured,
      mode: 'cost-aware-grounded-reasoning',
      model,
      economyModel: economyModel(),
      routing: ['zero-model-public-fast-path', 'economy', 'reasoning'],
      googleSearchGrounding: geminiConfigured
    },
    imageGeneration: {
      configured: geminiConfigured,
      mode: 'economy-first-with-local-png-fallback',
      model: imageModel(),
      groundedModel: groundedImageModel(),
      defaultResolution: '1K',
      localCanvasFallback: true
    },
    xiaozhi: {
      configured: true,
      runtimeReady: Boolean(voiceRender.ok),
      authenticated: Boolean(process.env.XIAOZHI_WS_TOKEN || process.env.XIAOZHI_TOKEN || voiceRender.trustedOriginMode),
      mode: 'render-direct-wss',
      source: process.env.XIAOZHI_WS_URL ? 'vercel-env-override' : 'render-direct-default',
      endpoint: VOICE_RENDER_WS,
      protocolVersion: voiceRender.protocolVersion || process.env.XIAOZHI_PROTOCOL_VERSION || '1',
      voiceRenderVersion: '2.3',
      gatewayRelease: voiceRender.release,
      trustedOriginMode: Boolean(voiceRender.trustedOriginMode),
      browserFallback: true
    },
    voiceRender: {
      configured: true,
      runtimeReady: Boolean(voiceRender.ok),
      mode: 'direct-websocket-gateway',
      version: '2.3',
      endpoint: VOICE_RENDER_WS,
      healthEndpoint: VOICE_RENDER_HEALTH,
      gatewayRelease: voiceRender.release,
      trustedOriginMode: Boolean(voiceRender.trustedOriginMode),
      activeClients: voiceRender.activeClients
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
      configuredDefaults: {
        AI_OFFICE_GEMINI_MODEL: providers.gemini.model,
        AI_OFFICE_GEMINI_ECONOMY_MODEL: providers.gemini.economyModel,
        AI_OFFICE_GEMINI_IMAGE_MODEL: providers.imageGeneration.model
      }
    },
    drive: {
      ready: driveRuntimeConfigured,
      requiredRuntime: ['DRIVE_BRAIN_BRIDGE_URL', 'DRIVE_BRAIN_TOKEN'],
      bridgeSource: 'integrations/google-apps-script/DriveBrainBridge.gs'
    },
    xiaozhi: {
      ready: providers.xiaozhi.runtimeReady,
      requiredRuntime: [],
      recommendedSecrets: ['XIAOZHI_WS_TOKEN for non-browser server clients'],
      optionalIdentity: ['XIAOZHI_CLIENT_ID', 'XIAOZHI_DEVICE_ID'],
      configuredDefaults: {
        XIAOZHI_PROTOCOL_VERSION: providers.xiaozhi.protocolVersion,
        VOICE_RENDER_WS: VOICE_RENDER_WS
      }
    }
  };

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'ok',
    release: '1.9.3-autonomous-office-orchestrator',
    knowledgeRouter: '2.0-unified-source-policy',
    interaction: '2.2-voice-action-orchestrator',
    voiceRuntime: '2.3-render-xiaozhi-direct',
    productCompletion: '2.4-summary-file-image-delivery',
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
      workflow: ['understand', 'source-policy', 'context', 'execute', 'qa', 'package', 'approval-or-deliver'],
      proceduralMemory: 'approved-only',
      trainingModel: 'retrieval + approved procedural memory + reflection + correction + benchmark',
      fineTuning: false
    },
    interactionModel: {
      modes: ['question', 'task', 'hybrid', 'control', 'casual'],
      confidenceAware: true,
      riskAware: true,
      answerFirstHybrid: true,
      sourceRelevanceGate: true,
      cancellable: true,
      lateResultInvalidation: true,
      highRiskApprovalGate: true
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
      structuredArtifacts: ['docx', 'xlsx', 'pptx', 'png'],
      aiImageGeneration: providers.imageGeneration.configured,
      clientIngest: ['docx', 'xlsx', 'pptx', 'csv', 'tsv', 'txt', 'md'],
      approvedDataCompare: true,
      backendArtifactSourceReady: true,
      backendIngestSourceReady: true,
      defaultTaskOutputs: { admin:'docx', general:'docx', research:'docx', tech:'docx', data:'xlsx', presentation:'pptx', image:'png' }
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
      voiceRenderVersion: '2.3',
      renderGatewayReady: Boolean(voiceRender.ok),
      renderGatewayRelease: voiceRender.release,
      renderDirectWss: true,
      sameChiefRouterAsText: true,
      continuousConversation: true,
      stateMachine: ['listening', 'understanding', 'working', 'speaking', 'done', 'blocked'],
      bargeIn: true,
      echoSuppression: true,
      transcriptDeduplication: true,
      conciseSpokenResult: true,
      autoResumeAfterTts: true,
      reconnectOnNetworkReturn: true,
      heartbeatWatchdog: true,
      browserFallback: true,
      externalUpstreamConfigured: true
    },
    defaultOutput: 'conversation',
    explicitArtifacts: ['docx', 'xlsx', 'pptx', 'pdf', 'png'],
    providers,
    setup,
    voiceRenderProbe: voiceRender,
    timestamp: new Date().toISOString()
  });
}
