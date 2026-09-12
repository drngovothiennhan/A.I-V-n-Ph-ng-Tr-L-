import { KNOWLEDGE_MODES, freezeContract } from './contracts.js';

const SOURCE_ALIASES=Object.freeze({
  'external-default':KNOWLEDGE_MODES.AUTO,
  internal:KNOWLEDGE_MODES.INTERNAL,
  'task-context':KNOWLEDGE_MODES.NONE
});

function bool(value){return value===true}

export function resolveKnowledgeMode(envelope={},options={}){
  const explicit=String(options.mode||'').toUpperCase();
  if(Object.values(KNOWLEDGE_MODES).includes(explicit))return explicit;
  if(bool(options.verified))return KNOWLEDGE_MODES.VERIFIED;
  if(bool(options.internalOnly))return KNOWLEDGE_MODES.INTERNAL;
  return SOURCE_ALIASES[envelope?.route?.sourceMode]||SOURCE_ALIASES[envelope?.intent?.source?.mode]||KNOWLEDGE_MODES.AUTO;
}

export function createKnowledgePlan(envelope={},options={}){
  const mode=resolveKnowledgeMode(envelope,options);
  const internalAuthorized=bool(envelope?.intent?.source?.internalAuthorized)||bool(options.internalAuthorized);
  const externalAllowed=envelope?.intent?.source?.externalAllowed!==false&&options.externalAllowed!==false;
  const providers=[];

  if(mode===KNOWLEDGE_MODES.INTERNAL){
    if(internalAuthorized)providers.push('drive','database');
    if(externalAllowed&&options.allowExternalFallback===true)providers.push('gemini');
  }else if(mode===KNOWLEDGE_MODES.VERIFIED){
    if(internalAuthorized)providers.push('drive','database');
    if(externalAllowed)providers.push('gemini','web');
  }else if(mode===KNOWLEDGE_MODES.AUTO){
    if(externalAllowed)providers.push('gemini');
    if(internalAuthorized&&options.includeInternal===true)providers.push('drive');
  }

  return freezeContract({
    mode,
    internalAuthorized,
    externalAllowed,
    providers:[...new Set(providers)],
    policy:mode===KNOWLEDGE_MODES.VERIFIED?'cross-check':'single-path',
    reason:options.reason||envelope?.intent?.source?.reason||'office-v2-default'
  });
}
