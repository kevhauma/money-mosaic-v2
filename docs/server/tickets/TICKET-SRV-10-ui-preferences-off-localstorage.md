# TICKET-SRV-10 — The last `localStorage` keys move to the server

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Refactor
- **Traceability:** new; follows TICKET-SRV-08. Reverses the "per-browser by design" calls in TICKET-SET-05 (theme), TICKET-PUB-01 (landing-page flag) and TICKET-PUB-04 (backup-reminder dismissal)

## User story

As someone who uses Money Mosaic from more than one browser, I want my theme and my "I've seen this" choices to belong to my account, so the app looks and behaves the same wherever I sign in — and so the browser holds nothing but my session.

## Description

TICKET-SRV-08 retired the browser database, leaving three `localStorage` keys behind, each with a documented argument for why it should stay per-browser. Taken together those arguments made the app two systems: one SQLite file that is backed up and exported, and three flags in whichever browser you happened to use. This ticket treats the app as an ordinary frontend–backend project: every persisted value lives on the server, scoped to the signed-in account.

## Current situation (as-is)

- `ThemeService` read and wrote `mm-theme-style` (plus three legacy keys it migrated and cleared).
- `VisitedService` read and wrote `mm-has-visited`, per browser.
- `BackupReminderService` read and wrote `mm-backup-reminder-dismissed:<userId>`, per browser and per user.
- `AppSettings`' own docs said the theme "stays `localStorage`-only by design".

## Desired result (to-be)

- A new **`uiPreferences` singleton table** (one row per user, keyed on `userId`): `themeStyle` (CHECK-pinned to `THEME_STYLE_IDS`), `hasVisited`, `backupReminderDismissed`, all nullable on the `appSettings` tri-state convention. Served by the existing `/api/settings/<name>` factory as `/api/settings/uiPreferences`.
- Kept apart from `appSettings` on purpose: that row is the user's settings-page preferences; these are state the interface keeps about itself.
- `UiPreferencesRepository` in `core/data-access/`; `UiPreferencesService` in `core/ui-preferences/` holds the state, registers with `StoreResetService`, and never rejects.
- The app initializer awaits it right after the session — the theme is on `<html>` before first paint, and the landing-page guard still reads `hasVisited` synchronously. `ThemeService` is constructed there, so signed-out screens get the default theme too.
- `ThemeService`, `VisitedService` and `BackupReminderService` keep their public shape (`select` now returns its promise; the reminder no longer takes a user id — the cookie is the key).
- `DATA_SCHEMA_VERSION` goes to 17: exports now carry `uiPreferences`; a v16 backup still imports and reads as an unwritten row.
- No `localStorage`, `sessionStorage` or IndexedDB call left in `src/`.

## Acceptance criteria

- [x] Migration `0002_ui_preferences.sql` creates `uiPreferences` with its CHECK constraint, and applies on a fresh database.
- [x] `GET /api/settings/uiPreferences` answers an unwritten row with `DEFAULT_UI_PREFERENCES`; `PATCH` merges per field and is per-user (covered by `settings.spec.ts`'s per-table loop).
- [x] An unknown `themeStyle` is a 400, not a constraint 500.
- [x] The table is covered by the every-table isolation and cascade specs, and the repository by `api.spec.ts`'s endpoint map.
- [x] Picking a theme persists it to the account; a stored id the catalogue no longer has reads as the default.
- [x] Signing out resets theme and flags to defaults; signing in re-reads the new account's; a read in flight for the previous account cannot land on the next one, and a write made during a read survives it.
- [x] The landing page shows until the account first reaches the dashboard; the guard writes the flag once, not on every visit.
- [x] The backup reminder's dismissal is saved to the account and survives a refused save without throwing.
- [x] Bootstrap still runs exactly one initializer and hydrates no store.
- [x] Browser check (2026-10-06, fresh dev DB): signed-out `/login` renders the default theme with no preferences request; the landing page shows once, then `/` redirects after a full reload and the flag is written once across visits; a picked theme survives a reload and lands before first paint (preferences at 73 ms, FCP 268 ms); the backup-reminder dismissal survives a reload; signing out resets `/login` to the default theme and signing back in restores the account's theme. `localStorage`/`sessionStorage` stayed empty throughout.

## Notes

- **Behaviour changes a user can see:** the login screen is always the default theme (the theme is an account's, and nobody is signed in there); everyone sees their old theme reset to the default once, since the `localStorage` value is not migrated; and anyone who had dismissed the backup reminder or seen the landing page sees each once more. Migrating the old keys was judged not worth a one-shot upload path for three cosmetic values.
- The initial bundle grew by ~7.4 kB raw / ~1.9 kB gzipped: `ApiClient` is on the eager path now, because a repository is read before render. The initial-bundle warning budget was already exceeded before this change (773 kB → 781 kB); budgets untouched.
- The local dev database at `server/data/money-mosaic.sqlite` predated the current `0000` migration (its recorded hash did not match and it never received `0001`), so `npm run server:migrate` failed against it on `0000` — unrelated to this migration. It held only the seeded admin and was deleted and recreated for the browser check.
- No Roadmap or Changelog entry, per this area's standing rule.
