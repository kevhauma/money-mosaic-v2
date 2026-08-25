# docs/ layout

Tickets are organised **by feature area**, not by the release that happened to ship them.
A release is an event; an area is where the work lives. `docs/` has three kinds of folder.

## `docs/<area>/` — the tickets

One folder per feature area, each with an `overview.md` index and a `tickets/` folder:

```
docs/dashboard/
  overview.md                 # index of every dashboard ticket, with status + release
  tickets/
    TICKET-STAT-29-spending-heatmap-panel.md
    ...
```

The area folders map onto `src/app/feature-*` wherever a matching feature exists
(`docs/transactions/` ↔ `feature-transactions/`), plus two that don't:
`docs/engineering/` (code-review output — refactors, performance, cleanup, tests) and
`docs/tooling/` (repo tooling, skills, dev seed).

Don't hardcode the area list anywhere; `ls docs/` is the source of truth.

### Ticket IDs pick the folder

Every ticket is `TICKET-<PREFIX>-<NN>-<slug>.md`, and **a prefix maps to exactly one area
folder**. A folder may host more than one prefix (`docs/help/` holds `PUB` and `CHG`), but a
prefix is never split across folders — so a ticket's ID alone tells you where its file lives.

`<NN>` is unique per prefix across the whole project, not per release. When adding a ticket,
take the next free number for that prefix.

## `docs/releases/<version>/` — what shipped when

The release record: each version's `overview.md` keeps its build order, dependency notes, scope
decisions and won't-do rationale intact, plus any narrative docs that version produced
(`dashboard-layout.md`, `code-review.md`, `solutions/`, ...). These are **historical records** —
they describe a moment, so don't rewrite them to match later decisions.

Every ticket carries a `- **Released in:**` line linking back to its release, so provenance
survives the fact that the file no longer lives in that folder.

Reviews/audits are releases too, named for whichever feature version had most recently shipped
when the review was conducted (`v1.3_code_review` follows `v1.3_dashboard_insights`). Two folders
sharing a `vX.Y` prefix — one milestone, one review — is expected, not a collision. Two review
folders predate that rule and are **not renamed**: `code-review/` (CR1) and `coding-review-2/`
(CR2). Renaming would mean rewriting every inbound link for a cosmetic win — decided against, per
TICKET-DX-03.

## `docs/reference/` — living specs

Cross-cutting documents that describe the app as it is now, not as one release left it:

- `finance-app-spec.md` — the functional spec (FR-TXN-\*, FR-CAT-\*, FR-TRF-\*, ...).
- `ui-layout-spec.md` — layout and navigation decisions.

Unlike `releases/`, these are meant to be kept current.

`docs/v9999_ideas/` sits outside all three: an unscoped idea backlog, not a release and not an
area, promoted into tickets when an idea gets picked up.

## When conducting the next review

Carry this one method addition forward (recorded by [TICKET-DX-06](./tooling/tickets/TICKET-DX-06-work-ticket-skill-guards.md), from CR4-13):

> **Sample recently-closed tickets' checked acceptance criteria against the code.** Take a handful of tickets closed since the last review and verify that what their `- [x]` boxes claim actually exists in the working tree. CR4 found TICKET-SET-06 carrying two checked route criteria for a route that was never built — the pivot to an embedded section was real and correct, but nothing recorded it, so the ticket record described code that did not exist. The `work-ticket` skill now requires evidence on every tick and a final AC↔diff pass, but only a review samples whether that is holding.
