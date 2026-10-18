# TICKET-IMP-15 — Import on one page, top to bottom

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** FR-IMP-* (whole import flow); supersedes the three-step layout from TICKET-IMP-04 / TICKET-IMP-09 / TICKET-IMP-11; design round 2026-10-18 (`.impeccable/mocks/decision/onepage-*.html`, option A "Folding receipt")

## User story

As someone importing this month's bank exports, I want the import to read top to bottom on one page and only stop where it needs me, so that a routine import takes a few clicks and an unfamiliar file never feels overwhelming.

## Description

Replaces the Select → Map & preview → Summary stepper with one page of sections: **Files → How the file is read → Columns → Account → Check → What changed**. Only the section that needs an answer is open; a finished section folds to one line saying what was decided, and a section with nothing to ask folds itself. Each file in a batch runs through the sections in turn.

## Current situation (as-is)

- [import-wizard.component.html](../../../src/app/feature-import/components/import-wizard/import-wizard.component.html) renders a daisyUI `steps` bar, a Back/Next bar at the top of a paper, and one of three step bodies.
- Step 1 ([import-select-step](../../../src/app/feature-import/components/import-select-step/import-select-step.component.html)) asks for an account per file *before* the file is read, next to a drop zone and the import history.
- Step 2 ([import-map-step](../../../src/app/feature-import/components/import-map-step/import-map-step.component.html)) shows six file settings, a seven-step column stepper, a raw-file table and a row-preview table at once — even for a KBC file the app recognises with the user's own saved mapping.
- Batch mapping (TICKET-IMP-02) is a checkbox plus an auto-commit effect in [import-wizard-session.ts](../../../src/app/feature-import/import-wizard-session.ts).

## Desired result (to-be)

- One centred column. Every section is a row with its position, title and — once done — a one-line summary plus a **Change** action that reopens it.
- **Files:** a drop zone and the list of dropped files (name, size, remove). **Continue** starts the run; the section then folds to "3 files · name, name…" and lists each file's state (waiting, current, imported, left out).
- **How the file is read** and **Columns** fold themselves for a recognised file (bank preset, saved mapping, or a mapping already used earlier in this import). See TICKET-IMP-16 and TICKET-IMP-17 for what they show when open.
- **Account:** folds itself when the file's own IBAN matches an account ("Into KBC Checking · matched by IBAN"). Otherwise it asks: pick an account, or create a new one prefilled from the file's IBAN.
- **Check:** always stops. Says how many new transactions, the period they cover, five sample rows, how many are already in the account with a skip / import-anyway choice, unreadable rows, and a toggle to the full row table. The button says what it does: "Add 130 transactions".
- A file can be left out from any of its sections.
- Past imports sit behind a "Past imports" action in the page header.
- **What changed** opens at the bottom when every file is done (TICKET-IMP-18).

## Acceptance criteria

- [ ] The stepper, the Back/Next bar and the per-step bodies are gone; `/import` renders the six sections in order, one column.
- [ ] A recognised file needs no input until Check: reading, columns and account all fold themselves when nothing is uncertain.
- [ ] A folded section shows what was decided and reopens with Change; the sections below it wait until it is confirmed again.
- [ ] Multi-file: each file runs through the sections in turn; a file whose headers match a mapping used earlier in the same import reuses it without asking (replaces TICKET-IMP-02's checkbox + auto-commit).
- [ ] Account: matched by IBAN → folded; no match → pick an existing account or create a new one prefilled from the file's IBAN; the new account is created when its file is imported, with its opening balance seeded as before (TICKET-IMP-08).
- [ ] Check: new-row count, period, five sample rows with already-imported ones marked, the duplicate choice (TICKET-IMP-14 behaviour kept), unreadable-row count, full-table toggle, and a header mismatch sends the file back to Columns with the reason.
- [ ] Leave-this-file-out works from every per-file section.
- [ ] The import how-to guide (`feature-help/data/guides.ts`) describes the new page.
- [ ] Unit tests cover: the section/stage progression (auto-fold, Change, confirm), multi-file advance and session mapping reuse, leaving a file out, account resolution (matched, existing, new), and the commit call.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Depends on TICKET-IMP-16 and TICKET-IMP-17 for the open states of Reading and Columns, and is completed by TICKET-IMP-18.
- `signConvention` stays on `MappingProfile` (presets and saved mappings keep theirs) but is no longer a control: with "money in" and "money out" columns named plainly, swapping them covers what `credit-negative` did.
