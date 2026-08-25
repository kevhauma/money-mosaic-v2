# CR4 — Solution exploration docs

One doc per [CR4 finding](../code-review.md). These are **option explorations, not tickets**: each lays out the possible ways to address a finding with mechanics, trade-offs, and interactions, without committing to one. A later ticketing pass (via `story-ticket`) picks an option and writes acceptance criteria; nothing here is binding.

| Doc | Finding | One-liner |
|---|---|---|
| [CR4-01](./CR4-01-template-complexity.md) | Template complexity peak | Per-component options for all six flagged templates |
| [CR4-02](./CR4-02-import-wizard-commit-flow.md) | Wizard commit/auto-commit flow | State-machine vs. service-extraction vs. narrower options |
| [CR4-03](./CR4-03-classify-for-stats.md) | `classifyForStats` choke point | Making branch ordering explicit without re-fragmenting |
| [CR4-04](./CR4-04-import-map-step.md) | `import-map-step` size | Three-way split vs. types-only vs. computeds-only |
| [CR4-05](./CR4-05-settings-page.md) | Settings page accumulation | Section components vs. child routes vs. convention-only |
| [CR4-06](./CR4-06-formatting-mechanisms.md) | Formatting drift + triple mechanism | Drift fix (near-mandatory) + channel consolidation options |
| [CR4-07](./CR4-07-exports-from-component-files.md) | Helpers/types exported from components | Alias removal + type relocation + the rule to write down |
| [CR4-08](./CR4-08-data-management-route-remnants.md) | Orphaned data-management route | Commit to embed **or** to route — ending the half-state |
| [CR4-09](./CR4-09-bento-grid.md) | Unrendered bento components | Delete vs. keep-with-recorded-purpose |
| [CR4-10](./CR4-10-store-placement-rule.md) | Store placement rule gap | Move the stragglers vs. widen the written rule |
| [CR4-11](./CR4-11-project-map-skill.md) | Stale project-map skill | Rewrite now + process hook + shrinking the claim surface |
| [CR4-12](./CR4-12-coding-conventions-skill.md) | Conventions self-contradiction | Correction + exemplar-linking to resist future drift |
| [CR4-13](./CR4-13-ticket-bookkeeping.md) | SET-06 record vs. code | Record repair (two directions) + workflow guard |
| [CR4-14](./CR4-14-fallow-noise.md) | Fallow gate noise | Codify false positives, drive report to zero, gate on it |

Shared constraints that bound every option (from [CLAUDE.md](../../../../CLAUDE.md)): bundle budgets are never raised; Dexie schema changes stay additive; components/stores go through repositories; cross-feature imports via barrels; Prettier owns formatting. None of the findings require a schema change; none of the options below may regress the existing bundle wins (tree-shaken ECharts, lazy feature routes).
