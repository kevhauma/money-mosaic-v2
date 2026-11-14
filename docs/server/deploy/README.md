# Deploying v3 — git deploy to the home server

## Facts

- The server version is a git clone of `feature/v3-server-accounts` at `/opt/money-mosaic-server`,
  owned by your own account. A deploy is `git pull` → [`deploy/deploy.sh`](../../../deploy/deploy.sh)
  (`npm ci` for root and `server/`, `npm run build`, back up the database) → restart the service.
- Server: Linux x64 on our own network, not exposed to the internet. Node 22, systemd.
- Runs **next to** the browser-only app (deployed from `main` by GitHub) — it does not replace it.
- v3 is reached at `http://<server>:4300`.

## Folders on the server

```
/opt/money-mosaic-server/                     the clone — code, node_modules, dist/
/opt/money-mosaic-server/server/data/         the database (gitignored) and staged imports
/opt/money-mosaic-server/server/data/backups/ pre-deploy and nightly backups
```

## Once

1. Install Node 22 and the build tools (the database driver is native):

   ```bash
   sudo apt-get remove -y nodejs npm       # drop Debian's own Node 18 if it is there
   sudo apt-get install -y curl ca-certificates gnupg
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs sqlite3 build-essential python3
   node -v                                 # must be v22.x — stop here if it is not
   ```

   Node 18 (Debian's package) installs fine but the server crashes with exit status 139.

2. Clone (skip if `/opt/money-mosaic-server` already exists):

   ```bash
   sudo mkdir /opt/money-mosaic-server && sudo chown $USER: /opt/money-mosaic-server
   git clone -b feature/v3-server-accounts <repo-url> /opt/money-mosaic-server
   mkdir -p /opt/money-mosaic-server/server/data
   ```

3. Create the service, from the account that owns the clone (`$USER` is filled in by the shell;
   check `which node` is `/usr/bin/node`):

   ```bash
   sudo tee /etc/systemd/system/money-mosaic.service >/dev/null <<EOF
   [Unit]
   Description=Money Mosaic (server version)
   After=network.target
   StartLimitIntervalSec=60
   StartLimitBurst=5

   [Service]
   Type=simple
   User=$USER
   Environment=NODE_ENV=production
   Environment=PORT=4300
   WorkingDirectory=/opt/money-mosaic-server/server
   ExecStart=/usr/bin/node node_modules/tsx/dist/cli.mjs src/index.ts
   Restart=on-failure
   RestartSec=5
   NoNewPrivileges=true
   PrivateTmp=true
   ProtectSystem=strict
   ProtectHome=true
   ReadWritePaths=/opt/money-mosaic-server/server/data

   [Install]
   WantedBy=multi-user.target
   EOF
   sudo systemctl daemon-reload
   sudo systemctl enable money-mosaic
   ```

   Stop any copy you started by hand first — it holds port 4300 (`sudo ss -ltnp | grep 4300`).

4. Build and start it: `bash /opt/money-mosaic-server/deploy/deploy.sh && sudo systemctl start money-mosaic`.

5. If `ufw` is active, open port 4300 to the home network (adjust the subnet):

   ```bash
   sudo ufw allow from 192.168.1.0/24 to any port 4300 proto tcp
   ```

6. Nightly backup at 03:15, keeping 30 days:

   ```bash
   sudo tee /etc/cron.d/money-mosaic >/dev/null <<EOF
   15 3 * * * $USER cd /opt/money-mosaic-server/server/data && sqlite3 money-mosaic.sqlite ".backup backups/nightly-\$(date +\%F).sqlite" && find backups -name 'nightly-*.sqlite' -mtime +30 -delete
   EOF
   ```

7. Copy `server/data/backups/` to a second machine or NAS — it sits on the same disk as the database.

8. On a fresh database: open `http://<server>:4300`, sign in as `admin` / `admin`, change the
   password (Settings → Account), then create the other accounts (User accounts in the sidebar).

## Every release

```bash
cd /opt/money-mosaic-server
git pull                                        # note the "Updating PREV..REL" line, for a rollback
bash deploy/deploy.sh                           # install, build, back up to server/data/backups/pre-REL.sqlite
sudo systemctl restart money-mosaic
curl -s localhost:4300/api/health               # expect {"ok":true,...}
```

Then, in a browser: sign in, open the dashboard, open a transaction, refresh the page. Existing
data must still be there.

Check on it any time:

```bash
systemctl status money-mosaic
journalctl -u money-mosaic -n 50 --no-pager
curl -s localhost:4300/api/health               # expect {"ok":true,...}
```

## Rollback

With `PREV` and `REL` from `git pull`'s "Updating PREV..REL" line (or `git reflog`):

```bash
cd /opt/money-mosaic-server
git reset --hard $PREV
npm ci && npm --prefix server ci && npm run build -- --configuration production
sudo systemctl restart money-mosaic
```

Only if it still fails on the database (the new release changed its structure) — this loses
everything written since the deploy:

```bash
sudo systemctl stop money-mosaic
cp server/data/backups/pre-$REL.sqlite server/data/money-mosaic.sqlite
rm -f server/data/money-mosaic.sqlite-wal server/data/money-mosaic.sqlite-shm
sudo systemctl start money-mosaic
```

The next `git pull` moves forward again.

## Test a restore (once a nightly backup exists)

```bash
cd /opt/money-mosaic-server/server
cp data/backups/nightly-<date>.sqlite /tmp/restore-test.sqlite
NODE_ENV=production PORT=4399 DB_FILE=/tmp/restore-test.sqlite STAGED_IMPORT_DIR=/tmp/restore-staged node node_modules/tsx/dist/cli.mjs src/index.ts
curl -s localhost:4399/api/health               # in a second shell — expect {"ok":true,...}
```

Ctrl-C the copy, then `rm -rf /tmp/restore-test.sqlite* /tmp/restore-staged`.

## Rules

- Never touch `/var/www/money-mosaic`, the browser-only app's Caddy block, or its GitHub deploy.
- Never merge v3 into `main` while the browser-only app deploys from `main` — the GitHub `deploy`
  job would build v3 over it and break it.
- Never edit files in the clone on the server — commit on the dev machine and deploy.
- Never use `--omit=dev` for `npm ci` on the server — the server runs on `tsx`, a dev dependency.
