# v1.5 Styling Audit Results (TICKET-UI-01)

Verified sweep of `src/app/**/*.component.html` (49 templates, 34 outside `shared/ui/`) against
[prepare.md](./prepare.md)'s 13 hand-found candidate patterns, run to close the gap between that
manual read-through and the actual codebase before Phase A's extraction tickets (UI-02..UI-10)
scope their acceptance criteria. Counts are `Grep`-verified occurrence totals across component
templates (not fallow — see the fallow section below for why).

## Fallow run

`fallow dupes` (mild mode, `--min-lines 3 --min-tokens 15`) analyzes **0** `.component.html`
files — its clone-detection engine is JS/TS-only in this codebase's plugin configuration and does
not walk Angular templates at all (confirmed: across 167 clone groups found project-wide, zero
instances touch a `.html` file). `fallow health --css` does cover templates and found 3
`css-token-drift` findings (one-off Tailwind arbitrary values: `grid-cols-[repeat(auto-fit,minmax(275px,1fr))]`
in `category-comparison-panel.component.html:42`, `min-h-[2px]` in the same file:83, and
`min-w-[10rem]` in `account-balance-strip.component.html:8`) — real findings, but orthogonal to
the 13 patterns below (arbitrary-value drift, not repeated daisyUI class strings). **Conclusion:**
fallow's automated duplication detection does not surface repeated daisyUI markup patterns in
Angular templates in this project; the grep sweep below is the audit's real data source, not a
supplement to a fallow-driven list.

## Pattern → ticket mapping

| # | Pattern | Occurrences | Files | Feeds ticket |
|---|---|---|---|---|
| 1 | `tabs` / `tab` | 6 | 2 | [TICKET-UI-05](./tickets/TICKET-UI-05-tabs-primitive.md) |
| 2 | bare `<span>` text styling | 88 | 28 | [TICKET-UI-02](./tickets/TICKET-UI-02-typography-primitive.md) |
| 3 | `label` | 24 | 12 | [TICKET-UI-06](./tickets/TICKET-UI-06-label-fieldset-primitives.md) |
| 4 | `flex` | 91 | 35 | [TICKET-UI-15](./tickets/TICKET-UI-15-flex-primitive.md) — added after this audit; readability-driven (class-hiding editor tooling), not reuse-driven |
| 5 | `table` / `th` / `tr` / `td` | 93 | 8 | [TICKET-UI-07](./tickets/TICKET-UI-07-table-primitive.md) |
| 6 | "paper" (border+padding surface: `card`/`rounded-box border`/`border-t` combos) | 38 | 27 | [TICKET-UI-04](./tickets/TICKET-UI-04-paper-primitive.md) |
| 7 | `dropdown-content` / `menu` | 4 | 4 | [TICKET-UI-08](./tickets/TICKET-UI-08-dropdown-menu-primitive.md) |
| 8 | icon-only buttons (`ng-icon` inside `mm-button`/`button`, `ariaLabel`-only controls) | 49 `ng-icon` uses (15 files); 24 `ariaLabel`/`aria-label` occurrences (11 files) | 15 / 11 | [TICKET-UI-09](./tickets/TICKET-UI-09-icon-button-variant.md) |
| 9 | `grid` / `grid-cols-*` / `col-span-*` | 39 | 14 | **Not ticketed** — out of scope per overview.md's Flex/Grid scope decision (UI-03's Bento grid is a new pattern, not an extraction of these) |
| 10 | `fieldset` / `fieldset-legend` | 86 | 11 | [TICKET-UI-06](./tickets/TICKET-UI-06-label-fieldset-primitives.md) |
| 11 | `rounded-field` | 3 | 2 (`account-form`, `category-form`) | **Considered, not ticketed** — see below |
| 12 | `divider` | 3 | 3 (`import-map-step`, `rule-form`, `account-form`) | [TICKET-UI-10](./tickets/TICKET-UI-10-divider-primitive.md) |
| 13 | `skeleton` outside `LoadingSkeletonComponent` | 4 (`accounts-overview.html:118`, `accounts-detail.html:44`, `net-worth-header.html:7`, `dashboard-overview.html:115-116`) | 4 | **Considered, not ticketed** — overview.md already flags this; see below |

Full file:line matches for each pattern are reproducible via the grep commands in the
"Reproducing this audit" section below; they aren't transcribed exhaustively here to keep this
table scannable — each ticket's own AC should re-run its pattern's grep against current `HEAD`
before finalizing its file list, since this snapshot is from 2026-07-16.

## New pattern found without an existing target ticket

No pattern turned up outside the 13 prepare.md already named. All 13 either map to an existing
Phase A ticket or were already called out in overview.md's "Considered, not ticketed yet" section
(`rounded-field`, non-list `skeleton` usage, generic flex/grid). No overview.md edit is needed —
this audit confirms rather than extends that section.

## Considered, not ticketed yet (confirmed by this audit)

- **`rounded-field`** — 3 occurrences across 2 files (`account-form.component.html:58,114`,
  `category-form.component.html:34`), all on colour/text inputs and one form-row wrapper. Too
  small to justify its own primitive per the ticket's own acceptance criteria; matches
  overview.md's example almost exactly.
- **Non-list `skeleton` usage** — 4 occurrences across 4 files, all single `<span>`/`<div
  class="skeleton">` elements sized inline for a stat/balance placeholder, distinct from
  `mm-loading-skeleton`'s list-row usage (17 call sites elsewhere). Confirms overview.md's existing
  note; still not worth a dedicated ticket at this count — fold into whichever Phase A ticket
  happens to touch the same panel (`accounts-overview`, `accounts-detail`, `net-worth-header`,
  `dashboard-overview`) if convenient, or file separately later.

## Reproducing this audit

Grep patterns used (scoped to `src/app/**/*.component.html`):

```
tabs/tab:            class="[^"]*\btabs\b|class="[^"]*\btab\b
span:                <span\b
label:                class="[^"]*\blabel\b
flex:                 class="[^"]*\bflex\b
table family:         <table\b|<th\b|<tr\b|<td\b
dropdown/menu:        class="[^"]*\bdropdown-content\b|class="[^"]*\bmenu\b
grid family:          class="[^"]*\bgrid\b|grid-cols-|col-span-
fieldset:              <fieldset\b|fieldset-legend
paper surface:         rounded-box border|border border-base-300|border-t border-base-300|border-l border-base-300|border-2 border-dashed
rounded-field:         rounded-field
divider:               class="[^"]*\bdivider\b
skeleton:               skeleton
icon buttons:          <ng-icon (usage sites) + ariaLabel=|aria-label= (icon-only control sites)
```

Fallow: `fallow dupes --format json --quiet --mode mild --min-lines 3 --min-tokens 15` (0 `.html`
matches); `fallow health --format json --quiet --css` (3 `css-token-drift` findings, unrelated to
the 13 patterns).
