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
- 407 leaf nodes, 1238 edges.
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
subgraph BL["loan-balance-chart"]
BM["loan-balance-chart.component.ts"]
end
subgraph BN["loan-card"]
BO["loan-card.component.ts"]
end
subgraph BP["loan-detail"]
BQ["loan-detail.component.ts"]
end
subgraph BR["loan-form"]
BS["loan-form.component.ts"]
end
subgraph BT["loans-overview"]
BU["loans-overview.component.ts"]
end
end
BV["index.ts"]
BW["loan-card-vm.ts"]
BX["loan-types.ts"]
BY["loans.routes.ts"]
BZ["loans.store.ts"]
end
subgraph C0["feature-recurring"]
C1["bills-calendar-vm.ts"]
subgraph C2["components"]
subgraph C3["bills-calendar"]
C4["bills-calendar.component.ts"]
end
subgraph C5["bills-day-list"]
C6["bills-day-list.component.ts"]
end
subgraph C7["bills-month-grid"]
C8["bills-month-grid.component.ts"]
end
C9["index.ts"]
subgraph CA["recurring-overview"]
CB["recurring-overview.component.ts"]
end
subgraph CC["recurring-payments-panel"]
CD["recurring-payments-panel.component.ts"]
end
end
CE["index.ts"]
CF["recurring-payments-row-vm.ts"]
CG["recurring-series.store.ts"]
CH["recurring.routes.ts"]
end
subgraph CI["feature-settings"]
subgraph CJ["components"]
CK["index.ts"]
subgraph CL["settings-about-section"]
CM["settings-about-section.component.ts"]
end
subgraph CN["settings-currency-locale-section"]
CO["settings-currency-locale-section.component.ts"]
end
subgraph CP["settings-data-section"]
CQ["settings-data-section.component.ts"]
end
subgraph CR["settings-overview"]
CS["settings-overview.component.ts"]
end
subgraph CT["settings-privacy-section"]
CU["settings-privacy-section.component.ts"]
end
subgraph CV["settings-reporting-section"]
CW["settings-reporting-section.component.ts"]
end
subgraph CX["settings-theme-section"]
CY["settings-theme-section.component.ts"]
end
end
CZ["index.ts"]
D0["settings.routes.ts"]
end
subgraph D1["feature-transactions"]
D2["category-picker.ts"]
subgraph D3["components"]
subgraph D4["attribution-override-fieldset"]
D5["attribution-override-fieldset.component.ts"]
end
subgraph D6["category-select-cell"]
D7["category-select-cell.component.ts"]
end
D8["index.ts"]
subgraph D9["transaction-bulk-bar"]
DA["transaction-bulk-bar.component.ts"]
end
subgraph DB["transaction-edit-form"]
DC["transaction-edit-form.component.ts"]
end
subgraph DD["transaction-filters"]
DE["transaction-filters.component.ts"]
end
subgraph DF["transaction-row"]
DG["transaction-row.component.ts"]
end
subgraph DH["transactions-overview"]
DI["transactions-overview.component.ts"]
end
subgraph DJ["transfer-review"]
DK["transfer-review.component.ts"]
end
end
DL["index.ts"]
DM["transaction-filters.ts"]
DN["transaction-row-vm.ts"]
DO["transactions.routes.ts"]
end
subgraph DP["shared"]
subgraph DQ["echarts"]
DR["bucketed-axis-option.ts"]
DS["chart-theme.ts"]
DT["echarts-jsdom.testing.ts"]
DU["echarts-setup.ts"]
DV["index.ts"]
DW["legend-option.ts"]
DX["tooltip-formatter.ts"]
end
subgraph DY["ui"]
subgraph DZ["absolute-range-panel"]
E0["absolute-range-panel.component.ts"]
end
subgraph E1["alert"]
E2["alert.component.ts"]
end
subgraph E3["badge"]
E4["badge.component.ts"]
end
subgraph E5["button"]
E6["button.component.ts"]
end
subgraph E7["collapse"]
E8["collapse.component.ts"]
end
subgraph E9["confirm-dialog"]
EA["confirm-dialog.component.ts"]
end
subgraph EB["cycle-picker"]
EC["cycle-picker.component.ts"]
end
subgraph ED["date-range-input"]
EE["date-range-input.component.ts"]
end
subgraph EF["divider"]
EG["divider.component.ts"]
end
subgraph EH["dropdown"]
EI["dropdown.component.ts"]
end
subgraph EJ["empty-state"]
EK["empty-state.component.ts"]
end
subgraph EL["fieldset"]
EM["fieldset.component.ts"]
end
subgraph EN["flex"]
EO["flex.component.ts"]
end
subgraph EP["granularity-picker"]
EQ["granularity-picker.component.ts"]
end
ER["index.ts"]
subgraph ES["input"]
ET["input.component.ts"]
end
subgraph EU["label"]
EV["label.component.ts"]
end
subgraph EW["loading-skeleton"]
EX["loading-skeleton.component.ts"]
end
subgraph EY["modal"]
EZ["mm-modal.component.ts"]
end
subgraph F0["page-header"]
F1["page-header.component.ts"]
end
subgraph F2["paginator"]
F3["paginator.component.ts"]
end
subgraph F4["paper"]
F5["paper.component.ts"]
end
subgraph F6["privacy-blur"]
F7["privacy-blur.component.ts"]
end
subgraph F8["privacy-toggle"]
F9["privacy-toggle.component.ts"]
end
subgraph FA["range-picker"]
FB["range-picker.component.ts"]
end
subgraph FC["select"]
FD["select.component.ts"]
end
subgraph FE["stat-card"]
FF["stat-card.component.ts"]
end
subgraph FG["table"]
FH["table.component.ts"]
end
subgraph FI["tabs"]
FJ["tabs.component.ts"]
end
subgraph FK["typography"]
FL["typography.component.ts"]
end
end
subgraph FM["utils"]
FN["calendar-cycles.ts"]
FO["confidence-color.ts"]
FP["confirm-state.ts"]
FQ["currency-format.ts"]
FR["currency-symbol-presets.ts"]
FS["daisy-classes.ts"]
FT["date-buckets.ts"]
FU["date-format.pipe.ts"]
FV["date-format.ts"]
FW["debounced-text.ts"]
FX["download-json.ts"]
FY["fingerprint.ts"]
FZ["format-settings.testing.ts"]
G0["format-settings.ts"]
G1["hidden-amount.ts"]
G2["iban.ts"]
G3["index.ts"]
G4["link-control-to-setting.ts"]
G5["locale-presets.ts"]
G6["number-format.ts"]
G7["pagination.ts"]
G8["percentage.ts"]
G9["quick-ranges.ts"]
GA["range-expression.ts"]
GB["search-params.ts"]
GC["selection-model.ts"]
GD["signed-amount.pipe.ts"]
GE["sortable.ts"]
GF["structural-filters.ts"]
GG["theme-hooks.ts"]
subgraph GH["validators"]
GI["iban.validator.ts"]
GJ["percentage.validator.ts"]
end
GK["with-archivable.ts"]
GL["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3X
5-->4
5-->6
6-->Q
6-->G3
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
G-->FY
G-->G0
H-->G
H-->3O
H-->G3
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
Z-->G3
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
16-->G3
17-->Z
17-->10
17-->11
17-->13
17-->14
17-->15
17-->16
1A-->24
1A-->E6
1A-->FL
1B-->1A
1E-->1D
1G-->G3
1H-->1G
1H-->1I
1I-->1G
1I-->Q
1I-->G3
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
1X-->G3
1Y-->Q
1Y-->3O
1Y-->G3
1Z-->27
1Z-->Q
1Z-->G3
20-->21
20-->2Z
20-->DV
20-->G3
21-->2Z
21-->DV
21-->G3
22-->Q
22-->2Z
23-->Q
23-->G3
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
25-->G3
26-->1Y
26-->G3
27-->Q
27-->3T
27-->3X
28-->Q
29-->27
29-->28
29-->Q
29-->3X
2B-->Q
2B-->G3
2C-->2B
2C-->Q
2C-->G3
2D-->2F
2D-->2U
2D-->G3
2E-->2L
2E-->Q
2F-->2E
2F-->Q
2F-->G3
2G-->2E
2G-->2L
2G-->Q
2G-->G3
2H-->2L
2H-->Q
2I-->Q
2J-->2E
2J-->37
2J-->Q
2K-->G3
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
2O-->G3
2P-->Q
2Q-->Q
2Q-->G3
2R-->G3
2S-->2T
2T-->2U
2T-->Q
2U-->2F
2U-->Q
2U-->G3
2V-->2W
2V-->2Y
2V-->3F
2V-->Q
2W-->2F
2W-->2U
2W-->G3
2X-->2U
2X-->3H
2X-->G3
2Y-->2F
2Y-->2O
2Y-->2U
2Y-->G3
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
32-->G3
33-->3I
35-->G3
36-->2L
36-->Q
37-->G3
38-->G3
39-->2L
39-->B
39-->Q
39-->G3
3A-->39
3A-->G3
3B-->Q
3B-->G3
3C-->36
3C-->Q
3C-->G3
3D-->2E
3D-->2H
3D-->Q
3E-->Q
3E-->3X
3F-->2T
3G-->2L
3G-->Q
3G-->G3
3H-->36
3H-->Q
3I-->2F
3I-->Q
3I-->G3
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
41-->G3
43-->Q
44-->Q
45-->Q
46-->Q
47-->4M
47-->4O
47-->DV
48-->2Z
48-->G3
49-->Q
49-->24
49-->2Z
49-->G3
4C-->ER
4C-->G3
4E-->48
4E-->49
4E-->Q
4E-->2Z
4E-->DV
4E-->ER
4E-->G3
4G-->48
4G-->49
4G-->Q
4G-->24
4G-->2Z
4G-->DV
4G-->ER
4I-->43
4I-->44
4I-->4C
4I-->ER
4K-->44
4K-->46
4K-->Q
4K-->ER
4K-->G3
4K-->GI
4K-->GJ
4M-->4C
4M-->4E
4M-->4K
4M-->24
4M-->ER
4M-->G3
4O-->43
4O-->44
4O-->45
4O-->4G
4O-->4I
4O-->4K
4O-->Q
4O-->24
4O-->ER
4O-->G3
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
4W-->ER
4Z-->4T
4Z-->4W
4Z-->51
4Z-->B
4Z-->Q
4Z-->24
4Z-->ER
4Z-->G3
51-->4T
51-->Q
51-->ER
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
54-->ER
56-->5F
56-->24
56-->ER
56-->G3
58-->5E
58-->54
58-->B
58-->Q
58-->24
58-->ER
5A-->5H
5A-->5J
5A-->ER
5A-->G3
5C-->5F
5C-->5I
5C-->5J
5C-->56
5C-->58
5C-->5A
5C-->Q
5C-->24
5C-->ER
5C-->G3
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
5J-->G3
5L-->5Q
5O-->ER
5Q-->5T
5Q-->5U
5Q-->5V
5Q-->5W
5Q-->5O
5Q-->ER
5R-->5Q
5V-->5T
5W-->5U
5X-->5L
5X-->5R
5Z-->Q
63-->24
63-->ER
63-->G3
65-->24
65-->3X
65-->ER
65-->G3
67-->6V
67-->24
67-->2Z
67-->DV
67-->ER
67-->G3
69-->5Z
69-->60
69-->6V
69-->6B
69-->6D
69-->24
69-->ER
69-->G3
6B-->24
6B-->ER
6D-->60
6D-->ER
6F-->6R
6F-->6S
6F-->Q
6F-->ER
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
6H-->ER
6H-->G3
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
6K-->DV
6K-->ER
6K-->G3
6M-->6V
6M-->24
6M-->ER
6M-->G3
6O-->24
6O-->2Z
6O-->3X
6O-->DV
6O-->ER
6O-->G3
6Q-->6V
6Q-->24
6Q-->ER
6Q-->G3
6R-->6S
6R-->Q
6S-->Q
6T-->6H
6T-->DV
6U-->6I
6U-->6T
6V-->5Z
6V-->24
6V-->2Z
6V-->3X
6Z-->Q
6Z-->3K
6Z-->ER
6Z-->G3
70-->6Z
71-->70
75-->78
75-->7A
75-->24
75-->ER
76-->75
76-->78
76-->7A
78-->24
78-->2Z
78-->DV
78-->ER
78-->G3
7A-->Q
7A-->24
7A-->2Z
7A-->3X
7A-->DV
7A-->ER
7A-->G3
7B-->75
7B-->DV
7C-->76
7C-->7B
7G-->7X
7G-->7Z
7G-->Q
7G-->24
7G-->2Z
7G-->ER
7G-->G3
7I-->7Y
7I-->ER
7K-->7G
7K-->7Q
7K-->7T
7K-->ER
7M-->Q
7M-->ER
7O-->81
7O-->ER
7Q-->7Y
7Q-->7Z
7Q-->81
7Q-->7I
7Q-->7M
7Q-->7O
7Q-->Q
7Q-->24
7Q-->ER
7Q-->G3
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
7T-->ER
7T-->G3
7V-->84
7W-->Q
7X-->Q
7X-->2Z
7X-->ER
7X-->G3
7Y-->7W
7Y-->Q
7Y-->2Z
7Y-->ER
7Y-->G3
7Z-->Q
7Z-->24
7Z-->2Z
7Z-->3X
80-->7K
80-->DV
81-->Q
81-->2Z
81-->ER
81-->G3
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
83-->DV
83-->G3
88-->8H
88-->ER
8A-->8I
8A-->8C
8A-->ER
8C-->8I
8C-->ER
8E-->8I
8E-->ER
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
8O-->ER
8P-->8O
8Q-->8O
8R-->8P
8R-->8Q
8T-->Q
8W-->9P
8W-->4Q
8W-->ER
8Y-->ER
90-->94
90-->ER
92-->94
92-->ER
94-->ER
96-->8T
96-->94
96-->ER
98-->9T
98-->ER
9A-->8T
9A-->ER
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
9C-->ER
9E-->17
9E-->ER
9E-->G3
9G-->9P
9G-->9U
9G-->9N
9G-->Q
9G-->17
9G-->ER
9I-->Q
9I-->ER
9K-->9Q
9K-->8Y
9K-->9C
9K-->9G
9K-->9I
9K-->24
9K-->ER
9L-->9C
9L-->9E
9L-->9G
9L-->9I
9L-->9K
9N-->9P
9N-->8W
9N-->Q
9N-->ER
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
9Z-->ER
9Z-->G3
A1-->AU
A1-->ER
A3-->ER
A5-->AV
A5-->AW
A5-->AY
A5-->24
A5-->2Z
A5-->ER
A7-->AY
A7-->3O
A7-->DV
A7-->ER
A9-->AT
A9-->AY
A9-->A3
A9-->24
A9-->2Z
A9-->DV
A9-->ER
A9-->G3
AB-->AW
AB-->AY
AB-->24
AB-->2Z
AB-->ER
AB-->G3
AD-->24
AD-->8K
AD-->ER
AF-->AU
AF-->AY
AF-->ER
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
AH-->DV
AH-->ER
AH-->G3
AJ-->AU
AJ-->AY
AJ-->9Z
AJ-->A1
AJ-->A7
AJ-->AF
AJ-->ER
AL-->AY
AL-->24
AL-->2Z
AL-->3X
AL-->DV
AL-->ER
AL-->G3
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
AO-->ER
AQ-->AW
AQ-->AY
AQ-->B0
AQ-->B1
AQ-->ER
AQ-->G3
AS-->AY
AS-->B0
AS-->B1
AS-->AQ
AS-->Q
AS-->ER
AT-->2Z
AT-->DV
AT-->G3
AU-->Q
AV-->AW
AV-->Q
AV-->2Z
AV-->ER
AV-->G3
AW-->G3
AX-->AH
AX-->AJ
AX-->AO
AX-->DV
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
B6-->ER
B8-->BH
B8-->5D
B8-->ER
BA-->BH
BA-->1N
BA-->24
BA-->5D
BA-->ER
BC-->Q
BC-->1N
BC-->24
BC-->5D
BC-->ER
BC-->G3
BE-->Q
BE-->24
BE-->5D
BE-->ER
BE-->G3
BF-->B4
BF-->BG
BG-->B6
BH-->5D
BH-->ER
BK-->BM
BK-->BO
BK-->BQ
BK-->BS
BK-->BU
BM-->Q
BM-->1H
BM-->DV
BM-->ER
BO-->BW
BO-->ER
BQ-->BZ
BQ-->BM
BQ-->24
BQ-->ER
BS-->BX
BS-->Q
BS-->24
BS-->ER
BS-->GJ
BU-->BW
BU-->BZ
BU-->BO
BU-->BS
BU-->Q
BU-->ER
BV-->BK
BV-->BW
BV-->BX
BV-->BY
BV-->BZ
BW-->BX
BW-->Q
BW-->1H
BW-->G3
BX-->Q
BY-->BQ
BY-->BU
BY-->DV
BZ-->Q
BZ-->1H
BZ-->24
BZ-->G3
C1-->ER
C4-->C1
C4-->CG
C4-->C6
C4-->C8
C4-->24
C4-->2Z
C4-->ER
C4-->G3
C6-->C1
C6-->ER
C8-->C1
C8-->ER
C9-->C4
C9-->C6
C9-->C8
C9-->CB
C9-->CD
CB-->C4
CB-->CD
CB-->24
CB-->ER
CD-->CF
CD-->CG
CD-->24
CD-->2Z
CD-->DV
CD-->ER
CD-->G3
CE-->C9
CE-->CH
CG-->24
CG-->2Z
CG-->3X
CH-->CB
CK-->CS
CM-->1E
CM-->ER
CO-->24
CO-->ER
CO-->G3
CQ-->71
CQ-->ER
CS-->CM
CS-->CO
CS-->CQ
CS-->CU
CS-->CW
CS-->CY
CS-->ER
CU-->24
CU-->ER
CU-->G3
CW-->24
CW-->ER
CW-->G3
CY-->24
CY-->3O
CY-->ER
CZ-->CK
CZ-->D0
D0-->CS
D2-->Q
D5-->Q
D5-->24
D5-->3T
D5-->ER
D5-->G3
D7-->D2
D8-->DA
D8-->DC
D8-->DE
D8-->DI
D8-->DK
DA-->D2
DA-->B
DA-->24
DA-->ER
DC-->D2
DC-->D5
DC-->B
DC-->Q
DC-->24
DC-->3T
DC-->5D
DC-->ER
DE-->D2
DE-->DM
DE-->B
DE-->24
DE-->ER
DE-->G3
DG-->D2
DG-->DN
DG-->D7
DG-->ER
DG-->G3
DI-->D2
DI-->DM
DI-->DN
DI-->DA
DI-->DC
DI-->DE
DI-->DG
DI-->DK
DI-->B
DI-->Q
DI-->24
DI-->3X
DI-->5D
DI-->ER
DI-->G3
DK-->24
DK-->3X
DK-->ER
DK-->G3
DL-->DO
DM-->Q
DM-->3X
DN-->Q
DO-->DI
DV-->DR
DV-->DS
DV-->DU
DV-->DW
DV-->DX
DX-->G3
E0-->E6
E0-->EK
E0-->EM
E0-->ET
E0-->FL
E0-->Q
E0-->G3
E2-->G3
E4-->G3
E6-->G3
E8-->G3
EA-->E6
EA-->EV
EA-->EZ
EA-->FL
EC-->G3
EE-->E6
EE-->EI
EE-->G3
EG-->G3
EI-->G3
EK-->EO
EK-->FL
EM-->G3
EO-->G3
ER-->E0
ER-->E2
ER-->E4
ER-->E6
ER-->E8
ER-->EA
ER-->EC
ER-->EE
ER-->EG
ER-->EI
ER-->EK
ER-->EM
ER-->EO
ER-->EQ
ER-->ET
ER-->EV
ER-->EX
ER-->EZ
ER-->F1
ER-->F3
ER-->F5
ER-->F7
ER-->F9
ER-->FB
ER-->FD
ER-->FF
ER-->FH
ER-->FJ
ER-->FL
ET-->G3
EV-->G3
EX-->EO
EZ-->G3
F1-->EO
F1-->FL
F3-->E6
F3-->EO
F3-->FL
F3-->G3
F5-->G3
F7-->G3
F9-->E6
F9-->24
FB-->E0
FB-->E6
FB-->EO
FB-->F5
FB-->FL
FB-->Q
FB-->G3
FD-->G3
FF-->F7
FF-->FL
FF-->G3
FH-->G3
FJ-->G3
FL-->G3
FN-->FV
FQ-->G0
FT-->G0
FU-->FV
FV-->G0
FZ-->G0
G3-->FN
G3-->FO
G3-->FP
G3-->FQ
G3-->FR
G3-->FS
G3-->FT
G3-->FV
G3-->FU
G3-->FW
G3-->FX
G3-->FY
G3-->G0
G3-->G1
G3-->G2
G3-->G4
G3-->G5
G3-->G6
G3-->G7
G3-->G8
G3-->G9
G3-->GA
G3-->GB
G3-->GC
G3-->GD
G3-->GE
G3-->GF
G3-->GG
G3-->GK
G3-->GL
G6-->G0
G9-->FT
G9-->GA
GA-->FT
GD-->FQ
```
