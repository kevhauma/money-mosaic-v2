# TICKET-STAT-52 — Fix the double-encoded trend-chart label

- **Area:** Dashboard (feature-dashboard)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-35; NFR-A11Y-1 (screen-reader labels) on the trend chart's text alternative from TICKET-STAT-20

## User story

As a screen-reader user, I want the trend charts' label to read "month, 2026-01-01 to 2026-11-15", so I hear the date range instead of garbled characters between the dates.

## Description

`trend-chart-panel.component.ts` was saved through a double UTF-8 encoding at some point: its en dash and em dashes became `â€“`/`â€”`. In comments that is noise; in `rangeLabel` it is what the charts' `aria-label` reads aloud.

## Current situation (as-is)

- [trend-chart-panel.component.ts:195-197](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts) — `rangeLabel` is `` `${granularity}, ${from}â€“${to}` ``; both chart aria-labels (lines 199-205) embed it. Mojibake also in comments on lines 33, 37 and 182.
- [category-breakdown-panel.component.ts](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts) — the same mojibake in comments on lines 88, 143 and 150.
- A grep for `â€` over `src/`, `server/` and `shared/` finds only these two files.

## Desired result (to-be)

- Every `â€“` becomes `–` and every `â€”` becomes `—` in both files; the files are valid UTF-8 without the double encoding.
- `rangeLabel` reads e.g. `month, 2026-01-01–2026-11-15`.

## Acceptance criteria

- [ ] `grep -r "â€" src server/src shared` returns nothing.
- [ ] A spec asserts the income chart's aria-label contains `2026-01-01–2026-11-15` for that range and no `â`.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: inspect the trend chart's `aria-label` on the dashboard; it shows the en dash.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Fix with an editor that writes UTF-8, not by re-encoding the whole file blindly; check the diff touches only the mojibake.
