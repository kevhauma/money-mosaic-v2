# TICKET-IMP-13 — Import history with per-batch undo

- **Area:** Import
- **Type:** Feature
- **Traceability:** UX review (UXR-10); extends FR-IMP-* — import batches are already recorded but never surfaced, and nothing can be undone

## User story

As someone importing three overlapping bank exports every month, I want to see what I have imported and be able to undo a batch, so that a mistaken import is a five-second fix rather than a manual cleanup.

## Current situation (as-is)

The app already models import batches — [import-batches.store.ts](../../../src/app/feature-import/import-batches.store.ts) exists and batches are persisted — but nothing in the UI lists them. There is no import history anywhere in the app, and no way to reverse an import once committed.

`/import` step 1 is a dashed drop zone with a "Browse" affordance and a disabled Back/Next bar positioned **above** it. The screen says nothing about duplicate detection, lists no previous import, and offers no undo.

Consequences observed in review:

- No "last imported" date on `/accounts`, on account detail, or anywhere in the shell — the user cannot tell which of several accounts is current. (Split out as [TICKET-ACC-13](./TICKET-ACC-13-last-imported-on-account-cards.md).)
- The target user's entire monthly workflow is importing several overlapping CSVs. The single thing that workflow risks — importing the same rows twice — is the thing the screen never mentions.

Nothing else in the app has undo either (re-run rules, bulk delete, bulk assign, clear transactions are all one-way), so this ticket establishes the pattern rather than matching one.

## Desired result (to-be)

- An import history view lists past batches with their date, source file, target account, and row count.
- A batch can be undone, removing exactly the rows it created and nothing else.
- Undo is honest about what it cannot reverse — rows since edited, re-categorised, or linked as transfers must be handled explicitly rather than silently deleted or silently skipped.
- The history is reachable from `/import`, so the user sees it before importing again.

## Acceptance criteria

- [ ] An import history lists each batch with date, file name, target account, and number of rows imported.
- [ ] Undoing a batch removes exactly the transactions that batch created; no transaction from another batch is affected.
- [ ] Rows modified since import (edited category, manual `categoryManual` flag, transfer link) are surfaced before undo proceeds, with a stated outcome — not silently destroyed.
- [ ] Undoing a batch that produced a transfer link also unlinks its counterpart cleanly, leaving the other side an ordinary transaction.
- [ ] Undo is confirmed through the shared confirm dialog, stating what is removed and that it cannot itself be undone.
- [ ] All reads and writes go through the store/repository layer in `core/data-access/` — no direct `appDb` table access from components or stores.
- [ ] Any schema change is additive: a new `.version(n + 1).stores(...)` with an `.upgrade()` if data must transform; no shipped version block is edited.
- [ ] Unit tests cover: history lists batches in order; undo removes only its own rows; undo with a since-edited row follows the stated outcome; undo of a transfer-linked batch unlinks the counterpart; undo of an already-undone batch is a safe no-op.
- [ ] Verified live in the browser: import a CSV, confirm it appears in history, undo it, confirm the transaction count returns to its prior value.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Scope decision needed early: whether undo is a hard delete of the batch's rows or a reversible archive. The former is simpler; the latter is safer and fits "reversible automation". Record which was chosen and why.
- `categoryManual` must never be overwritten or lost by an undo path, per CLAUDE.md.
- Related: [TICKET-IMP-14](./TICKET-IMP-14-duplicate-preview-before-commit.md) is the preventive half of the same problem — this ticket is the cure.
