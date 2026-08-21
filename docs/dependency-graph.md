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
- 398 leaf nodes, 1198 edges.
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
subgraph BE["feature-loans"]
subgraph BF["components"]
BG["index.ts"]
subgraph BH["loans-overview"]
BI["loans-overview.component.ts"]
end
end
BJ["index.ts"]
BK["loans.routes.ts"]
BL["loans.store.ts"]
end
subgraph BM["feature-recurring"]
BN["bills-calendar-vm.ts"]
subgraph BO["components"]
subgraph BP["bills-calendar"]
BQ["bills-calendar.component.ts"]
end
subgraph BR["bills-day-list"]
BS["bills-day-list.component.ts"]
end
subgraph BT["bills-month-grid"]
BU["bills-month-grid.component.ts"]
end
BV["index.ts"]
subgraph BW["recurring-overview"]
BX["recurring-overview.component.ts"]
end
subgraph BY["recurring-payments-panel"]
BZ["recurring-payments-panel.component.ts"]
end
end
C0["index.ts"]
C1["recurring-payments-row-vm.ts"]
C2["recurring-series.store.ts"]
C3["recurring.routes.ts"]
end
subgraph C4["feature-settings"]
subgraph C5["components"]
C6["index.ts"]
subgraph C7["settings-about-section"]
C8["settings-about-section.component.ts"]
end
subgraph C9["settings-currency-locale-section"]
CA["settings-currency-locale-section.component.ts"]
end
subgraph CB["settings-data-section"]
CC["settings-data-section.component.ts"]
end
subgraph CD["settings-overview"]
CE["settings-overview.component.ts"]
end
subgraph CF["settings-privacy-section"]
CG["settings-privacy-section.component.ts"]
end
subgraph CH["settings-reporting-section"]
CI["settings-reporting-section.component.ts"]
end
subgraph CJ["settings-theme-section"]
CK["settings-theme-section.component.ts"]
end
end
CL["index.ts"]
CM["settings.routes.ts"]
end
subgraph CN["feature-transactions"]
CO["category-picker.ts"]
subgraph CP["components"]
subgraph CQ["attribution-override-fieldset"]
CR["attribution-override-fieldset.component.ts"]
end
subgraph CS["category-select-cell"]
CT["category-select-cell.component.ts"]
end
CU["index.ts"]
subgraph CV["transaction-bulk-bar"]
CW["transaction-bulk-bar.component.ts"]
end
subgraph CX["transaction-edit-form"]
CY["transaction-edit-form.component.ts"]
end
subgraph CZ["transaction-filters"]
D0["transaction-filters.component.ts"]
end
subgraph D1["transaction-row"]
D2["transaction-row.component.ts"]
end
subgraph D3["transactions-overview"]
D4["transactions-overview.component.ts"]
end
subgraph D5["transfer-review"]
D6["transfer-review.component.ts"]
end
end
D7["index.ts"]
D8["transaction-filters.ts"]
D9["transaction-row-vm.ts"]
DA["transactions.routes.ts"]
end
subgraph DB["shared"]
subgraph DC["echarts"]
DD["bucketed-axis-option.ts"]
DE["chart-theme.ts"]
DF["echarts-jsdom.testing.ts"]
DG["echarts-setup.ts"]
DH["index.ts"]
DI["legend-option.ts"]
DJ["tooltip-formatter.ts"]
end
subgraph DK["ui"]
subgraph DL["absolute-range-panel"]
DM["absolute-range-panel.component.ts"]
end
subgraph DN["alert"]
DO["alert.component.ts"]
end
subgraph DP["badge"]
DQ["badge.component.ts"]
end
subgraph DR["button"]
DS["button.component.ts"]
end
subgraph DT["collapse"]
DU["collapse.component.ts"]
end
subgraph DV["confirm-dialog"]
DW["confirm-dialog.component.ts"]
end
subgraph DX["cycle-picker"]
DY["cycle-picker.component.ts"]
end
subgraph DZ["date-range-input"]
E0["date-range-input.component.ts"]
end
subgraph E1["divider"]
E2["divider.component.ts"]
end
subgraph E3["dropdown"]
E4["dropdown.component.ts"]
end
subgraph E5["empty-state"]
E6["empty-state.component.ts"]
end
subgraph E7["fieldset"]
E8["fieldset.component.ts"]
end
subgraph E9["flex"]
EA["flex.component.ts"]
end
subgraph EB["granularity-picker"]
EC["granularity-picker.component.ts"]
end
ED["index.ts"]
subgraph EE["input"]
EF["input.component.ts"]
end
subgraph EG["label"]
EH["label.component.ts"]
end
subgraph EI["loading-skeleton"]
EJ["loading-skeleton.component.ts"]
end
subgraph EK["modal"]
EL["mm-modal.component.ts"]
end
subgraph EM["page-header"]
EN["page-header.component.ts"]
end
subgraph EO["paginator"]
EP["paginator.component.ts"]
end
subgraph EQ["paper"]
ER["paper.component.ts"]
end
subgraph ES["privacy-blur"]
ET["privacy-blur.component.ts"]
end
subgraph EU["privacy-toggle"]
EV["privacy-toggle.component.ts"]
end
subgraph EW["range-picker"]
EX["range-picker.component.ts"]
end
subgraph EY["select"]
EZ["select.component.ts"]
end
subgraph F0["stat-card"]
F1["stat-card.component.ts"]
end
subgraph F2["table"]
F3["table.component.ts"]
end
subgraph F4["tabs"]
F5["tabs.component.ts"]
end
subgraph F6["typography"]
F7["typography.component.ts"]
end
end
subgraph F8["utils"]
F9["calendar-cycles.ts"]
FA["confidence-color.ts"]
FB["confirm-state.ts"]
FC["currency-format.ts"]
FD["currency-symbol-presets.ts"]
FE["daisy-classes.ts"]
FF["date-buckets.ts"]
FG["date-format.pipe.ts"]
FH["date-format.ts"]
FI["debounced-text.ts"]
FJ["download-json.ts"]
FK["fingerprint.ts"]
FL["format-settings.testing.ts"]
FM["format-settings.ts"]
FN["hidden-amount.ts"]
FO["iban.ts"]
FP["index.ts"]
FQ["link-control-to-setting.ts"]
FR["locale-presets.ts"]
FS["number-format.ts"]
FT["pagination.ts"]
FU["percentage.ts"]
FV["quick-ranges.ts"]
FW["range-expression.ts"]
FX["search-params.ts"]
FY["selection-model.ts"]
FZ["signed-amount.pipe.ts"]
G0["sortable.ts"]
G1["structural-filters.ts"]
G2["theme-hooks.ts"]
subgraph G3["validators"]
G4["iban.validator.ts"]
G5["percentage.validator.ts"]
end
G6["with-archivable.ts"]
G7["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3T
5-->4
5-->6
6-->Q
6-->FP
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
G-->FK
G-->FM
H-->G
H-->3K
H-->FP
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
Z-->FP
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
16-->FP
17-->Z
17-->10
17-->11
17-->13
17-->14
17-->15
17-->16
1A-->20
1A-->DS
1A-->F7
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
1T-->FP
1U-->Q
1U-->3K
1U-->FP
1V-->23
1V-->Q
1V-->FP
1W-->1X
1W-->2V
1W-->DH
1W-->FP
1X-->2V
1X-->DH
1X-->FP
1Y-->Q
1Y-->2V
1Z-->Q
1Z-->FP
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
21-->FP
22-->1U
22-->FP
23-->Q
23-->3P
23-->3T
24-->Q
25-->23
25-->24
25-->Q
25-->3T
27-->Q
27-->FP
28-->27
28-->Q
28-->FP
29-->2B
29-->2Q
29-->FP
2A-->2H
2A-->Q
2B-->2A
2B-->Q
2B-->FP
2C-->2A
2C-->2H
2C-->Q
2C-->FP
2D-->2H
2D-->Q
2E-->Q
2F-->2A
2F-->33
2F-->Q
2G-->FP
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
2K-->FP
2L-->Q
2M-->Q
2M-->FP
2N-->FP
2O-->2P
2P-->2Q
2P-->Q
2Q-->2B
2Q-->Q
2Q-->FP
2R-->2S
2R-->2U
2R-->3B
2R-->Q
2S-->2B
2S-->2Q
2S-->FP
2T-->2Q
2T-->3D
2T-->FP
2U-->2B
2U-->2K
2U-->2Q
2U-->FP
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
2Y-->FP
2Z-->3E
31-->FP
32-->2H
32-->Q
33-->FP
34-->FP
35-->2H
35-->B
35-->Q
35-->FP
36-->35
36-->FP
37-->Q
37-->FP
38-->32
38-->Q
38-->FP
39-->2A
39-->2D
39-->Q
3A-->Q
3A-->3T
3B-->2P
3C-->2H
3C-->Q
3C-->FP
3D-->32
3D-->Q
3E-->2B
3E-->Q
3E-->FP
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
3X-->FP
3Z-->Q
40-->Q
41-->Q
42-->Q
43-->4I
43-->4K
43-->DH
44-->2V
44-->FP
45-->Q
45-->20
45-->2V
45-->FP
48-->ED
48-->FP
4A-->44
4A-->45
4A-->Q
4A-->2V
4A-->DH
4A-->ED
4A-->FP
4C-->44
4C-->45
4C-->Q
4C-->20
4C-->2V
4C-->DH
4C-->ED
4E-->3Z
4E-->40
4E-->48
4E-->ED
4G-->40
4G-->42
4G-->Q
4G-->ED
4G-->FP
4G-->G4
4G-->G5
4I-->48
4I-->4A
4I-->4G
4I-->20
4I-->ED
4I-->FP
4K-->3Z
4K-->40
4K-->41
4K-->4C
4K-->4E
4K-->4G
4K-->Q
4K-->20
4K-->ED
4K-->FP
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
4S-->ED
4V-->4P
4V-->4S
4V-->4X
4V-->B
4V-->Q
4V-->20
4V-->ED
4V-->FP
4X-->4P
4X-->Q
4X-->ED
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
50-->ED
52-->5B
52-->20
52-->ED
52-->FP
54-->5A
54-->50
54-->B
54-->Q
54-->20
54-->ED
56-->5D
56-->5F
56-->ED
56-->FP
58-->5B
58-->5E
58-->5F
58-->52
58-->54
58-->56
58-->Q
58-->20
58-->ED
58-->FP
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
5F-->FP
5H-->5M
5K-->ED
5M-->5P
5M-->5Q
5M-->5R
5M-->5S
5M-->5K
5M-->ED
5N-->5M
5R-->5P
5S-->5Q
5T-->5H
5T-->5N
5V-->Q
5Z-->20
5Z-->ED
5Z-->FP
61-->20
61-->3T
61-->ED
61-->FP
63-->6R
63-->20
63-->2V
63-->DH
63-->ED
63-->FP
65-->5V
65-->5W
65-->6R
65-->67
65-->69
65-->20
65-->ED
65-->FP
67-->20
67-->ED
69-->5W
69-->ED
6B-->6N
6B-->6O
6B-->Q
6B-->ED
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
6D-->ED
6D-->FP
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
6G-->DH
6G-->ED
6G-->FP
6I-->6R
6I-->20
6I-->ED
6I-->FP
6K-->20
6K-->2V
6K-->3T
6K-->DH
6K-->ED
6K-->FP
6M-->6R
6M-->20
6M-->ED
6M-->FP
6N-->6O
6N-->Q
6O-->Q
6P-->6D
6P-->DH
6Q-->6E
6Q-->6P
6R-->5V
6R-->20
6R-->2V
6R-->3T
6V-->Q
6V-->3G
6V-->ED
6V-->FP
6W-->6V
6X-->6W
71-->74
71-->76
71-->20
71-->ED
72-->71
72-->74
72-->76
74-->20
74-->2V
74-->DH
74-->ED
74-->FP
76-->Q
76-->20
76-->2V
76-->3T
76-->DH
76-->ED
76-->FP
77-->71
77-->DH
78-->72
78-->77
7C-->7T
7C-->7V
7C-->Q
7C-->20
7C-->2V
7C-->ED
7C-->FP
7E-->7U
7E-->ED
7G-->7C
7G-->7M
7G-->7P
7G-->ED
7I-->Q
7I-->ED
7K-->7X
7K-->ED
7M-->7U
7M-->7V
7M-->7X
7M-->7E
7M-->7I
7M-->7K
7M-->Q
7M-->20
7M-->ED
7M-->FP
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
7P-->ED
7P-->FP
7R-->80
7S-->Q
7T-->Q
7T-->2V
7T-->ED
7T-->FP
7U-->7S
7U-->Q
7U-->2V
7U-->ED
7U-->FP
7V-->Q
7V-->20
7V-->2V
7V-->3T
7W-->7G
7W-->DH
7X-->Q
7X-->2V
7X-->ED
7X-->FP
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
7Z-->DH
7Z-->FP
84-->8D
84-->ED
86-->8E
86-->88
86-->ED
88-->8E
88-->ED
8A-->8E
8A-->ED
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
8K-->ED
8L-->8K
8M-->8K
8N-->8L
8N-->8M
8P-->Q
8S-->9L
8S-->4M
8S-->ED
8U-->ED
8W-->90
8W-->ED
8Y-->90
8Y-->ED
90-->ED
92-->8P
92-->90
92-->ED
94-->9P
94-->ED
96-->8P
96-->ED
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
98-->ED
9A-->17
9A-->ED
9A-->FP
9C-->9L
9C-->9Q
9C-->9J
9C-->Q
9C-->17
9C-->ED
9E-->Q
9E-->ED
9G-->9M
9G-->8U
9G-->98
9G-->9C
9G-->9E
9G-->20
9G-->ED
9H-->98
9H-->9A
9H-->9C
9H-->9E
9H-->9G
9J-->9L
9J-->8S
9J-->Q
9J-->ED
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
9V-->ED
9V-->FP
9X-->AQ
9X-->ED
9Z-->ED
A1-->AR
A1-->AS
A1-->AU
A1-->20
A1-->2V
A1-->ED
A3-->AU
A3-->3K
A3-->DH
A3-->ED
A5-->AP
A5-->AU
A5-->9Z
A5-->20
A5-->2V
A5-->DH
A5-->ED
A5-->FP
A7-->AS
A7-->AU
A7-->20
A7-->2V
A7-->ED
A7-->FP
A9-->20
A9-->8G
A9-->ED
AB-->AQ
AB-->AU
AB-->ED
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
AD-->DH
AD-->ED
AD-->FP
AF-->AQ
AF-->AU
AF-->9V
AF-->9X
AF-->A3
AF-->AB
AF-->ED
AH-->AU
AH-->20
AH-->2V
AH-->3T
AH-->DH
AH-->ED
AH-->FP
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
AK-->ED
AM-->AS
AM-->AU
AM-->AW
AM-->AX
AM-->ED
AM-->FP
AO-->AU
AO-->AW
AO-->AX
AO-->AM
AO-->Q
AO-->ED
AP-->2V
AP-->DH
AP-->FP
AQ-->Q
AR-->AS
AR-->Q
AR-->2V
AR-->ED
AR-->FP
AS-->FP
AT-->AD
AT-->AF
AT-->AK
AT-->DH
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
B2-->ED
B4-->BD
B4-->59
B4-->ED
B6-->BD
B6-->1J
B6-->20
B6-->59
B6-->ED
B8-->Q
B8-->1J
B8-->20
B8-->59
B8-->ED
B8-->FP
BA-->Q
BA-->20
BA-->59
BA-->ED
BA-->FP
BB-->B0
BB-->BC
BC-->B2
BD-->59
BD-->ED
BG-->BI
BI-->BL
BI-->ED
BJ-->BG
BJ-->BK
BJ-->BL
BK-->BI
BL-->Q
BL-->FP
BN-->ED
BQ-->BN
BQ-->C2
BQ-->BS
BQ-->BU
BQ-->20
BQ-->2V
BQ-->ED
BQ-->FP
BS-->BN
BS-->ED
BU-->BN
BU-->ED
BV-->BQ
BV-->BS
BV-->BU
BV-->BX
BV-->BZ
BX-->BQ
BX-->BZ
BX-->20
BX-->ED
BZ-->C1
BZ-->C2
BZ-->20
BZ-->2V
BZ-->DH
BZ-->ED
BZ-->FP
C0-->BV
C0-->C3
C2-->20
C2-->2V
C2-->3T
C3-->BX
C6-->CE
C8-->1E
C8-->ED
CA-->20
CA-->ED
CA-->FP
CC-->6X
CC-->ED
CE-->C8
CE-->CA
CE-->CC
CE-->CG
CE-->CI
CE-->CK
CE-->ED
CG-->20
CG-->ED
CG-->FP
CI-->20
CI-->ED
CI-->FP
CK-->20
CK-->3K
CK-->ED
CL-->C6
CL-->CM
CM-->CE
CO-->Q
CR-->Q
CR-->20
CR-->3P
CR-->ED
CR-->FP
CT-->CO
CU-->CW
CU-->CY
CU-->D0
CU-->D4
CU-->D6
CW-->CO
CW-->B
CW-->20
CW-->ED
CY-->CO
CY-->CR
CY-->B
CY-->Q
CY-->20
CY-->3P
CY-->59
CY-->ED
D0-->CO
D0-->D8
D0-->B
D0-->20
D0-->ED
D0-->FP
D2-->CO
D2-->D9
D2-->CT
D2-->ED
D2-->FP
D4-->CO
D4-->D8
D4-->D9
D4-->CW
D4-->CY
D4-->D0
D4-->D2
D4-->D6
D4-->B
D4-->Q
D4-->20
D4-->3T
D4-->59
D4-->ED
D4-->FP
D6-->20
D6-->3T
D6-->ED
D6-->FP
D7-->DA
D8-->Q
D8-->3T
D9-->Q
DA-->D4
DH-->DD
DH-->DE
DH-->DG
DH-->DI
DH-->DJ
DJ-->FP
DM-->DS
DM-->E6
DM-->E8
DM-->EF
DM-->F7
DM-->Q
DM-->FP
DO-->FP
DQ-->FP
DS-->FP
DU-->FP
DW-->DS
DW-->EH
DW-->EL
DW-->F7
DY-->FP
E0-->DS
E0-->E4
E0-->FP
E2-->FP
E4-->FP
E6-->EA
E6-->F7
E8-->FP
EA-->FP
ED-->DM
ED-->DO
ED-->DQ
ED-->DS
ED-->DU
ED-->DW
ED-->DY
ED-->E0
ED-->E2
ED-->E4
ED-->E6
ED-->E8
ED-->EA
ED-->EC
ED-->EF
ED-->EH
ED-->EJ
ED-->EL
ED-->EN
ED-->EP
ED-->ER
ED-->ET
ED-->EV
ED-->EX
ED-->EZ
ED-->F1
ED-->F3
ED-->F5
ED-->F7
EF-->FP
EH-->FP
EJ-->EA
EL-->FP
EN-->EA
EN-->F7
EP-->DS
EP-->EA
EP-->F7
EP-->FP
ER-->FP
ET-->FP
EV-->DS
EV-->20
EX-->DM
EX-->DS
EX-->EA
EX-->ER
EX-->F7
EX-->Q
EX-->FP
EZ-->FP
F1-->ET
F1-->F7
F1-->FP
F3-->FP
F5-->FP
F7-->FP
F9-->FH
FC-->FM
FF-->FM
FG-->FH
FH-->FM
FL-->FM
FP-->F9
FP-->FA
FP-->FB
FP-->FC
FP-->FD
FP-->FE
FP-->FF
FP-->FH
FP-->FG
FP-->FI
FP-->FJ
FP-->FK
FP-->FM
FP-->FN
FP-->FO
FP-->FQ
FP-->FR
FP-->FS
FP-->FT
FP-->FU
FP-->FV
FP-->FW
FP-->FX
FP-->FY
FP-->FZ
FP-->G0
FP-->G1
FP-->G2
FP-->G6
FP-->G7
FS-->FM
FV-->FF
FV-->FW
FW-->FF
FZ-->FC
```
