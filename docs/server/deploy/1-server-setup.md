# 1 — Server setup (once)

All on the server.

1. Install Node 22, sqlite3, unzip and build tools:

   ```bash
   sudo apt-get remove -y nodejs npm       # drop Debian's own Node 18 if it is there
   sudo apt-get install -y curl ca-certificates gnupg
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   apt-cache policy nodejs                 # "Candidate:" must be 22.x from deb.nodesource.com
   sudo apt-get install -y nodejs sqlite3 unzip build-essential python3
   node -v                                 # must be v22.x — stop here if it is not
   ```

   Node 18 (Debian's package) installs fine but the server crashes with exit status 139.

2. Create the user and folders:

   ```bash
   sudo useradd --system --home /opt/money-mosaic --shell /usr/sbin/nologin moneymosaic
   sudo mkdir -p /opt/money-mosaic/releases /var/lib/money-mosaic /var/backups/money-mosaic /etc/money-mosaic
   sudo chown -R moneymosaic:moneymosaic /opt/money-mosaic /var/lib/money-mosaic /var/backups/money-mosaic
   sudo chmod 700 /var/lib/money-mosaic /var/backups/money-mosaic
   ```

3. Create `/etc/money-mosaic/env`:

   ```ini
   NODE_ENV=production
   PORT=4300
   DB_FILE=/var/lib/money-mosaic/money-mosaic.sqlite
   ```

4. Create `/etc/systemd/system/money-mosaic.service`:

   ```ini
   [Unit]
   Description=Money Mosaic
   After=network.target
   StartLimitIntervalSec=60
   StartLimitBurst=5

   [Service]
   Type=simple
   User=moneymosaic
   Group=moneymosaic
   EnvironmentFile=/etc/money-mosaic/env
   WorkingDirectory=/opt/money-mosaic/current/server
   ExecStart=/usr/bin/node /opt/money-mosaic/current/server/node_modules/tsx/dist/cli.mjs src/index.ts
   Restart=on-failure
   RestartSec=5
   NoNewPrivileges=true
   PrivateTmp=true
   ProtectSystem=strict
   ProtectHome=true
   ReadWritePaths=/var/lib/money-mosaic

   [Install]
   WantedBy=multi-user.target
   ```

5. Enable it (do **not** start it — there is no release yet):

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable money-mosaic
   ```

6. If `ufw` is active, open port 4300 to the home network (adjust the subnet):

   ```bash
   sudo ufw allow from 192.168.1.0/24 to any port 4300 proto tcp
   ```

7. Create `/etc/cron.d/money-mosaic` for a nightly backup (keeps 30 days):

   ```cron
   15 3 * * * moneymosaic sqlite3 /var/lib/money-mosaic/money-mosaic.sqlite ".backup /var/backups/money-mosaic/nightly-$(date +\%F).sqlite" && find /var/backups/money-mosaic -name 'nightly-*.sqlite' -mtime +30 -delete
   ```

8. Set up a copy of `/var/backups/money-mosaic/` to a second machine or NAS.

9. On the dev machine, check SSH works:

   ```powershell
   ssh you@money-server "echo ok"
   ```

Next: [2 — First deploy](./2-first-deploy.md).
