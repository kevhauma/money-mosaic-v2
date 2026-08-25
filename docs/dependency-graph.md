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
- 428 leaf nodes, 1327 edges.
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
T["recurring-overrides.repository.ts"]
U["rules.repository.ts"]
V["salary-metadata.repository.ts"]
W["transactions.repository.ts"]
X["transfer-settings.repository.ts"]
Y["transfers.repository.ts"]
end
subgraph Z["import"]
10["account-detection.ts"]
11["csv-import.service.ts"]
12["csv-parse.ts"]
13["csv-parse.worker.ts"]
14["csv-row-mapper.ts"]
15["csv-worker.types.ts"]
16["delimiter-guess.ts"]
17["import.service.ts"]
18["index.ts"]
end
subgraph 19["layout"]
subgraph 1A["app-shell"]
1B["app-shell.component.ts"]
end
1C["app-title.strategy.ts"]
1D["index.ts"]
end
subgraph 1E["links"]
1F["external-links.ts"]
1G["index.ts"]
end
subgraph 1H["loans"]
1I["amortization.ts"]
1J["index.ts"]
1K["loan-progress.ts"]
1L["what-if.ts"]
end
subgraph 1M["ml"]
1N["category-model.worker.ts"]
1O["category-model.worker.types.ts"]
1P["feature-hashing.ts"]
1Q["index.ts"]
1R["model-config.ts"]
1S["rule-proposal-mining.ts"]
1T["training-window.ts"]
end
subgraph 1U["onboarding"]
1V["home-redirect.guard.ts"]
1W["index.ts"]
1X["mark-visited.guard.ts"]
1Y["visited.service.ts"]
end
subgraph 1Z["state"]
20["accounts.store.ts"]
21["app-settings.store.ts"]
22["categories.store.ts"]
23["chart-options-control.ts"]
24["chart-options.store.ts"]
25["forecast-settings.store.ts"]
26["goals.store.ts"]
27["import-batches.store.ts"]
28["index.ts"]
29["page-range-control.ts"]
2A["range-state.store.ts"]
2B["transactions.store.ts"]
2C["transfer-settings.store.ts"]
2D["transfers.store.ts"]
end
subgraph 2E["stats"]
2F["account-balance-history.ts"]
2G["account-balance-trend.ts"]
2H["annual-lump-sum-smoothing.ts"]
2I["category-breakdown.ts"]
2J["category-composition-trend.ts"]
2K["category-cycle-heatmap.ts"]
2L["category-expense-transactions.ts"]
2M["category-kind-contribution.ts"]
2N["category-period-comparison.ts"]
2O["chart-zoom-window.ts"]
2P["classify-for-stats.ts"]
2Q["classify-joint-leg.ts"]
2R["day-transactions.ts"]
2S["embedded-bonus-smoothing.ts"]
2T["full-history-range.ts"]
2U["goal-affordability.ts"]
2V["granularity-for-span.ts"]
2W["gross-net-growth.ts"]
2X["gross-net-ratio.ts"]
2Y["income-category-series.ts"]
2Z["income-events.ts"]
30["income-gap-detection.ts"]
31["income-growth.ts"]
32["income-step-change-detection.ts"]
33["index.ts"]
34["joint-account-stake.ts"]
35["joint-contributor-breakdown.ts"]
36["money-flow-graph.ts"]
37["multi-year-income-comparison.ts"]
38["net-margin.ts"]
39["net-worth-projection.ts"]
3A["period-stats.ts"]
3B["period-window.ts"]
3C["periodized-rate.ts"]
3D["recurring-payments.ts"]
3E["recurring-projection.ts"]
3F["required-saving-rate.ts"]
3G["saving-velocity.ts"]
3H["spending-mosaic.ts"]
3I["top-transactions.ts"]
3J["wage-change-detection.ts"]
3K["weekday-weekend-split.ts"]
3L["year-over-year.ts"]
3M["yearly-income-summary.ts"]
end
subgraph 3N["storage"]
3O["index.ts"]
3P["storage-status.service.ts"]
end
subgraph 3Q["theme"]
3R["accent-colors.ts"]
3S["index.ts"]
3T["theme-styles.ts"]
3U["theme.service.ts"]
end
subgraph 3V["transactions"]
3W["attribution-override.ts"]
3X["index.ts"]
3Y["nullify-transaction.ts"]
3Z["transaction-deletion.service.ts"]
end
subgraph 40["transfers"]
41["index.ts"]
42["transfer-cleanup.service.ts"]
43["transfer-linking.service.ts"]
44["transfer-matching.service.ts"]
45["transfer-matching.ts"]
end
end
subgraph 46["feature-accounts"]
47["account-card-vm.ts"]
48["account-icons.ts"]
49["account-list-order.ts"]
4A["account-types.ts"]
4B["accounts.routes.ts"]
4C["balance-day-tooltip.ts"]
4D["balance-trend-signals.ts"]
subgraph 4E["components"]
subgraph 4F["account-balance-block"]
4G["account-balance-block.component.ts"]
end
subgraph 4H["account-balance-chart"]
4I["account-balance-chart.component.ts"]
end
subgraph 4J["account-balance-history-chart"]
4K["account-balance-history-chart.component.ts"]
end
subgraph 4L["account-card"]
4M["account-card.component.ts"]
end
subgraph 4N["account-form"]
4O["account-form.component.ts"]
end
subgraph 4P["accounts-detail"]
4Q["accounts-detail.component.ts"]
end
subgraph 4R["accounts-overview"]
4S["accounts-overview.component.ts"]
end
4T["index.ts"]
end
4U["index.ts"]
4V["last-import-status.ts"]
end
subgraph 4W["feature-categories"]
4X["categories.routes.ts"]
4Y["category-icons.ts"]
4Z["category-model.service.ts"]
50["category-model.store.ts"]
51["category-row-vm.ts"]
subgraph 52["components"]
subgraph 53["categories-overview"]
54["categories-overview.component.ts"]
end
subgraph 55["category-form"]
56["category-form.component.ts"]
end
57["index.ts"]
subgraph 58["rule-condition-row"]
59["rule-condition-row.component.ts"]
end
subgraph 5A["rule-filters"]
5B["rule-filters.component.ts"]
end
subgraph 5C["rule-form"]
5D["rule-form.component.ts"]
end
subgraph 5E["rule-share-bar"]
5F["rule-share-bar.component.ts"]
end
subgraph 5G["rules-overview"]
5H["rules-overview.component.ts"]
end
end
5I["index.ts"]
5J["rule-condition-editor.ts"]
5K["rule-filters.ts"]
5L["rule-labels.ts"]
5M["rule-share.ts"]
5N["rule-summary.ts"]
5O["rules.store.ts"]
end
subgraph 5P["feature-changelog"]
5Q["changelog.routes.ts"]
subgraph 5R["components"]
subgraph 5S["changelog-entry-row"]
5T["changelog-entry-row.component.ts"]
end
subgraph 5U["changelog-page"]
5V["changelog-page.component.ts"]
end
5W["index.ts"]
end
subgraph 5X["data"]
5Y["changelog-entries.ts"]
5Z["roadmap-entries.ts"]
end
60["group-changelog-entries.ts"]
61["group-roadmap-entries.ts"]
62["index.ts"]
end
subgraph 63["feature-dashboard"]
64["category-comparison-settings.store.ts"]
65["category-comparison-vm.ts"]
subgraph 66["components"]
subgraph 67["account-balance-strip"]
68["account-balance-strip.component.ts"]
end
subgraph 69["action-queue-panel"]
6A["action-queue-panel.component.ts"]
end
subgraph 6B["category-breakdown-panel"]
6C["category-breakdown-panel.component.ts"]
end
subgraph 6D["category-comparison-panel"]
6E["category-comparison-panel.component.ts"]
end
subgraph 6F["category-exclusion-dropdown"]
6G["category-exclusion-dropdown.component.ts"]
end
subgraph 6H["comparison-category-card"]
6I["comparison-category-card.component.ts"]
end
subgraph 6J["dashboard-customize-panel"]
6K["dashboard-customize-panel.component.ts"]
end
subgraph 6L["dashboard-overview"]
6M["dashboard-overview.component.ts"]
end
6N["index.ts"]
subgraph 6O["spending-heatmap-panel"]
6P["spending-heatmap-panel.component.ts"]
end
subgraph 6Q["top-transactions-panel"]
6R["top-transactions-panel.component.ts"]
end
subgraph 6S["trend-chart-panel"]
6T["trend-chart-panel.component.ts"]
end
subgraph 6U["weekday-weekend-split-panel"]
6V["weekday-weekend-split-panel.component.ts"]
end
end
6W["dashboard-layout-settings.store.ts"]
6X["dashboard-row-order.ts"]
6Y["dashboard.routes.ts"]
6Z["index.ts"]
70["stats.store.ts"]
end
subgraph 71["feature-data-management"]
subgraph 72["components"]
subgraph 73["data-management-overview"]
74["data-management-overview.component.ts"]
end
75["index.ts"]
end
76["index.ts"]
end
subgraph 77["feature-explore"]
subgraph 78["components"]
subgraph 79["explore-overview"]
7A["explore-overview.component.ts"]
end
7B["index.ts"]
subgraph 7C["money-flow-panel"]
7D["money-flow-panel.component.ts"]
end
subgraph 7E["spending-mosaic-panel"]
7F["spending-mosaic-panel.component.ts"]
end
end
7G["explore.routes.ts"]
7H["index.ts"]
end
subgraph 7I["feature-future"]
subgraph 7J["components"]
subgraph 7K["forecast-controls"]
7L["forecast-controls.component.ts"]
end
subgraph 7M["forecast-notice"]
7N["forecast-notice.component.ts"]
end
subgraph 7O["future-overview"]
7P["future-overview.component.ts"]
end
subgraph 7Q["goal-form"]
7R["goal-form.component.ts"]
end
subgraph 7S["goal-row"]
7T["goal-row.component.ts"]
end
subgraph 7U["goals-panel"]
7V["goals-panel.component.ts"]
end
7W["index.ts"]
subgraph 7X["net-worth-projection-chart"]
7Y["net-worth-projection-chart.component.ts"]
end
subgraph 7Z["projection-figure-table"]
80["projection-figure-table.component.ts"]
end
end
81["forecast-chart-copy.ts"]
82["forecast-controls-vm.ts"]
83["forecast-notices.ts"]
84["forecast.store.ts"]
85["future.routes.ts"]
86["goal-row-vm.ts"]
87["index.ts"]
88["net-worth-projection-chart-option.ts"]
89["projection-accessible-row.ts"]
end
subgraph 8A["feature-help"]
subgraph 8B["components"]
subgraph 8C["faq-page"]
8D["faq-page.component.ts"]
end
subgraph 8E["guide-detail"]
8F["guide-detail.component.ts"]
end
subgraph 8G["guide-steps"]
8H["guide-steps.component.ts"]
end
subgraph 8I["guides-index"]
8J["guides-index.component.ts"]
end
8K["index.ts"]
end
subgraph 8L["data"]
8M["faq.ts"]
8N["guides.ts"]
end
8O["help.routes.ts"]
8P["index.ts"]
end
subgraph 8Q["feature-home"]
subgraph 8R["components"]
subgraph 8S["home-landing"]
8T["home-landing.component.ts"]
end
8U["index.ts"]
end
8V["home.routes.ts"]
8W["index.ts"]
end
subgraph 8X["feature-import"]
8Y["column-mapping.ts"]
subgraph 8Z["components"]
subgraph 90["account-draft-editor"]
91["account-draft-editor.component.ts"]
end
subgraph 92["batch-wait-card"]
93["batch-wait-card.component.ts"]
end
subgraph 94["column-map-amount-field"]
95["column-map-amount-field.component.ts"]
end
subgraph 96["column-map-counterparty-field"]
97["column-map-counterparty-field.component.ts"]
end
subgraph 98["column-map-sample-caption"]
99["column-map-sample-caption.component.ts"]
end
subgraph 9A["column-map-simple-field"]
9B["column-map-simple-field.component.ts"]
end
subgraph 9C["column-map-stepper"]
9D["column-map-stepper.component.ts"]
end
subgraph 9E["column-map-summary-step"]
9F["column-map-summary-step.component.ts"]
end
subgraph 9G["import-history"]
9H["import-history.component.ts"]
end
subgraph 9I["import-map-step"]
9J["import-map-step.component.ts"]
end
subgraph 9K["import-preview-step"]
9L["import-preview-step.component.ts"]
end
subgraph 9M["import-select-step"]
9N["import-select-step.component.ts"]
end
subgraph 9O["import-summary-step"]
9P["import-summary-step.component.ts"]
end
subgraph 9Q["import-wizard"]
9R["import-wizard.component.ts"]
end
9S["index.ts"]
subgraph 9T["queued-file-row"]
9U["queued-file-row.component.ts"]
end
end
9V["duplicate-scan.ts"]
9W["import-history-rows.ts"]
9X["import-queue.ts"]
9Y["import-wizard-session.ts"]
9Z["import.routes.ts"]
A0["index.ts"]
A1["mapper-steps.ts"]
A2["mapping-profiles.store.ts"]
end
subgraph A3["feature-income"]
A4["career-start-date.ts"]
subgraph A5["components"]
subgraph A6["income-career-start"]
A7["income-career-start.component.ts"]
end
subgraph A8["income-category-checklist"]
A9["income-category-checklist.component.ts"]
end
subgraph AA["income-chart-cell"]
AB["income-chart-cell.component.ts"]
end
subgraph AC["income-events-sidebar"]
AD["income-events-sidebar.component.ts"]
end
subgraph AE["income-gross-color"]
AF["income-gross-color.component.ts"]
end
subgraph AG["income-gross-net-section"]
AH["income-gross-net-section.component.ts"]
end
subgraph AI["income-growth-panel"]
AJ["income-growth-panel.component.ts"]
end
subgraph AK["income-inference-note"]
AL["income-inference-note.component.ts"]
end
subgraph AM["income-lump-sum-checklist"]
AN["income-lump-sum-checklist.component.ts"]
end
subgraph AO["income-main-category"]
AP["income-main-category.component.ts"]
end
subgraph AQ["income-overview"]
AR["income-overview.component.ts"]
end
subgraph AS["income-settings-page"]
AT["income-settings-page.component.ts"]
end
subgraph AU["income-yearly-panel"]
AV["income-yearly-panel.component.ts"]
end
AW["index.ts"]
subgraph AX["salary-details-page"]
AY["salary-details-page.component.ts"]
end
subgraph AZ["salary-metadata-table"]
B0["salary-metadata-table.component.ts"]
end
subgraph B1["salary-month-modal"]
B2["salary-month-modal.component.ts"]
end
end
B3["gross-net-chart-options.ts"]
B4["income-category-vm.ts"]
B5["income-event-vm.ts"]
B6["income-granularity.ts"]
B7["income.routes.ts"]
B8["income.store.ts"]
B9["index.ts"]
BA["salary-metadata-edit.ts"]
BB["salary-metadata-rows.ts"]
end
subgraph BC["feature-learning"]
subgraph BD["components"]
BE["index.ts"]
subgraph BF["learning-overview"]
BG["learning-overview.component.ts"]
end
subgraph BH["model-status-badge"]
BI["model-status-badge.component.ts"]
end
subgraph BJ["model-status"]
BK["model-status.component.ts"]
end
subgraph BL["rule-proposals"]
BM["rule-proposals.component.ts"]
end
subgraph BN["suggestions-table"]
BO["suggestions-table.component.ts"]
end
end
BP["index.ts"]
BQ["learning.routes.ts"]
BR["model-status-display.ts"]
end
subgraph BS["feature-loans"]
subgraph BT["components"]
BU["index.ts"]
subgraph BV["loan-amortization-table"]
BW["loan-amortization-table.component.ts"]
end
subgraph BX["loan-balance-chart"]
BY["loan-balance-chart.component.ts"]
end
subgraph BZ["loan-card"]
C0["loan-card.component.ts"]
end
subgraph C1["loan-composition-chart"]
C2["loan-composition-chart.component.ts"]
end
subgraph C3["loan-detail"]
C4["loan-detail.component.ts"]
end
subgraph C5["loan-form"]
C6["loan-form.component.ts"]
end
subgraph C7["loan-payments-list"]
C8["loan-payments-list.component.ts"]
end
subgraph C9["loan-what-if"]
CA["loan-what-if.component.ts"]
end
subgraph CB["loans-overview"]
CC["loans-overview.component.ts"]
end
end
CD["index.ts"]
CE["loan-card-vm.ts"]
CF["loan-schedule-status.ts"]
CG["loan-types.ts"]
CH["loan-what-if-vm.ts"]
CI["loans.routes.ts"]
CJ["loans.store.ts"]
end
subgraph CK["feature-recurring"]
CL["bills-calendar-vm.ts"]
subgraph CM["components"]
subgraph CN["bills-calendar"]
CO["bills-calendar.component.ts"]
end
subgraph CP["bills-day-list"]
CQ["bills-day-list.component.ts"]
end
subgraph CR["bills-month-grid"]
CS["bills-month-grid.component.ts"]
end
CT["index.ts"]
subgraph CU["recurring-dismissed-list"]
CV["recurring-dismissed-list.component.ts"]
end
subgraph CW["recurring-overview"]
CX["recurring-overview.component.ts"]
end
subgraph CY["recurring-payments-panel"]
CZ["recurring-payments-panel.component.ts"]
end
end
D0["index.ts"]
D1["recurring-overrides.ts"]
D2["recurring-payments-row-vm.ts"]
D3["recurring-series.store.ts"]
D4["recurring.routes.ts"]
end
subgraph D5["feature-settings"]
subgraph D6["components"]
D7["index.ts"]
subgraph D8["settings-about-section"]
D9["settings-about-section.component.ts"]
end
subgraph DA["settings-currency-locale-section"]
DB["settings-currency-locale-section.component.ts"]
end
subgraph DC["settings-data-section"]
DD["settings-data-section.component.ts"]
end
subgraph DE["settings-overview"]
DF["settings-overview.component.ts"]
end
subgraph DG["settings-privacy-section"]
DH["settings-privacy-section.component.ts"]
end
subgraph DI["settings-reporting-section"]
DJ["settings-reporting-section.component.ts"]
end
subgraph DK["settings-theme-section"]
DL["settings-theme-section.component.ts"]
end
end
DM["index.ts"]
DN["settings.routes.ts"]
end
subgraph DO["feature-transactions"]
DP["category-picker.ts"]
subgraph DQ["components"]
subgraph DR["attribution-override-fieldset"]
DS["attribution-override-fieldset.component.ts"]
end
subgraph DT["category-select-cell"]
DU["category-select-cell.component.ts"]
end
DV["index.ts"]
subgraph DW["transaction-bulk-bar"]
DX["transaction-bulk-bar.component.ts"]
end
subgraph DY["transaction-card"]
DZ["transaction-card.component.ts"]
end
subgraph E0["transaction-edit-form"]
E1["transaction-edit-form.component.ts"]
end
subgraph E2["transaction-filters"]
E3["transaction-filters.component.ts"]
end
subgraph E4["transaction-row"]
E5["transaction-row.component.ts"]
end
subgraph E6["transactions-overview"]
E7["transactions-overview.component.ts"]
end
subgraph E8["transfer-review"]
E9["transfer-review.component.ts"]
end
end
EA["index.ts"]
EB["transaction-filters.ts"]
EC["transaction-row-vm.ts"]
ED["transactions.routes.ts"]
EE["transfer-label.ts"]
end
subgraph EF["shared"]
subgraph EG["echarts"]
EH["bucketed-axis-option.ts"]
EI["chart-theme.ts"]
EJ["echarts-jsdom.testing.ts"]
EK["echarts-setup.ts"]
EL["index.ts"]
EM["legend-option.ts"]
EN["tooltip-formatter.ts"]
end
subgraph EO["ui"]
subgraph EP["absolute-range-panel"]
EQ["absolute-range-panel.component.ts"]
end
subgraph ER["alert"]
ES["alert.component.ts"]
end
subgraph ET["badge"]
EU["badge.component.ts"]
end
subgraph EV["button"]
EW["button.component.ts"]
end
subgraph EX["collapse"]
EY["collapse.component.ts"]
end
subgraph EZ["confirm-dialog"]
F0["confirm-dialog.component.ts"]
end
subgraph F1["cycle-picker"]
F2["cycle-picker.component.ts"]
end
subgraph F3["date-range-input"]
F4["date-range-input.component.ts"]
end
subgraph F5["divider"]
F6["divider.component.ts"]
end
subgraph F7["dropdown"]
F8["dropdown.component.ts"]
end
subgraph F9["empty-state"]
FA["empty-state.component.ts"]
end
subgraph FB["fieldset"]
FC["fieldset.component.ts"]
end
subgraph FD["flex"]
FE["flex.component.ts"]
end
subgraph FF["granularity-picker"]
FG["granularity-picker.component.ts"]
end
FH["index.ts"]
subgraph FI["input"]
FJ["input.component.ts"]
end
subgraph FK["label"]
FL["label.component.ts"]
end
subgraph FM["loading-skeleton"]
FN["loading-skeleton.component.ts"]
end
subgraph FO["modal"]
FP["mm-modal.component.ts"]
end
subgraph FQ["page-header"]
FR["page-header.component.ts"]
end
subgraph FS["paginator"]
FT["paginator.component.ts"]
end
subgraph FU["paper"]
FV["paper.component.ts"]
end
subgraph FW["privacy-blur"]
FX["privacy-blur.component.ts"]
end
subgraph FY["privacy-toggle"]
FZ["privacy-toggle.component.ts"]
end
subgraph G0["range-picker"]
G1["range-picker.component.ts"]
end
subgraph G2["select"]
G3["select.component.ts"]
end
subgraph G4["stat-card"]
G5["stat-card.component.ts"]
end
subgraph G6["table"]
G7["table.component.ts"]
end
subgraph G8["tabs"]
G9["tabs.component.ts"]
end
subgraph GA["typography"]
GB["typography.component.ts"]
end
end
subgraph GC["utils"]
GD["calendar-cycles.ts"]
GE["compact-viewport.ts"]
GF["confidence-color.ts"]
GG["confirm-state.ts"]
GH["currency-format.ts"]
GI["currency-symbol-presets.ts"]
GJ["daisy-classes.ts"]
GK["date-buckets.ts"]
GL["date-format.pipe.ts"]
GM["date-format.ts"]
GN["debounced-text.ts"]
GO["download-json.ts"]
GP["fingerprint.ts"]
GQ["format-settings.testing.ts"]
GR["format-settings.ts"]
GS["hidden-amount.ts"]
GT["iban.ts"]
GU["index.ts"]
GV["link-control-to-setting.ts"]
GW["locale-presets.ts"]
GX["money-color.ts"]
GY["number-format.ts"]
GZ["pagination.ts"]
H0["percentage.ts"]
H1["quick-ranges.ts"]
H2["range-expression.ts"]
H3["search-params.ts"]
H4["selection-model.ts"]
H5["signed-amount.pipe.ts"]
H6["sortable.ts"]
H7["structural-filters.ts"]
H8["theme-hooks.ts"]
H9["unrendered-markup.testing.ts"]
subgraph HA["validators"]
HB["iban.validator.ts"]
HC["percentage.validator.ts"]
end
HD["with-archivable.ts"]
HE["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->41
5-->4
5-->6
6-->Q
6-->GU
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
G-->1R
G-->3G
G-->3R
G-->GP
G-->GR
H-->G
H-->3S
H-->GU
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->33
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
Q-->Y
R-->G
S-->G
T-->G
U-->G
V-->G
W-->G
X-->G
Y-->G
10-->Q
10-->GU
11-->15
11-->Q
12-->14
12-->15
13-->12
13-->15
14-->Q
15-->14
15-->Q
17-->14
17-->Q
17-->41
17-->GU
18-->10
18-->11
18-->12
18-->14
18-->15
18-->16
18-->17
1B-->28
1B-->EW
1B-->GB
1D-->1B
1G-->1F
1I-->GU
1J-->1I
1J-->1K
1J-->1L
1K-->1I
1K-->Q
1K-->GU
1L-->1I
1L-->1K
1L-->Q
1N-->1O
1N-->1P
1N-->1R
1O-->1R
1P-->1R
1Q-->1O
1Q-->1P
1Q-->1R
1Q-->1S
1Q-->1T
1S-->B
1S-->Q
1V-->1Y
1W-->1V
1W-->1X
1W-->1Y
1X-->1Y
20-->22
20-->2B
20-->2D
20-->5
20-->Q
20-->33
20-->41
20-->GU
21-->Q
21-->3S
21-->GU
22-->2B
22-->Q
22-->GU
23-->24
23-->33
23-->EL
23-->GU
24-->33
24-->EL
24-->GU
25-->Q
25-->33
26-->Q
26-->GU
27-->2B
27-->2D
27-->B
27-->Q
27-->18
28-->20
28-->21
28-->22
28-->23
28-->24
28-->25
28-->26
28-->27
28-->29
28-->2A
28-->2B
28-->2C
28-->2D
29-->20
29-->21
29-->2A
29-->2B
29-->Q
29-->33
29-->GU
2A-->21
2A-->GU
2B-->Q
2B-->3X
2B-->41
2C-->Q
2D-->2B
2D-->2C
2D-->Q
2D-->41
2F-->Q
2F-->GU
2G-->2F
2G-->Q
2G-->GU
2H-->2J
2H-->2Y
2H-->GU
2I-->2P
2I-->Q
2J-->2I
2J-->Q
2J-->GU
2K-->2I
2K-->2P
2K-->Q
2K-->GU
2L-->2P
2L-->Q
2M-->Q
2N-->2I
2N-->3B
2N-->Q
2O-->GU
2P-->2M
2P-->2Q
2P-->Q
2P-->41
2Q-->5
2Q-->Q
2R-->Q
2S-->2J
2S-->2Y
2S-->Q
2S-->GU
2T-->Q
2U-->Q
2U-->GU
2V-->GU
2W-->2X
2X-->2Y
2X-->Q
2Y-->2J
2Y-->Q
2Y-->GU
2Z-->30
2Z-->32
2Z-->3J
2Z-->Q
30-->2J
30-->2Y
30-->GU
31-->2Y
31-->3L
31-->GU
32-->2J
32-->2S
32-->2Y
32-->GU
33-->2F
33-->2G
33-->2H
33-->2I
33-->2J
33-->2K
33-->2L
33-->2M
33-->2N
33-->2O
33-->2P
33-->2Q
33-->2R
33-->2S
33-->2T
33-->2U
33-->2V
33-->2W
33-->2X
33-->2Y
33-->2Z
33-->30
33-->31
33-->32
33-->34
33-->35
33-->36
33-->37
33-->38
33-->39
33-->3A
33-->3B
33-->3C
33-->3D
33-->3E
33-->3F
33-->3G
33-->3H
33-->3I
33-->3J
33-->3K
33-->3L
33-->3M
34-->2Q
34-->Q
35-->2Q
35-->5
35-->Q
36-->Q
36-->GU
37-->3M
39-->GU
3A-->2P
3A-->Q
3B-->GU
3C-->GU
3D-->2P
3D-->B
3D-->Q
3D-->GU
3E-->3D
3E-->GU
3F-->Q
3F-->GU
3G-->3A
3G-->Q
3G-->GU
3H-->2I
3H-->2L
3H-->Q
3I-->Q
3I-->41
3J-->2X
3K-->2P
3K-->Q
3K-->GU
3L-->3A
3L-->Q
3M-->2J
3M-->Q
3M-->GU
3O-->3P
3R-->3T
3S-->3R
3S-->3T
3S-->3U
3U-->3T
3W-->Q
3X-->3W
3X-->3Y
3X-->3Z
3Y-->Q
3Z-->Q
3Z-->41
41-->42
41-->43
41-->45
41-->44
42-->Q
43-->45
43-->Q
44-->43
44-->45
44-->Q
45-->6
45-->Q
45-->GU
47-->4V
47-->Q
48-->Q
49-->Q
4A-->Q
4B-->4Q
4B-->4S
4B-->EL
4C-->33
4C-->GU
4D-->Q
4D-->28
4D-->33
4D-->GU
4G-->FH
4G-->GU
4I-->4C
4I-->4D
4I-->Q
4I-->33
4I-->EL
4I-->FH
4I-->GU
4K-->4C
4K-->4D
4K-->Q
4K-->28
4K-->33
4K-->EL
4K-->FH
4M-->47
4M-->48
4M-->4G
4M-->FH
4O-->48
4O-->4A
4O-->Q
4O-->FH
4O-->GU
4O-->HB
4O-->HC
4Q-->4V
4Q-->4G
4Q-->4I
4Q-->4O
4Q-->28
4Q-->FH
4Q-->GU
4S-->47
4S-->48
4S-->49
4S-->4V
4S-->4K
4S-->4M
4S-->4O
4S-->Q
4S-->28
4S-->FH
4S-->GU
4T-->4G
4T-->4I
4T-->4K
4T-->4M
4T-->4O
4T-->4Q
4T-->4S
4U-->48
4U-->4A
4U-->4B
4U-->4T
4V-->GU
4X-->54
4X-->5H
4Z-->1Q
50-->4Z
50-->5O
50-->Q
50-->1Q
50-->28
51-->Q
51-->FH
54-->4Y
54-->51
54-->56
54-->B
54-->Q
54-->28
54-->FH
54-->GU
56-->4Y
56-->Q
56-->FH
57-->54
57-->56
57-->5B
57-->5D
57-->5F
57-->5H
59-->5J
59-->5L
59-->B
59-->Q
59-->28
59-->FH
5B-->5K
5B-->28
5B-->FH
5B-->GU
5D-->5J
5D-->59
5D-->B
5D-->Q
5D-->28
5D-->FH
5F-->5M
5F-->5O
5F-->FH
5F-->GU
5H-->5K
5H-->5N
5H-->5O
5H-->5B
5H-->5D
5H-->5F
5H-->Q
5H-->28
5H-->FH
5H-->GU
5I-->4X
5I-->4Y
5I-->4Z
5I-->50
5I-->57
5I-->5K
5I-->5N
5I-->5O
5J-->5L
5J-->Q
5K-->5N
5K-->Q
5L-->Q
5M-->Q
5N-->5L
5N-->Q
5O-->5M
5O-->B
5O-->Q
5O-->28
5O-->GU
5Q-->5V
5T-->FH
5V-->5Y
5V-->5Z
5V-->60
5V-->61
5V-->5T
5V-->FH
5W-->5V
60-->5Y
61-->5Z
62-->5Q
62-->5W
64-->Q
68-->28
68-->FH
68-->GU
6A-->28
6A-->41
6A-->FH
6A-->GU
6C-->70
6C-->28
6C-->33
6C-->EL
6C-->FH
6C-->GU
6E-->64
6E-->65
6E-->70
6E-->6G
6E-->6I
6E-->28
6E-->FH
6E-->GU
6G-->28
6G-->FH
6I-->65
6I-->FH
6K-->6W
6K-->6X
6K-->Q
6K-->FH
6M-->6W
6M-->6X
6M-->70
6M-->68
6M-->6A
6M-->6C
6M-->6E
6M-->6K
6M-->6P
6M-->6R
6M-->6T
6M-->6V
6M-->28
6M-->33
6M-->FH
6M-->GU
6N-->68
6N-->6A
6N-->6C
6N-->6E
6N-->6G
6N-->6K
6N-->6M
6N-->6P
6N-->6R
6N-->6T
6N-->6V
6P-->6G
6P-->28
6P-->33
6P-->41
6P-->EL
6P-->FH
6P-->GU
6R-->70
6R-->28
6R-->FH
6R-->GU
6T-->28
6T-->33
6T-->41
6T-->EL
6T-->FH
6T-->GU
6V-->70
6V-->28
6V-->FH
6V-->GU
6W-->6X
6W-->Q
6X-->Q
6Y-->6M
6Y-->EL
6Z-->6N
6Z-->6Y
70-->64
70-->28
70-->33
70-->41
74-->Q
74-->3O
74-->FH
74-->GU
75-->74
76-->75
7A-->7D
7A-->7F
7A-->28
7A-->FH
7B-->7A
7B-->7D
7B-->7F
7D-->28
7D-->33
7D-->EL
7D-->FH
7D-->GU
7F-->Q
7F-->28
7F-->33
7F-->41
7F-->EL
7F-->FH
7F-->GU
7G-->7A
7G-->EL
7H-->7B
7H-->7G
7L-->82
7L-->84
7L-->Q
7L-->28
7L-->33
7L-->FH
7L-->GU
7N-->83
7N-->FH
7P-->7L
7P-->7V
7P-->7Y
7P-->FH
7R-->Q
7R-->FH
7T-->86
7T-->FH
7V-->83
7V-->84
7V-->86
7V-->7N
7V-->7R
7V-->7T
7V-->Q
7V-->28
7V-->FH
7V-->GU
7W-->7L
7W-->7N
7W-->7P
7W-->7R
7W-->7T
7W-->7V
7W-->7Y
7W-->80
7Y-->81
7Y-->84
7Y-->88
7Y-->89
7Y-->80
7Y-->28
7Y-->FH
7Y-->GU
80-->89
81-->Q
82-->Q
82-->33
82-->FH
82-->GU
83-->81
83-->Q
83-->33
83-->FH
83-->GU
84-->Q
84-->28
84-->33
84-->41
85-->7P
85-->EL
86-->Q
86-->33
86-->FH
86-->GU
87-->7W
87-->81
87-->82
87-->83
87-->84
87-->85
87-->86
87-->88
87-->89
88-->33
88-->EL
88-->GU
8D-->8M
8D-->FH
8F-->8N
8F-->8H
8F-->FH
8H-->8N
8H-->FH
8J-->8N
8J-->FH
8K-->8D
8K-->8F
8K-->8H
8K-->8J
8O-->8D
8O-->8F
8O-->8J
8O-->8N
8P-->8K
8P-->8N
8P-->8O
8T-->1G
8T-->FH
8U-->8T
8V-->8T
8W-->8U
8W-->8V
8Y-->Q
91-->9X
91-->4U
91-->FH
93-->FH
95-->99
95-->FH
97-->99
97-->FH
99-->FH
9B-->8Y
9B-->99
9B-->FH
9D-->A1
9D-->FH
9F-->8Y
9F-->FH
9H-->9W
9H-->18
9H-->28
9H-->FH
9J-->8Y
9J-->9V
9J-->A1
9J-->A2
9J-->95
9J-->97
9J-->9B
9J-->9D
9J-->9F
9J-->9L
9J-->Q
9J-->18
9J-->FH
9L-->9V
9L-->18
9L-->FH
9L-->GU
9N-->9X
9N-->A2
9N-->9H
9N-->9U
9N-->Q
9N-->18
9N-->FH
9P-->9W
9P-->Q
9P-->18
9P-->28
9P-->FH
9R-->9Y
9R-->93
9R-->9J
9R-->9N
9R-->9P
9R-->28
9R-->FH
9S-->9J
9S-->9L
9S-->9N
9S-->9P
9S-->9R
9U-->9X
9U-->91
9U-->Q
9U-->FH
9V-->18
9V-->FH
9W-->Q
9W-->18
9W-->GU
9X-->Q
9Y-->8Y
9Y-->9V
9Y-->9X
9Y-->A2
9Y-->Q
9Y-->18
9Y-->28
9Y-->4U
9Z-->9R
A0-->8Y
A0-->9S
A0-->9X
A0-->9Z
A0-->A1
A0-->A2
A1-->8Y
A2-->Q
A4-->33
A7-->A4
A7-->B8
A7-->FH
A7-->GU
A9-->B4
A9-->FH
AB-->FH
AD-->B5
AD-->B6
AD-->B8
AD-->28
AD-->33
AD-->FH
AF-->B8
AF-->3S
AF-->EL
AF-->FH
AH-->B3
AH-->B8
AH-->AB
AH-->28
AH-->33
AH-->EL
AH-->FH
AH-->GU
AJ-->B6
AJ-->B8
AJ-->A7
AJ-->AL
AJ-->28
AJ-->33
AJ-->FH
AJ-->GU
AL-->FH
AN-->B4
AN-->B8
AN-->A9
AP-->B4
AP-->B8
AP-->FH
AR-->B8
AR-->BB
AR-->AD
AR-->AH
AR-->AJ
AR-->AL
AR-->AN
AR-->AP
AR-->AV
AR-->B2
AR-->28
AR-->33
AR-->EL
AR-->FH
AR-->GU
AT-->B4
AT-->B8
AT-->A7
AT-->A9
AT-->AF
AT-->AN
AT-->AP
AT-->FH
AV-->B8
AV-->28
AV-->33
AV-->41
AV-->EL
AV-->FH
AV-->GU
AW-->A7
AW-->A9
AW-->AB
AW-->AD
AW-->AH
AW-->AJ
AW-->AP
AW-->AR
AW-->AT
AW-->AV
AW-->AY
AW-->B0
AW-->B2
AY-->B0
AY-->FH
B0-->B6
B0-->B8
B0-->BA
B0-->BB
B0-->FH
B0-->GU
B2-->B8
B2-->BA
B2-->BB
B2-->B0
B2-->Q
B2-->FH
B3-->33
B3-->EL
B3-->GU
B4-->Q
B5-->B6
B5-->Q
B5-->33
B5-->FH
B5-->GU
B6-->GU
B7-->AR
B7-->AT
B7-->AY
B7-->EL
B8-->A4
B8-->B6
B8-->Q
B8-->28
B8-->33
B8-->3S
B8-->41
B9-->AW
B9-->B4
B9-->B6
B9-->B7
B9-->B8
B9-->BA
B9-->BB
BA-->Q
BB-->Q
BE-->BG
BE-->BK
BE-->BM
BE-->BO
BG-->BI
BG-->BK
BG-->BM
BG-->BO
BG-->FH
BI-->BR
BI-->5I
BI-->FH
BK-->BR
BK-->1Q
BK-->28
BK-->5I
BK-->FH
BM-->Q
BM-->1Q
BM-->28
BM-->5I
BM-->FH
BM-->GU
BO-->Q
BO-->28
BO-->5I
BO-->FH
BO-->GU
BP-->BE
BP-->BQ
BQ-->BG
BR-->5I
BR-->FH
BU-->BW
BU-->BY
BU-->C0
BU-->C2
BU-->C4
BU-->C6
BU-->C8
BU-->CA
BU-->CC
BW-->C2
BW-->Q
BW-->1J
BW-->FH
BW-->GU
BY-->Q
BY-->1J
BY-->EL
BY-->FH
C0-->CE
C0-->FH
C2-->Q
C2-->1J
C2-->EL
C2-->FH
C2-->GU
C4-->CF
C4-->CJ
C4-->BW
C4-->BY
C4-->C6
C4-->C8
C4-->CA
C4-->1J
C4-->28
C4-->FH
C6-->CG
C6-->Q
C6-->28
C6-->FH
C6-->HC
C8-->Q
C8-->28
C8-->FH
C8-->GU
CA-->CH
CA-->Q
CA-->1J
CA-->28
CA-->EL
CA-->FH
CC-->CE
CC-->CJ
CC-->C0
CC-->C6
CC-->Q
CC-->FH
CD-->BU
CD-->CE
CD-->CF
CD-->CG
CD-->CH
CD-->CI
CD-->CJ
CE-->CF
CE-->CG
CE-->Q
CE-->1J
CE-->FH
CE-->GU
CF-->1J
CF-->FH
CF-->GU
CG-->Q
CH-->1J
CH-->GU
CI-->C4
CI-->CC
CI-->EL
CJ-->Q
CJ-->1J
CJ-->28
CJ-->GU
CL-->FH
CO-->CL
CO-->D3
CO-->CQ
CO-->CS
CO-->28
CO-->33
CO-->FH
CO-->GU
CQ-->CL
CQ-->FH
CS-->CL
CS-->FH
CT-->CO
CT-->CQ
CT-->CS
CT-->CX
CT-->CZ
CV-->FH
CX-->CO
CX-->CZ
CX-->28
CX-->FH
CZ-->D2
CZ-->D3
CZ-->CV
CZ-->28
CZ-->33
CZ-->EL
CZ-->FH
CZ-->GU
D0-->CT
D0-->D4
D1-->Q
D1-->33
D2-->FH
D3-->D1
D3-->Q
D3-->28
D3-->33
D3-->41
D4-->CX
D7-->DF
D9-->1G
D9-->FH
DB-->28
DB-->FH
DB-->GU
DD-->76
DD-->FH
DF-->D9
DF-->DB
DF-->DD
DF-->DH
DF-->DJ
DF-->DL
DF-->FH
DH-->28
DH-->FH
DH-->GU
DJ-->28
DJ-->FH
DJ-->GU
DL-->28
DL-->3S
DL-->FH
DM-->D7
DM-->DN
DN-->DF
DP-->Q
DS-->Q
DS-->28
DS-->3X
DS-->FH
DS-->GU
DU-->DP
DV-->DX
DV-->E1
DV-->E3
DV-->E7
DV-->E9
DX-->DP
DX-->B
DX-->28
DX-->FH
DZ-->DP
DZ-->EC
DZ-->DU
DZ-->FH
DZ-->GU
E1-->DP
E1-->DS
E1-->B
E1-->Q
E1-->28
E1-->3X
E1-->5I
E1-->FH
E1-->GU
E3-->DP
E3-->EB
E3-->B
E3-->28
E3-->FH
E3-->GU
E5-->DP
E5-->EC
E5-->DU
E5-->FH
E5-->GU
E7-->DP
E7-->EB
E7-->EC
E7-->EE
E7-->DX
E7-->DZ
E7-->E1
E7-->E3
E7-->E5
E7-->E9
E7-->B
E7-->Q
E7-->28
E7-->41
E7-->5I
E7-->FH
E7-->GU
E9-->28
E9-->41
E9-->FH
E9-->GU
EA-->ED
EB-->Q
EB-->41
EC-->Q
EC-->GU
ED-->E7
EE-->Q
EL-->EH
EL-->EI
EL-->EK
EL-->EM
EL-->EN
EN-->GU
EQ-->EW
EQ-->FA
EQ-->FC
EQ-->FJ
EQ-->GB
EQ-->Q
EQ-->GU
ES-->GU
EU-->GU
EW-->GU
EY-->GU
F0-->EW
F0-->FL
F0-->FP
F0-->GB
F2-->GU
F4-->EW
F4-->F8
F4-->GU
F6-->GU
F8-->GU
FA-->FE
FA-->GB
FC-->GU
FE-->GU
FH-->EQ
FH-->ES
FH-->EU
FH-->EW
FH-->EY
FH-->F0
FH-->F2
FH-->F4
FH-->F6
FH-->F8
FH-->FA
FH-->FC
FH-->FE
FH-->FG
FH-->FJ
FH-->FL
FH-->FN
FH-->FP
FH-->FR
FH-->FT
FH-->FV
FH-->FX
FH-->FZ
FH-->G1
FH-->G3
FH-->G5
FH-->G7
FH-->G9
FH-->GB
FJ-->GU
FL-->GU
FN-->FE
FP-->GU
FR-->FE
FR-->GB
FT-->EW
FT-->FE
FT-->GB
FT-->GU
FV-->GU
FX-->GU
FZ-->EW
FZ-->28
G1-->EQ
G1-->EW
G1-->FE
G1-->FV
G1-->GB
G1-->Q
G1-->GU
G3-->GU
G5-->FX
G5-->GB
G5-->GU
G7-->GU
G9-->GU
GB-->GU
GD-->GM
GH-->GR
GK-->GR
GL-->GM
GM-->GR
GQ-->GR
GU-->GD
GU-->GE
GU-->GF
GU-->GG
GU-->GH
GU-->GI
GU-->GJ
GU-->GK
GU-->GM
GU-->GL
GU-->GN
GU-->GO
GU-->GP
GU-->GR
GU-->GS
GU-->GT
GU-->GV
GU-->GW
GU-->GX
GU-->GY
GU-->GZ
GU-->H0
GU-->H1
GU-->H2
GU-->H3
GU-->H4
GU-->H5
GU-->H6
GU-->H7
GU-->H8
GU-->HD
GU-->HE
GY-->GR
H1-->GK
H1-->H2
H2-->GK
H5-->GH
```
