import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { and, eq, isNull, or } from 'drizzle-orm';
import { z } from 'zod';

import type { Rule, Transaction } from 'shared/entities.js';
import { applyRules } from 'shared/rule-matching.js';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { rules } from '../schema/rules.js';
import { transactions } from '../schema/transactions.js';
import { categoryNames } from './read-tools.js';
import { toolResult } from './tool-result.js';

const PREVIEW_ROWS = 200;

export const runRulesInput = {
  ruleIds: z
    .array(z.number().int())
    .min(1)
    .optional()
    .describe(
      'Only report/apply changes these rules decide. They are evaluated even if disabled, alongside every enabled rule, so a higher-priority rule still wins.',
    ),
  confirm: z.boolean().optional().describe('true applies the changes; otherwise only a preview.'),
};

/**
 * What a rule run would change, computed the way the UI's "Run rules" does (`applyRules` in
 * `shared/rule-matching.ts`). With `ruleIds`, the named rules join the enabled ones even when
 * disabled, and only the updates they *decide* are kept — so testing one rule shows exactly what
 * a full run would do with it switched on, never a category a higher-priority rule overrides.
 *
 * Rows come through `toEntity` (nulls dropped) because the shared matcher reads the entity shape,
 * where an absent field is `undefined`.
 */
const planRun = (tx: DbOrTx, userId: number, ruleIds: readonly number[] | undefined) => {
  const owned = tx.select().from(rules).where(eq(rules.userId, userId)).all();
  const named = new Set(ruleIds ?? []);
  if ([...named].some((id) => !owned.some((rule) => rule.id === id)))
    throw new Error('Unknown rule id; nothing was changed');

  const evaluated = owned.map((row) => ({
    ...(toEntity(row) as Rule),
    enabled: row.enabled || named.has(row.id),
  }));
  const candidates = tx
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        or(isNull(transactions.categoryManual), eq(transactions.categoryManual, false)),
        isNull(transactions.transferId),
      ),
    )
    .all();

  const byId = new Map(candidates.map((row) => [row.id, row]));
  const updates = applyRules(
    candidates.map((row) => toEntity(row) as Transaction),
    evaluated,
  ).filter((update) => named.size === 0 || named.has(update.ruleId!));
  return { updates, byId, owned };
};

/** `run_rules` (TICKET-MCP-03): previewed unless `confirm`, applied in one transaction. */
export const runRules = (
  db: DrizzleDb,
  userId: number,
  ruleIds: readonly number[] | undefined,
  confirm: boolean,
) =>
  db.transaction((tx) => {
    const { updates, byId, owned } = planRun(tx, userId, ruleIds);
    const ruleName = new Map(owned.map((rule) => [rule.id, rule.name]));
    const counts = new Map<number, number>();
    for (const { ruleId } of updates) counts.set(ruleId!, (counts.get(ruleId!) ?? 0) + 1);
    const perRule = [...counts].map(([ruleId, count]) => ({
      ruleId,
      name: ruleName.get(ruleId),
      count,
    }));

    if (!confirm) {
      const names = categoryNames(tx, userId);
      return {
        total: updates.length,
        perRule,
        changes: updates.slice(0, PREVIEW_ROWS).map((update) => {
          const row = byId.get(update.id)!;
          return {
            transactionId: row.id,
            bookingDate: row.bookingDate,
            amount: row.amount,
            counterpartyName: row.counterpartyName,
            rawDescription: row.rawDescription,
            currentCategory: row.categoryId === null ? null : (names.get(row.categoryId) ?? null),
            newCategory: names.get(update.categoryId) ?? null,
            rule: ruleName.get(update.ruleId!),
          };
        }),
      };
    }

    // `categoryId` only, as the UI does: a rule's result stays non-manual.
    for (const update of updates) {
      tx.update(transactions)
        .set({ categoryId: update.categoryId })
        .where(and(eq(transactions.userId, userId), eq(transactions.id, update.id)))
        .run();
    }
    return {
      total: updates.length,
      perRule,
      changed: updates.map((update) => ({
        transactionId: update.id,
        previousCategoryId: byId.get(update.id)!.categoryId,
      })),
    };
  });

export const registerRunRules = (server: McpServer, db: DrizzleDb, userId: number): void => {
  server.registerTool(
    'run_rules',
    {
      description: [
        'Run the categorisation rules over every transaction, exactly as the app’s "Run rules" does. Manually categorised rows and linked-transfer rows are never touched.',
        'Without ruleIds every enabled rule runs. With ruleIds the named rules are evaluated too (even if disabled) and only the changes they decide are kept — use it to see what a rule would change.',
        `Without confirm: true nothing is written: you get the total, a count per rule and the first ${PREVIEW_ROWS} changes. Call again with confirm: true to apply; the result lists every changed row's previousCategoryId so it can be reverted with assign_categories.`,
        'Saving or editing a rule never applies it; this tool does.',
      ].join(' '),
      inputSchema: runRulesInput,
      annotations: { destructiveHint: true, readOnlyHint: false },
    },
    ({ ruleIds, confirm }) => toolResult(runRules(db, userId, ruleIds, confirm === true)),
  );
};
