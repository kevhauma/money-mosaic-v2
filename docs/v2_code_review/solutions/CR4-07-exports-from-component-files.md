# CR4-7 — Shared helpers/types exported from component files: options

Finding: [CR4-7](../code-review.md#cr4-7--shared-helpers-and-domain-types-are-exported-from-component-files). Two instances: `formatDisplayDate` (a `formatDate` alias) exported from `date-range-input.component.ts` in `shared/ui`; and the import feature's vocabulary types living in `import-select-step`/`import-map-step` component files with 4-file fan-in.

## Instance 1 — `formatDisplayDate`

- **Option A — delete the alias.** One sweep: replace every `formatDisplayDate` import with `formatDate` from `@/shared/utils`, remove the export from the component file (keeping its internal use). Small, mechanical; the app has one alias site and a handful of consumers. The only design question is whether the *name* `formatDisplayDate` was carrying meaning (display vs. ISO) worth keeping — if so, the rename goes the other way (rename `formatDate` → `formatDisplayDate` **in utils**) and the component alias still dies. Either direction ends the two-barrels-two-names situation; pick one name, one home.
- **Option B — keep the alias, move it to utils.** Re-export `formatDisplayDate` from `date-format.ts`. Strictly worse than A (two names remain) unless grep shows the dual naming is load-bearing in specs/docs — it isn't, per the review pass.

## Instance 2 — Import-feature types in component files

- **Option A — plain domain modules (the CR4-4 floor, restated).** `feature-import/column-mapping.ts` and `feature-import/import-queue.ts` (or one `import-domain.ts`) own `PendingAccountDraft`, `QueuedImportFile`, `ImportMappingResult`, `ColumnFieldKey`/`ColumnFieldDef`/`COLUMN_FIELD_DEFS`, the `MapperStep*` family. Components import types; never the reverse. Type-only consumers stop dragging component templates into their graph, and any future wizard split stops being a 4-file breaking change.
- **Option B — status quo with intent.** Angular's ecosystem does tolerate "the component file is the module" for tightly-coupled I/O types (`TransactionEditResult`, `RuleFormValue` elsewhere in this codebase are healthy examples — single consumer, genuine component contract). The distinction that makes the import cases different is **fan-in**: 4 importers each, including sibling components and the wizard. If B is chosen, that distinction should still be written down (see the rule below) so the healthy cases stay healthy.

## The rule worth writing down (under either outcome)

One line for the coding-conventions skill (fits naturally into CR4-12's edit): *"A component file may export its selector class and I/O types consumed only by its direct host. Vocabulary shared across sibling components — types, constants, helpers — lives in a plain `.ts` module; formatting helpers live in `shared/utils`, never `shared/ui`."* The rule is the durable fix; the two instances are just today's cleanup.

## Enforcement option (optional)

Fallow boundaries or an ESLint `no-restricted-imports` pattern can flag value-imports *from* `*.component.ts` files by non-host consumers — but with the rule written and the two instances fixed, tooling here is probably over-engineering for a codebase this size. Note it; don't build it until a third instance appears.
