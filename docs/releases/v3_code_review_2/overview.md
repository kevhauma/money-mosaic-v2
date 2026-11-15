# Money Mosaic — Code Review 6 Backlog (Overview)

Derived from [./code-review.md](./code-review.md) (CR6, 2026-11-15). `CR6-*` IDs trace to that review; `CR5-*` IDs are carry-overs from [CR5](../v3_code_review/code-review.md) that this review re-confirmed open. **One ticket per finding**: a finding with several independent defects is split, and its tickets cite it as `CR6-n (part)`. Each ticket lives in its area folder and carries `Released in: _unreleased_` until it ships.

The list is in recommended build order: restore and import paths that lose or refuse user data first, then the hydration/lifecycle fixes, then the date foundation (it unblocks the date bugs after it), then wrong numbers, then UI correctness, then the small items.

## Data loss and refused restores

- [ ] [TICKET-SRV-15](../../server/tickets/TICKET-SRV-15-restore-prunes-orphan-transfers-by-ownership.md) — Restore prunes an orphan transfer when its legs aren't the importer's (CR6-1) — independent
- [ ] [TICKET-SRV-16](../../server/tickets/TICKET-SRV-16-restore-remaps-joint-account-override.md) — Restore renumbers `attributionOverride.jointAccountId` (CR6-4) — independent
- [ ] [TICKET-SRV-22](../../server/tickets/TICKET-SRV-22-restore-remap-covers-every-id-field.md) — A spec fails when an id-bearing field has no restore remap (CR6-A5) — after SRV-16
- [ ] [TICKET-SRV-17](../../server/tickets/TICKET-SRV-17-restore-prunes-dangling-hard-references.md) — Restore prunes recurring overrides whose anchor transaction is gone (CR6-5, part) — after SRV-15 (same prune path)
- [ ] [TICKET-SRV-23](../../server/tickets/TICKET-SRV-23-restore-handles-orphan-loans.md) — Restore handles a loan whose category is gone (CR6-5, part) — after SRV-15
- [ ] [TICKET-SRV-18](../../server/tickets/TICKET-SRV-18-cross-account-merge-idempotent.md) — A repeated cross-account merge doesn't duplicate rows (CR6-6) — independent
- [ ] [TICKET-SRV-19](../../server/tickets/TICKET-SRV-19-transaction-delete-clears-reimbursement-overrides.md) — Deleting transactions clears overrides naming their deleted transfers (CR6-7) — independent
- [ ] [TICKET-IMP-20](../../import/tickets/TICKET-IMP-20-wizard-pipelines-survive-errors.md) — The import wizard survives a failed parse or duplicate scan (CR6-2) — independent
- [ ] [TICKET-IMP-21](../../import/tickets/TICKET-IMP-21-commit-point-of-no-return.md) — A committed import is never reported as failed (CR5-6, CR6-A3) — independent
- [ ] [TICKET-TRF-07](../../transfers/tickets/TICKET-TRF-07-auto-link-respects-manual-category.md) — Auto-link never clears a hand-set category or re-links an unlinked pair (CR5-3) — independent
- [ ] [TICKET-CAT-13](../../categories/tickets/TICKET-CAT-13-merchant-rules-top-precedence.md) — "Always categorise" and accepted ML rules take top precedence (CR6-8) — independent
- [ ] [TICKET-IMP-24](../../import/tickets/TICKET-IMP-24-fingerprint-normalised-iban.md) — The duplicate fingerprint uses the normalised IBAN (CR6-18, part) — after CAT-14 if `normalizeIban` moves to `shared/` there
- [ ] [TICKET-SRV-21](../../server/tickets/TICKET-SRV-21-import-commit-skips-duplicate-fingerprints.md) — The server skips already-present fingerprints on import commit (CR6-18 part, CR6-A4) — after IMP-24

## Lifecycle and loading

- [ ] [TICKET-NG-14](../../engineering/tickets/TICKET-NG-14-hydration-generation-guard.md) — Store hydration ignores loads a reset or newer load superseded (CR5-7) — independent
- [ ] [TICKET-NG-11](../../engineering/tickets/TICKET-NG-11-dashboard-waits-for-settings.md) — The dashboard waits for its settings stores, so no write starts from unloaded defaults (CR6-14 part, CR6-A2) — independent
- [ ] [TICKET-LOAN-19](../../loans/tickets/TICKET-LOAN-19-loan-pages-wait-for-data.md) — The loans pages wait for their data (CR6-14, part) — independent
- [ ] [TICKET-FUT-12](../../future/tickets/TICKET-FUT-12-future-page-waits-for-data.md) — The future page waits for its data (CR6-14, part) — independent
- [ ] [TICKET-TRF-08](../../transfers/tickets/TICKET-TRF-08-transfer-settings-form-after-hydration.md) — The transfer settings form shows the saved settings (CR6-10) — independent
- [ ] [TICKET-NG-13](../../engineering/tickets/TICKET-NG-13-failed-saves-surfaced.md) — Failed saves are shown; dialogs close only on success (CR6-19) — independent
- [ ] [TICKET-AUTH-05](../../auth/tickets/TICKET-AUTH-05-login-awaits-ui-preferences.md) — Sign-in waits for the account's UI preferences (CR6-25) — independent
- [ ] [TICKET-STAT-53](../../dashboard/tickets/TICKET-STAT-53-all-time-range-derived-and-reset.md) — "All time" follows the data and resets on sign-out (CR6-24) — independent

## Dates

- [ ] [TICKET-SOLID-08](../../engineering/tickets/TICKET-SOLID-08-local-today.md) — One local-date "today" helper replaces the ~25 UTC copies (CR5-11, CR6-A1 part) — independent
- [ ] [TICKET-SOLID-10](../../engineering/tickets/TICKET-SOLID-10-one-month-step-rule.md) — One month-step rule that clamps to month-end (CR6-A1, part) — do before LOAN-17, REC-13, FUT-11
- [ ] [TICKET-SOLID-11](../../engineering/tickets/TICKET-SOLID-11-drop-private-date-helpers.md) — Private date-helper copies use the canonical `date-buckets` helpers (CR5-23, dates) — after SOLID-10
- [ ] [TICKET-LOAN-17](../../loans/tickets/TICKET-LOAN-17-what-if-lump-sums-month-end.md) — What-if lump sums land exactly once near month-end (CR5-9) — needs SOLID-10
- [ ] [TICKET-REC-13](../../recurring/tickets/TICKET-REC-13-next-expected-date-calendar-step.md) — Next expected date steps by calendar month (CR6-17) — needs SOLID-10
- [ ] [TICKET-STAT-49](../../dashboard/tickets/TICKET-STAT-49-fiscal-year-shift.md) — Stepping a fiscal year keeps its start month (CR5-8) — independent
- [ ] [TICKET-FUT-11](../../future/tickets/TICKET-FUT-11-goal-eta-required-rate-same-grid.md) — Goal ETA and required saving use one month grid (CR6-15) — after SOLID-10

## Wrong numbers

- [ ] [TICKET-LOAN-16](../../loans/tickets/TICKET-LOAN-16-loan-payments-filter.md) — Only real repayments count toward loan progress (CR6-3) — independent; do early
- [ ] [TICKET-FUT-10](../../future/tickets/TICKET-FUT-10-required-rate-horizon-covers-goals.md) — The required-saving chart reaches every goal (CR6-13) — independent
- [ ] [TICKET-STAT-48](../../dashboard/tickets/TICKET-STAT-48-yoy-full-prior-year-coverage.md) — Year-over-year needs a fully covered prior year (CR6-16) — independent
- [ ] [TICKET-STAT-50](../../dashboard/tickets/TICKET-STAT-50-money-flow-uses-transfer-links.md) — The money-flow diagram honours confirmed transfer links (CR5-17, extended) — independent
- [ ] [TICKET-STAT-51](../../dashboard/tickets/TICKET-STAT-51-shared-refund-reduces-expense.md) — A refund marked shared reduces expense instead of counting as income (CR6-32, part) — independent
- [ ] [TICKET-STAT-54](../../dashboard/tickets/TICKET-STAT-54-top-transactions-skip-nullified.md) — The top-transactions card skips nullified rows (CR6-32, part) — independent
- [ ] [TICKET-REC-12](../../recurring/tickets/TICKET-REC-12-two-step-merge-keeps-payments.md) — Merging recurring series in two steps keeps every payment (CR6-12) — independent
- [ ] [TICKET-IMP-22](../../import/tickets/TICKET-IMP-22-multiline-quoted-csv-fields.md) — A line break inside a quoted CSV field imports correctly (CR5-5) — independent
- [ ] [TICKET-IMP-23](../../import/tickets/TICKET-IMP-23-debit-credit-zero-column.md) — "0,00" in the unused debit/credit column is treated as empty (CR5-15) — independent
- [ ] [TICKET-NG-16](../../engineering/tickets/TICKET-NG-16-no-negative-zero.md) — Formatters never print "-0,00" or "-0%" (CR5-24) — independent

## UI correctness

- [ ] [TICKET-TXN-13](../../transactions/tickets/TICKET-TXN-13-rule-from-filter-matches-filter.md) — "Make rule from filter" matches what the filter shows (CR6-9) — independent
- [ ] [TICKET-TXN-14](../../transactions/tickets/TICKET-TXN-14-selection-pruned-on-filter-and-delete.md) — Bulk actions never hit rows hidden by filters or already deleted (CR6-11) — independent
- [ ] [TICKET-TXN-15](../../transactions/tickets/TICKET-TXN-15-archived-category-on-rows.md) — Rows keep showing their archived category (CR6-22) — independent
- [ ] [TICKET-IMP-25](../../import/tickets/TICKET-IMP-25-batch-mode-parse-error.md) — Batch import shows a later file's parse error (CR6-21, part) — after IMP-20
- [ ] [TICKET-IMP-26](../../import/tickets/TICKET-IMP-26-back-after-partial-batch-no-recommit.md) — Back after a partial batch never commits a file again (CR6-21, part) — independent
- [ ] [TICKET-NG-17](../../engineering/tickets/TICKET-NG-17-reorder-ties-renumbered.md) — Reorder renumbers tied or missing sort orders, and new accounts/categories get one (CR6-20, part) — independent
- [ ] [TICKET-NG-18](../../engineering/tickets/TICKET-NG-18-reorder-within-visible-list.md) — Reorder swaps within the visible list, not with hidden archived rows (CR6-20, part) — independent
- [ ] [TICKET-NG-20](../../engineering/tickets/TICKET-NG-20-atomic-reorder.md) — Moving an account or category saves both positions atomically (CR6-20, part) — independent
- [ ] [TICKET-NG-12](../../engineering/tickets/TICKET-NG-12-settings-inputs-keep-typing.md) — Settings text fields never drop typed characters (CR6-27, part) — independent
- [ ] [TICKET-NG-22](../../engineering/tickets/TICKET-NG-22-list-toggles-keep-clicks.md) — Settings list toggles never lose a click (CR6-27 part, CR6-A2) — independent
- [ ] [TICKET-REC-15](../../recurring/tickets/TICKET-REC-15-dismiss-merge-in-flight-guard.md) — Double-clicking Dismiss or Merge records one override (CR6-23) — independent
- [ ] [TICKET-AUTH-06](../../auth/tickets/TICKET-AUTH-06-admin-self-rename-refreshes-shell.md) — Renaming yourself on the admin page updates the shell (CR5-25) — independent
- [ ] [TICKET-MCP-06](../../mcp/tickets/TICKET-MCP-06-copy-token-clipboard-fallback.md) — "Copy token" works over plain HTTP on a LAN (CR6-28) — independent

## Small items

- [ ] [TICKET-CAT-14](../../categories/tickets/TICKET-CAT-14-iban-rule-conditions-normalised.md) — IBAN rule conditions ignore spacing and case (CR6-29, CR6-A4) — independent
- [ ] [TICKET-CAT-15](../../categories/tickets/TICKET-CAT-15-run-rules-keeps-partner-contribution.md) — "Run rules" keeps the Partner-contribution tag (CR6-33) — independent
- [ ] [TICKET-ML-19](../../learning/tickets/TICKET-ML-19-rule-proposals-single-prediction.md) — ML rule proposals only group rows predicted as the same category (CR6-31) — independent
- [ ] [TICKET-REC-14](../../recurring/tickets/TICKET-REC-14-category-end-no-phantom-payment.md) — A category end date doesn't create a phantom payment (CR6-30) — independent
- [ ] [TICKET-SRV-20](../../server/tickets/TICKET-SRV-20-restore-fresh-ids-from-sqlite-sequence.md) — Restore never hands out a deleted id again (CR6-34) — after SRV-18
- [ ] [TICKET-NG-15](../../engineering/tickets/TICKET-NG-15-api-client-keeps-http-status.md) — ApiClient keeps the HTTP status on its rejections (CR6-26, part) — independent
- [ ] [TICKET-NG-21](../../engineering/tickets/TICKET-NG-21-api-client-absent-uses-status.md) — `ApiClient.absent()` checks the status, not `instanceof HttpErrorResponse` (CR6-26, part) — independent
- [ ] [TICKET-NG-19](../../engineering/tickets/TICKET-NG-19-accounts-store-no-raw-remove.md) — `AccountsStore` exposes no `remove()` that skips the delete cascade (CR6-20, part) — independent
- [ ] [TICKET-SOLID-09](../../engineering/tickets/TICKET-SOLID-09-shared-balance-formula.md) — Client and MCP share one balance formula (CR6-A4, part) — independent
- [ ] [TICKET-SOLID-12](../../engineering/tickets/TICKET-SOLID-12-one-percent-delta.md) — One `percentDelta` replaces the four private copies (CR6-A4 part, CR5-23) — independent
- [ ] [TICKET-STAT-52](../../dashboard/tickets/TICKET-STAT-52-trend-chart-label-encoding.md) — Fix the double-encoded trend-chart label (CR6-35) — independent
- [ ] [TICKET-DAT-06](../../data-management/tickets/TICKET-DAT-06-stale-storage-copy.md) — The data-management page says the theme is stored per account (CR6-36, part) — independent
- [ ] [TICKET-LOAN-18](../../loans/tickets/TICKET-LOAN-18-loans-page-stale-copy.md) — The loans page no longer says loan tracking is "on its way" (CR6-36, part) — independent

Not separately ticketed: CR6-A2 and CR6-A3 are themes whose fixes are exactly NG-11 + NG-22 and IMP-21, which cite them. CR5-2, 4, 10, 12, 13, 14, 16, 18–22 were not re-checked by CR6; confirm them against the code before ticketing.

## Definition of Done (applies to every item)

Per [CLAUDE.md](../../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development`, plus `npm --prefix server run lint`, `npm --prefix server run typecheck` and `npm run test:server` whenever `server/` or `shared/` changed, plus the fallow skill check, plus a live browser check for any UI-visible change. Schema changes go through a new Drizzle migration; the production bundle budget in `angular.json` is never raised.
