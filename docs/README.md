# docs/ layout

`docs/` holds two kinds of folder. Both use the same `vX.Y_<topic>` naming scheme — there is one rule, not two.

## `vX.Y_<topic>` — feature milestones and reviews/audits alike

`X.Y` is the app's feature-milestone version. Which milestone a folder takes depends on its kind:

- A **feature milestone** folder is named after the version it specs or ships (e.g. `v1.1_joint_accounts`, `v1.4_income_growth`).
- A **review/audit** folder is named after whichever feature version had most recently shipped when the review was conducted — the review isn't on its own counter, it's dated by the milestone it landed after. `docs/v1.3_code_review` (CR3) follows this correctly: it was written after v1.3's features (`v1.3_dashboard_insights`) shipped, so it takes the `v1.3` prefix. Two folders sharing a `vX.Y` prefix — one milestone, one review — is expected under this rule, not a naming collision: it tells you the review postdates that milestone's ship.

Don't hardcode the folder list here; `ls docs/` or `docs/*/overview.md` is the source of truth (see the `spec-navigator` skill).

## Grandfathered folders

Two review folders predate this rule and are **not renamed**:

- `docs/code-review/` — first review (CR1, unnumbered).
- `docs/coding-review-2/` — second review (CR2, unnumbered despite the "2").

Renaming would mean rewriting every inbound relative link across `docs/`, `.claude/`, and `CLAUDE.md` for a cosmetic win — decided against, per TICKET-DX-03. Treat these two as fixed exceptions, not as examples of the current rule. The next review (CR4) is named `vX.Y_<topic>` for whatever version had most recently shipped when it's written.
