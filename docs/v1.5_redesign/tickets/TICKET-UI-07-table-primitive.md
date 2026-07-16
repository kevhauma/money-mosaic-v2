# TICKET-UI-07 — Table primitive family

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-7

## User story

As a developer, I want shared table components wrapping daisyUI's `table`/`th`/`tr`/`td` markup (header, row, cell, and a responsive overflow wrapper), so every data table in the app gets consistent zebra-striping, density, and overflow behavior from one place.

## Description

Prepare.md flags `table` (and its related `th`/`tr`/`td` structure) as an extraction candidate. Several features (Transactions list, Accounts list, Categories list, rules, mapping profiles) each render their own `<table>` markup today with independently-decided styling.

## Current situation (as-is)

- No table primitive exists in `shared/ui/`; list/detail features render raw `<table class="table">`-style markup directly, each deciding its own zebra-striping, density, sticky-header, and horizontal-scroll-wrapper behavior independently.

## Desired result (to-be)

- New `shared/ui/table/` primitive family: `mm-table` (the `<table>`/overflow-wrapper shell, with a `density: 'compact' | 'normal'` input and zebra-striping baked in) plus thin structural children (`mm-table-header`, `mm-table-row`, `mm-table-cell`) so callers still author their own columns/content but inherit consistent chrome (borders, zebra, horizontal scroll on small viewports) without re-declaring it.
- At least one existing table-rendering feature (whichever [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit shows has the most duplicated table styling — likely the Transactions list) migrates to the new primitive as the pilot consumer.

## Acceptance criteria

- [ ] `mm-table` shell + structural child components defined, `class` passthrough per the existing primitive convention
- [ ] Density and zebra-striping behavior covered by unit tests
- [ ] At least one existing table usage migrated to the new primitive
- [ ] Verified via the fallow and coding-conventions skills

## Notes

Don't try to build a generic data-grid (sorting/virtualization/column resize) here — this is a styling-consistency wrapper around markup callers still author themselves, not a new table engine. Sorting/virtualization stay whatever each feature already does today.
