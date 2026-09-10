import { createOfficeArtifact } from './_office-artifacts.js';

export async function createArtifact(body = {}) {
  return createOfficeArtifact(body);
}
