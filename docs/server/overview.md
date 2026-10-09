# Server — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

The backend itself — Express, SQLite, Drizzle — and the move of the app's data out of the browser and onto it. Identity, sessions and account management live next door in [docs/auth/](../auth/overview.md).

> **No Roadmap or Changelog entries for this area.** The in-app Roadmap and Changelog tabs
> (`feature-changelog`) exist to tell *users* what is coming and what landed. This is
> local-hosting infrastructure that nobody reading those tabs is waiting for, so the
> `story-ticket` skill's Step 4.5 and the `work-ticket` skill's Step 6.5 are **skipped** for
> every `SRV` ticket — decided with the user on 2026-09-23. Don't add them back, and don't
> treat their absence as an oversight to repair.

**11 tickets** — 11 done.

- [x] [TICKET-SRV-01](./tickets/TICKET-SRV-01-express-sqlite-drizzle-skeleton.md) — Express + SQLite + Drizzle backend skeleton (new — introduces a backend, superseding the "no backend" premise in `CLAUDE.md`) — nothing depends on it yet, but everything in v3 does; build it first · _unreleased_
- [x] [TICKET-SRV-02](./tickets/TICKET-SRV-02-drizzle-schema-per-user.md) — Every Dexie table as a Drizzle table, owned by a user (ports the data model in `data-model/SKILL.md`) — needs TICKET-SRV-01 and TICKET-AUTH-01 · _unreleased_
- [x] [TICKET-SRV-03](./tickets/TICKET-SRV-03-rest-api-per-entity.md) — A REST API for every entity, scoped to the signed-in user (mirrors the repository layer) — needs TICKET-SRV-02 · _unreleased_
- [x] [TICKET-SRV-04](./tickets/TICKET-SRV-04-transactional-write-endpoints.md) — The multi-table write paths become transactional server endpoints (preserves NFR-RESIL-1) — needs TICKET-SRV-03 · _unreleased_
- [x] [TICKET-SRV-05](./tickets/TICKET-SRV-05-repositories-over-http.md) — Repositories talk HTTP instead of Dexie (refactor, preserves the repository seam in `CLAUDE.md`) — needs TICKET-SRV-03, TICKET-SRV-04 and TICKET-AUTH-02; this is the point of no return for local-first · _unreleased_
- [x] [TICKET-SRV-06](./tickets/TICKET-SRV-06-bootstrap-hydration-over-network.md) — Bootstrap and hydration over a network that can fail (replaces NFR-STORE-1 / FR-DAT-4) — needs TICKET-SRV-05 and should ship right behind it · _unreleased_
- [x] [TICKET-SRV-07](./tickets/TICKET-SRV-07-migrate-local-database.md) — Move the database already in your browser into your account, once (reuses TICKET-DAT-01's export machinery) — needs TICKET-SRV-04 and TICKET-SRV-05; **must ship before TICKET-SRV-08** · _unreleased_
- [x] [TICKET-SRV-08](./tickets/TICKET-SRV-08-retire-dexie.md) — Retire Dexie and rewrite the docs that still say "no backend" (refactor, retires FR-DAT-4 / NFR-STORE-1) — needs TICKET-SRV-05, TICKET-SRV-06 and TICKET-SRV-07 · _unreleased_
- [x] [TICKET-SRV-09](./tickets/TICKET-SRV-09-single-process-local-hosting.md) — One command, one port: Express serves the built app (new — hosting and backup documentation) — technically only needs TICKET-SRV-01, but its README is only honest after TICKET-SRV-08, so sequence it last · _unreleased_
- [x] [TICKET-SRV-10](./tickets/TICKET-SRV-10-ui-preferences-off-localstorage.md) — The last `localStorage` keys (theme, landing-page flag, backup-reminder dismissal) move to a per-account `uiPreferences` row (refactor, reverses the per-browser calls in SET-05 / PUB-01 / PUB-04) — needs TICKET-SRV-08 · _unreleased_
- [x] [TICKET-SRV-11](./tickets/TICKET-SRV-11-staged-import-upload.md) — A full-database import is staged to disk instead of buffered as a JSON body (bug fix, FR-DAT-2 — the whole document is posted as one `express.json()` body, so a restore is bounded by the app-wide 10mb pre-auth ceiling and fails with body-parser's bare `request entity too large`) — needs TICKET-SRV-04 and TICKET-SRV-05, both shipped; independent, can ship any time · _unreleased_
