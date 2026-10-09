# 2 — First deploy (once)

Needs [1 — Server setup](./1-server-setup.md) done.

## Build the zip (dev machine, PowerShell, repo root)

1. Check the tree is clean — must print nothing:

   ```powershell
   git status --short
   ```

2. Verify:

   ```powershell
   ng lint; ng test --watch=false; npm run test:server; npm --prefix server run lint; npm --prefix server run typecheck
   ```

3. Build:

   ```powershell
   npm ci
   npm run build -- --configuration production
   ```

4. Package:

   ```powershell
   $rel = "$(Get-Date -f yyyy-MM-dd)-$(git rev-parse --short HEAD)"
   $out = "$env:TEMP\money-mosaic-$rel"
   Remove-Item -Recurse -Force $out -ErrorAction SilentlyContinue
   New-Item -ItemType Directory "$out\dist" | Out-Null
   git archive -o "$out\src.tar" HEAD server shared
   tar -xf "$out\src.tar" -C $out
   Remove-Item "$out\src.tar"
   Copy-Item -Recurse dist\money-mosaic-vibe "$out\dist\"
   tar -a -c -f "money-mosaic-$rel.zip" -C $out server shared dist
   ```

5. Check no database is in the zip — must print nothing:

   ```powershell
   tar -tf "money-mosaic-$rel.zip" | Select-String sqlite
   ```

6. Tag, print the release name, copy to the server:

   ```powershell
   git tag "deploy/$rel"
   $rel
   scp "money-mosaic-$rel.zip" you@money-server:/tmp/
   ```

## Install (server)

1. Set the release name (as printed above):

   ```bash
   REL=2026-10-06-32ce699
   ```

2. Unzip and install dependencies:

   ```bash
   sudo -u moneymosaic unzip -q /tmp/money-mosaic-$REL.zip -d /opt/money-mosaic/releases/$REL
   node -v                                 # must be v22.x
   cd /opt/money-mosaic/releases/$REL/server
   sudo -u moneymosaic -H npm ci
   ```

3. Point `current` at it and start:

   ```bash
   sudo ln -sfn /opt/money-mosaic/releases/$REL /opt/money-mosaic/current
   sudo systemctl start money-mosaic
   ```

4. Check:

   ```bash
   journalctl -u money-mosaic -n 20 --no-pager     # expect "Seeded the first account" and "Money Mosaic is serving on:"
   curl -s localhost:4300/api/health               # expect {"ok":true,...}
   ls /var/lib/money-mosaic/                       # expect money-mosaic.sqlite
   rm /tmp/money-mosaic-$REL.zip
   ```

## Set up the app (browser)

1. Open `http://<server>:4300`.
2. Sign in as `admin` / `admin`.
3. Change the password: Settings → Account.
4. Optional — copy data from the static app:
   1. In the static app: Data → export. (The static app keeps its data; this is a copy.)
   2. In v3, still as `admin`: Data → import → **replace**, with that file.
   3. Do this **before** creating any other account, or the import fails with a 409.
   4. Only **one** export can be imported this way.
   5. Retrain the auto-categoriser (it is not in the export).
5. Create the other accounts: User accounts in the sidebar.

The two apps do not sync: changes in one do not appear in the other.

## Test a restore (the day after, once a nightly backup exists)

1. Start a copy on another port:

   ```bash
   cd /opt/money-mosaic/current/server
   sudo -u moneymosaic cp /var/backups/money-mosaic/nightly-<date>.sqlite /tmp/restore-test.sqlite
   sudo -u moneymosaic env NODE_ENV=production PORT=4399 DB_FILE=/tmp/restore-test.sqlite node node_modules/tsx/dist/cli.mjs src/index.ts
   ```

2. In a second shell — expect `{"ok":true,...}`:

   ```bash
   curl -s localhost:4399/api/health
   ```

3. Ctrl-C the copy, then `sudo rm /tmp/restore-test.sqlite*`.

Next releases: [3 — Update deploy](./3-update-deploy.md).
