# TICKET-UI-21 — Default (Deformable) theme polish: safer shadows/borders, wider blob use, no pill radius on fields/nav

- **Area:** Design System
- **Type:** Refinement
- **Traceability:** FR-UI-21

## User story

As a user on the default theme, I want form fields and navigation to have a moderate, legible
corner radius instead of a full pill/circle, calmer shadows/borders that don't read as
over-designed, and the signature blob shape used a bit more broadly, so the default experience
feels considered and "safe" rather than like one extreme experiment among the fourteen tried.

## Description

Three related refinements to the default `deformable`/`deformable-dark` theme
([design-language.md](../design-language.md)):

1. **No 50%/pill radius on fields and navigation.** `styles.css`'s `--radius-field: 9999px` (both
   light and dark theme blocks) makes every input/select/button a full pill, and the nav
   active-item pill (`app.ts`'s `navItemClass`, `rounded-full`) is a full circle/pill shape too.
   Both should move to a moderate, still-soft-but-not-maximal radius consistent with `--radius-box`
   (`1.5rem`) and `--radius-selector` (`1.75rem`)'s existing "soft, uniform, not extreme" baseline.
2. **Safer shadows/borders.** Review `shared/utils/deform.ts`'s `DEFORM_GLOW_CLASSES` (currently a
   fairly saturated, opaque primary-tinted blurred shadow) for a calmer, lower-opacity/more neutral
   default, and consider reintroducing a subtle border on surfaces that currently rely on shadow
   alone for definition (per design-language.md §4, `flat` already uses
   `border border-base-300`; `raised`/`floating` currently drop the border entirely in favor of
   glow — evaluate whether they should keep a faint border too).
3. **Wider `mm-blob` use.** Per [v1.9_deformable_ui_redesign/overview.md](../overview.md)'s
   "Considered, not done" section, `mm-blob` was deliberately restricted to one hero surface (the
   net-worth header) for restraint. Extend it to more surfaces — the overview itself names the
   reasonable candidates: empty states and other floating/hero cards — while keeping it off any
   interactive element or anything with legible content directly on its edge, per
   design-language.md §2's existing restriction.

## Current situation (as-is)

- `styles.css`: `--radius-field: 9999px` in both `deformable`/`deformable-dark` blocks (lines ~174,
  ~238).
- `app.ts`: nav active-item class includes literal `rounded-full`.
- `shared/utils/deform.ts`: `DEFORM_GLOW_CLASSES` per design-language.md §3/§4 — primary-tinted,
  fairly saturated blurred shadow, no border pairing on `raised`/`floating`.
- `mm-blob` used only on `net-worth-header.component.html`'s backdrop, per design-language.md §2 and
  the v1.9 overview's explicit restraint call.

## Desired result (to-be)

- `--radius-field` reduced from `9999px` to a moderate value in line with the theme's other radius
  tokens (proposal: somewhere in the `0.75rem`–`1rem` range — soft, not a full pill); applied to
  both light and dark blocks.
- Nav active-item pill's `rounded-full` replaced with the same moderate radius token/utility, so it
  reads as a soft rounded rect rather than a stadium/pill shape.
- `DEFORM_GLOW_CLASSES` opacity/spread reviewed and tuned down to a calmer default; `raised`/
  `floating` elevations gain a faint paired border (consistent with `flat`'s existing
  `border-base-300`) rather than relying on shadow alone.
- `mm-blob` added to at least one additional surface beyond the net-worth header — empty states
  (`shared/ui/empty-state`) are the named candidate from the overview's own "considered, not done"
  list — kept decorative-only, never on interactive elements or under legible edge content, per the
  existing §2 rule.

## Acceptance criteria

- [x] `--radius-field` is no longer `9999px` in either `deformable` or `deformable-dark`
- [x] Nav active-item no longer uses `rounded-full`; uses the same moderated radius as fields
- [x] `DEFORM_GLOW_CLASSES` shadow reads calmer (lower opacity/spread) than before, spot-checked
      against a `raised`/`floating` `mm-paper` in both light and dark
- [x] `raised`/`floating` `mm-paper` elevations gain a subtle paired border in light mode (dark mode
      keeps its existing step-based no-shadow treatment per design-language.md §4)
- [x] `mm-blob` appears on at least the empty-state component in addition to the net-worth header,
      still restricted to decorative/non-interactive use per design-language.md §2
- [x] No regression to existing bundle budget (`angular.json` untouched)
- [x] Verified via `ng lint`/`ng test`/`ng build --configuration development`; a live browser check
      was skipped per explicit instruction for this work session

## Notes

This only touches the **default** (`deformable`/`deformable-dark`) theme — the other 7 catalog
themes each have their own already-deliberate radius/shadow choices per their own
`design-language.md`/theme CSS and are out of scope here.

## Implementation notes (as built)

The border-pairing AC turned out to already be true: `mm-paper`'s `PaperComponent` applies
`border border-${borderColor}` unconditionally to every elevation tier, not just `flat` (its own
doc comment already says so) — no code change was needed there, only the shadow-opacity and
radius/nav changes were net-new. `--radius-field` moved from `9999px` to `0.875rem` in both blocks;
the nav active-item's Tailwind class moved from `rounded-full` to `rounded-field` (ties it to the
same token, so any future default-theme radius change stays in sync automatically). Glow shadows:
`--mm-glow-shadow`/`--mm-elev-raised-shadow` alpha dropped 0.35 → 0.18, `--mm-elev-floating-shadow`
0.4 → 0.22 (light mode only — dark mode already used surface-stepping instead of shadow, unaffected).
`mm-blob` extended to `shared/ui/empty-state` at low opacity, matching the net-worth header's
existing treatment.
