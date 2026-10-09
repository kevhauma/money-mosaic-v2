# Deploying v3 — manual zip deploy to the home server

Do these in order:

1. [Server setup](./1-server-setup.md) — once per server.
2. [First deploy](./2-first-deploy.md) — once.
3. [Update deploy](./3-update-deploy.md) — every release after that, plus rollback.

## Facts

- Build on the dev machine → zip → copy to the server → unzip into a new release folder → restart.
- Server: Linux x64 on our own network, not exposed to the internet. Node 22, systemd.
- Runs **next to** the existing static app — it does not replace it.
- v3 is reached at `http://<server>:4300`.
- The database lives in `/var/lib/money-mosaic/` and is **never** inside a release or a zip.

## Folders on the server

```
/opt/money-mosaic/releases/<rel>/   one folder per deploy (dist/, server/, shared/)
/opt/money-mosaic/current           symlink → the release that is running
/var/lib/money-mosaic/              the database — never touched by a deploy
/var/backups/money-mosaic/          backups
/etc/money-mosaic/env               settings
```

## Rules

- Never copy, unzip or `rsync` anything into `/var/lib/money-mosaic/`.
- Never touch `/var/www/money-mosaic`, the static app's Caddy block, or its GitHub deploy.
- Never merge v3 into `main` while the static app deploys from `main` — the GitHub `deploy` job
  would build v3 over the static app and break it. Deploy v3 from `feature/v3-server-accounts` or a tag.
- Never deploy from a dirty tree.
- Never use `--omit=dev` for `npm ci` on the server.
- Never edit files inside a release folder — build a new zip.
