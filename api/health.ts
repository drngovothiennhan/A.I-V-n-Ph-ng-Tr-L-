import { DRIVE_BRAIN_REGISTRY } from './_drive-registry.js';

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
function sourceCommit() {
  return process.env.AI_OFFICE_SOURCE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
}

async function probeVoiceRender() {
  try {
    const response = await fetch(VOICE_RENDER_HEALTH, {
      headers: { 'user-agent': 'AI-Office-Health/2.5' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return { ok: false, status: response.status, endpoint: VOICE_RENDER_HEALTH };
    const data = await response.json();
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
    return {
      ok: false,
      endpoint: VOICE_RENDER_HEALTH,
      websocketUrl: VOICE_RENDER_WS,
      reason: 'VOICE_RENDER_UNREACHABLE'
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const driveBridgeConfigured = Boolean(process.env.DRIVE_BRAIN_BRIDGE_URL && process.env.DRIVE_BRAIN_TOKEN);
  const driveServiceAccountConfigured = Boolean(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const driveRuntimeConfigured = driveBridgeConfigured || driveServiceAccountConfigured;
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const voiceRender = await probeVoiceRender();
  const driveProviders = [
    ...(driveBridgeConfigured ? ['apps-script-bridge'] : []),
    ...(driveServiceAccountConfigured ? ['service-account-readonly'] : [])
  ];

  const providers = {
    local: { configured: true, mode: 'safe-fallback', costTier: 'zero-model' },
    publicResearch: { configured: true, mode: 'sanitized-fallback', costTier: 'zero-model' },
    gemini: {
      configured: geminiConfigured,
      mode: 'cost-aware-grounded-reasoning',
      model: geminiModel(),
      economyModel: economyModel(),
      routing: ['zero-model-public-fast-path', 'economy', 'reasoning'],
      googleSearchGrounding: null,
      googleSearchGroundingConfigured: geminiConfigured,
      googleSearchGroundingVerified: null,
      googleSearchGroundingStatus: geminiConfigured ? 'configured-unverified' : 'not-configured',
      groundingVerificationMode: 'explicit-manual-probe'
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
      source: process.env.XIAOZHI_WS_URL ? 'runtime-override' : 'render-direct-default',
      endpoint: VOICE_RENDER_WS,
      protocolVersion: voiceRender.protocolVersion || process.env.XIAOZHI_PROTOCOL_VERSION || '1',
      voiceRenderVersion: '2.3',
      gatewayRelease: voiceRender.release,
      trustedOriginMode: Boolean(voiceRender.trustedOriginMode),
      browserFallback: true
    },
    googleDriveRuntime: {
      configured: driveRuntimeConfigured,
      mode: 'canonical-knowledge-multi-provider',
      activeProviders: driveProviders,
      providerPriority: ['apps-script-bridge', 'service-account-readonly'],
      serviceAccountReadonly: true,
      localFallbackAllowed: false,
      registryVersion: DRIVE_BRAIN_REGISTRY.version,
      rootId: DRIVE_BRAIN_REGISTRY.root.id,
      productionReadableScopes: [...DRIVE_BRAIN_REGISTRY.productionReadableScopes],
      approvalPolicy: DRIVE_BRAIN_REGISTRY.approvalPolicy
    },
    googleWorkspace: {
      configured: process.env.GOOGLE_WORKSPACE_ENABLED === 'true',
      mode: 'optional-actions'
    }
  };

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('x-ai-office-source-commit', sourceCommit());
  return res.status(200).json({
    status: 'ok',
    release: '1.9.3-autonomous-office-orchestrator',
    knowledgeRouter: '2.0-unified-source-policy',
    interaction: '2.2-voice-action-orchestrator',
    voiceRuntime: '2.3-render-xiaozhi-direct',
    driveRuntime: '2.5-multi-provider-readonly-fallback',
    productCompletion: '2.4-summary-file-image-delivery',
    dashboard: 'v1.5-approved-design',
    brain: {
      approvedOnly: true,
      localUploadRequired: false,
      localUploadRole: 'optional-explicit-supplement',
      driveCanonical: true,
      driveRuntimeConfigured,
      driveProviderPriority: providers.googleDriveRuntime.providerPriority,
      driveRegistryVersion: DRIVE_BRAIN_REGISTRY.version,
      groundTruthScope: DRIVE_BRAIN_REGISTRY.approvalPolicy.groundTruthScope,
      blockedProductionScopes: ['00_INBOX', '07_ARCHIVE'],
      sourcePolicy: ['direct_runtime','general_question','internal_question','admin_document','research_question','medical_question','data_task'],
      questionFirstRouting: true,
      rawMarkupBlocked: true,
      continuationContext: true,
      decisionPolicy: ['execute-safe-internal', 'prepare-and-hold-irreversible'],
      workflow: ['understand','source-policy','context','execute','qa','package','approval-or-deliver'],
      proceduralMemory: 'approved-only',
      fineTuning: false
    },
    interactionModel: {
      modes: ['question','task','hybrid','control','casual'],
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
      driveScopes: ['03_TEMPLATES','02_APPROVED','01_KNOWLEDGE','04_SKILLS'],
      officialWebPriority: ['vbpl.vn','vanban.chinhphu.vn','chinhphu.vn','moh.gov.vn'],
      noFabricatedLegalMetadata: true,
      missingFieldMarker: '[CHƯA CÓ DỮ LIỆU]'
    },
    officeEngine: {
      clientArtifactEngine: true,
      backendEngine: 'internal-office-xml-v24',
      safeZipParser: true,
      thirdPartyOfficeDependencies: false,
      structuredArtifacts: ['docx','xlsx','pptx','png'],
      aiImageGeneration: providers.imageGeneration.configured,
      clientIngest: ['docx','xlsx','pptx','csv','tsv','txt','md'],
      approvedDataCompare: true,
      defaultTaskOutputs: {
        admin: 'docx', general: 'docx', research: 'docx', tech: 'docx', data: 'xlsx', presentation: 'pptx', image: 'png'
      }
    },
    quality: {
      qaGate: true,
      businessWorkflowRegression: true,
      driveRegistryRegression: true,
      driveMultiProviderRegression: true,
      officeRoundTripRegression: true,
      dependencyAudit: '0-known-npm-vulnerabilities-at-build',
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
      bargeIn: true,
      echoSuppression: true,
      transcriptDeduplication: true,
      conciseSpokenResult: true,
      autoResumeAfterTts: true,
      reconnectOnNetworkReturn: true,
      heartbeatWatchdog: true,
      browserFallback: true
    },
    setup: {
      gemini: { ready: providers.gemini.configured, requiredSecrets: ['GEMINI_API_KEY'] },
      drive: {
        ready: driveRuntimeConfigured,
        providerPriority: providers.googleDriveRuntime.providerPriority,
        alternatives: [
          { mode: 'apps-script-bridge', requiredRuntime: ['DRIVE_BRAIN_BRIDGE_URL', 'DRIVE_BRAIN_TOKEN'], bridgeSource: 'integrations/google-apps-script/DriveBrainBridge.gs' },
          { mode: 'service-account-readonly', requiredRuntime: ['GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON'], manualPermission: 'Share A.I Văn phòng root folder with the service-account client_email as Viewer' }
        ]
      },
      xiaozhi: { ready: providers.xiaozhi.runtimeReady, requiredRuntime: [], optionalIdentity: ['XIAOZHI_CLIENT_ID', 'XIAOZHI_DEVICE_ID'] }
    },
    providers,
    voiceRenderProbe: voiceRender,
    timestamp: new Date().toISOString()
  });
}
