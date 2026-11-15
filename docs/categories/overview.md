# Categories — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**15 tickets** — 12 done, 3 open.

- [x] [TICKET-CAT-01](./tickets/TICKET-CAT-01-and-or-rule-conditions.md) — AND/OR combinators for rule conditions · _v1.0 Foundation_
- [x] [TICKET-CAT-02](./tickets/TICKET-CAT-02-neutral-category-kind.md) — "Neutral" category kind for partner/external contributions · _v1.1 Joint accounts_
- [x] [TICKET-CAT-03](./tickets/TICKET-CAT-03-manual-category-ordering.md) — Manual category ordering · _v1.1 Joint accounts_
- [x] [TICKET-CAT-04](./tickets/TICKET-CAT-04-rules-search-filter.md) — Search and filter on the Rules screen · _v1.3 Dashboard insights_
- [x] [TICKET-CAT-05](./tickets/TICKET-CAT-05-rule-label-single-source.md) — Single-source the rule field/operator display labels · _v1.3 Code review (CR3)_
- [x] [TICKET-CAT-06](./tickets/TICKET-CAT-06-share-rules.md) — Share rules (export/import all or a selection) · _v1.4 Data management_
- [x] [TICKET-CAT-07](./tickets/TICKET-CAT-07-make-rule-from-filter.md) — Make rule from filter · _v1.5 Redesign_
- [x] [TICKET-CAT-08](./tickets/TICKET-CAT-08-rule-form-condition-row.md) — Rule-form editor discriminant + `rule-condition-row` extraction · _v2 Code review (CR4)_
- [x] [TICKET-CAT-09](./tickets/TICKET-CAT-09-categories-rules-page-header.md) — Categories/Rules header: the switch, the create button, and each tab's own control · _v1.6.2 Interface polish_
- [x] [TICKET-CAT-10](./tickets/TICKET-CAT-10-category-applicability-range.md) — Assign an applicability range to a category · _v2.1 Extra graphs_
- [x] [TICKET-CAT-11](./tickets/TICKET-CAT-11-pickers-respect-applicability.md) — Pickers and filters only offer categories that apply to the date at hand · _v2.1 Extra graphs_
- [x] [TICKET-CAT-12](./tickets/TICKET-CAT-12-category-delete-orphans-rules.md) — Deleting a category no longer orphans its rules or clears transactions it then fails to delete (bug fix, FR-CAT-1 / FR-CAT-2 — rules keep a dangling `setCategoryId`, and `CategoriesStore.removeCategory` persists the transaction clear before the server can refuse) — independent, can ship any time; TICKET-MCP-04 needs it · _unreleased_
- [ ] [TICKET-CAT-13](./tickets/TICKET-CAT-13-merchant-rules-top-precedence.md) — "Always categorise" and accepted ML rules take top precedence (bug fix, FR-CAT-4 / FR-CAT-2 — `createRuleFromCounterparty` saves the rule at `max priority + 10`, so it runs last) — independent · _unreleased_
- [ ] [TICKET-CAT-14](./tickets/TICKET-CAT-14-iban-rule-conditions-normalised.md) — IBAN rule conditions ignore spacing and case (bug fix, FR-CAT-2 — `shared/rule-matching.ts` compares raw IBANs; `normalizeIban` lives only in `src/`) — independent · _unreleased_
- [ ] [TICKET-CAT-15](./tickets/TICKET-CAT-15-run-rules-keeps-partner-contribution.md) — "Run rules" keeps the Partner-contribution tag (bug fix, FR-CAT-3 — `RulesStore.runRules` skips the co-owner tagger that import runs after the rules) — independent · _unreleased_
