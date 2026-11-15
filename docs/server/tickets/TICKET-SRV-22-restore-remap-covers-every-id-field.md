# TICKET-SRV-22 — A spec fails when an id-bearing field has no restore remap

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Refactor
- **Traceability:** FR-DAT-2 (import a backup); CR6-A5 ([code review](../../releases/v3_code_review_2/code-review.md)); guards [TICKET-SRV-14](./TICKET-SRV-14-import-renumbers-colliding-ids.md)'s remap

## User story

As a developer adding a field that points at another row, I want a test to fail if a cross-account restore wouldn't renumber it, so the next missed field is caught before it ships rather than in someone's stats.

## Description

A restore into another account renumbers colliding rows and rewrites the references to them. Foreign keys are found automatically. Settings columns and ids inside JSON have to be listed in `EMBEDDED` by hand, and nothing checks that list. `jointAccountId` ([TICKET-SRV-16](./TICKET-SRV-16-restore-remaps-joint-account-override.md)) was missed this way.

## Current situation (as-is)

- `remapReferences` in [`import-ids.ts`](../../../server/src/operations/import-ids.ts) combines `referencesOf(table)`, which covers declared foreign keys and `SOFT_REFERENCES`, with the hand-kept `EMBEDDED` map (lines 89–142). The comment above `EMBEDDED` and SRV-14's Notes both say a new id field must be added there by hand.
- [`import-ids.spec.ts`](../../../server/src/operations/import-ids.spec.ts) has three cases, which check only the fields listed today. A new `*Id` column or JSON key without a rewrite passes every test.

## Desired result (to-be)

- A guard spec builds a plan that renumbers **every** id in every per-user table, and runs `remapReferences` over a fixture row per table with every id-bearing field filled. It fails, naming the table and field, if any field comes back unchanged.
- Id-bearing fields are found in two ways:
  - **Columns:** every Drizzle column whose name ends in `Id` or `Ids`, read off the schema at test time, so a new column is covered automatically.
  - **JSON keys:** `attributionOverride`, rule `action`, and rule conditions with `field: 'accountId'`. Their fixtures are typed with `satisfies Required<…>` against the `shared/entities.ts` types, so adding a key there fails `typecheck` until the fixture names it.
- A field that is not an entity reference sits on a short, commented exclusion list in the spec:
  - `dashboardLayoutSettings.hiddenRowIds` names dashboard rows;
  - `transactions.reimbursementTransferId` is derived from the JSON.

## Acceptance criteria

- [ ] The guard spec passes with every current field covered, including `jointAccountId` once SRV-16 has landed.
- [ ] Deleting any one rewrite from `EMBEDDED` locally makes the guard fail and name the field. (Check this once by hand when building.)
- [ ] Adding a column ending in `Id` to a per-user table without a reference or rewrite makes the guard fail.
- [ ] Adding a new key to `attributionOverride`'s type in `shared/entities.ts` fails `npm --prefix server run typecheck` until the guard fixture names it.
- [ ] `npm run test:server`, `npm --prefix server run lint` and `npm --prefix server run typecheck` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The review proposed walking "the entity types". TypeScript types don't exist at runtime, so the guard walks the Drizzle columns for the column half and relies on `satisfies` for the JSON half.
- Build after SRV-16; before it, the guard fails on `jointAccountId`, which is the point.
