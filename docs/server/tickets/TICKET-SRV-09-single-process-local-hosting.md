# TICKET-SRV-09 — One command, one port: Express serves the built app

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** new; planned for v3

## User story

As the person hosting Money Mosaic on a machine at home, I want one command that serves the whole app and its API on one port, so the others can reach it from their own laptops without me running two processes and explaining a proxy.

## Description

Turns the development setup into something hostable: the Express server from [TICKET-SRV-01](./TICKET-SRV-01-express-sqlite-drizzle-skeleton.md) serves the production Angular build alongside `/api`, on one port, with SPA fallback — plus the README that tells someone how to run it, where their data file is, and how to back it up.

## Current situation (as-is)

- Development runs two processes: `ng serve` on 4210 and the API on 4300, bridged by `proxy.conf.json`. That arrangement exists for hot reload and is not something to hand to a household.
- `ng build` produces a static `dist/` that nothing currently serves.
- The repo's README and `CLAUDE.md` describe an app you open with `ng serve`; there is no hosting story at all, because until v3 there was nothing to host.
- The SQLite file lives at `server/data/money-mosaic.sqlite` and is gitignored. Nothing tells a user it exists or that it is now the only copy of their finances.

## Desired result (to-be)

- **Static serving**: in production mode the Express app serves the Angular `dist/` output, with cache headers appropriate to Angular's hashed filenames (long-lived for hashed assets, no-store for `index.html`).
- **SPA fallback**: any non-`/api` path that does not match a file returns `index.html`, so a deep link like `/transactions/482` survives a refresh. `/api/*` never falls through to the SPA — an unknown API route is a JSON 404, not an HTML page, which is what makes a typo in a fetch debuggable.
- **`npm run start:local`** at the repo root: builds the Angular app in production configuration, then starts the server in production mode on one port (default **4300**, `PORT` override). One command, one process, one URL.
- **Listening on the LAN**: the server binds `0.0.0.0` so other machines on the network can reach it, and prints the URLs it is reachable on at startup — including the LAN address, since "open it on your phone" is the main use for this ticket.
- **A README section** covering: how to install and start it; the URL to open; the seeded `admin` / `admin` credentials with a pointer to changing the password ([TICKET-AUTH-04](../../auth/tickets/TICKET-AUTH-04-change-own-password.md)); where the SQLite file lives; **how to back it up** (stop the server, copy the file — or use the app's own JSON export per account); and how to change the port.
- **A prominent warning, not a footnote**: this server is deliberately unsecured for local hosting — plain HTTP, no CSRF protection, no rate limiting, no session expiry — and **must not be exposed to the internet** or port-forwarded. It restates the non-goals list from [TICKET-AUTH-01](../../auth/tickets/TICKET-AUTH-01-users-seeded-admin-login.md) in language aimed at whoever is running the box.
- **`CLAUDE.md`'s Commands section** gains the server and combined commands alongside the existing Angular ones, so a session in this repo knows how to run the whole thing.

## Acceptance criteria

- [ ] `npm run start:local` builds the app and serves it with the API on a single port; opening that URL loads a working, signed-out app.
- [ ] A deep link (e.g. `/transactions`) loads correctly on a fresh request and survives a hard refresh.
- [ ] An unknown `/api/...` path returns a JSON 404, never `index.html` — asserted by a test, since this failure mode is otherwise silent and confusing.
- [ ] Hashed assets are served with a long-lived cache header and `index.html` with no-store, so a redeploy is picked up without a manual cache clear.
- [ ] The server is reachable from a second machine on the same network, and the startup output names the LAN URL.
- [ ] The README documents install, start, the default credentials, the database file path, backup and restore, and the port override — each verified by following it on a clean clone.
- [ ] The "do not expose this to the internet" warning is present and unmissable in both the README and the app's own Data section.
- [ ] `CLAUDE.md`'s Commands section lists the server and combined commands.
- [ ] Development still works unchanged: `npm run dev` with hot reload through the proxy.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: run `npm run start:local`, open the app from a second device on the network, sign in, and confirm it works end to end.

## Notes

- **The backup instructions are the most important paragraph in the README.** Before v3 the data lived in a browser profile that was at least being backed up by whatever backed up the machine. Now it is one SQLite file that a user has never heard of, and losing it loses everything. The app's per-account JSON export ([TICKET-DAT-01](../../data-management/tickets/TICKET-DAT-01-full-data-export-import.md)) remains the per-user answer; the file copy is the whole-installation one.
- Deliberately **not** in scope: Docker, systemd units, HTTPS or reverse-proxy configuration, automated backups, and any hosted/multi-tenant deployment. Every one of those is a reasonable follow-up and none of them is needed to hand this to a household.
- Can ship any time after [TICKET-SRV-01](./TICKET-SRV-01-express-sqlite-drizzle-skeleton.md) technically, but the README is only honest once the data has actually moved — so sequence it last, after [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md).
