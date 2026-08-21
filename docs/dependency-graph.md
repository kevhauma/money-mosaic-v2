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
- 402 leaf nodes, 1210 edges.
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
end
subgraph 1I["ml"]
1J["category-model.worker.ts"]
1K["category-model.worker.types.ts"]
1L["feature-hashing.ts"]
1M["index.ts"]
1N["model-config.ts"]
1O["rule-proposal-mining.ts"]
1P["training-window.ts"]
end
subgraph 1Q["onboarding"]
1R["home-redirect.guard.ts"]
1S["index.ts"]
1T["mark-visited.guard.ts"]
1U["visited.service.ts"]
end
subgraph 1V["state"]
1W["accounts.store.ts"]
1X["app-settings.store.ts"]
1Y["categories.store.ts"]
1Z["chart-options-control.ts"]
20["chart-options.store.ts"]
21["forecast-settings.store.ts"]
22["goals.store.ts"]
23["index.ts"]
24["page-range-control.ts"]
25["range-state.store.ts"]
26["transactions.store.ts"]
27["transfer-settings.store.ts"]
28["transfers.store.ts"]
end
subgraph 29["stats"]
2A["account-balance-history.ts"]
2B["account-balance-trend.ts"]
2C["annual-lump-sum-smoothing.ts"]
2D["category-breakdown.ts"]
2E["category-composition-trend.ts"]
2F["category-cycle-heatmap.ts"]
2G["category-expense-transactions.ts"]
2H["category-kind-contribution.ts"]
2I["category-period-comparison.ts"]
2J["chart-zoom-window.ts"]
2K["classify-for-stats.ts"]
2L["classify-joint-leg.ts"]
2M["day-transactions.ts"]
2N["embedded-bonus-smoothing.ts"]
2O["full-history-range.ts"]
2P["goal-affordability.ts"]
2Q["granularity-for-span.ts"]
2R["gross-net-growth.ts"]
2S["gross-net-ratio.ts"]
2T["income-category-series.ts"]
2U["income-events.ts"]
2V["income-gap-detection.ts"]
2W["income-growth.ts"]
2X["income-step-change-detection.ts"]
2Y["index.ts"]
2Z["joint-account-stake.ts"]
30["joint-contributor-breakdown.ts"]
31["money-flow-graph.ts"]
32["multi-year-income-comparison.ts"]
33["net-margin.ts"]
34["net-worth-projection.ts"]
35["period-stats.ts"]
36["period-window.ts"]
37["periodized-rate.ts"]
38["recurring-payments.ts"]
39["recurring-projection.ts"]
3A["required-saving-rate.ts"]
3B["saving-velocity.ts"]
3C["spending-mosaic.ts"]
3D["top-transactions.ts"]
3E["wage-change-detection.ts"]
3F["weekday-weekend-split.ts"]
3G["year-over-year.ts"]
3H["yearly-income-summary.ts"]
end
subgraph 3I["storage"]
3J["index.ts"]
3K["storage-status.service.ts"]
end
subgraph 3L["theme"]
3M["accent-colors.ts"]
3N["index.ts"]
3O["theme-styles.ts"]
3P["theme.service.ts"]
end
subgraph 3Q["transactions"]
3R["attribution-override.ts"]
3S["index.ts"]
3T["nullify-transaction.ts"]
3U["transaction-deletion.service.ts"]
end
subgraph 3V["transfers"]
3W["index.ts"]
3X["transfer-cleanup.service.ts"]
3Y["transfer-linking.service.ts"]
3Z["transfer-matching.service.ts"]
40["transfer-matching.ts"]
end
end
subgraph 41["feature-accounts"]
42["account-card-vm.ts"]
43["account-icons.ts"]
44["account-list-order.ts"]
45["account-types.ts"]
46["accounts.routes.ts"]
47["balance-day-tooltip.ts"]
48["balance-trend-signals.ts"]
subgraph 49["components"]
subgraph 4A["account-balance-block"]
4B["account-balance-block.component.ts"]
end
subgraph 4C["account-balance-chart"]
4D["account-balance-chart.component.ts"]
end
subgraph 4E["account-balance-history-chart"]
4F["account-balance-history-chart.component.ts"]
end
subgraph 4G["account-card"]
4H["account-card.component.ts"]
end
subgraph 4I["account-form"]
4J["account-form.component.ts"]
end
subgraph 4K["accounts-detail"]
4L["accounts-detail.component.ts"]
end
subgraph 4M["accounts-overview"]
4N["accounts-overview.component.ts"]
end
4O["index.ts"]
end
4P["index.ts"]
end
subgraph 4Q["feature-categories"]
4R["categories.routes.ts"]
4S["category-icons.ts"]
4T["category-model.service.ts"]
4U["category-model.store.ts"]
4V["category-row-vm.ts"]
subgraph 4W["components"]
subgraph 4X["categories-overview"]
4Y["categories-overview.component.ts"]
end
subgraph 4Z["category-form"]
50["category-form.component.ts"]
end
51["index.ts"]
subgraph 52["rule-condition-row"]
53["rule-condition-row.component.ts"]
end
subgraph 54["rule-filters"]
55["rule-filters.component.ts"]
end
subgraph 56["rule-form"]
57["rule-form.component.ts"]
end
subgraph 58["rule-share-bar"]
59["rule-share-bar.component.ts"]
end
subgraph 5A["rules-overview"]
5B["rules-overview.component.ts"]
end
end
5C["index.ts"]
5D["rule-condition-editor.ts"]
5E["rule-filters.ts"]
5F["rule-labels.ts"]
5G["rule-share.ts"]
5H["rule-summary.ts"]
5I["rules.store.ts"]
end
subgraph 5J["feature-changelog"]
5K["changelog.routes.ts"]
subgraph 5L["components"]
subgraph 5M["changelog-entry-row"]
5N["changelog-entry-row.component.ts"]
end
subgraph 5O["changelog-page"]
5P["changelog-page.component.ts"]
end
5Q["index.ts"]
end
subgraph 5R["data"]
5S["changelog-entries.ts"]
5T["roadmap-entries.ts"]
end
5U["group-changelog-entries.ts"]
5V["group-roadmap-entries.ts"]
5W["index.ts"]
end
subgraph 5X["feature-dashboard"]
5Y["category-comparison-settings.store.ts"]
5Z["category-comparison-vm.ts"]
subgraph 60["components"]
subgraph 61["account-balance-strip"]
62["account-balance-strip.component.ts"]
end
subgraph 63["action-queue-panel"]
64["action-queue-panel.component.ts"]
end
subgraph 65["category-breakdown-panel"]
66["category-breakdown-panel.component.ts"]
end
subgraph 67["category-comparison-panel"]
68["category-comparison-panel.component.ts"]
end
subgraph 69["category-exclusion-dropdown"]
6A["category-exclusion-dropdown.component.ts"]
end
subgraph 6B["comparison-category-card"]
6C["comparison-category-card.component.ts"]
end
subgraph 6D["dashboard-customize-panel"]
6E["dashboard-customize-panel.component.ts"]
end
subgraph 6F["dashboard-overview"]
6G["dashboard-overview.component.ts"]
end
6H["index.ts"]
subgraph 6I["spending-heatmap-panel"]
6J["spending-heatmap-panel.component.ts"]
end
subgraph 6K["top-transactions-panel"]
6L["top-transactions-panel.component.ts"]
end
subgraph 6M["trend-chart-panel"]
6N["trend-chart-panel.component.ts"]
end
subgraph 6O["weekday-weekend-split-panel"]
6P["weekday-weekend-split-panel.component.ts"]
end
end
6Q["dashboard-layout-settings.store.ts"]
6R["dashboard-row-order.ts"]
6S["dashboard.routes.ts"]
6T["index.ts"]
6U["stats.store.ts"]
end
subgraph 6V["feature-data-management"]
subgraph 6W["components"]
subgraph 6X["data-management-overview"]
6Y["data-management-overview.component.ts"]
end
6Z["index.ts"]
end
70["index.ts"]
end
subgraph 71["feature-explore"]
subgraph 72["components"]
subgraph 73["explore-overview"]
74["explore-overview.component.ts"]
end
75["index.ts"]
subgraph 76["money-flow-panel"]
77["money-flow-panel.component.ts"]
end
subgraph 78["spending-mosaic-panel"]
79["spending-mosaic-panel.component.ts"]
end
end
7A["explore.routes.ts"]
7B["index.ts"]
end
subgraph 7C["feature-future"]
subgraph 7D["components"]
subgraph 7E["forecast-controls"]
7F["forecast-controls.component.ts"]
end
subgraph 7G["forecast-notice"]
7H["forecast-notice.component.ts"]
end
subgraph 7I["future-overview"]
7J["future-overview.component.ts"]
end
subgraph 7K["goal-form"]
7L["goal-form.component.ts"]
end
subgraph 7M["goal-row"]
7N["goal-row.component.ts"]
end
subgraph 7O["goals-panel"]
7P["goals-panel.component.ts"]
end
7Q["index.ts"]
subgraph 7R["net-worth-projection-chart"]
7S["net-worth-projection-chart.component.ts"]
end
subgraph 7T["projection-figure-table"]
7U["projection-figure-table.component.ts"]
end
end
7V["forecast-chart-copy.ts"]
7W["forecast-controls-vm.ts"]
7X["forecast-notices.ts"]
7Y["forecast.store.ts"]
7Z["future.routes.ts"]
80["goal-row-vm.ts"]
81["index.ts"]
82["net-worth-projection-chart-option.ts"]
83["projection-accessible-row.ts"]
end
subgraph 84["feature-help"]
subgraph 85["components"]
subgraph 86["faq-page"]
87["faq-page.component.ts"]
end
subgraph 88["guide-detail"]
89["guide-detail.component.ts"]
end
subgraph 8A["guide-steps"]
8B["guide-steps.component.ts"]
end
subgraph 8C["guides-index"]
8D["guides-index.component.ts"]
end
8E["index.ts"]
end
subgraph 8F["data"]
8G["faq.ts"]
8H["guides.ts"]
end
8I["help.routes.ts"]
8J["index.ts"]
end
subgraph 8K["feature-home"]
subgraph 8L["components"]
subgraph 8M["home-landing"]
8N["home-landing.component.ts"]
end
8O["index.ts"]
end
8P["home.routes.ts"]
8Q["index.ts"]
end
subgraph 8R["feature-import"]
8S["column-mapping.ts"]
subgraph 8T["components"]
subgraph 8U["account-draft-editor"]
8V["account-draft-editor.component.ts"]
end
subgraph 8W["batch-wait-card"]
8X["batch-wait-card.component.ts"]
end
subgraph 8Y["column-map-amount-field"]
8Z["column-map-amount-field.component.ts"]
end
subgraph 90["column-map-counterparty-field"]
91["column-map-counterparty-field.component.ts"]
end
subgraph 92["column-map-sample-caption"]
93["column-map-sample-caption.component.ts"]
end
subgraph 94["column-map-simple-field"]
95["column-map-simple-field.component.ts"]
end
subgraph 96["column-map-stepper"]
97["column-map-stepper.component.ts"]
end
subgraph 98["column-map-summary-step"]
99["column-map-summary-step.component.ts"]
end
subgraph 9A["import-map-step"]
9B["import-map-step.component.ts"]
end
subgraph 9C["import-preview-step"]
9D["import-preview-step.component.ts"]
end
subgraph 9E["import-select-step"]
9F["import-select-step.component.ts"]
end
subgraph 9G["import-summary-step"]
9H["import-summary-step.component.ts"]
end
subgraph 9I["import-wizard"]
9J["import-wizard.component.ts"]
end
9K["index.ts"]
subgraph 9L["queued-file-row"]
9M["queued-file-row.component.ts"]
end
end
9N["import-batches.store.ts"]
9O["import-queue.ts"]
9P["import-wizard-session.ts"]
9Q["import.routes.ts"]
9R["index.ts"]
9S["mapper-steps.ts"]
9T["mapping-profiles.store.ts"]
end
subgraph 9U["feature-income"]
9V["career-start-date.ts"]
subgraph 9W["components"]
subgraph 9X["income-career-start"]
9Y["income-career-start.component.ts"]
end
subgraph 9Z["income-category-checklist"]
A0["income-category-checklist.component.ts"]
end
subgraph A1["income-chart-cell"]
A2["income-chart-cell.component.ts"]
end
subgraph A3["income-events-sidebar"]
A4["income-events-sidebar.component.ts"]
end
subgraph A5["income-gross-color"]
A6["income-gross-color.component.ts"]
end
subgraph A7["income-gross-net-section"]
A8["income-gross-net-section.component.ts"]
end
subgraph A9["income-growth-panel"]
AA["income-growth-panel.component.ts"]
end
subgraph AB["income-intro"]
AC["income-intro.component.ts"]
end
subgraph AD["income-main-category"]
AE["income-main-category.component.ts"]
end
subgraph AF["income-overview"]
AG["income-overview.component.ts"]
end
subgraph AH["income-settings-page"]
AI["income-settings-page.component.ts"]
end
subgraph AJ["income-yearly-panel"]
AK["income-yearly-panel.component.ts"]
end
AL["index.ts"]
subgraph AM["salary-details-page"]
AN["salary-details-page.component.ts"]
end
subgraph AO["salary-metadata-table"]
AP["salary-metadata-table.component.ts"]
end
subgraph AQ["salary-month-modal"]
AR["salary-month-modal.component.ts"]
end
end
AS["gross-net-chart-options.ts"]
AT["income-category-vm.ts"]
AU["income-event-vm.ts"]
AV["income-granularity.ts"]
AW["income.routes.ts"]
AX["income.store.ts"]
AY["index.ts"]
AZ["salary-metadata-edit.ts"]
B0["salary-metadata-rows.ts"]
end
subgraph B1["feature-learning"]
subgraph B2["components"]
B3["index.ts"]
subgraph B4["learning-overview"]
B5["learning-overview.component.ts"]
end
subgraph B6["model-status-badge"]
B7["model-status-badge.component.ts"]
end
subgraph B8["model-status"]
B9["model-status.component.ts"]
end
subgraph BA["rule-proposals"]
BB["rule-proposals.component.ts"]
end
subgraph BC["suggestions-table"]
BD["suggestions-table.component.ts"]
end
end
BE["index.ts"]
BF["learning.routes.ts"]
BG["model-status-display.ts"]
end
subgraph BH["feature-loans"]
subgraph BI["components"]
BJ["index.ts"]
subgraph BK["loan-form"]
BL["loan-form.component.ts"]
end
subgraph BM["loans-overview"]
BN["loans-overview.component.ts"]
end
end
BO["index.ts"]
BP["loan-types.ts"]
BQ["loans.routes.ts"]
BR["loans.store.ts"]
end
subgraph BS["feature-recurring"]
BT["bills-calendar-vm.ts"]
subgraph BU["components"]
subgraph BV["bills-calendar"]
BW["bills-calendar.component.ts"]
end
subgraph BX["bills-day-list"]
BY["bills-day-list.component.ts"]
end
subgraph BZ["bills-month-grid"]
C0["bills-month-grid.component.ts"]
end
C1["index.ts"]
subgraph C2["recurring-overview"]
C3["recurring-overview.component.ts"]
end
subgraph C4["recurring-payments-panel"]
C5["recurring-payments-panel.component.ts"]
end
end
C6["index.ts"]
C7["recurring-payments-row-vm.ts"]
C8["recurring-series.store.ts"]
C9["recurring.routes.ts"]
end
subgraph CA["feature-settings"]
subgraph CB["components"]
CC["index.ts"]
subgraph CD["settings-about-section"]
CE["settings-about-section.component.ts"]
end
subgraph CF["settings-currency-locale-section"]
CG["settings-currency-locale-section.component.ts"]
end
subgraph CH["settings-data-section"]
CI["settings-data-section.component.ts"]
end
subgraph CJ["settings-overview"]
CK["settings-overview.component.ts"]
end
subgraph CL["settings-privacy-section"]
CM["settings-privacy-section.component.ts"]
end
subgraph CN["settings-reporting-section"]
CO["settings-reporting-section.component.ts"]
end
subgraph CP["settings-theme-section"]
CQ["settings-theme-section.component.ts"]
end
end
CR["index.ts"]
CS["settings.routes.ts"]
end
subgraph CT["feature-transactions"]
CU["category-picker.ts"]
subgraph CV["components"]
subgraph CW["attribution-override-fieldset"]
CX["attribution-override-fieldset.component.ts"]
end
subgraph CY["category-select-cell"]
CZ["category-select-cell.component.ts"]
end
D0["index.ts"]
subgraph D1["transaction-bulk-bar"]
D2["transaction-bulk-bar.component.ts"]
end
subgraph D3["transaction-edit-form"]
D4["transaction-edit-form.component.ts"]
end
subgraph D5["transaction-filters"]
D6["transaction-filters.component.ts"]
end
subgraph D7["transaction-row"]
D8["transaction-row.component.ts"]
end
subgraph D9["transactions-overview"]
DA["transactions-overview.component.ts"]
end
subgraph DB["transfer-review"]
DC["transfer-review.component.ts"]
end
end
DD["index.ts"]
DE["transaction-filters.ts"]
DF["transaction-row-vm.ts"]
DG["transactions.routes.ts"]
end
subgraph DH["shared"]
subgraph DI["echarts"]
DJ["bucketed-axis-option.ts"]
DK["chart-theme.ts"]
DL["echarts-jsdom.testing.ts"]
DM["echarts-setup.ts"]
DN["index.ts"]
DO["legend-option.ts"]
DP["tooltip-formatter.ts"]
end
subgraph DQ["ui"]
subgraph DR["absolute-range-panel"]
DS["absolute-range-panel.component.ts"]
end
subgraph DT["alert"]
DU["alert.component.ts"]
end
subgraph DV["badge"]
DW["badge.component.ts"]
end
subgraph DX["button"]
DY["button.component.ts"]
end
subgraph DZ["collapse"]
E0["collapse.component.ts"]
end
subgraph E1["confirm-dialog"]
E2["confirm-dialog.component.ts"]
end
subgraph E3["cycle-picker"]
E4["cycle-picker.component.ts"]
end
subgraph E5["date-range-input"]
E6["date-range-input.component.ts"]
end
subgraph E7["divider"]
E8["divider.component.ts"]
end
subgraph E9["dropdown"]
EA["dropdown.component.ts"]
end
subgraph EB["empty-state"]
EC["empty-state.component.ts"]
end
subgraph ED["fieldset"]
EE["fieldset.component.ts"]
end
subgraph EF["flex"]
EG["flex.component.ts"]
end
subgraph EH["granularity-picker"]
EI["granularity-picker.component.ts"]
end
EJ["index.ts"]
subgraph EK["input"]
EL["input.component.ts"]
end
subgraph EM["label"]
EN["label.component.ts"]
end
subgraph EO["loading-skeleton"]
EP["loading-skeleton.component.ts"]
end
subgraph EQ["modal"]
ER["mm-modal.component.ts"]
end
subgraph ES["page-header"]
ET["page-header.component.ts"]
end
subgraph EU["paginator"]
EV["paginator.component.ts"]
end
subgraph EW["paper"]
EX["paper.component.ts"]
end
subgraph EY["privacy-blur"]
EZ["privacy-blur.component.ts"]
end
subgraph F0["privacy-toggle"]
F1["privacy-toggle.component.ts"]
end
subgraph F2["range-picker"]
F3["range-picker.component.ts"]
end
subgraph F4["select"]
F5["select.component.ts"]
end
subgraph F6["stat-card"]
F7["stat-card.component.ts"]
end
subgraph F8["table"]
F9["table.component.ts"]
end
subgraph FA["tabs"]
FB["tabs.component.ts"]
end
subgraph FC["typography"]
FD["typography.component.ts"]
end
end
subgraph FE["utils"]
FF["calendar-cycles.ts"]
FG["confidence-color.ts"]
FH["confirm-state.ts"]
FI["currency-format.ts"]
FJ["currency-symbol-presets.ts"]
FK["daisy-classes.ts"]
FL["date-buckets.ts"]
FM["date-format.pipe.ts"]
FN["date-format.ts"]
FO["debounced-text.ts"]
FP["download-json.ts"]
FQ["fingerprint.ts"]
FR["format-settings.testing.ts"]
FS["format-settings.ts"]
FT["hidden-amount.ts"]
FU["iban.ts"]
FV["index.ts"]
FW["link-control-to-setting.ts"]
FX["locale-presets.ts"]
FY["number-format.ts"]
FZ["pagination.ts"]
G0["percentage.ts"]
G1["quick-ranges.ts"]
G2["range-expression.ts"]
G3["search-params.ts"]
G4["selection-model.ts"]
G5["signed-amount.pipe.ts"]
G6["sortable.ts"]
G7["structural-filters.ts"]
G8["theme-hooks.ts"]
subgraph G9["validators"]
GA["iban.validator.ts"]
GB["percentage.validator.ts"]
end
GC["with-archivable.ts"]
GD["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3W
5-->4
5-->6
6-->Q
6-->FV
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
G-->1N
G-->3B
G-->3M
G-->FQ
G-->FS
H-->G
H-->3N
H-->FV
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->2Y
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
Z-->FV
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
16-->3W
16-->FV
17-->Z
17-->10
17-->11
17-->13
17-->14
17-->15
17-->16
1A-->23
1A-->DY
1A-->FD
1B-->1A
1E-->1D
1G-->FV
1H-->1G
1J-->1K
1J-->1L
1J-->1N
1K-->1N
1L-->1N
1M-->1K
1M-->1L
1M-->1N
1M-->1O
1M-->1P
1O-->B
1O-->Q
1R-->1U
1S-->1R
1S-->1T
1S-->1U
1T-->1U
1W-->1Y
1W-->26
1W-->28
1W-->5
1W-->Q
1W-->2Y
1W-->3W
1W-->FV
1X-->Q
1X-->3N
1X-->FV
1Y-->26
1Y-->Q
1Y-->FV
1Z-->20
1Z-->2Y
1Z-->DN
1Z-->FV
20-->2Y
20-->DN
20-->FV
21-->Q
21-->2Y
22-->Q
22-->FV
23-->1W
23-->1X
23-->1Y
23-->1Z
23-->20
23-->21
23-->22
23-->24
23-->25
23-->26
23-->27
23-->28
24-->1W
24-->1X
24-->25
24-->26
24-->Q
24-->2Y
24-->FV
25-->1X
25-->FV
26-->Q
26-->3S
26-->3W
27-->Q
28-->26
28-->27
28-->Q
28-->3W
2A-->Q
2A-->FV
2B-->2A
2B-->Q
2B-->FV
2C-->2E
2C-->2T
2C-->FV
2D-->2K
2D-->Q
2E-->2D
2E-->Q
2E-->FV
2F-->2D
2F-->2K
2F-->Q
2F-->FV
2G-->2K
2G-->Q
2H-->Q
2I-->2D
2I-->36
2I-->Q
2J-->FV
2K-->2H
2K-->2L
2K-->Q
2K-->3W
2L-->5
2L-->Q
2M-->Q
2N-->2E
2N-->2T
2N-->Q
2N-->FV
2O-->Q
2P-->Q
2P-->FV
2Q-->FV
2R-->2S
2S-->2T
2S-->Q
2T-->2E
2T-->Q
2T-->FV
2U-->2V
2U-->2X
2U-->3E
2U-->Q
2V-->2E
2V-->2T
2V-->FV
2W-->2T
2W-->3G
2W-->FV
2X-->2E
2X-->2N
2X-->2T
2X-->FV
2Y-->2A
2Y-->2B
2Y-->2C
2Y-->2D
2Y-->2E
2Y-->2F
2Y-->2G
2Y-->2H
2Y-->2I
2Y-->2J
2Y-->2K
2Y-->2L
2Y-->2M
2Y-->2N
2Y-->2O
2Y-->2P
2Y-->2Q
2Y-->2R
2Y-->2S
2Y-->2T
2Y-->2U
2Y-->2V
2Y-->2W
2Y-->2X
2Y-->2Z
2Y-->30
2Y-->31
2Y-->32
2Y-->33
2Y-->34
2Y-->35
2Y-->36
2Y-->37
2Y-->38
2Y-->39
2Y-->3A
2Y-->3B
2Y-->3C
2Y-->3D
2Y-->3E
2Y-->3F
2Y-->3G
2Y-->3H
2Z-->2L
2Z-->Q
30-->2L
30-->5
30-->Q
31-->Q
31-->FV
32-->3H
34-->FV
35-->2K
35-->Q
36-->FV
37-->FV
38-->2K
38-->B
38-->Q
38-->FV
39-->38
39-->FV
3A-->Q
3A-->FV
3B-->35
3B-->Q
3B-->FV
3C-->2D
3C-->2G
3C-->Q
3D-->Q
3D-->3W
3E-->2S
3F-->2K
3F-->Q
3F-->FV
3G-->35
3G-->Q
3H-->2E
3H-->Q
3H-->FV
3J-->3K
3M-->3O
3N-->3M
3N-->3O
3N-->3P
3P-->3O
3R-->Q
3S-->3R
3S-->3T
3S-->3U
3T-->Q
3U-->Q
3U-->3W
3W-->3X
3W-->3Y
3W-->40
3W-->3Z
3X-->Q
3Y-->40
3Y-->Q
3Z-->3Y
3Z-->40
3Z-->Q
40-->6
40-->Q
40-->FV
42-->Q
43-->Q
44-->Q
45-->Q
46-->4L
46-->4N
46-->DN
47-->2Y
47-->FV
48-->Q
48-->23
48-->2Y
48-->FV
4B-->EJ
4B-->FV
4D-->47
4D-->48
4D-->Q
4D-->2Y
4D-->DN
4D-->EJ
4D-->FV
4F-->47
4F-->48
4F-->Q
4F-->23
4F-->2Y
4F-->DN
4F-->EJ
4H-->42
4H-->43
4H-->4B
4H-->EJ
4J-->43
4J-->45
4J-->Q
4J-->EJ
4J-->FV
4J-->GA
4J-->GB
4L-->4B
4L-->4D
4L-->4J
4L-->23
4L-->EJ
4L-->FV
4N-->42
4N-->43
4N-->44
4N-->4F
4N-->4H
4N-->4J
4N-->Q
4N-->23
4N-->EJ
4N-->FV
4O-->4B
4O-->4D
4O-->4F
4O-->4H
4O-->4J
4O-->4L
4O-->4N
4P-->43
4P-->45
4P-->46
4P-->4O
4R-->4Y
4R-->5B
4T-->1M
4U-->4T
4U-->5I
4U-->Q
4U-->1M
4U-->23
4V-->Q
4V-->EJ
4Y-->4S
4Y-->4V
4Y-->50
4Y-->B
4Y-->Q
4Y-->23
4Y-->EJ
4Y-->FV
50-->4S
50-->Q
50-->EJ
51-->4Y
51-->50
51-->55
51-->57
51-->59
51-->5B
53-->5D
53-->5F
53-->B
53-->Q
53-->23
53-->EJ
55-->5E
55-->23
55-->EJ
55-->FV
57-->5D
57-->53
57-->B
57-->Q
57-->23
57-->EJ
59-->5G
59-->5I
59-->EJ
59-->FV
5B-->5E
5B-->5H
5B-->5I
5B-->55
5B-->57
5B-->59
5B-->Q
5B-->23
5B-->EJ
5B-->FV
5C-->4R
5C-->4S
5C-->4T
5C-->4U
5C-->51
5C-->5E
5C-->5H
5C-->5I
5D-->5F
5D-->Q
5E-->5H
5E-->Q
5F-->Q
5G-->Q
5H-->5F
5H-->Q
5I-->5G
5I-->B
5I-->Q
5I-->23
5I-->FV
5K-->5P
5N-->EJ
5P-->5S
5P-->5T
5P-->5U
5P-->5V
5P-->5N
5P-->EJ
5Q-->5P
5U-->5S
5V-->5T
5W-->5K
5W-->5Q
5Y-->Q
62-->23
62-->EJ
62-->FV
64-->23
64-->3W
64-->EJ
64-->FV
66-->6U
66-->23
66-->2Y
66-->DN
66-->EJ
66-->FV
68-->5Y
68-->5Z
68-->6U
68-->6A
68-->6C
68-->23
68-->EJ
68-->FV
6A-->23
6A-->EJ
6C-->5Z
6C-->EJ
6E-->6Q
6E-->6R
6E-->Q
6E-->EJ
6G-->6Q
6G-->6R
6G-->6U
6G-->62
6G-->64
6G-->66
6G-->68
6G-->6E
6G-->6J
6G-->6L
6G-->6N
6G-->6P
6G-->23
6G-->2Y
6G-->EJ
6G-->FV
6H-->62
6H-->64
6H-->66
6H-->68
6H-->6A
6H-->6E
6H-->6G
6H-->6J
6H-->6L
6H-->6N
6H-->6P
6J-->6A
6J-->23
6J-->2Y
6J-->3W
6J-->DN
6J-->EJ
6J-->FV
6L-->6U
6L-->23
6L-->EJ
6L-->FV
6N-->23
6N-->2Y
6N-->3W
6N-->DN
6N-->EJ
6N-->FV
6P-->6U
6P-->23
6P-->EJ
6P-->FV
6Q-->6R
6Q-->Q
6R-->Q
6S-->6G
6S-->DN
6T-->6H
6T-->6S
6U-->5Y
6U-->23
6U-->2Y
6U-->3W
6Y-->Q
6Y-->3J
6Y-->EJ
6Y-->FV
6Z-->6Y
70-->6Z
74-->77
74-->79
74-->23
74-->EJ
75-->74
75-->77
75-->79
77-->23
77-->2Y
77-->DN
77-->EJ
77-->FV
79-->Q
79-->23
79-->2Y
79-->3W
79-->DN
79-->EJ
79-->FV
7A-->74
7A-->DN
7B-->75
7B-->7A
7F-->7W
7F-->7Y
7F-->Q
7F-->23
7F-->2Y
7F-->EJ
7F-->FV
7H-->7X
7H-->EJ
7J-->7F
7J-->7P
7J-->7S
7J-->EJ
7L-->Q
7L-->EJ
7N-->80
7N-->EJ
7P-->7X
7P-->7Y
7P-->80
7P-->7H
7P-->7L
7P-->7N
7P-->Q
7P-->23
7P-->EJ
7P-->FV
7Q-->7F
7Q-->7H
7Q-->7J
7Q-->7L
7Q-->7N
7Q-->7P
7Q-->7S
7Q-->7U
7S-->7V
7S-->7Y
7S-->82
7S-->83
7S-->7U
7S-->23
7S-->EJ
7S-->FV
7U-->83
7V-->Q
7W-->Q
7W-->2Y
7W-->EJ
7W-->FV
7X-->7V
7X-->Q
7X-->2Y
7X-->EJ
7X-->FV
7Y-->Q
7Y-->23
7Y-->2Y
7Y-->3W
7Z-->7J
7Z-->DN
80-->Q
80-->2Y
80-->EJ
80-->FV
81-->7Q
81-->7V
81-->7W
81-->7X
81-->7Y
81-->7Z
81-->80
81-->82
81-->83
82-->2Y
82-->DN
82-->FV
87-->8G
87-->EJ
89-->8H
89-->8B
89-->EJ
8B-->8H
8B-->EJ
8D-->8H
8D-->EJ
8E-->87
8E-->89
8E-->8B
8E-->8D
8I-->87
8I-->89
8I-->8D
8J-->8E
8J-->8H
8J-->8I
8N-->1E
8N-->EJ
8O-->8N
8P-->8N
8Q-->8O
8Q-->8P
8S-->Q
8V-->9O
8V-->4P
8V-->EJ
8X-->EJ
8Z-->93
8Z-->EJ
91-->93
91-->EJ
93-->EJ
95-->8S
95-->93
95-->EJ
97-->9S
97-->EJ
99-->8S
99-->EJ
9B-->8S
9B-->9S
9B-->9T
9B-->8Z
9B-->91
9B-->95
9B-->97
9B-->99
9B-->9D
9B-->Q
9B-->17
9B-->EJ
9D-->17
9D-->EJ
9D-->FV
9F-->9O
9F-->9T
9F-->9M
9F-->Q
9F-->17
9F-->EJ
9H-->Q
9H-->EJ
9J-->9P
9J-->8X
9J-->9B
9J-->9F
9J-->9H
9J-->23
9J-->EJ
9K-->9B
9K-->9D
9K-->9F
9K-->9H
9K-->9J
9M-->9O
9M-->8V
9M-->Q
9M-->EJ
9N-->B
9N-->Q
9N-->17
9N-->23
9O-->Q
9P-->8S
9P-->9N
9P-->9O
9P-->9T
9P-->Q
9P-->17
9P-->23
9P-->4P
9Q-->9J
9R-->8S
9R-->9K
9R-->9N
9R-->9O
9R-->9Q
9R-->9S
9R-->9T
9S-->8S
9T-->Q
9V-->2Y
9Y-->9V
9Y-->AX
9Y-->EJ
9Y-->FV
A0-->AT
A0-->EJ
A2-->EJ
A4-->AU
A4-->AV
A4-->AX
A4-->23
A4-->2Y
A4-->EJ
A6-->AX
A6-->3N
A6-->DN
A6-->EJ
A8-->AS
A8-->AX
A8-->A2
A8-->23
A8-->2Y
A8-->DN
A8-->EJ
A8-->FV
AA-->AV
AA-->AX
AA-->23
AA-->2Y
AA-->EJ
AA-->FV
AC-->23
AC-->8J
AC-->EJ
AE-->AT
AE-->AX
AE-->EJ
AG-->AX
AG-->B0
AG-->A4
AG-->A8
AG-->AA
AG-->AC
AG-->AK
AG-->AR
AG-->23
AG-->2Y
AG-->8J
AG-->DN
AG-->EJ
AG-->FV
AI-->AT
AI-->AX
AI-->9Y
AI-->A0
AI-->A6
AI-->AE
AI-->EJ
AK-->AX
AK-->23
AK-->2Y
AK-->3W
AK-->DN
AK-->EJ
AK-->FV
AL-->9Y
AL-->A0
AL-->A2
AL-->A4
AL-->A8
AL-->AA
AL-->AC
AL-->AE
AL-->AG
AL-->AI
AL-->AK
AL-->AN
AL-->AP
AL-->AR
AN-->AP
AN-->EJ
AP-->AV
AP-->AX
AP-->AZ
AP-->B0
AP-->EJ
AP-->FV
AR-->AX
AR-->AZ
AR-->B0
AR-->AP
AR-->Q
AR-->EJ
AS-->2Y
AS-->DN
AS-->FV
AT-->Q
AU-->AV
AU-->Q
AU-->2Y
AU-->EJ
AU-->FV
AV-->FV
AW-->AG
AW-->AI
AW-->AN
AW-->DN
AX-->9V
AX-->AV
AX-->Q
AX-->23
AX-->2Y
AX-->3N
AX-->3W
AY-->AL
AY-->AT
AY-->AV
AY-->AW
AY-->AX
AY-->AZ
AY-->B0
AZ-->Q
B0-->Q
B3-->B5
B3-->B9
B3-->BB
B3-->BD
B5-->B7
B5-->B9
B5-->BB
B5-->BD
B5-->EJ
B7-->BG
B7-->5C
B7-->EJ
B9-->BG
B9-->1M
B9-->23
B9-->5C
B9-->EJ
BB-->Q
BB-->1M
BB-->23
BB-->5C
BB-->EJ
BB-->FV
BD-->Q
BD-->23
BD-->5C
BD-->EJ
BD-->FV
BE-->B3
BE-->BF
BF-->B5
BG-->5C
BG-->EJ
BJ-->BL
BJ-->BN
BL-->BP
BL-->Q
BL-->23
BL-->EJ
BL-->GB
BN-->BR
BN-->BL
BN-->Q
BN-->EJ
BO-->BJ
BO-->BP
BO-->BQ
BO-->BR
BP-->Q
BQ-->BN
BR-->Q
BR-->FV
BT-->EJ
BW-->BT
BW-->C8
BW-->BY
BW-->C0
BW-->23
BW-->2Y
BW-->EJ
BW-->FV
BY-->BT
BY-->EJ
C0-->BT
C0-->EJ
C1-->BW
C1-->BY
C1-->C0
C1-->C3
C1-->C5
C3-->BW
C3-->C5
C3-->23
C3-->EJ
C5-->C7
C5-->C8
C5-->23
C5-->2Y
C5-->DN
C5-->EJ
C5-->FV
C6-->C1
C6-->C9
C8-->23
C8-->2Y
C8-->3W
C9-->C3
CC-->CK
CE-->1E
CE-->EJ
CG-->23
CG-->EJ
CG-->FV
CI-->70
CI-->EJ
CK-->CE
CK-->CG
CK-->CI
CK-->CM
CK-->CO
CK-->CQ
CK-->EJ
CM-->23
CM-->EJ
CM-->FV
CO-->23
CO-->EJ
CO-->FV
CQ-->23
CQ-->3N
CQ-->EJ
CR-->CC
CR-->CS
CS-->CK
CU-->Q
CX-->Q
CX-->23
CX-->3S
CX-->EJ
CX-->FV
CZ-->CU
D0-->D2
D0-->D4
D0-->D6
D0-->DA
D0-->DC
D2-->CU
D2-->B
D2-->23
D2-->EJ
D4-->CU
D4-->CX
D4-->B
D4-->Q
D4-->23
D4-->3S
D4-->5C
D4-->EJ
D6-->CU
D6-->DE
D6-->B
D6-->23
D6-->EJ
D6-->FV
D8-->CU
D8-->DF
D8-->CZ
D8-->EJ
D8-->FV
DA-->CU
DA-->DE
DA-->DF
DA-->D2
DA-->D4
DA-->D6
DA-->D8
DA-->DC
DA-->B
DA-->Q
DA-->23
DA-->3W
DA-->5C
DA-->EJ
DA-->FV
DC-->23
DC-->3W
DC-->EJ
DC-->FV
DD-->DG
DE-->Q
DE-->3W
DF-->Q
DG-->DA
DN-->DJ
DN-->DK
DN-->DM
DN-->DO
DN-->DP
DP-->FV
DS-->DY
DS-->EC
DS-->EE
DS-->EL
DS-->FD
DS-->Q
DS-->FV
DU-->FV
DW-->FV
DY-->FV
E0-->FV
E2-->DY
E2-->EN
E2-->ER
E2-->FD
E4-->FV
E6-->DY
E6-->EA
E6-->FV
E8-->FV
EA-->FV
EC-->EG
EC-->FD
EE-->FV
EG-->FV
EJ-->DS
EJ-->DU
EJ-->DW
EJ-->DY
EJ-->E0
EJ-->E2
EJ-->E4
EJ-->E6
EJ-->E8
EJ-->EA
EJ-->EC
EJ-->EE
EJ-->EG
EJ-->EI
EJ-->EL
EJ-->EN
EJ-->EP
EJ-->ER
EJ-->ET
EJ-->EV
EJ-->EX
EJ-->EZ
EJ-->F1
EJ-->F3
EJ-->F5
EJ-->F7
EJ-->F9
EJ-->FB
EJ-->FD
EL-->FV
EN-->FV
EP-->EG
ER-->FV
ET-->EG
ET-->FD
EV-->DY
EV-->EG
EV-->FD
EV-->FV
EX-->FV
EZ-->FV
F1-->DY
F1-->23
F3-->DS
F3-->DY
F3-->EG
F3-->EX
F3-->FD
F3-->Q
F3-->FV
F5-->FV
F7-->EZ
F7-->FD
F7-->FV
F9-->FV
FB-->FV
FD-->FV
FF-->FN
FI-->FS
FL-->FS
FM-->FN
FN-->FS
FR-->FS
FV-->FF
FV-->FG
FV-->FH
FV-->FI
FV-->FJ
FV-->FK
FV-->FL
FV-->FN
FV-->FM
FV-->FO
FV-->FP
FV-->FQ
FV-->FS
FV-->FT
FV-->FU
FV-->FW
FV-->FX
FV-->FY
FV-->FZ
FV-->G0
FV-->G1
FV-->G2
FV-->G3
FV-->G4
FV-->G5
FV-->G6
FV-->G7
FV-->G8
FV-->GC
FV-->GD
FY-->FS
G1-->FL
G1-->G2
G2-->FL
G5-->FI
```
