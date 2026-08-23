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
- 415 leaf nodes, 1281 edges.
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
subgraph C0["loan-what-if"]
C1["loan-what-if.component.ts"]
end
subgraph C2["loans-overview"]
C3["loans-overview.component.ts"]
end
end
C4["index.ts"]
C5["loan-card-vm.ts"]
C6["loan-schedule-status.ts"]
C7["loan-types.ts"]
C8["loan-what-if-vm.ts"]
C9["loans.routes.ts"]
CA["loans.store.ts"]
end
subgraph CB["feature-recurring"]
CC["bills-calendar-vm.ts"]
subgraph CD["components"]
subgraph CE["bills-calendar"]
CF["bills-calendar.component.ts"]
end
subgraph CG["bills-day-list"]
CH["bills-day-list.component.ts"]
end
subgraph CI["bills-month-grid"]
CJ["bills-month-grid.component.ts"]
end
CK["index.ts"]
subgraph CL["recurring-overview"]
CM["recurring-overview.component.ts"]
end
subgraph CN["recurring-payments-panel"]
CO["recurring-payments-panel.component.ts"]
end
end
CP["index.ts"]
CQ["recurring-payments-row-vm.ts"]
CR["recurring-series.store.ts"]
CS["recurring.routes.ts"]
end
subgraph CT["feature-settings"]
subgraph CU["components"]
CV["index.ts"]
subgraph CW["settings-about-section"]
CX["settings-about-section.component.ts"]
end
subgraph CY["settings-currency-locale-section"]
CZ["settings-currency-locale-section.component.ts"]
end
subgraph D0["settings-data-section"]
D1["settings-data-section.component.ts"]
end
subgraph D2["settings-overview"]
D3["settings-overview.component.ts"]
end
subgraph D4["settings-privacy-section"]
D5["settings-privacy-section.component.ts"]
end
subgraph D6["settings-reporting-section"]
D7["settings-reporting-section.component.ts"]
end
subgraph D8["settings-theme-section"]
D9["settings-theme-section.component.ts"]
end
end
DA["index.ts"]
DB["settings.routes.ts"]
end
subgraph DC["feature-transactions"]
DD["category-picker.ts"]
subgraph DE["components"]
subgraph DF["attribution-override-fieldset"]
DG["attribution-override-fieldset.component.ts"]
end
subgraph DH["category-select-cell"]
DI["category-select-cell.component.ts"]
end
DJ["index.ts"]
subgraph DK["transaction-bulk-bar"]
DL["transaction-bulk-bar.component.ts"]
end
subgraph DM["transaction-edit-form"]
DN["transaction-edit-form.component.ts"]
end
subgraph DO["transaction-filters"]
DP["transaction-filters.component.ts"]
end
subgraph DQ["transaction-row"]
DR["transaction-row.component.ts"]
end
subgraph DS["transactions-overview"]
DT["transactions-overview.component.ts"]
end
subgraph DU["transfer-review"]
DV["transfer-review.component.ts"]
end
end
DW["index.ts"]
DX["transaction-filters.ts"]
DY["transaction-row-vm.ts"]
DZ["transactions.routes.ts"]
end
subgraph E0["shared"]
subgraph E1["echarts"]
E2["bucketed-axis-option.ts"]
E3["chart-theme.ts"]
E4["echarts-jsdom.testing.ts"]
E5["echarts-setup.ts"]
E6["index.ts"]
E7["legend-option.ts"]
E8["tooltip-formatter.ts"]
end
subgraph E9["ui"]
subgraph EA["absolute-range-panel"]
EB["absolute-range-panel.component.ts"]
end
subgraph EC["alert"]
ED["alert.component.ts"]
end
subgraph EE["badge"]
EF["badge.component.ts"]
end
subgraph EG["button"]
EH["button.component.ts"]
end
subgraph EI["collapse"]
EJ["collapse.component.ts"]
end
subgraph EK["confirm-dialog"]
EL["confirm-dialog.component.ts"]
end
subgraph EM["cycle-picker"]
EN["cycle-picker.component.ts"]
end
subgraph EO["date-range-input"]
EP["date-range-input.component.ts"]
end
subgraph EQ["divider"]
ER["divider.component.ts"]
end
subgraph ES["dropdown"]
ET["dropdown.component.ts"]
end
subgraph EU["empty-state"]
EV["empty-state.component.ts"]
end
subgraph EW["fieldset"]
EX["fieldset.component.ts"]
end
subgraph EY["flex"]
EZ["flex.component.ts"]
end
subgraph F0["granularity-picker"]
F1["granularity-picker.component.ts"]
end
F2["index.ts"]
subgraph F3["input"]
F4["input.component.ts"]
end
subgraph F5["label"]
F6["label.component.ts"]
end
subgraph F7["loading-skeleton"]
F8["loading-skeleton.component.ts"]
end
subgraph F9["modal"]
FA["mm-modal.component.ts"]
end
subgraph FB["page-header"]
FC["page-header.component.ts"]
end
subgraph FD["paginator"]
FE["paginator.component.ts"]
end
subgraph FF["paper"]
FG["paper.component.ts"]
end
subgraph FH["privacy-blur"]
FI["privacy-blur.component.ts"]
end
subgraph FJ["privacy-toggle"]
FK["privacy-toggle.component.ts"]
end
subgraph FL["range-picker"]
FM["range-picker.component.ts"]
end
subgraph FN["select"]
FO["select.component.ts"]
end
subgraph FP["stat-card"]
FQ["stat-card.component.ts"]
end
subgraph FR["table"]
FS["table.component.ts"]
end
subgraph FT["tabs"]
FU["tabs.component.ts"]
end
subgraph FV["typography"]
FW["typography.component.ts"]
end
end
subgraph FX["utils"]
FY["calendar-cycles.ts"]
FZ["confidence-color.ts"]
G0["confirm-state.ts"]
G1["currency-format.ts"]
G2["currency-symbol-presets.ts"]
G3["daisy-classes.ts"]
G4["date-buckets.ts"]
G5["date-format.pipe.ts"]
G6["date-format.ts"]
G7["debounced-text.ts"]
G8["download-json.ts"]
G9["fingerprint.ts"]
GA["format-settings.testing.ts"]
GB["format-settings.ts"]
GC["hidden-amount.ts"]
GD["iban.ts"]
GE["index.ts"]
GF["link-control-to-setting.ts"]
GG["locale-presets.ts"]
GH["number-format.ts"]
GI["pagination.ts"]
GJ["percentage.ts"]
GK["quick-ranges.ts"]
GL["range-expression.ts"]
GM["search-params.ts"]
GN["selection-model.ts"]
GO["signed-amount.pipe.ts"]
GP["sortable.ts"]
GQ["structural-filters.ts"]
GR["theme-hooks.ts"]
GS["unrendered-markup.testing.ts"]
subgraph GT["validators"]
GU["iban.validator.ts"]
GV["percentage.validator.ts"]
end
GW["with-archivable.ts"]
GX["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3Y
5-->4
5-->6
6-->Q
6-->GE
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
G-->G9
G-->GB
H-->G
H-->3P
H-->GE
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
Z-->GE
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
16-->GE
17-->Z
17-->10
17-->11
17-->13
17-->14
17-->15
17-->16
1A-->25
1A-->EH
1A-->FW
1B-->1A
1E-->1D
1G-->GE
1H-->1G
1H-->1I
1H-->1J
1I-->1G
1I-->Q
1I-->GE
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
1Y-->GE
1Z-->Q
1Z-->3P
1Z-->GE
20-->28
20-->Q
20-->GE
21-->22
21-->30
21-->E6
21-->GE
22-->30
22-->E6
22-->GE
23-->Q
23-->30
24-->Q
24-->GE
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
26-->GE
27-->1Z
27-->GE
28-->Q
28-->3U
28-->3Y
29-->Q
2A-->28
2A-->29
2A-->Q
2A-->3Y
2C-->Q
2C-->GE
2D-->2C
2D-->Q
2D-->GE
2E-->2G
2E-->2V
2E-->GE
2F-->2M
2F-->Q
2G-->2F
2G-->Q
2G-->GE
2H-->2F
2H-->2M
2H-->Q
2H-->GE
2I-->2M
2I-->Q
2J-->Q
2K-->2F
2K-->38
2K-->Q
2L-->GE
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
2P-->GE
2Q-->Q
2R-->Q
2R-->GE
2S-->GE
2T-->2U
2U-->2V
2U-->Q
2V-->2G
2V-->Q
2V-->GE
2W-->2X
2W-->2Z
2W-->3G
2W-->Q
2X-->2G
2X-->2V
2X-->GE
2Y-->2V
2Y-->3I
2Y-->GE
2Z-->2G
2Z-->2P
2Z-->2V
2Z-->GE
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
33-->GE
34-->3J
36-->GE
37-->2M
37-->Q
38-->GE
39-->GE
3A-->2M
3A-->B
3A-->Q
3A-->GE
3B-->3A
3B-->GE
3C-->Q
3C-->GE
3D-->37
3D-->Q
3D-->GE
3E-->2F
3E-->2I
3E-->Q
3F-->Q
3F-->3Y
3G-->2U
3H-->2M
3H-->Q
3H-->GE
3I-->37
3I-->Q
3J-->2G
3J-->Q
3J-->GE
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
42-->GE
44-->Q
45-->Q
46-->Q
47-->Q
48-->4N
48-->4P
48-->E6
49-->30
49-->GE
4A-->Q
4A-->25
4A-->30
4A-->GE
4D-->F2
4D-->GE
4F-->49
4F-->4A
4F-->Q
4F-->30
4F-->E6
4F-->F2
4F-->GE
4H-->49
4H-->4A
4H-->Q
4H-->25
4H-->30
4H-->E6
4H-->F2
4J-->44
4J-->45
4J-->4D
4J-->F2
4L-->45
4L-->47
4L-->Q
4L-->F2
4L-->GE
4L-->GU
4L-->GV
4N-->4D
4N-->4F
4N-->4L
4N-->25
4N-->F2
4N-->GE
4P-->44
4P-->45
4P-->46
4P-->4H
4P-->4J
4P-->4L
4P-->Q
4P-->25
4P-->F2
4P-->GE
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
4X-->F2
50-->4U
50-->4X
50-->52
50-->B
50-->Q
50-->25
50-->F2
50-->GE
52-->4U
52-->Q
52-->F2
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
55-->F2
57-->5G
57-->25
57-->F2
57-->GE
59-->5F
59-->55
59-->B
59-->Q
59-->25
59-->F2
5B-->5I
5B-->5K
5B-->F2
5B-->GE
5D-->5G
5D-->5J
5D-->5K
5D-->57
5D-->59
5D-->5B
5D-->Q
5D-->25
5D-->F2
5D-->GE
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
5K-->GE
5M-->5R
5P-->F2
5R-->5U
5R-->5V
5R-->5W
5R-->5X
5R-->5P
5R-->F2
5S-->5R
5W-->5U
5X-->5V
5Y-->5M
5Y-->5S
60-->Q
64-->25
64-->F2
64-->GE
66-->25
66-->3Y
66-->F2
66-->GE
68-->6W
68-->25
68-->30
68-->E6
68-->F2
68-->GE
6A-->60
6A-->61
6A-->6W
6A-->6C
6A-->6E
6A-->25
6A-->F2
6A-->GE
6C-->25
6C-->F2
6E-->61
6E-->F2
6G-->6S
6G-->6T
6G-->Q
6G-->F2
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
6I-->F2
6I-->GE
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
6L-->E6
6L-->F2
6L-->GE
6N-->6W
6N-->25
6N-->F2
6N-->GE
6P-->25
6P-->30
6P-->3Y
6P-->E6
6P-->F2
6P-->GE
6R-->6W
6R-->25
6R-->F2
6R-->GE
6S-->6T
6S-->Q
6T-->Q
6U-->6I
6U-->E6
6V-->6J
6V-->6U
6W-->60
6W-->25
6W-->30
6W-->3Y
70-->Q
70-->3L
70-->F2
70-->GE
71-->70
72-->71
76-->79
76-->7B
76-->25
76-->F2
77-->76
77-->79
77-->7B
79-->25
79-->30
79-->E6
79-->F2
79-->GE
7B-->Q
7B-->25
7B-->30
7B-->3Y
7B-->E6
7B-->F2
7B-->GE
7C-->76
7C-->E6
7D-->77
7D-->7C
7H-->7Y
7H-->80
7H-->Q
7H-->25
7H-->30
7H-->F2
7H-->GE
7J-->7Z
7J-->F2
7L-->7H
7L-->7R
7L-->7U
7L-->F2
7N-->Q
7N-->F2
7P-->82
7P-->F2
7R-->7Z
7R-->80
7R-->82
7R-->7J
7R-->7N
7R-->7P
7R-->Q
7R-->25
7R-->F2
7R-->GE
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
7U-->F2
7U-->GE
7W-->85
7X-->Q
7Y-->Q
7Y-->30
7Y-->F2
7Y-->GE
7Z-->7X
7Z-->Q
7Z-->30
7Z-->F2
7Z-->GE
80-->Q
80-->25
80-->30
80-->3Y
81-->7L
81-->E6
82-->Q
82-->30
82-->F2
82-->GE
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
84-->E6
84-->GE
89-->8I
89-->F2
8B-->8J
8B-->8D
8B-->F2
8D-->8J
8D-->F2
8F-->8J
8F-->F2
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
8P-->F2
8Q-->8P
8R-->8P
8S-->8Q
8S-->8R
8U-->Q
8X-->9Q
8X-->4R
8X-->F2
8Z-->F2
91-->95
91-->F2
93-->95
93-->F2
95-->F2
97-->8U
97-->95
97-->F2
99-->9U
99-->F2
9B-->8U
9B-->F2
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
9D-->F2
9F-->17
9F-->F2
9F-->GE
9H-->9Q
9H-->9V
9H-->9O
9H-->Q
9H-->17
9H-->F2
9J-->Q
9J-->F2
9L-->9R
9L-->8Z
9L-->9D
9L-->9H
9L-->9J
9L-->25
9L-->F2
9M-->9D
9M-->9F
9M-->9H
9M-->9J
9M-->9L
9O-->9Q
9O-->8X
9O-->Q
9O-->F2
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
A0-->F2
A0-->GE
A2-->AV
A2-->F2
A4-->F2
A6-->AW
A6-->AX
A6-->AZ
A6-->25
A6-->30
A6-->F2
A8-->AZ
A8-->3P
A8-->E6
A8-->F2
AA-->AU
AA-->AZ
AA-->A4
AA-->25
AA-->30
AA-->E6
AA-->F2
AA-->GE
AC-->AX
AC-->AZ
AC-->25
AC-->30
AC-->F2
AC-->GE
AE-->25
AE-->8L
AE-->F2
AG-->AV
AG-->AZ
AG-->F2
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
AI-->E6
AI-->F2
AI-->GE
AK-->AV
AK-->AZ
AK-->A0
AK-->A2
AK-->A8
AK-->AG
AK-->F2
AM-->AZ
AM-->25
AM-->30
AM-->3Y
AM-->E6
AM-->F2
AM-->GE
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
AP-->F2
AR-->AX
AR-->AZ
AR-->B1
AR-->B2
AR-->F2
AR-->GE
AT-->AZ
AT-->B1
AT-->B2
AT-->AR
AT-->Q
AT-->F2
AU-->30
AU-->E6
AU-->GE
AV-->Q
AW-->AX
AW-->Q
AW-->30
AW-->F2
AW-->GE
AX-->GE
AY-->AI
AY-->AK
AY-->AP
AY-->E6
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
B7-->F2
B9-->BI
B9-->5E
B9-->F2
BB-->BI
BB-->1O
BB-->25
BB-->5E
BB-->F2
BD-->Q
BD-->1O
BD-->25
BD-->5E
BD-->F2
BD-->GE
BF-->Q
BF-->25
BF-->5E
BF-->F2
BF-->GE
BG-->B5
BG-->BH
BH-->B7
BI-->5E
BI-->F2
BL-->BN
BL-->BP
BL-->BR
BL-->BT
BL-->BV
BL-->BX
BL-->BZ
BL-->C1
BL-->C3
BN-->BT
BN-->Q
BN-->1H
BN-->F2
BN-->GE
BP-->Q
BP-->1H
BP-->E6
BP-->F2
BR-->C5
BR-->F2
BT-->Q
BT-->1H
BT-->E6
BT-->F2
BT-->GE
BV-->C6
BV-->CA
BV-->BN
BV-->BP
BV-->BX
BV-->BZ
BV-->C1
BV-->1H
BV-->25
BV-->F2
BX-->C7
BX-->Q
BX-->25
BX-->F2
BX-->GV
BZ-->Q
BZ-->25
BZ-->F2
BZ-->GE
C1-->C8
C1-->Q
C1-->1H
C1-->25
C1-->E6
C1-->F2
C3-->C5
C3-->CA
C3-->BR
C3-->BX
C3-->Q
C3-->F2
C4-->BL
C4-->C5
C4-->C6
C4-->C7
C4-->C8
C4-->C9
C4-->CA
C5-->C6
C5-->C7
C5-->Q
C5-->1H
C5-->F2
C5-->GE
C6-->1H
C6-->F2
C6-->GE
C7-->Q
C8-->1H
C8-->GE
C9-->BV
C9-->C3
C9-->E6
CA-->Q
CA-->1H
CA-->25
CA-->GE
CC-->F2
CF-->CC
CF-->CR
CF-->CH
CF-->CJ
CF-->25
CF-->30
CF-->F2
CF-->GE
CH-->CC
CH-->F2
CJ-->CC
CJ-->F2
CK-->CF
CK-->CH
CK-->CJ
CK-->CM
CK-->CO
CM-->CF
CM-->CO
CM-->25
CM-->F2
CO-->CQ
CO-->CR
CO-->25
CO-->30
CO-->E6
CO-->F2
CO-->GE
CP-->CK
CP-->CS
CR-->25
CR-->30
CR-->3Y
CS-->CM
CV-->D3
CX-->1E
CX-->F2
CZ-->25
CZ-->F2
CZ-->GE
D1-->72
D1-->F2
D3-->CX
D3-->CZ
D3-->D1
D3-->D5
D3-->D7
D3-->D9
D3-->F2
D5-->25
D5-->F2
D5-->GE
D7-->25
D7-->F2
D7-->GE
D9-->25
D9-->3P
D9-->F2
DA-->CV
DA-->DB
DB-->D3
DD-->Q
DG-->Q
DG-->25
DG-->3U
DG-->F2
DG-->GE
DI-->DD
DJ-->DL
DJ-->DN
DJ-->DP
DJ-->DT
DJ-->DV
DL-->DD
DL-->B
DL-->25
DL-->F2
DN-->DD
DN-->DG
DN-->B
DN-->Q
DN-->25
DN-->3U
DN-->5E
DN-->F2
DP-->DD
DP-->DX
DP-->B
DP-->25
DP-->F2
DP-->GE
DR-->DD
DR-->DY
DR-->DI
DR-->F2
DR-->GE
DT-->DD
DT-->DX
DT-->DY
DT-->DL
DT-->DN
DT-->DP
DT-->DR
DT-->DV
DT-->B
DT-->Q
DT-->25
DT-->3Y
DT-->5E
DT-->F2
DT-->GE
DV-->25
DV-->3Y
DV-->F2
DV-->GE
DW-->DZ
DX-->Q
DX-->3Y
DY-->Q
DZ-->DT
E6-->E2
E6-->E3
E6-->E5
E6-->E7
E6-->E8
E8-->GE
EB-->EH
EB-->EV
EB-->EX
EB-->F4
EB-->FW
EB-->Q
EB-->GE
ED-->GE
EF-->GE
EH-->GE
EJ-->GE
EL-->EH
EL-->F6
EL-->FA
EL-->FW
EN-->GE
EP-->EH
EP-->ET
EP-->GE
ER-->GE
ET-->GE
EV-->EZ
EV-->FW
EX-->GE
EZ-->GE
F2-->EB
F2-->ED
F2-->EF
F2-->EH
F2-->EJ
F2-->EL
F2-->EN
F2-->EP
F2-->ER
F2-->ET
F2-->EV
F2-->EX
F2-->EZ
F2-->F1
F2-->F4
F2-->F6
F2-->F8
F2-->FA
F2-->FC
F2-->FE
F2-->FG
F2-->FI
F2-->FK
F2-->FM
F2-->FO
F2-->FQ
F2-->FS
F2-->FU
F2-->FW
F4-->GE
F6-->GE
F8-->EZ
FA-->GE
FC-->EZ
FC-->FW
FE-->EH
FE-->EZ
FE-->FW
FE-->GE
FG-->GE
FI-->GE
FK-->EH
FK-->25
FM-->EB
FM-->EH
FM-->EZ
FM-->FG
FM-->FW
FM-->Q
FM-->GE
FO-->GE
FQ-->FI
FQ-->FW
FQ-->GE
FS-->GE
FU-->GE
FW-->GE
FY-->G6
G1-->GB
G4-->GB
G5-->G6
G6-->GB
GA-->GB
GE-->FY
GE-->FZ
GE-->G0
GE-->G1
GE-->G2
GE-->G3
GE-->G4
GE-->G6
GE-->G5
GE-->G7
GE-->G8
GE-->G9
GE-->GB
GE-->GC
GE-->GD
GE-->GF
GE-->GG
GE-->GH
GE-->GI
GE-->GJ
GE-->GK
GE-->GL
GE-->GM
GE-->GN
GE-->GO
GE-->GP
GE-->GQ
GE-->GR
GE-->GW
GE-->GX
GH-->GB
GK-->G4
GK-->GL
GL-->G4
GO-->G1
```
