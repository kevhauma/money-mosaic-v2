# TICKET-UI-15 — Flex primitive

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-15

## User story

As a developer working with an editor plugin that visually hides Tailwind classes to cut template clutter, I want a shared Flex component wrapping the raw `flex` utility, so a flex container reads as `<mm-flex>` at a glance instead of collapsing into an indistinguishable `<div>` once its classes are hidden.

## Description

[TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit counted 91 raw `flex` occurrences across 35 templates. `overview.md`'s original Flex/Grid scope decision left this pattern inline, reasoning that a generic wrapper around a couple of utility classes adds indirection with no reuse value. That reasoning only weighed code reuse. It missed a second, direct motivation: with a class-hiding editor plugin enabled, every `<div class="flex items-center gap-2">` renders identically to a plain `<div>`, so layout structure becomes unreadable without disabling the plugin. A named `mm-flex` selector stays visible regardless of hidden classes and restores that signal.

## Current situation (as-is)

- No `mm-flex` component exists in `shared/ui/`; the `flex` utility (plus `flex-col`, `items-*`, `justify-*`, `gap-*` modifiers) is applied directly wherever a flex container is needed — see the file list in [audit-results.md](../audit-results.md#pattern--ticket-mapping) (91 occurrences, 35 files, e.g. [page-header.component.html](../../../src/app/shared/ui/page-header/page-header.component.html), [account-form.component.html](../../../src/app/feature-accounts/components/account-form/account-form.component.html)).
- `direction`/`align`/`justify`/`gap`/`wrap` are all expressed as raw, differently-ordered Tailwind utility strings per call site, with no shared vocabulary.

## Desired result (to-be)

- New `shared/ui/flex/flex.component.ts` (selector `mm-flex`) with typed string-union inputs covering the modifiers actually in use today: `direction: 'row' | 'col'` (default `'row'`), `align: 'start' | 'center' | 'end' | 'stretch' | 'baseline'` (optional), `justify: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'` (optional), `gap: '0' | '1' | '2' | '3' | '4' | '6'` (optional, matching the gap scale already seen in templates), `wrap: boolean` (optional). Each maps to the corresponding Tailwind class; unset inputs emit no class (no forced default spacing).
- `class = input('', { alias: 'class' })` passthrough per the existing primitive convention, so a call site can still add one-off utilities (e.g. `mt-2`) alongside the primitive.
- Content-projects its children (`<ng-content />`) — it only wraps the container div, not the items inside it.
- Existing raw `flex` usages identified by TICKET-UI-01's audit migrate to `<mm-flex>` where the migration is mechanical (a direct one-to-one swap of `direction`/`align`/`justify`/`gap`/`wrap` modifiers); call sites combining `flex` with unrelated layout classes beyond that modifier set are left as a follow-up rather than forced into the primitive's input surface.

## Acceptance criteria

- [ ] `mm-flex` component with `direction`, `align`, `justify`, `gap`, `wrap` typed inputs and `class` passthrough, own component folder with a colocated `.spec.ts`
- [ ] Unit tests cover: default render (no inputs → bare `flex` class, row direction), each modifier input producing its expected class, `class` passthrough composing with the generated classes
- [ ] Existing mechanical `flex` usages (per TICKET-UI-01's audit list) migrated to `<mm-flex>`
- [ ] Verified via the fallow skill and coding-conventions skill

## Notes

- Grid stays out of scope — see `overview.md`'s Flex/Grid scope decision. Only Flex reverses; the Bento Box Grid ([TICKET-UI-03](./TICKET-UI-03-bento-grid-primitive.md)) remains the only grid-shaped primitive.
- Independent of the other Phase A tickets; reasonable to pick up any time, including batched with [TICKET-UI-10](./TICKET-UI-10-divider-primitive.md) since both are mechanical, low-risk extractions.
