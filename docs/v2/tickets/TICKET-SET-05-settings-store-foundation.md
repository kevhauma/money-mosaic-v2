# TICKET-SET-05 — Settings store foundation (`appSettings` table)

- **Area:** App Settings
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — app settings); no existing FR-* covers this; supporting infrastructure for TICKET-SET-02/03/04 and TICKET-PRIV-01

## User story

As a developer picking up any one of the primary-color, currency, locale, or privacy-mode settings, I want the shared settings table/repository/store to already exist, so I can build and ship my ticket without first depending on whichever of the other three happened to land before it.

## Description

Extracts the shared settings-storage foundation into its own ticket. Previously, TICKET-SET-02/03/04 and TICKET-PRIV-01 each assumed this foundation already existed (originally from a now-dropped TICKET-SET-01, then briefly re-described as "whichever of us builds it first"), which made those four tickets depend on each other by accident. This ticket removes that coupling: it builds the empty `appSettings` table, repository, and store — with no setting fields of its own yet — so SET-02/03/04/PRIV-01 can each add their own field and ship fully independently, in any order, all depending only on this one ticket.

## Current situation (as-is)

- **No `appSettings` Dexie table, repository, or store exists anywhere in the codebase.** A `/settings` route exists (`feature-settings/`), but it only hosts a theme picker driven by `ThemeService` ([theme.service.ts](../../../src/app/core/theme/theme.service.ts)), which is deliberately `localStorage`-only per its own code comment — not the Dexie-backed table this ticket introduces. That system was built separately under the v1.5 redesign / "theme picker unification" work, not this version, and is out of scope here.
- The Dexie schema currently runs through `.version(11)` ([app-db.ts](../../../src/app/core/data-access/app-db.ts)) — this ticket's table is the next additive version.
- The pattern to mirror is the existing singleton-row settings table: [category-comparison-settings.repository.ts](../../../src/app/core/data-access/category-comparison-settings.repository.ts) (a Dexie table keyed `'id'`, a repository with a `get()` falling back to a `DEFAULT_*` constant, plus setters) and its store, [category-comparison-settings.store.ts](../../../src/app/feature-dashboard/category-comparison-settings.store.ts), hydrated once at bootstrap in [app.config.ts](../../../src/app/app.config.ts).

## Desired result (to-be)

- A new `appSettings` singleton-row Dexie table (schema **`.version(12)`**, additive, no `.upgrade()` needed — a brand-new empty table, same as `dashboardLayoutSettings` was at its introduction) storing just `{ id: 1 }` for now. `AppSettings` type + `DEFAULT_APP_SETTINGS` (`{ id: 1 }`) added alongside the other settings types in `core/data-access`.
- `AppSettingsRepository` (`get()`, returning `DEFAULT_APP_SETTINGS` when no row exists yet) and `AppSettingsStore` (hydrated at bootstrap in `app.config.ts`, alongside the existing store list), following the `CategoryComparisonSettingsRepository`/`Store` shape exactly.
- No new field, no new Settings-page section, and no new nav entry are added by this ticket — it is pure storage plumbing. SET-02 (`primaryColor`), SET-03 (`currency`), SET-04 (`locale`), and PRIV-01 (`privacyMode`) each add their own additive optional field on top of this table later, without a further Dexie version bump, the same pattern already used elsewhere (e.g. `Category.smoothAnnually`).
- Components/stores never touch `appDb.appSettings` directly — always through `AppSettingsRepository`/`AppSettingsStore`.

## Acceptance criteria

- [ ] `AppSettings` type + `DEFAULT_APP_SETTINGS` (`{ id: 1 }`) defined in `core/data-access`.
- [ ] `appDb` gains the `appSettings: 'id'` table via a new additive `.version(12).stores(...)` block; all previous version blocks are untouched.
- [ ] `AppSettingsRepository` (`get()`) and `AppSettingsStore` added, following the `CategoryComparisonSettingsRepository`/`Store` shape; hydrated in `app.config.ts`'s bootstrap sequence.
- [ ] Components/stores never touch `appDb.appSettings` directly — always through the repository.
- [ ] Unit tests cover: `AppSettingsRepository.get()` falling back to `DEFAULT_APP_SETTINGS` when no row exists yet; `AppSettingsStore` hydrating through the repository at construction.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: confirm the app still boots and the existing `/settings` page (theme picker) renders unchanged — this ticket has no visible UI of its own; each of SET-02/SET-03/SET-04/PRIV-01 is responsible for verifying its own new section once built on top of this table.

## Notes

- **Why this ticket exists:** SET-02/03/04 and PRIV-01 previously each assumed this foundation was already in place (via a dropped TICKET-SET-01), and briefly, absent that, each was written as "whichever of us lands first builds the table." That made four supposedly-independent tickets implicitly dependent on each other's build order. Splitting the foundation out here means all four depend only on this ticket and can genuinely be built in any order relative to one another.
- Mirrors the storage half of what the dropped TICKET-SET-01 would have built, deliberately **without** its theme functionality — theme selection is handled separately and already shipped via `ThemeService`, which stays `localStorage`-only by design (a per-browser appearance preference, not portable data); this ticket's `appSettings` table is for settings that genuinely are portable/exportable data (currency, locale, privacy default, etc.).
- Build this ticket first among the Settings track. SET-02/SET-03/SET-04/PRIV-01 each need only a small edit once this lands: point their as-is section at this ticket instead of re-describing table creation, and drop the "whichever lands first builds the table" language.
