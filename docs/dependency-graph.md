# Dependency graph reference

Full import graph of `src/app`, generated with `dependency-cruiser`, for Claude to consult
when tracing what imports what without re-grepping the tree by hand.

## Scope

Unlike the human-facing overview in [`reports/dependency-graph.html`](../reports/dependency-graph.html)
(which collapses each `feature-*` folder to a single node and stops one folder into
`core`/`shared`), this graph goes three folder levels deeper on both tiers — up to 4 folders
below `src/app` — which is enough to reach individual files in most feature/core/shared
subtrees.

<!-- GENERATED:STATS:START -->
- 381 leaf nodes, 1133 edges.
<!-- GENERATED:STATS:END -->

- `*.spec.ts` and `node_modules` are excluded.
- Node IDs are dependency-cruiser's internal short hashes (`4`, `2K`, `6N`, ...) — read them
  via the `subgraph`/node label text, not the ID itself.
- An edge collapsed at a folder boundary (rare here, since most subtrees fit within 4 levels)
  means _something_ inside that folder imports the target, not necessarily its `index.ts`.

## Regenerate

```bash
depcruise src/app \
  --config .dependency-cruiser.cjs \
  --collapse '^src/app/(?:core|shared)/[^/]+/[^/]+/[^/]+/[^/]+|^src/app/(?:core|shared)/[^/]+/[^/]+/[^/]+|^src/app/(?:core|shared)/[^/]+/[^/]+|^src/app/(?:core|shared)/[^/]+|^src/app/[^/]+/[^/]+/[^/]+/[^/]+|^src/app/[^/]+/[^/]+/[^/]+|^src/app/[^/]+/[^/]+|^src/app/[^/]+' \
  --output-type mermaid \
  --output-to reports/dependency-graph-deep.mmd
```

## Graph

```mermaid
flowchart LR

subgraph 0["src"]
subgraph 1["app"]
subgraph 2["core"]
subgraph 3["accounts"]
4["account-deletion.service.ts"]
5["index.ts"]
6["joint-owner-lookup.ts"]
end
subgraph 7["categorisation"]
8["category-applicability.ts"]
9["co-owner-contribution.service.ts"]
A["co-owner-contribution.ts"]
B["index.ts"]
C["rule-matching.ts"]
D["rules-engine.service.ts"]
end
subgraph E["data-access"]
F["accounts.repository.ts"]
G["app-db.ts"]
H["app-settings.repository.ts"]
I["categories.repository.ts"]
J["category-comparison-settings.repository.ts"]
K["category-model.repository.ts"]
L["dashboard-layout-settings.repository.ts"]
M["data-management.repository.ts"]
N["forecast-settings.repository.ts"]
O["goals.repository.ts"]
P["import-batches.repository.ts"]
Q["index.ts"]
R["mapping-profiles.repository.ts"]
S["rules.repository.ts"]
T["salary-metadata.repository.ts"]
U["transactions.repository.ts"]
V["transfer-settings.repository.ts"]
W["transfers.repository.ts"]
end
subgraph X["import"]
Y["account-detection.ts"]
Z["csv-import.service.ts"]
10["csv-parse.ts"]
11["csv-parse.worker.ts"]
12["csv-row-mapper.ts"]
13["csv-worker.types.ts"]
14["delimiter-guess.ts"]
15["import.service.ts"]
16["index.ts"]
end
subgraph 17["layout"]
subgraph 18["app-shell"]
19["app-shell.component.ts"]
end
1A["index.ts"]
end
subgraph 1B["links"]
1C["external-links.ts"]
1D["index.ts"]
end
subgraph 1E["ml"]
1F["category-model.worker.ts"]
1G["category-model.worker.types.ts"]
1H["feature-hashing.ts"]
1I["index.ts"]
1J["model-config.ts"]
1K["rule-proposal-mining.ts"]
1L["training-window.ts"]
end
subgraph 1M["onboarding"]
1N["home-redirect.guard.ts"]
1O["index.ts"]
1P["mark-visited.guard.ts"]
1Q["visited.service.ts"]
end
subgraph 1R["state"]
1S["accounts.store.ts"]
1T["app-settings.store.ts"]
1U["categories.store.ts"]
1V["chart-options-control.ts"]
1W["chart-options.store.ts"]
1X["forecast-settings.store.ts"]
1Y["goals.store.ts"]
1Z["index.ts"]
20["page-range-control.ts"]
21["range-state.store.ts"]
22["transactions.store.ts"]
23["transfer-settings.store.ts"]
24["transfers.store.ts"]
end
subgraph 25["stats"]
26["account-balance-history.ts"]
27["account-balance-trend.ts"]
28["annual-lump-sum-smoothing.ts"]
29["category-breakdown.ts"]
2A["category-composition-trend.ts"]
2B["category-cycle-heatmap.ts"]
2C["category-expense-transactions.ts"]
2D["category-kind-contribution.ts"]
2E["category-period-comparison.ts"]
2F["chart-zoom-window.ts"]
2G["classify-for-stats.ts"]
2H["classify-joint-leg.ts"]
2I["day-transactions.ts"]
2J["embedded-bonus-smoothing.ts"]
2K["full-history-range.ts"]
2L["goal-affordability.ts"]
2M["granularity-for-span.ts"]
2N["gross-net-growth.ts"]
2O["gross-net-ratio.ts"]
2P["income-category-series.ts"]
2Q["income-events.ts"]
2R["income-gap-detection.ts"]
2S["income-growth.ts"]
2T["income-step-change-detection.ts"]
2U["index.ts"]
2V["joint-account-stake.ts"]
2W["joint-contributor-breakdown.ts"]
2X["money-flow-graph.ts"]
2Y["multi-year-income-comparison.ts"]
2Z["net-margin.ts"]
30["period-stats.ts"]
31["period-window.ts"]
32["periodized-rate.ts"]
33["recurring-payments.ts"]
34["recurring-projection.ts"]
35["saving-velocity.ts"]
36["spending-mosaic.ts"]
37["top-transactions.ts"]
38["wage-change-detection.ts"]
39["weekday-weekend-split.ts"]
3A["year-over-year.ts"]
3B["yearly-income-summary.ts"]
end
subgraph 3C["storage"]
3D["index.ts"]
3E["storage-status.service.ts"]
end
subgraph 3F["theme"]
3G["accent-colors.ts"]
3H["index.ts"]
3I["theme-styles.ts"]
3J["theme.service.ts"]
end
subgraph 3K["transactions"]
3L["attribution-override.ts"]
3M["index.ts"]
3N["nullify-transaction.ts"]
3O["transaction-deletion.service.ts"]
end
subgraph 3P["transfers"]
3Q["index.ts"]
3R["transfer-cleanup.service.ts"]
3S["transfer-linking.service.ts"]
3T["transfer-matching.service.ts"]
3U["transfer-matching.ts"]
end
end
subgraph 3V["feature-accounts"]
3W["account-card-vm.ts"]
3X["account-icons.ts"]
3Y["account-list-order.ts"]
3Z["account-types.ts"]
40["accounts.routes.ts"]
41["balance-day-tooltip.ts"]
42["balance-trend-signals.ts"]
subgraph 43["components"]
subgraph 44["account-balance-block"]
45["account-balance-block.component.ts"]
end
subgraph 46["account-balance-chart"]
47["account-balance-chart.component.ts"]
end
subgraph 48["account-balance-history-chart"]
49["account-balance-history-chart.component.ts"]
end
subgraph 4A["account-card"]
4B["account-card.component.ts"]
end
subgraph 4C["account-form"]
4D["account-form.component.ts"]
end
subgraph 4E["accounts-detail"]
4F["accounts-detail.component.ts"]
end
subgraph 4G["accounts-overview"]
4H["accounts-overview.component.ts"]
end
4I["index.ts"]
end
4J["index.ts"]
end
subgraph 4K["feature-categories"]
4L["categories.routes.ts"]
4M["category-icons.ts"]
4N["category-model.service.ts"]
4O["category-model.store.ts"]
4P["category-row-vm.ts"]
subgraph 4Q["components"]
subgraph 4R["categories-overview"]
4S["categories-overview.component.ts"]
end
subgraph 4T["category-form"]
4U["category-form.component.ts"]
end
4V["index.ts"]
subgraph 4W["rule-condition-row"]
4X["rule-condition-row.component.ts"]
end
subgraph 4Y["rule-filters"]
4Z["rule-filters.component.ts"]
end
subgraph 50["rule-form"]
51["rule-form.component.ts"]
end
subgraph 52["rule-share-bar"]
53["rule-share-bar.component.ts"]
end
subgraph 54["rules-overview"]
55["rules-overview.component.ts"]
end
end
56["index.ts"]
57["rule-condition-editor.ts"]
58["rule-filters.ts"]
59["rule-labels.ts"]
5A["rule-share.ts"]
5B["rule-summary.ts"]
5C["rules.store.ts"]
end
subgraph 5D["feature-changelog"]
5E["changelog.routes.ts"]
subgraph 5F["components"]
subgraph 5G["changelog-entry-row"]
5H["changelog-entry-row.component.ts"]
end
subgraph 5I["changelog-page"]
5J["changelog-page.component.ts"]
end
5K["index.ts"]
end
subgraph 5L["data"]
5M["changelog-entries.ts"]
5N["roadmap-entries.ts"]
end
5O["group-changelog-entries.ts"]
5P["group-roadmap-entries.ts"]
5Q["index.ts"]
end
subgraph 5R["feature-dashboard"]
5S["category-comparison-settings.store.ts"]
5T["category-comparison-vm.ts"]
subgraph 5U["components"]
subgraph 5V["account-balance-strip"]
5W["account-balance-strip.component.ts"]
end
subgraph 5X["action-queue-panel"]
5Y["action-queue-panel.component.ts"]
end
subgraph 5Z["category-breakdown-panel"]
60["category-breakdown-panel.component.ts"]
end
subgraph 61["category-comparison-panel"]
62["category-comparison-panel.component.ts"]
end
subgraph 63["category-exclusion-dropdown"]
64["category-exclusion-dropdown.component.ts"]
end
subgraph 65["comparison-category-card"]
66["comparison-category-card.component.ts"]
end
subgraph 67["dashboard-customize-panel"]
68["dashboard-customize-panel.component.ts"]
end
subgraph 69["dashboard-overview"]
6A["dashboard-overview.component.ts"]
end
6B["index.ts"]
subgraph 6C["spending-heatmap-panel"]
6D["spending-heatmap-panel.component.ts"]
end
subgraph 6E["top-transactions-panel"]
6F["top-transactions-panel.component.ts"]
end
subgraph 6G["trend-chart-panel"]
6H["trend-chart-panel.component.ts"]
end
subgraph 6I["weekday-weekend-split-panel"]
6J["weekday-weekend-split-panel.component.ts"]
end
end
6K["dashboard-layout-settings.store.ts"]
6L["dashboard-row-order.ts"]
6M["dashboard.routes.ts"]
6N["index.ts"]
6O["stats.store.ts"]
end
subgraph 6P["feature-data-management"]
subgraph 6Q["components"]
subgraph 6R["data-management-overview"]
6S["data-management-overview.component.ts"]
end
6T["index.ts"]
end
6U["index.ts"]
end
subgraph 6V["feature-explore"]
subgraph 6W["components"]
subgraph 6X["explore-overview"]
6Y["explore-overview.component.ts"]
end
6Z["index.ts"]
subgraph 70["money-flow-panel"]
71["money-flow-panel.component.ts"]
end
subgraph 72["spending-mosaic-panel"]
73["spending-mosaic-panel.component.ts"]
end
end
74["explore.routes.ts"]
75["index.ts"]
end
subgraph 76["feature-future"]
subgraph 77["components"]
subgraph 78["forecast-controls"]
79["forecast-controls.component.ts"]
end
subgraph 7A["forecast-notice"]
7B["forecast-notice.component.ts"]
end
subgraph 7C["future-overview"]
7D["future-overview.component.ts"]
end
subgraph 7E["goal-form"]
7F["goal-form.component.ts"]
end
subgraph 7G["goal-row"]
7H["goal-row.component.ts"]
end
subgraph 7I["goals-panel"]
7J["goals-panel.component.ts"]
end
7K["index.ts"]
end
7L["forecast-controls-vm.ts"]
7M["forecast-notices.ts"]
7N["forecast.store.ts"]
7O["future.routes.ts"]
7P["goal-row-vm.ts"]
7Q["index.ts"]
end
subgraph 7R["feature-help"]
subgraph 7S["components"]
subgraph 7T["faq-page"]
7U["faq-page.component.ts"]
end
subgraph 7V["guide-detail"]
7W["guide-detail.component.ts"]
end
subgraph 7X["guide-steps"]
7Y["guide-steps.component.ts"]
end
subgraph 7Z["guides-index"]
80["guides-index.component.ts"]
end
81["index.ts"]
end
subgraph 82["data"]
83["faq.ts"]
84["guides.ts"]
end
85["help.routes.ts"]
86["index.ts"]
end
subgraph 87["feature-home"]
subgraph 88["components"]
subgraph 89["home-landing"]
8A["home-landing.component.ts"]
end
8B["index.ts"]
end
8C["home.routes.ts"]
8D["index.ts"]
end
subgraph 8E["feature-import"]
8F["column-mapping.ts"]
subgraph 8G["components"]
subgraph 8H["account-draft-editor"]
8I["account-draft-editor.component.ts"]
end
subgraph 8J["batch-wait-card"]
8K["batch-wait-card.component.ts"]
end
subgraph 8L["column-map-amount-field"]
8M["column-map-amount-field.component.ts"]
end
subgraph 8N["column-map-counterparty-field"]
8O["column-map-counterparty-field.component.ts"]
end
subgraph 8P["column-map-sample-caption"]
8Q["column-map-sample-caption.component.ts"]
end
subgraph 8R["column-map-simple-field"]
8S["column-map-simple-field.component.ts"]
end
subgraph 8T["column-map-stepper"]
8U["column-map-stepper.component.ts"]
end
subgraph 8V["column-map-summary-step"]
8W["column-map-summary-step.component.ts"]
end
subgraph 8X["import-map-step"]
8Y["import-map-step.component.ts"]
end
subgraph 8Z["import-preview-step"]
90["import-preview-step.component.ts"]
end
subgraph 91["import-select-step"]
92["import-select-step.component.ts"]
end
subgraph 93["import-summary-step"]
94["import-summary-step.component.ts"]
end
subgraph 95["import-wizard"]
96["import-wizard.component.ts"]
end
97["index.ts"]
subgraph 98["queued-file-row"]
99["queued-file-row.component.ts"]
end
end
9A["import-batches.store.ts"]
9B["import-queue.ts"]
9C["import-wizard-session.ts"]
9D["import.routes.ts"]
9E["index.ts"]
9F["mapper-steps.ts"]
9G["mapping-profiles.store.ts"]
end
subgraph 9H["feature-income"]
9I["career-start-date.ts"]
subgraph 9J["components"]
subgraph 9K["income-career-start"]
9L["income-career-start.component.ts"]
end
subgraph 9M["income-category-checklist"]
9N["income-category-checklist.component.ts"]
end
subgraph 9O["income-chart-cell"]
9P["income-chart-cell.component.ts"]
end
subgraph 9Q["income-events-sidebar"]
9R["income-events-sidebar.component.ts"]
end
subgraph 9S["income-gross-color"]
9T["income-gross-color.component.ts"]
end
subgraph 9U["income-gross-net-section"]
9V["income-gross-net-section.component.ts"]
end
subgraph 9W["income-growth-panel"]
9X["income-growth-panel.component.ts"]
end
subgraph 9Y["income-intro"]
9Z["income-intro.component.ts"]
end
subgraph A0["income-main-category"]
A1["income-main-category.component.ts"]
end
subgraph A2["income-overview"]
A3["income-overview.component.ts"]
end
subgraph A4["income-settings-page"]
A5["income-settings-page.component.ts"]
end
subgraph A6["income-yearly-panel"]
A7["income-yearly-panel.component.ts"]
end
A8["index.ts"]
subgraph A9["salary-details-page"]
AA["salary-details-page.component.ts"]
end
subgraph AB["salary-metadata-table"]
AC["salary-metadata-table.component.ts"]
end
subgraph AD["salary-month-modal"]
AE["salary-month-modal.component.ts"]
end
end
AF["gross-net-chart-options.ts"]
AG["income-category-vm.ts"]
AH["income-event-vm.ts"]
AI["income-granularity.ts"]
AJ["income.routes.ts"]
AK["income.store.ts"]
AL["index.ts"]
AM["salary-metadata-edit.ts"]
AN["salary-metadata-rows.ts"]
end
subgraph AO["feature-learning"]
subgraph AP["components"]
AQ["index.ts"]
subgraph AR["learning-overview"]
AS["learning-overview.component.ts"]
end
subgraph AT["model-status-badge"]
AU["model-status-badge.component.ts"]
end
subgraph AV["model-status"]
AW["model-status.component.ts"]
end
subgraph AX["rule-proposals"]
AY["rule-proposals.component.ts"]
end
subgraph AZ["suggestions-table"]
B0["suggestions-table.component.ts"]
end
end
B1["index.ts"]
B2["learning.routes.ts"]
B3["model-status-display.ts"]
end
subgraph B4["feature-recurring"]
B5["bills-calendar-vm.ts"]
subgraph B6["components"]
subgraph B7["bills-calendar"]
B8["bills-calendar.component.ts"]
end
subgraph B9["bills-day-list"]
BA["bills-day-list.component.ts"]
end
subgraph BB["bills-month-grid"]
BC["bills-month-grid.component.ts"]
end
BD["index.ts"]
subgraph BE["recurring-overview"]
BF["recurring-overview.component.ts"]
end
subgraph BG["recurring-payments-panel"]
BH["recurring-payments-panel.component.ts"]
end
end
BI["index.ts"]
BJ["recurring-payments-row-vm.ts"]
BK["recurring-series.store.ts"]
BL["recurring.routes.ts"]
end
subgraph BM["feature-settings"]
subgraph BN["components"]
BO["index.ts"]
subgraph BP["settings-about-section"]
BQ["settings-about-section.component.ts"]
end
subgraph BR["settings-currency-locale-section"]
BS["settings-currency-locale-section.component.ts"]
end
subgraph BT["settings-data-section"]
BU["settings-data-section.component.ts"]
end
subgraph BV["settings-overview"]
BW["settings-overview.component.ts"]
end
subgraph BX["settings-privacy-section"]
BY["settings-privacy-section.component.ts"]
end
subgraph BZ["settings-theme-section"]
C0["settings-theme-section.component.ts"]
end
end
C1["index.ts"]
C2["settings.routes.ts"]
end
subgraph C3["feature-transactions"]
C4["category-picker.ts"]
subgraph C5["components"]
subgraph C6["attribution-override-fieldset"]
C7["attribution-override-fieldset.component.ts"]
end
subgraph C8["category-select-cell"]
C9["category-select-cell.component.ts"]
end
CA["index.ts"]
subgraph CB["transaction-bulk-bar"]
CC["transaction-bulk-bar.component.ts"]
end
subgraph CD["transaction-edit-form"]
CE["transaction-edit-form.component.ts"]
end
subgraph CF["transaction-filters"]
CG["transaction-filters.component.ts"]
end
subgraph CH["transaction-row"]
CI["transaction-row.component.ts"]
end
subgraph CJ["transactions-overview"]
CK["transactions-overview.component.ts"]
end
subgraph CL["transfer-review"]
CM["transfer-review.component.ts"]
end
end
CN["index.ts"]
CO["transaction-filters.ts"]
CP["transaction-row-vm.ts"]
CQ["transactions.routes.ts"]
end
subgraph CR["shared"]
subgraph CS["echarts"]
CT["bucketed-axis-option.ts"]
CU["chart-theme.ts"]
CV["echarts-jsdom.testing.ts"]
CW["echarts-setup.ts"]
CX["index.ts"]
CY["legend-option.ts"]
CZ["tooltip-formatter.ts"]
end
subgraph D0["ui"]
subgraph D1["alert"]
D2["alert.component.ts"]
end
subgraph D3["badge"]
D4["badge.component.ts"]
end
subgraph D5["button"]
D6["button.component.ts"]
end
subgraph D7["collapse"]
D8["collapse.component.ts"]
end
subgraph D9["confirm-dialog"]
DA["confirm-dialog.component.ts"]
end
subgraph DB["cycle-picker"]
DC["cycle-picker.component.ts"]
end
subgraph DD["date-range-input"]
DE["date-range-input.component.ts"]
end
subgraph DF["divider"]
DG["divider.component.ts"]
end
subgraph DH["dropdown"]
DI["dropdown.component.ts"]
end
subgraph DJ["empty-state"]
DK["empty-state.component.ts"]
end
subgraph DL["fieldset"]
DM["fieldset.component.ts"]
end
subgraph DN["flex"]
DO["flex.component.ts"]
end
subgraph DP["granularity-picker"]
DQ["granularity-picker.component.ts"]
end
DR["index.ts"]
subgraph DS["input"]
DT["input.component.ts"]
end
subgraph DU["label"]
DV["label.component.ts"]
end
subgraph DW["loading-skeleton"]
DX["loading-skeleton.component.ts"]
end
subgraph DY["modal"]
DZ["mm-modal.component.ts"]
end
subgraph E0["page-header"]
E1["page-header.component.ts"]
end
subgraph E2["paginator"]
E3["paginator.component.ts"]
end
subgraph E4["paper"]
E5["paper.component.ts"]
end
subgraph E6["privacy-blur"]
E7["privacy-blur.component.ts"]
end
subgraph E8["privacy-toggle"]
E9["privacy-toggle.component.ts"]
end
subgraph EA["range-grouping-switcher"]
EB["range-grouping-switcher.component.ts"]
end
subgraph EC["select"]
ED["select.component.ts"]
end
subgraph EE["stat-card"]
EF["stat-card.component.ts"]
end
subgraph EG["table"]
EH["table.component.ts"]
end
subgraph EI["tabs"]
EJ["tabs.component.ts"]
end
subgraph EK["typography"]
EL["typography.component.ts"]
end
end
subgraph EM["utils"]
EN["calendar-cycles.ts"]
EO["confidence-color.ts"]
EP["confirm-state.ts"]
EQ["currency-format.ts"]
ER["currency-symbol-presets.ts"]
ES["daisy-classes.ts"]
ET["date-buckets.ts"]
EU["date-format.pipe.ts"]
EV["date-format.ts"]
EW["debounced-text.ts"]
EX["download-json.ts"]
EY["fingerprint.ts"]
EZ["format-settings.testing.ts"]
F0["format-settings.ts"]
F1["hidden-amount.ts"]
F2["iban.ts"]
F3["index.ts"]
F4["link-control-to-setting.ts"]
F5["locale-presets.ts"]
F6["number-format.ts"]
F7["pagination.ts"]
F8["percentage.ts"]
F9["search-params.ts"]
FA["selection-model.ts"]
FB["signed-amount.pipe.ts"]
FC["sortable.ts"]
FD["structural-filters.ts"]
FE["theme-hooks.ts"]
subgraph FF["validators"]
FG["iban.validator.ts"]
FH["percentage.validator.ts"]
end
FI["with-archivable.ts"]
FJ["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3Q
5-->4
5-->6
6-->Q
6-->F3
8-->Q
9-->A
9-->Q
A-->5
A-->Q
B-->8
B-->A
B-->9
B-->C
B-->D
C-->Q
D-->C
D-->Q
F-->G
G-->1J
G-->35
G-->3G
G-->EY
G-->F0
H-->G
H-->3H
H-->F3
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->2U
O-->G
P-->G
Q-->F
Q-->G
Q-->H
Q-->I
Q-->J
Q-->K
Q-->L
Q-->M
Q-->N
Q-->O
Q-->P
Q-->R
Q-->S
Q-->T
Q-->U
Q-->V
Q-->W
R-->G
S-->G
T-->G
U-->G
V-->G
W-->G
Y-->Q
Y-->F3
Z-->13
Z-->Q
10-->12
10-->13
11-->10
11-->13
12-->Q
13-->12
13-->Q
15-->12
15-->Q
15-->3Q
15-->F3
16-->Y
16-->Z
16-->10
16-->12
16-->13
16-->14
16-->15
19-->1Z
19-->D6
19-->EL
1A-->19
1D-->1C
1F-->1G
1F-->1H
1F-->1J
1G-->1J
1H-->1J
1I-->1G
1I-->1H
1I-->1J
1I-->1K
1I-->1L
1K-->B
1K-->Q
1N-->1Q
1O-->1N
1O-->1P
1O-->1Q
1P-->1Q
1S-->1U
1S-->22
1S-->24
1S-->5
1S-->Q
1S-->2U
1S-->3Q
1S-->F3
1T-->Q
1T-->3H
1T-->F3
1U-->22
1U-->Q
1U-->F3
1V-->1W
1V-->2U
1V-->CX
1V-->F3
1W-->2U
1W-->CX
1W-->F3
1X-->Q
1X-->2U
1Y-->Q
1Y-->F3
1Z-->1S
1Z-->1T
1Z-->1U
1Z-->1V
1Z-->1W
1Z-->1X
1Z-->1Y
1Z-->20
1Z-->21
1Z-->22
1Z-->23
1Z-->24
20-->1S
20-->21
20-->22
20-->2U
20-->F3
21-->F3
22-->Q
22-->3M
22-->3Q
23-->Q
24-->22
24-->23
24-->Q
24-->3Q
26-->Q
26-->F3
27-->26
27-->Q
27-->F3
28-->2A
28-->2P
28-->F3
29-->2G
29-->Q
2A-->29
2A-->Q
2A-->F3
2B-->29
2B-->2G
2B-->Q
2B-->F3
2C-->2G
2C-->Q
2D-->Q
2E-->29
2E-->31
2E-->Q
2F-->F3
2G-->2D
2G-->2H
2G-->Q
2G-->3Q
2H-->5
2H-->Q
2I-->Q
2J-->2A
2J-->2P
2J-->Q
2J-->F3
2K-->Q
2L-->Q
2L-->F3
2M-->F3
2N-->2O
2O-->2P
2O-->Q
2P-->2A
2P-->Q
2P-->F3
2Q-->2R
2Q-->2T
2Q-->38
2Q-->Q
2R-->2A
2R-->2P
2R-->F3
2S-->2P
2S-->3A
2S-->F3
2T-->2A
2T-->2J
2T-->2P
2T-->F3
2U-->26
2U-->27
2U-->28
2U-->29
2U-->2A
2U-->2B
2U-->2C
2U-->2D
2U-->2E
2U-->2F
2U-->2G
2U-->2H
2U-->2I
2U-->2J
2U-->2K
2U-->2L
2U-->2M
2U-->2N
2U-->2O
2U-->2P
2U-->2Q
2U-->2R
2U-->2S
2U-->2T
2U-->2V
2U-->2W
2U-->2X
2U-->2Y
2U-->2Z
2U-->30
2U-->31
2U-->32
2U-->33
2U-->34
2U-->35
2U-->36
2U-->37
2U-->38
2U-->39
2U-->3A
2U-->3B
2V-->2H
2V-->Q
2W-->2H
2W-->5
2W-->Q
2X-->Q
2X-->F3
2Y-->3B
30-->2G
30-->Q
31-->F3
32-->F3
33-->2G
33-->B
33-->Q
33-->F3
34-->33
34-->F3
35-->30
35-->Q
35-->F3
36-->29
36-->2C
36-->Q
37-->Q
37-->3Q
38-->2O
39-->2G
39-->Q
39-->F3
3A-->30
3A-->Q
3B-->2A
3B-->Q
3B-->F3
3D-->3E
3G-->3I
3H-->3G
3H-->3I
3H-->3J
3J-->3I
3L-->Q
3M-->3L
3M-->3N
3M-->3O
3N-->Q
3O-->Q
3O-->3Q
3Q-->3R
3Q-->3S
3Q-->3U
3Q-->3T
3R-->Q
3S-->3U
3S-->Q
3T-->3S
3T-->3U
3T-->Q
3U-->6
3U-->Q
3U-->F3
3W-->Q
3X-->Q
3Y-->Q
3Z-->Q
40-->4F
40-->4H
40-->CX
41-->2U
41-->F3
42-->Q
42-->1Z
42-->2U
42-->F3
45-->DR
45-->F3
47-->41
47-->42
47-->Q
47-->2U
47-->CX
47-->DR
47-->F3
49-->41
49-->42
49-->Q
49-->1Z
49-->2U
49-->CX
49-->DR
4B-->3W
4B-->3X
4B-->45
4B-->DR
4D-->3X
4D-->3Z
4D-->Q
4D-->DR
4D-->F3
4D-->FG
4D-->FH
4F-->45
4F-->47
4F-->4D
4F-->1Z
4F-->DR
4F-->F3
4H-->3W
4H-->3X
4H-->3Y
4H-->49
4H-->4B
4H-->4D
4H-->Q
4H-->1Z
4H-->DR
4H-->F3
4I-->45
4I-->47
4I-->49
4I-->4B
4I-->4D
4I-->4F
4I-->4H
4J-->3X
4J-->3Z
4J-->40
4J-->4I
4L-->4S
4L-->55
4N-->1I
4O-->4N
4O-->5C
4O-->Q
4O-->1I
4O-->1Z
4P-->Q
4P-->DR
4S-->4M
4S-->4P
4S-->4U
4S-->B
4S-->Q
4S-->1Z
4S-->DR
4S-->F3
4U-->4M
4U-->Q
4U-->DR
4V-->4S
4V-->4U
4V-->4Z
4V-->51
4V-->53
4V-->55
4X-->57
4X-->59
4X-->B
4X-->Q
4X-->1Z
4X-->DR
4Z-->58
4Z-->1Z
4Z-->DR
4Z-->F3
51-->57
51-->4X
51-->B
51-->Q
51-->1Z
51-->DR
53-->5A
53-->5C
53-->DR
53-->F3
55-->58
55-->5B
55-->5C
55-->4Z
55-->51
55-->53
55-->Q
55-->1Z
55-->DR
55-->F3
56-->4L
56-->4M
56-->4N
56-->4O
56-->4V
56-->58
56-->5B
56-->5C
57-->59
57-->Q
58-->5B
58-->Q
59-->Q
5A-->Q
5B-->59
5B-->Q
5C-->5A
5C-->B
5C-->Q
5C-->1Z
5C-->F3
5E-->5J
5H-->DR
5J-->5M
5J-->5N
5J-->5O
5J-->5P
5J-->5H
5J-->DR
5K-->5J
5O-->5M
5P-->5N
5Q-->5E
5Q-->5K
5S-->Q
5W-->1Z
5W-->DR
5W-->F3
5Y-->1Z
5Y-->3Q
5Y-->DR
5Y-->F3
60-->6O
60-->1Z
60-->2U
60-->CX
60-->DR
60-->F3
62-->5S
62-->5T
62-->6O
62-->64
62-->66
62-->1Z
62-->DR
62-->F3
64-->1Z
64-->DR
66-->5T
66-->DR
68-->6K
68-->6L
68-->Q
68-->DR
6A-->6K
6A-->6L
6A-->6O
6A-->5W
6A-->5Y
6A-->60
6A-->62
6A-->68
6A-->6D
6A-->6F
6A-->6H
6A-->6J
6A-->1Z
6A-->2U
6A-->DR
6A-->F3
6B-->5W
6B-->5Y
6B-->60
6B-->62
6B-->64
6B-->68
6B-->6A
6B-->6D
6B-->6F
6B-->6H
6B-->6J
6D-->64
6D-->1Z
6D-->2U
6D-->3Q
6D-->CX
6D-->DR
6D-->F3
6F-->6O
6F-->1Z
6F-->DR
6F-->F3
6H-->1Z
6H-->2U
6H-->3Q
6H-->CX
6H-->DR
6H-->F3
6J-->6O
6J-->1Z
6J-->DR
6J-->F3
6K-->6L
6K-->Q
6L-->Q
6M-->6A
6M-->CX
6N-->6B
6N-->6M
6O-->5S
6O-->1Z
6O-->2U
6O-->3Q
6S-->Q
6S-->3D
6S-->DR
6S-->F3
6T-->6S
6U-->6T
6Y-->71
6Y-->73
6Y-->1Z
6Y-->DR
6Z-->6Y
6Z-->71
6Z-->73
71-->1Z
71-->2U
71-->CX
71-->DR
71-->F3
73-->Q
73-->1Z
73-->2U
73-->3Q
73-->CX
73-->DR
73-->F3
74-->6Y
74-->CX
75-->6Z
75-->74
79-->7L
79-->7N
79-->1Z
79-->2U
79-->DR
79-->F3
7B-->7M
7B-->DR
7D-->79
7D-->7J
7D-->DR
7F-->Q
7F-->DR
7H-->7P
7H-->DR
7J-->7M
7J-->7N
7J-->7P
7J-->7B
7J-->7F
7J-->7H
7J-->Q
7J-->1Z
7J-->DR
7J-->F3
7K-->79
7K-->7B
7K-->7D
7K-->7F
7K-->7H
7K-->7J
7L-->2U
7L-->DR
7L-->F3
7M-->2U
7M-->DR
7M-->F3
7N-->1Z
7N-->2U
7N-->3Q
7O-->7D
7O-->CX
7P-->Q
7P-->2U
7P-->DR
7P-->F3
7Q-->7K
7Q-->7L
7Q-->7M
7Q-->7N
7Q-->7O
7Q-->7P
7U-->83
7U-->DR
7W-->84
7W-->7Y
7W-->DR
7Y-->84
7Y-->DR
80-->84
80-->DR
81-->7U
81-->7W
81-->7Y
81-->80
85-->7U
85-->7W
85-->80
86-->81
86-->84
86-->85
8A-->1D
8A-->DR
8B-->8A
8C-->8A
8D-->8B
8D-->8C
8F-->Q
8I-->9B
8I-->4J
8I-->DR
8K-->DR
8M-->8Q
8M-->DR
8O-->8Q
8O-->DR
8Q-->DR
8S-->8F
8S-->8Q
8S-->DR
8U-->9F
8U-->DR
8W-->8F
8W-->DR
8Y-->8F
8Y-->9F
8Y-->9G
8Y-->8M
8Y-->8O
8Y-->8S
8Y-->8U
8Y-->8W
8Y-->90
8Y-->Q
8Y-->16
8Y-->DR
90-->16
90-->DR
90-->F3
92-->9B
92-->9G
92-->99
92-->Q
92-->16
92-->DR
94-->Q
94-->DR
96-->9C
96-->8K
96-->8Y
96-->92
96-->94
96-->1Z
96-->DR
97-->8Y
97-->90
97-->92
97-->94
97-->96
99-->9B
99-->8I
99-->Q
99-->DR
9A-->B
9A-->Q
9A-->16
9A-->1Z
9B-->Q
9C-->8F
9C-->9A
9C-->9B
9C-->9G
9C-->Q
9C-->16
9C-->1Z
9C-->4J
9D-->96
9E-->8F
9E-->97
9E-->9A
9E-->9B
9E-->9D
9E-->9F
9E-->9G
9F-->8F
9G-->Q
9I-->2U
9L-->9I
9L-->AK
9L-->DR
9L-->F3
9N-->AG
9N-->DR
9P-->DR
9R-->AH
9R-->AI
9R-->AK
9R-->1Z
9R-->2U
9R-->DR
9T-->AK
9T-->3H
9T-->CX
9T-->DR
9V-->AF
9V-->AK
9V-->9P
9V-->1Z
9V-->2U
9V-->CX
9V-->DR
9V-->F3
9X-->AI
9X-->AK
9X-->1Z
9X-->2U
9X-->DR
9X-->F3
9Z-->1Z
9Z-->86
9Z-->DR
A1-->AG
A1-->AK
A1-->DR
A3-->AK
A3-->AN
A3-->9R
A3-->9V
A3-->9X
A3-->9Z
A3-->A7
A3-->AE
A3-->1Z
A3-->2U
A3-->86
A3-->CX
A3-->DR
A3-->F3
A5-->AG
A5-->AK
A5-->9L
A5-->9N
A5-->9T
A5-->A1
A5-->DR
A7-->AK
A7-->1Z
A7-->2U
A7-->3Q
A7-->CX
A7-->DR
A7-->F3
A8-->9L
A8-->9N
A8-->9P
A8-->9R
A8-->9V
A8-->9X
A8-->9Z
A8-->A1
A8-->A3
A8-->A5
A8-->A7
A8-->AA
A8-->AC
A8-->AE
AA-->AC
AA-->DR
AC-->AI
AC-->AK
AC-->AM
AC-->AN
AC-->DR
AC-->F3
AE-->AK
AE-->AM
AE-->AN
AE-->AC
AE-->Q
AE-->DR
AF-->2U
AF-->CX
AF-->F3
AG-->Q
AH-->AI
AH-->Q
AH-->2U
AH-->DR
AH-->F3
AI-->F3
AJ-->A3
AJ-->A5
AJ-->AA
AJ-->CX
AK-->9I
AK-->AI
AK-->Q
AK-->1Z
AK-->2U
AK-->3H
AK-->3Q
AL-->A8
AL-->AG
AL-->AI
AL-->AJ
AL-->AK
AL-->AM
AL-->AN
AM-->Q
AN-->Q
AQ-->AS
AQ-->AW
AQ-->AY
AQ-->B0
AS-->AU
AS-->AW
AS-->AY
AS-->B0
AS-->DR
AU-->B3
AU-->56
AU-->DR
AW-->B3
AW-->1I
AW-->1Z
AW-->56
AW-->DR
AY-->Q
AY-->1I
AY-->1Z
AY-->56
AY-->DR
AY-->F3
B0-->Q
B0-->1Z
B0-->56
B0-->DR
B0-->F3
B1-->AQ
B1-->B2
B2-->AS
B3-->56
B3-->DR
B5-->DR
B8-->B5
B8-->BK
B8-->BA
B8-->BC
B8-->1Z
B8-->2U
B8-->DR
B8-->F3
BA-->B5
BA-->DR
BC-->B5
BC-->DR
BD-->B8
BD-->BA
BD-->BC
BD-->BF
BD-->BH
BF-->B8
BF-->BH
BF-->1Z
BF-->DR
BH-->BJ
BH-->BK
BH-->1Z
BH-->2U
BH-->CX
BH-->DR
BH-->F3
BI-->BD
BI-->BL
BK-->1Z
BK-->2U
BK-->3Q
BL-->BF
BO-->BW
BQ-->1D
BQ-->DR
BS-->1Z
BS-->DR
BS-->F3
BU-->6U
BU-->DR
BW-->BQ
BW-->BS
BW-->BU
BW-->BY
BW-->C0
BW-->DR
BY-->1Z
BY-->DR
BY-->F3
C0-->1Z
C0-->3H
C0-->DR
C1-->BO
C1-->C2
C2-->BW
C4-->Q
C7-->Q
C7-->1Z
C7-->3M
C7-->DR
C7-->F3
C9-->C4
CA-->CC
CA-->CE
CA-->CG
CA-->CK
CA-->CM
CC-->C4
CC-->B
CC-->1Z
CC-->DR
CE-->C4
CE-->C7
CE-->B
CE-->Q
CE-->1Z
CE-->3M
CE-->56
CE-->DR
CG-->C4
CG-->CO
CG-->B
CG-->1Z
CG-->DR
CG-->F3
CI-->C4
CI-->CP
CI-->C9
CI-->DR
CI-->F3
CK-->C4
CK-->CO
CK-->CP
CK-->CC
CK-->CE
CK-->CG
CK-->CI
CK-->CM
CK-->B
CK-->Q
CK-->1Z
CK-->3Q
CK-->56
CK-->DR
CK-->F3
CM-->1Z
CM-->3Q
CM-->DR
CM-->F3
CN-->CQ
CO-->Q
CO-->3Q
CP-->Q
CQ-->CK
CX-->CT
CX-->CU
CX-->CW
CX-->CY
CX-->CZ
CZ-->F3
D2-->F3
D4-->F3
D6-->F3
D8-->F3
DA-->D6
DA-->DV
DA-->DZ
DA-->EL
DC-->F3
DE-->DI
DE-->F3
DG-->F3
DI-->F3
DK-->DO
DK-->EL
DM-->F3
DO-->F3
DR-->D2
DR-->D4
DR-->D6
DR-->D8
DR-->DA
DR-->DC
DR-->DE
DR-->DG
DR-->DI
DR-->DK
DR-->DM
DR-->DO
DR-->DQ
DR-->DT
DR-->DV
DR-->DX
DR-->DZ
DR-->E1
DR-->E3
DR-->E5
DR-->E7
DR-->E9
DR-->EB
DR-->ED
DR-->EF
DR-->EH
DR-->EJ
DR-->EL
DT-->F3
DV-->F3
DX-->DO
DZ-->F3
E1-->DO
E1-->EL
E3-->D6
E3-->DO
E3-->EL
E3-->F3
E5-->F3
E7-->F3
E9-->D6
E9-->1Z
EB-->D6
EB-->DE
EB-->DO
ED-->F3
EF-->E7
EF-->EL
EF-->F3
EH-->F3
EJ-->F3
EL-->F3
EN-->EV
EQ-->F0
ET-->F0
EU-->EV
EV-->F0
EZ-->F0
F3-->EN
F3-->EO
F3-->EP
F3-->EQ
F3-->ER
F3-->ES
F3-->ET
F3-->EV
F3-->EU
F3-->EW
F3-->EX
F3-->EY
F3-->F0
F3-->F1
F3-->F2
F3-->F4
F3-->F5
F3-->F6
F3-->F7
F3-->F8
F3-->F9
F3-->FA
F3-->FB
F3-->FC
F3-->FD
F3-->FE
F3-->FI
F3-->FJ
F6-->F0
FB-->EQ
```
