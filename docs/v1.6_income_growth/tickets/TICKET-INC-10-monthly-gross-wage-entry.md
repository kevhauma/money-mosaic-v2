# TICKET-INC-10 — Monthly salary metadata (gross wage + embedded bonus)

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-10 (new)

## User story

As a user, I want to attach a gross wage amount to each month (manual entry, editable/deletable),
and optionally record the portion of that month's deposit that was a 13th month/vacation/holiday
bonus, so I have a gross figure to compare against what actually lands in my account — something no
bank CSV will ever tell me — and so a bonus baked into one salary deposit doesn't distort that
month's take-home ratio.

## Description

Lets the user attach a gross wage figure to a given month, since bank CSVs only ever contain what
actually lands in the account (net) and gross pay can't be derived from that. Also lets the user
note, for that same month, how much of the deposit was a lump-sum bonus rather than regular pay —
covering the case where 13th month/vacation/holiday pay arrives *inside* the normal salary deposit
rather than as its own transaction (the case TICKET-INC-04's category-level smoothing can't reach,
since there's no separate category to flag).

## Current situation (as-is)

- No entity for this exists. [app-db.ts](../../../src/app/core/data-access/app-db.ts) is at schema
  **v12** (13 tables; v12 added the `appSettings` singleton row for TICKET-SET-05) — not v6 as this
  ticket originally assumed. The `MappingProfile`/`ImportBatch` repository-per-entity pattern (many
  rows, one per import/profile) is still the closest precedent — closer than `TransferSettings`/
  `appSettings`'s singleton-row pattern, since this needs one row per month.
- **The `.stores()` convention changed at v11.** Versions 1–10 repeat the full table map and are
  frozen; from `.version(11)` onward each block declares **only** the tables that are new or have an
  index change, since Dexie carries forward everything omitted. `.version(12)`'s block is literally
  `{ appSettings: 'id' }`.
- Export/import (v1.4) iterates `appDb.tables` generically
  ([data-management.repository.ts](../../../src/app/core/data-access/data-management.repository.ts)),
  so a new table is picked up automatically — but the export records `schemaVersion: appDb.verno`,
  and `importAll` rejects a backup whose version is *newer* than the running app. A pre-v1.6 backup
  imports fine (the new table just has no rows).
- `mm-modal` ([mm-modal.component.ts](../../../src/app/shared/ui/modal/mm-modal.component.ts)) is
  the established pattern for an on-demand edit screen opened by a button click — used by
  `account-form`, `category-form`, `rule-form`, and `transaction-edit-form`. This ticket's original
  design was an always-visible inline component; the revision below uses `mm-modal` instead, so the
  Income page isn't permanently hosting a data-entry form most visits don't need.
- `mm-table` ([table.component.ts](../../../src/app/shared/ui/table/table.component.ts)) is only an
  `overflow-x-auto`/border/zebra shell — `<thead>`/`<tr>`/`<th>`/`<td>` are hand-authored via content
  projection, and nothing in the app currently gives a `<thead>` `position: sticky`. `mm-collapse`
  ([collapse.component.ts](../../../src/app/shared/ui/collapse/collapse.component.ts)) wraps
  daisyUI's collapse with independent `open = model(false)` state per instance, used today for FAQ
  entries — never yet for grouping table rows. Both need composing fresh for this ticket; neither
  primitive itself needs to change.
- Two existing components wire an echarts click to open something: `net-worth-history-chart`
  ([net-worth-history-chart.component.html:10](../../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.html))
  navigates on `(chartClick)="onChartClick($event)"`, and `trend-chart-panel`
  ([trend-chart-panel.component.ts:160](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts))
  reads `event.dataIndex` off the same `ECElementEvent` to resolve a bucket key. FR-INC-2's income
  chart doesn't wire this yet — this ticket is what adds it.

## Desired result (to-be)

> **Revised 2026-08-01, before any part of this ticket was built.** Renamed from `GrossWageEntry` to
> `SalaryMetadata` and gained a `bonus` field, and the entry point changed from an always-visible
> inline component to a button that opens a modal.

- New `SalaryMetadata` type in `app-db.ts`:
  `{ id?: number; yearMonth: string /* 'YYYY-MM' */; grossWage: number; bonus?: number; note?: string }`,
  plus a `salaryMetadata!: Table<SalaryMetadata, number>` field on `AppDb`. `bonus` is the portion of
  that month's actual deposit that was a lump-sum bonus rather than regular pay — optional, absent
  or `0` for an ordinary month.
- `this.version(13).stores({ salaryMetadata: '++id, &yearMonth' })` — **only** the new table in the
  block, per the v11+ minimal-declaration convention; `&yearMonth` is a **unique** index, since only
  one metadata row makes sense per month. No `.upgrade()` needed (new empty table, same as
  `appSettings` at v12 and `categoryModel` before it).
- New `core/data-access/salary-metadata.repository.ts` (`getAll`, `upsert(entry)`, `remove(id)`),
  exported via `core/data-access/index.ts`, following the one-repository-per-entity convention.
- `IncomeStore` gains `salaryMetadata` state (hydrated on init, like every other entity-backed store)
  and `setSalaryMetadata(yearMonth, { grossWage, bonus? })` / `removeSalaryMetadata(id)` methods that
  call the repository then patch state — never touching `appDb.salaryMetadata` directly from a
  component.
- **Entry point:** a "Salary details" button (icon + label, `tablerReceipt2` or similar) sits next to
  TICKET-INC-04's Income settings popup trigger in the page header — a sibling action, not folded
  into that popup, since this opens a data-entry screen rather than a settings panel. Clicking it
  opens an `mm-modal` hosting a new `salary-metadata-table.component.{ts,html}`.

- **The modal's content is a single always-editable table, not a form-plus-list.** No "add entry"
  step and no save button — every month in range already has a row, editing a cell persists on
  blur:
  - **Rows:** one per calendar month across the income page's full range (`IncomeStore`'s
    `incomeRange`/`fullHistoryRange` — whichever months the trend chart can show), grouped into one
    `mm-collapse` section per year. A row's label is the full "July 2025" (month + year), not just
    the month name, since a screen reader user or someone scrolling fast shouldn't need the
    enclosing collapse's title for context.
  - **Columns:** Month | Gross wage | Bonus. Each amount cell is an `mm-input` bound directly to
    that row's `grossWage`/`bonus` — no intermediate `FormGroup` per row, just a signal-backed value
    that calls `incomeStore.setSalaryMetadata(yearMonth, { grossWage, bonus })` on the input's
    `(blur)`, and only if the value actually changed (skip the write if blur fires with no edit, so
    tabbing through empty cells doesn't create empty-but-persisted rows). An empty cell stays
    genuinely empty (no `SalaryMetadata` row written) until the user types something.
  - **Sticky header:** the `Month | Gross wage | Bonus` header row stays pinned while the table body
    scrolls beneath it — `mm-table` doesn't support this yet, so this ticket adds `position: sticky`
    (plus a background color, since sticky content needs an opaque backdrop to not show scrolled
    rows through it) to its own `<thead>`, scoped to this component rather than changed globally on
    `mm-table` (no other table in the app currently needs a sticky header, so this stays local until
    a second consumer justifies promoting it).
  - **Info icon on the "Bonus" header:** `ng-icon` (`tablerInfoCircle`) with a native `title`
    attribute — same pattern already used elsewhere in the app (e.g.
    [income-overview.component.html](../../../src/app/feature-income/components/income-overview/income-overview.component.html))
    — explaining what the column does: "The part of this month's deposit that was a 13th
    month, vacation, or holiday bonus rather than regular pay. Subtracted from your net income
    before it's compared to gross wage."
  - **Year sections:** collapsed by default except the current year, which opens expanded. Opening
    an `mm-collapse` section for a year that has no rows yet still renders its 12 month rows (all
    blank/editable) rather than only showing years that already have data — so a user can retroactively
    fill in an earlier year without the row existing first.

- **Chart-click entry point:** FR-INC-2's income-by-category chart gains
  `(chartClick)="onChartClick($event)"` (the same `ECElementEvent` pattern as
  `net-worth-history-chart`/`trend-chart-panel`). Clicking any point resolves `event.dataIndex` to a
  `bucketKey` (`'YYYY-MM'`) via the chart's own `bucketKeys`, opens the same
  `salary-metadata-table` modal, pre-expands that `bucketKey`'s year section (collapsing the
  current-year default if it's a different year), and scrolls/focuses that row's "Gross wage" cell
  — so clicking a spike takes the user straight to the field most likely to explain it, without
  hunting through a collapsed table by hand.

## Acceptance criteria

- [ ] `salaryMetadata` table enforces one entry per `yearMonth` (unique index) — attempting to add a
      second entry for the same month updates the existing one instead of creating a duplicate
      (`upsert` semantics).
- [ ] Schema version is **13**, and its `.stores()` block declares **only** `salaryMetadata` — the
      v11+ minimal-declaration convention, *not* the full-table-map style of the frozen v1–v10
      blocks. No shipped version block is edited.
- [ ] `bonus` is optional; a month entered with only `grossWage` behaves exactly as a plain gross-wage
      entry (no bonus subtraction happens anywhere downstream).
- [ ] Data-management export includes the new table and a round-trip (export → clear → import)
      restores salary-metadata rows; an older backup (schemaVersion < 13) still imports without
      error.
- [ ] `IncomeStore` never lets a component call `appDb.salaryMetadata` directly — all access via
      `SalaryMetadataRepository`.
- [ ] The "Salary details" button opens the modal from anywhere on the Income page; the table has one
      row per month across the page's full range, grouped into one collapsible section per year.
- [ ] Editing a cell and blurring persists it (`setSalaryMetadata`) without a save button; blurring a
      cell that wasn't changed does not write anything (no empty `SalaryMetadata` rows created by
      tabbing through); unit test on the row's blur handler covers both cases.
- [ ] Clearing a cell back to empty and blurring removes that field from the row's `SalaryMetadata`
      entry (or the whole entry, if both `grossWage` and `bonus` are now empty) rather than persisting
      a zero.
- [ ] The table header (`Month | Gross wage | Bonus`) stays visible (`position: sticky`) while the
      body scrolls beneath it inside the modal.
- [ ] The current year's section is expanded by default; every other year starts collapsed.
      Expanding a year with no existing entries still renders its 12 month rows, editable.
- [ ] The "Bonus" column header shows an info icon whose `title` explains what the field does and
      that it's subtracted from net income before the gross/net ratio compares it to gross wage.
- [ ] FR-INC-2's chart gains a `(chartClick)` handler; clicking a data point opens the same modal
      with that point's year expanded (collapsing the default current-year section if different) and
      that row's "Gross wage" cell scrolled into view and focused; unit test resolves `dataIndex` to
      the correct `bucketKey`/row.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser: open "Salary details," type a gross wage and a bonus into the
      current month's row, tab away, close and reopen the modal, confirm both values are still
      there; reload the page, confirm they persisted (IndexedDB-backed). Separately, click a point on
      the income chart and confirm the modal opens with the right year expanded and that month's
      gross-wage field focused.

## Notes

- `grossWage`/`bonus` are plain numbers (no currency field) — the app still has no currency
  *conversion*; TICKET-SET-03 made the symbol and its position a display-only user setting, so a
  stored amount is just a number and every rendering of it goes through `formatCurrency()`
  ([currency-format.ts](../../../src/app/shared/utils/currency-format.ts)). The original "single-
  currency `'EUR'`" phrasing predates that setting.
- Both amount cells must be `mm-input` (a `ControlValueAccessor` wrapper that replicates
  `NumberValueAccessor`'s coercion) rather than a raw `<input type="number">`, so the bound value
  stays a `number`; `(blur)` is what triggers the write, not `(change)`/`(ngModelChange)`, so a value
  the user is still typing never round-trips through the store mid-edit.
- No link to a specific `Account`/category — this is a household-level monthly fact the user enters
  once, independent of which account the net salary happened to land in, and independent of which
  category the deposit was booked under.
- **How `bonus` is consumed:** it is not read by this ticket's own code. TICKET-INC-11 subtracts it
  from that month's total across `IncomeStore.selectedIncomeCategoryIds()` before comparing against
  `grossWage` — see that ticket. It is deliberately **not** wired into TICKET-INC-04's smoothing;
  see that ticket's Notes for why the two are separate mechanisms.
- **Every month gets a row, not just months with an existing `SalaryMetadata` row.** The table is
  generated from the income page's date range, not from `IncomeStore.salaryMetadata`'s existing
  entries — a blank row with no backing entry is the normal state for most months, and typing into
  it is what creates the entry (via the same `setSalaryMetadata` upsert every other row's blur uses).
  There's deliberately no separate "add" affordance.
- The sticky `<thead>` and the year-grouping `mm-collapse` composition are new to this component —
  see the as-is note on `mm-table`/`mm-collapse` — so budget real implementation time for the sticky
  CSS (z-index above the row content, an opaque background matching the modal's surface color in
  both light and dark themes) rather than treating it as a one-line change.
