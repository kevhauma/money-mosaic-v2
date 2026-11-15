# TICKET-TRF-07 — Auto-link never clears a hand-set category or re-links an unlinked pair

- **Area:** Transfers
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR5-3 ([code review 5](../../releases/v3_code_review/code-review.md), re-confirmed by [CR6](../../releases/v3_code_review_2/code-review.md)); FR-TRF-2 (auto-link on every import), FR-TRF-3 (confidence), FR-TXN-2 (manual category wins); TICKET-TRF-01 (linking clears the category)

## User story

As someone who unlinked a wrong transfer pair and categorised one side by hand, I want later imports to leave that pair alone, so that my correction isn't silently undone and my "Rent" doesn't turn back into a transfer every time I import a file.

## Description

After every imported file, auto-link scans the whole dataset and links every pair that looks like a transfer. Nothing records that the user rejected a pair, and linking clears both legs' categories, manual or not. So the next import into any account re-links the pair and wipes the hand-set category, breaking the rule that a manual category always wins, through the transfer path instead of the rules path.

## Current situation (as-is)

- [`resolveTransferMatches`](../../../src/app/core/transfers/transfer-matching.ts) (lines 336-338) builds the pool from every transaction with `transferId == null` that isn't neutral-tagged. `categoryManual` isn't considered.
- [`TransferMatchingService.runAndPersist`](../../../src/app/core/transfers/transfer-matching.service.ts) links every `autoLink` candidate through `POST /transfers/link/batch`. The server's [`linkTransfer`](../../../server/src/routes/transfers.ts) (line 75) sets `categoryId: null, categoryManual: null` on both legs, and [`TransfersStore.runAutoLink`](../../../src/app/core/state/transfers.store.ts) (lines 131-151) mirrors that.
- It runs after every committed file: [`ImportBatchesStore.commitImport`](../../../src/app/core/state/import-batches.store.ts) line 157.
- `POST /transfers/:id/unlink` (server lines 166-190) only clears `transferId` on both legs. Nothing records the rejection.
- **Root cause:** the auto-link pool treats a hand-categorised row and a row whose pair the user explicitly unlinked the same as a fresh row. Example: unlink A↔B, set A to "Rent" by hand. The next import finds A↔B again with high confidence, links it, and the server clears A's manual category.

## Desired result (to-be)

- **Manual category:** a row with `categoryManual === true` is never auto-linked. It can still appear among the `ambiguous` candidates in transfer review, where linking it is the user's own choice (and clears the category, per TICKET-TRF-01).
- **Unlinked pair:** unlinking records the rejected pair. Auto-link never links that exact pair again, and transfer review doesn't propose it. Each leg can still auto-link with a _different_ counterpart, and the user can still link the pair by hand (which removes the rejection).

## Acceptance criteria

- [ ] `resolveTransferMatches` never returns a `categoryManual` row in `autoLink`. Such a pair lands in `ambiguous` instead.
- [ ] After unlinking A↔B, a following import (or "Run auto-link") doesn't link A↔B, and transfer review doesn't list it. A and B can still be linked to other counterparts.
- [ ] Linking A↔B manually after a rejection works and clears the rejection.
- [ ] The rejection is stored per user, filtered on the session's user, and cleaned up when either leg is deleted (FK cascade). It is included in backup export/restore with its transaction ids remapped (the `import-ids.ts` remap, kept in step with TICKET-SRV-22's id-field spec).
- [ ] The schema change goes in a new Drizzle migration (`npm run server:migrate`, renamed descriptively, `tag` updated in `_journal.json`). No shipped migration is edited.
- [ ] Persistence goes through a repository or `TransferLinkingService`, never a direct API call from a component or store.
- [ ] Unit tests cover: `transfer-matching.spec.ts` › manual-category row goes to ambiguous, rejected pair skipped in both passes, rejected leg still pairs elsewhere; server spec › unlink records the rejection, manual link clears it, leg delete cascades, restore remaps it.
- [ ] `npm --prefix server run lint`, `npm --prefix server run typecheck` and `npm run test:server` pass.
- [ ] Live browser check: unlink a pair, categorise one side, import another file, and confirm the pair stays unlinked with its category.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Storing the rejection, options weighed:** (a) a `rejectedTransferPairs` table (`userId`, `fromTransactionId`, `toTransactionId`, FKs cascading on transaction delete), which is per pair, exactly what the user rejected, and cleans itself up; (b) a per-transaction "never auto-link" column, which is simpler but too broad, since it also blocks the leg's correct counterpart; (c) a JSON list in `transferSettings`, which needs no migration but holds transaction ids in JSON, the very restore-remap trap CR6-A5 describes. Prefer (a).
- The manual-category half needs no schema change and fixes the reported case on its own. If (a) has to wait, ship that half first and split the rest.
- `/transfers/link/batch` is only called by auto-link. A server-side skip of `categoryManual` legs there would be belt-and-braces, but it runs in one transaction, so it has to skip, not refuse, or one manual row would abort the whole pass.
