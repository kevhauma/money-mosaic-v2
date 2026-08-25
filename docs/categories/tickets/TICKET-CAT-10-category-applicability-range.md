# TICKET-CAT-10 — Assign an applicability range to a category

- **Area:** Categories
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Feature
- **Traceability:** adds **FR-CAT-9**. Motivated by the Recurring track: a rent that ended when
  the house was bought must be expressible as a fact ("this category applied 2020–2023"), not just
  as a binary archive. Consumed by [TICKET-CAT-11](./TICKET-CAT-11-pickers-respect-applicability.md)
  (pickers/filters) and [TICKET-REC-05](../../recurring/tickets/TICKET-REC-05-recurring-honours-category-range.md)
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

**Implementation note, 2026-08-08 — two additions beyond the to-be section.** (1) The boundary
comparison moved out of the categories page into `core/categorisation/category-applicability.ts`
(`categoryHasEnded`), because CAT-11 and REC-05 both have to agree with this page about where the
boundary falls and three copies of a date comparison is three chances to disagree by a day. Only
the `categoryHasEnded` half ships here — the `categoryAppliesOn` counterpart lands with CAT-11,
where something actually asks the question, rather than as a dead export now. (2) The categories
page gained `category-row-vm.ts` and a `categoryRows` computed. The badge was going to be the
row's *sixth* per-row method call and the first to allocate a `Date` and run an `Intl` format on
every change-detection pass; the `account-card-vm.ts` precedent already exists for exactly this,
so the loop now reads plain fields.

- [x] `Category.activeFrom`/`activeUntil` exist as optional ISO-date fields with doc comments;
      **no new Dexie version block** and no index change (`ng build` + a spec asserting the
      schema version is unchanged). (`app-db.ts`; the field docs state *why* no block was added.
      `app-db.spec.ts` pins the intent as "the `categories` table gained no index on either bound"
      rather than as `verno === 13` — a raw version pin would fail for any future schema change
      with a message claiming someone indexed these, which would be false.)
- [x] The category form can set, edit and clear both dates; `from > until` is rejected with an
      inline validation message; saving persists through the store/repository (no direct Dexie
      table writes) and survives a reload. (7 form specs, incl. *"emits undefined rather than an
      empty string for a cleared bound"* — `''` would persist as a bound comparing earlier than
      every real date — and *"accepts a single-day window, where the two bounds are equal"*.
      Persistence: `categories.store.spec.ts` asserts the call goes through `CategoriesRepository`,
      and `categories.repository.spec.ts` proves the clearing path against **real** fake-IndexedDB,
      since only Dexie's `Table.update` actually deletes a key whose value is `undefined` — a mock
      cannot show that, and a silently-kept bound would keep filtering things out forever.)
- [x] A category with `activeUntil` in the past shows the "Ended <date>" badge on the categories
      page (formatted via `localeDate`); one with a future or absent `activeUntil` shows none.
      (4 overview specs. Formatted with `formatDate` — `localeDate`'s own pure function — in the
      row view-model rather than the pipe, since the row is built in the class; locale reactivity
      is identical, both read the same module-level signal.)
- [x] Archived and ended remain independent: archiving an ended category and unarchiving it back
      leaves its window untouched, and the badge renders in both the active and archived lists.
      (Specs: *"leaves the window untouched across an archive/unarchive round trip"* and
      *"renders the badge in the archived list too — ended and archived are independent axes"*.)
- [x] JSON export includes the two fields and import restores them — covered by a round-trip
      test through the data-management repository. (Spec: *"round-trips through export → import
      intact"*, mirroring the `appSettings` block above it, and including the "no window ⇒ neither
      field invented" case.)
- [x] Existing categories (no window) behave exactly as before everywhere — no picker, stat or
      list changes in this ticket. (Both fields optional and unread outside the categories page;
      `categoryHasEnded` returns `false` without an `activeUntil`, asserted directly. The full
      suite passes unchanged apart from the specs this ticket added.)
- [x] Unit tests cover: form set/clear/validation; persistence round-trip; badge shown/hidden per
      date; export/import round-trip; archived/ended independence. (7 form + 4 overview + 3 store +
      3 repository + 3 predicate + 1 export round-trip + 1 schema guard.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (2026-08-08: "All
      files pass linting"; 243 spec files / 2557 tests passed; "Application bundle generation
      complete". **The suite is intermittently red for unrelated reasons** — roughly one failure per
      full run, on a different pre-existing spec each time (`import-wizard`, `app-settings`,
      `category-model.worker`), all passing in isolation. Confirmed pre-existing by running the full
      suite three times with this change removed: it still flaked, on all three. Flagged separately;
      not caused by, and not fixed by, this ticket.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`:
      maintainability 93.3 "good", dead files/exports 0.0%, no CRITICAL. The one duplicate clone
      group it reports is the pre-existing `deleteMessage` block shared with `accounts-overview`,
      re-attributed by a line shift. `conventions-reviewer` confirmed the no-version-bump reasoning
      against Dexie's own source, and raised the row-VM and predicate-extraction points recorded in
      the note above, plus: the validator is now typed `ValidatorFn` with a narrowed `FormGroup`
      instead of string-keyed `get()` (a renamed control now fails to compile rather than silently
      disabling the check); the error gate is `form.hasError(...)` without an arbitrary
      single-control `touched` gate; and the data-model skill's `Category` row and versioning rules
      were updated — the no-bump precedent now reads as a general rule rather than an `appSettings`
      carve-out, which is the ambiguity this ticket had to reason through.)
- [ ] Verified live in the browser: set a window on a category, reload, see it persisted and the
      badge rendered. — **not done: the user asked for this track to be worked without browser
      checks.** Left open rather than ticked. The date inputs' layout inside the modal, and how the
      "Ended" badge sits beside a long category name, are what no spec here speaks for.

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
  [TICKET-REC-05](../../recurring/tickets/TICKET-REC-05-recurring-honours-category-range.md).
