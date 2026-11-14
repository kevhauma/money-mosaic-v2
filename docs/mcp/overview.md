# MCP — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

The MCP server inside `server/` lets an agent (Claude Code, or Claude Desktop through a stdio bridge) on the home network read your data and recategorise it. It authenticates with per-user tokens, and destructive tools preview first and need `confirm: true`. The design was settled in a grilling session on 2026-11-14, and its decisions are recorded in each ticket's Notes.

**4 tickets** — 0 done.

- [ ] [TICKET-MCP-01](./tickets/TICKET-MCP-01-token-auth-and-read-tools.md) — An MCP endpoint with token auth, and the read tools (new, builds on TICKET-SRV-03 / TICKET-AUTH-01) — independent, build it first; every other MCP ticket needs it · _unreleased_
- [ ] [TICKET-MCP-02](./tickets/TICKET-MCP-02-assign-categories-tool.md) — `assign_categories`: categorise transactions in bulk from an agent (FR-TXN-2 / FR-CAT-3) — needs TICKET-MCP-01 · _unreleased_
- [ ] [TICKET-MCP-03](./tickets/TICKET-MCP-03-shared-rule-matcher-and-run-rules.md) — The rule matcher moves to `shared/`, and the agent can run rules (FR-CAT-2 / FR-CAT-3) — needs TICKET-MCP-01 · _unreleased_
- [ ] [TICKET-MCP-04](./tickets/TICKET-MCP-04-category-and-rule-editing-tools.md) — Create, edit, archive and delete categories and rules from an agent (FR-CAT-1 / FR-CAT-2 / FR-CAT-9) — needs TICKET-MCP-01, TICKET-MCP-03 and TICKET-CAT-12 · _unreleased_
