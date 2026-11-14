# TICKET-MCP-04 — Create, edit, archive and delete categories and rules from an agent

- **Area:** MCP
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** FR-CAT-1 / FR-CAT-2 / FR-CAT-9; needs TICKET-MCP-01, TICKET-MCP-03 (shared `OPERATORS_BY_FIELD`) and TICKET-CAT-12 (the shared category-delete operation)

## User story

As someone restructuring my categories with an agent, I want it to create, edit, archive and delete categories and rules, so the agent can finish a cleanup instead of handing me a list of things to click.

## Description

Six write tools: `create_category`, `update_category`, `delete_category`, `create_rule`, `update_rule` and `delete_rule`. Creating and editing apply straight away, since neither touches a transaction. Deleting is destructive and needs `confirm: true`. Archiving a category and disabling a rule both go through update.

## Current situation (as-is)

- Categories and rules use the generic entity router's POST and PATCH ([entity-router.ts](../../../server/src/routes/entity-router.ts); rules are listed in [api.ts](../../../server/src/routes/api.ts)).
- `DELETE /api/categories/:id` ([categories.ts](../../../server/src/routes/categories.ts)) refuses while a loan tracks the category, and otherwise clears the category from its transactions (`categoryManual: false`) in the same transaction. TICKET-CAT-12 also refuses while a rule targets it, as a shared operation.
- Categories have `archived` and `activeFrom`/`activeUntil` ([schema](../../../server/src/schema/categories.ts)). Rules have `enabled` and no archived state ([shared/entities.ts](../../../shared/entities.ts) `Rule`).
- Every **seeded** category has `isSystem: true` ([shared/seed-data.ts](../../../shared/seed-data.ts)), and the UI lets you rename and delete them. The only lock is the **name** of the "Partner contribution" category, enforced in the form alone ([category-form.component.ts](../../../src/app/feature-categories/components/category-form/category-form.component.ts)). Co-owner tagging finds that category by name ([co-owner-contribution.service.ts](../../../src/app/core/categorisation/co-owner-contribution.service.ts)).
- A rule's `action.setCategoryId` is JSON, with no foreign key, so nothing checks it points at a real category the user owns.

## Desired result (to-be)

- **`create_category`:**
  - takes `{name, kind, group?, color?, icon?, activeFrom?, activeUntil?}`;
  - `isSystem` is always false and `archived` false;
  - a missing `color` becomes `#9CA3AF` and a missing `icon` becomes `tag`, the defaults the rule-share import already uses;
  - a name that matches one of the user's existing categories, case-insensitively, is refused.
- **`update_category`:**
  - takes `{id, …any of the above, archived?}` as a partial update;
  - renaming the Partner contribution category is refused (it's identified by `isSystem` plus its name, as the form does);
  - a duplicate name is refused, as on create;
  - returns the previous values.
- **`delete_category`** (destructive):
  - previews how many transactions lose their category and whether a loan or rule blocks the delete;
  - with `confirm: true`, it calls TICKET-CAT-12's shared operation, which refuses while a loan or rule targets the category and lists them;
  - deleting Partner contribution is refused.
- **`create_rule` / `update_rule`:**
  - take `{name, conditions, conditionMatch?, action: {setCategoryId}, priority?, enabled?, continueOnMatch?}`; update is partial and returns the previous rule;
  - a missing `priority` on create puts the rule last: highest existing priority + 1, the same as rule-share import;
  - **validation:**
    - every `operator` must be allowed for its `field` (`OPERATORS_BY_FIELD`);
    - `between` needs `[min, max]` with min ≤ max;
    - `regex` values must compile;
    - at least one condition;
    - `setCategoryId` must be a category the user owns that isn't archived;
  - saving does **not** apply the rule (`run_rules` from TICKET-MCP-03 does that).
- **`delete_rule`** (destructive): previews the rule; deletes it with `confirm: true`. Categories already assigned by the rule stay as they are.
- Every tool runs as the token user and refuses IDs owned by anyone else.

## Acceptance criteria

- [ ] `create_category` stores `isSystem: false` and `archived: false`, fills in the default colour and icon, and refuses a duplicate name regardless of case.
- [ ] `update_category` with `archived: true` archives, and `list_categories` then hides the category by default. The tool returns the previous values.
- [ ] Renaming or deleting the Partner contribution category is refused. Every other seeded category can be renamed and deleted, as in the UI.
- [ ] Without `confirm`, `delete_category` writes nothing and reports the affected transaction count and any blocking loans or rules. With `confirm`, it uses TICKET-CAT-12's operation, so it refuses while a rule or loan targets the category and otherwise clears the category from its transactions with `categoryManual: false`.
- [ ] `create_rule` and `update_rule` reject: an operator not allowed for its field, a malformed `between`, an invalid regex, no conditions, and a target category that is foreign, missing or archived. Each error names the offending condition or field.
- [ ] Saving a rule changes no transaction (covered by a spec).
- [ ] A missing `priority` on create places the rule after every existing rule.
- [ ] `update_rule` with `enabled: false` disables the rule, and `run_rules` then ignores it.
- [ ] Without `confirm`, `delete_rule` writes nothing. With `confirm`, it deletes, and transactions the rule categorised keep their category.
- [ ] Every tool refuses another user's IDs (covered by a two-user spec).
- [ ] `npm --prefix server run lint`, `npm --prefix server run typecheck` and `npm run test:server` pass. Verified via the fallow skill and the coding-conventions skill.

## Notes

- **Deviation from the design session:** Q12 agreed to "protect system categories", based on my mistaken belief that `isSystem` marked only the categories the app depends on. In fact every seeded category has it, and the UI lets you delete and rename them all. Only Partner contribution is protected here, because it's the one the app looks up by name. "Uncategorised" (rule-share import) is also looked up by name, but it recreates itself if missing, so it isn't locked.
- **Duplicate names are refused** here, though the UI allows them: an agent creating "Groceries" twice is a much likelier mistake than a person doing it.
- **Confirmation only on deletes**, decided 2026-11-14 (Q11). Create and update return previous values instead, so a wrong edit can be reverted.
- Server-side validation of category and rule bodies on the REST routes is not in scope. If it's worth having, the validation added here could later back those routes too.
