import { appDb, needsPartnerContributionSeed, PARTNER_CONTRIBUTION_CATEGORY_NAME } from './app-db';

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

describe('category applicability window schema (TICKET-CAT-10)', () => {
  // `Category.activeFrom`/`activeUntil` are non-indexed fields, and `.stores()` declares indexes
  // rather than fields — so they needed no `.version(n + 1)` block (the `appSettings` precedent).
  it('leaves the categories table unindexed on both bounds', async () => {
    await appDb.open();
    const indexed = appDb.categories.schema.indexes.map((index) => index.name);

    // Indexing either one is a real decision with a version bump attached; this is the tripwire.
    expect(indexed).not.toContain('activeFrom');
    expect(indexed).not.toContain('activeUntil');
  });
});
