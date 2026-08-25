# Money Mosaic — UX Review Backlog (Overview)

Derived from a UX review conducted 2026-08-23 against the running app (**as-is**, deliberately not against [../v1.0_foundation/ui-layout-spec.md](../v1.0_foundation/ui-layout-spec.md) — the spec is stale in places and was not used as a yardstick). Named per [../README.md](../README.md): the review postdates v2.3's ship, so it takes the `v2.3` prefix. Sibling to the code-review backlogs ([CR3](../v1.3_code_review/overview.md), [CR4](../v2_code_review/overview.md)); `UXR-*` IDs in each ticket's Traceability line trace back to the review.

Method: two isolated assessments — a design review with no access to tooling, and a deterministic pass (anti-pattern detector over 843 files, DOM measurement, console/build sweep across all 15 routes). Findings that only one assessment supported were re-checked against source before ticketing; two were rejected outright and are recorded below.

Design health at review time: **21/40** on Nielsen's ten heuristics. The deterministic scan came back effectively clean — one finding across `src/app`, itself a false positive — so every item here is a judgment finding, not a machine-detectable one.

The list is in recommended build order: the tiny independent fixes first (locale, three layout defects, two content/label fixes), then the theming and accessibility work, then the trust fixes that make the numbers self-explaining, then the presentation jobs, and the three largest builds last — recurring corrections, the income rework, and the import safety net, which are the only items likely to need schema thought.

## Status, 2026-08-25

**All 22 are built.** Three lines below stay `- [ ]` on purpose, each with its reason on the line:
one acceptance box on TRF-06, STAT-43 and TXN-12 could not be honestly ticked, and none of the three
is code left unwritten. Two of them are the same cause — a browser check that the session's hidden
preview pane made impossible — and the third is a scope decision recorded rather than taken quietly.
Re-open each from its own ticket, not from here.

- [x] [TICKET-SET-10](./tickets/TICKET-SET-10-default-locale-to-belgian.md) — Default locale ships US date order to a Belgian user (bug fix, UXR-5 — `DEFAULT_LOCALE = 'en-US'` at `format-settings.ts:13`) — tiny, independent, visible on every screen; do first
- [x] [TICKET-TXN-11](./tickets/TICKET-TXN-11-filter-bar-controls-overlap.md) — Transactions filter controls overlap each other (bug fix, UXR-6 — `lg:grid-cols-6` gives 115px cells to controls needing 180px) — pure CSS, most-used screen, independent
- [x] [TICKET-LOAN-15](./tickets/TICKET-LOAN-15-remaining-caption-overflows-card.md) — Loan card's "remaining" caption escapes the card border (bug fix, UXR-7 — `justify-between` with no `min-w-0`, overflows from ~€1,250 up) — pure CSS, independent
- [x] [TICKET-PUB-10](./tickets/TICKET-PUB-10-help-content-leaks-literal-markdown.md) — Help guides render literal markdown asterisks (bug fix, UXR-22 — `guides.ts:150`) — content fix plus a guard; tiny, independent
- [x] [TICKET-UI-32](./tickets/TICKET-UI-32-rename-learning-nav-item.md) — "Learning" reads as tutorials but opens a training console (bug fix, UXR-19) — label fix; tiny, independent
- [x] [TICKET-UI-29](./tickets/TICKET-UI-29-checkboxes-render-as-circles.md) — Checkboxes render as circles and read as radio buttons (bug fix, UXR-16 — `--radius-selector: 1.75rem` on a 20px box) — theme token; small, before UI-27
- [x] [TICKET-UI-31](./tickets/TICKET-UI-31-skip-to-content-link.md) — No skip link: 15 tab presses to reach page content (bug fix, UXR-18, NFR-A11Y-1) — small, independent
- [x] [TICKET-EXP-09](./tickets/TICKET-EXP-09-mosaic-share-column-sums-above-100.md) — Mosaic data table sums its Share column past 100% (bug fix, UXR-3 — group and child rows listed flat, so shares double-count) — contained, independent
- [x] [TICKET-STAT-44](./tickets/TICKET-STAT-44-donut-for-a-single-category.md) — Category breakdown draws a donut for a single 100% category (bug fix, UXR-21 — plus colliding slice labels and a placeholder comparison panel) — independent; check against UI-27 first for the red bar
- [x] [TICKET-STAT-42](./tickets/TICKET-STAT-42-name-the-savings-measures.md) — Name what each savings measure actually counts (bug fix, UXR-1 — three surfaces answer one question with three unlabelled numbers) — labelling only, no arithmetic change; pairs with ACC-12
- [x] [TICKET-ACC-12](./tickets/TICKET-ACC-12-unstack-balance-history-chart.md) — Balance history plots each account at cumulative height (bug fix, UXR-2 — `stack: 'account-balance'`, and a spec pins the bug) — independent; the other half of the trust pass
- [x] [TICKET-UI-27](./tickets/TICKET-UI-27-separate-money-colours-from-brand-colour.md) — Positive net worth renders in the same red as a loss (bug fix, UXR-4 — primary and error five hue degrees apart in both default themes) — touches all ten themes; after UI-29
- [x] [TICKET-UI-28](./tickets/TICKET-UI-28-sidebar-outgrew-its-viewport.md) — Sidebar's last nav items fall below the fold with no scroll affordance (bug fix, UXR-8 — TICKET-UI-26's "nine items" premise now runs to 15) — needs a re-decision, not just a patch; after UI-32 (same file)
- [x] [TICKET-UI-30](./tickets/TICKET-UI-30-modal-on-modal-delete-confirm.md) — Delete confirmation opens a modal on top of a modal (bug fix, UXR-17 — parent's Save stays live behind it; confirm names only "Supermarket", of which there are eight) — independent
- [ ] [TICKET-TRF-06](./tickets/TICKET-TRF-06-make-transfer-review-visible.md) — Transfer review is invisible, and linked pairs still read "Uncategorised" (bug fix, UXR-13, FR-TRF-4) — step 3 of the core loop; independent — **built and shipped, one box still open**: the pending-candidate state could not be live-verified without writing crafted transactions into real data, so it rests on unit tests. See the ticket's last criterion.
- [ ] [TICKET-STAT-43](./tickets/TICKET-STAT-43-heatmap-per-row-scales.md) — Heatmap shades each row on its own scale, so cells can't be compared (bug fix, UXR-20) — a deliberate trade-off to re-make, not a slip; coordinate with TICKET-STAT-31 — **shipped, one box still open**: the as-is was stale (the rescale landed in `a8bae7a`, 2026-08-09), so this became the caption/naming fix that stopped the panel disclaiming its own semantics. The live check could not run — the panel is behind `@defer (on viewport)` and the session's browser pane was never displayed, so the trigger never fired. See the ticket's last-but-one criterion.
- [ ] [TICKET-TXN-12](./tickets/TICKET-TXN-12-mobile-transactions-table.md) — Transactions is unusable on a phone (bug fix, UXR-9 — 750px table in a 375px viewport, 20px touch targets) — larger; after TXN-11, same page — **shipped, one box deliberately left open**: below `md` the rows render as cards (measured at 375px: 343px wide, 44px targets, no horizontal scroll) and the table is untouched at ≥1024px. The "mobile top bar names the page" criterion was **not** built — TICKET-UI-25's sticky `mm-page-header` already keeps the title on screen at every scroll position, and a second title would breach TICKET-UI-22. See the ticket's implementation note.
- [x] [TICKET-ACC-13](./tickets/TICKET-ACC-13-last-imported-on-account-cards.md) — Show when each account was last imported (UXR-12) — cheapest of the import-safety group, independent of both others; start the group here
- [x] [TICKET-IMP-14](./tickets/TICKET-IMP-14-duplicate-preview-before-commit.md) — Say how many rows are duplicates before committing an import (UXR-11) — prevention; cheaper than IMP-13 and worth shipping before it
- [x] [TICKET-REC-11](./tickets/TICKET-REC-11-recurring-needs-correction-affordances.md) — Recurring detection can't be corrected, and over-claims (bug fix, UXR-15 — 100% of the month classified as recurring, one counterparty listed twice) — the clearest breach of "reversible automation"; likely additive schema
- [x] [TICKET-INC-23](./tickets/TICKET-INC-23-replace-the-income-onboarding-wall.md) — Income's onboarding gate is a wall, and skipping it lands on em-dashes (bug fix, UXR-14) — partly reverses TICKET-PUB-08; larger rework
- [x] [TICKET-IMP-13](./tickets/TICKET-IMP-13-import-history-with-undo.md) — Import history with per-batch undo (UXR-10) — largest item here; may need an additive schema version; last

## Rejected after checking — deliberately not ticketed

- **Sankey double-counts internal transfers.** Reported by the design assessment; refuted against source. [money-flow-graph.ts:253](../../src/app/core/stats/money-flow-graph.ts) already draws only the shallower leg of a linked pair, so a transfer produces one ribbon, not two.
- **"Amount type" third segment is clipped.** The symptom is real but the mechanism was wrong: no ancestor sets a non-visible `overflow`, so "Expenses" paints on top of the neighbouring input rather than truncating. Ticketed as an overlap in TXN-11, not a clipping bug.

## Needs reproduction before ticketing

- The loan card's **"30 months behind schedule" / "−€8,685.84 extra interest so far"** badge, reported as an unexplained and actionless emotional low point, and a **payoff date disagreeing with itself** (`07/01/2046` on the card vs "August 2046" in What-if). The reviewing session had loan data that a later session did not — the dev seed creates no loans — so neither was independently confirmed. Noted in [TICKET-LOAN-15](./tickets/TICKET-LOAN-15-remaining-caption-overflows-card.md)'s Notes.

## Found but still not ticketed

Real, raised by the review, and deliberately left out of this pass:

- **No undo anywhere**, and destructive actions are understyled — `/accounts/:id` renders `Edit | Archive | Clear transactions | Delete` with only Delete in red, so a 36-row irreversible wipe sits behind a button that looks like "Archive". IMP-13 establishes an undo pattern for imports; extending it app-wide is a bigger question than this backlog settles.
- **The persistent-storage warning has no mitigating action.** [data-management-overview.component.html:38](../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.html) ends "this may resolve on its own over time" with no button; [storage-status.service.ts:8](../../src/app/core/storage/storage-status.service.ts) already calls `storage.persist()` automatically, so a "Request it" button would be dead UI — backup is the only real mitigation, and there is no CTA. The next card down is "Delete all data", fully built.

Smaller observations are captured in the Notes of the ticket whose file they touch, so they surface when that file is next open: the import wizard's Back/Next sitting above its drop zone, `/recurring`'s calendar styling September's trailing days into August, account detail having no transaction list, the absence of keyboard shortcuts and a command palette, four coexisting date formats, "Left over" as two terminal Sankey nodes with different meanings, and the Accounts widget's mostly-empty card.

## Definition of Done (applies to every item)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus the fallow skill check, plus a live browser check for any UI-visible change. Dexie schema changes stay additive; the production bundle budget in `angular.json` is never raised. Where a ticket changes behaviour a spec currently pins (ACC-12 especially), the spec is updated **with a comment recording why**, so the bug is not reintroduced as a fix.
