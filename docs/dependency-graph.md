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
- 393 leaf nodes, 1189 edges.
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
R["loans.repository.ts"]
S["mapping-profiles.repository.ts"]
T["rules.repository.ts"]
U["salary-metadata.repository.ts"]
V["transactions.repository.ts"]
W["transfer-settings.repository.ts"]
X["transfers.repository.ts"]
end
subgraph Y["import"]
Z["account-detection.ts"]
10["csv-import.service.ts"]
11["csv-parse.ts"]
12["csv-parse.worker.ts"]
13["csv-row-mapper.ts"]
14["csv-worker.types.ts"]
15["delimiter-guess.ts"]
16["import.service.ts"]
17["index.ts"]
end
subgraph 18["layout"]
subgraph 19["app-shell"]
1A["app-shell.component.ts"]
end
1B["index.ts"]
end
subgraph 1C["links"]
1D["external-links.ts"]
1E["index.ts"]
end
subgraph 1F["ml"]
1G["category-model.worker.ts"]
1H["category-model.worker.types.ts"]
1I["feature-hashing.ts"]
1J["index.ts"]
1K["model-config.ts"]
1L["rule-proposal-mining.ts"]
1M["training-window.ts"]
end
subgraph 1N["onboarding"]
1O["home-redirect.guard.ts"]
1P["index.ts"]
1Q["mark-visited.guard.ts"]
1R["visited.service.ts"]
end
subgraph 1S["state"]
1T["accounts.store.ts"]
1U["app-settings.store.ts"]
1V["categories.store.ts"]
1W["chart-options-control.ts"]
1X["chart-options.store.ts"]
1Y["forecast-settings.store.ts"]
1Z["goals.store.ts"]
20["index.ts"]
21["page-range-control.ts"]
22["range-state.store.ts"]
23["transactions.store.ts"]
24["transfer-settings.store.ts"]
25["transfers.store.ts"]
end
subgraph 26["stats"]
27["account-balance-history.ts"]
28["account-balance-trend.ts"]
29["annual-lump-sum-smoothing.ts"]
2A["category-breakdown.ts"]
2B["category-composition-trend.ts"]
2C["category-cycle-heatmap.ts"]
2D["category-expense-transactions.ts"]
2E["category-kind-contribution.ts"]
2F["category-period-comparison.ts"]
2G["chart-zoom-window.ts"]
2H["classify-for-stats.ts"]
2I["classify-joint-leg.ts"]
2J["day-transactions.ts"]
2K["embedded-bonus-smoothing.ts"]
2L["full-history-range.ts"]
2M["goal-affordability.ts"]
2N["granularity-for-span.ts"]
2O["gross-net-growth.ts"]
2P["gross-net-ratio.ts"]
2Q["income-category-series.ts"]
2R["income-events.ts"]
2S["income-gap-detection.ts"]
2T["income-growth.ts"]
2U["income-step-change-detection.ts"]
2V["index.ts"]
2W["joint-account-stake.ts"]
2X["joint-contributor-breakdown.ts"]
2Y["money-flow-graph.ts"]
2Z["multi-year-income-comparison.ts"]
30["net-margin.ts"]
31["net-worth-projection.ts"]
32["period-stats.ts"]
33["period-window.ts"]
34["periodized-rate.ts"]
35["recurring-payments.ts"]
36["recurring-projection.ts"]
37["required-saving-rate.ts"]
38["saving-velocity.ts"]
39["spending-mosaic.ts"]
3A["top-transactions.ts"]
3B["wage-change-detection.ts"]
3C["weekday-weekend-split.ts"]
3D["year-over-year.ts"]
3E["yearly-income-summary.ts"]
end
subgraph 3F["storage"]
3G["index.ts"]
3H["storage-status.service.ts"]
end
subgraph 3I["theme"]
3J["accent-colors.ts"]
3K["index.ts"]
3L["theme-styles.ts"]
3M["theme.service.ts"]
end
subgraph 3N["transactions"]
3O["attribution-override.ts"]
3P["index.ts"]
3Q["nullify-transaction.ts"]
3R["transaction-deletion.service.ts"]
end
subgraph 3S["transfers"]
3T["index.ts"]
3U["transfer-cleanup.service.ts"]
3V["transfer-linking.service.ts"]
3W["transfer-matching.service.ts"]
3X["transfer-matching.ts"]
end
end
subgraph 3Y["feature-accounts"]
3Z["account-card-vm.ts"]
40["account-icons.ts"]
41["account-list-order.ts"]
42["account-types.ts"]
43["accounts.routes.ts"]
44["balance-day-tooltip.ts"]
45["balance-trend-signals.ts"]
subgraph 46["components"]
subgraph 47["account-balance-block"]
48["account-balance-block.component.ts"]
end
subgraph 49["account-balance-chart"]
4A["account-balance-chart.component.ts"]
end
subgraph 4B["account-balance-history-chart"]
4C["account-balance-history-chart.component.ts"]
end
subgraph 4D["account-card"]
4E["account-card.component.ts"]
end
subgraph 4F["account-form"]
4G["account-form.component.ts"]
end
subgraph 4H["accounts-detail"]
4I["accounts-detail.component.ts"]
end
subgraph 4J["accounts-overview"]
4K["accounts-overview.component.ts"]
end
4L["index.ts"]
end
4M["index.ts"]
end
subgraph 4N["feature-categories"]
4O["categories.routes.ts"]
4P["category-icons.ts"]
4Q["category-model.service.ts"]
4R["category-model.store.ts"]
4S["category-row-vm.ts"]
subgraph 4T["components"]
subgraph 4U["categories-overview"]
4V["categories-overview.component.ts"]
end
subgraph 4W["category-form"]
4X["category-form.component.ts"]
end
4Y["index.ts"]
subgraph 4Z["rule-condition-row"]
50["rule-condition-row.component.ts"]
end
subgraph 51["rule-filters"]
52["rule-filters.component.ts"]
end
subgraph 53["rule-form"]
54["rule-form.component.ts"]
end
subgraph 55["rule-share-bar"]
56["rule-share-bar.component.ts"]
end
subgraph 57["rules-overview"]
58["rules-overview.component.ts"]
end
end
59["index.ts"]
5A["rule-condition-editor.ts"]
5B["rule-filters.ts"]
5C["rule-labels.ts"]
5D["rule-share.ts"]
5E["rule-summary.ts"]
5F["rules.store.ts"]
end
subgraph 5G["feature-changelog"]
5H["changelog.routes.ts"]
subgraph 5I["components"]
subgraph 5J["changelog-entry-row"]
5K["changelog-entry-row.component.ts"]
end
subgraph 5L["changelog-page"]
5M["changelog-page.component.ts"]
end
5N["index.ts"]
end
subgraph 5O["data"]
5P["changelog-entries.ts"]
5Q["roadmap-entries.ts"]
end
5R["group-changelog-entries.ts"]
5S["group-roadmap-entries.ts"]
5T["index.ts"]
end
subgraph 5U["feature-dashboard"]
5V["category-comparison-settings.store.ts"]
5W["category-comparison-vm.ts"]
subgraph 5X["components"]
subgraph 5Y["account-balance-strip"]
5Z["account-balance-strip.component.ts"]
end
subgraph 60["action-queue-panel"]
61["action-queue-panel.component.ts"]
end
subgraph 62["category-breakdown-panel"]
63["category-breakdown-panel.component.ts"]
end
subgraph 64["category-comparison-panel"]
65["category-comparison-panel.component.ts"]
end
subgraph 66["category-exclusion-dropdown"]
67["category-exclusion-dropdown.component.ts"]
end
subgraph 68["comparison-category-card"]
69["comparison-category-card.component.ts"]
end
subgraph 6A["dashboard-customize-panel"]
6B["dashboard-customize-panel.component.ts"]
end
subgraph 6C["dashboard-overview"]
6D["dashboard-overview.component.ts"]
end
6E["index.ts"]
subgraph 6F["spending-heatmap-panel"]
6G["spending-heatmap-panel.component.ts"]
end
subgraph 6H["top-transactions-panel"]
6I["top-transactions-panel.component.ts"]
end
subgraph 6J["trend-chart-panel"]
6K["trend-chart-panel.component.ts"]
end
subgraph 6L["weekday-weekend-split-panel"]
6M["weekday-weekend-split-panel.component.ts"]
end
end
6N["dashboard-layout-settings.store.ts"]
6O["dashboard-row-order.ts"]
6P["dashboard.routes.ts"]
6Q["index.ts"]
6R["stats.store.ts"]
end
subgraph 6S["feature-data-management"]
subgraph 6T["components"]
subgraph 6U["data-management-overview"]
6V["data-management-overview.component.ts"]
end
6W["index.ts"]
end
6X["index.ts"]
end
subgraph 6Y["feature-explore"]
subgraph 6Z["components"]
subgraph 70["explore-overview"]
71["explore-overview.component.ts"]
end
72["index.ts"]
subgraph 73["money-flow-panel"]
74["money-flow-panel.component.ts"]
end
subgraph 75["spending-mosaic-panel"]
76["spending-mosaic-panel.component.ts"]
end
end
77["explore.routes.ts"]
78["index.ts"]
end
subgraph 79["feature-future"]
subgraph 7A["components"]
subgraph 7B["forecast-controls"]
7C["forecast-controls.component.ts"]
end
subgraph 7D["forecast-notice"]
7E["forecast-notice.component.ts"]
end
subgraph 7F["future-overview"]
7G["future-overview.component.ts"]
end
subgraph 7H["goal-form"]
7I["goal-form.component.ts"]
end
subgraph 7J["goal-row"]
7K["goal-row.component.ts"]
end
subgraph 7L["goals-panel"]
7M["goals-panel.component.ts"]
end
7N["index.ts"]
subgraph 7O["net-worth-projection-chart"]
7P["net-worth-projection-chart.component.ts"]
end
subgraph 7Q["projection-figure-table"]
7R["projection-figure-table.component.ts"]
end
end
7S["forecast-chart-copy.ts"]
7T["forecast-controls-vm.ts"]
7U["forecast-notices.ts"]
7V["forecast.store.ts"]
7W["future.routes.ts"]
7X["goal-row-vm.ts"]
7Y["index.ts"]
7Z["net-worth-projection-chart-option.ts"]
80["projection-accessible-row.ts"]
end
subgraph 81["feature-help"]
subgraph 82["components"]
subgraph 83["faq-page"]
84["faq-page.component.ts"]
end
subgraph 85["guide-detail"]
86["guide-detail.component.ts"]
end
subgraph 87["guide-steps"]
88["guide-steps.component.ts"]
end
subgraph 89["guides-index"]
8A["guides-index.component.ts"]
end
8B["index.ts"]
end
subgraph 8C["data"]
8D["faq.ts"]
8E["guides.ts"]
end
8F["help.routes.ts"]
8G["index.ts"]
end
subgraph 8H["feature-home"]
subgraph 8I["components"]
subgraph 8J["home-landing"]
8K["home-landing.component.ts"]
end
8L["index.ts"]
end
8M["home.routes.ts"]
8N["index.ts"]
end
subgraph 8O["feature-import"]
8P["column-mapping.ts"]
subgraph 8Q["components"]
subgraph 8R["account-draft-editor"]
8S["account-draft-editor.component.ts"]
end
subgraph 8T["batch-wait-card"]
8U["batch-wait-card.component.ts"]
end
subgraph 8V["column-map-amount-field"]
8W["column-map-amount-field.component.ts"]
end
subgraph 8X["column-map-counterparty-field"]
8Y["column-map-counterparty-field.component.ts"]
end
subgraph 8Z["column-map-sample-caption"]
90["column-map-sample-caption.component.ts"]
end
subgraph 91["column-map-simple-field"]
92["column-map-simple-field.component.ts"]
end
subgraph 93["column-map-stepper"]
94["column-map-stepper.component.ts"]
end
subgraph 95["column-map-summary-step"]
96["column-map-summary-step.component.ts"]
end
subgraph 97["import-map-step"]
98["import-map-step.component.ts"]
end
subgraph 99["import-preview-step"]
9A["import-preview-step.component.ts"]
end
subgraph 9B["import-select-step"]
9C["import-select-step.component.ts"]
end
subgraph 9D["import-summary-step"]
9E["import-summary-step.component.ts"]
end
subgraph 9F["import-wizard"]
9G["import-wizard.component.ts"]
end
9H["index.ts"]
subgraph 9I["queued-file-row"]
9J["queued-file-row.component.ts"]
end
end
9K["import-batches.store.ts"]
9L["import-queue.ts"]
9M["import-wizard-session.ts"]
9N["import.routes.ts"]
9O["index.ts"]
9P["mapper-steps.ts"]
9Q["mapping-profiles.store.ts"]
end
subgraph 9R["feature-income"]
9S["career-start-date.ts"]
subgraph 9T["components"]
subgraph 9U["income-career-start"]
9V["income-career-start.component.ts"]
end
subgraph 9W["income-category-checklist"]
9X["income-category-checklist.component.ts"]
end
subgraph 9Y["income-chart-cell"]
9Z["income-chart-cell.component.ts"]
end
subgraph A0["income-events-sidebar"]
A1["income-events-sidebar.component.ts"]
end
subgraph A2["income-gross-color"]
A3["income-gross-color.component.ts"]
end
subgraph A4["income-gross-net-section"]
A5["income-gross-net-section.component.ts"]
end
subgraph A6["income-growth-panel"]
A7["income-growth-panel.component.ts"]
end
subgraph A8["income-intro"]
A9["income-intro.component.ts"]
end
subgraph AA["income-main-category"]
AB["income-main-category.component.ts"]
end
subgraph AC["income-overview"]
AD["income-overview.component.ts"]
end
subgraph AE["income-settings-page"]
AF["income-settings-page.component.ts"]
end
subgraph AG["income-yearly-panel"]
AH["income-yearly-panel.component.ts"]
end
AI["index.ts"]
subgraph AJ["salary-details-page"]
AK["salary-details-page.component.ts"]
end
subgraph AL["salary-metadata-table"]
AM["salary-metadata-table.component.ts"]
end
subgraph AN["salary-month-modal"]
AO["salary-month-modal.component.ts"]
end
end
AP["gross-net-chart-options.ts"]
AQ["income-category-vm.ts"]
AR["income-event-vm.ts"]
AS["income-granularity.ts"]
AT["income.routes.ts"]
AU["income.store.ts"]
AV["index.ts"]
AW["salary-metadata-edit.ts"]
AX["salary-metadata-rows.ts"]
end
subgraph AY["feature-learning"]
subgraph AZ["components"]
B0["index.ts"]
subgraph B1["learning-overview"]
B2["learning-overview.component.ts"]
end
subgraph B3["model-status-badge"]
B4["model-status-badge.component.ts"]
end
subgraph B5["model-status"]
B6["model-status.component.ts"]
end
subgraph B7["rule-proposals"]
B8["rule-proposals.component.ts"]
end
subgraph B9["suggestions-table"]
BA["suggestions-table.component.ts"]
end
end
BB["index.ts"]
BC["learning.routes.ts"]
BD["model-status-display.ts"]
end
subgraph BE["feature-recurring"]
BF["bills-calendar-vm.ts"]
subgraph BG["components"]
subgraph BH["bills-calendar"]
BI["bills-calendar.component.ts"]
end
subgraph BJ["bills-day-list"]
BK["bills-day-list.component.ts"]
end
subgraph BL["bills-month-grid"]
BM["bills-month-grid.component.ts"]
end
BN["index.ts"]
subgraph BO["recurring-overview"]
BP["recurring-overview.component.ts"]
end
subgraph BQ["recurring-payments-panel"]
BR["recurring-payments-panel.component.ts"]
end
end
BS["index.ts"]
BT["recurring-payments-row-vm.ts"]
BU["recurring-series.store.ts"]
BV["recurring.routes.ts"]
end
subgraph BW["feature-settings"]
subgraph BX["components"]
BY["index.ts"]
subgraph BZ["settings-about-section"]
C0["settings-about-section.component.ts"]
end
subgraph C1["settings-currency-locale-section"]
C2["settings-currency-locale-section.component.ts"]
end
subgraph C3["settings-data-section"]
C4["settings-data-section.component.ts"]
end
subgraph C5["settings-overview"]
C6["settings-overview.component.ts"]
end
subgraph C7["settings-privacy-section"]
C8["settings-privacy-section.component.ts"]
end
subgraph C9["settings-reporting-section"]
CA["settings-reporting-section.component.ts"]
end
subgraph CB["settings-theme-section"]
CC["settings-theme-section.component.ts"]
end
end
CD["index.ts"]
CE["settings.routes.ts"]
end
subgraph CF["feature-transactions"]
CG["category-picker.ts"]
subgraph CH["components"]
subgraph CI["attribution-override-fieldset"]
CJ["attribution-override-fieldset.component.ts"]
end
subgraph CK["category-select-cell"]
CL["category-select-cell.component.ts"]
end
CM["index.ts"]
subgraph CN["transaction-bulk-bar"]
CO["transaction-bulk-bar.component.ts"]
end
subgraph CP["transaction-edit-form"]
CQ["transaction-edit-form.component.ts"]
end
subgraph CR["transaction-filters"]
CS["transaction-filters.component.ts"]
end
subgraph CT["transaction-row"]
CU["transaction-row.component.ts"]
end
subgraph CV["transactions-overview"]
CW["transactions-overview.component.ts"]
end
subgraph CX["transfer-review"]
CY["transfer-review.component.ts"]
end
end
CZ["index.ts"]
D0["transaction-filters.ts"]
D1["transaction-row-vm.ts"]
D2["transactions.routes.ts"]
end
subgraph D3["shared"]
subgraph D4["echarts"]
D5["bucketed-axis-option.ts"]
D6["chart-theme.ts"]
D7["echarts-jsdom.testing.ts"]
D8["echarts-setup.ts"]
D9["index.ts"]
DA["legend-option.ts"]
DB["tooltip-formatter.ts"]
end
subgraph DC["ui"]
subgraph DD["absolute-range-panel"]
DE["absolute-range-panel.component.ts"]
end
subgraph DF["alert"]
DG["alert.component.ts"]
end
subgraph DH["badge"]
DI["badge.component.ts"]
end
subgraph DJ["button"]
DK["button.component.ts"]
end
subgraph DL["collapse"]
DM["collapse.component.ts"]
end
subgraph DN["confirm-dialog"]
DO["confirm-dialog.component.ts"]
end
subgraph DP["cycle-picker"]
DQ["cycle-picker.component.ts"]
end
subgraph DR["date-range-input"]
DS["date-range-input.component.ts"]
end
subgraph DT["divider"]
DU["divider.component.ts"]
end
subgraph DV["dropdown"]
DW["dropdown.component.ts"]
end
subgraph DX["empty-state"]
DY["empty-state.component.ts"]
end
subgraph DZ["fieldset"]
E0["fieldset.component.ts"]
end
subgraph E1["flex"]
E2["flex.component.ts"]
end
subgraph E3["granularity-picker"]
E4["granularity-picker.component.ts"]
end
E5["index.ts"]
subgraph E6["input"]
E7["input.component.ts"]
end
subgraph E8["label"]
E9["label.component.ts"]
end
subgraph EA["loading-skeleton"]
EB["loading-skeleton.component.ts"]
end
subgraph EC["modal"]
ED["mm-modal.component.ts"]
end
subgraph EE["page-header"]
EF["page-header.component.ts"]
end
subgraph EG["paginator"]
EH["paginator.component.ts"]
end
subgraph EI["paper"]
EJ["paper.component.ts"]
end
subgraph EK["privacy-blur"]
EL["privacy-blur.component.ts"]
end
subgraph EM["privacy-toggle"]
EN["privacy-toggle.component.ts"]
end
subgraph EO["range-picker"]
EP["range-picker.component.ts"]
end
subgraph EQ["select"]
ER["select.component.ts"]
end
subgraph ES["stat-card"]
ET["stat-card.component.ts"]
end
subgraph EU["table"]
EV["table.component.ts"]
end
subgraph EW["tabs"]
EX["tabs.component.ts"]
end
subgraph EY["typography"]
EZ["typography.component.ts"]
end
end
subgraph F0["utils"]
F1["calendar-cycles.ts"]
F2["confidence-color.ts"]
F3["confirm-state.ts"]
F4["currency-format.ts"]
F5["currency-symbol-presets.ts"]
F6["daisy-classes.ts"]
F7["date-buckets.ts"]
F8["date-format.pipe.ts"]
F9["date-format.ts"]
FA["debounced-text.ts"]
FB["download-json.ts"]
FC["fingerprint.ts"]
FD["format-settings.testing.ts"]
FE["format-settings.ts"]
FF["hidden-amount.ts"]
FG["iban.ts"]
FH["index.ts"]
FI["link-control-to-setting.ts"]
FJ["locale-presets.ts"]
FK["number-format.ts"]
FL["pagination.ts"]
FM["percentage.ts"]
FN["quick-ranges.ts"]
FO["range-expression.ts"]
FP["search-params.ts"]
FQ["selection-model.ts"]
FR["signed-amount.pipe.ts"]
FS["sortable.ts"]
FT["structural-filters.ts"]
FU["theme-hooks.ts"]
subgraph FV["validators"]
FW["iban.validator.ts"]
FX["percentage.validator.ts"]
end
FY["with-archivable.ts"]
FZ["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3T
5-->4
5-->6
6-->Q
6-->FH
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
G-->1K
G-->38
G-->3J
G-->FC
G-->FE
H-->G
H-->3K
H-->FH
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->2V
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
Q-->X
R-->G
S-->G
T-->G
U-->G
V-->G
W-->G
X-->G
Z-->Q
Z-->FH
10-->14
10-->Q
11-->13
11-->14
12-->11
12-->14
13-->Q
14-->13
14-->Q
16-->13
16-->Q
16-->3T
16-->FH
17-->Z
17-->10
17-->11
17-->13
17-->14
17-->15
17-->16
1A-->20
1A-->DK
1A-->EZ
1B-->1A
1E-->1D
1G-->1H
1G-->1I
1G-->1K
1H-->1K
1I-->1K
1J-->1H
1J-->1I
1J-->1K
1J-->1L
1J-->1M
1L-->B
1L-->Q
1O-->1R
1P-->1O
1P-->1Q
1P-->1R
1Q-->1R
1T-->1V
1T-->23
1T-->25
1T-->5
1T-->Q
1T-->2V
1T-->3T
1T-->FH
1U-->Q
1U-->3K
1U-->FH
1V-->23
1V-->Q
1V-->FH
1W-->1X
1W-->2V
1W-->D9
1W-->FH
1X-->2V
1X-->D9
1X-->FH
1Y-->Q
1Y-->2V
1Z-->Q
1Z-->FH
20-->1T
20-->1U
20-->1V
20-->1W
20-->1X
20-->1Y
20-->1Z
20-->21
20-->22
20-->23
20-->24
20-->25
21-->1T
21-->1U
21-->22
21-->23
21-->Q
21-->2V
21-->FH
22-->1U
22-->FH
23-->Q
23-->3P
23-->3T
24-->Q
25-->23
25-->24
25-->Q
25-->3T
27-->Q
27-->FH
28-->27
28-->Q
28-->FH
29-->2B
29-->2Q
29-->FH
2A-->2H
2A-->Q
2B-->2A
2B-->Q
2B-->FH
2C-->2A
2C-->2H
2C-->Q
2C-->FH
2D-->2H
2D-->Q
2E-->Q
2F-->2A
2F-->33
2F-->Q
2G-->FH
2H-->2E
2H-->2I
2H-->Q
2H-->3T
2I-->5
2I-->Q
2J-->Q
2K-->2B
2K-->2Q
2K-->Q
2K-->FH
2L-->Q
2M-->Q
2M-->FH
2N-->FH
2O-->2P
2P-->2Q
2P-->Q
2Q-->2B
2Q-->Q
2Q-->FH
2R-->2S
2R-->2U
2R-->3B
2R-->Q
2S-->2B
2S-->2Q
2S-->FH
2T-->2Q
2T-->3D
2T-->FH
2U-->2B
2U-->2K
2U-->2Q
2U-->FH
2V-->27
2V-->28
2V-->29
2V-->2A
2V-->2B
2V-->2C
2V-->2D
2V-->2E
2V-->2F
2V-->2G
2V-->2H
2V-->2I
2V-->2J
2V-->2K
2V-->2L
2V-->2M
2V-->2N
2V-->2O
2V-->2P
2V-->2Q
2V-->2R
2V-->2S
2V-->2T
2V-->2U
2V-->2W
2V-->2X
2V-->2Y
2V-->2Z
2V-->30
2V-->31
2V-->32
2V-->33
2V-->34
2V-->35
2V-->36
2V-->37
2V-->38
2V-->39
2V-->3A
2V-->3B
2V-->3C
2V-->3D
2V-->3E
2W-->2I
2W-->Q
2X-->2I
2X-->5
2X-->Q
2Y-->Q
2Y-->FH
2Z-->3E
31-->FH
32-->2H
32-->Q
33-->FH
34-->FH
35-->2H
35-->B
35-->Q
35-->FH
36-->35
36-->FH
37-->Q
37-->FH
38-->32
38-->Q
38-->FH
39-->2A
39-->2D
39-->Q
3A-->Q
3A-->3T
3B-->2P
3C-->2H
3C-->Q
3C-->FH
3D-->32
3D-->Q
3E-->2B
3E-->Q
3E-->FH
3G-->3H
3J-->3L
3K-->3J
3K-->3L
3K-->3M
3M-->3L
3O-->Q
3P-->3O
3P-->3Q
3P-->3R
3Q-->Q
3R-->Q
3R-->3T
3T-->3U
3T-->3V
3T-->3X
3T-->3W
3U-->Q
3V-->3X
3V-->Q
3W-->3V
3W-->3X
3W-->Q
3X-->6
3X-->Q
3X-->FH
3Z-->Q
40-->Q
41-->Q
42-->Q
43-->4I
43-->4K
43-->D9
44-->2V
44-->FH
45-->Q
45-->20
45-->2V
45-->FH
48-->E5
48-->FH
4A-->44
4A-->45
4A-->Q
4A-->2V
4A-->D9
4A-->E5
4A-->FH
4C-->44
4C-->45
4C-->Q
4C-->20
4C-->2V
4C-->D9
4C-->E5
4E-->3Z
4E-->40
4E-->48
4E-->E5
4G-->40
4G-->42
4G-->Q
4G-->E5
4G-->FH
4G-->FW
4G-->FX
4I-->48
4I-->4A
4I-->4G
4I-->20
4I-->E5
4I-->FH
4K-->3Z
4K-->40
4K-->41
4K-->4C
4K-->4E
4K-->4G
4K-->Q
4K-->20
4K-->E5
4K-->FH
4L-->48
4L-->4A
4L-->4C
4L-->4E
4L-->4G
4L-->4I
4L-->4K
4M-->40
4M-->42
4M-->43
4M-->4L
4O-->4V
4O-->58
4Q-->1J
4R-->4Q
4R-->5F
4R-->Q
4R-->1J
4R-->20
4S-->Q
4S-->E5
4V-->4P
4V-->4S
4V-->4X
4V-->B
4V-->Q
4V-->20
4V-->E5
4V-->FH
4X-->4P
4X-->Q
4X-->E5
4Y-->4V
4Y-->4X
4Y-->52
4Y-->54
4Y-->56
4Y-->58
50-->5A
50-->5C
50-->B
50-->Q
50-->20
50-->E5
52-->5B
52-->20
52-->E5
52-->FH
54-->5A
54-->50
54-->B
54-->Q
54-->20
54-->E5
56-->5D
56-->5F
56-->E5
56-->FH
58-->5B
58-->5E
58-->5F
58-->52
58-->54
58-->56
58-->Q
58-->20
58-->E5
58-->FH
59-->4O
59-->4P
59-->4Q
59-->4R
59-->4Y
59-->5B
59-->5E
59-->5F
5A-->5C
5A-->Q
5B-->5E
5B-->Q
5C-->Q
5D-->Q
5E-->5C
5E-->Q
5F-->5D
5F-->B
5F-->Q
5F-->20
5F-->FH
5H-->5M
5K-->E5
5M-->5P
5M-->5Q
5M-->5R
5M-->5S
5M-->5K
5M-->E5
5N-->5M
5R-->5P
5S-->5Q
5T-->5H
5T-->5N
5V-->Q
5Z-->20
5Z-->E5
5Z-->FH
61-->20
61-->3T
61-->E5
61-->FH
63-->6R
63-->20
63-->2V
63-->D9
63-->E5
63-->FH
65-->5V
65-->5W
65-->6R
65-->67
65-->69
65-->20
65-->E5
65-->FH
67-->20
67-->E5
69-->5W
69-->E5
6B-->6N
6B-->6O
6B-->Q
6B-->E5
6D-->6N
6D-->6O
6D-->6R
6D-->5Z
6D-->61
6D-->63
6D-->65
6D-->6B
6D-->6G
6D-->6I
6D-->6K
6D-->6M
6D-->20
6D-->2V
6D-->E5
6D-->FH
6E-->5Z
6E-->61
6E-->63
6E-->65
6E-->67
6E-->6B
6E-->6D
6E-->6G
6E-->6I
6E-->6K
6E-->6M
6G-->67
6G-->20
6G-->2V
6G-->3T
6G-->D9
6G-->E5
6G-->FH
6I-->6R
6I-->20
6I-->E5
6I-->FH
6K-->20
6K-->2V
6K-->3T
6K-->D9
6K-->E5
6K-->FH
6M-->6R
6M-->20
6M-->E5
6M-->FH
6N-->6O
6N-->Q
6O-->Q
6P-->6D
6P-->D9
6Q-->6E
6Q-->6P
6R-->5V
6R-->20
6R-->2V
6R-->3T
6V-->Q
6V-->3G
6V-->E5
6V-->FH
6W-->6V
6X-->6W
71-->74
71-->76
71-->20
71-->E5
72-->71
72-->74
72-->76
74-->20
74-->2V
74-->D9
74-->E5
74-->FH
76-->Q
76-->20
76-->2V
76-->3T
76-->D9
76-->E5
76-->FH
77-->71
77-->D9
78-->72
78-->77
7C-->7T
7C-->7V
7C-->Q
7C-->20
7C-->2V
7C-->E5
7C-->FH
7E-->7U
7E-->E5
7G-->7C
7G-->7M
7G-->7P
7G-->E5
7I-->Q
7I-->E5
7K-->7X
7K-->E5
7M-->7U
7M-->7V
7M-->7X
7M-->7E
7M-->7I
7M-->7K
7M-->Q
7M-->20
7M-->E5
7M-->FH
7N-->7C
7N-->7E
7N-->7G
7N-->7I
7N-->7K
7N-->7M
7N-->7P
7N-->7R
7P-->7S
7P-->7V
7P-->7Z
7P-->80
7P-->7R
7P-->20
7P-->E5
7P-->FH
7R-->80
7S-->Q
7T-->Q
7T-->2V
7T-->E5
7T-->FH
7U-->7S
7U-->Q
7U-->2V
7U-->E5
7U-->FH
7V-->Q
7V-->20
7V-->2V
7V-->3T
7W-->7G
7W-->D9
7X-->Q
7X-->2V
7X-->E5
7X-->FH
7Y-->7N
7Y-->7S
7Y-->7T
7Y-->7U
7Y-->7V
7Y-->7W
7Y-->7X
7Y-->7Z
7Y-->80
7Z-->2V
7Z-->D9
7Z-->FH
84-->8D
84-->E5
86-->8E
86-->88
86-->E5
88-->8E
88-->E5
8A-->8E
8A-->E5
8B-->84
8B-->86
8B-->88
8B-->8A
8F-->84
8F-->86
8F-->8A
8G-->8B
8G-->8E
8G-->8F
8K-->1E
8K-->E5
8L-->8K
8M-->8K
8N-->8L
8N-->8M
8P-->Q
8S-->9L
8S-->4M
8S-->E5
8U-->E5
8W-->90
8W-->E5
8Y-->90
8Y-->E5
90-->E5
92-->8P
92-->90
92-->E5
94-->9P
94-->E5
96-->8P
96-->E5
98-->8P
98-->9P
98-->9Q
98-->8W
98-->8Y
98-->92
98-->94
98-->96
98-->9A
98-->Q
98-->17
98-->E5
9A-->17
9A-->E5
9A-->FH
9C-->9L
9C-->9Q
9C-->9J
9C-->Q
9C-->17
9C-->E5
9E-->Q
9E-->E5
9G-->9M
9G-->8U
9G-->98
9G-->9C
9G-->9E
9G-->20
9G-->E5
9H-->98
9H-->9A
9H-->9C
9H-->9E
9H-->9G
9J-->9L
9J-->8S
9J-->Q
9J-->E5
9K-->B
9K-->Q
9K-->17
9K-->20
9L-->Q
9M-->8P
9M-->9K
9M-->9L
9M-->9Q
9M-->Q
9M-->17
9M-->20
9M-->4M
9N-->9G
9O-->8P
9O-->9H
9O-->9K
9O-->9L
9O-->9N
9O-->9P
9O-->9Q
9P-->8P
9Q-->Q
9S-->2V
9V-->9S
9V-->AU
9V-->E5
9V-->FH
9X-->AQ
9X-->E5
9Z-->E5
A1-->AR
A1-->AS
A1-->AU
A1-->20
A1-->2V
A1-->E5
A3-->AU
A3-->3K
A3-->D9
A3-->E5
A5-->AP
A5-->AU
A5-->9Z
A5-->20
A5-->2V
A5-->D9
A5-->E5
A5-->FH
A7-->AS
A7-->AU
A7-->20
A7-->2V
A7-->E5
A7-->FH
A9-->20
A9-->8G
A9-->E5
AB-->AQ
AB-->AU
AB-->E5
AD-->AU
AD-->AX
AD-->A1
AD-->A5
AD-->A7
AD-->A9
AD-->AH
AD-->AO
AD-->20
AD-->2V
AD-->8G
AD-->D9
AD-->E5
AD-->FH
AF-->AQ
AF-->AU
AF-->9V
AF-->9X
AF-->A3
AF-->AB
AF-->E5
AH-->AU
AH-->20
AH-->2V
AH-->3T
AH-->D9
AH-->E5
AH-->FH
AI-->9V
AI-->9X
AI-->9Z
AI-->A1
AI-->A5
AI-->A7
AI-->A9
AI-->AB
AI-->AD
AI-->AF
AI-->AH
AI-->AK
AI-->AM
AI-->AO
AK-->AM
AK-->E5
AM-->AS
AM-->AU
AM-->AW
AM-->AX
AM-->E5
AM-->FH
AO-->AU
AO-->AW
AO-->AX
AO-->AM
AO-->Q
AO-->E5
AP-->2V
AP-->D9
AP-->FH
AQ-->Q
AR-->AS
AR-->Q
AR-->2V
AR-->E5
AR-->FH
AS-->FH
AT-->AD
AT-->AF
AT-->AK
AT-->D9
AU-->9S
AU-->AS
AU-->Q
AU-->20
AU-->2V
AU-->3K
AU-->3T
AV-->AI
AV-->AQ
AV-->AS
AV-->AT
AV-->AU
AV-->AW
AV-->AX
AW-->Q
AX-->Q
B0-->B2
B0-->B6
B0-->B8
B0-->BA
B2-->B4
B2-->B6
B2-->B8
B2-->BA
B2-->E5
B4-->BD
B4-->59
B4-->E5
B6-->BD
B6-->1J
B6-->20
B6-->59
B6-->E5
B8-->Q
B8-->1J
B8-->20
B8-->59
B8-->E5
B8-->FH
BA-->Q
BA-->20
BA-->59
BA-->E5
BA-->FH
BB-->B0
BB-->BC
BC-->B2
BD-->59
BD-->E5
BF-->E5
BI-->BF
BI-->BU
BI-->BK
BI-->BM
BI-->20
BI-->2V
BI-->E5
BI-->FH
BK-->BF
BK-->E5
BM-->BF
BM-->E5
BN-->BI
BN-->BK
BN-->BM
BN-->BP
BN-->BR
BP-->BI
BP-->BR
BP-->20
BP-->E5
BR-->BT
BR-->BU
BR-->20
BR-->2V
BR-->D9
BR-->E5
BR-->FH
BS-->BN
BS-->BV
BU-->20
BU-->2V
BU-->3T
BV-->BP
BY-->C6
C0-->1E
C0-->E5
C2-->20
C2-->E5
C2-->FH
C4-->6X
C4-->E5
C6-->C0
C6-->C2
C6-->C4
C6-->C8
C6-->CA
C6-->CC
C6-->E5
C8-->20
C8-->E5
C8-->FH
CA-->20
CA-->E5
CA-->FH
CC-->20
CC-->3K
CC-->E5
CD-->BY
CD-->CE
CE-->C6
CG-->Q
CJ-->Q
CJ-->20
CJ-->3P
CJ-->E5
CJ-->FH
CL-->CG
CM-->CO
CM-->CQ
CM-->CS
CM-->CW
CM-->CY
CO-->CG
CO-->B
CO-->20
CO-->E5
CQ-->CG
CQ-->CJ
CQ-->B
CQ-->Q
CQ-->20
CQ-->3P
CQ-->59
CQ-->E5
CS-->CG
CS-->D0
CS-->B
CS-->20
CS-->E5
CS-->FH
CU-->CG
CU-->D1
CU-->CL
CU-->E5
CU-->FH
CW-->CG
CW-->D0
CW-->D1
CW-->CO
CW-->CQ
CW-->CS
CW-->CU
CW-->CY
CW-->B
CW-->Q
CW-->20
CW-->3T
CW-->59
CW-->E5
CW-->FH
CY-->20
CY-->3T
CY-->E5
CY-->FH
CZ-->D2
D0-->Q
D0-->3T
D1-->Q
D2-->CW
D9-->D5
D9-->D6
D9-->D8
D9-->DA
D9-->DB
DB-->FH
DE-->DK
DE-->DY
DE-->E0
DE-->E7
DE-->EZ
DE-->Q
DE-->FH
DG-->FH
DI-->FH
DK-->FH
DM-->FH
DO-->DK
DO-->E9
DO-->ED
DO-->EZ
DQ-->FH
DS-->DK
DS-->DW
DS-->FH
DU-->FH
DW-->FH
DY-->E2
DY-->EZ
E0-->FH
E2-->FH
E5-->DE
E5-->DG
E5-->DI
E5-->DK
E5-->DM
E5-->DO
E5-->DQ
E5-->DS
E5-->DU
E5-->DW
E5-->DY
E5-->E0
E5-->E2
E5-->E4
E5-->E7
E5-->E9
E5-->EB
E5-->ED
E5-->EF
E5-->EH
E5-->EJ
E5-->EL
E5-->EN
E5-->EP
E5-->ER
E5-->ET
E5-->EV
E5-->EX
E5-->EZ
E7-->FH
E9-->FH
EB-->E2
ED-->FH
EF-->E2
EF-->EZ
EH-->DK
EH-->E2
EH-->EZ
EH-->FH
EJ-->FH
EL-->FH
EN-->DK
EN-->20
EP-->DE
EP-->DK
EP-->E2
EP-->EJ
EP-->EZ
EP-->Q
EP-->FH
ER-->FH
ET-->EL
ET-->EZ
ET-->FH
EV-->FH
EX-->FH
EZ-->FH
F1-->F9
F4-->FE
F7-->FE
F8-->F9
F9-->FE
FD-->FE
FH-->F1
FH-->F2
FH-->F3
FH-->F4
FH-->F5
FH-->F6
FH-->F7
FH-->F9
FH-->F8
FH-->FA
FH-->FB
FH-->FC
FH-->FE
FH-->FF
FH-->FG
FH-->FI
FH-->FJ
FH-->FK
FH-->FL
FH-->FM
FH-->FN
FH-->FO
FH-->FP
FH-->FQ
FH-->FR
FH-->FS
FH-->FT
FH-->FU
FH-->FY
FH-->FZ
FK-->FE
FN-->F7
FN-->FO
FO-->F7
FR-->F4
```
