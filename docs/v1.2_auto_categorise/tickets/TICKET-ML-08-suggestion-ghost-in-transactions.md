# TICKET-ML-08 — Ghost category suggestion + Accept in the transactions table

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-8 (new)

## User story

As a user looking at my uncategorised transactions, I want to see the app's best guess at a category right
there in the table, and accept it with one click, so I don't have to open the edit form for every single
transaction it already has a confident guess for.

## Description

Extend the transactions table's category cell so that, for an uncategorised transaction with a suggestion,
it renders a dimmed "Suggested: {name} ({confidence}%)" chip plus a small Accept button, instead of the
plain empty/"uncategorised" state. Categorised transactions and ones without a suggestion are unaffected.

## Current situation (as-is)

- [transactions-overview.component.ts](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) builds a `TransactionRow` (line 60) per row —
  `{ transaction, accountName, category, transfer, likelyTransfer, selected }` — with no notion of a
  suggestion.
- [transactions-overview.component.html](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html) renders the category cell from `row.category` only; an uncategorised
  transaction shows no category content today.
- `BadgeComponent` ([shared/ui/badge/badge.component.ts](../../../src/app/shared/ui/badge/badge.component.ts)) and `ButtonComponent`
  ([shared/ui/button/button.component.ts](../../../src/app/shared/ui/button/button.component.ts)) are the existing reusable UI primitives this ticket
  reuses — no raw Tailwind/daisyUI classes hand-rolled in the template.

## Desired result (to-be)

- `TransactionsOverviewComponent` injects `CategoryModelStore` (ML-07) via the
  [feature-categories](../../../src/app/feature-categories/index.ts) barrel.
- `TransactionRow` gains `suggestion: { categoryId: number; categoryName: string; confidence: number } |
  undefined`, populated from `CategoryModelStore.suggestions()` (only ever non-`undefined` for a row whose
  `category` is `undefined` — a categorised transaction never shows a suggestion).
- In the category cell, when `row.category` is absent and `row.suggestion` is present: render a dimmed
  `mm-badge` reading `Suggested: {suggestion.categoryName} ({suggestion.confidence * 100 | number:'1.0-0'}%)`
  plus a small (`xs`) `mm-button` "Accept" that calls `categoryModelStore.acceptSuggestion(transaction.id)`.
- When no suggestion exists for an uncategorised row, the cell's appearance is unchanged from today (no
  regression for the no-model / not-yet-trained case).
- Component → store direction only: `TransactionsOverviewComponent` reads `CategoryModelStore` and calls its
  methods; `CategoryModelStore` has no knowledge of this component.

## Acceptance criteria

- [x] A categorised transaction never shows a suggestion chip, regardless of whether `CategoryModelStore` has a suggestion cached for it.
- [x] An uncategorised transaction with a matching entry in `CategoryModelStore.suggestions()` shows the ghost chip with the correct category name and a confidence rounded to a whole percent.
- [x] Clicking Accept calls `CategoryModelStore.acceptSuggestion(transactionId)` exactly once and the row updates (chip disappears, category cell now shows the real, non-manual-looking category) once the store's state settles.
- [x] An uncategorised transaction with no suggestion renders exactly as it did before this ticket (no empty chip, no layout shift).
- [x] Only `BadgeComponent`/`ButtonComponent` (or other existing shared UI primitives) are used for the new markup — no raw daisyUI/Tailwind classes duplicating what those components already provide.
- [x] `CategoryModelStore` is injected via the `@/feature-categories` barrel, not a deep path.
- [x] Unit tests cover: row mapping includes `suggestion` only for uncategorised rows with a matching entry; the Accept button calls `acceptSuggestion` with the correct id; a categorised row's mapped `suggestion` is always `undefined` even if the store happens to hold a stale entry for that id.
- [x] Verified live in the browser: an uncategorised, known-merchant transaction shows a ghost suggestion after training; clicking Accept sets its category and removes the chip; a manually-categorised transaction never shows a chip.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- No change to `computePeriodStats`/`computeCategoryBreakdown` or any stats aggregate — a suggestion is
  purely a UI hint until accepted; an unaccepted suggestion never counts as if the transaction were
  categorised.
- Independent of ML-09/ML-10 — all three consume `CategoryModelStore` (ML-07) but touch disjoint templates,
  so they can be built in parallel once ML-07 lands.
