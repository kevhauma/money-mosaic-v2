# TICKET-SET-01 — Settings page shell + dark/light mode

- **Area:** App Settings
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — app settings for dark/light mode); no existing FR-* covers app-wide theming

## User story

As a user, I want to switch the app between light mode, dark mode, and my system preference, so it's comfortable to use regardless of the time of day or my OS setting.

## Description

This ticket does two things at once: it introduces the app's first global Settings page (route, store, nav entry — the shell every later Settings ticket in this version builds on), and it uses that shell to ship the first real setting, a dark/light/system theme switch, since the app currently has no theming mechanism at all.

## Current situation (as-is)

- No settings page, route, or global settings store exists. `app.routes.ts` only declares `dashboard`, `accounts`, `transactions`, `import`, `categories`, `learning`. The only "settings" today are per-panel, feature-scoped Dexie tables (`transferSettings`, `categoryComparisonSettings`, `dashboardLayoutSettings`) with no shared parent page.
- [styles.css](../../../src/styles.css) is minimal — `@import 'tailwindcss'; @plugin 'daisyui';` — with no theme list configured and no `data-theme` attribute set anywhere. daisyUI 5's theme system (multiple named themes, activated via `data-theme` on an ancestor element, configurable via `@plugin 'daisyui' { themes: ... }` in CSS) is entirely unused today.
- [app.html](../../../src/app/app.html) renders a fixed daisyUI `drawer` shell with a sidebar `<ul class="menu-vertical">` listing Dashboard/Accounts/Transactions/Categories/Learning/Import — no Settings entry.
- The existing singleton-settings pattern to mirror is [category-comparison-settings.repository.ts](../../../src/app/core/data-access/category-comparison-settings.repository.ts) + its store: a Dexie table keyed `'id'`, a repository with `get()`/setters falling back to a `DEFAULT_*` constant, and a signal store hydrated once at bootstrap in [app.config.ts](../../../src/app/app.config.ts).

## Desired result (to-be)

- A new `appSettings` singleton-row Dexie table (schema **`.version(10)`**, additive, no `.upgrade()` needed — a brand-new empty table, same as `dashboardLayoutSettings` at v9) stores `{ id: 1, theme: 'light' | 'dark' | 'system' }`. `AppSettings` type + `DEFAULT_APP_SETTINGS` (`theme: 'system'`) added alongside the other settings types in `core/data-access`.
- `AppSettingsRepository` (`get()`/`setTheme()`) and `AppSettingsStore` (hydrated at bootstrap in `app.config.ts`, alongside the existing store list) follow the `CategoryComparisonSettingsRepository`/`Store` shape exactly — this is the shared settings table every later SET/PRIV ticket in this version adds fields to, not a new table each.
- `styles.css` configures two named daisyUI themes (`light` as default, `dark`) via `@plugin 'daisyui' { themes: light --default, dark --prefersdark; }`, so daisyUI components (`btn`, `card`, `alert`, etc.) already used throughout the app pick up correct dark-mode colors with zero per-component changes, since the app already exclusively uses daisyUI semantic tokens (`bg-base-100`, `text-primary`, etc.) per the coding-conventions styling rules rather than hardcoded hex colors.
- An `effect()` (in `AppSettingsStore` or a small root-level directive) sets `data-theme` on `<html>`: `'light'`/`'dark'` map directly, `'system'` resolves via `window.matchMedia('(prefers-color-scheme: dark)')` and re-resolves live if the OS preference changes while `'system'` is selected.
- A new `/settings` route (`feature-settings/`, own `settings.routes.ts`/`index.ts`/`components/`, lazy-loaded like every other feature) renders a Settings page with a "Theme" control (light/dark/system, e.g. a `mm-select` or segmented button group) as its first section — later tickets (SET-02/03/04, PRIV-01) each add their own section to this same page rather than creating new routes.
- A new "Settings" entry is added to the `app.html` sidebar nav (gear icon), following the existing `routerLink`/`routerLinkActive` pattern used by every other nav item.

## Acceptance criteria

- [ ] `AppSettings` type + `DEFAULT_APP_SETTINGS` (`{ id: 1, theme: 'system' }`) defined in `core/data-access`.
- [ ] `appDb` gains the `appSettings: 'id'` table via a new additive `.version(10).stores(...)` block; all previous version blocks are untouched.
- [ ] `AppSettingsRepository` and `AppSettingsStore` added, following the `CategoryComparisonSettingsRepository`/`Store` shape; hydrated in `app.config.ts`'s bootstrap sequence.
- [ ] Components/stores never touch `appDb.appSettings` directly — always through the repository.
- [ ] `styles.css` declares `light` (default) and `dark` daisyUI themes.
- [ ] Selecting Light, Dark, or System on the Settings page updates `data-theme` on `<html>` immediately and persists through the store/repository, surviving a reload.
- [ ] When `theme` is `'system'`, `data-theme` tracks `prefers-color-scheme` live (toggling OS/browser dark mode while the app is open updates the UI without a reload).
- [ ] `/settings` route is lazy-loaded via `loadChildren`/`loadComponent` in `app.routes.ts`, matching every other feature's pattern.
- [ ] A "Settings" nav entry appears in the `app.html` sidebar, using the existing `routerLink`/`routerLinkActive`/`ng-icon` pattern.
- [ ] Existing daisyUI-styled screens (spot-check Dashboard, Accounts, a form) render correctly in both Light and Dark, with no hardcoded-hex-color regressions introduced by this ticket.
- [ ] Unit tests cover: `AppSettingsStore`'s theme setter persists through the repository; the `data-theme`-resolution logic for each of `'light'`/`'dark'`/`'system'`, including the system branch reacting to a `matchMedia` change event.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: switch between Light/Dark/System on the Settings page, confirm the whole app (not just the Settings page) re-themes immediately; reload and confirm the choice persisted; with System selected, toggle the OS/browser color-scheme emulation and confirm the app follows it live.

## Notes

- This ticket is the dependency root for TICKET-SET-02 (primary color), TICKET-SET-03 (currency), TICKET-SET-04 (locale), and TICKET-PRIV-01 (privacy mode) — all four add a field to this same `appSettings` table and a section to this same `/settings` page rather than standing up their own table/route. Build this one first.
- Only two themes (light/dark) are introduced now, deliberately — daisyUI supports many named themes, but "system" only has a binary OS signal to map to. A future ticket could add more named themes once there's a UI concept (e.g. accent presets) beyond light/dark to select between.
- This is the first ticket to configure daisyUI's theme system at all; double-check any component that might have accidentally used a hardcoded hex color instead of a semantic token while doing the dark-mode spot-check, and fix it here rather than filing a separate cleanup ticket, since it's cheap to catch while both themes are already being compared side by side.
