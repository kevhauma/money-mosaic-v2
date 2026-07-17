import type { Category, Rule, RuleCondition } from '@/core/data-access';

/** Bumped only if the shape of a shared-rules file ever needs a breaking change. */
export const SHARED_RULES_SCHEMA_VERSION = 1;

/**
 * Name of the system category an imported rule falls back to when its `setCategoryName` doesn't
 * match any category the importing user has (TICKET-CAT-06). Deliberately never auto-created from
 * an arbitrary label found in the file — only this fixed, known name is ever seeded.
 */
export const UNCATEGORISED_RULE_CATEGORY_NAME = 'Uncategorised';

const RULE_CONDITION_FIELDS: RuleCondition['field'][] = [
  'description',
  'counterpartyName',
  'counterpartyIban',
  'amount',
  'accountId',
];

const RULE_CONDITION_OPERATORS: RuleCondition['operator'][] = [
  'contains',
  'equals',
  'regex',
  '>',
  '<',
  'between',
];

/** A rule as it appears in a shared-rules file — `setCategoryName` (a label) replaces `setCategoryId`, which isn't portable across databases. */
export type SharedRuleEntry = {
  name: string;
  priority: number;
  enabled: boolean;
  continueOnMatch: boolean;
  conditionMatch: 'all' | 'any';
  conditions: RuleCondition[];
  action: { setCategoryName: string };
};

export type SharedRulesFile = {
  schemaVersion: number;
  exportedAt: string;
  rules: SharedRuleEntry[];
};

export type SkippedRuleEntry = { index: number; reason: string };

/** Serialises rules for export, resolving each `setCategoryId` to a portable label (TICKET-CAT-06) — falls back to the "Uncategorised" label if the referenced category can't be found (shouldn't normally happen for a rule's own database). */
export const toSharedRules = (
  rules: Rule[],
  categoriesById: Map<number, Category>,
): SharedRulesFile => ({
  schemaVersion: SHARED_RULES_SCHEMA_VERSION,
  exportedAt: new Date().toISOString(),
  rules: [...rules]
    .sort((a, b) => a.priority - b.priority)
    .map((rule) => ({
      name: rule.name,
      priority: rule.priority,
      enabled: rule.enabled,
      continueOnMatch: rule.continueOnMatch,
      conditionMatch: rule.conditionMatch ?? 'all',
      conditions: rule.conditions,
      action: {
        setCategoryName:
          categoriesById.get(rule.action.setCategoryId)?.name ?? UNCATEGORISED_RULE_CATEGORY_NAME,
      },
    })),
});

const isValidCondition = (value: unknown): value is RuleCondition => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<RuleCondition>;
  return (
    typeof candidate.field === 'string' &&
    (RULE_CONDITION_FIELDS as string[]).includes(candidate.field) &&
    typeof candidate.operator === 'string' &&
    (RULE_CONDITION_OPERATORS as string[]).includes(candidate.operator) &&
    (typeof candidate.value === 'string' ||
      typeof candidate.value === 'number' ||
      Array.isArray(candidate.value))
  );
};

/** Loosely-typed shape of one raw import entry before validation — a plain type (not an index signature) so property access stays dotted under `noPropertyAccessFromIndexSignature`. */
type RawSharedRuleEntry = {
  name?: unknown;
  priority?: unknown;
  enabled?: unknown;
  continueOnMatch?: unknown;
  conditionMatch?: unknown;
  conditions?: unknown;
  action?: { setCategoryName?: unknown };
};

/** Validates and normalises one raw import entry. Returns a reason string instead of throwing so a bad row can be skipped without failing the rest of the import. */
export const parseSharedRuleEntry = (raw: unknown): SharedRuleEntry | { error: string } => {
  if (typeof raw !== 'object' || raw === null) {
    return { error: 'entry is not an object' };
  }
  const candidate = raw as RawSharedRuleEntry;

  if (typeof candidate.name !== 'string' || candidate.name.trim() === '') {
    return { error: 'missing rule name' };
  }
  if (!Array.isArray(candidate.conditions) || candidate.conditions.length === 0) {
    return { error: 'missing conditions' };
  }
  if (!candidate.conditions.every(isValidCondition)) {
    return { error: 'unrecognised condition field or operator' };
  }
  const action = candidate.action;
  if (typeof action?.setCategoryName !== 'string' || action.setCategoryName.trim() === '') {
    return { error: 'missing category name' };
  }

  return {
    name: candidate.name,
    priority: typeof candidate.priority === 'number' ? candidate.priority : 0,
    enabled: candidate.enabled !== false,
    continueOnMatch: candidate.continueOnMatch === true,
    conditionMatch: candidate.conditionMatch === 'any' ? 'any' : 'all',
    conditions: candidate.conditions as RuleCondition[],
    action: { setCategoryName: action.setCategoryName },
  };
};

/** Parses a whole shared-rules file, separating repairable entries from unrepairable ones rather than failing the whole import on one bad row. */
export const parseSharedRulesFile = (
  raw: unknown,
): { entries: SharedRuleEntry[]; skipped: SkippedRuleEntry[] } => {
  const rules = (raw as { rules?: unknown } | null)?.rules;
  if (typeof raw !== 'object' || raw === null || !Array.isArray(rules)) {
    throw new Error('This file is not a Money Mosaic rules export.');
  }

  const entries: SharedRuleEntry[] = [];
  const skipped: SkippedRuleEntry[] = [];

  rules.forEach((rawEntry, index) => {
    const result = parseSharedRuleEntry(rawEntry);
    if ('error' in result) {
      skipped.push({ index, reason: result.error });
    } else {
      entries.push(result);
    }
  });

  return { entries, skipped };
};
