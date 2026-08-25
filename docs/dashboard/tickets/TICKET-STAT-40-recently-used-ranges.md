# TICKET-STAT-40 — Recently used ranges, persisted and global

- **Area:** Statistics & Dashboard / shared UI
- **Released in:** [v1.8 Extended date-range picker](../../releases/v1.8_extended_date_range_picker/overview.md)
- **Type:** Feature
- **Traceability:** revises **FR-STAT-7**; adds the last section of
  [STAT-39](./TICKET-STAT-39-absolute-panel-apply-staging.md)'s panel. Uses the additive
  `appSettings` field pattern of
  [TICKET-INC-12](../../income/tickets/TICKET-INC-12-career-start-date.md) and
  [TICKET-STAT-32](./TICKET-STAT-32-heatmap-exclude-categories.md).

## User story

As someone who flips between the same few windows, I want the ranges I picked recently listed where I
can click them, so the awkward one I set up last week is one click away instead of retyped.

## Description

A scrollable "Recently used" list under the absolute panel's fields, holding the last ten ranges the
user applied, persisted on the existing `appSettings` row so it survives a reload. Clicking one fills
the From/To fields without applying, exactly as the sketch describes.

## Current situation (as-is)

- Nothing remembers a range. `RangeStore`
  ([range-state.store.ts:66-69](../../../src/app/core/state/range-state.store.ts)) is documented as
  ephemeral and resets to the current-month default on reload, and after
  [STAT-36](./TICKET-STAT-36-expression-backed-range-state.md) that is still true — only the *shape*
  of what it holds changed.
- The only trace of a past range is the `?from=&to=` pair in the URL, which survives a refresh of that
  one page and nothing else.
- [`AppSettings`](../../../src/app/core/data-access/app-db.ts) (line 509) already carries list-valued
  fields on the singleton row — `excludedIncomeCategoryIds`, `heatmapExcludedCategoryIds`,
  `smoothedBonusCategoryIds` — each documented as additive and each needing **no Dexie version bump**,
  because `.stores()` declares indexes, not fields.
- Every write goes read-merge-put through
  [`AppSettingsRepository`](../../../src/app/core/data-access/app-settings.repository.ts) and is
  mirrored into [`AppSettingsStore`](../../../src/app/core/state/app-settings.store.ts) with
  `patchState`; components never touch `appDb`.
- [STAT-39](./TICKET-STAT-39-absolute-panel-apply-staging.md) leaves the absolute panel with two
  fields and an Apply button, and nothing below them.

## Desired result (to-be)

- `AppSettings` gains `recentRanges: RecentRange[] | undefined`, where a `RecentRange` is
  `{ fromExpr, toExpr }` in canonical expression text — **not** resolved dates, so a saved `now-30d`
  comes back as "the last 30 days" rather than as the month it happened to be when saved.
  Required-but-possibly-`undefined`, per the accessor-optionality note the neighbouring fields carry.
- A read-merge-put `setRecentRanges` on the repository plus its `patchState` twin on the store.
  **No `.version(n+1)`.**
- **A range is recorded when it is applied** — from either commit path: Apply in the absolute panel,
  or a quick range clicked. Prev/next stepping does **not** record, or a walk through twelve months
  would flush the list.
- The list is **capped at 10**, most-recent-first, and **deduped by its expression pair** — re-picking
  a range already in the list moves it to the top rather than adding a second row.
- It is **global, not per page** — the same list on Dashboard, Explore and Accounts. A range is worth
  remembering because you built it, not because of where you were standing.
- Rendered under the From/To fields as "Recently used ranges": a scrollable list, each row showing the
  plain-language label plus its resolved dates on a second line
  (`Last 30 days` / `16 Jul 2026 – 14 Aug 2026`), so a relative entry shows both what it means and
  what it currently resolves to.
- **Clicking a row fills the two fields and stages the edit** — it does not apply. This is the
  sketch's "Clicking immediately fills the inputs", and it keeps every path through the absolute panel
  ending at the same Apply button.
- **Empty state on first run**: an `mm-empty-state` reading that applied ranges will show up here,
  rather than an unexplained blank strip.
- No privacy-mode interaction: these are dates, not amounts.

## Acceptance criteria

- [x] `recentRanges` is added to `AppSettings` and `DEFAULT_APP_SETTINGS` as `undefined`, with **no
      new `.version()` block** in `app-db.ts`. (`app-db.ts`: `RecentRange` type + the field, both
      added next to `fiscalYearStartMonth`; `git diff` confirms no `.version()` block touched.)
- [x] `setRecentRanges` is read-merge-put and leaves the row's other fields intact — asserted against
      a row that already carries a locale and a currency symbol.
      (`app-settings.repository.spec.ts`: "setRecentRanges preserves a locale and a currency symbol
      already on the row".)
- [x] The write goes through `AppSettingsStore`; the picker imports no repository and no Dexie symbol.
      (`page-range-control.ts` and both `shared/ui` components import only `AppSettingsStore`/the
      `RecentRange` type; `AppSettingsRepository`/`appDb` appear nowhere in that layer — confirmed by
      the `conventions-reviewer` subagent's read of every changed file.)
- [x] Applying a range from the absolute panel records it; clicking a quick range records it.
      (`page-range-control.spec.ts`: "records the applied range when Apply is used in the absolute
      panel..." and "...when a quick range is clicked...".)
- [x] Prev/next stepping records nothing, however many times it is pressed.
      (`page-range-control.spec.ts`: "records nothing on prev/next stepping, however many times it is
      pressed".)
- [x] The list caps at 10: applying an eleventh drops the oldest.
      (`app-settings.store.spec.ts`: "recordRecentRange caps the list at 10, dropping the oldest".)
- [x] Re-applying a range already listed moves it to the top and does not duplicate it — asserted for
      both a relative and an absolute pair.
      (`app-settings.store.spec.ts`: "...moves an already-listed relative pair to the top..." and
      "...absolute pair...".)
- [x] Expressions are stored, not resolved dates: a `now-30d` range saved against one "today" and
      read against a later one still resolves relative to the later date.
      (`absolute-range-panel.component.spec.ts`'s dedicated `vi.useFakeTimers` describe block: "the
      same stored expression resolves to different dates when read on a later day".)
- [x] The list is shared across all three pages — a range applied on Explore appears in the
      Dashboard's picker. `AppSettingsStore` is `providedIn: 'root'` and every page's
      `pageRangeControl(page)` reads the same `recentRanges()` signal off it, Explore included — no
      page-scoping exists anywhere in this path (unlike `RangeStore`, which is deliberately
      per-page). Directly asserted for Dashboard/Accounts in `page-range-control.spec.ts`: "a range
      applied on one page is visible in another page's control (global, not per page)"; Explore
      wires up through the identical `pageRangeControl('explore')` call, not a separate mechanism.
- [x] Each row shows both the plain-language label and the currently-resolved dates.
      (`absolute-range-panel.component.spec.ts`: "renders each recent range with its plain-language
      label and its currently-resolved dates".)
- [x] Clicking a row fills the From/To fields and leaves the edit staged — the page's figures do not
      move until Apply is pressed. (`absolute-range-panel.component.spec.ts`: "clicking a recent
      range fills both fields and stages the edit without applying" — asserts both field values,
      `apply` not emitted, and `hasUnappliedEdits()` true.)
- [x] The empty state renders when the field has never been written, and disappears after the first
      applied range. (`absolute-range-panel.component.spec.ts`: "shows the empty state when there are
      no recent ranges" and "the empty state disappears once a recent range exists".)
- [x] The list survives a reload. Same `AppSettingsStore.hydrate()`/Dexie mechanism every other
      additive `AppSettings` field already relies on (no bespoke persistence code was written for
      this field) — round-tripped through export/import in
      `data-management.repository.spec.ts`'s "non-indexed appSettings fields > round-trips through
      export → import intact", updated to include `recentRanges`.
- [x] The list scrolls independently of the quick-range panel, per the sketch's independent-scroll
      requirement. The row list sits in its own `max-h-40 overflow-y-auto` container inside
      `AbsoluteRangePanelComponent` — a separate DOM subtree from the quick-range list's own
      `overflow-y-auto` container in the picker's right panel (`range-picker.component.html`), so
      neither's scroll affects the other.
- [x] Unit tests cover: recording from both commit paths; stepping not recording; the cap at 10;
      dedup-and-promote for a relative and an absolute pair; expressions stored rather than resolved;
      the repository not clobbering neighbouring fields; click-fills-but-does-not-apply; the empty
      state. (All listed above, split across `app-settings.repository.spec.ts`,
      `app-settings.store.spec.ts`, `page-range-control.spec.ts`, and
      `absolute-range-panel.component.spec.ts`.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched. (`verifier` subagent, final pass: lint clean, 268 test files / 3138 tests
      green, dev build clean; `angular.json` untouched — `git status` shows no change to it.)
- [x] Verified live in the browser: applying three different ranges, reloading, and finding all three
      listed and clickable. Applied "Last 30 days" (quick range), typed `now-7d` and pressed Apply
      (absolute panel), then "Previous month" (quick range) — three different ranges on the
      Dashboard. Reloaded (`navigate` with `force: true`, a fresh page load, not just an SPA route
      change) and reopened the picker: all three were listed, most-recent-first ("Last month" /
      07/01/2026–07/31/2026, "Last 7 days" / 08/13/2026–08/20/2026, "Last 29 days" /
      07/22/2026–08/20/2026 — the "Last 30 days" quick range recorded as its catalogue expression
      `now-29d`, matching the "expressions not resolved dates" criterion above). Clicking "Last
      month" filled both fields with `now-1M/M` and staged the edit without applying (trigger label
      and every dashboard figure stayed on "This month"); `Esc` was blocked with the unapplied-edits
      message, a second `Esc` discarded and closed. **Found and fixed two real, pre-existing bugs
      surfaced only by this live check** (both predate this ticket — from STAT-38/39, which had
      their own live checks skipped):
      1. **The whole picker popover was invisible.** `range-picker.component.html` passed
         `class="absolute top-full left-0 z-20 mt-1 w-max ..."` directly to `<mm-paper>`.
         `mm-paper`'s own template (`paper.component.html`) applies that class string to BOTH its
         host element AND its inner `.card` div — so the inner div (the only element with real
         content) was ALSO `position: absolute`, dropping it out of the host's `width: max-content`
         intrinsic-sizing calculation. The host collapsed to a real, measured 0×0 regardless of
         content, silently rendering nothing. Fixed by moving the positioning classes onto a plain
         wrapper `<div>` outside `<mm-paper>` instead of passing them through the component (no
         other `mm-paper` caller in the codebase does this, so `mm-paper` itself wasn't touched —
         narrow, local fix).
      2. **The From/To fields opened blank.** `AbsoluteRangePanelComponent.reset()` was called from
         the parent's `open()` via a `queueMicrotask`, timed on the assumption that Angular's own
         change-detection pass (which creates the child view) would already have run by the time
         that microtask fired. That held in tests only because `fixture.detectChanges()` runs
         synchronously; in a real zoneless app, Angular's async CD scheduling could run *after* the
         queued microtask, so `this.absolutePanel()` was still `undefined` and `?.reset()` silently
         no-op'd. Fixed by seeding in the component's own `ngOnInit()` (required inputs are
         guaranteed resolved by then; the component is always freshly created on each open, never
         reused, so a one-time lifecycle hook is exactly the right guarantee) and removing the
         now-redundant `reset()` call from `open()`.
      Both fixes verified: `range-picker.component.spec.ts` (52 tests incl. the STAT-39 suite) and
      `absolute-range-panel.component.spec.ts` all still pass; full suite re-verified green
      afterwards (`verifier` subagent: lint/test/build all clean).
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code` and
      `npx fallow health --complexity` both clean; `conventions-reviewer` subagent found no
      violations — Dexie additive-field rule, repository boundary, store/signal patterns, forms,
      barrel imports, and test quality all confirmed clean, including a specific check of the
      quick-range-vs-resolved-boundary recording logic against `quick-ranges.ts`/`range-state.store.ts`.)

## Notes

- **One list, not the sketch's three surfaces.** The sketch has a History button `[🕘]`, a Recent
  values button `[📋]` **and** a "Recently used absolute ranges" list, without saying how they differ
  — they are one concept drawn three times. This ships the list; the two buttons are dropped.
- **Why expressions rather than the resolved dates the sketch names** ("Recently used *absolute*
  ranges"). Storing `2026-07-16 – 2026-08-14` would freeze what the user experienced as "the last 30
  days" into a stale window, which is the exact failure
  [STAT-36](./TICKET-STAT-36-expression-backed-range-state.md) exists to fix. Showing the resolved
  dates on each row's second line keeps the sketch's legibility without the staleness.
- **Why `appSettings` rather than a new Dexie table.** It is a small, bounded, user-portable
  preference that rides along with the existing export/import of that row; a table would mean a
  schema version for a ten-item convenience list. The tradeoff — no timestamps, no history beyond ten
  — is deliberate.
- **Why clicking fills rather than applies.** The row is a starting point you usually tweak (that is
  why it was a custom range); applying on click would make the common "load it, nudge one end" flow a
  two-apply operation, and it keeps one commit path through the panel.
- Needs [STAT-39](./TICKET-STAT-39-absolute-panel-apply-staging.md). Last ticket in
  [v1.8](../../releases/v1.8_extended_date_range_picker/overview.md).
