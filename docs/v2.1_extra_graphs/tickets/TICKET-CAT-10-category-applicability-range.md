# TICKET-CAT-10 — Assign an applicability range to a category

- **Area:** Categories
- **Type:** Feature
- **Traceability:** adds **FR-CAT-9**. Motivated by the Recurring track: a rent that ended when
  the house was bought must be expressible as a fact ("this category applied 2020–2023"), not just
  as a binary archive. Consumed by [TICKET-CAT-11](./TICKET-CAT-11-pickers-respect-applicability.md)
  (pickers/filters) and [TICKET-REC-05](./TICKET-REC-05-recurring-honours-category-range.md)
  (recurring list).

## User story

As someone whose life changes faster than their category list, I want to record the period a
category actually applied to — rent until the move, a subscription until I cancelled it — so the
app can stop treating an ended chapter as a current option.

## Description

Gives `Category` an optional applicability window (`activeFrom`/`activeUntil`), editable in the
category form, and shows an "Ended" badge on the categories page. This ticket ships the *fact*;
what respects it is CAT-11 (pickers) and REC-05 (recurring list). Two optional, non-indexed
fields — **no new table, no Dexie version bump** (`.stores()` declares indexes, not fields — the
`appSettings` precedent recorded in the data-model skill).

## Current situation (as-is)

- `Category` ([app-db.ts:127-144](../../../src/app/core/data-access/app-db.ts)) carries only the
  binary `archived: boolean`. Archiving removes a category from every `activeCategories()`
  consumer at once ([categories.store.ts:37-38,104-105](../../../src/app/core/state/categories.store.ts))
  — it cannot say *when* a category stopped applying, and an archived category vanishes from
  pickers even for a 2022 transaction it genuinely applied to.
- The category form ([category-form.component.ts:47-53](../../../src/app/feature-categories/components/category-form/category-form.component.ts))
  edits name/kind/group/color/icon; `CategoryFormValue` omits `archived`/`isSystem` and has no
  date fields.
- The categories page ([categories-overview.component.ts](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.ts))
  splits active from archived behind a toggle; nothing about time.

## Desired result (to-be)

- `Category` gains `activeFrom?: string` and `activeUntil?: string` (ISO dates, both optional,
  absent = unbounded on that side — every existing category behaves exactly as before). Non-indexed,
  so **no `.version(n + 1)` block** is added; the field docs on the type say so and why.
- The category form gains an "Applies" pair — optional "from" and "until" date inputs — with
  cross-field validation (`from ≤ until` when both set) and the ability to clear either.
  `CategoryFormValue` carries them; persistence flows through `CategoriesStore` →
  `categories.repository` as every category edit does.
- The categories page marks a category whose `activeUntil` lies in the past with a quiet "Ended
  <date>" badge (text, not colour-only). An ended category is otherwise a normal active category:
  editable, archivable, orderable — *ended* and *archived* stay independent axes (archive = "hide
  this everywhere, I'm done seeing it"; ended = "true until then, and still true about that
  period").
- The JSON export/import round-trip (FR-DAT-1/2) preserves both fields — expected to ride along
  free since export serialises whole rows; asserted, not assumed.
- Nothing else changes behaviour yet: pickers, stats, recurring detection all ignore the window
  until their own tickets consume it.

## Acceptance criteria

- [ ] `Category.activeFrom`/`activeUntil` exist as optional ISO-date fields with doc comments;
      **no new Dexie version block** and no index change (`ng build` + a spec asserting the
      schema version is unchanged).
- [ ] The category form can set, edit and clear both dates; `from > until` is rejected with an
      inline validation message; saving persists through the store/repository (no direct Dexie
      table writes) and survives a reload.
- [ ] A category with `activeUntil` in the past shows the "Ended <date>" badge on the categories
      page (formatted via `localeDate`); one with a future or absent `activeUntil` shows none.
- [ ] Archived and ended remain independent: archiving an ended category and unarchiving it back
      leaves its window untouched, and the badge renders in both the active and archived lists.
- [ ] JSON export includes the two fields and import restores them — covered by a round-trip
      test through the data-management repository.
- [ ] Existing categories (no window) behave exactly as before everywhere — no picker, stat or
      list changes in this ticket.
- [ ] Unit tests cover: form set/clear/validation; persistence round-trip; badge shown/hidden per
      date; export/import round-trip; archived/ended independence.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: set a window on a category, reload, see it persisted and the
      badge rendered.

## Notes

- **Why not just archive rent?** Archiving is timeless: it hides the category from pickers even
  for the years it applied, and it can't distinguish "ended in 2023" from "never mind this". The
  window makes the end a dated fact other features can reason about — CAT-11 keeps ended
  categories offerable *for their own period*, REC-05 keeps a concluded rent out of the recurring
  list without calling it "stopped".
- `isSystem` categories (e.g. the seeded "Partner contribution") can carry a window too — nothing
  special-cases them here.
- Rules targeting an ended category, and the ML suggester's taxonomy
  ([model-config.ts:32](../../../src/app/core/ml/model-config.ts) reads `activeCategories`), are
  deliberately untouched — CAT-11's Notes record the rule-form treatment; making the suggester
  applicability-aware is future work if it ever suggests an ended category in practice.
- Independent of every other ticket in this version; prerequisite for
  [TICKET-CAT-11](./TICKET-CAT-11-pickers-respect-applicability.md) and
  [TICKET-REC-05](./TICKET-REC-05-recurring-honours-category-range.md).
