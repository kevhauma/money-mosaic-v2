import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { and, eq, max } from 'drizzle-orm';
import { z } from 'zod';

import type { RuleCondition } from 'shared/entities.js';
import { OPERATORS_BY_FIELD } from 'shared/rule-matching.js';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { categories } from '../schema/categories.js';
import { rules, type RuleRow } from '../schema/rules.js';
import { toolResult } from './tool-result.js';

/**
 * The same cap the rule form puts on a regex condition (`MAX_REGEX_PATTERN_LENGTH`): `run_rules`
 * evaluates these patterns on the server, and a short pattern limits how bad a backtracking one
 * can get.
 */
const MAX_REGEX_LENGTH = 200;

const FIELDS = [
  'description',
  'counterpartyName',
  'counterpartyIban',
  'amount',
  'accountId',
] as const;
const OPERATORS = ['contains', 'equals', 'regex', '>', '<', 'between'] as const;

const conditionSchema = z.object({
  field: z.enum(FIELDS),
  operator: z.enum(OPERATORS),
  value: z
    .union([z.string(), z.number(), z.array(z.number())])
    .describe('A string or number; for "between", [min, max].'),
});

const ruleFields = {
  name: z.string().trim().min(1),
  conditions: z.array(conditionSchema).min(1),
  conditionMatch: z.enum(['all', 'any']).optional().describe('Default "all".'),
  action: z.object({ setCategoryId: z.number().int() }),
  priority: z
    .number()
    .int()
    .optional()
    .describe('Lower runs first. Default: after every existing rule.'),
  enabled: z.boolean().optional().describe('Default true.'),
  continueOnMatch: z
    .boolean()
    .optional()
    .describe('Default false: a match stops the run. true lets later rules override it.'),
};

const updateInput = {
  id: z.number().int(),
  name: ruleFields.name.optional(),
  conditions: ruleFields.conditions.optional(),
  conditionMatch: ruleFields.conditionMatch,
  action: ruleFields.action.optional(),
  priority: ruleFields.priority,
  enabled: ruleFields.enabled,
  continueOnMatch: ruleFields.continueOnMatch,
};

type Condition = z.infer<typeof conditionSchema>;

const regexProblem = (value: string): string | undefined => {
  if (value.length > MAX_REGEX_LENGTH) return `regex longer than ${MAX_REGEX_LENGTH} characters`;
  try {
    // fallow-ignore-next-line security-sink
    new RegExp(value, 'i');
    return undefined;
  } catch {
    return 'regex does not compile';
  }
};

/** Why a condition could never be evaluated as meant, or `undefined` when it is valid. */
const conditionProblem = ({ field, operator, value }: Condition): string | undefined => {
  if (!OPERATORS_BY_FIELD[field].includes(operator))
    return `operator "${operator}" is not allowed for field "${field}" (allowed: ${OPERATORS_BY_FIELD[field].join(', ')})`;
  if (operator === 'between')
    return Array.isArray(value) && value.length === 2 && value[0]! <= value[1]!
      ? undefined
      : '"between" needs [min, max] with min ≤ max';
  if (Array.isArray(value)) return `"${operator}" takes one value, not a list`;
  if (operator === 'regex') return regexProblem(String(value));
  if ((field === 'amount' || field === 'accountId') && typeof value !== 'number')
    return `field "${field}" needs a number`;
  return undefined;
};

/** Throws naming the first invalid condition or field. */
const assertValidRule = (
  tx: DbOrTx,
  userId: number,
  conditions: readonly Condition[],
  setCategoryId: number,
) => {
  conditions.forEach((condition, index) => {
    const problem = conditionProblem(condition);
    if (problem !== undefined) throw new Error(`conditions[${index}]: ${problem}`);
  });
  const target = tx
    .select({ archived: categories.archived })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.id, setCategoryId)))
    .get();
  if (target === undefined) throw new Error('action.setCategoryId: unknown category id');
  if (target.archived) throw new Error('action.setCategoryId: that category is archived');
};

const ownedRule = (tx: DbOrTx, userId: number, id: number): RuleRow => {
  const row = tx
    .select()
    .from(rules)
    .where(and(eq(rules.userId, userId), eq(rules.id, id)))
    .get();
  if (row === undefined) throw new Error('Unknown rule id');
  return row;
};

type CreateInput = z.infer<z.ZodObject<typeof ruleFields>>;
type UpdateInput = z.infer<z.ZodObject<typeof updateInput>>;

/** Saving a rule never applies it — `run_rules` does (TICKET-MCP-03). */
const createRule = (db: DrizzleDb, userId: number, input: CreateInput) =>
  db.transaction((tx) => {
    assertValidRule(tx, userId, input.conditions, input.action.setCategoryId);
    const last =
      tx
        .select({ value: max(rules.priority) })
        .from(rules)
        .where(eq(rules.userId, userId))
        .get()?.value ?? 0;
    const row = tx
      .insert(rules)
      .values({
        userId,
        name: input.name,
        conditions: input.conditions as RuleCondition[],
        conditionMatch: input.conditionMatch ?? 'all',
        action: input.action,
        priority: input.priority ?? last + 1,
        enabled: input.enabled ?? true,
        continueOnMatch: input.continueOnMatch ?? false,
      })
      .returning()
      .get();
    return toEntity(row);
  });

const updateRule = (db: DrizzleDb, userId: number, { id, ...changes }: UpdateInput) =>
  db.transaction((tx) => {
    const previous = ownedRule(tx, userId, id);
    const conditions = changes.conditions ?? previous.conditions;
    const action = changes.action ?? previous.action;
    // Revalidated even when only the name changed: a rule saved before this validation existed, or
    // aiming at a since-archived category, must not be written back silently.
    assertValidRule(tx, userId, conditions, action.setCategoryId);
    const current =
      Object.keys(changes).length === 0
        ? previous
        : tx
            .update(rules)
            .set({ ...changes, conditions: changes.conditions as RuleCondition[] | undefined })
            .where(and(eq(rules.userId, userId), eq(rules.id, id)))
            .returning()
            .get()!;
    return { previous: toEntity(previous), current: toEntity(current) };
  });

const deleteRule = (db: DrizzleDb, userId: number, id: number, confirm: boolean) =>
  db.transaction((tx) => {
    const rule = toEntity(ownedRule(tx, userId, id));
    if (!confirm) return { wouldDelete: rule };
    tx.delete(rules)
      .where(and(eq(rules.userId, userId), eq(rules.id, id)))
      .run();
    return { deleted: rule };
  });

/** Rule editing tools (TICKET-MCP-04). Create and update apply at once; delete previews first. */
export const registerRuleTools = (server: McpServer, db: DrizzleDb, userId: number): void => {
  const operators = Object.entries(OPERATORS_BY_FIELD)
    .map(([field, allowed]) => `${field}: ${allowed.join(' ')}`)
    .join('; ');

  server.registerTool(
    'create_rule',
    {
      description: `Create a categorisation rule. Operators allowed per field — ${operators}. Text matching ignores case; regex patterns are at most ${MAX_REGEX_LENGTH} characters. The target category must exist and not be archived. Saving does not categorise anything: use run_rules to preview and apply.`,
      inputSchema: ruleFields,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) => toolResult(createRule(db, userId, input)),
  );

  server.registerTool(
    'update_rule',
    {
      description:
        'Change any fields of a rule (enabled: false disables it). Applies immediately and returns the previous rule, so the change can be undone with another update. The whole rule is validated as for create_rule. Does not re-categorise anything: use run_rules.',
      inputSchema: updateInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) => toolResult(updateRule(db, userId, input)),
  );

  server.registerTool(
    'delete_rule',
    {
      description:
        'Delete a rule. Without confirm: true it only shows the rule. Transactions the rule already categorised keep their category.',
      inputSchema: { id: z.number().int(), confirm: z.boolean().optional() },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    ({ id, confirm }) => toolResult(deleteRule(db, userId, id, confirm === true)),
  );
};
