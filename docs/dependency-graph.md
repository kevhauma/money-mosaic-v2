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
- 379 leaf nodes, 1121 edges.
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
subgraph 78["forecast-notice"]
79["forecast-notice.component.ts"]
end
subgraph 7A["future-overview"]
7B["future-overview.component.ts"]
end
subgraph 7C["goal-form"]
7D["goal-form.component.ts"]
end
subgraph 7E["goal-row"]
7F["goal-row.component.ts"]
end
subgraph 7G["goals-panel"]
7H["goals-panel.component.ts"]
end
7I["index.ts"]
end
7J["forecast-notices.ts"]
7K["forecast.store.ts"]
7L["future.routes.ts"]
7M["goal-row-vm.ts"]
7N["index.ts"]
end
subgraph 7O["feature-help"]
subgraph 7P["components"]
subgraph 7Q["faq-page"]
7R["faq-page.component.ts"]
end
subgraph 7S["guide-detail"]
7T["guide-detail.component.ts"]
end
subgraph 7U["guide-steps"]
7V["guide-steps.component.ts"]
end
subgraph 7W["guides-index"]
7X["guides-index.component.ts"]
end
7Y["index.ts"]
end
subgraph 7Z["data"]
80["faq.ts"]
81["guides.ts"]
end
82["help.routes.ts"]
83["index.ts"]
end
subgraph 84["feature-home"]
subgraph 85["components"]
subgraph 86["home-landing"]
87["home-landing.component.ts"]
end
88["index.ts"]
end
89["home.routes.ts"]
8A["index.ts"]
end
subgraph 8B["feature-import"]
8C["column-mapping.ts"]
subgraph 8D["components"]
subgraph 8E["account-draft-editor"]
8F["account-draft-editor.component.ts"]
end
subgraph 8G["batch-wait-card"]
8H["batch-wait-card.component.ts"]
end
subgraph 8I["column-map-amount-field"]
8J["column-map-amount-field.component.ts"]
end
subgraph 8K["column-map-counterparty-field"]
8L["column-map-counterparty-field.component.ts"]
end
subgraph 8M["column-map-sample-caption"]
8N["column-map-sample-caption.component.ts"]
end
subgraph 8O["column-map-simple-field"]
8P["column-map-simple-field.component.ts"]
end
subgraph 8Q["column-map-stepper"]
8R["column-map-stepper.component.ts"]
end
subgraph 8S["column-map-summary-step"]
8T["column-map-summary-step.component.ts"]
end
subgraph 8U["import-map-step"]
8V["import-map-step.component.ts"]
end
subgraph 8W["import-preview-step"]
8X["import-preview-step.component.ts"]
end
subgraph 8Y["import-select-step"]
8Z["import-select-step.component.ts"]
end
subgraph 90["import-summary-step"]
91["import-summary-step.component.ts"]
end
subgraph 92["import-wizard"]
93["import-wizard.component.ts"]
end
94["index.ts"]
subgraph 95["queued-file-row"]
96["queued-file-row.component.ts"]
end
end
97["import-batches.store.ts"]
98["import-queue.ts"]
99["import-wizard-session.ts"]
9A["import.routes.ts"]
9B["index.ts"]
9C["mapper-steps.ts"]
9D["mapping-profiles.store.ts"]
end
subgraph 9E["feature-income"]
9F["career-start-date.ts"]
subgraph 9G["components"]
subgraph 9H["income-career-start"]
9I["income-career-start.component.ts"]
end
subgraph 9J["income-category-checklist"]
9K["income-category-checklist.component.ts"]
end
subgraph 9L["income-chart-cell"]
9M["income-chart-cell.component.ts"]
end
subgraph 9N["income-events-sidebar"]
9O["income-events-sidebar.component.ts"]
end
subgraph 9P["income-gross-color"]
9Q["income-gross-color.component.ts"]
end
subgraph 9R["income-gross-net-section"]
9S["income-gross-net-section.component.ts"]
end
subgraph 9T["income-growth-panel"]
9U["income-growth-panel.component.ts"]
end
subgraph 9V["income-intro"]
9W["income-intro.component.ts"]
end
subgraph 9X["income-main-category"]
9Y["income-main-category.component.ts"]
end
subgraph 9Z["income-overview"]
A0["income-overview.component.ts"]
end
subgraph A1["income-settings-page"]
A2["income-settings-page.component.ts"]
end
subgraph A3["income-yearly-panel"]
A4["income-yearly-panel.component.ts"]
end
A5["index.ts"]
subgraph A6["salary-details-page"]
A7["salary-details-page.component.ts"]
end
subgraph A8["salary-metadata-table"]
A9["salary-metadata-table.component.ts"]
end
subgraph AA["salary-month-modal"]
AB["salary-month-modal.component.ts"]
end
end
AC["gross-net-chart-options.ts"]
AD["income-category-vm.ts"]
AE["income-event-vm.ts"]
AF["income-granularity.ts"]
AG["income.routes.ts"]
AH["income.store.ts"]
AI["index.ts"]
AJ["salary-metadata-edit.ts"]
AK["salary-metadata-rows.ts"]
end
subgraph AL["feature-learning"]
subgraph AM["components"]
AN["index.ts"]
subgraph AO["learning-overview"]
AP["learning-overview.component.ts"]
end
subgraph AQ["model-status-badge"]
AR["model-status-badge.component.ts"]
end
subgraph AS["model-status"]
AT["model-status.component.ts"]
end
subgraph AU["rule-proposals"]
AV["rule-proposals.component.ts"]
end
subgraph AW["suggestions-table"]
AX["suggestions-table.component.ts"]
end
end
AY["index.ts"]
AZ["learning.routes.ts"]
B0["model-status-display.ts"]
end
subgraph B1["feature-recurring"]
B2["bills-calendar-vm.ts"]
subgraph B3["components"]
subgraph B4["bills-calendar"]
B5["bills-calendar.component.ts"]
end
subgraph B6["bills-day-list"]
B7["bills-day-list.component.ts"]
end
subgraph B8["bills-month-grid"]
B9["bills-month-grid.component.ts"]
end
BA["index.ts"]
subgraph BB["recurring-overview"]
BC["recurring-overview.component.ts"]
end
subgraph BD["recurring-payments-panel"]
BE["recurring-payments-panel.component.ts"]
end
end
BF["index.ts"]
BG["recurring-payments-row-vm.ts"]
BH["recurring-series.store.ts"]
BI["recurring.routes.ts"]
end
subgraph BJ["feature-settings"]
subgraph BK["components"]
BL["index.ts"]
subgraph BM["settings-about-section"]
BN["settings-about-section.component.ts"]
end
subgraph BO["settings-currency-locale-section"]
BP["settings-currency-locale-section.component.ts"]
end
subgraph BQ["settings-data-section"]
BR["settings-data-section.component.ts"]
end
subgraph BS["settings-overview"]
BT["settings-overview.component.ts"]
end
subgraph BU["settings-privacy-section"]
BV["settings-privacy-section.component.ts"]
end
subgraph BW["settings-theme-section"]
BX["settings-theme-section.component.ts"]
end
end
BY["index.ts"]
BZ["settings.routes.ts"]
end
subgraph C0["feature-transactions"]
C1["category-picker.ts"]
subgraph C2["components"]
subgraph C3["attribution-override-fieldset"]
C4["attribution-override-fieldset.component.ts"]
end
subgraph C5["category-select-cell"]
C6["category-select-cell.component.ts"]
end
C7["index.ts"]
subgraph C8["transaction-bulk-bar"]
C9["transaction-bulk-bar.component.ts"]
end
subgraph CA["transaction-edit-form"]
CB["transaction-edit-form.component.ts"]
end
subgraph CC["transaction-filters"]
CD["transaction-filters.component.ts"]
end
subgraph CE["transaction-row"]
CF["transaction-row.component.ts"]
end
subgraph CG["transactions-overview"]
CH["transactions-overview.component.ts"]
end
subgraph CI["transfer-review"]
CJ["transfer-review.component.ts"]
end
end
CK["index.ts"]
CL["transaction-filters.ts"]
CM["transaction-row-vm.ts"]
CN["transactions.routes.ts"]
end
subgraph CO["shared"]
subgraph CP["echarts"]
CQ["bucketed-axis-option.ts"]
CR["chart-theme.ts"]
CS["echarts-jsdom.testing.ts"]
CT["echarts-setup.ts"]
CU["index.ts"]
CV["legend-option.ts"]
CW["tooltip-formatter.ts"]
end
subgraph CX["ui"]
subgraph CY["alert"]
CZ["alert.component.ts"]
end
subgraph D0["badge"]
D1["badge.component.ts"]
end
subgraph D2["button"]
D3["button.component.ts"]
end
subgraph D4["collapse"]
D5["collapse.component.ts"]
end
subgraph D6["confirm-dialog"]
D7["confirm-dialog.component.ts"]
end
subgraph D8["cycle-picker"]
D9["cycle-picker.component.ts"]
end
subgraph DA["date-range-input"]
DB["date-range-input.component.ts"]
end
subgraph DC["divider"]
DD["divider.component.ts"]
end
subgraph DE["dropdown"]
DF["dropdown.component.ts"]
end
subgraph DG["empty-state"]
DH["empty-state.component.ts"]
end
subgraph DI["fieldset"]
DJ["fieldset.component.ts"]
end
subgraph DK["flex"]
DL["flex.component.ts"]
end
subgraph DM["granularity-picker"]
DN["granularity-picker.component.ts"]
end
DO["index.ts"]
subgraph DP["input"]
DQ["input.component.ts"]
end
subgraph DR["label"]
DS["label.component.ts"]
end
subgraph DT["loading-skeleton"]
DU["loading-skeleton.component.ts"]
end
subgraph DV["modal"]
DW["mm-modal.component.ts"]
end
subgraph DX["page-header"]
DY["page-header.component.ts"]
end
subgraph DZ["paginator"]
E0["paginator.component.ts"]
end
subgraph E1["paper"]
E2["paper.component.ts"]
end
subgraph E3["privacy-blur"]
E4["privacy-blur.component.ts"]
end
subgraph E5["privacy-toggle"]
E6["privacy-toggle.component.ts"]
end
subgraph E7["range-grouping-switcher"]
E8["range-grouping-switcher.component.ts"]
end
subgraph E9["select"]
EA["select.component.ts"]
end
subgraph EB["stat-card"]
EC["stat-card.component.ts"]
end
subgraph ED["table"]
EE["table.component.ts"]
end
subgraph EF["tabs"]
EG["tabs.component.ts"]
end
subgraph EH["typography"]
EI["typography.component.ts"]
end
end
subgraph EJ["utils"]
EK["calendar-cycles.ts"]
EL["confidence-color.ts"]
EM["confirm-state.ts"]
EN["currency-format.ts"]
EO["currency-symbol-presets.ts"]
EP["daisy-classes.ts"]
EQ["date-buckets.ts"]
ER["date-format.pipe.ts"]
ES["date-format.ts"]
ET["debounced-text.ts"]
EU["download-json.ts"]
EV["fingerprint.ts"]
EW["format-settings.testing.ts"]
EX["format-settings.ts"]
EY["hidden-amount.ts"]
EZ["iban.ts"]
F0["index.ts"]
F1["link-control-to-setting.ts"]
F2["locale-presets.ts"]
F3["number-format.ts"]
F4["pagination.ts"]
F5["percentage.ts"]
F6["search-params.ts"]
F7["selection-model.ts"]
F8["signed-amount.pipe.ts"]
F9["sortable.ts"]
FA["structural-filters.ts"]
FB["theme-hooks.ts"]
subgraph FC["validators"]
FD["iban.validator.ts"]
FE["percentage.validator.ts"]
end
FF["with-archivable.ts"]
FG["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3Q
5-->4
5-->6
6-->Q
6-->F0
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
G-->EV
G-->EX
H-->G
H-->3H
H-->F0
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
Y-->F0
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
15-->F0
16-->Y
16-->Z
16-->10
16-->12
16-->13
16-->14
16-->15
19-->1Z
19-->D3
19-->EI
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
1S-->F0
1T-->Q
1T-->3H
1T-->F0
1U-->22
1U-->Q
1U-->F0
1V-->1W
1V-->2U
1V-->CU
1V-->F0
1W-->2U
1W-->CU
1W-->F0
1X-->Q
1X-->2U
1Y-->Q
1Y-->F0
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
20-->F0
21-->F0
22-->Q
22-->3M
22-->3Q
23-->Q
24-->22
24-->23
24-->Q
24-->3Q
26-->Q
26-->F0
27-->26
27-->Q
27-->F0
28-->2A
28-->2P
28-->F0
29-->2G
29-->Q
2A-->29
2A-->Q
2A-->F0
2B-->29
2B-->2G
2B-->Q
2B-->F0
2C-->2G
2C-->Q
2D-->Q
2E-->29
2E-->31
2E-->Q
2F-->F0
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
2J-->F0
2K-->Q
2L-->Q
2L-->F0
2M-->F0
2N-->2O
2O-->2P
2O-->Q
2P-->2A
2P-->Q
2P-->F0
2Q-->2R
2Q-->2T
2Q-->38
2Q-->Q
2R-->2A
2R-->2P
2R-->F0
2S-->2P
2S-->3A
2S-->F0
2T-->2A
2T-->2J
2T-->2P
2T-->F0
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
2X-->F0
2Y-->3B
30-->2G
30-->Q
31-->F0
32-->F0
33-->2G
33-->B
33-->Q
33-->F0
34-->33
34-->F0
35-->30
35-->Q
35-->F0
36-->29
36-->2C
36-->Q
37-->Q
37-->3Q
38-->2O
39-->2G
39-->Q
39-->F0
3A-->30
3A-->Q
3B-->2A
3B-->Q
3B-->F0
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
3U-->F0
3W-->Q
3X-->Q
3Y-->Q
3Z-->Q
40-->4F
40-->4H
40-->CU
41-->2U
41-->F0
42-->Q
42-->1Z
42-->2U
42-->F0
45-->DO
45-->F0
47-->41
47-->42
47-->Q
47-->2U
47-->CU
47-->DO
47-->F0
49-->41
49-->42
49-->Q
49-->1Z
49-->2U
49-->CU
49-->DO
4B-->3W
4B-->3X
4B-->45
4B-->DO
4D-->3X
4D-->3Z
4D-->Q
4D-->DO
4D-->F0
4D-->FD
4D-->FE
4F-->45
4F-->47
4F-->4D
4F-->1Z
4F-->DO
4F-->F0
4H-->3W
4H-->3X
4H-->3Y
4H-->49
4H-->4B
4H-->4D
4H-->Q
4H-->1Z
4H-->DO
4H-->F0
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
4P-->DO
4S-->4M
4S-->4P
4S-->4U
4S-->B
4S-->Q
4S-->1Z
4S-->DO
4S-->F0
4U-->4M
4U-->Q
4U-->DO
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
4X-->DO
4Z-->58
4Z-->1Z
4Z-->DO
4Z-->F0
51-->57
51-->4X
51-->B
51-->Q
51-->1Z
51-->DO
53-->5A
53-->5C
53-->DO
53-->F0
55-->58
55-->5B
55-->5C
55-->4Z
55-->51
55-->53
55-->Q
55-->1Z
55-->DO
55-->F0
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
5C-->F0
5E-->5J
5H-->DO
5J-->5M
5J-->5N
5J-->5O
5J-->5P
5J-->5H
5J-->DO
5K-->5J
5O-->5M
5P-->5N
5Q-->5E
5Q-->5K
5S-->Q
5W-->1Z
5W-->DO
5W-->F0
5Y-->1Z
5Y-->3Q
5Y-->DO
5Y-->F0
60-->6O
60-->1Z
60-->2U
60-->CU
60-->DO
60-->F0
62-->5S
62-->5T
62-->6O
62-->64
62-->66
62-->1Z
62-->DO
62-->F0
64-->1Z
64-->DO
66-->5T
66-->DO
68-->6K
68-->6L
68-->Q
68-->DO
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
6A-->DO
6A-->F0
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
6D-->CU
6D-->DO
6D-->F0
6F-->6O
6F-->1Z
6F-->DO
6F-->F0
6H-->1Z
6H-->2U
6H-->3Q
6H-->CU
6H-->DO
6H-->F0
6J-->6O
6J-->1Z
6J-->DO
6J-->F0
6K-->6L
6K-->Q
6L-->Q
6M-->6A
6M-->CU
6N-->6B
6N-->6M
6O-->5S
6O-->1Z
6O-->2U
6O-->3Q
6S-->Q
6S-->3D
6S-->DO
6S-->F0
6T-->6S
6U-->6T
6Y-->71
6Y-->73
6Y-->1Z
6Y-->DO
6Z-->6Y
6Z-->71
6Z-->73
71-->1Z
71-->2U
71-->CU
71-->DO
71-->F0
73-->Q
73-->1Z
73-->2U
73-->3Q
73-->CU
73-->DO
73-->F0
74-->6Y
74-->CU
75-->6Z
75-->74
79-->7J
79-->DO
7B-->7H
7B-->DO
7D-->Q
7D-->DO
7F-->7M
7F-->DO
7H-->7J
7H-->7K
7H-->7M
7H-->79
7H-->7D
7H-->7F
7H-->Q
7H-->1Z
7H-->DO
7H-->F0
7I-->79
7I-->7B
7I-->7D
7I-->7F
7I-->7H
7J-->2U
7J-->DO
7J-->F0
7K-->1Z
7K-->2U
7K-->3Q
7L-->7B
7L-->CU
7M-->Q
7M-->2U
7M-->DO
7M-->F0
7N-->7I
7N-->7J
7N-->7K
7N-->7L
7N-->7M
7R-->80
7R-->DO
7T-->81
7T-->7V
7T-->DO
7V-->81
7V-->DO
7X-->81
7X-->DO
7Y-->7R
7Y-->7T
7Y-->7V
7Y-->7X
82-->7R
82-->7T
82-->7X
83-->7Y
83-->81
83-->82
87-->1D
87-->DO
88-->87
89-->87
8A-->88
8A-->89
8C-->Q
8F-->98
8F-->4J
8F-->DO
8H-->DO
8J-->8N
8J-->DO
8L-->8N
8L-->DO
8N-->DO
8P-->8C
8P-->8N
8P-->DO
8R-->9C
8R-->DO
8T-->8C
8T-->DO
8V-->8C
8V-->9C
8V-->9D
8V-->8J
8V-->8L
8V-->8P
8V-->8R
8V-->8T
8V-->8X
8V-->Q
8V-->16
8V-->DO
8X-->16
8X-->DO
8X-->F0
8Z-->98
8Z-->9D
8Z-->96
8Z-->Q
8Z-->16
8Z-->DO
91-->Q
91-->DO
93-->99
93-->8H
93-->8V
93-->8Z
93-->91
93-->1Z
93-->DO
94-->8V
94-->8X
94-->8Z
94-->91
94-->93
96-->98
96-->8F
96-->Q
96-->DO
97-->B
97-->Q
97-->16
97-->1Z
98-->Q
99-->8C
99-->97
99-->98
99-->9D
99-->Q
99-->16
99-->1Z
99-->4J
9A-->93
9B-->8C
9B-->94
9B-->97
9B-->98
9B-->9A
9B-->9C
9B-->9D
9C-->8C
9D-->Q
9F-->2U
9I-->9F
9I-->AH
9I-->DO
9I-->F0
9K-->AD
9K-->DO
9M-->DO
9O-->AE
9O-->AF
9O-->AH
9O-->1Z
9O-->2U
9O-->DO
9Q-->AH
9Q-->3H
9Q-->CU
9Q-->DO
9S-->AC
9S-->AH
9S-->9M
9S-->1Z
9S-->2U
9S-->CU
9S-->DO
9S-->F0
9U-->AF
9U-->AH
9U-->1Z
9U-->2U
9U-->DO
9U-->F0
9W-->1Z
9W-->83
9W-->DO
9Y-->AD
9Y-->AH
9Y-->DO
A0-->AH
A0-->AK
A0-->9O
A0-->9S
A0-->9U
A0-->9W
A0-->A4
A0-->AB
A0-->1Z
A0-->2U
A0-->83
A0-->CU
A0-->DO
A0-->F0
A2-->AD
A2-->AH
A2-->9I
A2-->9K
A2-->9Q
A2-->9Y
A2-->DO
A4-->AH
A4-->1Z
A4-->2U
A4-->3Q
A4-->CU
A4-->DO
A4-->F0
A5-->9I
A5-->9K
A5-->9M
A5-->9O
A5-->9S
A5-->9U
A5-->9W
A5-->9Y
A5-->A0
A5-->A2
A5-->A4
A5-->A7
A5-->A9
A5-->AB
A7-->A9
A7-->DO
A9-->AF
A9-->AH
A9-->AJ
A9-->AK
A9-->DO
A9-->F0
AB-->AH
AB-->AJ
AB-->AK
AB-->A9
AB-->Q
AB-->DO
AC-->2U
AC-->CU
AC-->F0
AD-->Q
AE-->AF
AE-->Q
AE-->2U
AE-->DO
AE-->F0
AF-->F0
AG-->A0
AG-->A2
AG-->A7
AG-->CU
AH-->9F
AH-->AF
AH-->Q
AH-->1Z
AH-->2U
AH-->3H
AH-->3Q
AI-->A5
AI-->AD
AI-->AF
AI-->AG
AI-->AH
AI-->AJ
AI-->AK
AJ-->Q
AK-->Q
AN-->AP
AN-->AT
AN-->AV
AN-->AX
AP-->AR
AP-->AT
AP-->AV
AP-->AX
AP-->DO
AR-->B0
AR-->56
AR-->DO
AT-->B0
AT-->1I
AT-->1Z
AT-->56
AT-->DO
AV-->Q
AV-->1I
AV-->1Z
AV-->56
AV-->DO
AV-->F0
AX-->Q
AX-->1Z
AX-->56
AX-->DO
AX-->F0
AY-->AN
AY-->AZ
AZ-->AP
B0-->56
B0-->DO
B2-->DO
B5-->B2
B5-->BH
B5-->B7
B5-->B9
B5-->1Z
B5-->2U
B5-->DO
B5-->F0
B7-->B2
B7-->DO
B9-->B2
B9-->DO
BA-->B5
BA-->B7
BA-->B9
BA-->BC
BA-->BE
BC-->B5
BC-->BE
BC-->1Z
BC-->DO
BE-->BG
BE-->BH
BE-->1Z
BE-->2U
BE-->CU
BE-->DO
BE-->F0
BF-->BA
BF-->BI
BH-->1Z
BH-->2U
BH-->3Q
BI-->BC
BL-->BT
BN-->1D
BN-->DO
BP-->1Z
BP-->DO
BP-->F0
BR-->6U
BR-->DO
BT-->BN
BT-->BP
BT-->BR
BT-->BV
BT-->BX
BT-->DO
BV-->1Z
BV-->DO
BV-->F0
BX-->1Z
BX-->3H
BX-->DO
BY-->BL
BY-->BZ
BZ-->BT
C1-->Q
C4-->Q
C4-->1Z
C4-->3M
C4-->DO
C4-->F0
C6-->C1
C7-->C9
C7-->CB
C7-->CD
C7-->CH
C7-->CJ
C9-->C1
C9-->B
C9-->1Z
C9-->DO
CB-->C1
CB-->C4
CB-->B
CB-->Q
CB-->1Z
CB-->3M
CB-->56
CB-->DO
CD-->C1
CD-->CL
CD-->B
CD-->1Z
CD-->DO
CD-->F0
CF-->C1
CF-->CM
CF-->C6
CF-->DO
CF-->F0
CH-->C1
CH-->CL
CH-->CM
CH-->C9
CH-->CB
CH-->CD
CH-->CF
CH-->CJ
CH-->B
CH-->Q
CH-->1Z
CH-->3Q
CH-->56
CH-->DO
CH-->F0
CJ-->1Z
CJ-->3Q
CJ-->DO
CJ-->F0
CK-->CN
CL-->Q
CL-->3Q
CM-->Q
CN-->CH
CU-->CQ
CU-->CR
CU-->CT
CU-->CV
CU-->CW
CW-->F0
CZ-->F0
D1-->F0
D3-->F0
D5-->F0
D7-->D3
D7-->DS
D7-->DW
D7-->EI
D9-->F0
DB-->DF
DB-->F0
DD-->F0
DF-->F0
DH-->DL
DH-->EI
DJ-->F0
DL-->F0
DO-->CZ
DO-->D1
DO-->D3
DO-->D5
DO-->D7
DO-->D9
DO-->DB
DO-->DD
DO-->DF
DO-->DH
DO-->DJ
DO-->DL
DO-->DN
DO-->DQ
DO-->DS
DO-->DU
DO-->DW
DO-->DY
DO-->E0
DO-->E2
DO-->E4
DO-->E6
DO-->E8
DO-->EA
DO-->EC
DO-->EE
DO-->EG
DO-->EI
DQ-->F0
DS-->F0
DU-->DL
DW-->F0
DY-->DL
DY-->EI
E0-->D3
E0-->DL
E0-->EI
E0-->F0
E2-->F0
E4-->F0
E6-->D3
E6-->1Z
E8-->D3
E8-->DB
E8-->DL
EA-->F0
EC-->E4
EC-->EI
EC-->F0
EE-->F0
EG-->F0
EI-->F0
EK-->ES
EN-->EX
EQ-->EX
ER-->ES
ES-->EX
EW-->EX
F0-->EK
F0-->EL
F0-->EM
F0-->EN
F0-->EO
F0-->EP
F0-->EQ
F0-->ES
F0-->ER
F0-->ET
F0-->EU
F0-->EV
F0-->EX
F0-->EY
F0-->EZ
F0-->F1
F0-->F2
F0-->F3
F0-->F4
F0-->F5
F0-->F6
F0-->F7
F0-->F8
F0-->F9
F0-->FA
F0-->FB
F0-->FF
F0-->FG
F3-->EX
F8-->EN
```
