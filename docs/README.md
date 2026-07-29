# docs/ layout

`docs/` holds two kinds of folder. Both use the same `vX.Y_<topic>` naming scheme — there is one rule, not two.

## `vX.Y_<topic>` — feature milestones and reviews/audits alike

`X.Y` is the app's feature-milestone version. Which milestone a folder takes depends on its kind:

- A **feature milestone** folder is named after the version it specs or ships (e.g. `v1.1_joint_accounts`, `v1.6_income_growth`).
- A **review/audit** folder is named after whichever feature version had most recently shipped when the review was conducted — the review isn't on its own counter, it's dated by the milestone it landed after. `docs/v1.3_code_review` (CR3) follows this correctly: it was written after v1.3's features (`v1.3_dashboard_insights`) shipped, so it takes the `v1.3` prefix. Two folders sharing a `vX.Y` prefix — one milestone, one review — is expected under this rule, not a naming collision: it tells you the review postdates that milestone's ship.

Don't hardcode the folder list here; `ls docs/` or `docs/*/overview.md` is the source of truth (see the `spec-navigator` skill).

## Grandfathered folders

Two review folders predate this rule and are **not renamed**:

- `docs/code-review/` — first review (CR1, unnumbered).
- `docs/coding-review-2/` — second review (CR2, unnumbered despite the "2").

Renaming would mean rewriting every inbound relative link across `docs/`, `.claude/`, and `CLAUDE.md` for a cosmetic win — decided against, per TICKET-DX-03. Treat these two as fixed exceptions, not as examples of the current rule. Each new review is named `vX.Y_<topic>` for whatever version had most recently shipped when it's written — CR4 is `v2_code_review`.

## When conducting the next review

Carry this one method addition forward (recorded by [TICKET-DX-06](./v2_code_review/tickets/TICKET-DX-06-work-ticket-skill-guards.md), from CR4-13):

> **Sample recently-closed tickets' checked acceptance criteria against the code.** Take a handful of tickets closed since the last review and verify that what their `- [x]` boxes claim actually exists in the working tree. CR4 found TICKET-SET-06 carrying two checked route criteria for a route that was never built — the pivot to an embedded section was real and correct, but nothing recorded it, so the ticket record described code that did not exist. The `work-ticket` skill now requires evidence on every tick and a final AC↔diff pass, but only a review samples whether that is holding.
