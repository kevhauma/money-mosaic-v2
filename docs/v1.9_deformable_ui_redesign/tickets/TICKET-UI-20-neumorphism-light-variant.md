# TICKET-UI-20 — Neumorphism: use its light-mode clay variant, not the dark port

- **Area:** Design System
- **Type:** Bug fix

## User story

As a user picking the Neumorphism ("Clay") theme, I want it to look like classic light-clay
neumorphism — soft extruded/carved pale surfaces — not a dark theme, since neumorphism's whole
visual signature (soft light source, pale surfaces reading as pressed-into or popped-out-of a flat
plane) reads correctly only in a light palette; the current dark port loses that signature.

## Description

The `design/neumorphism` branch (`0d04200`) restyled `styles.css`'s **light** `moneymosaic` theme
block into the neumorphism look (476 lines changed in `styles.css`, `color-scheme: light` on the
`moneymosaic` block) — the branch's actual neumorphism design is the light one. When the 8-theme
catalog was unified onto `main`, `src/themes/neumorphism.css` was authored as a **dark-only** clay
variant (`neumorphism: { dark: 'neumorphism' }` in `theme-styles.ts`, `color-scheme: dark` — see
its header comment "dark-mode theme style (ported from the design/neumorphism branch, dark clay
variant)"). That dark variant was a new port, not a direct carry-over of the branch's own light
theme block — the branch's original light neumorphism styling was left behind.

## Current situation (as-is)

- `theme-styles.ts`: `{ id: 'neumorphism', label: 'Clay', dataTheme: { dark: 'neumorphism' } }` —
  no `light` key, so it's unreachable in light mode.
- `src/themes/neumorphism.css`: dark clay variant, `color-scheme: dark`.
- `design/neumorphism` branch (`0d04200`, still reachable): its actual neumorphism restyle lives in
  `styles.css`'s **light** `moneymosaic` block (`color-scheme: light`), never ported to `main`.

## Desired result (to-be)

- Port the light `moneymosaic` theme block from `design/neumorphism` (`0d04200`) into a new light
  neumorphism theme in `src/themes/neumorphism.css` (or a light-specific block alongside the
  existing dark one).
- `theme-styles.ts`'s `neumorphism` entry gains a `light` key pointing at the ported theme, making
  "Clay" selectable/correct in light mode.
- Decide (and document the decision in this ticket's Implementation notes once built) whether the
  existing dark clay variant is kept as a second theme, demoted, or dropped — the user's feedback
  ("it's a light mode theme, take the light mode theme from that branch") suggests light is the
  correct/primary version; keeping both light and dark as separate catalog entries is a reasonable
  option now that [TICKET-UI-17](./TICKET-UI-17-single-theme-selector.md) flattens every theme
  into independent single-mode entries anyway.
- Any component-level neumorphism adjustments from the branch (`shared/ui/paper`,
  `shared/ui/table`, `shared/ui/empty-state`) that were written against the light block get
  re-checked, since the current `main` port adapted them for the dark block instead.

## Acceptance criteria

- [x] A light neumorphism theme exists in `src/themes/neumorphism.css`, sourced from
      `design/neumorphism`'s light `moneymosaic` block
- [x] `theme-styles.ts`'s `neumorphism` entry is selectable in light mode
- [x] Decision on keeping/dropping the current dark clay variant is made and recorded
- [x] `shared/ui/paper`/`table`/`empty-state` neumorphism styling is verified correct against the
      light variant (not just carried over unchanged from the dark port)
- [x] Verified via `ng lint`/`ng test`/`ng build --configuration development`; a live browser check
      was skipped per explicit instruction for this work session

## Notes

Source commit to port from: `0d04200` (`design/neumorphism`, `src/styles.css`'s light
`moneymosaic` block) — still reachable on its branch.

## Implementation notes (as built)

Decision: kept both. `neumorphism` (id, label "Clay") now renders the branch's light `moneymosaic`
block (its true signature — the pale grey-lavender slab, top-left bright lamp optics). The
pre-existing dark clay port survives as a second, independent catalog entry, `neumorphism-dark`
("Clay Dark") — its own daisyUI theme block, its own entry in `styles.css`'s `dark` custom-variant
list, its own `chart-theme.ts` categorical-palette/animation key. The large body of mechanical
scoped rules (buttons, fields, tables, nav, tabs, etc.) was generalized to target
`:is([data-theme='neumorphism'], [data-theme='neumorphism-dark'])` together, since those rules
reference theme-scoped custom properties (`--mm-raised`, `--mm-hi`, `--color-*`) rather than
literal values — one rule set now correctly drives both variants' shared "clay" mechanics.
