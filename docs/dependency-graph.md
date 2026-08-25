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
- 424 leaf nodes, 1311 edges.
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
subgraph 9F["import-map-step"]
9G["import-map-step.component.ts"]
end
subgraph 9H["import-preview-step"]
9I["import-preview-step.component.ts"]
end
subgraph 9J["import-select-step"]
9K["import-select-step.component.ts"]
end
subgraph 9L["import-summary-step"]
9M["import-summary-step.component.ts"]
end
subgraph 9N["import-wizard"]
9O["import-wizard.component.ts"]
end
9P["index.ts"]
subgraph 9Q["queued-file-row"]
9R["queued-file-row.component.ts"]
end
end
9S["duplicate-scan.ts"]
9T["import-queue.ts"]
9U["import-wizard-session.ts"]
9V["import.routes.ts"]
9W["index.ts"]
9X["mapper-steps.ts"]
9Y["mapping-profiles.store.ts"]
end
subgraph 9Z["feature-income"]
A0["career-start-date.ts"]
subgraph A1["components"]
subgraph A2["income-career-start"]
A3["income-career-start.component.ts"]
end
subgraph A4["income-category-checklist"]
A5["income-category-checklist.component.ts"]
end
subgraph A6["income-chart-cell"]
A7["income-chart-cell.component.ts"]
end
subgraph A8["income-events-sidebar"]
A9["income-events-sidebar.component.ts"]
end
subgraph AA["income-gross-color"]
AB["income-gross-color.component.ts"]
end
subgraph AC["income-gross-net-section"]
AD["income-gross-net-section.component.ts"]
end
subgraph AE["income-growth-panel"]
AF["income-growth-panel.component.ts"]
end
subgraph AG["income-intro"]
AH["income-intro.component.ts"]
end
subgraph AI["income-main-category"]
AJ["income-main-category.component.ts"]
end
subgraph AK["income-overview"]
AL["income-overview.component.ts"]
end
subgraph AM["income-settings-page"]
AN["income-settings-page.component.ts"]
end
subgraph AO["income-yearly-panel"]
AP["income-yearly-panel.component.ts"]
end
AQ["index.ts"]
subgraph AR["salary-details-page"]
AS["salary-details-page.component.ts"]
end
subgraph AT["salary-metadata-table"]
AU["salary-metadata-table.component.ts"]
end
subgraph AV["salary-month-modal"]
AW["salary-month-modal.component.ts"]
end
end
AX["gross-net-chart-options.ts"]
AY["income-category-vm.ts"]
AZ["income-event-vm.ts"]
B0["income-granularity.ts"]
B1["income.routes.ts"]
B2["income.store.ts"]
B3["index.ts"]
B4["salary-metadata-edit.ts"]
B5["salary-metadata-rows.ts"]
end
subgraph B6["feature-learning"]
subgraph B7["components"]
B8["index.ts"]
subgraph B9["learning-overview"]
BA["learning-overview.component.ts"]
end
subgraph BB["model-status-badge"]
BC["model-status-badge.component.ts"]
end
subgraph BD["model-status"]
BE["model-status.component.ts"]
end
subgraph BF["rule-proposals"]
BG["rule-proposals.component.ts"]
end
subgraph BH["suggestions-table"]
BI["suggestions-table.component.ts"]
end
end
BJ["index.ts"]
BK["learning.routes.ts"]
BL["model-status-display.ts"]
end
subgraph BM["feature-loans"]
subgraph BN["components"]
BO["index.ts"]
subgraph BP["loan-amortization-table"]
BQ["loan-amortization-table.component.ts"]
end
subgraph BR["loan-balance-chart"]
BS["loan-balance-chart.component.ts"]
end
subgraph BT["loan-card"]
BU["loan-card.component.ts"]
end
subgraph BV["loan-composition-chart"]
BW["loan-composition-chart.component.ts"]
end
subgraph BX["loan-detail"]
BY["loan-detail.component.ts"]
end
subgraph BZ["loan-form"]
C0["loan-form.component.ts"]
end
subgraph C1["loan-payments-list"]
C2["loan-payments-list.component.ts"]
end
subgraph C3["loan-what-if"]
C4["loan-what-if.component.ts"]
end
subgraph C5["loans-overview"]
C6["loans-overview.component.ts"]
end
end
C7["index.ts"]
C8["loan-card-vm.ts"]
C9["loan-schedule-status.ts"]
CA["loan-types.ts"]
CB["loan-what-if-vm.ts"]
CC["loans.routes.ts"]
CD["loans.store.ts"]
end
subgraph CE["feature-recurring"]
CF["bills-calendar-vm.ts"]
subgraph CG["components"]
subgraph CH["bills-calendar"]
CI["bills-calendar.component.ts"]
end
subgraph CJ["bills-day-list"]
CK["bills-day-list.component.ts"]
end
subgraph CL["bills-month-grid"]
CM["bills-month-grid.component.ts"]
end
CN["index.ts"]
subgraph CO["recurring-dismissed-list"]
CP["recurring-dismissed-list.component.ts"]
end
subgraph CQ["recurring-overview"]
CR["recurring-overview.component.ts"]
end
subgraph CS["recurring-payments-panel"]
CT["recurring-payments-panel.component.ts"]
end
end
CU["index.ts"]
CV["recurring-overrides.ts"]
CW["recurring-payments-row-vm.ts"]
CX["recurring-series.store.ts"]
CY["recurring.routes.ts"]
end
subgraph CZ["feature-settings"]
subgraph D0["components"]
D1["index.ts"]
subgraph D2["settings-about-section"]
D3["settings-about-section.component.ts"]
end
subgraph D4["settings-currency-locale-section"]
D5["settings-currency-locale-section.component.ts"]
end
subgraph D6["settings-data-section"]
D7["settings-data-section.component.ts"]
end
subgraph D8["settings-overview"]
D9["settings-overview.component.ts"]
end
subgraph DA["settings-privacy-section"]
DB["settings-privacy-section.component.ts"]
end
subgraph DC["settings-reporting-section"]
DD["settings-reporting-section.component.ts"]
end
subgraph DE["settings-theme-section"]
DF["settings-theme-section.component.ts"]
end
end
DG["index.ts"]
DH["settings.routes.ts"]
end
subgraph DI["feature-transactions"]
DJ["category-picker.ts"]
subgraph DK["components"]
subgraph DL["attribution-override-fieldset"]
DM["attribution-override-fieldset.component.ts"]
end
subgraph DN["category-select-cell"]
DO["category-select-cell.component.ts"]
end
DP["index.ts"]
subgraph DQ["transaction-bulk-bar"]
DR["transaction-bulk-bar.component.ts"]
end
subgraph DS["transaction-card"]
DT["transaction-card.component.ts"]
end
subgraph DU["transaction-edit-form"]
DV["transaction-edit-form.component.ts"]
end
subgraph DW["transaction-filters"]
DX["transaction-filters.component.ts"]
end
subgraph DY["transaction-row"]
DZ["transaction-row.component.ts"]
end
subgraph E0["transactions-overview"]
E1["transactions-overview.component.ts"]
end
subgraph E2["transfer-review"]
E3["transfer-review.component.ts"]
end
end
E4["index.ts"]
E5["transaction-filters.ts"]
E6["transaction-row-vm.ts"]
E7["transactions.routes.ts"]
E8["transfer-label.ts"]
end
subgraph E9["shared"]
subgraph EA["echarts"]
EB["bucketed-axis-option.ts"]
EC["chart-theme.ts"]
ED["echarts-jsdom.testing.ts"]
EE["echarts-setup.ts"]
EF["index.ts"]
EG["legend-option.ts"]
EH["tooltip-formatter.ts"]
end
subgraph EI["ui"]
subgraph EJ["absolute-range-panel"]
EK["absolute-range-panel.component.ts"]
end
subgraph EL["alert"]
EM["alert.component.ts"]
end
subgraph EN["badge"]
EO["badge.component.ts"]
end
subgraph EP["button"]
EQ["button.component.ts"]
end
subgraph ER["collapse"]
ES["collapse.component.ts"]
end
subgraph ET["confirm-dialog"]
EU["confirm-dialog.component.ts"]
end
subgraph EV["cycle-picker"]
EW["cycle-picker.component.ts"]
end
subgraph EX["date-range-input"]
EY["date-range-input.component.ts"]
end
subgraph EZ["divider"]
F0["divider.component.ts"]
end
subgraph F1["dropdown"]
F2["dropdown.component.ts"]
end
subgraph F3["empty-state"]
F4["empty-state.component.ts"]
end
subgraph F5["fieldset"]
F6["fieldset.component.ts"]
end
subgraph F7["flex"]
F8["flex.component.ts"]
end
subgraph F9["granularity-picker"]
FA["granularity-picker.component.ts"]
end
FB["index.ts"]
subgraph FC["input"]
FD["input.component.ts"]
end
subgraph FE["label"]
FF["label.component.ts"]
end
subgraph FG["loading-skeleton"]
FH["loading-skeleton.component.ts"]
end
subgraph FI["modal"]
FJ["mm-modal.component.ts"]
end
subgraph FK["page-header"]
FL["page-header.component.ts"]
end
subgraph FM["paginator"]
FN["paginator.component.ts"]
end
subgraph FO["paper"]
FP["paper.component.ts"]
end
subgraph FQ["privacy-blur"]
FR["privacy-blur.component.ts"]
end
subgraph FS["privacy-toggle"]
FT["privacy-toggle.component.ts"]
end
subgraph FU["range-picker"]
FV["range-picker.component.ts"]
end
subgraph FW["select"]
FX["select.component.ts"]
end
subgraph FY["stat-card"]
FZ["stat-card.component.ts"]
end
subgraph G0["table"]
G1["table.component.ts"]
end
subgraph G2["tabs"]
G3["tabs.component.ts"]
end
subgraph G4["typography"]
G5["typography.component.ts"]
end
end
subgraph G6["utils"]
G7["calendar-cycles.ts"]
G8["compact-viewport.ts"]
G9["confidence-color.ts"]
GA["confirm-state.ts"]
GB["currency-format.ts"]
GC["currency-symbol-presets.ts"]
GD["daisy-classes.ts"]
GE["date-buckets.ts"]
GF["date-format.pipe.ts"]
GG["date-format.ts"]
GH["debounced-text.ts"]
GI["download-json.ts"]
GJ["fingerprint.ts"]
GK["format-settings.testing.ts"]
GL["format-settings.ts"]
GM["hidden-amount.ts"]
GN["iban.ts"]
GO["index.ts"]
GP["link-control-to-setting.ts"]
GQ["locale-presets.ts"]
GR["money-color.ts"]
GS["number-format.ts"]
GT["pagination.ts"]
GU["percentage.ts"]
GV["quick-ranges.ts"]
GW["range-expression.ts"]
GX["search-params.ts"]
GY["selection-model.ts"]
GZ["signed-amount.pipe.ts"]
H0["sortable.ts"]
H1["structural-filters.ts"]
H2["theme-hooks.ts"]
H3["unrendered-markup.testing.ts"]
subgraph H4["validators"]
H5["iban.validator.ts"]
H6["percentage.validator.ts"]
end
H7["with-archivable.ts"]
H8["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->40
5-->4
5-->6
6-->Q
6-->GO
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
G-->GJ
G-->GL
H-->G
H-->3R
H-->GO
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
10-->GO
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
17-->GO
18-->10
18-->11
18-->12
18-->14
18-->15
18-->16
18-->17
1B-->27
1B-->EQ
1B-->G5
1C-->1B
1F-->1E
1H-->GO
1I-->1H
1I-->1J
1I-->1K
1J-->1H
1J-->Q
1J-->GO
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
1Z-->GO
20-->Q
20-->3R
20-->GO
21-->2A
21-->Q
21-->GO
22-->23
22-->32
22-->EF
22-->GO
23-->32
23-->EF
23-->GO
24-->Q
24-->32
25-->Q
25-->GO
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
28-->GO
29-->20
29-->GO
2A-->Q
2A-->3W
2A-->40
2B-->Q
2C-->2A
2C-->2B
2C-->Q
2C-->40
2E-->Q
2E-->GO
2F-->2E
2F-->Q
2F-->GO
2G-->2I
2G-->2X
2G-->GO
2H-->2O
2H-->Q
2I-->2H
2I-->Q
2I-->GO
2J-->2H
2J-->2O
2J-->Q
2J-->GO
2K-->2O
2K-->Q
2L-->Q
2M-->2H
2M-->3A
2M-->Q
2N-->GO
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
2R-->GO
2S-->Q
2T-->Q
2T-->GO
2U-->GO
2V-->2W
2W-->2X
2W-->Q
2X-->2I
2X-->Q
2X-->GO
2Y-->2Z
2Y-->31
2Y-->3I
2Y-->Q
2Z-->2I
2Z-->2X
2Z-->GO
30-->2X
30-->3K
30-->GO
31-->2I
31-->2R
31-->2X
31-->GO
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
35-->GO
36-->3L
38-->GO
39-->2O
39-->Q
3A-->GO
3B-->GO
3C-->2O
3C-->B
3C-->Q
3C-->GO
3D-->3C
3D-->GO
3E-->Q
3E-->GO
3F-->39
3F-->Q
3F-->GO
3G-->2H
3G-->2K
3G-->Q
3H-->Q
3H-->40
3I-->2W
3J-->2O
3J-->Q
3J-->GO
3K-->39
3K-->Q
3L-->2I
3L-->Q
3L-->GO
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
44-->GO
46-->4U
46-->Q
47-->Q
48-->Q
49-->Q
4A-->4P
4A-->4R
4A-->EF
4B-->32
4B-->GO
4C-->Q
4C-->27
4C-->32
4C-->GO
4F-->FB
4F-->GO
4H-->4B
4H-->4C
4H-->Q
4H-->32
4H-->EF
4H-->FB
4H-->GO
4J-->4B
4J-->4C
4J-->Q
4J-->27
4J-->32
4J-->EF
4J-->FB
4L-->46
4L-->47
4L-->4F
4L-->FB
4N-->47
4N-->49
4N-->Q
4N-->FB
4N-->GO
4N-->H5
4N-->H6
4P-->4U
4P-->4F
4P-->4H
4P-->4N
4P-->27
4P-->FB
4P-->GO
4R-->46
4R-->47
4R-->48
4R-->4U
4R-->4J
4R-->4L
4R-->4N
4R-->Q
4R-->27
4R-->FB
4R-->GO
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
4U-->GO
4W-->53
4W-->5G
4Y-->1P
4Z-->4Y
4Z-->5N
4Z-->Q
4Z-->1P
4Z-->27
50-->Q
50-->FB
53-->4X
53-->50
53-->55
53-->B
53-->Q
53-->27
53-->FB
53-->GO
55-->4X
55-->Q
55-->FB
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
58-->FB
5A-->5J
5A-->27
5A-->FB
5A-->GO
5C-->5I
5C-->58
5C-->B
5C-->Q
5C-->27
5C-->FB
5E-->5L
5E-->5N
5E-->FB
5E-->GO
5G-->5J
5G-->5M
5G-->5N
5G-->5A
5G-->5C
5G-->5E
5G-->Q
5G-->27
5G-->FB
5G-->GO
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
5N-->GO
5P-->5U
5S-->FB
5U-->5X
5U-->5Y
5U-->5Z
5U-->60
5U-->5S
5U-->FB
5V-->5U
5Z-->5X
60-->5Y
61-->5P
61-->5V
63-->Q
67-->27
67-->FB
67-->GO
69-->27
69-->40
69-->FB
69-->GO
6B-->6Z
6B-->27
6B-->32
6B-->EF
6B-->FB
6B-->GO
6D-->63
6D-->64
6D-->6Z
6D-->6F
6D-->6H
6D-->27
6D-->FB
6D-->GO
6F-->27
6F-->FB
6H-->64
6H-->FB
6J-->6V
6J-->6W
6J-->Q
6J-->FB
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
6L-->FB
6L-->GO
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
6O-->EF
6O-->FB
6O-->GO
6Q-->6Z
6Q-->27
6Q-->FB
6Q-->GO
6S-->27
6S-->32
6S-->40
6S-->EF
6S-->FB
6S-->GO
6U-->6Z
6U-->27
6U-->FB
6U-->GO
6V-->6W
6V-->Q
6W-->Q
6X-->6L
6X-->EF
6Y-->6M
6Y-->6X
6Z-->63
6Z-->27
6Z-->32
6Z-->40
73-->Q
73-->3N
73-->FB
73-->GO
74-->73
75-->74
79-->7C
79-->7E
79-->27
79-->FB
7A-->79
7A-->7C
7A-->7E
7C-->27
7C-->32
7C-->EF
7C-->FB
7C-->GO
7E-->Q
7E-->27
7E-->32
7E-->40
7E-->EF
7E-->FB
7E-->GO
7F-->79
7F-->EF
7G-->7A
7G-->7F
7K-->81
7K-->83
7K-->Q
7K-->27
7K-->32
7K-->FB
7K-->GO
7M-->82
7M-->FB
7O-->7K
7O-->7U
7O-->7X
7O-->FB
7Q-->Q
7Q-->FB
7S-->85
7S-->FB
7U-->82
7U-->83
7U-->85
7U-->7M
7U-->7Q
7U-->7S
7U-->Q
7U-->27
7U-->FB
7U-->GO
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
7X-->FB
7X-->GO
7Z-->88
80-->Q
81-->Q
81-->32
81-->FB
81-->GO
82-->80
82-->Q
82-->32
82-->FB
82-->GO
83-->Q
83-->27
83-->32
83-->40
84-->7O
84-->EF
85-->Q
85-->32
85-->FB
85-->GO
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
87-->EF
87-->GO
8C-->8L
8C-->FB
8E-->8M
8E-->8G
8E-->FB
8G-->8M
8G-->FB
8I-->8M
8I-->FB
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
8S-->FB
8T-->8S
8U-->8S
8V-->8T
8V-->8U
8X-->Q
90-->9T
90-->4T
90-->FB
92-->FB
94-->98
94-->FB
96-->98
96-->FB
98-->FB
9A-->8X
9A-->98
9A-->FB
9C-->9X
9C-->FB
9E-->8X
9E-->FB
9G-->8X
9G-->9S
9G-->9X
9G-->9Y
9G-->94
9G-->96
9G-->9A
9G-->9C
9G-->9E
9G-->9I
9G-->Q
9G-->18
9G-->FB
9I-->9S
9I-->18
9I-->FB
9I-->GO
9K-->9T
9K-->9Y
9K-->9R
9K-->Q
9K-->18
9K-->FB
9M-->Q
9M-->FB
9O-->9U
9O-->92
9O-->9G
9O-->9K
9O-->9M
9O-->27
9O-->FB
9P-->9G
9P-->9I
9P-->9K
9P-->9M
9P-->9O
9R-->9T
9R-->90
9R-->Q
9R-->FB
9S-->18
9S-->FB
9T-->Q
9U-->8X
9U-->9S
9U-->9T
9U-->9Y
9U-->Q
9U-->18
9U-->27
9U-->4T
9V-->9O
9W-->8X
9W-->9P
9W-->9T
9W-->9V
9W-->9X
9W-->9Y
9X-->8X
9Y-->Q
A0-->32
A3-->A0
A3-->B2
A3-->FB
A3-->GO
A5-->AY
A5-->FB
A7-->FB
A9-->AZ
A9-->B0
A9-->B2
A9-->27
A9-->32
A9-->FB
AB-->B2
AB-->3R
AB-->EF
AB-->FB
AD-->AX
AD-->B2
AD-->A7
AD-->27
AD-->32
AD-->EF
AD-->FB
AD-->GO
AF-->B0
AF-->B2
AF-->27
AF-->32
AF-->FB
AF-->GO
AH-->27
AH-->8O
AH-->FB
AJ-->AY
AJ-->B2
AJ-->FB
AL-->B2
AL-->B5
AL-->A9
AL-->AD
AL-->AF
AL-->AH
AL-->AP
AL-->AW
AL-->27
AL-->32
AL-->8O
AL-->EF
AL-->FB
AL-->GO
AN-->AY
AN-->B2
AN-->A3
AN-->A5
AN-->AB
AN-->AJ
AN-->FB
AP-->B2
AP-->27
AP-->32
AP-->40
AP-->EF
AP-->FB
AP-->GO
AQ-->A3
AQ-->A5
AQ-->A7
AQ-->A9
AQ-->AD
AQ-->AF
AQ-->AH
AQ-->AJ
AQ-->AL
AQ-->AN
AQ-->AP
AQ-->AS
AQ-->AU
AQ-->AW
AS-->AU
AS-->FB
AU-->B0
AU-->B2
AU-->B4
AU-->B5
AU-->FB
AU-->GO
AW-->B2
AW-->B4
AW-->B5
AW-->AU
AW-->Q
AW-->FB
AX-->32
AX-->EF
AX-->GO
AY-->Q
AZ-->B0
AZ-->Q
AZ-->32
AZ-->FB
AZ-->GO
B0-->GO
B1-->AL
B1-->AN
B1-->AS
B1-->EF
B2-->A0
B2-->B0
B2-->Q
B2-->27
B2-->32
B2-->3R
B2-->40
B3-->AQ
B3-->AY
B3-->B0
B3-->B1
B3-->B2
B3-->B4
B3-->B5
B4-->Q
B5-->Q
B8-->BA
B8-->BE
B8-->BG
B8-->BI
BA-->BC
BA-->BE
BA-->BG
BA-->BI
BA-->FB
BC-->BL
BC-->5H
BC-->FB
BE-->BL
BE-->1P
BE-->27
BE-->5H
BE-->FB
BG-->Q
BG-->1P
BG-->27
BG-->5H
BG-->FB
BG-->GO
BI-->Q
BI-->27
BI-->5H
BI-->FB
BI-->GO
BJ-->B8
BJ-->BK
BK-->BA
BL-->5H
BL-->FB
BO-->BQ
BO-->BS
BO-->BU
BO-->BW
BO-->BY
BO-->C0
BO-->C2
BO-->C4
BO-->C6
BQ-->BW
BQ-->Q
BQ-->1I
BQ-->FB
BQ-->GO
BS-->Q
BS-->1I
BS-->EF
BS-->FB
BU-->C8
BU-->FB
BW-->Q
BW-->1I
BW-->EF
BW-->FB
BW-->GO
BY-->C9
BY-->CD
BY-->BQ
BY-->BS
BY-->C0
BY-->C2
BY-->C4
BY-->1I
BY-->27
BY-->FB
C0-->CA
C0-->Q
C0-->27
C0-->FB
C0-->H6
C2-->Q
C2-->27
C2-->FB
C2-->GO
C4-->CB
C4-->Q
C4-->1I
C4-->27
C4-->EF
C4-->FB
C6-->C8
C6-->CD
C6-->BU
C6-->C0
C6-->Q
C6-->FB
C7-->BO
C7-->C8
C7-->C9
C7-->CA
C7-->CB
C7-->CC
C7-->CD
C8-->C9
C8-->CA
C8-->Q
C8-->1I
C8-->FB
C8-->GO
C9-->1I
C9-->FB
C9-->GO
CA-->Q
CB-->1I
CB-->GO
CC-->BY
CC-->C6
CC-->EF
CD-->Q
CD-->1I
CD-->27
CD-->GO
CF-->FB
CI-->CF
CI-->CX
CI-->CK
CI-->CM
CI-->27
CI-->32
CI-->FB
CI-->GO
CK-->CF
CK-->FB
CM-->CF
CM-->FB
CN-->CI
CN-->CK
CN-->CM
CN-->CR
CN-->CT
CP-->FB
CR-->CI
CR-->CT
CR-->27
CR-->FB
CT-->CW
CT-->CX
CT-->CP
CT-->27
CT-->32
CT-->EF
CT-->FB
CT-->GO
CU-->CN
CU-->CY
CV-->Q
CV-->32
CW-->FB
CX-->CV
CX-->Q
CX-->27
CX-->32
CX-->40
CY-->CR
D1-->D9
D3-->1F
D3-->FB
D5-->27
D5-->FB
D5-->GO
D7-->75
D7-->FB
D9-->D3
D9-->D5
D9-->D7
D9-->DB
D9-->DD
D9-->DF
D9-->FB
DB-->27
DB-->FB
DB-->GO
DD-->27
DD-->FB
DD-->GO
DF-->27
DF-->3R
DF-->FB
DG-->D1
DG-->DH
DH-->D9
DJ-->Q
DM-->Q
DM-->27
DM-->3W
DM-->FB
DM-->GO
DO-->DJ
DP-->DR
DP-->DV
DP-->DX
DP-->E1
DP-->E3
DR-->DJ
DR-->B
DR-->27
DR-->FB
DT-->DJ
DT-->E6
DT-->DO
DT-->FB
DT-->GO
DV-->DJ
DV-->DM
DV-->B
DV-->Q
DV-->27
DV-->3W
DV-->5H
DV-->FB
DV-->GO
DX-->DJ
DX-->E5
DX-->B
DX-->27
DX-->FB
DX-->GO
DZ-->DJ
DZ-->E6
DZ-->DO
DZ-->FB
DZ-->GO
E1-->DJ
E1-->E5
E1-->E6
E1-->E8
E1-->DR
E1-->DT
E1-->DV
E1-->DX
E1-->DZ
E1-->E3
E1-->B
E1-->Q
E1-->27
E1-->40
E1-->5H
E1-->FB
E1-->GO
E3-->27
E3-->40
E3-->FB
E3-->GO
E4-->E7
E5-->Q
E5-->40
E6-->Q
E6-->GO
E7-->E1
E8-->Q
EF-->EB
EF-->EC
EF-->EE
EF-->EG
EF-->EH
EH-->GO
EK-->EQ
EK-->F4
EK-->F6
EK-->FD
EK-->G5
EK-->Q
EK-->GO
EM-->GO
EO-->GO
EQ-->GO
ES-->GO
EU-->EQ
EU-->FF
EU-->FJ
EU-->G5
EW-->GO
EY-->EQ
EY-->F2
EY-->GO
F0-->GO
F2-->GO
F4-->F8
F4-->G5
F6-->GO
F8-->GO
FB-->EK
FB-->EM
FB-->EO
FB-->EQ
FB-->ES
FB-->EU
FB-->EW
FB-->EY
FB-->F0
FB-->F2
FB-->F4
FB-->F6
FB-->F8
FB-->FA
FB-->FD
FB-->FF
FB-->FH
FB-->FJ
FB-->FL
FB-->FN
FB-->FP
FB-->FR
FB-->FT
FB-->FV
FB-->FX
FB-->FZ
FB-->G1
FB-->G3
FB-->G5
FD-->GO
FF-->GO
FH-->F8
FJ-->GO
FL-->F8
FL-->G5
FN-->EQ
FN-->F8
FN-->G5
FN-->GO
FP-->GO
FR-->GO
FT-->EQ
FT-->27
FV-->EK
FV-->EQ
FV-->F8
FV-->FP
FV-->G5
FV-->Q
FV-->GO
FX-->GO
FZ-->FR
FZ-->G5
FZ-->GO
G1-->GO
G3-->GO
G5-->GO
G7-->GG
GB-->GL
GE-->GL
GF-->GG
GG-->GL
GK-->GL
GO-->G7
GO-->G8
GO-->G9
GO-->GA
GO-->GB
GO-->GC
GO-->GD
GO-->GE
GO-->GG
GO-->GF
GO-->GH
GO-->GI
GO-->GJ
GO-->GL
GO-->GM
GO-->GN
GO-->GP
GO-->GQ
GO-->GR
GO-->GS
GO-->GT
GO-->GU
GO-->GV
GO-->GW
GO-->GX
GO-->GY
GO-->GZ
GO-->H0
GO-->H1
GO-->H2
GO-->H7
GO-->H8
GS-->GL
GV-->GE
GV-->GW
GW-->GE
GZ-->GB
```
