# Money Mosaic — Code Review 4 Backlog (Overview)

Derived from [./code-review.md](./code-review.md) (CR4, 2026-07) via the option-exploration docs in [./solutions/](./solutions/README.md) — each ticket records which option was chosen and which were rejected. Sibling to the [CR3 backlog](../v1.3_code_review/overview.md); `CR4-*` IDs trace to the review doc.

The list is in recommended build order: the import-feature sequence first (mechanical extraction → spec safety net → the session-store main event), then the user-visible formatting fix, the template/VM cleanups while their patterns are fresh, the settings/data-management commitment, the small structural moves, the documentation-truth pass, and the fallow gate last (it needs the cleanups landed to reach zero).

- [x] [TICKET-IMP-10](./tickets/TICKET-IMP-10-import-map-step-extraction.md) — Extract import-map-step's shared vocabulary and pure derivations (CR4-4 A+B, CR4-7.2) — mechanical, do first; unblocks IMP-11 and half of CR4-7
- [ ] [TICKET-TEST-03](./tickets/TICKET-TEST-03-import-wizard-flow-specs.md) — Pin the import wizard's four flow-level invariants with specs (CR4-2 pre-work) — test-only safety net, before IMP-11
- [ ] [TICKET-IMP-11](./tickets/TICKET-IMP-11-import-wizard-session-store.md) — Extract an `ImportWizardSession` state machine (CR4-2 A; absorbs CR4-1 §1 A/B) — the review's main event; needs IMP-10 + TEST-03
- [ ] [TICKET-IMP-12](./tickets/TICKET-IMP-12-batch-wait-card-extraction.md) — Extract the wizard's batch-wait card (CR4-1 §1 C) — small, after IMP-11
- [ ] [TICKET-NG-10](./tickets/TICKET-NG-10-locale-aware-formatting.md) — Locale-aware formatting: fix drift, consolidate channels, lint guard (bug fix + refactor, CR4-6 P1+P2A+P3, CR4-7.1 — five hardcoded `'en-BE'` formatters ignore the locale setting) — user-visible bug, independent; land before STAT-23
- [ ] [TICKET-STAT-23](./tickets/TICKET-STAT-23-comparison-panel-vm-and-card.md) — Finish the comparison panel's VM + extract the category card (CR4-1 §2 A+B) — needs NG-10 (shares the panel file)
- [ ] [TICKET-ACC-05](./tickets/TICKET-ACC-05-account-card-vm-and-component.md) — Account card VM + `account-card` extraction (CR4-1 §3 A+B) — independent
- [ ] [TICKET-ACC-06](./tickets/TICKET-ACC-06-accounts-detail-cleanups-balance-block.md) — Accounts-detail micro-cleanups + shared `account-balance-block` (CR4-1 §4 A+B) — needs ACC-05
- [ ] [TICKET-TXN-09](./tickets/TICKET-TXN-09-transactions-overview-row-extraction.md) — Transactions-overview row VM + `category-select-cell` + `transaction-row` (CR4-1 §5 A+B+C) — independent; coordinate with TICKET-SOLID-01 if still open
- [ ] [TICKET-CAT-08](./tickets/TICKET-CAT-08-rule-form-condition-row.md) — Rule-form editor discriminant + `rule-condition-row` (CR4-1 §6 A+B) — independent
- [ ] [TICKET-STAT-24](./tickets/TICKET-STAT-24-classify-for-stats-decision-table.md) — Decision-table spec for `classifyForStats` (CR4-3 C) — test-only, any time
- [ ] [TICKET-DAT-04](./tickets/TICKET-DAT-04-commit-to-embed-set06-repair.md) — Commit to the settings embed: delete dead route wiring + repair SET-06's record (CR4-8 A + CR4-13 P1 A) — small, do before SET-07 and CLEANUP-06
- [ ] [TICKET-SET-07](./tickets/TICKET-SET-07-settings-section-components.md) — Split the Settings page into section components + `linkControlToSetting` (CR4-5 A) — needs DAT-04
- [ ] [TICKET-SOLID-07](./tickets/TICKET-SOLID-07-range-state-store-to-core-state.md) — Move `range-state.store.ts` to `core/state/` under the widened rule (CR4-10 A) — mechanical, quiet window, before DX-04
- [ ] [TICKET-CLEANUP-05](./tickets/TICKET-CLEANUP-05-delete-bento-grid.md) — Delete the unrendered `bento-grid`/`bento-item` (CR4-9 A) — tiny, independent; before CLEANUP-06
- [ ] [TICKET-DX-04](./tickets/TICKET-DX-04-project-map-rewrite.md) — Rewrite the project-map skill, shrink its claim surface, add the store registry (CR4-11 A+C-lite, CR4-10 C) — after DAT-04 + SOLID-07; same session as DX-05
- [ ] [TICKET-DX-05](./tickets/TICKET-DX-05-conventions-skill-correction.md) — Correct the conventions skill + land the five CR4 rules (CR4-12 A+B, carries CR4-1 G2 / CR4-7 / CR4-10 / CR4-5 / CR4-4 E) — same session as DX-04
- [ ] [TICKET-DX-06](./tickets/TICKET-DX-06-work-ticket-skill-guards.md) — Doc-freshness + AC-honesty guards in the `work-ticket` skill (CR4-11 B, CR4-12 C, CR4-13 P2) — one skill edit, any time after DX-04/05
- [ ] [TICKET-CLEANUP-06](./tickets/TICKET-CLEANUP-06-fallow-zero-noise-gate.md) — Drive Fallow to zero on a clean tree and gate on new findings (CR4-14 A+B2, CR4-1 G1) — last; needs DAT-04 + CLEANUP-05

Not ticketed by design: CR4-2 Options B/C/D, CR4-3 A/B (deferred until the file is next opened hot), CR4-4 C/D (revisit after IMP-11 — the session may own prefill), CR4-5 B/C, CR4-6 B/C, CR4-9 B/C, CR4-10 B — considered and rejected/deferred; each ticket's Notes records its rejected siblings. CR4-7's enforcement tooling is deliberately not built until a third instance appears.

## Definition of Done (applies to every item)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus the fallow skill check, plus a live browser check for any UI-visible change. Dexie schema changes stay additive (none are expected here); the production bundle budget in `angular.json` is never raised; existing bundle wins (tree-shaken ECharts, lazy feature routes) stay intact.
