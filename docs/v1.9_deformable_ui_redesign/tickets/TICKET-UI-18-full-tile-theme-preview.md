# TICKET-UI-18 — Full-tile live theme preview

- **Area:** Design System
- **Type:** Bug fix / UX polish
- **Traceability:** FR-UI-18

## User story

As a user browsing the theme picker, I want the entire tile for a theme to render in that theme's
own style, so the picker itself looks like a gallery of the actual themes rather than a set of
identical buttons with a small color swatch inside each one.

## Description

`settings-overview.component.html`'s picker tile only applies `[attr.data-theme]` to an *inner*
nested `<span>` (the swatch showing "Aa 123" + primary/secondary/accent pills + a base-300 bar).
The outer `<button>` chrome — its `rounded-box` corner radius, `border-base-300` border color, hover
transition, focus ring — stays rendered under the *page's own ambient theme*, not the theme the
tile represents. The result is 8 tiles that all share the same shape/radius/shadow (whatever the
current active theme happens to use) with only the inner swatch actually varying. This ticket makes
the whole tile — not just the inner swatch — render under the theme it represents, so e.g. the
Cyberpunk tile has cyberpunk's own hard-edged border and neon glow as its own outer shape, the
Neumorphism tile carries its own soft extruded-shadow chrome, and so on.

## Current situation (as-is)

```html
<!-- settings-overview.component.html -->
<button type="button" class="group rounded-box text-left transition ...">
  <span [attr.data-theme]="style.dataTheme[mode]" class="block rounded-box border border-base-300 bg-base-200 p-3">
    <span class="block rounded-box border border-base-300 bg-base-100 p-3">
      <!-- "Aa 123" + primary/secondary/accent pills + base-300 bar -->
    </span>
  </span>
  <!-- label + tagline, still under the page's ambient theme -->
</button>
```

Only the two inner `<span>`s get `data-theme`; the outer `<button>` (shape, border, hover/focus
treatment) and the label/tagline row below the swatch stay on the ambient theme.

## Desired result (to-be)

- `[attr.data-theme]` moves to the outermost tile element, so daisyUI tokens (`--radius-box`,
  `--border`, shadow tokens, `bg-base-*`) and any theme-specific CSS (e.g. cyberpunk's scanline
  glow, neumorphism's extruded shadow, skeuomorphism's stitched border) resolve for the *entire*
  tile, not just the inner color-swatch box.
- The label/tagline text and the "Active"/selected-state ring remain legible against every theme's
  own `base-100`/`base-content` — spot-check contrast across all themes since some (e.g. cyberpunk,
  liquid-glass) have unusual backgrounds.
- Selected-state ring (`ring-2 ring-primary`) still reads clearly against each theme's own
  `--color-primary`, since that also now varies per tile.

## Acceptance criteria

- [x] Every picker tile's outer chrome (border, radius, shadow, background) renders under the
      theme it represents, not the page's ambient theme
- [x] Selected/active state (ring + "Active" badge) remains visually clear on every theme's tile
- [x] Label/tagline text keeps sufficient contrast against every theme's own background
- [x] No layout shift/overflow introduced by any theme's own border/shadow/radius values at the
      tile's fixed grid size
- [x] Verified via `ng lint`/`ng test`/`ng build --configuration development`; a live browser check
      was skipped per explicit instruction for this work session

## Notes

Depends on [TICKET-UI-17](./TICKET-UI-17-single-theme-selector.md) landing first if that ticket's
flat-list restructuring changes the tile template's shape.
