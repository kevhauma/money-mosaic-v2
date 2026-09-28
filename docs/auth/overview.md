# Auth & Accounts — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

Who you are and what you are allowed to do: the `users` table, sign-in, sessions, and the admin panel that manages everyone else's accounts. The server these run on, and the move of the app's data onto it, live next door in [docs/server/](../server/overview.md).

Not to be confused with [docs/accounts/](../accounts/overview.md), which is about **bank** accounts.

> **No Roadmap or Changelog entries for this area.** Same decision as [docs/server/](../server/overview.md):
> the in-app Roadmap and Changelog tabs speak to users about features, and this is local-hosting
> plumbing. The `story-ticket` skill's Step 4.5 and the `work-ticket` skill's Step 6.5 are
> **skipped** for every `AUTH` ticket — decided with the user on 2026-09-23.

**4 tickets** — 2 done.

- [x] [TICKET-AUTH-01](./tickets/TICKET-AUTH-01-users-seeded-admin-login.md) — Users table, a seeded admin/admin account, and email + password login (new — no FR covers accounts; extends the Persistence section of the spec) — needs TICKET-SRV-01 · _unreleased_
- [x] [TICKET-AUTH-02](./tickets/TICKET-AUTH-02-login-screen-session-guard.md) — Login screen, session store, and a guarded app (extends `ui-layout-spec.md` with a pre-shell route) — needs TICKET-AUTH-01 · _unreleased_
- [ ] [TICKET-AUTH-03](./tickets/TICKET-AUTH-03-admin-user-management.md) — Admin panel: create, rename, reset, disable and delete the other accounts — needs TICKET-AUTH-01, TICKET-AUTH-02 and TICKET-SRV-02 (for the per-user tables its delete cascades through) · _unreleased_
- [ ] [TICKET-AUTH-04](./tickets/TICKET-AUTH-04-change-own-password.md) — Change your own password, and stop the default admin password being forgotten — needs TICKET-AUTH-01 and TICKET-AUTH-02; independent of the SRV data-migration tickets, so it can ship as soon as the login screen exists · _unreleased_
