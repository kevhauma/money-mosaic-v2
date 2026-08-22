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
- 412 leaf nodes, 1270 edges.
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
subgraph 1F["loans"]
1G["amortization.ts"]
1H["index.ts"]
1I["loan-progress.ts"]
1J["what-if.ts"]
end
subgraph 1K["ml"]
1L["category-model.worker.ts"]
1M["category-model.worker.types.ts"]
1N["feature-hashing.ts"]
1O["index.ts"]
1P["model-config.ts"]
1Q["rule-proposal-mining.ts"]
1R["training-window.ts"]
end
subgraph 1S["onboarding"]
1T["home-redirect.guard.ts"]
1U["index.ts"]
1V["mark-visited.guard.ts"]
1W["visited.service.ts"]
end
subgraph 1X["state"]
1Y["accounts.store.ts"]
1Z["app-settings.store.ts"]
20["categories.store.ts"]
21["chart-options-control.ts"]
22["chart-options.store.ts"]
23["forecast-settings.store.ts"]
24["goals.store.ts"]
25["index.ts"]
26["page-range-control.ts"]
27["range-state.store.ts"]
28["transactions.store.ts"]
29["transfer-settings.store.ts"]
2A["transfers.store.ts"]
end
subgraph 2B["stats"]
2C["account-balance-history.ts"]
2D["account-balance-trend.ts"]
2E["annual-lump-sum-smoothing.ts"]
2F["category-breakdown.ts"]
2G["category-composition-trend.ts"]
2H["category-cycle-heatmap.ts"]
2I["category-expense-transactions.ts"]
2J["category-kind-contribution.ts"]
2K["category-period-comparison.ts"]
2L["chart-zoom-window.ts"]
2M["classify-for-stats.ts"]
2N["classify-joint-leg.ts"]
2O["day-transactions.ts"]
2P["embedded-bonus-smoothing.ts"]
2Q["full-history-range.ts"]
2R["goal-affordability.ts"]
2S["granularity-for-span.ts"]
2T["gross-net-growth.ts"]
2U["gross-net-ratio.ts"]
2V["income-category-series.ts"]
2W["income-events.ts"]
2X["income-gap-detection.ts"]
2Y["income-growth.ts"]
2Z["income-step-change-detection.ts"]
30["index.ts"]
31["joint-account-stake.ts"]
32["joint-contributor-breakdown.ts"]
33["money-flow-graph.ts"]
34["multi-year-income-comparison.ts"]
35["net-margin.ts"]
36["net-worth-projection.ts"]
37["period-stats.ts"]
38["period-window.ts"]
39["periodized-rate.ts"]
3A["recurring-payments.ts"]
3B["recurring-projection.ts"]
3C["required-saving-rate.ts"]
3D["saving-velocity.ts"]
3E["spending-mosaic.ts"]
3F["top-transactions.ts"]
3G["wage-change-detection.ts"]
3H["weekday-weekend-split.ts"]
3I["year-over-year.ts"]
3J["yearly-income-summary.ts"]
end
subgraph 3K["storage"]
3L["index.ts"]
3M["storage-status.service.ts"]
end
subgraph 3N["theme"]
3O["accent-colors.ts"]
3P["index.ts"]
3Q["theme-styles.ts"]
3R["theme.service.ts"]
end
subgraph 3S["transactions"]
3T["attribution-override.ts"]
3U["index.ts"]
3V["nullify-transaction.ts"]
3W["transaction-deletion.service.ts"]
end
subgraph 3X["transfers"]
3Y["index.ts"]
3Z["transfer-cleanup.service.ts"]
40["transfer-linking.service.ts"]
41["transfer-matching.service.ts"]
42["transfer-matching.ts"]
end
end
subgraph 43["feature-accounts"]
44["account-card-vm.ts"]
45["account-icons.ts"]
46["account-list-order.ts"]
47["account-types.ts"]
48["accounts.routes.ts"]
49["balance-day-tooltip.ts"]
4A["balance-trend-signals.ts"]
subgraph 4B["components"]
subgraph 4C["account-balance-block"]
4D["account-balance-block.component.ts"]
end
subgraph 4E["account-balance-chart"]
4F["account-balance-chart.component.ts"]
end
subgraph 4G["account-balance-history-chart"]
4H["account-balance-history-chart.component.ts"]
end
subgraph 4I["account-card"]
4J["account-card.component.ts"]
end
subgraph 4K["account-form"]
4L["account-form.component.ts"]
end
subgraph 4M["accounts-detail"]
4N["accounts-detail.component.ts"]
end
subgraph 4O["accounts-overview"]
4P["accounts-overview.component.ts"]
end
4Q["index.ts"]
end
4R["index.ts"]
end
subgraph 4S["feature-categories"]
4T["categories.routes.ts"]
4U["category-icons.ts"]
4V["category-model.service.ts"]
4W["category-model.store.ts"]
4X["category-row-vm.ts"]
subgraph 4Y["components"]
subgraph 4Z["categories-overview"]
50["categories-overview.component.ts"]
end
subgraph 51["category-form"]
52["category-form.component.ts"]
end
53["index.ts"]
subgraph 54["rule-condition-row"]
55["rule-condition-row.component.ts"]
end
subgraph 56["rule-filters"]
57["rule-filters.component.ts"]
end
subgraph 58["rule-form"]
59["rule-form.component.ts"]
end
subgraph 5A["rule-share-bar"]
5B["rule-share-bar.component.ts"]
end
subgraph 5C["rules-overview"]
5D["rules-overview.component.ts"]
end
end
5E["index.ts"]
5F["rule-condition-editor.ts"]
5G["rule-filters.ts"]
5H["rule-labels.ts"]
5I["rule-share.ts"]
5J["rule-summary.ts"]
5K["rules.store.ts"]
end
subgraph 5L["feature-changelog"]
5M["changelog.routes.ts"]
subgraph 5N["components"]
subgraph 5O["changelog-entry-row"]
5P["changelog-entry-row.component.ts"]
end
subgraph 5Q["changelog-page"]
5R["changelog-page.component.ts"]
end
5S["index.ts"]
end
subgraph 5T["data"]
5U["changelog-entries.ts"]
5V["roadmap-entries.ts"]
end
5W["group-changelog-entries.ts"]
5X["group-roadmap-entries.ts"]
5Y["index.ts"]
end
subgraph 5Z["feature-dashboard"]
60["category-comparison-settings.store.ts"]
61["category-comparison-vm.ts"]
subgraph 62["components"]
subgraph 63["account-balance-strip"]
64["account-balance-strip.component.ts"]
end
subgraph 65["action-queue-panel"]
66["action-queue-panel.component.ts"]
end
subgraph 67["category-breakdown-panel"]
68["category-breakdown-panel.component.ts"]
end
subgraph 69["category-comparison-panel"]
6A["category-comparison-panel.component.ts"]
end
subgraph 6B["category-exclusion-dropdown"]
6C["category-exclusion-dropdown.component.ts"]
end
subgraph 6D["comparison-category-card"]
6E["comparison-category-card.component.ts"]
end
subgraph 6F["dashboard-customize-panel"]
6G["dashboard-customize-panel.component.ts"]
end
subgraph 6H["dashboard-overview"]
6I["dashboard-overview.component.ts"]
end
6J["index.ts"]
subgraph 6K["spending-heatmap-panel"]
6L["spending-heatmap-panel.component.ts"]
end
subgraph 6M["top-transactions-panel"]
6N["top-transactions-panel.component.ts"]
end
subgraph 6O["trend-chart-panel"]
6P["trend-chart-panel.component.ts"]
end
subgraph 6Q["weekday-weekend-split-panel"]
6R["weekday-weekend-split-panel.component.ts"]
end
end
6S["dashboard-layout-settings.store.ts"]
6T["dashboard-row-order.ts"]
6U["dashboard.routes.ts"]
6V["index.ts"]
6W["stats.store.ts"]
end
subgraph 6X["feature-data-management"]
subgraph 6Y["components"]
subgraph 6Z["data-management-overview"]
70["data-management-overview.component.ts"]
end
71["index.ts"]
end
72["index.ts"]
end
subgraph 73["feature-explore"]
subgraph 74["components"]
subgraph 75["explore-overview"]
76["explore-overview.component.ts"]
end
77["index.ts"]
subgraph 78["money-flow-panel"]
79["money-flow-panel.component.ts"]
end
subgraph 7A["spending-mosaic-panel"]
7B["spending-mosaic-panel.component.ts"]
end
end
7C["explore.routes.ts"]
7D["index.ts"]
end
subgraph 7E["feature-future"]
subgraph 7F["components"]
subgraph 7G["forecast-controls"]
7H["forecast-controls.component.ts"]
end
subgraph 7I["forecast-notice"]
7J["forecast-notice.component.ts"]
end
subgraph 7K["future-overview"]
7L["future-overview.component.ts"]
end
subgraph 7M["goal-form"]
7N["goal-form.component.ts"]
end
subgraph 7O["goal-row"]
7P["goal-row.component.ts"]
end
subgraph 7Q["goals-panel"]
7R["goals-panel.component.ts"]
end
7S["index.ts"]
subgraph 7T["net-worth-projection-chart"]
7U["net-worth-projection-chart.component.ts"]
end
subgraph 7V["projection-figure-table"]
7W["projection-figure-table.component.ts"]
end
end
7X["forecast-chart-copy.ts"]
7Y["forecast-controls-vm.ts"]
7Z["forecast-notices.ts"]
80["forecast.store.ts"]
81["future.routes.ts"]
82["goal-row-vm.ts"]
83["index.ts"]
84["net-worth-projection-chart-option.ts"]
85["projection-accessible-row.ts"]
end
subgraph 86["feature-help"]
subgraph 87["components"]
subgraph 88["faq-page"]
89["faq-page.component.ts"]
end
subgraph 8A["guide-detail"]
8B["guide-detail.component.ts"]
end
subgraph 8C["guide-steps"]
8D["guide-steps.component.ts"]
end
subgraph 8E["guides-index"]
8F["guides-index.component.ts"]
end
8G["index.ts"]
end
subgraph 8H["data"]
8I["faq.ts"]
8J["guides.ts"]
end
8K["help.routes.ts"]
8L["index.ts"]
end
subgraph 8M["feature-home"]
subgraph 8N["components"]
subgraph 8O["home-landing"]
8P["home-landing.component.ts"]
end
8Q["index.ts"]
end
8R["home.routes.ts"]
8S["index.ts"]
end
subgraph 8T["feature-import"]
8U["column-mapping.ts"]
subgraph 8V["components"]
subgraph 8W["account-draft-editor"]
8X["account-draft-editor.component.ts"]
end
subgraph 8Y["batch-wait-card"]
8Z["batch-wait-card.component.ts"]
end
subgraph 90["column-map-amount-field"]
91["column-map-amount-field.component.ts"]
end
subgraph 92["column-map-counterparty-field"]
93["column-map-counterparty-field.component.ts"]
end
subgraph 94["column-map-sample-caption"]
95["column-map-sample-caption.component.ts"]
end
subgraph 96["column-map-simple-field"]
97["column-map-simple-field.component.ts"]
end
subgraph 98["column-map-stepper"]
99["column-map-stepper.component.ts"]
end
subgraph 9A["column-map-summary-step"]
9B["column-map-summary-step.component.ts"]
end
subgraph 9C["import-map-step"]
9D["import-map-step.component.ts"]
end
subgraph 9E["import-preview-step"]
9F["import-preview-step.component.ts"]
end
subgraph 9G["import-select-step"]
9H["import-select-step.component.ts"]
end
subgraph 9I["import-summary-step"]
9J["import-summary-step.component.ts"]
end
subgraph 9K["import-wizard"]
9L["import-wizard.component.ts"]
end
9M["index.ts"]
subgraph 9N["queued-file-row"]
9O["queued-file-row.component.ts"]
end
end
9P["import-batches.store.ts"]
9Q["import-queue.ts"]
9R["import-wizard-session.ts"]
9S["import.routes.ts"]
9T["index.ts"]
9U["mapper-steps.ts"]
9V["mapping-profiles.store.ts"]
end
subgraph 9W["feature-income"]
9X["career-start-date.ts"]
subgraph 9Y["components"]
subgraph 9Z["income-career-start"]
A0["income-career-start.component.ts"]
end
subgraph A1["income-category-checklist"]
A2["income-category-checklist.component.ts"]
end
subgraph A3["income-chart-cell"]
A4["income-chart-cell.component.ts"]
end
subgraph A5["income-events-sidebar"]
A6["income-events-sidebar.component.ts"]
end
subgraph A7["income-gross-color"]
A8["income-gross-color.component.ts"]
end
subgraph A9["income-gross-net-section"]
AA["income-gross-net-section.component.ts"]
end
subgraph AB["income-growth-panel"]
AC["income-growth-panel.component.ts"]
end
subgraph AD["income-intro"]
AE["income-intro.component.ts"]
end
subgraph AF["income-main-category"]
AG["income-main-category.component.ts"]
end
subgraph AH["income-overview"]
AI["income-overview.component.ts"]
end
subgraph AJ["income-settings-page"]
AK["income-settings-page.component.ts"]
end
subgraph AL["income-yearly-panel"]
AM["income-yearly-panel.component.ts"]
end
AN["index.ts"]
subgraph AO["salary-details-page"]
AP["salary-details-page.component.ts"]
end
subgraph AQ["salary-metadata-table"]
AR["salary-metadata-table.component.ts"]
end
subgraph AS["salary-month-modal"]
AT["salary-month-modal.component.ts"]
end
end
AU["gross-net-chart-options.ts"]
AV["income-category-vm.ts"]
AW["income-event-vm.ts"]
AX["income-granularity.ts"]
AY["income.routes.ts"]
AZ["income.store.ts"]
B0["index.ts"]
B1["salary-metadata-edit.ts"]
B2["salary-metadata-rows.ts"]
end
subgraph B3["feature-learning"]
subgraph B4["components"]
B5["index.ts"]
subgraph B6["learning-overview"]
B7["learning-overview.component.ts"]
end
subgraph B8["model-status-badge"]
B9["model-status-badge.component.ts"]
end
subgraph BA["model-status"]
BB["model-status.component.ts"]
end
subgraph BC["rule-proposals"]
BD["rule-proposals.component.ts"]
end
subgraph BE["suggestions-table"]
BF["suggestions-table.component.ts"]
end
end
BG["index.ts"]
BH["learning.routes.ts"]
BI["model-status-display.ts"]
end
subgraph BJ["feature-loans"]
subgraph BK["components"]
BL["index.ts"]
subgraph BM["loan-amortization-table"]
BN["loan-amortization-table.component.ts"]
end
subgraph BO["loan-balance-chart"]
BP["loan-balance-chart.component.ts"]
end
subgraph BQ["loan-card"]
BR["loan-card.component.ts"]
end
subgraph BS["loan-composition-chart"]
BT["loan-composition-chart.component.ts"]
end
subgraph BU["loan-detail"]
BV["loan-detail.component.ts"]
end
subgraph BW["loan-form"]
BX["loan-form.component.ts"]
end
subgraph BY["loan-payments-list"]
BZ["loan-payments-list.component.ts"]
end
subgraph C0["loans-overview"]
C1["loans-overview.component.ts"]
end
end
C2["index.ts"]
C3["loan-card-vm.ts"]
C4["loan-schedule-status.ts"]
C5["loan-types.ts"]
C6["loans.routes.ts"]
C7["loans.store.ts"]
end
subgraph C8["feature-recurring"]
C9["bills-calendar-vm.ts"]
subgraph CA["components"]
subgraph CB["bills-calendar"]
CC["bills-calendar.component.ts"]
end
subgraph CD["bills-day-list"]
CE["bills-day-list.component.ts"]
end
subgraph CF["bills-month-grid"]
CG["bills-month-grid.component.ts"]
end
CH["index.ts"]
subgraph CI["recurring-overview"]
CJ["recurring-overview.component.ts"]
end
subgraph CK["recurring-payments-panel"]
CL["recurring-payments-panel.component.ts"]
end
end
CM["index.ts"]
CN["recurring-payments-row-vm.ts"]
CO["recurring-series.store.ts"]
CP["recurring.routes.ts"]
end
subgraph CQ["feature-settings"]
subgraph CR["components"]
CS["index.ts"]
subgraph CT["settings-about-section"]
CU["settings-about-section.component.ts"]
end
subgraph CV["settings-currency-locale-section"]
CW["settings-currency-locale-section.component.ts"]
end
subgraph CX["settings-data-section"]
CY["settings-data-section.component.ts"]
end
subgraph CZ["settings-overview"]
D0["settings-overview.component.ts"]
end
subgraph D1["settings-privacy-section"]
D2["settings-privacy-section.component.ts"]
end
subgraph D3["settings-reporting-section"]
D4["settings-reporting-section.component.ts"]
end
subgraph D5["settings-theme-section"]
D6["settings-theme-section.component.ts"]
end
end
D7["index.ts"]
D8["settings.routes.ts"]
end
subgraph D9["feature-transactions"]
DA["category-picker.ts"]
subgraph DB["components"]
subgraph DC["attribution-override-fieldset"]
DD["attribution-override-fieldset.component.ts"]
end
subgraph DE["category-select-cell"]
DF["category-select-cell.component.ts"]
end
DG["index.ts"]
subgraph DH["transaction-bulk-bar"]
DI["transaction-bulk-bar.component.ts"]
end
subgraph DJ["transaction-edit-form"]
DK["transaction-edit-form.component.ts"]
end
subgraph DL["transaction-filters"]
DM["transaction-filters.component.ts"]
end
subgraph DN["transaction-row"]
DO["transaction-row.component.ts"]
end
subgraph DP["transactions-overview"]
DQ["transactions-overview.component.ts"]
end
subgraph DR["transfer-review"]
DS["transfer-review.component.ts"]
end
end
DT["index.ts"]
DU["transaction-filters.ts"]
DV["transaction-row-vm.ts"]
DW["transactions.routes.ts"]
end
subgraph DX["shared"]
subgraph DY["echarts"]
DZ["bucketed-axis-option.ts"]
E0["chart-theme.ts"]
E1["echarts-jsdom.testing.ts"]
E2["echarts-setup.ts"]
E3["index.ts"]
E4["legend-option.ts"]
E5["tooltip-formatter.ts"]
end
subgraph E6["ui"]
subgraph E7["absolute-range-panel"]
E8["absolute-range-panel.component.ts"]
end
subgraph E9["alert"]
EA["alert.component.ts"]
end
subgraph EB["badge"]
EC["badge.component.ts"]
end
subgraph ED["button"]
EE["button.component.ts"]
end
subgraph EF["collapse"]
EG["collapse.component.ts"]
end
subgraph EH["confirm-dialog"]
EI["confirm-dialog.component.ts"]
end
subgraph EJ["cycle-picker"]
EK["cycle-picker.component.ts"]
end
subgraph EL["date-range-input"]
EM["date-range-input.component.ts"]
end
subgraph EN["divider"]
EO["divider.component.ts"]
end
subgraph EP["dropdown"]
EQ["dropdown.component.ts"]
end
subgraph ER["empty-state"]
ES["empty-state.component.ts"]
end
subgraph ET["fieldset"]
EU["fieldset.component.ts"]
end
subgraph EV["flex"]
EW["flex.component.ts"]
end
subgraph EX["granularity-picker"]
EY["granularity-picker.component.ts"]
end
EZ["index.ts"]
subgraph F0["input"]
F1["input.component.ts"]
end
subgraph F2["label"]
F3["label.component.ts"]
end
subgraph F4["loading-skeleton"]
F5["loading-skeleton.component.ts"]
end
subgraph F6["modal"]
F7["mm-modal.component.ts"]
end
subgraph F8["page-header"]
F9["page-header.component.ts"]
end
subgraph FA["paginator"]
FB["paginator.component.ts"]
end
subgraph FC["paper"]
FD["paper.component.ts"]
end
subgraph FE["privacy-blur"]
FF["privacy-blur.component.ts"]
end
subgraph FG["privacy-toggle"]
FH["privacy-toggle.component.ts"]
end
subgraph FI["range-picker"]
FJ["range-picker.component.ts"]
end
subgraph FK["select"]
FL["select.component.ts"]
end
subgraph FM["stat-card"]
FN["stat-card.component.ts"]
end
subgraph FO["table"]
FP["table.component.ts"]
end
subgraph FQ["tabs"]
FR["tabs.component.ts"]
end
subgraph FS["typography"]
FT["typography.component.ts"]
end
end
subgraph FU["utils"]
FV["calendar-cycles.ts"]
FW["confidence-color.ts"]
FX["confirm-state.ts"]
FY["currency-format.ts"]
FZ["currency-symbol-presets.ts"]
G0["daisy-classes.ts"]
G1["date-buckets.ts"]
G2["date-format.pipe.ts"]
G3["date-format.ts"]
G4["debounced-text.ts"]
G5["download-json.ts"]
G6["fingerprint.ts"]
G7["format-settings.testing.ts"]
G8["format-settings.ts"]
G9["hidden-amount.ts"]
GA["iban.ts"]
GB["index.ts"]
GC["link-control-to-setting.ts"]
GD["locale-presets.ts"]
GE["number-format.ts"]
GF["pagination.ts"]
GG["percentage.ts"]
GH["quick-ranges.ts"]
GI["range-expression.ts"]
GJ["search-params.ts"]
GK["selection-model.ts"]
GL["signed-amount.pipe.ts"]
GM["sortable.ts"]
GN["structural-filters.ts"]
GO["theme-hooks.ts"]
subgraph GP["validators"]
GQ["iban.validator.ts"]
GR["percentage.validator.ts"]
end
GS["with-archivable.ts"]
GT["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3Y
5-->4
5-->6
6-->Q
6-->GB
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
G-->1P
G-->3D
G-->3O
G-->G6
G-->G8
H-->G
H-->3P
H-->GB
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->30
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
Z-->GB
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
16-->3Y
16-->GB
17-->Z
17-->10
17-->11
17-->13
17-->14
17-->15
17-->16
1A-->25
1A-->EE
1A-->FT
1B-->1A
1E-->1D
1G-->GB
1H-->1G
1H-->1I
1H-->1J
1I-->1G
1I-->Q
1I-->GB
1J-->1G
1J-->1I
1J-->Q
1L-->1M
1L-->1N
1L-->1P
1M-->1P
1N-->1P
1O-->1M
1O-->1N
1O-->1P
1O-->1Q
1O-->1R
1Q-->B
1Q-->Q
1T-->1W
1U-->1T
1U-->1V
1U-->1W
1V-->1W
1Y-->20
1Y-->28
1Y-->2A
1Y-->5
1Y-->Q
1Y-->30
1Y-->3Y
1Y-->GB
1Z-->Q
1Z-->3P
1Z-->GB
20-->28
20-->Q
20-->GB
21-->22
21-->30
21-->E3
21-->GB
22-->30
22-->E3
22-->GB
23-->Q
23-->30
24-->Q
24-->GB
25-->1Y
25-->1Z
25-->20
25-->21
25-->22
25-->23
25-->24
25-->26
25-->27
25-->28
25-->29
25-->2A
26-->1Y
26-->1Z
26-->27
26-->28
26-->Q
26-->30
26-->GB
27-->1Z
27-->GB
28-->Q
28-->3U
28-->3Y
29-->Q
2A-->28
2A-->29
2A-->Q
2A-->3Y
2C-->Q
2C-->GB
2D-->2C
2D-->Q
2D-->GB
2E-->2G
2E-->2V
2E-->GB
2F-->2M
2F-->Q
2G-->2F
2G-->Q
2G-->GB
2H-->2F
2H-->2M
2H-->Q
2H-->GB
2I-->2M
2I-->Q
2J-->Q
2K-->2F
2K-->38
2K-->Q
2L-->GB
2M-->2J
2M-->2N
2M-->Q
2M-->3Y
2N-->5
2N-->Q
2O-->Q
2P-->2G
2P-->2V
2P-->Q
2P-->GB
2Q-->Q
2R-->Q
2R-->GB
2S-->GB
2T-->2U
2U-->2V
2U-->Q
2V-->2G
2V-->Q
2V-->GB
2W-->2X
2W-->2Z
2W-->3G
2W-->Q
2X-->2G
2X-->2V
2X-->GB
2Y-->2V
2Y-->3I
2Y-->GB
2Z-->2G
2Z-->2P
2Z-->2V
2Z-->GB
30-->2C
30-->2D
30-->2E
30-->2F
30-->2G
30-->2H
30-->2I
30-->2J
30-->2K
30-->2L
30-->2M
30-->2N
30-->2O
30-->2P
30-->2Q
30-->2R
30-->2S
30-->2T
30-->2U
30-->2V
30-->2W
30-->2X
30-->2Y
30-->2Z
30-->31
30-->32
30-->33
30-->34
30-->35
30-->36
30-->37
30-->38
30-->39
30-->3A
30-->3B
30-->3C
30-->3D
30-->3E
30-->3F
30-->3G
30-->3H
30-->3I
30-->3J
31-->2N
31-->Q
32-->2N
32-->5
32-->Q
33-->Q
33-->GB
34-->3J
36-->GB
37-->2M
37-->Q
38-->GB
39-->GB
3A-->2M
3A-->B
3A-->Q
3A-->GB
3B-->3A
3B-->GB
3C-->Q
3C-->GB
3D-->37
3D-->Q
3D-->GB
3E-->2F
3E-->2I
3E-->Q
3F-->Q
3F-->3Y
3G-->2U
3H-->2M
3H-->Q
3H-->GB
3I-->37
3I-->Q
3J-->2G
3J-->Q
3J-->GB
3L-->3M
3O-->3Q
3P-->3O
3P-->3Q
3P-->3R
3R-->3Q
3T-->Q
3U-->3T
3U-->3V
3U-->3W
3V-->Q
3W-->Q
3W-->3Y
3Y-->3Z
3Y-->40
3Y-->42
3Y-->41
3Z-->Q
40-->42
40-->Q
41-->40
41-->42
41-->Q
42-->6
42-->Q
42-->GB
44-->Q
45-->Q
46-->Q
47-->Q
48-->4N
48-->4P
48-->E3
49-->30
49-->GB
4A-->Q
4A-->25
4A-->30
4A-->GB
4D-->EZ
4D-->GB
4F-->49
4F-->4A
4F-->Q
4F-->30
4F-->E3
4F-->EZ
4F-->GB
4H-->49
4H-->4A
4H-->Q
4H-->25
4H-->30
4H-->E3
4H-->EZ
4J-->44
4J-->45
4J-->4D
4J-->EZ
4L-->45
4L-->47
4L-->Q
4L-->EZ
4L-->GB
4L-->GQ
4L-->GR
4N-->4D
4N-->4F
4N-->4L
4N-->25
4N-->EZ
4N-->GB
4P-->44
4P-->45
4P-->46
4P-->4H
4P-->4J
4P-->4L
4P-->Q
4P-->25
4P-->EZ
4P-->GB
4Q-->4D
4Q-->4F
4Q-->4H
4Q-->4J
4Q-->4L
4Q-->4N
4Q-->4P
4R-->45
4R-->47
4R-->48
4R-->4Q
4T-->50
4T-->5D
4V-->1O
4W-->4V
4W-->5K
4W-->Q
4W-->1O
4W-->25
4X-->Q
4X-->EZ
50-->4U
50-->4X
50-->52
50-->B
50-->Q
50-->25
50-->EZ
50-->GB
52-->4U
52-->Q
52-->EZ
53-->50
53-->52
53-->57
53-->59
53-->5B
53-->5D
55-->5F
55-->5H
55-->B
55-->Q
55-->25
55-->EZ
57-->5G
57-->25
57-->EZ
57-->GB
59-->5F
59-->55
59-->B
59-->Q
59-->25
59-->EZ
5B-->5I
5B-->5K
5B-->EZ
5B-->GB
5D-->5G
5D-->5J
5D-->5K
5D-->57
5D-->59
5D-->5B
5D-->Q
5D-->25
5D-->EZ
5D-->GB
5E-->4T
5E-->4U
5E-->4V
5E-->4W
5E-->53
5E-->5G
5E-->5J
5E-->5K
5F-->5H
5F-->Q
5G-->5J
5G-->Q
5H-->Q
5I-->Q
5J-->5H
5J-->Q
5K-->5I
5K-->B
5K-->Q
5K-->25
5K-->GB
5M-->5R
5P-->EZ
5R-->5U
5R-->5V
5R-->5W
5R-->5X
5R-->5P
5R-->EZ
5S-->5R
5W-->5U
5X-->5V
5Y-->5M
5Y-->5S
60-->Q
64-->25
64-->EZ
64-->GB
66-->25
66-->3Y
66-->EZ
66-->GB
68-->6W
68-->25
68-->30
68-->E3
68-->EZ
68-->GB
6A-->60
6A-->61
6A-->6W
6A-->6C
6A-->6E
6A-->25
6A-->EZ
6A-->GB
6C-->25
6C-->EZ
6E-->61
6E-->EZ
6G-->6S
6G-->6T
6G-->Q
6G-->EZ
6I-->6S
6I-->6T
6I-->6W
6I-->64
6I-->66
6I-->68
6I-->6A
6I-->6G
6I-->6L
6I-->6N
6I-->6P
6I-->6R
6I-->25
6I-->30
6I-->EZ
6I-->GB
6J-->64
6J-->66
6J-->68
6J-->6A
6J-->6C
6J-->6G
6J-->6I
6J-->6L
6J-->6N
6J-->6P
6J-->6R
6L-->6C
6L-->25
6L-->30
6L-->3Y
6L-->E3
6L-->EZ
6L-->GB
6N-->6W
6N-->25
6N-->EZ
6N-->GB
6P-->25
6P-->30
6P-->3Y
6P-->E3
6P-->EZ
6P-->GB
6R-->6W
6R-->25
6R-->EZ
6R-->GB
6S-->6T
6S-->Q
6T-->Q
6U-->6I
6U-->E3
6V-->6J
6V-->6U
6W-->60
6W-->25
6W-->30
6W-->3Y
70-->Q
70-->3L
70-->EZ
70-->GB
71-->70
72-->71
76-->79
76-->7B
76-->25
76-->EZ
77-->76
77-->79
77-->7B
79-->25
79-->30
79-->E3
79-->EZ
79-->GB
7B-->Q
7B-->25
7B-->30
7B-->3Y
7B-->E3
7B-->EZ
7B-->GB
7C-->76
7C-->E3
7D-->77
7D-->7C
7H-->7Y
7H-->80
7H-->Q
7H-->25
7H-->30
7H-->EZ
7H-->GB
7J-->7Z
7J-->EZ
7L-->7H
7L-->7R
7L-->7U
7L-->EZ
7N-->Q
7N-->EZ
7P-->82
7P-->EZ
7R-->7Z
7R-->80
7R-->82
7R-->7J
7R-->7N
7R-->7P
7R-->Q
7R-->25
7R-->EZ
7R-->GB
7S-->7H
7S-->7J
7S-->7L
7S-->7N
7S-->7P
7S-->7R
7S-->7U
7S-->7W
7U-->7X
7U-->80
7U-->84
7U-->85
7U-->7W
7U-->25
7U-->EZ
7U-->GB
7W-->85
7X-->Q
7Y-->Q
7Y-->30
7Y-->EZ
7Y-->GB
7Z-->7X
7Z-->Q
7Z-->30
7Z-->EZ
7Z-->GB
80-->Q
80-->25
80-->30
80-->3Y
81-->7L
81-->E3
82-->Q
82-->30
82-->EZ
82-->GB
83-->7S
83-->7X
83-->7Y
83-->7Z
83-->80
83-->81
83-->82
83-->84
83-->85
84-->30
84-->E3
84-->GB
89-->8I
89-->EZ
8B-->8J
8B-->8D
8B-->EZ
8D-->8J
8D-->EZ
8F-->8J
8F-->EZ
8G-->89
8G-->8B
8G-->8D
8G-->8F
8K-->89
8K-->8B
8K-->8F
8L-->8G
8L-->8J
8L-->8K
8P-->1E
8P-->EZ
8Q-->8P
8R-->8P
8S-->8Q
8S-->8R
8U-->Q
8X-->9Q
8X-->4R
8X-->EZ
8Z-->EZ
91-->95
91-->EZ
93-->95
93-->EZ
95-->EZ
97-->8U
97-->95
97-->EZ
99-->9U
99-->EZ
9B-->8U
9B-->EZ
9D-->8U
9D-->9U
9D-->9V
9D-->91
9D-->93
9D-->97
9D-->99
9D-->9B
9D-->9F
9D-->Q
9D-->17
9D-->EZ
9F-->17
9F-->EZ
9F-->GB
9H-->9Q
9H-->9V
9H-->9O
9H-->Q
9H-->17
9H-->EZ
9J-->Q
9J-->EZ
9L-->9R
9L-->8Z
9L-->9D
9L-->9H
9L-->9J
9L-->25
9L-->EZ
9M-->9D
9M-->9F
9M-->9H
9M-->9J
9M-->9L
9O-->9Q
9O-->8X
9O-->Q
9O-->EZ
9P-->B
9P-->Q
9P-->17
9P-->25
9Q-->Q
9R-->8U
9R-->9P
9R-->9Q
9R-->9V
9R-->Q
9R-->17
9R-->25
9R-->4R
9S-->9L
9T-->8U
9T-->9M
9T-->9P
9T-->9Q
9T-->9S
9T-->9U
9T-->9V
9U-->8U
9V-->Q
9X-->30
A0-->9X
A0-->AZ
A0-->EZ
A0-->GB
A2-->AV
A2-->EZ
A4-->EZ
A6-->AW
A6-->AX
A6-->AZ
A6-->25
A6-->30
A6-->EZ
A8-->AZ
A8-->3P
A8-->E3
A8-->EZ
AA-->AU
AA-->AZ
AA-->A4
AA-->25
AA-->30
AA-->E3
AA-->EZ
AA-->GB
AC-->AX
AC-->AZ
AC-->25
AC-->30
AC-->EZ
AC-->GB
AE-->25
AE-->8L
AE-->EZ
AG-->AV
AG-->AZ
AG-->EZ
AI-->AZ
AI-->B2
AI-->A6
AI-->AA
AI-->AC
AI-->AE
AI-->AM
AI-->AT
AI-->25
AI-->30
AI-->8L
AI-->E3
AI-->EZ
AI-->GB
AK-->AV
AK-->AZ
AK-->A0
AK-->A2
AK-->A8
AK-->AG
AK-->EZ
AM-->AZ
AM-->25
AM-->30
AM-->3Y
AM-->E3
AM-->EZ
AM-->GB
AN-->A0
AN-->A2
AN-->A4
AN-->A6
AN-->AA
AN-->AC
AN-->AE
AN-->AG
AN-->AI
AN-->AK
AN-->AM
AN-->AP
AN-->AR
AN-->AT
AP-->AR
AP-->EZ
AR-->AX
AR-->AZ
AR-->B1
AR-->B2
AR-->EZ
AR-->GB
AT-->AZ
AT-->B1
AT-->B2
AT-->AR
AT-->Q
AT-->EZ
AU-->30
AU-->E3
AU-->GB
AV-->Q
AW-->AX
AW-->Q
AW-->30
AW-->EZ
AW-->GB
AX-->GB
AY-->AI
AY-->AK
AY-->AP
AY-->E3
AZ-->9X
AZ-->AX
AZ-->Q
AZ-->25
AZ-->30
AZ-->3P
AZ-->3Y
B0-->AN
B0-->AV
B0-->AX
B0-->AY
B0-->AZ
B0-->B1
B0-->B2
B1-->Q
B2-->Q
B5-->B7
B5-->BB
B5-->BD
B5-->BF
B7-->B9
B7-->BB
B7-->BD
B7-->BF
B7-->EZ
B9-->BI
B9-->5E
B9-->EZ
BB-->BI
BB-->1O
BB-->25
BB-->5E
BB-->EZ
BD-->Q
BD-->1O
BD-->25
BD-->5E
BD-->EZ
BD-->GB
BF-->Q
BF-->25
BF-->5E
BF-->EZ
BF-->GB
BG-->B5
BG-->BH
BH-->B7
BI-->5E
BI-->EZ
BL-->BN
BL-->BP
BL-->BR
BL-->BT
BL-->BV
BL-->BX
BL-->BZ
BL-->C1
BN-->BT
BN-->Q
BN-->1H
BN-->EZ
BN-->GB
BP-->Q
BP-->1H
BP-->E3
BP-->EZ
BR-->C3
BR-->EZ
BT-->Q
BT-->1H
BT-->E3
BT-->EZ
BT-->GB
BV-->C4
BV-->C7
BV-->BN
BV-->BP
BV-->BX
BV-->BZ
BV-->1H
BV-->25
BV-->EZ
BX-->C5
BX-->Q
BX-->25
BX-->EZ
BX-->GR
BZ-->Q
BZ-->25
BZ-->EZ
BZ-->GB
C1-->C3
C1-->C7
C1-->BR
C1-->BX
C1-->Q
C1-->EZ
C2-->BL
C2-->C3
C2-->C4
C2-->C5
C2-->C6
C2-->C7
C3-->C4
C3-->C5
C3-->Q
C3-->1H
C3-->EZ
C3-->GB
C4-->1H
C4-->EZ
C4-->GB
C5-->Q
C6-->BV
C6-->C1
C6-->E3
C7-->Q
C7-->1H
C7-->25
C7-->GB
C9-->EZ
CC-->C9
CC-->CO
CC-->CE
CC-->CG
CC-->25
CC-->30
CC-->EZ
CC-->GB
CE-->C9
CE-->EZ
CG-->C9
CG-->EZ
CH-->CC
CH-->CE
CH-->CG
CH-->CJ
CH-->CL
CJ-->CC
CJ-->CL
CJ-->25
CJ-->EZ
CL-->CN
CL-->CO
CL-->25
CL-->30
CL-->E3
CL-->EZ
CL-->GB
CM-->CH
CM-->CP
CO-->25
CO-->30
CO-->3Y
CP-->CJ
CS-->D0
CU-->1E
CU-->EZ
CW-->25
CW-->EZ
CW-->GB
CY-->72
CY-->EZ
D0-->CU
D0-->CW
D0-->CY
D0-->D2
D0-->D4
D0-->D6
D0-->EZ
D2-->25
D2-->EZ
D2-->GB
D4-->25
D4-->EZ
D4-->GB
D6-->25
D6-->3P
D6-->EZ
D7-->CS
D7-->D8
D8-->D0
DA-->Q
DD-->Q
DD-->25
DD-->3U
DD-->EZ
DD-->GB
DF-->DA
DG-->DI
DG-->DK
DG-->DM
DG-->DQ
DG-->DS
DI-->DA
DI-->B
DI-->25
DI-->EZ
DK-->DA
DK-->DD
DK-->B
DK-->Q
DK-->25
DK-->3U
DK-->5E
DK-->EZ
DM-->DA
DM-->DU
DM-->B
DM-->25
DM-->EZ
DM-->GB
DO-->DA
DO-->DV
DO-->DF
DO-->EZ
DO-->GB
DQ-->DA
DQ-->DU
DQ-->DV
DQ-->DI
DQ-->DK
DQ-->DM
DQ-->DO
DQ-->DS
DQ-->B
DQ-->Q
DQ-->25
DQ-->3Y
DQ-->5E
DQ-->EZ
DQ-->GB
DS-->25
DS-->3Y
DS-->EZ
DS-->GB
DT-->DW
DU-->Q
DU-->3Y
DV-->Q
DW-->DQ
E3-->DZ
E3-->E0
E3-->E2
E3-->E4
E3-->E5
E5-->GB
E8-->EE
E8-->ES
E8-->EU
E8-->F1
E8-->FT
E8-->Q
E8-->GB
EA-->GB
EC-->GB
EE-->GB
EG-->GB
EI-->EE
EI-->F3
EI-->F7
EI-->FT
EK-->GB
EM-->EE
EM-->EQ
EM-->GB
EO-->GB
EQ-->GB
ES-->EW
ES-->FT
EU-->GB
EW-->GB
EZ-->E8
EZ-->EA
EZ-->EC
EZ-->EE
EZ-->EG
EZ-->EI
EZ-->EK
EZ-->EM
EZ-->EO
EZ-->EQ
EZ-->ES
EZ-->EU
EZ-->EW
EZ-->EY
EZ-->F1
EZ-->F3
EZ-->F5
EZ-->F7
EZ-->F9
EZ-->FB
EZ-->FD
EZ-->FF
EZ-->FH
EZ-->FJ
EZ-->FL
EZ-->FN
EZ-->FP
EZ-->FR
EZ-->FT
F1-->GB
F3-->GB
F5-->EW
F7-->GB
F9-->EW
F9-->FT
FB-->EE
FB-->EW
FB-->FT
FB-->GB
FD-->GB
FF-->GB
FH-->EE
FH-->25
FJ-->E8
FJ-->EE
FJ-->EW
FJ-->FD
FJ-->FT
FJ-->Q
FJ-->GB
FL-->GB
FN-->FF
FN-->FT
FN-->GB
FP-->GB
FR-->GB
FT-->GB
FV-->G3
FY-->G8
G1-->G8
G2-->G3
G3-->G8
G7-->G8
GB-->FV
GB-->FW
GB-->FX
GB-->FY
GB-->FZ
GB-->G0
GB-->G1
GB-->G3
GB-->G2
GB-->G4
GB-->G5
GB-->G6
GB-->G8
GB-->G9
GB-->GA
GB-->GC
GB-->GD
GB-->GE
GB-->GF
GB-->GG
GB-->GH
GB-->GI
GB-->GJ
GB-->GK
GB-->GL
GB-->GM
GB-->GN
GB-->GO
GB-->GS
GB-->GT
GE-->G8
GH-->G1
GH-->GI
GI-->G1
GL-->FY
```
