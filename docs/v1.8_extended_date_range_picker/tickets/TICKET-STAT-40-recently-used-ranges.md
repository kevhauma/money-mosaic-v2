# TICKET-STAT-40 — Recently used ranges, persisted and global

- **Area:** Statistics & Dashboard / shared UI
- **Type:** Feature
- **Traceability:** revises **FR-STAT-7**; adds the last section of
  [STAT-39](./TICKET-STAT-39-absolute-panel-apply-staging.md)'s panel. Uses the additive
  `appSettings` field pattern of
  [TICKET-INC-12](../../v1.6_income_growth/tickets/TICKET-INC-12-career-start-date.md) and
  [TICKET-STAT-32](../../v2.1_extra_graphs/tickets/TICKET-STAT-32-heatmap-exclude-categories.md).

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

- [ ] `recentRanges` is added to `AppSettings` and `DEFAULT_APP_SETTINGS` as `undefined`, with **no
      new `.version()` block** in `app-db.ts`.
- [ ] `setRecentRanges` is read-merge-put and leaves the row's other fields intact — asserted against
      a row that already carries a locale and a currency symbol.
- [ ] The write goes through `AppSettingsStore`; the picker imports no repository and no Dexie symbol.
- [ ] Applying a range from the absolute panel records it; clicking a quick range records it.
- [ ] Prev/next stepping records nothing, however many times it is pressed.
- [ ] The list caps at 10: applying an eleventh drops the oldest.
- [ ] Re-applying a range already listed moves it to the top and does not duplicate it — asserted for
      both a relative and an absolute pair.
- [ ] Expressions are stored, not resolved dates: a `now-30d` range saved against one "today" and
      read against a later one still resolves relative to the later date.
- [ ] The list is shared across all three pages — a range applied on Explore appears in the
      Dashboard's picker.
- [ ] Each row shows both the plain-language label and the currently-resolved dates.
- [ ] Clicking a row fills the From/To fields and leaves the edit staged — the page's figures do not
      move until Apply is pressed.
- [ ] The empty state renders when the field has never been written, and disappears after the first
      applied range.
- [ ] The list survives a reload.
- [ ] The list scrolls independently of the quick-range panel, per the sketch's independent-scroll
      requirement.
- [ ] Unit tests cover: recording from both commit paths; stepping not recording; the cap at 10;
      dedup-and-promote for a relative and an absolute pair; expressions stored rather than resolved;
      the repository not clobbering neighbouring fields; click-fills-but-does-not-apply; the empty
      state.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified live in the browser: applying three different ranges, reloading, and finding all three
      listed and clickable.
- [ ] Verified via the fallow skill and coding-conventions skill.

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
  [v1.8](../overview.md).
