import { needsPartnerContributionSeed, PARTNER_CONTRIBUTION_CATEGORY_NAME } from './app-db';

describe('needsPartnerContributionSeed (TICKET-CAT-02 .version(6) upgrade idempotency)', () => {
  it('is true when the DB has no categories yet, so a fresh upgrade seeds one', () => {
    expect(needsPartnerContributionSeed([])).toBe(true);
  });

  it('is true when other categories exist but not the seeded one', () => {
    expect(
      needsPartnerContributionSeed([
        { isSystem: true, name: 'Groceries' },
        { isSystem: false, name: PARTNER_CONTRIBUTION_CATEGORY_NAME },
      ]),
    ).toBe(true);
  });

  it('is false once the system "Partner contribution" category exists, making a re-run a no-op', () => {
    expect(
      needsPartnerContributionSeed([
        { isSystem: true, name: 'Groceries' },
        { isSystem: true, name: PARTNER_CONTRIBUTION_CATEGORY_NAME },
      ]),
    ).toBe(false);
  });
});
