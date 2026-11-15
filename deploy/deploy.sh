#!/usr/bin/env bash
# Build step of a deploy, run between your `git pull` and `sudo systemctl restart money-mosaic-server`:
# install, build, back up the database. See docs/server/deploy/README.md.
set -euo pipefail

cd "$(dirname "$0")/.."
DB=server/data/money-mosaic.sqlite # the server's default DB_FILE, gitignored

# Dev dependencies too: the server runs on tsx, and the build needs the Angular CLI.
npm ci
npm --prefix server ci
npm run build -- --configuration production

# The server migrates the database when you restart it, so back it up now. SQLite's own backup
# (not cp), because the running server holds the file open in WAL mode.
if [ -f "$DB" ]; then
  BACKUP=server/data/backups/pre-$(git rev-parse --short HEAD).sqlite
  mkdir -p server/data/backups
  (cd server && node -e "require('better-sqlite3')(process.argv[1]).backup(process.argv[2]).catch((e) => { console.error(e); process.exit(1); })" "../$DB" "../$BACKUP")
  echo "Database backup: $BACKUP"
fi
echo "Built. Now: sudo systemctl restart money-mosaic-server"
