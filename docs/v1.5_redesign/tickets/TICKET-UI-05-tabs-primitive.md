# TICKET-UI-05 — Tabs primitive

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-5

## User story

As a developer, I want a shared Tabs component wrapping daisyUI's `tabs`/`tab` classes, so tab styling and active-state logic live in one place instead of being re-authored at each usage site.

## Description

Prepare.md flags `tabs`/`tab` as a manual extraction candidate — daisyUI's raw classes are currently applied directly wherever tabbed navigation is needed, with each call site responsible for its own active-state class toggling.

## Current situation (as-is)

- No `mm-tabs` component exists in `shared/ui/`; usages of daisyUI's `tabs`/`tab` classes are applied directly in feature templates, each managing its own active/inactive class binding.

## Desired result (to-be)

- New `shared/ui/tabs/tabs.component.ts` (selector `mm-tabs`) taking a typed list of tab definitions (`{ label: string; value: string }[]`) via `input()`, a `selected` `model()` for two-way binding, and a `variant` input mirroring daisyUI's tab style modifiers (`'bordered' | 'lifted' | 'boxed'`). Emits/updates `selected` on click; renders the active tab's `tab-active` state internally so callers never hand-manage the class.
- Existing tabbed-navigation call sites identified by [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit migrate to `<mm-tabs>`.

## Acceptance criteria

- [ ] `mm-tabs` component with typed `tabs`/`selected`/`variant` inputs, `class` passthrough per the existing primitive convention
- [ ] Clicking a tab updates `selected` and applies `tab-active` to exactly one tab
- [ ] Existing tab usages migrated to `mm-tabs`
- [ ] Unit tests cover selection state and variant class output
- [ ] Verified via the fallow and coding-conventions skills

## Notes

Keep the API to label/value pairs rather than accepting arbitrary tab content via structural directives for this first version — a content-projection API (`<ng-template>` per tab) is a reasonable follow-up if a consumer needs rich tab content, but no current usage requires it.
