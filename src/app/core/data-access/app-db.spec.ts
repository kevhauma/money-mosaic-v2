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

describe('schema version and table set (currently .version(16), TICKET-REC-11)', () => {
  it('is at version 16', async () => {
    await appDb.open();

    expect(appDb.verno).toBe(16);
  });

  it('declares savingsGoals as an auto-incrementing entity table indexed on sortOrder', async () => {
    await appDb.open();

    expect(appDb.savingsGoals.schema.primKey.auto).toBe(true);
    expect(appDb.savingsGoals.schema.indexes.map((index) => index.name)).toEqual(['sortOrder']);
  });

  it('declares forecastSettings as a singleton row keyed on id, with no secondary indexes', async () => {
    await appDb.open();

    expect(appDb.forecastSettings.schema.primKey.keyPath).toBe('id');
    expect(appDb.forecastSettings.schema.primKey.auto).toBe(false);
    expect(appDb.forecastSettings.schema.indexes).toEqual([]);
  });

  it('declares recurringOverrides as an auto-incrementing table indexed for override matching', async () => {
    await appDb.open();

    // `anchorTransactionId` is how a stored correction is matched back to a freshly detected
    // series, and `kind` reads the dismissals and the merges apart (TICKET-REC-11).
    expect(appDb.recurringOverrides.schema.primKey.auto).toBe(true);
    expect(appDb.recurringOverrides.schema.indexes.map((index) => index.name).sort()).toEqual([
      'anchorTransactionId',
      'kind',
    ]);
  });

  it('leaves every table shipped before the latest version in place — each version is additive only', async () => {
    await appDb.open();
    const tableNames = appDb.tables.map((table) => table.name).sort();

    expect(tableNames).toEqual([
      'accounts',
      'appSettings',
      'categories',
      'categoryComparisonSettings',
      'categoryModel',
      'categoryModelSettings',
      'dashboardLayoutSettings',
      'forecastSettings',
      'importBatches',
      'loans',
      'mappingProfiles',
      'recurringOverrides',
      'rules',
      'salaryMetadata',
      'savingsGoals',
      'transactions',
      'transferSettings',
      'transfers',
    ]);
  });

  // The FUT-09 mode toggle and the FUT-08 account scope are both non-indexed fields on the
  // `forecastSettings` row, so neither ticket may add a `.version(15)`. This is the tripwire —
  // TICKET-FUT-09 shipped `mode` against it and the version stayed at 14.
  it('keeps forecastSettings’ later fields out of the index list', async () => {
    await appDb.open();
    const indexed = appDb.forecastSettings.schema.indexes.map((index) => index.name);

    expect(indexed).not.toContain('mode');
    expect(indexed).not.toContain('scopeAccountIds');
  });
});

describe('loans schema (TICKET-LOAN-01 .version(15))', () => {
  it('declares loans as an auto-incrementing entity table indexed on categoryId, loanType, archived', async () => {
    await appDb.open();

    expect(appDb.loans.schema.primKey.auto).toBe(true);
    expect(appDb.loans.schema.indexes.map((index) => index.name)).toEqual([
      'categoryId',
      'loanType',
      'archived',
    ]);
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
