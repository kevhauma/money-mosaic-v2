import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Rule, RuleAction, RuleCondition } from 'shared/entities.js';
import { inList, json, jsonArray, ownerId } from './columns.js';

const MATCHES: readonly [
  NonNullable<Rule['conditionMatch']>,
  ...NonNullable<Rule['conditionMatch']>[],
] = ['all', 'any'];

/**
 * A categorisation rule (FR-CAT-2), ported from Dexie's `rules` store (TICKET-SRV-02).
 *
 * `conditions` and `action` are JSON: they are nested shapes nothing queries on, and typing the
 * columns against the shared `RuleCondition`/`RuleAction` means a rule that round-trips through
 * the server keeps the exact shape the rules engine evaluates.
 *
 * `conditionMatch` is nullable because rules created before TICKET-CAT-01 have no value and are
 * read as `'all'` — the same tri-state the Dexie rows carry.
 */
export const rules = sqliteTable(
  'rules',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    name: text('name').notNull(),
    priority: integer('priority').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull(),
    continueOnMatch: integer('continueOnMatch', { mode: 'boolean' }).notNull(),
    conditionMatch: text('conditionMatch', { enum: MATCHES }),
    conditions: jsonArray<RuleCondition[]>('conditions').notNull(),
    action: json<RuleAction>('action').notNull(),
  },
  (table) => [
    index('rules_userId_idx').on(table.userId),
    index('rules_userId_priority_idx').on(table.userId, table.priority),
    index('rules_userId_enabled_idx').on(table.userId, table.enabled),
    inList('rules_conditionMatch_check', table.conditionMatch, MATCHES),
  ],
);

export type RuleRow = typeof rules.$inferSelect;
export type NewRuleRow = typeof rules.$inferInsert;
