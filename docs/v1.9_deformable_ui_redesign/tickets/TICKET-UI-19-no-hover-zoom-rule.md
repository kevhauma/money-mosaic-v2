# TICKET-UI-19 — Remove intense hover-zoom; add a no-hover-scale design rule

- **Area:** Design System
- **Type:** Bug fix / design-system rule

## User story

As a user, I don't want elements to visibly grow/zoom when my cursor merely passes over them, so
hovering around the app feels calm and predictable rather than jumpy — a hover state should be
allowed to change color, shadow, or opacity, but not scale.

## Description

Feedback flagged an "intense zoom on hover" somewhere in the current theme set. A repo-wide search
of `src/` (the 8 merged theme CSS files in `src/themes/`, `styles.css`, and every `shared/ui`
component) turned up no `hover:scale-*` Tailwind utility or `:hover { transform: scale(...) }` rule
on **main** today — the only scale transforms present are the deformable theme's *press* squish
(`active:scale-x-95 active:scale-y-105`, triggered on click/press, not hover) and the liquid-glass
theme's ambient background aurora animation (`@keyframes mm-aurora`, a decorative full-page
backdrop rotation/scale loop, not element-hover-triggered). Since the reported zoom isn't
reproducible in the currently-merged 8 themes, this is most likely something seen on one of the
unmerged experiment branches (`design/*` — 15 branches exist, only 8 made the final catalog) during
review, or a default/incidental behavior. This ticket is written as an audit-and-prevent ticket
rather than a known-location fix.

## Current situation (as-is)

- No `hover:scale-*` or `:hover` + `transform: scale` found in `src/themes/*.css`, `src/styles.css`,
  or `shared/ui/**` on `main`.
- No design-language doc (v1.5's or v1.9's) states a rule against hover-scale — only the deformable
  theme's `design-language.md` §3 documents *press*-triggered squish as intentional.
- 6 of the 14 originally-explored theme concepts (y2k, vaporwave, HUD/Sci-Fi FUI, Gen Z Chaos, pixel
  art, glassmorphism/Soft UI Evolution) exist only on unmerged `design/*` branches and were never
  audited for this.

## Desired result (to-be)

- Audit every merged theme (`src/themes/*.css`, `styles.css`, `shared/ui/**`) plus, if still
  reachable, the unmerged `design/*` branches for any `:hover` rule that changes `transform: scale`
  (or an equivalent zoom effect) on an element, and remove/replace it with a non-scaling hover
  treatment (color/shadow/opacity change instead).
- Add an explicit rule to the design-system documentation (e.g. a short note in each theme's
  `design-language.md`, or a shared cross-theme rule if one central design-system doc gets created):
  hover states may change color/shadow/opacity/border but must never scale/zoom an element; scale
  transforms are reserved for deliberate *press* feedback only (as the deformable theme's squish
  already does correctly).
- Live browser check across all 8 catalog themes confirms no element visibly grows on hover
  (buttons, cards, table rows, nav items, chart legend items, theme-picker tiles).

## Acceptance criteria

- [x] All 8 merged themes audited; any hover-triggered scale/zoom found is removed
- [x] A no-hover-scale rule is documented in the design system (this version's `design-language.md`
      or a new shared design-system note, whichever already-established pattern fits)
- [ ] Live browser spot-check across all 8 themes confirms no hover-triggered scale on buttons,
      cards, nav items, table rows, and theme-picker tiles — **skipped** per explicit instruction
      for this work session
- [x] Press/active-state scale (deformable's existing squish) is explicitly left untouched — this
      ticket targets hover, not press, feedback

## Notes

If nothing is found on `main` beyond what's already documented here, this ticket's scope reduces to
adding the design-system rule (to prevent regression) plus the live-browser confirmation pass.

## Implementation notes (as built)

The audit found the actual bug, contrary to this ticket's "not reproducible" hypothesis: the
default `deformable`/`deformable-dark` theme blocks in `styles.css` set `--mm-squish-hover: 1.05`,
consumed by `.mm-squish:hover { scale: var(--mm-squish-hover, none); }` — a real 5% hover-triggered
grow on every `mm-button` (all variants except `link`) and `mm-paper`'s `link` variant, in the
default theme only. None of the other 7 themes ever set `--mm-squish-hover`, so they were
unaffected. Fix: removed the `.mm-squish:hover` rule entirely (hover no longer scales anything,
full stop) and removed the now-unused `--mm-squish-hover` declarations from both `deformable`
blocks, with a comment recorded directly above `.mm-squish` warning against reintroducing one. The
design rule is documented both there and in `design-language.md`'s new "Post-launch updates"
section.
