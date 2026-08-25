# Import — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**14 tickets** — 12 done, 2 open.

- [ ] [TICKET-IMP-01](./tickets/TICKET-IMP-01-bank-presets.md) — Bank presets for BNP Paribas Fortis, ING & Argenta · _v1.0 Foundation_
- [x] [TICKET-IMP-02](./tickets/TICKET-IMP-02-batch-multi-file-mapping.md) — Map a multi-file import batch once · _v1.0 Foundation_
- [x] [TICKET-IMP-03](./tickets/TICKET-IMP-03-header-mismatch-error.md) — Surface header/mapping mismatch per file · _v1.0 Foundation_
- [x] [TICKET-IMP-04](./tickets/TICKET-IMP-04-combined-map-preview-step.md) — Combine map + preview into one screen with a top confirm bar · _v1.0 Foundation_
- [x] [TICKET-IMP-05](./tickets/TICKET-IMP-05-fallback-iban-from-description.md) — Fall back to extracting counterparty IBAN from the description · _v1.1 Joint accounts_
- [ ] [TICKET-IMP-06](./tickets/TICKET-IMP-06-csv-decode-pipeline.md) — Decode CSV files once, slice previews, and move decoding into the worker · _v1.3 Code review (CR3)_
- [x] [TICKET-IMP-07](./tickets/TICKET-IMP-07-guided-mapper-feedback.md) — Guided, field-by-field feedback in the import mapper · _v1.5 Redesign_
- [x] [TICKET-IMP-08](./tickets/TICKET-IMP-08-create-account-from-import.md) — Create a new account directly from the CSV import step · _v1.1 Joint accounts_
- [x] [TICKET-IMP-09](./tickets/TICKET-IMP-09-horizontal-mapper-stepper.md) — Horizontal sub-stepper for the CSV import mapper · _v1.5 Redesign_
- [x] [TICKET-IMP-10](./tickets/TICKET-IMP-10-import-map-step-extraction.md) — Extract import-map-step's shared vocabulary and pure derivations · _v2 Code review (CR4)_
- [x] [TICKET-IMP-11](./tickets/TICKET-IMP-11-import-wizard-session-store.md) — Extract an `ImportWizardSession` state machine from the wizard component · _v2 Code review (CR4)_
- [x] [TICKET-IMP-12](./tickets/TICKET-IMP-12-batch-wait-card-extraction.md) — Extract the wizard's batch-wait card into a presentational component · _v2 Code review (CR4)_
- [x] [TICKET-IMP-13](./tickets/TICKET-IMP-13-import-history-with-undo.md) — Import history with per-batch undo · _v2.3 UX review_
- [x] [TICKET-IMP-14](./tickets/TICKET-IMP-14-duplicate-preview-before-commit.md) — Say how many rows are duplicates before committing an import · _v2.3 UX review_
