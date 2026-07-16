# TICKET-CAT-06 — Share rules (export/import all or a selection)

- **Area:** Categorisation (rules)
- **Type:** Feature
- **Traceability:** extends FR-CAT-2; same export/import shape as FR-DAT-1/FR-DAT-2 ([TICKET-DAT-01](./TICKET-DAT-01-full-data-export-import.md)), scoped to the `rules` table only

## User story

As a user who has tuned a set of categorisation rules, I want to export all of my rules — or just a selection of them — to a file I can hand to someone else, and import a file someone shares with me, so I can pass on a good rule set (or borrow theirs) without re-creating every condition by hand.

## Description

Rules currently exist only inside one browser's IndexedDB with no way to get a subset of them out to share with another user, and no way to bring someone else's rules in. This ticket adds a scoped export (all rules, or a checked selection) to a portable JSON file, and an import flow that adds those rules into the current user's rule set — matching categories by label (name), and falling back to a sentinel "Uncategorised" category when a rule's category label doesn't match anything the importing user has, since category ids aren't portable across databases.

## Current situation (as-is)

- No export/import exists for `rules` specifically. `RulesRepository` ([rules.repository.ts](../../../src/app/core/data-access/rules.repository.ts)) only exposes `getAll`/`add`/`update`/`remove`; TICKET-DAT-01's `exportAll`/`importAll` dump the whole database, not a chosen subset of one table.
- `RuleAction.setCategoryId` ([app-db.ts:148-150](../../../src/app/core/data-access/app-db.ts)) is a local auto-increment `Category` id — meaningless in another user's database, so a naive dump of `Rule` rows would silently miscategorise on import. `RuleCondition` ([app-db.ts:142-146](../../../src/app/core/data-access/app-db.ts)) is self-contained (field/operator/value) and already portable.
- `RulesOverviewComponent` ([rules-overview.component.ts](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.ts)) lists rules in priority order (`filteredRules`) with per-row edit/delete/toggle/move actions, but has no row-selection/checkbox mechanism — every existing action there is single-rule.
- `RulesStore` ([rules.store.ts](../../../src/app/feature-categories/rules.store.ts)) has no `exportRules`/`importRules` methods.
- There is no real "Uncategorised" `Category` row today — the app instead treats a `null` `categoryId` as uncategorised, with `'Uncategorised'` used purely as a display label in the stats layer ([category-composition-trend.ts:5-6](../../../src/app/core/stats/category-composition-trend.ts), [category-period-comparison.ts:5-6](../../../src/app/core/stats/category-period-comparison.ts)). But `RuleAction.setCategoryId` is a required `number`, so a rule's action can't be left `null` — this ticket needs one real, seeded system category to point unmatched rules at. `PARTNER_CONTRIBUTION_CATEGORY_NAME` / `needsPartnerContributionSeed` ([app-db.ts:270-279](../../../src/app/core/data-access/app-db.ts)) is the existing precedent for idempotently seeding a named system category on demand.
- This is the "partial export/import" case v1.4's [overview.md](../overview.md) explicitly deferred out of TICKET-DAT-01's scope ("Considered, not ticketed yet") — this ticket is that deferred feature, scoped to `rules`.

## Desired result (to-be)

- Rules overview gains a selection mode: a checkbox per row plus "select all" / "select none" (scoped to the current `filteredRules()` view, so "select all" respects an active search/filter), with "Export selected" and "Export all rules" actions.
- Export produces a JSON file (e.g. `money-mosaic-rules-YYYY-MM-DD.json`) containing an array of rules with the category reference resolved to its **name (label)**, not its local `categoryId` — e.g. `{ schemaVersion, exportedAt, rules: [{ name, priority, enabled, continueOnMatch, conditionMatch, conditions, action: { setCategoryName } }] }` — so the file is meaningful on a different database.
- A new "Import rules" action on the rules page reads such a file and, for each rule: matches `setCategoryName` against the importing user's categories **by label** (case-insensitive), then adds the rule via `RulesStore` with priority appended after the current maximum (imported rules never silently jump ahead of existing ones) and `enabled` taken from the file.
- **No category is auto-created from the import file's label.** When `setCategoryName` doesn't match any existing category, the rule is still imported, but its action is pointed at a seeded system "Uncategorised"/"Unknown" category instead (created once, idempotently, the same way `PARTNER_CONTRIBUTION_CATEGORY_NAME` is seeded — `isSystem: true` so it isn't mistaken for a user-created one). This keeps an untrusted shared file from silently populating the user's category list with arbitrary names; the user can retarget the rule's category manually afterward via the existing rule-edit form.
- A rule name that collides with an existing rule is added as a **separate** rule rather than overwriting the existing one — `RuleCondition`s could differ even when names match, so silent overwrite risks losing an existing rule's behaviour.
- Entries that are malformed in a way that can't be repaired (missing `name`/`conditions`/`action`, an unrecognised `RuleCondition` operator) are skipped per-rule, with the import reporting how many rules were added vs. skipped (and why) — an unmatched category label is *not* one of these skip cases, since it now resolves to the "Uncategorised" fallback instead.

## Acceptance criteria

- [ ] Rules overview has a selection mode (checkbox per rule + select-all/none, scoped to the filtered view) that doesn't disrupt existing priority reordering, filtering, or edit/delete controls.
- [ ] "Export all rules" and "Export selected rules" both download a `.json` file with no network request, containing the chosen rules with `setCategoryId` resolved to a portable `setCategoryName` label instead of the raw id.
- [ ] "Import rules" accepts a file produced by this ticket's export, matches categories **by label** (case-insensitive) via `CategoriesStore`, and adds each rule through `RulesStore`/`RulesRepository` (never a direct `appDb.rules` write).
- [ ] A rule whose `setCategoryName` matches no existing category is still imported, with its action pointed at a seeded "Uncategorised"/"Unknown" system category — no new category is silently created from the file's label.
- [ ] The "Uncategorised" system category is seeded idempotently (created once, reused on every subsequent import) rather than duplicated per import.
- [ ] Imported rules are appended after the current highest priority, preserving their relative order from the file.
- [ ] A rule whose name collides with an existing rule is added as a separate rule rather than overwriting the existing one.
- [ ] Import reports how many rules were added vs. skipped (with a reason) when the file contains unrepairable entries (missing required fields, unrecognised operator), and does not abort the rest of the import on one bad row.
- [ ] Unit tests cover: export serialises selected vs. all rules with correct category label resolution; import matches an existing category by label (case-insensitive); import falls back to the seeded "Uncategorised" category exactly once across repeated imports with unmatched labels; import appends priorities above the current max; an unrepairable rule entry is skipped without failing the rest of the import.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: select two of several rules, export, confirm the downloaded file only contains those two with category labels (not ids); import that file into a database with a different category set and confirm the rules appear at the end of the priority list, with a label that doesn't exist there landing on "Uncategorised".

## Notes

- This intentionally doesn't reuse TICKET-DAT-01's whole-database `exportAll`/`importAll` — that ticket's Notes explicitly deferred partial/single-table export as a separate, larger feature; this ticket is that feature, scoped to `rules`.
- Resolving `setCategoryId` to a label (rather than the id) is the key design decision that makes a shared rule file meaningful across two different users' databases — category ids are never portable. Falling back to "Uncategorised" rather than auto-creating a category keeps the import from polluting the user's category list with typos or names from someone else's system.
- Filed under v1.4 alongside the other Data Management tickets since it's the same "export to a file / import from a file" shape as DAT-01, but keeps the `CAT` prefix (continuing from TICKET-CAT-05) because the code it touches — `RulesStore`, `RulesRepository`, `RulesOverviewComponent` — lives entirely in `feature-categories`, not in a data-management-specific repository.
