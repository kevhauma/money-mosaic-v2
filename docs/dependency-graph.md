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
- 427 leaf nodes, 1326 edges.
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
1C["index.ts"]
end
subgraph 1D["links"]
1E["external-links.ts"]
1F["index.ts"]
end
subgraph 1G["loans"]
1H["amortization.ts"]
1I["index.ts"]
1J["loan-progress.ts"]
1K["what-if.ts"]
end
subgraph 1L["ml"]
1M["category-model.worker.ts"]
1N["category-model.worker.types.ts"]
1O["feature-hashing.ts"]
1P["index.ts"]
1Q["model-config.ts"]
1R["rule-proposal-mining.ts"]
1S["training-window.ts"]
end
subgraph 1T["onboarding"]
1U["home-redirect.guard.ts"]
1V["index.ts"]
1W["mark-visited.guard.ts"]
1X["visited.service.ts"]
end
subgraph 1Y["state"]
1Z["accounts.store.ts"]
20["app-settings.store.ts"]
21["categories.store.ts"]
22["chart-options-control.ts"]
23["chart-options.store.ts"]
24["forecast-settings.store.ts"]
25["goals.store.ts"]
26["import-batches.store.ts"]
27["index.ts"]
28["page-range-control.ts"]
29["range-state.store.ts"]
2A["transactions.store.ts"]
2B["transfer-settings.store.ts"]
2C["transfers.store.ts"]
end
subgraph 2D["stats"]
2E["account-balance-history.ts"]
2F["account-balance-trend.ts"]
2G["annual-lump-sum-smoothing.ts"]
2H["category-breakdown.ts"]
2I["category-composition-trend.ts"]
2J["category-cycle-heatmap.ts"]
2K["category-expense-transactions.ts"]
2L["category-kind-contribution.ts"]
2M["category-period-comparison.ts"]
2N["chart-zoom-window.ts"]
2O["classify-for-stats.ts"]
2P["classify-joint-leg.ts"]
2Q["day-transactions.ts"]
2R["embedded-bonus-smoothing.ts"]
2S["full-history-range.ts"]
2T["goal-affordability.ts"]
2U["granularity-for-span.ts"]
2V["gross-net-growth.ts"]
2W["gross-net-ratio.ts"]
2X["income-category-series.ts"]
2Y["income-events.ts"]
2Z["income-gap-detection.ts"]
30["income-growth.ts"]
31["income-step-change-detection.ts"]
32["index.ts"]
33["joint-account-stake.ts"]
34["joint-contributor-breakdown.ts"]
35["money-flow-graph.ts"]
36["multi-year-income-comparison.ts"]
37["net-margin.ts"]
38["net-worth-projection.ts"]
39["period-stats.ts"]
3A["period-window.ts"]
3B["periodized-rate.ts"]
3C["recurring-payments.ts"]
3D["recurring-projection.ts"]
3E["required-saving-rate.ts"]
3F["saving-velocity.ts"]
3G["spending-mosaic.ts"]
3H["top-transactions.ts"]
3I["wage-change-detection.ts"]
3J["weekday-weekend-split.ts"]
3K["year-over-year.ts"]
3L["yearly-income-summary.ts"]
end
subgraph 3M["storage"]
3N["index.ts"]
3O["storage-status.service.ts"]
end
subgraph 3P["theme"]
3Q["accent-colors.ts"]
3R["index.ts"]
3S["theme-styles.ts"]
3T["theme.service.ts"]
end
subgraph 3U["transactions"]
3V["attribution-override.ts"]
3W["index.ts"]
3X["nullify-transaction.ts"]
3Y["transaction-deletion.service.ts"]
end
subgraph 3Z["transfers"]
40["index.ts"]
41["transfer-cleanup.service.ts"]
42["transfer-linking.service.ts"]
43["transfer-matching.service.ts"]
44["transfer-matching.ts"]
end
end
subgraph 45["feature-accounts"]
46["account-card-vm.ts"]
47["account-icons.ts"]
48["account-list-order.ts"]
49["account-types.ts"]
4A["accounts.routes.ts"]
4B["balance-day-tooltip.ts"]
4C["balance-trend-signals.ts"]
subgraph 4D["components"]
subgraph 4E["account-balance-block"]
4F["account-balance-block.component.ts"]
end
subgraph 4G["account-balance-chart"]
4H["account-balance-chart.component.ts"]
end
subgraph 4I["account-balance-history-chart"]
4J["account-balance-history-chart.component.ts"]
end
subgraph 4K["account-card"]
4L["account-card.component.ts"]
end
subgraph 4M["account-form"]
4N["account-form.component.ts"]
end
subgraph 4O["accounts-detail"]
4P["accounts-detail.component.ts"]
end
subgraph 4Q["accounts-overview"]
4R["accounts-overview.component.ts"]
end
4S["index.ts"]
end
4T["index.ts"]
4U["last-import-status.ts"]
end
subgraph 4V["feature-categories"]
4W["categories.routes.ts"]
4X["category-icons.ts"]
4Y["category-model.service.ts"]
4Z["category-model.store.ts"]
50["category-row-vm.ts"]
subgraph 51["components"]
subgraph 52["categories-overview"]
53["categories-overview.component.ts"]
end
subgraph 54["category-form"]
55["category-form.component.ts"]
end
56["index.ts"]
subgraph 57["rule-condition-row"]
58["rule-condition-row.component.ts"]
end
subgraph 59["rule-filters"]
5A["rule-filters.component.ts"]
end
subgraph 5B["rule-form"]
5C["rule-form.component.ts"]
end
subgraph 5D["rule-share-bar"]
5E["rule-share-bar.component.ts"]
end
subgraph 5F["rules-overview"]
5G["rules-overview.component.ts"]
end
end
5H["index.ts"]
5I["rule-condition-editor.ts"]
5J["rule-filters.ts"]
5K["rule-labels.ts"]
5L["rule-share.ts"]
5M["rule-summary.ts"]
5N["rules.store.ts"]
end
subgraph 5O["feature-changelog"]
5P["changelog.routes.ts"]
subgraph 5Q["components"]
subgraph 5R["changelog-entry-row"]
5S["changelog-entry-row.component.ts"]
end
subgraph 5T["changelog-page"]
5U["changelog-page.component.ts"]
end
5V["index.ts"]
end
subgraph 5W["data"]
5X["changelog-entries.ts"]
5Y["roadmap-entries.ts"]
end
5Z["group-changelog-entries.ts"]
60["group-roadmap-entries.ts"]
61["index.ts"]
end
subgraph 62["feature-dashboard"]
63["category-comparison-settings.store.ts"]
64["category-comparison-vm.ts"]
subgraph 65["components"]
subgraph 66["account-balance-strip"]
67["account-balance-strip.component.ts"]
end
subgraph 68["action-queue-panel"]
69["action-queue-panel.component.ts"]
end
subgraph 6A["category-breakdown-panel"]
6B["category-breakdown-panel.component.ts"]
end
subgraph 6C["category-comparison-panel"]
6D["category-comparison-panel.component.ts"]
end
subgraph 6E["category-exclusion-dropdown"]
6F["category-exclusion-dropdown.component.ts"]
end
subgraph 6G["comparison-category-card"]
6H["comparison-category-card.component.ts"]
end
subgraph 6I["dashboard-customize-panel"]
6J["dashboard-customize-panel.component.ts"]
end
subgraph 6K["dashboard-overview"]
6L["dashboard-overview.component.ts"]
end
6M["index.ts"]
subgraph 6N["spending-heatmap-panel"]
6O["spending-heatmap-panel.component.ts"]
end
subgraph 6P["top-transactions-panel"]
6Q["top-transactions-panel.component.ts"]
end
subgraph 6R["trend-chart-panel"]
6S["trend-chart-panel.component.ts"]
end
subgraph 6T["weekday-weekend-split-panel"]
6U["weekday-weekend-split-panel.component.ts"]
end
end
6V["dashboard-layout-settings.store.ts"]
6W["dashboard-row-order.ts"]
6X["dashboard.routes.ts"]
6Y["index.ts"]
6Z["stats.store.ts"]
end
subgraph 70["feature-data-management"]
subgraph 71["components"]
subgraph 72["data-management-overview"]
73["data-management-overview.component.ts"]
end
74["index.ts"]
end
75["index.ts"]
end
subgraph 76["feature-explore"]
subgraph 77["components"]
subgraph 78["explore-overview"]
79["explore-overview.component.ts"]
end
7A["index.ts"]
subgraph 7B["money-flow-panel"]
7C["money-flow-panel.component.ts"]
end
subgraph 7D["spending-mosaic-panel"]
7E["spending-mosaic-panel.component.ts"]
end
end
7F["explore.routes.ts"]
7G["index.ts"]
end
subgraph 7H["feature-future"]
subgraph 7I["components"]
subgraph 7J["forecast-controls"]
7K["forecast-controls.component.ts"]
end
subgraph 7L["forecast-notice"]
7M["forecast-notice.component.ts"]
end
subgraph 7N["future-overview"]
7O["future-overview.component.ts"]
end
subgraph 7P["goal-form"]
7Q["goal-form.component.ts"]
end
subgraph 7R["goal-row"]
7S["goal-row.component.ts"]
end
subgraph 7T["goals-panel"]
7U["goals-panel.component.ts"]
end
7V["index.ts"]
subgraph 7W["net-worth-projection-chart"]
7X["net-worth-projection-chart.component.ts"]
end
subgraph 7Y["projection-figure-table"]
7Z["projection-figure-table.component.ts"]
end
end
80["forecast-chart-copy.ts"]
81["forecast-controls-vm.ts"]
82["forecast-notices.ts"]
83["forecast.store.ts"]
84["future.routes.ts"]
85["goal-row-vm.ts"]
86["index.ts"]
87["net-worth-projection-chart-option.ts"]
88["projection-accessible-row.ts"]
end
subgraph 89["feature-help"]
subgraph 8A["components"]
subgraph 8B["faq-page"]
8C["faq-page.component.ts"]
end
subgraph 8D["guide-detail"]
8E["guide-detail.component.ts"]
end
subgraph 8F["guide-steps"]
8G["guide-steps.component.ts"]
end
subgraph 8H["guides-index"]
8I["guides-index.component.ts"]
end
8J["index.ts"]
end
subgraph 8K["data"]
8L["faq.ts"]
8M["guides.ts"]
end
8N["help.routes.ts"]
8O["index.ts"]
end
subgraph 8P["feature-home"]
subgraph 8Q["components"]
subgraph 8R["home-landing"]
8S["home-landing.component.ts"]
end
8T["index.ts"]
end
8U["home.routes.ts"]
8V["index.ts"]
end
subgraph 8W["feature-import"]
8X["column-mapping.ts"]
subgraph 8Y["components"]
subgraph 8Z["account-draft-editor"]
90["account-draft-editor.component.ts"]
end
subgraph 91["batch-wait-card"]
92["batch-wait-card.component.ts"]
end
subgraph 93["column-map-amount-field"]
94["column-map-amount-field.component.ts"]
end
subgraph 95["column-map-counterparty-field"]
96["column-map-counterparty-field.component.ts"]
end
subgraph 97["column-map-sample-caption"]
98["column-map-sample-caption.component.ts"]
end
subgraph 99["column-map-simple-field"]
9A["column-map-simple-field.component.ts"]
end
subgraph 9B["column-map-stepper"]
9C["column-map-stepper.component.ts"]
end
subgraph 9D["column-map-summary-step"]
9E["column-map-summary-step.component.ts"]
end
subgraph 9F["import-history"]
9G["import-history.component.ts"]
end
subgraph 9H["import-map-step"]
9I["import-map-step.component.ts"]
end
subgraph 9J["import-preview-step"]
9K["import-preview-step.component.ts"]
end
subgraph 9L["import-select-step"]
9M["import-select-step.component.ts"]
end
subgraph 9N["import-summary-step"]
9O["import-summary-step.component.ts"]
end
subgraph 9P["import-wizard"]
9Q["import-wizard.component.ts"]
end
9R["index.ts"]
subgraph 9S["queued-file-row"]
9T["queued-file-row.component.ts"]
end
end
9U["duplicate-scan.ts"]
9V["import-history-rows.ts"]
9W["import-queue.ts"]
9X["import-wizard-session.ts"]
9Y["import.routes.ts"]
9Z["index.ts"]
A0["mapper-steps.ts"]
A1["mapping-profiles.store.ts"]
end
subgraph A2["feature-income"]
A3["career-start-date.ts"]
subgraph A4["components"]
subgraph A5["income-career-start"]
A6["income-career-start.component.ts"]
end
subgraph A7["income-category-checklist"]
A8["income-category-checklist.component.ts"]
end
subgraph A9["income-chart-cell"]
AA["income-chart-cell.component.ts"]
end
subgraph AB["income-events-sidebar"]
AC["income-events-sidebar.component.ts"]
end
subgraph AD["income-gross-color"]
AE["income-gross-color.component.ts"]
end
subgraph AF["income-gross-net-section"]
AG["income-gross-net-section.component.ts"]
end
subgraph AH["income-growth-panel"]
AI["income-growth-panel.component.ts"]
end
subgraph AJ["income-inference-note"]
AK["income-inference-note.component.ts"]
end
subgraph AL["income-lump-sum-checklist"]
AM["income-lump-sum-checklist.component.ts"]
end
subgraph AN["income-main-category"]
AO["income-main-category.component.ts"]
end
subgraph AP["income-overview"]
AQ["income-overview.component.ts"]
end
subgraph AR["income-settings-page"]
AS["income-settings-page.component.ts"]
end
subgraph AT["income-yearly-panel"]
AU["income-yearly-panel.component.ts"]
end
AV["index.ts"]
subgraph AW["salary-details-page"]
AX["salary-details-page.component.ts"]
end
subgraph AY["salary-metadata-table"]
AZ["salary-metadata-table.component.ts"]
end
subgraph B0["salary-month-modal"]
B1["salary-month-modal.component.ts"]
end
end
B2["gross-net-chart-options.ts"]
B3["income-category-vm.ts"]
B4["income-event-vm.ts"]
B5["income-granularity.ts"]
B6["income.routes.ts"]
B7["income.store.ts"]
B8["index.ts"]
B9["salary-metadata-edit.ts"]
BA["salary-metadata-rows.ts"]
end
subgraph BB["feature-learning"]
subgraph BC["components"]
BD["index.ts"]
subgraph BE["learning-overview"]
BF["learning-overview.component.ts"]
end
subgraph BG["model-status-badge"]
BH["model-status-badge.component.ts"]
end
subgraph BI["model-status"]
BJ["model-status.component.ts"]
end
subgraph BK["rule-proposals"]
BL["rule-proposals.component.ts"]
end
subgraph BM["suggestions-table"]
BN["suggestions-table.component.ts"]
end
end
BO["index.ts"]
BP["learning.routes.ts"]
BQ["model-status-display.ts"]
end
subgraph BR["feature-loans"]
subgraph BS["components"]
BT["index.ts"]
subgraph BU["loan-amortization-table"]
BV["loan-amortization-table.component.ts"]
end
subgraph BW["loan-balance-chart"]
BX["loan-balance-chart.component.ts"]
end
subgraph BY["loan-card"]
BZ["loan-card.component.ts"]
end
subgraph C0["loan-composition-chart"]
C1["loan-composition-chart.component.ts"]
end
subgraph C2["loan-detail"]
C3["loan-detail.component.ts"]
end
subgraph C4["loan-form"]
C5["loan-form.component.ts"]
end
subgraph C6["loan-payments-list"]
C7["loan-payments-list.component.ts"]
end
subgraph C8["loan-what-if"]
C9["loan-what-if.component.ts"]
end
subgraph CA["loans-overview"]
CB["loans-overview.component.ts"]
end
end
CC["index.ts"]
CD["loan-card-vm.ts"]
CE["loan-schedule-status.ts"]
CF["loan-types.ts"]
CG["loan-what-if-vm.ts"]
CH["loans.routes.ts"]
CI["loans.store.ts"]
end
subgraph CJ["feature-recurring"]
CK["bills-calendar-vm.ts"]
subgraph CL["components"]
subgraph CM["bills-calendar"]
CN["bills-calendar.component.ts"]
end
subgraph CO["bills-day-list"]
CP["bills-day-list.component.ts"]
end
subgraph CQ["bills-month-grid"]
CR["bills-month-grid.component.ts"]
end
CS["index.ts"]
subgraph CT["recurring-dismissed-list"]
CU["recurring-dismissed-list.component.ts"]
end
subgraph CV["recurring-overview"]
CW["recurring-overview.component.ts"]
end
subgraph CX["recurring-payments-panel"]
CY["recurring-payments-panel.component.ts"]
end
end
CZ["index.ts"]
D0["recurring-overrides.ts"]
D1["recurring-payments-row-vm.ts"]
D2["recurring-series.store.ts"]
D3["recurring.routes.ts"]
end
subgraph D4["feature-settings"]
subgraph D5["components"]
D6["index.ts"]
subgraph D7["settings-about-section"]
D8["settings-about-section.component.ts"]
end
subgraph D9["settings-currency-locale-section"]
DA["settings-currency-locale-section.component.ts"]
end
subgraph DB["settings-data-section"]
DC["settings-data-section.component.ts"]
end
subgraph DD["settings-overview"]
DE["settings-overview.component.ts"]
end
subgraph DF["settings-privacy-section"]
DG["settings-privacy-section.component.ts"]
end
subgraph DH["settings-reporting-section"]
DI["settings-reporting-section.component.ts"]
end
subgraph DJ["settings-theme-section"]
DK["settings-theme-section.component.ts"]
end
end
DL["index.ts"]
DM["settings.routes.ts"]
end
subgraph DN["feature-transactions"]
DO["category-picker.ts"]
subgraph DP["components"]
subgraph DQ["attribution-override-fieldset"]
DR["attribution-override-fieldset.component.ts"]
end
subgraph DS["category-select-cell"]
DT["category-select-cell.component.ts"]
end
DU["index.ts"]
subgraph DV["transaction-bulk-bar"]
DW["transaction-bulk-bar.component.ts"]
end
subgraph DX["transaction-card"]
DY["transaction-card.component.ts"]
end
subgraph DZ["transaction-edit-form"]
E0["transaction-edit-form.component.ts"]
end
subgraph E1["transaction-filters"]
E2["transaction-filters.component.ts"]
end
subgraph E3["transaction-row"]
E4["transaction-row.component.ts"]
end
subgraph E5["transactions-overview"]
E6["transactions-overview.component.ts"]
end
subgraph E7["transfer-review"]
E8["transfer-review.component.ts"]
end
end
E9["index.ts"]
EA["transaction-filters.ts"]
EB["transaction-row-vm.ts"]
EC["transactions.routes.ts"]
ED["transfer-label.ts"]
end
subgraph EE["shared"]
subgraph EF["echarts"]
EG["bucketed-axis-option.ts"]
EH["chart-theme.ts"]
EI["echarts-jsdom.testing.ts"]
EJ["echarts-setup.ts"]
EK["index.ts"]
EL["legend-option.ts"]
EM["tooltip-formatter.ts"]
end
subgraph EN["ui"]
subgraph EO["absolute-range-panel"]
EP["absolute-range-panel.component.ts"]
end
subgraph EQ["alert"]
ER["alert.component.ts"]
end
subgraph ES["badge"]
ET["badge.component.ts"]
end
subgraph EU["button"]
EV["button.component.ts"]
end
subgraph EW["collapse"]
EX["collapse.component.ts"]
end
subgraph EY["confirm-dialog"]
EZ["confirm-dialog.component.ts"]
end
subgraph F0["cycle-picker"]
F1["cycle-picker.component.ts"]
end
subgraph F2["date-range-input"]
F3["date-range-input.component.ts"]
end
subgraph F4["divider"]
F5["divider.component.ts"]
end
subgraph F6["dropdown"]
F7["dropdown.component.ts"]
end
subgraph F8["empty-state"]
F9["empty-state.component.ts"]
end
subgraph FA["fieldset"]
FB["fieldset.component.ts"]
end
subgraph FC["flex"]
FD["flex.component.ts"]
end
subgraph FE["granularity-picker"]
FF["granularity-picker.component.ts"]
end
FG["index.ts"]
subgraph FH["input"]
FI["input.component.ts"]
end
subgraph FJ["label"]
FK["label.component.ts"]
end
subgraph FL["loading-skeleton"]
FM["loading-skeleton.component.ts"]
end
subgraph FN["modal"]
FO["mm-modal.component.ts"]
end
subgraph FP["page-header"]
FQ["page-header.component.ts"]
end
subgraph FR["paginator"]
FS["paginator.component.ts"]
end
subgraph FT["paper"]
FU["paper.component.ts"]
end
subgraph FV["privacy-blur"]
FW["privacy-blur.component.ts"]
end
subgraph FX["privacy-toggle"]
FY["privacy-toggle.component.ts"]
end
subgraph FZ["range-picker"]
G0["range-picker.component.ts"]
end
subgraph G1["select"]
G2["select.component.ts"]
end
subgraph G3["stat-card"]
G4["stat-card.component.ts"]
end
subgraph G5["table"]
G6["table.component.ts"]
end
subgraph G7["tabs"]
G8["tabs.component.ts"]
end
subgraph G9["typography"]
GA["typography.component.ts"]
end
end
subgraph GB["utils"]
GC["calendar-cycles.ts"]
GD["compact-viewport.ts"]
GE["confidence-color.ts"]
GF["confirm-state.ts"]
GG["currency-format.ts"]
GH["currency-symbol-presets.ts"]
GI["daisy-classes.ts"]
GJ["date-buckets.ts"]
GK["date-format.pipe.ts"]
GL["date-format.ts"]
GM["debounced-text.ts"]
GN["download-json.ts"]
GO["fingerprint.ts"]
GP["format-settings.testing.ts"]
GQ["format-settings.ts"]
GR["hidden-amount.ts"]
GS["iban.ts"]
GT["index.ts"]
GU["link-control-to-setting.ts"]
GV["locale-presets.ts"]
GW["money-color.ts"]
GX["number-format.ts"]
GY["pagination.ts"]
GZ["percentage.ts"]
H0["quick-ranges.ts"]
H1["range-expression.ts"]
H2["search-params.ts"]
H3["selection-model.ts"]
H4["signed-amount.pipe.ts"]
H5["sortable.ts"]
H6["structural-filters.ts"]
H7["theme-hooks.ts"]
H8["unrendered-markup.testing.ts"]
subgraph H9["validators"]
HA["iban.validator.ts"]
HB["percentage.validator.ts"]
end
HC["with-archivable.ts"]
HD["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->40
5-->4
5-->6
6-->Q
6-->GT
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
G-->1Q
G-->3F
G-->3Q
G-->GO
G-->GQ
H-->G
H-->3R
H-->GT
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->32
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
10-->GT
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
17-->40
17-->GT
18-->10
18-->11
18-->12
18-->14
18-->15
18-->16
18-->17
1B-->27
1B-->EV
1B-->GA
1C-->1B
1F-->1E
1H-->GT
1I-->1H
1I-->1J
1I-->1K
1J-->1H
1J-->Q
1J-->GT
1K-->1H
1K-->1J
1K-->Q
1M-->1N
1M-->1O
1M-->1Q
1N-->1Q
1O-->1Q
1P-->1N
1P-->1O
1P-->1Q
1P-->1R
1P-->1S
1R-->B
1R-->Q
1U-->1X
1V-->1U
1V-->1W
1V-->1X
1W-->1X
1Z-->21
1Z-->2A
1Z-->2C
1Z-->5
1Z-->Q
1Z-->32
1Z-->40
1Z-->GT
20-->Q
20-->3R
20-->GT
21-->2A
21-->Q
21-->GT
22-->23
22-->32
22-->EK
22-->GT
23-->32
23-->EK
23-->GT
24-->Q
24-->32
25-->Q
25-->GT
26-->2A
26-->2C
26-->B
26-->Q
26-->18
27-->1Z
27-->20
27-->21
27-->22
27-->23
27-->24
27-->25
27-->26
27-->28
27-->29
27-->2A
27-->2B
27-->2C
28-->1Z
28-->20
28-->29
28-->2A
28-->Q
28-->32
28-->GT
29-->20
29-->GT
2A-->Q
2A-->3W
2A-->40
2B-->Q
2C-->2A
2C-->2B
2C-->Q
2C-->40
2E-->Q
2E-->GT
2F-->2E
2F-->Q
2F-->GT
2G-->2I
2G-->2X
2G-->GT
2H-->2O
2H-->Q
2I-->2H
2I-->Q
2I-->GT
2J-->2H
2J-->2O
2J-->Q
2J-->GT
2K-->2O
2K-->Q
2L-->Q
2M-->2H
2M-->3A
2M-->Q
2N-->GT
2O-->2L
2O-->2P
2O-->Q
2O-->40
2P-->5
2P-->Q
2Q-->Q
2R-->2I
2R-->2X
2R-->Q
2R-->GT
2S-->Q
2T-->Q
2T-->GT
2U-->GT
2V-->2W
2W-->2X
2W-->Q
2X-->2I
2X-->Q
2X-->GT
2Y-->2Z
2Y-->31
2Y-->3I
2Y-->Q
2Z-->2I
2Z-->2X
2Z-->GT
30-->2X
30-->3K
30-->GT
31-->2I
31-->2R
31-->2X
31-->GT
32-->2E
32-->2F
32-->2G
32-->2H
32-->2I
32-->2J
32-->2K
32-->2L
32-->2M
32-->2N
32-->2O
32-->2P
32-->2Q
32-->2R
32-->2S
32-->2T
32-->2U
32-->2V
32-->2W
32-->2X
32-->2Y
32-->2Z
32-->30
32-->31
32-->33
32-->34
32-->35
32-->36
32-->37
32-->38
32-->39
32-->3A
32-->3B
32-->3C
32-->3D
32-->3E
32-->3F
32-->3G
32-->3H
32-->3I
32-->3J
32-->3K
32-->3L
33-->2P
33-->Q
34-->2P
34-->5
34-->Q
35-->Q
35-->GT
36-->3L
38-->GT
39-->2O
39-->Q
3A-->GT
3B-->GT
3C-->2O
3C-->B
3C-->Q
3C-->GT
3D-->3C
3D-->GT
3E-->Q
3E-->GT
3F-->39
3F-->Q
3F-->GT
3G-->2H
3G-->2K
3G-->Q
3H-->Q
3H-->40
3I-->2W
3J-->2O
3J-->Q
3J-->GT
3K-->39
3K-->Q
3L-->2I
3L-->Q
3L-->GT
3N-->3O
3Q-->3S
3R-->3Q
3R-->3S
3R-->3T
3T-->3S
3V-->Q
3W-->3V
3W-->3X
3W-->3Y
3X-->Q
3Y-->Q
3Y-->40
40-->41
40-->42
40-->44
40-->43
41-->Q
42-->44
42-->Q
43-->42
43-->44
43-->Q
44-->6
44-->Q
44-->GT
46-->4U
46-->Q
47-->Q
48-->Q
49-->Q
4A-->4P
4A-->4R
4A-->EK
4B-->32
4B-->GT
4C-->Q
4C-->27
4C-->32
4C-->GT
4F-->FG
4F-->GT
4H-->4B
4H-->4C
4H-->Q
4H-->32
4H-->EK
4H-->FG
4H-->GT
4J-->4B
4J-->4C
4J-->Q
4J-->27
4J-->32
4J-->EK
4J-->FG
4L-->46
4L-->47
4L-->4F
4L-->FG
4N-->47
4N-->49
4N-->Q
4N-->FG
4N-->GT
4N-->HA
4N-->HB
4P-->4U
4P-->4F
4P-->4H
4P-->4N
4P-->27
4P-->FG
4P-->GT
4R-->46
4R-->47
4R-->48
4R-->4U
4R-->4J
4R-->4L
4R-->4N
4R-->Q
4R-->27
4R-->FG
4R-->GT
4S-->4F
4S-->4H
4S-->4J
4S-->4L
4S-->4N
4S-->4P
4S-->4R
4T-->47
4T-->49
4T-->4A
4T-->4S
4U-->GT
4W-->53
4W-->5G
4Y-->1P
4Z-->4Y
4Z-->5N
4Z-->Q
4Z-->1P
4Z-->27
50-->Q
50-->FG
53-->4X
53-->50
53-->55
53-->B
53-->Q
53-->27
53-->FG
53-->GT
55-->4X
55-->Q
55-->FG
56-->53
56-->55
56-->5A
56-->5C
56-->5E
56-->5G
58-->5I
58-->5K
58-->B
58-->Q
58-->27
58-->FG
5A-->5J
5A-->27
5A-->FG
5A-->GT
5C-->5I
5C-->58
5C-->B
5C-->Q
5C-->27
5C-->FG
5E-->5L
5E-->5N
5E-->FG
5E-->GT
5G-->5J
5G-->5M
5G-->5N
5G-->5A
5G-->5C
5G-->5E
5G-->Q
5G-->27
5G-->FG
5G-->GT
5H-->4W
5H-->4X
5H-->4Y
5H-->4Z
5H-->56
5H-->5J
5H-->5M
5H-->5N
5I-->5K
5I-->Q
5J-->5M
5J-->Q
5K-->Q
5L-->Q
5M-->5K
5M-->Q
5N-->5L
5N-->B
5N-->Q
5N-->27
5N-->GT
5P-->5U
5S-->FG
5U-->5X
5U-->5Y
5U-->5Z
5U-->60
5U-->5S
5U-->FG
5V-->5U
5Z-->5X
60-->5Y
61-->5P
61-->5V
63-->Q
67-->27
67-->FG
67-->GT
69-->27
69-->40
69-->FG
69-->GT
6B-->6Z
6B-->27
6B-->32
6B-->EK
6B-->FG
6B-->GT
6D-->63
6D-->64
6D-->6Z
6D-->6F
6D-->6H
6D-->27
6D-->FG
6D-->GT
6F-->27
6F-->FG
6H-->64
6H-->FG
6J-->6V
6J-->6W
6J-->Q
6J-->FG
6L-->6V
6L-->6W
6L-->6Z
6L-->67
6L-->69
6L-->6B
6L-->6D
6L-->6J
6L-->6O
6L-->6Q
6L-->6S
6L-->6U
6L-->27
6L-->32
6L-->FG
6L-->GT
6M-->67
6M-->69
6M-->6B
6M-->6D
6M-->6F
6M-->6J
6M-->6L
6M-->6O
6M-->6Q
6M-->6S
6M-->6U
6O-->6F
6O-->27
6O-->32
6O-->40
6O-->EK
6O-->FG
6O-->GT
6Q-->6Z
6Q-->27
6Q-->FG
6Q-->GT
6S-->27
6S-->32
6S-->40
6S-->EK
6S-->FG
6S-->GT
6U-->6Z
6U-->27
6U-->FG
6U-->GT
6V-->6W
6V-->Q
6W-->Q
6X-->6L
6X-->EK
6Y-->6M
6Y-->6X
6Z-->63
6Z-->27
6Z-->32
6Z-->40
73-->Q
73-->3N
73-->FG
73-->GT
74-->73
75-->74
79-->7C
79-->7E
79-->27
79-->FG
7A-->79
7A-->7C
7A-->7E
7C-->27
7C-->32
7C-->EK
7C-->FG
7C-->GT
7E-->Q
7E-->27
7E-->32
7E-->40
7E-->EK
7E-->FG
7E-->GT
7F-->79
7F-->EK
7G-->7A
7G-->7F
7K-->81
7K-->83
7K-->Q
7K-->27
7K-->32
7K-->FG
7K-->GT
7M-->82
7M-->FG
7O-->7K
7O-->7U
7O-->7X
7O-->FG
7Q-->Q
7Q-->FG
7S-->85
7S-->FG
7U-->82
7U-->83
7U-->85
7U-->7M
7U-->7Q
7U-->7S
7U-->Q
7U-->27
7U-->FG
7U-->GT
7V-->7K
7V-->7M
7V-->7O
7V-->7Q
7V-->7S
7V-->7U
7V-->7X
7V-->7Z
7X-->80
7X-->83
7X-->87
7X-->88
7X-->7Z
7X-->27
7X-->FG
7X-->GT
7Z-->88
80-->Q
81-->Q
81-->32
81-->FG
81-->GT
82-->80
82-->Q
82-->32
82-->FG
82-->GT
83-->Q
83-->27
83-->32
83-->40
84-->7O
84-->EK
85-->Q
85-->32
85-->FG
85-->GT
86-->7V
86-->80
86-->81
86-->82
86-->83
86-->84
86-->85
86-->87
86-->88
87-->32
87-->EK
87-->GT
8C-->8L
8C-->FG
8E-->8M
8E-->8G
8E-->FG
8G-->8M
8G-->FG
8I-->8M
8I-->FG
8J-->8C
8J-->8E
8J-->8G
8J-->8I
8N-->8C
8N-->8E
8N-->8I
8O-->8J
8O-->8M
8O-->8N
8S-->1F
8S-->FG
8T-->8S
8U-->8S
8V-->8T
8V-->8U
8X-->Q
90-->9W
90-->4T
90-->FG
92-->FG
94-->98
94-->FG
96-->98
96-->FG
98-->FG
9A-->8X
9A-->98
9A-->FG
9C-->A0
9C-->FG
9E-->8X
9E-->FG
9G-->9V
9G-->18
9G-->27
9G-->FG
9I-->8X
9I-->9U
9I-->A0
9I-->A1
9I-->94
9I-->96
9I-->9A
9I-->9C
9I-->9E
9I-->9K
9I-->Q
9I-->18
9I-->FG
9K-->9U
9K-->18
9K-->FG
9K-->GT
9M-->9W
9M-->A1
9M-->9G
9M-->9T
9M-->Q
9M-->18
9M-->FG
9O-->9V
9O-->Q
9O-->18
9O-->27
9O-->FG
9Q-->9X
9Q-->92
9Q-->9I
9Q-->9M
9Q-->9O
9Q-->27
9Q-->FG
9R-->9I
9R-->9K
9R-->9M
9R-->9O
9R-->9Q
9T-->9W
9T-->90
9T-->Q
9T-->FG
9U-->18
9U-->FG
9V-->Q
9V-->18
9V-->GT
9W-->Q
9X-->8X
9X-->9U
9X-->9W
9X-->A1
9X-->Q
9X-->18
9X-->27
9X-->4T
9Y-->9Q
9Z-->8X
9Z-->9R
9Z-->9W
9Z-->9Y
9Z-->A0
9Z-->A1
A0-->8X
A1-->Q
A3-->32
A6-->A3
A6-->B7
A6-->FG
A6-->GT
A8-->B3
A8-->FG
AA-->FG
AC-->B4
AC-->B5
AC-->B7
AC-->27
AC-->32
AC-->FG
AE-->B7
AE-->3R
AE-->EK
AE-->FG
AG-->B2
AG-->B7
AG-->AA
AG-->27
AG-->32
AG-->EK
AG-->FG
AG-->GT
AI-->B5
AI-->B7
AI-->A6
AI-->AK
AI-->27
AI-->32
AI-->FG
AI-->GT
AK-->FG
AM-->B3
AM-->B7
AM-->A8
AO-->B3
AO-->B7
AO-->FG
AQ-->B7
AQ-->BA
AQ-->AC
AQ-->AG
AQ-->AI
AQ-->AK
AQ-->AM
AQ-->AO
AQ-->AU
AQ-->B1
AQ-->27
AQ-->32
AQ-->EK
AQ-->FG
AQ-->GT
AS-->B3
AS-->B7
AS-->A6
AS-->A8
AS-->AE
AS-->AM
AS-->AO
AS-->FG
AU-->B7
AU-->27
AU-->32
AU-->40
AU-->EK
AU-->FG
AU-->GT
AV-->A6
AV-->A8
AV-->AA
AV-->AC
AV-->AG
AV-->AI
AV-->AO
AV-->AQ
AV-->AS
AV-->AU
AV-->AX
AV-->AZ
AV-->B1
AX-->AZ
AX-->FG
AZ-->B5
AZ-->B7
AZ-->B9
AZ-->BA
AZ-->FG
AZ-->GT
B1-->B7
B1-->B9
B1-->BA
B1-->AZ
B1-->Q
B1-->FG
B2-->32
B2-->EK
B2-->GT
B3-->Q
B4-->B5
B4-->Q
B4-->32
B4-->FG
B4-->GT
B5-->GT
B6-->AQ
B6-->AS
B6-->AX
B6-->EK
B7-->A3
B7-->B5
B7-->Q
B7-->27
B7-->32
B7-->3R
B7-->40
B8-->AV
B8-->B3
B8-->B5
B8-->B6
B8-->B7
B8-->B9
B8-->BA
B9-->Q
BA-->Q
BD-->BF
BD-->BJ
BD-->BL
BD-->BN
BF-->BH
BF-->BJ
BF-->BL
BF-->BN
BF-->FG
BH-->BQ
BH-->5H
BH-->FG
BJ-->BQ
BJ-->1P
BJ-->27
BJ-->5H
BJ-->FG
BL-->Q
BL-->1P
BL-->27
BL-->5H
BL-->FG
BL-->GT
BN-->Q
BN-->27
BN-->5H
BN-->FG
BN-->GT
BO-->BD
BO-->BP
BP-->BF
BQ-->5H
BQ-->FG
BT-->BV
BT-->BX
BT-->BZ
BT-->C1
BT-->C3
BT-->C5
BT-->C7
BT-->C9
BT-->CB
BV-->C1
BV-->Q
BV-->1I
BV-->FG
BV-->GT
BX-->Q
BX-->1I
BX-->EK
BX-->FG
BZ-->CD
BZ-->FG
C1-->Q
C1-->1I
C1-->EK
C1-->FG
C1-->GT
C3-->CE
C3-->CI
C3-->BV
C3-->BX
C3-->C5
C3-->C7
C3-->C9
C3-->1I
C3-->27
C3-->FG
C5-->CF
C5-->Q
C5-->27
C5-->FG
C5-->HB
C7-->Q
C7-->27
C7-->FG
C7-->GT
C9-->CG
C9-->Q
C9-->1I
C9-->27
C9-->EK
C9-->FG
CB-->CD
CB-->CI
CB-->BZ
CB-->C5
CB-->Q
CB-->FG
CC-->BT
CC-->CD
CC-->CE
CC-->CF
CC-->CG
CC-->CH
CC-->CI
CD-->CE
CD-->CF
CD-->Q
CD-->1I
CD-->FG
CD-->GT
CE-->1I
CE-->FG
CE-->GT
CF-->Q
CG-->1I
CG-->GT
CH-->C3
CH-->CB
CH-->EK
CI-->Q
CI-->1I
CI-->27
CI-->GT
CK-->FG
CN-->CK
CN-->D2
CN-->CP
CN-->CR
CN-->27
CN-->32
CN-->FG
CN-->GT
CP-->CK
CP-->FG
CR-->CK
CR-->FG
CS-->CN
CS-->CP
CS-->CR
CS-->CW
CS-->CY
CU-->FG
CW-->CN
CW-->CY
CW-->27
CW-->FG
CY-->D1
CY-->D2
CY-->CU
CY-->27
CY-->32
CY-->EK
CY-->FG
CY-->GT
CZ-->CS
CZ-->D3
D0-->Q
D0-->32
D1-->FG
D2-->D0
D2-->Q
D2-->27
D2-->32
D2-->40
D3-->CW
D6-->DE
D8-->1F
D8-->FG
DA-->27
DA-->FG
DA-->GT
DC-->75
DC-->FG
DE-->D8
DE-->DA
DE-->DC
DE-->DG
DE-->DI
DE-->DK
DE-->FG
DG-->27
DG-->FG
DG-->GT
DI-->27
DI-->FG
DI-->GT
DK-->27
DK-->3R
DK-->FG
DL-->D6
DL-->DM
DM-->DE
DO-->Q
DR-->Q
DR-->27
DR-->3W
DR-->FG
DR-->GT
DT-->DO
DU-->DW
DU-->E0
DU-->E2
DU-->E6
DU-->E8
DW-->DO
DW-->B
DW-->27
DW-->FG
DY-->DO
DY-->EB
DY-->DT
DY-->FG
DY-->GT
E0-->DO
E0-->DR
E0-->B
E0-->Q
E0-->27
E0-->3W
E0-->5H
E0-->FG
E0-->GT
E2-->DO
E2-->EA
E2-->B
E2-->27
E2-->FG
E2-->GT
E4-->DO
E4-->EB
E4-->DT
E4-->FG
E4-->GT
E6-->DO
E6-->EA
E6-->EB
E6-->ED
E6-->DW
E6-->DY
E6-->E0
E6-->E2
E6-->E4
E6-->E8
E6-->B
E6-->Q
E6-->27
E6-->40
E6-->5H
E6-->FG
E6-->GT
E8-->27
E8-->40
E8-->FG
E8-->GT
E9-->EC
EA-->Q
EA-->40
EB-->Q
EB-->GT
EC-->E6
ED-->Q
EK-->EG
EK-->EH
EK-->EJ
EK-->EL
EK-->EM
EM-->GT
EP-->EV
EP-->F9
EP-->FB
EP-->FI
EP-->GA
EP-->Q
EP-->GT
ER-->GT
ET-->GT
EV-->GT
EX-->GT
EZ-->EV
EZ-->FK
EZ-->FO
EZ-->GA
F1-->GT
F3-->EV
F3-->F7
F3-->GT
F5-->GT
F7-->GT
F9-->FD
F9-->GA
FB-->GT
FD-->GT
FG-->EP
FG-->ER
FG-->ET
FG-->EV
FG-->EX
FG-->EZ
FG-->F1
FG-->F3
FG-->F5
FG-->F7
FG-->F9
FG-->FB
FG-->FD
FG-->FF
FG-->FI
FG-->FK
FG-->FM
FG-->FO
FG-->FQ
FG-->FS
FG-->FU
FG-->FW
FG-->FY
FG-->G0
FG-->G2
FG-->G4
FG-->G6
FG-->G8
FG-->GA
FI-->GT
FK-->GT
FM-->FD
FO-->GT
FQ-->FD
FQ-->GA
FS-->EV
FS-->FD
FS-->GA
FS-->GT
FU-->GT
FW-->GT
FY-->EV
FY-->27
G0-->EP
G0-->EV
G0-->FD
G0-->FU
G0-->GA
G0-->Q
G0-->GT
G2-->GT
G4-->FW
G4-->GA
G4-->GT
G6-->GT
G8-->GT
GA-->GT
GC-->GL
GG-->GQ
GJ-->GQ
GK-->GL
GL-->GQ
GP-->GQ
GT-->GC
GT-->GD
GT-->GE
GT-->GF
GT-->GG
GT-->GH
GT-->GI
GT-->GJ
GT-->GL
GT-->GK
GT-->GM
GT-->GN
GT-->GO
GT-->GQ
GT-->GR
GT-->GS
GT-->GU
GT-->GV
GT-->GW
GT-->GX
GT-->GY
GT-->GZ
GT-->H0
GT-->H1
GT-->H2
GT-->H3
GT-->H4
GT-->H5
GT-->H6
GT-->H7
GT-->HC
GT-->HD
GX-->GQ
H0-->GJ
H0-->H1
H1-->GJ
H4-->GG
```
