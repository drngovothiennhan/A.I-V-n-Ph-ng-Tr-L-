import assert from 'node:assert/strict';
import {
  DRIVE_BRAIN_REGISTRY,
  approvalStateForDriveScope,
  driveScopeMap
} from '../api/_drive-registry.js';

assert.equal(DRIVE_BRAIN_REGISTRY.root.name, 'A.I Văn phòng');
assert.equal(DRIVE_BRAIN_REGISTRY.root.id, '1q8fnN4-WYFlbGXUkRAWj8uqudNBW4qG0');

const scopes = DRIVE_BRAIN_REGISTRY.scopes;
for (const required of ['00_INBOX','01_KNOWLEDGE','02_APPROVED','03_TEMPLATES','04_SKILLS','05_TRAINING','06_OUTPUTS','07_ARCHIVE']) {
  assert.ok(scopes[required], `missing Drive scope: ${required}`);
}

assert.equal(DRIVE_BRAIN_REGISTRY.approvalPolicy.groundTruthScope, '02_APPROVED');
assert.equal(DRIVE_BRAIN_REGISTRY.approvalPolicy.inboxAllowedInProductionRetrieval, false);
assert.equal(DRIVE_BRAIN_REGISTRY.approvalPolicy.archiveAllowedInProductionRetrieval, false);
assert.ok(!DRIVE_BRAIN_REGISTRY.productionReadableScopes.includes('00_INBOX'));
assert.ok(!DRIVE_BRAIN_REGISTRY.productionReadableScopes.includes('07_ARCHIVE'));

assert.equal(approvalStateForDriveScope('02_APPROVED'), 'approved');
assert.equal(approvalStateForDriveScope('01_KNOWLEDGE'), 'reference');
assert.equal(approvalStateForDriveScope('03_TEMPLATES'), 'reference');
assert.equal(approvalStateForDriveScope('04_SKILLS'), 'draft');
assert.equal(approvalStateForDriveScope('00_INBOX'), 'blocked');

const mapped = driveScopeMap(['02_APPROVED', '01_KNOWLEDGE', '00_INBOX']);
assert.equal(mapped['02_APPROVED'], scopes['02_APPROVED']);
assert.equal(mapped['01_KNOWLEDGE'], scopes['01_KNOWLEDGE']);
assert.equal(mapped['00_INBOX'], scopes['00_INBOX']);

console.log('drive-registry-v24: verified registry and approval policy PASS');
