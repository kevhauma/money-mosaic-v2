# TICKET-UI-02 — Typography/Text primitive

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-2

## User story

As a developer, I want a single Typography component that owns every font-size/weight/color/alignment decision, so the redesign's type scale (Swiss Modernism 2.0) can change in one place instead of in every template's `<span>`/`<p>`/heading tag.

## Description

Text styling today is applied ad hoc: `<span>` (and occasional `<p>`/`<h*>`) tags carry raw Tailwind classes (`text-sm`, `font-semibold`, `text-base-content/70`, alignment utilities) directly in feature templates and even inside some `shared/ui/` primitives. A redesign that wants a new type scale needs one place to change it, per this version's stated goal ("as little change needed throughout the app to apply a new theme/style").

## Current situation (as-is)

- No `mm-text`/typography component exists in `shared/ui/`.
- [stat-card.component.html](../../../src/app/shared/ui/stat-card/stat-card.component.html) and [page-header.component.html](../../../src/app/shared/ui/page-header/page-header.component.html) each hardcode their own text sizing/weight/color inline rather than delegating to a shared primitive.
- Dashboard panel templates (`net-worth-header`, `account-balance-strip`, `category-breakdown-panel`, etc. under `feature-dashboard/components/`) each repeat similar `<span class="text-sm text-base-content/70">`-style label text.

## Desired result (to-be)

- New `shared/ui/typography/typography.component.ts` (selector `mm-text`) with typed string-union `input()`s mirroring the new type scale's actual axes: `variant: 'display' | 'heading' | 'subheading' | 'body' | 'caption' | 'label'` (a closed set tied to the redesign's scale, not raw Tailwind sizes), `weight`, `color` (daisyUI content tokens only — `base-content`, `primary`, etc., never a hex value), `align`.
- An `as` input (`'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4'`, default `'span'`) decouples the visual `variant` from the semantic tag, so a `variant="heading"` block can still render inside a table cell as a `<span>` where a block-level tag would break layout.
- `stat-card`, `page-header`, and the dashboard panel templates flagged by [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit migrate their bare text styling to `<mm-text>` as the pilot consumers.

## Acceptance criteria

- [ ] `mm-text` component with `variant`/`weight`/`color`/`align`/`as` typed inputs, plus `class` passthrough per the existing primitive convention
- [ ] `stat-card`, `page-header`, and the dashboard panel templates named above no longer contain raw Tailwind font-size/weight/color utility classes on text elements — all migrated to `mm-text`
- [ ] Unit tests cover each `variant` rendering its expected class string, and the `as` input rendering the correct tag
- [ ] Verified via the fallow and coding-conventions skills

## Notes

This is the highest-leverage primitive in the set — nearly every other extraction ticket's templates also contain bare text styling. Migrate it to `mm-text` opportunistically wherever a later ticket already touches that file, not only in the two pilot consumers named above.
