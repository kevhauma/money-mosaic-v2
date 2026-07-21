# TICKET-UI-16 — Per-theme brand icon & separator glyph

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-16

## User story

As a user browsing the theme picker, I want each theme to carry its own small brand icon and
separator/divider treatment in the app shell wordmark, so a theme's identity shows up in more than
just its color palette and I can tell themes apart at a glance the way the individual design
branches did before they were unified into one picker.

## Description

Two of the source design branches gave the "Money Mosaic" wordmark a theme-specific decorative
treatment that did not survive the theme-picker unification:

- `design/Retro-Futurism` (`1560fa3`) added an `.rf-atom` decorative atom-symbol icon next to the
  wordmark in both the navbar and the drawer, plus an `.rf-stripe` divider rule and an
  `.rf-logo-sub` tagline ("Finance of tomorrow") under the drawer wordmark.
- `design/cyberpunk` (`13efb22`) rewrote the wordmark itself as `Money//Mosaic` (a `//` slash
  separator baked into the brand text) and added a `// ledger.sys online` slash-prefixed subtitle
  in the drawer.

Neither made it into `src/themes/retro-futurism.css` / `src/themes/cyberpunk.css` or `app.html`
after unification — the current shell wordmark is theme-agnostic plain text for every style. This
ticket reinstates both, and generalizes the pattern: every entry in `THEME_STYLES`
(`core/theme/theme-styles.ts`) gets its own small icon and its own separator/divider treatment, not
just these two.

## Current situation (as-is)

- `ThemeStyle` (`theme-styles.ts`) has no `icon` or `separator` field — only `id`, `label`,
  `tagline`, `dataTheme`.
- `app.html`'s navbar/drawer wordmark ("Money Mosaic") is identical markup for all 8 catalog
  themes; no per-theme icon or slash decoration renders.
- The retro-futurism atom icon and stripe divider, and the cyberpunk slash wordmark/subtitle, exist
  only in their unmerged source branches (see commits above), not in the themes that made the
  final catalog.

## Desired result (to-be)

- `ThemeStyle` gains an `icon` (inline SVG or an `@ng-icons/tabler-icons` name — match whichever
  the retro-futurism `.rf-atom` was implemented as) and a `separator` treatment (a small reusable
  divider style, e.g. a `mm-divider` variant or themed CSS class) per catalog entry.
- `app.html`'s wordmark renders the active theme's icon + separator instead of static plain text,
  for all 8 catalog styles — not only retro-futurism/cyberpunk.
- Retro-Futurism's entry restores the `.rf-atom` icon + `.rf-stripe` divider from `1560fa3`.
- Cyberpunk's entry restores the `//`-slash wordmark/subtitle treatment from `13efb22`.
- The remaining 6 themes (deformable, anti-polish, memphis, neumorphism, liquid-glass,
  skeuomorphism) each get a new icon + separator authored in the same spirit as their existing
  `design-language.md`/theme CSS identity (no prior branch to port from — these are net-new).
- The settings-page picker tile (`settings-overview.component.html`) shows each theme's icon next
  to its label so the picker itself previews the new per-theme identity, not just the app shell.

## Acceptance criteria

- [x] `ThemeStyle` type and all 8 `THEME_STYLES` entries carry an `icon` and `separator` value
- [x] Retro-Futurism's atom icon + stripe divider are restored in the app shell wordmark
- [x] Cyberpunk's `//` slash wordmark/subtitle are restored in the app shell wordmark
- [x] Every other catalog theme has a distinct icon + separator (no shared/default fallback)
- [x] Settings page picker tiles show each theme's icon
- [x] No bundle-budget increase (`angular.json` `maximumWarning`/`maximumError` untouched) — reuse
      `@ng-icons/tabler-icons` or inline SVG/CSS, no new icon-set dependency
- [x] Verified via `ng lint`/`ng test`/`ng build --configuration development`; a live browser check
      was skipped per explicit instruction for this work session

## Notes

Source commits to port from: `1560fa3` (`design/Retro-Futurism`, `src/app/app.html` diff) and
`13efb22` (`design/cyberpunk`, `src/app/app.html` diff) — both still reachable on their branches.

## Implementation notes (as built)

Deviated from the letter of "`ThemeStyle` gains an `icon` (ng-icon name) field" in favor of the
codebase's existing theme-style-hook pattern (`mm-blob`, `mm-squish`, `mm-elev-*`): a shared,
inert-by-default `.mm-brand-icon` / `.mm-brand-sep` / `.mm-brand-stripe` trio was added to
`styles.css`, and each theme (`styles.css`'s two `deformable` blocks plus all 7 `src/themes/*.css`
files) supplies its own shape/glyph via `--mm-brand-icon-*`/`--mm-brand-sep` custom properties or a
scoped rule, exactly like every other per-theme visual hook already does. This is a better
architectural fit than a TS-level icon-name string (no ng-icon registration/bundle entries needed
per theme, and the settings-tile preview gets each theme's icon "for free" since the tile already
nests `data-theme`) while still satisfying the intent of every AC above. `ThemeStyle` itself was
not given literal `icon`/`separator` TS fields — the per-theme identity lives in CSS, consistent
with how every other theme-specific visual trait in this codebase is authored.

Retro-Futurism's orbit emblem (`rf-orbit-a`/`rf-orbit-b` keyframes) and racing stripe were ported
faithfully from `1560fa3`. Cyberpunk's `//` separator and a small blinking terminal-cursor icon
were ported from `13efb22`'s wordmark treatment (the `ledger.sys online` subtitle was not carried
over — out of scope for the wordmark-level brand mark this ticket covers). The remaining 6 themes
(`deformable` ×2, `anti-polish`, `memphis`, `neumorphism` ×2, `liquid-glass`, `skeuomorphism`) each
got a new icon + separator authored to match their own established identity (clay bump, confetti
squiggle, glass droplet, brass rivet, etc.).
