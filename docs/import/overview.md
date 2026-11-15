# Import — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**26 tickets** — 17 done, 9 open.

- [ ] [TICKET-IMP-01](./tickets/TICKET-IMP-01-bank-presets.md) — Bank presets for BNP Paribas Fortis, ING & Argenta · _v1.0 Foundation_
- [x] [TICKET-IMP-02](./tickets/TICKET-IMP-02-batch-multi-file-mapping.md) — Map a multi-file import batch once · _v1.0 Foundation_
- [x] [TICKET-IMP-03](./tickets/TICKET-IMP-03-header-mismatch-error.md) — Surface header/mapping mismatch per file · _v1.0 Foundation_
- [x] [TICKET-IMP-04](./tickets/TICKET-IMP-04-combined-map-preview-step.md) — Combine map + preview into one screen with a top confirm bar · _v1.0 Foundation_
- [x] [TICKET-IMP-05](./tickets/TICKET-IMP-05-fallback-iban-from-description.md) — Fall back to extracting counterparty IBAN from the description · _v1.1 Joint accounts_
- [x] [TICKET-IMP-06](./tickets/TICKET-IMP-06-csv-decode-pipeline.md) — Decode CSV files once, slice previews, and move decoding into the worker · _v1.3 Code review (CR3)_
- [x] [TICKET-IMP-07](./tickets/TICKET-IMP-07-guided-mapper-feedback.md) — Guided, field-by-field feedback in the import mapper · _v1.5 Redesign_
- [x] [TICKET-IMP-08](./tickets/TICKET-IMP-08-create-account-from-import.md) — Create a new account directly from the CSV import step · _v1.1 Joint accounts_
- [x] [TICKET-IMP-09](./tickets/TICKET-IMP-09-horizontal-mapper-stepper.md) — Horizontal sub-stepper for the CSV import mapper · _v1.5 Redesign_
- [x] [TICKET-IMP-10](./tickets/TICKET-IMP-10-import-map-step-extraction.md) — Extract import-map-step's shared vocabulary and pure derivations · _v2 Code review (CR4)_
- [x] [TICKET-IMP-11](./tickets/TICKET-IMP-11-import-wizard-session-store.md) — Extract an `ImportWizardSession` state machine from the wizard component · _v2 Code review (CR4)_
- [x] [TICKET-IMP-12](./tickets/TICKET-IMP-12-batch-wait-card-extraction.md) — Extract the wizard's batch-wait card into a presentational component · _v2 Code review (CR4)_
- [x] [TICKET-IMP-13](./tickets/TICKET-IMP-13-import-history-with-undo.md) — Import history with per-batch undo · _v2.3 UX review_
- [x] [TICKET-IMP-14](./tickets/TICKET-IMP-14-duplicate-preview-before-commit.md) — Say how many rows are duplicates before committing an import · _v2.3 UX review_
- [ ] [TICKET-IMP-15](./tickets/TICKET-IMP-15-one-page-import.md) — Import on one page, top to bottom (FR-IMP-*; needs TICKET-IMP-16, TICKET-IMP-17, TICKET-IMP-18) · _unreleased_
- [x] [TICKET-IMP-16](./tickets/TICKET-IMP-16-reading-step.md) — Guess how a CSV file is written, and only ask when unsure (FR-IMP-*; part of TICKET-IMP-15) · _unreleased_
- [x] [TICKET-IMP-17](./tickets/TICKET-IMP-17-guess-columns.md) — Guess the columns, and let the user check the guess (FR-IMP-*; part of TICKET-IMP-15, reads TICKET-IMP-16) · _unreleased_
- [x] [TICKET-IMP-18](./tickets/TICKET-IMP-18-what-changed-overview.md) — End an import on what changed, not on row counts (FR-CAT-3, FR-CAT-5, FR-TRF-2; part of TICKET-IMP-15) · _unreleased_
- [x] [TICKET-IMP-19](./tickets/TICKET-IMP-19-saved-mapping-404-blocks-import.md) — An import that uses a saved mapping fails with a 404 on the mapping (bug fix, FR-IMP-* — the awaited mapping save 404s, most likely a stale profile id from the client store, and cancels the commit; independent, can ship any time) · _unreleased_
- [ ] [TICKET-IMP-20](./tickets/TICKET-IMP-20-wizard-pipelines-survive-errors.md) — The import wizard survives a failed parse or duplicate scan (bug fix, CR6-2, FR-IMP-4 — a rejected parse or scan errors the `toSignal` stream for good, with no `catchError`; independent) · _unreleased_
- [ ] [TICKET-IMP-21](./tickets/TICKET-IMP-21-commit-point-of-no-return.md) — A committed import is never reported as failed (bug fix, CR5-6, CR6-A3, FR-IMP-7 — the store adds rows only after rules, tagging and auto-link, so a follow-up failure reads as a failed import; independent) · _unreleased_
- [ ] [TICKET-IMP-22](./tickets/TICKET-IMP-22-multiline-quoted-csv-fields.md) — A line break inside a quoted CSV field imports correctly (bug fix, CR5-5, FR-IMP-3 — fewer rows than physical lines always triggers the quote-off re-parse; independent) · _unreleased_
- [ ] [TICKET-IMP-23](./tickets/TICKET-IMP-23-debit-credit-zero-column.md) — "0,00" in the unused debit/credit column is treated as empty (bug fix, CR5-15, FR-IMP-3 — "filled" means non-blank, so a zero cell makes every row ambiguous; independent) · _unreleased_
- [ ] [TICKET-IMP-24](./tickets/TICKET-IMP-24-fingerprint-normalised-iban.md) — The duplicate fingerprint uses the normalised IBAN (bug fix, CR6-18 part, FR-IMP-6 — `computeFingerprint` hashes the raw IBAN, so spaced and unspaced copies both import; after CAT-14 if `normalizeIban` moves to `shared/` there) · _unreleased_
- [ ] [TICKET-IMP-25](./tickets/TICKET-IMP-25-batch-mode-parse-error.md) — Batch import shows a later file's parse error (bug fix, CR6-21 part, FR-IMP-8 — `step2View` only knows header mismatch, so a parse error waits forever; after IMP-20) · _unreleased_
- [ ] [TICKET-IMP-26](./tickets/TICKET-IMP-26-back-after-partial-batch-no-recommit.md) — Back after a partial batch never commits a file again (bug fix, CR6-21 part, FR-IMP-7 — Next restarts at file 0 while committed files stay queued; independent) · _unreleased_
