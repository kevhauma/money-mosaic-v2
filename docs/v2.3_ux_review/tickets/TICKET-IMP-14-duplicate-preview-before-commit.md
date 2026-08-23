# TICKET-IMP-14 — Say how many rows are duplicates before committing an import

- **Area:** Import
- **Type:** Feature
- **Traceability:** UX review (UXR-11); extends FR-IMP-* — deterministic `fingerprint` de-duplication already exists but is never shown to the user

## User story

As someone importing overlapping bank exports, I want to be told how many rows are already in the app before I commit, so that I can import without fear of double-counting my money.

## Current situation (as-is)

Transactions carry a deterministic `fingerprint` (see [TICKET-DEV-01](../v1.0_foundation/tickets/TICKET-DEV-01-seed-dev-data.md), whose criteria require seeded rows to "pass the same invariants as imported rows and don't collide on a later real import"), so the machinery to recognise a duplicate exists.

The import wizard never surfaces it. Step 1 is a drop zone with no mention of duplicate handling; the preview and summary steps do not report how many incoming rows already exist. The user commits an import without knowing whether they are adding 40 new transactions or re-adding 38 they already have.

For a user whose stated workflow is three overlapping monthly exports, this is the highest-anxiety moment in the product, and the screen is silent at exactly that moment.

## Desired result (to-be)

- Before committing, the wizard states how many incoming rows are new and how many already exist.
- The duplicate rows are inspectable, not just counted, so the user can confirm the match is real.
- The user chooses what happens to duplicates (skip / import anyway) rather than the app deciding silently.
- Step 1 sets expectations up front: the drop zone says duplicates are detected, so the fear is answered before the file is even chosen.

## Acceptance criteria

- [ ] The preview or summary step reports counts of new vs already-present rows for the incoming file.
- [ ] The already-present rows can be inspected individually, not only counted.
- [ ] The user can choose to skip duplicates or import them anyway, with skip as the default.
- [ ] Committing with skip selected imports exactly the new rows and leaves existing rows untouched — no edit to an existing row's category, `categoryManual` flag, or transfer link.
- [ ] Step 1 states that duplicates are detected before a file is selected.
- [ ] Multi-file import reports duplicates **within** the incoming set as well as against existing data, since three exports may overlap each other.
- [ ] Detection reuses the existing `fingerprint` rather than introducing a second, divergent notion of sameness.
- [ ] All reads go through the repository layer in `core/data-access/`.
- [ ] Unit tests cover: an all-new file reports zero duplicates; a fully-overlapping file reports all rows as existing; a partially-overlapping file splits correctly; skip imports only the new rows; import-anyway imports all; two incoming files overlapping each other are counted.
- [ ] Verified live in the browser by importing the same CSV twice and confirming the second run reports every row as already present.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Prevention half of [TICKET-IMP-13](./TICKET-IMP-13-import-history-with-undo.md); either is useful alone, and IMP-14 is the cheaper of the two. Consider shipping this one first.
- The wizard's Back/Next bar currently sits **above** the drop zone on step 1, against every wizard convention, and both buttons are disabled and greyed so the card opens with a dead toolbar. Small, related, and worth fixing while this file is open — not required by these criteria.
