import type { Rule, RuleCondition, Transaction } from './entities.js';

export const OPERATORS_BY_FIELD: Record<RuleCondition['field'], RuleCondition['operator'][]> = {
  description: ['contains', 'equals', 'regex'],
  counterpartyName: ['contains', 'equals', 'regex'],
  counterpartyIban: ['contains', 'equals', 'regex'],
  amount: ['equals', '>', '<', 'between'],
  accountId: ['equals'],
};

const fieldValue = (transaction: Transaction, field: RuleCondition['field']): string | number => {
  switch (field) {
    case 'description':
      return transaction.rawDescription;
    case 'counterpartyName':
      return transaction.counterpartyName ?? '';
    case 'counterpartyIban':
      return transaction.counterpartyIban ?? '';
    case 'amount':
      return transaction.amount;
    case 'accountId':
      return transaction.accountId;
  }
};

/** `null` covers both a non-regex condition and an invalid pattern — either way the regex branch fails closed. */
const compileRegex = (value: RuleCondition['value']): RegExp | null => {
  try {
    // Non-literal pattern (CWE-1333/ReDoS candidate, fallow f3f188c9d91b5d51): the pattern is typed
    // by the signed-in user into their own rule and runs in their own browser — or, since
    // TICKET-MCP-03, on the server for that same user's `run_rules` call (one LAN household, and a
    // pathological pattern stalls only a request its own author sent), so the only
    // "attacker" here is themselves. Mitigated per TICKET-PERF-02 — `prepareRules`
    // compiles each pattern once per pass instead of once per transaction, and the rule form caps
    // regex condition input at `MAX_REGEX_PATTERN_LENGTH` (200 chars) as cheap ReDoS damage limitation.
    // Backtracking-safety analysis itself is out of scope (unreliable) per the ticket.
    // fallow-ignore-next-line security-sink
    return new RegExp(String(value), 'i');
  } catch {
    return null;
  }
};

/**
 * `compiledRegex` lets a pass-level caller (`prepareRules`) supply an already-compiled pattern so a
 * bulk pass never re-runs `new RegExp` per transaction (TICKET-PERF-02); pass `undefined` to compile
 * on demand for a one-off check (`conditionMatches`).
 */
const evaluateCondition = (
  actual: string | number,
  condition: RuleCondition,
  compiledRegex: RegExp | null | undefined,
): boolean => {
  switch (condition.operator) {
    case 'contains':
      return String(actual).toLowerCase().includes(String(condition.value).toLowerCase());
    case 'equals':
      return typeof actual === 'number'
        ? actual === Number(condition.value)
        : String(actual).toLowerCase() === String(condition.value).toLowerCase();
    case 'regex': {
      const regex = compiledRegex !== undefined ? compiledRegex : compileRegex(condition.value);
      return regex ? regex.test(String(actual)) : false;
    }
    case '>':
      return Number(actual) > Number(condition.value);
    case '<':
      return Number(actual) < Number(condition.value);
    case 'between': {
      const [min, max] = condition.value as [number, number];
      return Number(actual) >= min && Number(actual) <= max;
    }
  }
};

export const conditionMatches = (transaction: Transaction, condition: RuleCondition): boolean =>
  evaluateCondition(fieldValue(transaction, condition.field), condition, undefined);

export const matchesRule = (transaction: Transaction, rule: Rule): boolean => {
  if (rule.conditions.length === 0) return false;
  const matches = (condition: RuleCondition): boolean => conditionMatches(transaction, condition);
  // Anything other than the explicit 'any' (including a legacy rule with no field) means AND.
  return rule.conditionMatch === 'any'
    ? rule.conditions.some(matches)
    : rule.conditions.every(matches);
};

type PreparedCondition = { condition: RuleCondition; regex: RegExp | null };

/** A rule with its conditions' regexes pre-compiled once — see `prepareRules`. */
export type PreparedRule = { rule: Rule; conditions: PreparedCondition[] };

const prepareCondition = (condition: RuleCondition): PreparedCondition => ({
  condition,
  regex: condition.operator === 'regex' ? compileRegex(condition.value) : null,
});

/**
 * Enabled rules, priority-sorted (ascending = higher priority), with every regex condition
 * pre-compiled once — build this **once per pass**, then evaluate every transaction against the
 * same `PreparedRule[]` via `resolveCategoryForPreparedRules` (TICKET-PERF-02).
 */
export const prepareRules = (rules: Rule[]): PreparedRule[] =>
  [...rules]
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map((rule) => ({ rule, conditions: rule.conditions.map(prepareCondition) }));

const matchesPreparedRule = (transaction: Transaction, prepared: PreparedRule): boolean => {
  if (prepared.conditions.length === 0) return false;
  const matches = (prepared: PreparedCondition): boolean =>
    evaluateCondition(
      fieldValue(transaction, prepared.condition.field),
      prepared.condition,
      prepared.regex,
    );
  return prepared.rule.conditionMatch === 'any'
    ? prepared.conditions.some(matches)
    : prepared.conditions.every(matches);
};

/**
 * The rule that decides a transaction's category: the last match before a rule without
 * `continueOnMatch` stops the run (FR-CAT-2). Rules must already be prepared by `prepareRules`.
 */
const decidingRule = (
  transaction: Transaction,
  preparedRules: PreparedRule[],
): Rule | undefined => {
  let result: Rule | undefined;
  for (const prepared of preparedRules) {
    if (matchesPreparedRule(transaction, prepared)) {
      result = prepared.rule;
      if (!prepared.rule.continueOnMatch) {
        return result;
      }
    }
  }
  return result;
};

/** Evaluates rules already prepared by `prepareRules` — no per-transaction sort or regex compile (TICKET-PERF-02). */
export const resolveCategoryForPreparedRules = (
  transaction: Transaction,
  preparedRules: PreparedRule[],
): number | undefined => decidingRule(transaction, preparedRules)?.action.setCategoryId;

/** One category change a rule run would make, and the rule that decided it (TICKET-MCP-03). */
export type RuleRunUpdate = { id: number; categoryId: number; ruleId: number | undefined };

/**
 * The pure body of a rule run, shared by the UI's "Run rules" and the server's `run_rules` tool
 * (TICKET-MCP-03): only rows whose category would change, never a manually categorised row (FR-TXN-2,
 * FR-CAT-3) nor a transfer leg, whose category is cleared on link and must stay so (TICKET-TRF-01).
 * Rules are prepared once for the whole pass (TICKET-PERF-02).
 */
export const applyRules = (transactions: Transaction[], rules: Rule[]): RuleRunUpdate[] => {
  const preparedRules = prepareRules(rules);
  return transactions.flatMap((transaction) => {
    if (transaction.categoryManual || transaction.transferId != null) return [];
    const rule = decidingRule(transaction, preparedRules);
    const categoryId = rule?.action.setCategoryId;
    return categoryId != null && categoryId !== transaction.categoryId
      ? [{ id: transaction.id!, categoryId, ruleId: rule?.id }]
      : [];
  });
};

/**
 * Evaluates enabled rules in priority order (ascending = higher priority) against one transaction.
 * First match wins unless `continueOnMatch` lets a later rule override the assignment (FR-CAT-2).
 * Convenience wrapper for a single check; a bulk pass over many transactions should call
 * `prepareRules` once and reuse it via `resolveCategoryForPreparedRules` instead (TICKET-PERF-02).
 */
export const resolveCategoryForTransaction = (
  transaction: Transaction,
  rules: Rule[],
): number | undefined => resolveCategoryForPreparedRules(transaction, prepareRules(rules));
