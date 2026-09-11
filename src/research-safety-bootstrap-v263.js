import { installResearchSafetyGuard } from './research-safety-guard-v263.js?v=263-hotfix';

const VERSION='2.6.3-safety-bootstrap';
const MAX_ATTEMPTS=120;
const INTERVAL_MS=100;

async function installEventually(){
  for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
    if(window.AIOfficeV20?.gatherSources&&window.AIOfficeV20?.classifySourcePolicy){
      const installed=installResearchSafetyGuard();
      if(installed){
        window.AIOfficeResearchSafetyBootstrapVersion=VERSION;
        document.documentElement.dataset.aiResearchSafety='2.6.3';
        return true;
      }
    }
    await new Promise(resolve=>setTimeout(resolve,INTERVAL_MS));
  }
  console.error('ai_office_research_safety_bootstrap_timeout');
  return false;
}

void installEventually();
