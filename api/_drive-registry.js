export const DRIVE_BRAIN_REGISTRY = Object.freeze({
  version: '2.4',
  root: Object.freeze({
    name: 'A.I Văn phòng',
    id: '1q8fnN4-WYFlbGXUkRAWj8uqudNBW4qG0'
  }),
  scopes: Object.freeze({
    '00_INBOX': '1Hgxi-fDcJqDAIQgJp2uHKtWd0toyNYMd',
    '01_KNOWLEDGE': '1ccp9ieYigI46M38_be9oRWKoG7wycjO3',
    '02_APPROVED': '10Sfb2I0xwYMWr_uOupf-8ciWH3C3RoI1',
    '03_TEMPLATES': '1Uj27l43MhVOTx--AkxP0Vs2V3OTOWi5j',
    '04_SKILLS': '1V9XAIHC7N246XB2OCNKazeKpFqNafgaO',
    '05_TRAINING': '1UUndKlNOLoQ6Cww7xKLP1eErxkTUpiTS',
    '06_OUTPUTS': '17bXsKroYm0Jns0s8Qs6R49N4tfTw6BEh',
    '07_ARCHIVE': '1pxXBB-9jL0-JjbShdD84OnI5HaJvyg5N'
  }),
  productionReadableScopes: Object.freeze([
    '02_APPROVED',
    '01_KNOWLEDGE',
    '03_TEMPLATES',
    '04_SKILLS'
  ]),
  defaultSearchScopes: Object.freeze(['02_APPROVED', '01_KNOWLEDGE']),
  approvalPolicy: Object.freeze({
    groundTruthScope: '02_APPROVED',
    knowledgeScopeState: 'reference',
    templateDefaultState: 'reference',
    skillDefaultState: 'draft',
    inboxAllowedInProductionRetrieval: false,
    archiveAllowedInProductionRetrieval: false
  })
});

export function driveScopeMap(names = DRIVE_BRAIN_REGISTRY.defaultSearchScopes) {
  const scopes = DRIVE_BRAIN_REGISTRY.scopes;
  const requested = Array.isArray(names) ? names : [];
  return Object.fromEntries(
    requested
      .filter(name => Object.prototype.hasOwnProperty.call(scopes, String(name)))
      .map(name => [String(name), scopes[String(name)]])
  );
}

export function approvalStateForDriveScope(scope = '', explicitState = '') {
  const normalized = String(explicitState || '').toLowerCase();
  if (scope === '02_APPROVED') return 'approved';
  if (scope === '03_TEMPLATES') return normalized === 'approved' ? 'approved' : 'reference';
  if (scope === '04_SKILLS') return normalized === 'approved' ? 'approved' : 'draft';
  if (scope === '01_KNOWLEDGE') return normalized === 'approved' ? 'approved' : 'reference';
  return 'blocked';
}
