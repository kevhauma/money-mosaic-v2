# 3 — Update deploy (every release)

Needs [2 — First deploy](./2-first-deploy.md) done. The database is kept; only the code changes.

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

2. Unzip and install dependencies (the old release keeps running):

   ```bash
   sudo -u moneymosaic unzip -q /tmp/money-mosaic-$REL.zip -d /opt/money-mosaic/releases/$REL
   node -v                                 # must be v22.x
   cd /opt/money-mosaic/releases/$REL/server
   sudo -u moneymosaic -H npm ci
   ```

3. Back up the database:

   ```bash
   sudo -u moneymosaic sqlite3 /var/lib/money-mosaic/money-mosaic.sqlite ".backup /var/backups/money-mosaic/pre-$REL.sqlite"
   ```

4. Note the running release:

   ```bash
   PREV=$(readlink /opt/money-mosaic/current); echo $PREV
   ```

5. Switch and restart:

   ```bash
   sudo ln -sfn /opt/money-mosaic/releases/$REL /opt/money-mosaic/current
   sudo systemctl restart money-mosaic
   ```

6. Check:

   ```bash
   journalctl -u money-mosaic -n 20 --no-pager     # expect "Money Mosaic is serving on:"
   curl -s localhost:4300/api/health               # expect {"ok":true,...}
   ```

7. In a browser: sign in, open the dashboard, open a transaction, refresh the page. Existing data must still be there.

8. Clean up:

   ```bash
   rm /tmp/money-mosaic-$REL.zip
   ls -1d /opt/money-mosaic/releases/* | head -n -3 | xargs -r sudo rm -rf                 # keep the last 3 releases
   ls -1 /var/backups/money-mosaic/pre-*.sqlite | head -n -10 | xargs -r sudo rm -f        # keep the last 10 pre-deploy backups
   ```

## Rollback (server)

If step 6 or 7 fails:

1. Switch back and restart:

   ```bash
   sudo ln -sfn "$PREV" /opt/money-mosaic/current
   sudo systemctl restart money-mosaic
   ```

2. Check again (step 6 and 7).

3. Only if it still fails on the database (the new release changed its structure) — this loses everything written since step 3:

   ```bash
   sudo systemctl stop money-mosaic
   sudo -u moneymosaic cp /var/backups/money-mosaic/pre-$REL.sqlite /var/lib/money-mosaic/money-mosaic.sqlite
   sudo -u moneymosaic rm -f /var/lib/money-mosaic/money-mosaic.sqlite-wal /var/lib/money-mosaic/money-mosaic.sqlite-shm
   sudo systemctl start money-mosaic
   ```

4. Delete the bad release: `sudo rm -rf /opt/money-mosaic/releases/$REL`.
