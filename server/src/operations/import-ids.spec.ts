import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';

import { accounts } from '../schema/accounts.js';
import { appSettings } from '../schema/app-settings.js';
import { categories } from '../schema/categories.js';
import { categoryComparisonSettings } from '../schema/category-comparison-settings.js';
import { forecastSettings } from '../schema/forecast-settings.js';
import { transactions } from '../schema/transactions.js';
import { transfers } from '../schema/transfers.js';
import { remapReferences, type IdPlan } from './import-ids.js';
import type { PerUserTable } from './user-rows.js';

/** Category 1 → 101, account 2 → 102, transfer 3 → 103; anything else keeps its id. */
const plan: IdPlan = new Map<SQLiteTable, ReadonlyMap<number, number>>([
  [categories, new Map([[1, 101]])],
  [accounts, new Map([[2, 102]])],
  [transfers, new Map([[3, 103]])],
]);

const remap = (table: unknown, values: Record<string, unknown>) =>
  remapReferences(plan, table as PerUserTable, values);

describe('remapReferences', () => {
  it('rewrites the ids in settings columns, leaving unplanned ids and other fields alone', () => {
    expect(
      remap(appSettings, {
        mainIncomeCategoryId: 1,
        excludedIncomeCategoryIds: [1, 7],
        smoothedBonusCategoryIds: [1],
        heatmapExcludedCategoryIds: [],
        currency: 'EUR',
      }),
    ).toEqual({
      mainIncomeCategoryId: 101,
      excludedIncomeCategoryIds: [101, 7],
      smoothedBonusCategoryIds: [101],
      heatmapExcludedCategoryIds: [],
      currency: 'EUR',
    });
    expect(remap(categoryComparisonSettings, { excludedCategoryIds: [1] })).toEqual({
      excludedCategoryIds: [101],
    });
    expect(remap(forecastSettings, { scopeAccountIds: [2, 9] })).toEqual({
      scopeAccountIds: [102, 9],
    });
  });

  it('rewrites foreign keys and the transfer id inside attributionOverride', () => {
    expect(
      remap(transactions, {
        accountId: 2,
        categoryId: 1,
        transferId: 3,
        attributionOverride: { reimbursementTransferId: 3 },
      }),
    ).toEqual({
      accountId: 102,
      categoryId: 101,
      transferId: 103,
      attributionOverride: { reimbursementTransferId: 103 },
    });
  });

  it('adds no key the row did not carry', () => {
    expect(remap(appSettings, { currency: 'EUR' })).toEqual({ currency: 'EUR' });
    expect(remap(transactions, { accountId: 5, attributionOverride: null })).toEqual({
      accountId: 5,
      attributionOverride: null,
    });
  });
});
