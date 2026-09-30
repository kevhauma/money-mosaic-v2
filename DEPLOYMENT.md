# Deployment

> ## ⚠️ This document describes the pre-v3 deploy and no longer works
>
> **Superseded 2026-09-30 by [TICKET-SRV-09](docs/server/tickets/TICKET-SRV-09-single-process-local-hosting.md).**
> Everything below deploys a **static `dist/`** behind Caddy, which had a working app in it as long
> as the data lived in the browser. Since v3 every read goes to `/api`, so a static deploy now
> serves a shell with nothing in it and no way to sign in.
>
> **For how to actually run it, see [Hosting it on your own machine](README.md#hosting-it-on-your-own-machine)
> in the README** — one command, one port, plus where the database file is and how to back it up.
>
> This file is kept because the self-hosted-runner and Caddy setup it describes is still real, and
> anyone wanting to put the v3 server behind that reverse proxy would start from it. Doing so is
> explicitly **not** in SRV-09's scope: the server has no TLS, no CSRF protection and no rate
> limiting, and is not built to face the internet at all. Read the README's warning first.

MoneyMosaicVibe **was** a fully client-side SPA (no backend, all data in the browser's IndexedDB), so
"deploying" was just: build the static files and let Caddy serve them. This repo deploys via a
**self-hosted GitHub Actions runner installed on the same machine as Caddy** — the workflow builds
the app and copies the output straight into Caddy's webroot on disk. No SSH, no registry, no
network hop.

Files involved:

- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — the workflow (lint → test → build → copy)
- [`deploy/Caddyfile.example`](deploy/Caddyfile.example) — reference site block; **not** applied automatically

## One-time server setup

Assumes Caddy is already installed and serving at least one other site (per your setup).

1. **Register a self-hosted runner** for this repo (GitHub → repo → Settings → Actions → Runners →
   New self-hosted runner), install it as a service on the machine, and make sure it's `Idle` in
   the runner list before continuing.

2. **Create the webroot** the app will be deployed into, and make sure the runner's service
   account can write to it:

   ```bash
   sudo mkdir -p /var/www/money-mosaic-vibe
   sudo chown <runner-service-user>:<runner-service-user> /var/www/money-mosaic-vibe
   ```

   If Caddy runs as its own user (e.g. `caddy`), that user only needs **read** access to the
   directory — it does not need to be the owner.

3. **Add a site block** to the Caddyfile Caddy already loads on this machine — copy the shape from
   [`deploy/Caddyfile.example`](deploy/Caddyfile.example), swap in your real domain, and point
   `root *` at the path from step 2. Then:

   ```bash
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   ```

   This is a one-time (or edit-when-routing-changes) step — the deploy workflow never touches the
   Caddyfile itself, only the static files under the webroot.

4. **Make sure `rsync` is installed** on the machine (the workflow's copy step uses it):

   ```bash
   rsync --version || sudo apt install -y rsync   # or your distro's equivalent
   ```

5. *(Optional)* If your webroot isn't `/var/www/money-mosaic-vibe`, set a repo variable so the
   workflow knows where to copy to: repo → Settings → Secrets and variables → Actions →
   Variables → New repository variable → `DEPLOY_PATH` = `/your/actual/path`.

## What happens on every push to `main`

`.github/workflows/deploy.yml` runs on the self-hosted runner:

1. `npm ci`
2. `npm run lint`
3. `npm run test -- --watch=false`
4. `npm run build -- --configuration production` → output in `dist/money-mosaic-vibe/browser/`
5. `rsync -a --delete` that output into `$DEPLOY_PATH` (default `/var/www/money-mosaic-vibe`)

Any lint/test/build failure stops the deploy before step 5 — the previous build stays live. Caddy
needs no restart or reload for a normal deploy: `file_server` reads from disk on every request, so
the new files are live as soon as `rsync` finishes.

You can also trigger a deploy manually from the Actions tab (`workflow_dispatch`), useful for
re-deploying without a new commit (e.g. after fixing webroot permissions).

## Rollback

There's no automatic versioning of the deployed output. To roll back, `git revert` (or reset) to
the last-good commit on `main` and push — the next run redeploys that commit's build. If you want
history of what's actually on disk, keep the webroot itself in a directory you snapshot/back up
separately (rsync's `--delete` means it always mirrors the latest build exactly).
