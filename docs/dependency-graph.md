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
- 410 leaf nodes, 1258 edges.
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
end
subgraph 1J["ml"]
1K["category-model.worker.ts"]
1L["category-model.worker.types.ts"]
1M["feature-hashing.ts"]
1N["index.ts"]
1O["model-config.ts"]
1P["rule-proposal-mining.ts"]
1Q["training-window.ts"]
end
subgraph 1R["onboarding"]
1S["home-redirect.guard.ts"]
1T["index.ts"]
1U["mark-visited.guard.ts"]
1V["visited.service.ts"]
end
subgraph 1W["state"]
1X["accounts.store.ts"]
1Y["app-settings.store.ts"]
1Z["categories.store.ts"]
20["chart-options-control.ts"]
21["chart-options.store.ts"]
22["forecast-settings.store.ts"]
23["goals.store.ts"]
24["index.ts"]
25["page-range-control.ts"]
26["range-state.store.ts"]
27["transactions.store.ts"]
28["transfer-settings.store.ts"]
29["transfers.store.ts"]
end
subgraph 2A["stats"]
2B["account-balance-history.ts"]
2C["account-balance-trend.ts"]
2D["annual-lump-sum-smoothing.ts"]
2E["category-breakdown.ts"]
2F["category-composition-trend.ts"]
2G["category-cycle-heatmap.ts"]
2H["category-expense-transactions.ts"]
2I["category-kind-contribution.ts"]
2J["category-period-comparison.ts"]
2K["chart-zoom-window.ts"]
2L["classify-for-stats.ts"]
2M["classify-joint-leg.ts"]
2N["day-transactions.ts"]
2O["embedded-bonus-smoothing.ts"]
2P["full-history-range.ts"]
2Q["goal-affordability.ts"]
2R["granularity-for-span.ts"]
2S["gross-net-growth.ts"]
2T["gross-net-ratio.ts"]
2U["income-category-series.ts"]
2V["income-events.ts"]
2W["income-gap-detection.ts"]
2X["income-growth.ts"]
2Y["income-step-change-detection.ts"]
2Z["index.ts"]
30["joint-account-stake.ts"]
31["joint-contributor-breakdown.ts"]
32["money-flow-graph.ts"]
33["multi-year-income-comparison.ts"]
34["net-margin.ts"]
35["net-worth-projection.ts"]
36["period-stats.ts"]
37["period-window.ts"]
38["periodized-rate.ts"]
39["recurring-payments.ts"]
3A["recurring-projection.ts"]
3B["required-saving-rate.ts"]
3C["saving-velocity.ts"]
3D["spending-mosaic.ts"]
3E["top-transactions.ts"]
3F["wage-change-detection.ts"]
3G["weekday-weekend-split.ts"]
3H["year-over-year.ts"]
3I["yearly-income-summary.ts"]
end
subgraph 3J["storage"]
3K["index.ts"]
3L["storage-status.service.ts"]
end
subgraph 3M["theme"]
3N["accent-colors.ts"]
3O["index.ts"]
3P["theme-styles.ts"]
3Q["theme.service.ts"]
end
subgraph 3R["transactions"]
3S["attribution-override.ts"]
3T["index.ts"]
3U["nullify-transaction.ts"]
3V["transaction-deletion.service.ts"]
end
subgraph 3W["transfers"]
3X["index.ts"]
3Y["transfer-cleanup.service.ts"]
3Z["transfer-linking.service.ts"]
40["transfer-matching.service.ts"]
41["transfer-matching.ts"]
end
end
subgraph 42["feature-accounts"]
43["account-card-vm.ts"]
44["account-icons.ts"]
45["account-list-order.ts"]
46["account-types.ts"]
47["accounts.routes.ts"]
48["balance-day-tooltip.ts"]
49["balance-trend-signals.ts"]
subgraph 4A["components"]
subgraph 4B["account-balance-block"]
4C["account-balance-block.component.ts"]
end
subgraph 4D["account-balance-chart"]
4E["account-balance-chart.component.ts"]
end
subgraph 4F["account-balance-history-chart"]
4G["account-balance-history-chart.component.ts"]
end
subgraph 4H["account-card"]
4I["account-card.component.ts"]
end
subgraph 4J["account-form"]
4K["account-form.component.ts"]
end
subgraph 4L["accounts-detail"]
4M["accounts-detail.component.ts"]
end
subgraph 4N["accounts-overview"]
4O["accounts-overview.component.ts"]
end
4P["index.ts"]
end
4Q["index.ts"]
end
subgraph 4R["feature-categories"]
4S["categories.routes.ts"]
4T["category-icons.ts"]
4U["category-model.service.ts"]
4V["category-model.store.ts"]
4W["category-row-vm.ts"]
subgraph 4X["components"]
subgraph 4Y["categories-overview"]
4Z["categories-overview.component.ts"]
end
subgraph 50["category-form"]
51["category-form.component.ts"]
end
52["index.ts"]
subgraph 53["rule-condition-row"]
54["rule-condition-row.component.ts"]
end
subgraph 55["rule-filters"]
56["rule-filters.component.ts"]
end
subgraph 57["rule-form"]
58["rule-form.component.ts"]
end
subgraph 59["rule-share-bar"]
5A["rule-share-bar.component.ts"]
end
subgraph 5B["rules-overview"]
5C["rules-overview.component.ts"]
end
end
5D["index.ts"]
5E["rule-condition-editor.ts"]
5F["rule-filters.ts"]
5G["rule-labels.ts"]
5H["rule-share.ts"]
5I["rule-summary.ts"]
5J["rules.store.ts"]
end
subgraph 5K["feature-changelog"]
5L["changelog.routes.ts"]
subgraph 5M["components"]
subgraph 5N["changelog-entry-row"]
5O["changelog-entry-row.component.ts"]
end
subgraph 5P["changelog-page"]
5Q["changelog-page.component.ts"]
end
5R["index.ts"]
end
subgraph 5S["data"]
5T["changelog-entries.ts"]
5U["roadmap-entries.ts"]
end
5V["group-changelog-entries.ts"]
5W["group-roadmap-entries.ts"]
5X["index.ts"]
end
subgraph 5Y["feature-dashboard"]
5Z["category-comparison-settings.store.ts"]
60["category-comparison-vm.ts"]
subgraph 61["components"]
subgraph 62["account-balance-strip"]
63["account-balance-strip.component.ts"]
end
subgraph 64["action-queue-panel"]
65["action-queue-panel.component.ts"]
end
subgraph 66["category-breakdown-panel"]
67["category-breakdown-panel.component.ts"]
end
subgraph 68["category-comparison-panel"]
69["category-comparison-panel.component.ts"]
end
subgraph 6A["category-exclusion-dropdown"]
6B["category-exclusion-dropdown.component.ts"]
end
subgraph 6C["comparison-category-card"]
6D["comparison-category-card.component.ts"]
end
subgraph 6E["dashboard-customize-panel"]
6F["dashboard-customize-panel.component.ts"]
end
subgraph 6G["dashboard-overview"]
6H["dashboard-overview.component.ts"]
end
6I["index.ts"]
subgraph 6J["spending-heatmap-panel"]
6K["spending-heatmap-panel.component.ts"]
end
subgraph 6L["top-transactions-panel"]
6M["top-transactions-panel.component.ts"]
end
subgraph 6N["trend-chart-panel"]
6O["trend-chart-panel.component.ts"]
end
subgraph 6P["weekday-weekend-split-panel"]
6Q["weekday-weekend-split-panel.component.ts"]
end
end
6R["dashboard-layout-settings.store.ts"]
6S["dashboard-row-order.ts"]
6T["dashboard.routes.ts"]
6U["index.ts"]
6V["stats.store.ts"]
end
subgraph 6W["feature-data-management"]
subgraph 6X["components"]
subgraph 6Y["data-management-overview"]
6Z["data-management-overview.component.ts"]
end
70["index.ts"]
end
71["index.ts"]
end
subgraph 72["feature-explore"]
subgraph 73["components"]
subgraph 74["explore-overview"]
75["explore-overview.component.ts"]
end
76["index.ts"]
subgraph 77["money-flow-panel"]
78["money-flow-panel.component.ts"]
end
subgraph 79["spending-mosaic-panel"]
7A["spending-mosaic-panel.component.ts"]
end
end
7B["explore.routes.ts"]
7C["index.ts"]
end
subgraph 7D["feature-future"]
subgraph 7E["components"]
subgraph 7F["forecast-controls"]
7G["forecast-controls.component.ts"]
end
subgraph 7H["forecast-notice"]
7I["forecast-notice.component.ts"]
end
subgraph 7J["future-overview"]
7K["future-overview.component.ts"]
end
subgraph 7L["goal-form"]
7M["goal-form.component.ts"]
end
subgraph 7N["goal-row"]
7O["goal-row.component.ts"]
end
subgraph 7P["goals-panel"]
7Q["goals-panel.component.ts"]
end
7R["index.ts"]
subgraph 7S["net-worth-projection-chart"]
7T["net-worth-projection-chart.component.ts"]
end
subgraph 7U["projection-figure-table"]
7V["projection-figure-table.component.ts"]
end
end
7W["forecast-chart-copy.ts"]
7X["forecast-controls-vm.ts"]
7Y["forecast-notices.ts"]
7Z["forecast.store.ts"]
80["future.routes.ts"]
81["goal-row-vm.ts"]
82["index.ts"]
83["net-worth-projection-chart-option.ts"]
84["projection-accessible-row.ts"]
end
subgraph 85["feature-help"]
subgraph 86["components"]
subgraph 87["faq-page"]
88["faq-page.component.ts"]
end
subgraph 89["guide-detail"]
8A["guide-detail.component.ts"]
end
subgraph 8B["guide-steps"]
8C["guide-steps.component.ts"]
end
subgraph 8D["guides-index"]
8E["guides-index.component.ts"]
end
8F["index.ts"]
end
subgraph 8G["data"]
8H["faq.ts"]
8I["guides.ts"]
end
8J["help.routes.ts"]
8K["index.ts"]
end
subgraph 8L["feature-home"]
subgraph 8M["components"]
subgraph 8N["home-landing"]
8O["home-landing.component.ts"]
end
8P["index.ts"]
end
8Q["home.routes.ts"]
8R["index.ts"]
end
subgraph 8S["feature-import"]
8T["column-mapping.ts"]
subgraph 8U["components"]
subgraph 8V["account-draft-editor"]
8W["account-draft-editor.component.ts"]
end
subgraph 8X["batch-wait-card"]
8Y["batch-wait-card.component.ts"]
end
subgraph 8Z["column-map-amount-field"]
90["column-map-amount-field.component.ts"]
end
subgraph 91["column-map-counterparty-field"]
92["column-map-counterparty-field.component.ts"]
end
subgraph 93["column-map-sample-caption"]
94["column-map-sample-caption.component.ts"]
end
subgraph 95["column-map-simple-field"]
96["column-map-simple-field.component.ts"]
end
subgraph 97["column-map-stepper"]
98["column-map-stepper.component.ts"]
end
subgraph 99["column-map-summary-step"]
9A["column-map-summary-step.component.ts"]
end
subgraph 9B["import-map-step"]
9C["import-map-step.component.ts"]
end
subgraph 9D["import-preview-step"]
9E["import-preview-step.component.ts"]
end
subgraph 9F["import-select-step"]
9G["import-select-step.component.ts"]
end
subgraph 9H["import-summary-step"]
9I["import-summary-step.component.ts"]
end
subgraph 9J["import-wizard"]
9K["import-wizard.component.ts"]
end
9L["index.ts"]
subgraph 9M["queued-file-row"]
9N["queued-file-row.component.ts"]
end
end
9O["import-batches.store.ts"]
9P["import-queue.ts"]
9Q["import-wizard-session.ts"]
9R["import.routes.ts"]
9S["index.ts"]
9T["mapper-steps.ts"]
9U["mapping-profiles.store.ts"]
end
subgraph 9V["feature-income"]
9W["career-start-date.ts"]
subgraph 9X["components"]
subgraph 9Y["income-career-start"]
9Z["income-career-start.component.ts"]
end
subgraph A0["income-category-checklist"]
A1["income-category-checklist.component.ts"]
end
subgraph A2["income-chart-cell"]
A3["income-chart-cell.component.ts"]
end
subgraph A4["income-events-sidebar"]
A5["income-events-sidebar.component.ts"]
end
subgraph A6["income-gross-color"]
A7["income-gross-color.component.ts"]
end
subgraph A8["income-gross-net-section"]
A9["income-gross-net-section.component.ts"]
end
subgraph AA["income-growth-panel"]
AB["income-growth-panel.component.ts"]
end
subgraph AC["income-intro"]
AD["income-intro.component.ts"]
end
subgraph AE["income-main-category"]
AF["income-main-category.component.ts"]
end
subgraph AG["income-overview"]
AH["income-overview.component.ts"]
end
subgraph AI["income-settings-page"]
AJ["income-settings-page.component.ts"]
end
subgraph AK["income-yearly-panel"]
AL["income-yearly-panel.component.ts"]
end
AM["index.ts"]
subgraph AN["salary-details-page"]
AO["salary-details-page.component.ts"]
end
subgraph AP["salary-metadata-table"]
AQ["salary-metadata-table.component.ts"]
end
subgraph AR["salary-month-modal"]
AS["salary-month-modal.component.ts"]
end
end
AT["gross-net-chart-options.ts"]
AU["income-category-vm.ts"]
AV["income-event-vm.ts"]
AW["income-granularity.ts"]
AX["income.routes.ts"]
AY["income.store.ts"]
AZ["index.ts"]
B0["salary-metadata-edit.ts"]
B1["salary-metadata-rows.ts"]
end
subgraph B2["feature-learning"]
subgraph B3["components"]
B4["index.ts"]
subgraph B5["learning-overview"]
B6["learning-overview.component.ts"]
end
subgraph B7["model-status-badge"]
B8["model-status-badge.component.ts"]
end
subgraph B9["model-status"]
BA["model-status.component.ts"]
end
subgraph BB["rule-proposals"]
BC["rule-proposals.component.ts"]
end
subgraph BD["suggestions-table"]
BE["suggestions-table.component.ts"]
end
end
BF["index.ts"]
BG["learning.routes.ts"]
BH["model-status-display.ts"]
end
subgraph BI["feature-loans"]
subgraph BJ["components"]
BK["index.ts"]
subgraph BL["loan-amortization-table"]
BM["loan-amortization-table.component.ts"]
end
subgraph BN["loan-balance-chart"]
BO["loan-balance-chart.component.ts"]
end
subgraph BP["loan-card"]
BQ["loan-card.component.ts"]
end
subgraph BR["loan-detail"]
BS["loan-detail.component.ts"]
end
subgraph BT["loan-form"]
BU["loan-form.component.ts"]
end
subgraph BV["loan-payments-list"]
BW["loan-payments-list.component.ts"]
end
subgraph BX["loans-overview"]
BY["loans-overview.component.ts"]
end
end
BZ["index.ts"]
C0["loan-card-vm.ts"]
C1["loan-schedule-status.ts"]
C2["loan-types.ts"]
C3["loans.routes.ts"]
C4["loans.store.ts"]
end
subgraph C5["feature-recurring"]
C6["bills-calendar-vm.ts"]
subgraph C7["components"]
subgraph C8["bills-calendar"]
C9["bills-calendar.component.ts"]
end
subgraph CA["bills-day-list"]
CB["bills-day-list.component.ts"]
end
subgraph CC["bills-month-grid"]
CD["bills-month-grid.component.ts"]
end
CE["index.ts"]
subgraph CF["recurring-overview"]
CG["recurring-overview.component.ts"]
end
subgraph CH["recurring-payments-panel"]
CI["recurring-payments-panel.component.ts"]
end
end
CJ["index.ts"]
CK["recurring-payments-row-vm.ts"]
CL["recurring-series.store.ts"]
CM["recurring.routes.ts"]
end
subgraph CN["feature-settings"]
subgraph CO["components"]
CP["index.ts"]
subgraph CQ["settings-about-section"]
CR["settings-about-section.component.ts"]
end
subgraph CS["settings-currency-locale-section"]
CT["settings-currency-locale-section.component.ts"]
end
subgraph CU["settings-data-section"]
CV["settings-data-section.component.ts"]
end
subgraph CW["settings-overview"]
CX["settings-overview.component.ts"]
end
subgraph CY["settings-privacy-section"]
CZ["settings-privacy-section.component.ts"]
end
subgraph D0["settings-reporting-section"]
D1["settings-reporting-section.component.ts"]
end
subgraph D2["settings-theme-section"]
D3["settings-theme-section.component.ts"]
end
end
D4["index.ts"]
D5["settings.routes.ts"]
end
subgraph D6["feature-transactions"]
D7["category-picker.ts"]
subgraph D8["components"]
subgraph D9["attribution-override-fieldset"]
DA["attribution-override-fieldset.component.ts"]
end
subgraph DB["category-select-cell"]
DC["category-select-cell.component.ts"]
end
DD["index.ts"]
subgraph DE["transaction-bulk-bar"]
DF["transaction-bulk-bar.component.ts"]
end
subgraph DG["transaction-edit-form"]
DH["transaction-edit-form.component.ts"]
end
subgraph DI["transaction-filters"]
DJ["transaction-filters.component.ts"]
end
subgraph DK["transaction-row"]
DL["transaction-row.component.ts"]
end
subgraph DM["transactions-overview"]
DN["transactions-overview.component.ts"]
end
subgraph DO["transfer-review"]
DP["transfer-review.component.ts"]
end
end
DQ["index.ts"]
DR["transaction-filters.ts"]
DS["transaction-row-vm.ts"]
DT["transactions.routes.ts"]
end
subgraph DU["shared"]
subgraph DV["echarts"]
DW["bucketed-axis-option.ts"]
DX["chart-theme.ts"]
DY["echarts-jsdom.testing.ts"]
DZ["echarts-setup.ts"]
E0["index.ts"]
E1["legend-option.ts"]
E2["tooltip-formatter.ts"]
end
subgraph E3["ui"]
subgraph E4["absolute-range-panel"]
E5["absolute-range-panel.component.ts"]
end
subgraph E6["alert"]
E7["alert.component.ts"]
end
subgraph E8["badge"]
E9["badge.component.ts"]
end
subgraph EA["button"]
EB["button.component.ts"]
end
subgraph EC["collapse"]
ED["collapse.component.ts"]
end
subgraph EE["confirm-dialog"]
EF["confirm-dialog.component.ts"]
end
subgraph EG["cycle-picker"]
EH["cycle-picker.component.ts"]
end
subgraph EI["date-range-input"]
EJ["date-range-input.component.ts"]
end
subgraph EK["divider"]
EL["divider.component.ts"]
end
subgraph EM["dropdown"]
EN["dropdown.component.ts"]
end
subgraph EO["empty-state"]
EP["empty-state.component.ts"]
end
subgraph EQ["fieldset"]
ER["fieldset.component.ts"]
end
subgraph ES["flex"]
ET["flex.component.ts"]
end
subgraph EU["granularity-picker"]
EV["granularity-picker.component.ts"]
end
EW["index.ts"]
subgraph EX["input"]
EY["input.component.ts"]
end
subgraph EZ["label"]
F0["label.component.ts"]
end
subgraph F1["loading-skeleton"]
F2["loading-skeleton.component.ts"]
end
subgraph F3["modal"]
F4["mm-modal.component.ts"]
end
subgraph F5["page-header"]
F6["page-header.component.ts"]
end
subgraph F7["paginator"]
F8["paginator.component.ts"]
end
subgraph F9["paper"]
FA["paper.component.ts"]
end
subgraph FB["privacy-blur"]
FC["privacy-blur.component.ts"]
end
subgraph FD["privacy-toggle"]
FE["privacy-toggle.component.ts"]
end
subgraph FF["range-picker"]
FG["range-picker.component.ts"]
end
subgraph FH["select"]
FI["select.component.ts"]
end
subgraph FJ["stat-card"]
FK["stat-card.component.ts"]
end
subgraph FL["table"]
FM["table.component.ts"]
end
subgraph FN["tabs"]
FO["tabs.component.ts"]
end
subgraph FP["typography"]
FQ["typography.component.ts"]
end
end
subgraph FR["utils"]
FS["calendar-cycles.ts"]
FT["confidence-color.ts"]
FU["confirm-state.ts"]
FV["currency-format.ts"]
FW["currency-symbol-presets.ts"]
FX["daisy-classes.ts"]
FY["date-buckets.ts"]
FZ["date-format.pipe.ts"]
G0["date-format.ts"]
G1["debounced-text.ts"]
G2["download-json.ts"]
G3["fingerprint.ts"]
G4["format-settings.testing.ts"]
G5["format-settings.ts"]
G6["hidden-amount.ts"]
G7["iban.ts"]
G8["index.ts"]
G9["link-control-to-setting.ts"]
GA["locale-presets.ts"]
GB["number-format.ts"]
GC["pagination.ts"]
GD["percentage.ts"]
GE["quick-ranges.ts"]
GF["range-expression.ts"]
GG["search-params.ts"]
GH["selection-model.ts"]
GI["signed-amount.pipe.ts"]
GJ["sortable.ts"]
GK["structural-filters.ts"]
GL["theme-hooks.ts"]
subgraph GM["validators"]
GN["iban.validator.ts"]
GO["percentage.validator.ts"]
end
GP["with-archivable.ts"]
GQ["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3X
5-->4
5-->6
6-->Q
6-->G8
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
G-->1O
G-->3C
G-->3N
G-->G3
G-->G5
H-->G
H-->3O
H-->G8
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->2Z
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
Z-->G8
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
16-->3X
16-->G8
17-->Z
17-->10
17-->11
17-->13
17-->14
17-->15
17-->16
1A-->24
1A-->EB
1A-->FQ
1B-->1A
1E-->1D
1G-->G8
1H-->1G
1H-->1I
1I-->1G
1I-->Q
1I-->G8
1K-->1L
1K-->1M
1K-->1O
1L-->1O
1M-->1O
1N-->1L
1N-->1M
1N-->1O
1N-->1P
1N-->1Q
1P-->B
1P-->Q
1S-->1V
1T-->1S
1T-->1U
1T-->1V
1U-->1V
1X-->1Z
1X-->27
1X-->29
1X-->5
1X-->Q
1X-->2Z
1X-->3X
1X-->G8
1Y-->Q
1Y-->3O
1Y-->G8
1Z-->27
1Z-->Q
1Z-->G8
20-->21
20-->2Z
20-->E0
20-->G8
21-->2Z
21-->E0
21-->G8
22-->Q
22-->2Z
23-->Q
23-->G8
24-->1X
24-->1Y
24-->1Z
24-->20
24-->21
24-->22
24-->23
24-->25
24-->26
24-->27
24-->28
24-->29
25-->1X
25-->1Y
25-->26
25-->27
25-->Q
25-->2Z
25-->G8
26-->1Y
26-->G8
27-->Q
27-->3T
27-->3X
28-->Q
29-->27
29-->28
29-->Q
29-->3X
2B-->Q
2B-->G8
2C-->2B
2C-->Q
2C-->G8
2D-->2F
2D-->2U
2D-->G8
2E-->2L
2E-->Q
2F-->2E
2F-->Q
2F-->G8
2G-->2E
2G-->2L
2G-->Q
2G-->G8
2H-->2L
2H-->Q
2I-->Q
2J-->2E
2J-->37
2J-->Q
2K-->G8
2L-->2I
2L-->2M
2L-->Q
2L-->3X
2M-->5
2M-->Q
2N-->Q
2O-->2F
2O-->2U
2O-->Q
2O-->G8
2P-->Q
2Q-->Q
2Q-->G8
2R-->G8
2S-->2T
2T-->2U
2T-->Q
2U-->2F
2U-->Q
2U-->G8
2V-->2W
2V-->2Y
2V-->3F
2V-->Q
2W-->2F
2W-->2U
2W-->G8
2X-->2U
2X-->3H
2X-->G8
2Y-->2F
2Y-->2O
2Y-->2U
2Y-->G8
2Z-->2B
2Z-->2C
2Z-->2D
2Z-->2E
2Z-->2F
2Z-->2G
2Z-->2H
2Z-->2I
2Z-->2J
2Z-->2K
2Z-->2L
2Z-->2M
2Z-->2N
2Z-->2O
2Z-->2P
2Z-->2Q
2Z-->2R
2Z-->2S
2Z-->2T
2Z-->2U
2Z-->2V
2Z-->2W
2Z-->2X
2Z-->2Y
2Z-->30
2Z-->31
2Z-->32
2Z-->33
2Z-->34
2Z-->35
2Z-->36
2Z-->37
2Z-->38
2Z-->39
2Z-->3A
2Z-->3B
2Z-->3C
2Z-->3D
2Z-->3E
2Z-->3F
2Z-->3G
2Z-->3H
2Z-->3I
30-->2M
30-->Q
31-->2M
31-->5
31-->Q
32-->Q
32-->G8
33-->3I
35-->G8
36-->2L
36-->Q
37-->G8
38-->G8
39-->2L
39-->B
39-->Q
39-->G8
3A-->39
3A-->G8
3B-->Q
3B-->G8
3C-->36
3C-->Q
3C-->G8
3D-->2E
3D-->2H
3D-->Q
3E-->Q
3E-->3X
3F-->2T
3G-->2L
3G-->Q
3G-->G8
3H-->36
3H-->Q
3I-->2F
3I-->Q
3I-->G8
3K-->3L
3N-->3P
3O-->3N
3O-->3P
3O-->3Q
3Q-->3P
3S-->Q
3T-->3S
3T-->3U
3T-->3V
3U-->Q
3V-->Q
3V-->3X
3X-->3Y
3X-->3Z
3X-->41
3X-->40
3Y-->Q
3Z-->41
3Z-->Q
40-->3Z
40-->41
40-->Q
41-->6
41-->Q
41-->G8
43-->Q
44-->Q
45-->Q
46-->Q
47-->4M
47-->4O
47-->E0
48-->2Z
48-->G8
49-->Q
49-->24
49-->2Z
49-->G8
4C-->EW
4C-->G8
4E-->48
4E-->49
4E-->Q
4E-->2Z
4E-->E0
4E-->EW
4E-->G8
4G-->48
4G-->49
4G-->Q
4G-->24
4G-->2Z
4G-->E0
4G-->EW
4I-->43
4I-->44
4I-->4C
4I-->EW
4K-->44
4K-->46
4K-->Q
4K-->EW
4K-->G8
4K-->GN
4K-->GO
4M-->4C
4M-->4E
4M-->4K
4M-->24
4M-->EW
4M-->G8
4O-->43
4O-->44
4O-->45
4O-->4G
4O-->4I
4O-->4K
4O-->Q
4O-->24
4O-->EW
4O-->G8
4P-->4C
4P-->4E
4P-->4G
4P-->4I
4P-->4K
4P-->4M
4P-->4O
4Q-->44
4Q-->46
4Q-->47
4Q-->4P
4S-->4Z
4S-->5C
4U-->1N
4V-->4U
4V-->5J
4V-->Q
4V-->1N
4V-->24
4W-->Q
4W-->EW
4Z-->4T
4Z-->4W
4Z-->51
4Z-->B
4Z-->Q
4Z-->24
4Z-->EW
4Z-->G8
51-->4T
51-->Q
51-->EW
52-->4Z
52-->51
52-->56
52-->58
52-->5A
52-->5C
54-->5E
54-->5G
54-->B
54-->Q
54-->24
54-->EW
56-->5F
56-->24
56-->EW
56-->G8
58-->5E
58-->54
58-->B
58-->Q
58-->24
58-->EW
5A-->5H
5A-->5J
5A-->EW
5A-->G8
5C-->5F
5C-->5I
5C-->5J
5C-->56
5C-->58
5C-->5A
5C-->Q
5C-->24
5C-->EW
5C-->G8
5D-->4S
5D-->4T
5D-->4U
5D-->4V
5D-->52
5D-->5F
5D-->5I
5D-->5J
5E-->5G
5E-->Q
5F-->5I
5F-->Q
5G-->Q
5H-->Q
5I-->5G
5I-->Q
5J-->5H
5J-->B
5J-->Q
5J-->24
5J-->G8
5L-->5Q
5O-->EW
5Q-->5T
5Q-->5U
5Q-->5V
5Q-->5W
5Q-->5O
5Q-->EW
5R-->5Q
5V-->5T
5W-->5U
5X-->5L
5X-->5R
5Z-->Q
63-->24
63-->EW
63-->G8
65-->24
65-->3X
65-->EW
65-->G8
67-->6V
67-->24
67-->2Z
67-->E0
67-->EW
67-->G8
69-->5Z
69-->60
69-->6V
69-->6B
69-->6D
69-->24
69-->EW
69-->G8
6B-->24
6B-->EW
6D-->60
6D-->EW
6F-->6R
6F-->6S
6F-->Q
6F-->EW
6H-->6R
6H-->6S
6H-->6V
6H-->63
6H-->65
6H-->67
6H-->69
6H-->6F
6H-->6K
6H-->6M
6H-->6O
6H-->6Q
6H-->24
6H-->2Z
6H-->EW
6H-->G8
6I-->63
6I-->65
6I-->67
6I-->69
6I-->6B
6I-->6F
6I-->6H
6I-->6K
6I-->6M
6I-->6O
6I-->6Q
6K-->6B
6K-->24
6K-->2Z
6K-->3X
6K-->E0
6K-->EW
6K-->G8
6M-->6V
6M-->24
6M-->EW
6M-->G8
6O-->24
6O-->2Z
6O-->3X
6O-->E0
6O-->EW
6O-->G8
6Q-->6V
6Q-->24
6Q-->EW
6Q-->G8
6R-->6S
6R-->Q
6S-->Q
6T-->6H
6T-->E0
6U-->6I
6U-->6T
6V-->5Z
6V-->24
6V-->2Z
6V-->3X
6Z-->Q
6Z-->3K
6Z-->EW
6Z-->G8
70-->6Z
71-->70
75-->78
75-->7A
75-->24
75-->EW
76-->75
76-->78
76-->7A
78-->24
78-->2Z
78-->E0
78-->EW
78-->G8
7A-->Q
7A-->24
7A-->2Z
7A-->3X
7A-->E0
7A-->EW
7A-->G8
7B-->75
7B-->E0
7C-->76
7C-->7B
7G-->7X
7G-->7Z
7G-->Q
7G-->24
7G-->2Z
7G-->EW
7G-->G8
7I-->7Y
7I-->EW
7K-->7G
7K-->7Q
7K-->7T
7K-->EW
7M-->Q
7M-->EW
7O-->81
7O-->EW
7Q-->7Y
7Q-->7Z
7Q-->81
7Q-->7I
7Q-->7M
7Q-->7O
7Q-->Q
7Q-->24
7Q-->EW
7Q-->G8
7R-->7G
7R-->7I
7R-->7K
7R-->7M
7R-->7O
7R-->7Q
7R-->7T
7R-->7V
7T-->7W
7T-->7Z
7T-->83
7T-->84
7T-->7V
7T-->24
7T-->EW
7T-->G8
7V-->84
7W-->Q
7X-->Q
7X-->2Z
7X-->EW
7X-->G8
7Y-->7W
7Y-->Q
7Y-->2Z
7Y-->EW
7Y-->G8
7Z-->Q
7Z-->24
7Z-->2Z
7Z-->3X
80-->7K
80-->E0
81-->Q
81-->2Z
81-->EW
81-->G8
82-->7R
82-->7W
82-->7X
82-->7Y
82-->7Z
82-->80
82-->81
82-->83
82-->84
83-->2Z
83-->E0
83-->G8
88-->8H
88-->EW
8A-->8I
8A-->8C
8A-->EW
8C-->8I
8C-->EW
8E-->8I
8E-->EW
8F-->88
8F-->8A
8F-->8C
8F-->8E
8J-->88
8J-->8A
8J-->8E
8K-->8F
8K-->8I
8K-->8J
8O-->1E
8O-->EW
8P-->8O
8Q-->8O
8R-->8P
8R-->8Q
8T-->Q
8W-->9P
8W-->4Q
8W-->EW
8Y-->EW
90-->94
90-->EW
92-->94
92-->EW
94-->EW
96-->8T
96-->94
96-->EW
98-->9T
98-->EW
9A-->8T
9A-->EW
9C-->8T
9C-->9T
9C-->9U
9C-->90
9C-->92
9C-->96
9C-->98
9C-->9A
9C-->9E
9C-->Q
9C-->17
9C-->EW
9E-->17
9E-->EW
9E-->G8
9G-->9P
9G-->9U
9G-->9N
9G-->Q
9G-->17
9G-->EW
9I-->Q
9I-->EW
9K-->9Q
9K-->8Y
9K-->9C
9K-->9G
9K-->9I
9K-->24
9K-->EW
9L-->9C
9L-->9E
9L-->9G
9L-->9I
9L-->9K
9N-->9P
9N-->8W
9N-->Q
9N-->EW
9O-->B
9O-->Q
9O-->17
9O-->24
9P-->Q
9Q-->8T
9Q-->9O
9Q-->9P
9Q-->9U
9Q-->Q
9Q-->17
9Q-->24
9Q-->4Q
9R-->9K
9S-->8T
9S-->9L
9S-->9O
9S-->9P
9S-->9R
9S-->9T
9S-->9U
9T-->8T
9U-->Q
9W-->2Z
9Z-->9W
9Z-->AY
9Z-->EW
9Z-->G8
A1-->AU
A1-->EW
A3-->EW
A5-->AV
A5-->AW
A5-->AY
A5-->24
A5-->2Z
A5-->EW
A7-->AY
A7-->3O
A7-->E0
A7-->EW
A9-->AT
A9-->AY
A9-->A3
A9-->24
A9-->2Z
A9-->E0
A9-->EW
A9-->G8
AB-->AW
AB-->AY
AB-->24
AB-->2Z
AB-->EW
AB-->G8
AD-->24
AD-->8K
AD-->EW
AF-->AU
AF-->AY
AF-->EW
AH-->AY
AH-->B1
AH-->A5
AH-->A9
AH-->AB
AH-->AD
AH-->AL
AH-->AS
AH-->24
AH-->2Z
AH-->8K
AH-->E0
AH-->EW
AH-->G8
AJ-->AU
AJ-->AY
AJ-->9Z
AJ-->A1
AJ-->A7
AJ-->AF
AJ-->EW
AL-->AY
AL-->24
AL-->2Z
AL-->3X
AL-->E0
AL-->EW
AL-->G8
AM-->9Z
AM-->A1
AM-->A3
AM-->A5
AM-->A9
AM-->AB
AM-->AD
AM-->AF
AM-->AH
AM-->AJ
AM-->AL
AM-->AO
AM-->AQ
AM-->AS
AO-->AQ
AO-->EW
AQ-->AW
AQ-->AY
AQ-->B0
AQ-->B1
AQ-->EW
AQ-->G8
AS-->AY
AS-->B0
AS-->B1
AS-->AQ
AS-->Q
AS-->EW
AT-->2Z
AT-->E0
AT-->G8
AU-->Q
AV-->AW
AV-->Q
AV-->2Z
AV-->EW
AV-->G8
AW-->G8
AX-->AH
AX-->AJ
AX-->AO
AX-->E0
AY-->9W
AY-->AW
AY-->Q
AY-->24
AY-->2Z
AY-->3O
AY-->3X
AZ-->AM
AZ-->AU
AZ-->AW
AZ-->AX
AZ-->AY
AZ-->B0
AZ-->B1
B0-->Q
B1-->Q
B4-->B6
B4-->BA
B4-->BC
B4-->BE
B6-->B8
B6-->BA
B6-->BC
B6-->BE
B6-->EW
B8-->BH
B8-->5D
B8-->EW
BA-->BH
BA-->1N
BA-->24
BA-->5D
BA-->EW
BC-->Q
BC-->1N
BC-->24
BC-->5D
BC-->EW
BC-->G8
BE-->Q
BE-->24
BE-->5D
BE-->EW
BE-->G8
BF-->B4
BF-->BG
BG-->B6
BH-->5D
BH-->EW
BK-->BM
BK-->BO
BK-->BQ
BK-->BS
BK-->BU
BK-->BW
BK-->BY
BM-->Q
BM-->1H
BM-->EW
BM-->G8
BO-->Q
BO-->1H
BO-->E0
BO-->EW
BQ-->C0
BQ-->EW
BS-->C1
BS-->C4
BS-->BM
BS-->BO
BS-->BW
BS-->1H
BS-->24
BS-->EW
BU-->C2
BU-->Q
BU-->24
BU-->EW
BU-->GO
BW-->Q
BW-->24
BW-->EW
BW-->G8
BY-->C0
BY-->C4
BY-->BQ
BY-->BU
BY-->Q
BY-->EW
BZ-->BK
BZ-->C0
BZ-->C1
BZ-->C2
BZ-->C3
BZ-->C4
C0-->C1
C0-->C2
C0-->Q
C0-->1H
C0-->EW
C0-->G8
C1-->1H
C1-->EW
C1-->G8
C2-->Q
C3-->BS
C3-->BY
C3-->E0
C4-->Q
C4-->1H
C4-->24
C4-->G8
C6-->EW
C9-->C6
C9-->CL
C9-->CB
C9-->CD
C9-->24
C9-->2Z
C9-->EW
C9-->G8
CB-->C6
CB-->EW
CD-->C6
CD-->EW
CE-->C9
CE-->CB
CE-->CD
CE-->CG
CE-->CI
CG-->C9
CG-->CI
CG-->24
CG-->EW
CI-->CK
CI-->CL
CI-->24
CI-->2Z
CI-->E0
CI-->EW
CI-->G8
CJ-->CE
CJ-->CM
CL-->24
CL-->2Z
CL-->3X
CM-->CG
CP-->CX
CR-->1E
CR-->EW
CT-->24
CT-->EW
CT-->G8
CV-->71
CV-->EW
CX-->CR
CX-->CT
CX-->CV
CX-->CZ
CX-->D1
CX-->D3
CX-->EW
CZ-->24
CZ-->EW
CZ-->G8
D1-->24
D1-->EW
D1-->G8
D3-->24
D3-->3O
D3-->EW
D4-->CP
D4-->D5
D5-->CX
D7-->Q
DA-->Q
DA-->24
DA-->3T
DA-->EW
DA-->G8
DC-->D7
DD-->DF
DD-->DH
DD-->DJ
DD-->DN
DD-->DP
DF-->D7
DF-->B
DF-->24
DF-->EW
DH-->D7
DH-->DA
DH-->B
DH-->Q
DH-->24
DH-->3T
DH-->5D
DH-->EW
DJ-->D7
DJ-->DR
DJ-->B
DJ-->24
DJ-->EW
DJ-->G8
DL-->D7
DL-->DS
DL-->DC
DL-->EW
DL-->G8
DN-->D7
DN-->DR
DN-->DS
DN-->DF
DN-->DH
DN-->DJ
DN-->DL
DN-->DP
DN-->B
DN-->Q
DN-->24
DN-->3X
DN-->5D
DN-->EW
DN-->G8
DP-->24
DP-->3X
DP-->EW
DP-->G8
DQ-->DT
DR-->Q
DR-->3X
DS-->Q
DT-->DN
E0-->DW
E0-->DX
E0-->DZ
E0-->E1
E0-->E2
E2-->G8
E5-->EB
E5-->EP
E5-->ER
E5-->EY
E5-->FQ
E5-->Q
E5-->G8
E7-->G8
E9-->G8
EB-->G8
ED-->G8
EF-->EB
EF-->F0
EF-->F4
EF-->FQ
EH-->G8
EJ-->EB
EJ-->EN
EJ-->G8
EL-->G8
EN-->G8
EP-->ET
EP-->FQ
ER-->G8
ET-->G8
EW-->E5
EW-->E7
EW-->E9
EW-->EB
EW-->ED
EW-->EF
EW-->EH
EW-->EJ
EW-->EL
EW-->EN
EW-->EP
EW-->ER
EW-->ET
EW-->EV
EW-->EY
EW-->F0
EW-->F2
EW-->F4
EW-->F6
EW-->F8
EW-->FA
EW-->FC
EW-->FE
EW-->FG
EW-->FI
EW-->FK
EW-->FM
EW-->FO
EW-->FQ
EY-->G8
F0-->G8
F2-->ET
F4-->G8
F6-->ET
F6-->FQ
F8-->EB
F8-->ET
F8-->FQ
F8-->G8
FA-->G8
FC-->G8
FE-->EB
FE-->24
FG-->E5
FG-->EB
FG-->ET
FG-->FA
FG-->FQ
FG-->Q
FG-->G8
FI-->G8
FK-->FC
FK-->FQ
FK-->G8
FM-->G8
FO-->G8
FQ-->G8
FS-->G0
FV-->G5
FY-->G5
FZ-->G0
G0-->G5
G4-->G5
G8-->FS
G8-->FT
G8-->FU
G8-->FV
G8-->FW
G8-->FX
G8-->FY
G8-->G0
G8-->FZ
G8-->G1
G8-->G2
G8-->G3
G8-->G5
G8-->G6
G8-->G7
G8-->G9
G8-->GA
G8-->GB
G8-->GC
G8-->GD
G8-->GE
G8-->GF
G8-->GG
G8-->GH
G8-->GI
G8-->GJ
G8-->GK
G8-->GL
G8-->GP
G8-->GQ
GB-->G5
GE-->FY
GE-->GF
GF-->FY
GI-->FV
```
