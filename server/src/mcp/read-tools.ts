import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { DbOrTx } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { readSettings, SETTINGS_TABLES } from '../routes/settings.js';
import { accounts } from '../schema/accounts.js';
import { categories } from '../schema/categories.js';
import { loans } from '../schema/loans.js';
import { recurringOverrides } from '../schema/recurring-overrides.js';
import { rules } from '../schema/rules.js';
import { salaryMetadata } from '../schema/salary-metadata.js';
import { savingsGoals } from '../schema/savings-goals.js';
import { searchTransactions, searchTransactionsInput } from './search-transactions.js';
import { toolResult } from './tool-result.js';

const READ_ONLY = { readOnlyHint: true } as const;

const settingsOf = (name: string) => {
  const settings = SETTINGS_TABLES.find((candidate) => candidate.name === name);
  if (settings === undefined) throw new Error(`No settings table ${name}`);
  return settings;
};

/** The user's category names by id, for the tools that name a category next to its id. */
export const categoryNames = (db: DbOrTx, userId: number): Map<number, string> =>
  new Map(
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.userId, userId))
      .all()
      .map((row) => [row.id, row.name]),
  );

const listAccounts = (db: DbOrTx, userId: number) =>
  db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.id))
    .all()
    .map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      iban: account.iban,
      archived: account.archived,
      joint: account.type === 'joint' || (account.coOwners?.length ?? 0) > 0,
    }));

const listCategories = (db: DbOrTx, userId: number, includeArchived: boolean) =>
  db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      group: categories.group,
      archived: categories.archived,
      activeFrom: categories.activeFrom,
      activeUntil: categories.activeUntil,
    })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.id))
    .all()
    .filter((category) => includeArchived || !category.archived);

const listRules = (db: DbOrTx, userId: number) => {
  const names = categoryNames(db, userId);
  return db
    .select()
    .from(rules)
    .where(eq(rules.userId, userId))
    .orderBy(asc(rules.priority), asc(rules.id))
    .all()
    .map(({ userId: _userId, action, ...rule }) => ({
      ...rule,
      conditionMatch: rule.conditionMatch ?? 'all',
      category: { id: action.setCategoryId, name: names.get(action.setCategoryId) ?? null },
    }));
};

const getLoans = (db: DbOrTx, userId: number) => {
  const names = categoryNames(db, userId);
  return db
    .select()
    .from(loans)
    .where(eq(loans.userId, userId))
    .orderBy(asc(loans.sortOrder))
    .all()
    .map((loan) => ({ ...toEntity(loan), categoryName: names.get(loan.categoryId) ?? null }));
};

const getFuture = (db: DbOrTx, userId: number) => ({
  savingsGoals: db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, userId))
    .all()
    .map((row) => toEntity(row)),
  forecastSettings: readSettings(db, settingsOf('forecastSettings'), userId),
  recurringOverrides: db
    .select()
    .from(recurringOverrides)
    .where(eq(recurringOverrides.userId, userId))
    .all()
    .map((row) => toEntity(row)),
});

const getIncome = (db: DbOrTx, userId: number) => {
  const settings = readSettings(db, settingsOf('appSettings'), userId);
  return {
    salaryMetadata: db
      .select()
      .from(salaryMetadata)
      .where(eq(salaryMetadata.userId, userId))
      .all()
      .map((row) => toEntity(row)),
    mainIncomeCategoryId: settings['mainIncomeCategoryId'] ?? null,
    excludedIncomeCategoryIds: settings['excludedIncomeCategoryIds'] ?? [],
    smoothedBonusCategoryIds: settings['smoothedBonusCategoryIds'] ?? [],
  };
};

/**
 * The read tools (TICKET-MCP-01). Each queries Drizzle directly, filtered on the token's user —
 * the same ownership rule every `/api` router follows — and hands back stored rows, not the
 * browser's computed views.
 */
export const registerReadTools = (server: McpServer, db: DbOrTx, userId: number): void => {
  server.registerTool(
    'list_accounts',
    {
      description:
        'List the bank accounts: id, name, type, IBAN, archived, and whether it is a joint account.',
      annotations: READ_ONLY,
    },
    () => toolResult(listAccounts(db, userId)),
  );

  server.registerTool(
    'list_categories',
    {
      description:
        'List categories: id, name, kind (expense/income/neutral), group, archived, and the activeFrom/activeUntil dates between which it applies. Archived categories are hidden unless includeArchived is true.',
      inputSchema: { includeArchived: z.boolean().optional() },
      annotations: READ_ONLY,
    },
    ({ includeArchived }) => toolResult(listCategories(db, userId, includeArchived === true)),
  );

  server.registerTool(
    'list_rules',
    {
      description:
        'List every categorisation rule in evaluation order (lowest priority first): its conditions, whether it is enabled, whether a match lets later rules run (continueOnMatch), and the category it assigns. When several rules match, the last one to run wins.',
      annotations: READ_ONLY,
    },
    () => toolResult(listRules(db, userId)),
  );

  server.registerTool(
    'search_transactions',
    {
      description:
        'Search transactions booked between from and to (inclusive), newest first. Returns compact rows and nextCursor; pass it back as cursor for the next page (null means there are no more rows).',
      inputSchema: searchTransactionsInput,
      annotations: READ_ONLY,
    },
    (input) => toolResult(searchTransactions(db, userId, input)),
  );

  server.registerTool(
    'get_loans',
    {
      description:
        'The stored loans (principal, interest rate, term, start date) and the name of the category whose payments each one tracks.',
      annotations: READ_ONLY,
    },
    () => toolResult(getLoans(db, userId)),
  );

  server.registerTool(
    'get_future',
    {
      description: 'Savings goals, forecast settings and recurring-payment overrides, as stored.',
      annotations: READ_ONLY,
    },
    () => toolResult(getFuture(db, userId)),
  );

  server.registerTool(
    'get_income',
    {
      description:
        'Monthly salary metadata, plus which category is the main income, which categories are excluded from income, and which are smoothed bonuses.',
      annotations: READ_ONLY,
    },
    () => toolResult(getIncome(db, userId)),
  );
};
