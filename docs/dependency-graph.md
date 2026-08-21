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
- 400 leaf nodes, 1208 edges.
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
subgraph BH["loan-form"]
BI["loan-form.component.ts"]
end
subgraph BJ["loans-overview"]
BK["loans-overview.component.ts"]
end
end
BL["index.ts"]
BM["loan-types.ts"]
BN["loans.routes.ts"]
BO["loans.store.ts"]
end
subgraph BP["feature-recurring"]
BQ["bills-calendar-vm.ts"]
subgraph BR["components"]
subgraph BS["bills-calendar"]
BT["bills-calendar.component.ts"]
end
subgraph BU["bills-day-list"]
BV["bills-day-list.component.ts"]
end
subgraph BW["bills-month-grid"]
BX["bills-month-grid.component.ts"]
end
BY["index.ts"]
subgraph BZ["recurring-overview"]
C0["recurring-overview.component.ts"]
end
subgraph C1["recurring-payments-panel"]
C2["recurring-payments-panel.component.ts"]
end
end
C3["index.ts"]
C4["recurring-payments-row-vm.ts"]
C5["recurring-series.store.ts"]
C6["recurring.routes.ts"]
end
subgraph C7["feature-settings"]
subgraph C8["components"]
C9["index.ts"]
subgraph CA["settings-about-section"]
CB["settings-about-section.component.ts"]
end
subgraph CC["settings-currency-locale-section"]
CD["settings-currency-locale-section.component.ts"]
end
subgraph CE["settings-data-section"]
CF["settings-data-section.component.ts"]
end
subgraph CG["settings-overview"]
CH["settings-overview.component.ts"]
end
subgraph CI["settings-privacy-section"]
CJ["settings-privacy-section.component.ts"]
end
subgraph CK["settings-reporting-section"]
CL["settings-reporting-section.component.ts"]
end
subgraph CM["settings-theme-section"]
CN["settings-theme-section.component.ts"]
end
end
CO["index.ts"]
CP["settings.routes.ts"]
end
subgraph CQ["feature-transactions"]
CR["category-picker.ts"]
subgraph CS["components"]
subgraph CT["attribution-override-fieldset"]
CU["attribution-override-fieldset.component.ts"]
end
subgraph CV["category-select-cell"]
CW["category-select-cell.component.ts"]
end
CX["index.ts"]
subgraph CY["transaction-bulk-bar"]
CZ["transaction-bulk-bar.component.ts"]
end
subgraph D0["transaction-edit-form"]
D1["transaction-edit-form.component.ts"]
end
subgraph D2["transaction-filters"]
D3["transaction-filters.component.ts"]
end
subgraph D4["transaction-row"]
D5["transaction-row.component.ts"]
end
subgraph D6["transactions-overview"]
D7["transactions-overview.component.ts"]
end
subgraph D8["transfer-review"]
D9["transfer-review.component.ts"]
end
end
DA["index.ts"]
DB["transaction-filters.ts"]
DC["transaction-row-vm.ts"]
DD["transactions.routes.ts"]
end
subgraph DE["shared"]
subgraph DF["echarts"]
DG["bucketed-axis-option.ts"]
DH["chart-theme.ts"]
DI["echarts-jsdom.testing.ts"]
DJ["echarts-setup.ts"]
DK["index.ts"]
DL["legend-option.ts"]
DM["tooltip-formatter.ts"]
end
subgraph DN["ui"]
subgraph DO["absolute-range-panel"]
DP["absolute-range-panel.component.ts"]
end
subgraph DQ["alert"]
DR["alert.component.ts"]
end
subgraph DS["badge"]
DT["badge.component.ts"]
end
subgraph DU["button"]
DV["button.component.ts"]
end
subgraph DW["collapse"]
DX["collapse.component.ts"]
end
subgraph DY["confirm-dialog"]
DZ["confirm-dialog.component.ts"]
end
subgraph E0["cycle-picker"]
E1["cycle-picker.component.ts"]
end
subgraph E2["date-range-input"]
E3["date-range-input.component.ts"]
end
subgraph E4["divider"]
E5["divider.component.ts"]
end
subgraph E6["dropdown"]
E7["dropdown.component.ts"]
end
subgraph E8["empty-state"]
E9["empty-state.component.ts"]
end
subgraph EA["fieldset"]
EB["fieldset.component.ts"]
end
subgraph EC["flex"]
ED["flex.component.ts"]
end
subgraph EE["granularity-picker"]
EF["granularity-picker.component.ts"]
end
EG["index.ts"]
subgraph EH["input"]
EI["input.component.ts"]
end
subgraph EJ["label"]
EK["label.component.ts"]
end
subgraph EL["loading-skeleton"]
EM["loading-skeleton.component.ts"]
end
subgraph EN["modal"]
EO["mm-modal.component.ts"]
end
subgraph EP["page-header"]
EQ["page-header.component.ts"]
end
subgraph ER["paginator"]
ES["paginator.component.ts"]
end
subgraph ET["paper"]
EU["paper.component.ts"]
end
subgraph EV["privacy-blur"]
EW["privacy-blur.component.ts"]
end
subgraph EX["privacy-toggle"]
EY["privacy-toggle.component.ts"]
end
subgraph EZ["range-picker"]
F0["range-picker.component.ts"]
end
subgraph F1["select"]
F2["select.component.ts"]
end
subgraph F3["stat-card"]
F4["stat-card.component.ts"]
end
subgraph F5["table"]
F6["table.component.ts"]
end
subgraph F7["tabs"]
F8["tabs.component.ts"]
end
subgraph F9["typography"]
FA["typography.component.ts"]
end
end
subgraph FB["utils"]
FC["calendar-cycles.ts"]
FD["confidence-color.ts"]
FE["confirm-state.ts"]
FF["currency-format.ts"]
FG["currency-symbol-presets.ts"]
FH["daisy-classes.ts"]
FI["date-buckets.ts"]
FJ["date-format.pipe.ts"]
FK["date-format.ts"]
FL["debounced-text.ts"]
FM["download-json.ts"]
FN["fingerprint.ts"]
FO["format-settings.testing.ts"]
FP["format-settings.ts"]
FQ["hidden-amount.ts"]
FR["iban.ts"]
FS["index.ts"]
FT["link-control-to-setting.ts"]
FU["locale-presets.ts"]
FV["number-format.ts"]
FW["pagination.ts"]
FX["percentage.ts"]
FY["quick-ranges.ts"]
FZ["range-expression.ts"]
G0["search-params.ts"]
G1["selection-model.ts"]
G2["signed-amount.pipe.ts"]
G3["sortable.ts"]
G4["structural-filters.ts"]
G5["theme-hooks.ts"]
subgraph G6["validators"]
G7["iban.validator.ts"]
G8["percentage.validator.ts"]
end
G9["with-archivable.ts"]
GA["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3T
5-->4
5-->6
6-->Q
6-->FS
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
G-->FN
G-->FP
H-->G
H-->3K
H-->FS
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
Z-->FS
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
16-->FS
17-->Z
17-->10
17-->11
17-->13
17-->14
17-->15
17-->16
1A-->20
1A-->DV
1A-->FA
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
1T-->FS
1U-->Q
1U-->3K
1U-->FS
1V-->23
1V-->Q
1V-->FS
1W-->1X
1W-->2V
1W-->DK
1W-->FS
1X-->2V
1X-->DK
1X-->FS
1Y-->Q
1Y-->2V
1Z-->Q
1Z-->FS
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
21-->FS
22-->1U
22-->FS
23-->Q
23-->3P
23-->3T
24-->Q
25-->23
25-->24
25-->Q
25-->3T
27-->Q
27-->FS
28-->27
28-->Q
28-->FS
29-->2B
29-->2Q
29-->FS
2A-->2H
2A-->Q
2B-->2A
2B-->Q
2B-->FS
2C-->2A
2C-->2H
2C-->Q
2C-->FS
2D-->2H
2D-->Q
2E-->Q
2F-->2A
2F-->33
2F-->Q
2G-->FS
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
2K-->FS
2L-->Q
2M-->Q
2M-->FS
2N-->FS
2O-->2P
2P-->2Q
2P-->Q
2Q-->2B
2Q-->Q
2Q-->FS
2R-->2S
2R-->2U
2R-->3B
2R-->Q
2S-->2B
2S-->2Q
2S-->FS
2T-->2Q
2T-->3D
2T-->FS
2U-->2B
2U-->2K
2U-->2Q
2U-->FS
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
2Y-->FS
2Z-->3E
31-->FS
32-->2H
32-->Q
33-->FS
34-->FS
35-->2H
35-->B
35-->Q
35-->FS
36-->35
36-->FS
37-->Q
37-->FS
38-->32
38-->Q
38-->FS
39-->2A
39-->2D
39-->Q
3A-->Q
3A-->3T
3B-->2P
3C-->2H
3C-->Q
3C-->FS
3D-->32
3D-->Q
3E-->2B
3E-->Q
3E-->FS
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
3X-->FS
3Z-->Q
40-->Q
41-->Q
42-->Q
43-->4I
43-->4K
43-->DK
44-->2V
44-->FS
45-->Q
45-->20
45-->2V
45-->FS
48-->EG
48-->FS
4A-->44
4A-->45
4A-->Q
4A-->2V
4A-->DK
4A-->EG
4A-->FS
4C-->44
4C-->45
4C-->Q
4C-->20
4C-->2V
4C-->DK
4C-->EG
4E-->3Z
4E-->40
4E-->48
4E-->EG
4G-->40
4G-->42
4G-->Q
4G-->EG
4G-->FS
4G-->G7
4G-->G8
4I-->48
4I-->4A
4I-->4G
4I-->20
4I-->EG
4I-->FS
4K-->3Z
4K-->40
4K-->41
4K-->4C
4K-->4E
4K-->4G
4K-->Q
4K-->20
4K-->EG
4K-->FS
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
4S-->EG
4V-->4P
4V-->4S
4V-->4X
4V-->B
4V-->Q
4V-->20
4V-->EG
4V-->FS
4X-->4P
4X-->Q
4X-->EG
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
50-->EG
52-->5B
52-->20
52-->EG
52-->FS
54-->5A
54-->50
54-->B
54-->Q
54-->20
54-->EG
56-->5D
56-->5F
56-->EG
56-->FS
58-->5B
58-->5E
58-->5F
58-->52
58-->54
58-->56
58-->Q
58-->20
58-->EG
58-->FS
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
5F-->FS
5H-->5M
5K-->EG
5M-->5P
5M-->5Q
5M-->5R
5M-->5S
5M-->5K
5M-->EG
5N-->5M
5R-->5P
5S-->5Q
5T-->5H
5T-->5N
5V-->Q
5Z-->20
5Z-->EG
5Z-->FS
61-->20
61-->3T
61-->EG
61-->FS
63-->6R
63-->20
63-->2V
63-->DK
63-->EG
63-->FS
65-->5V
65-->5W
65-->6R
65-->67
65-->69
65-->20
65-->EG
65-->FS
67-->20
67-->EG
69-->5W
69-->EG
6B-->6N
6B-->6O
6B-->Q
6B-->EG
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
6D-->EG
6D-->FS
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
6G-->DK
6G-->EG
6G-->FS
6I-->6R
6I-->20
6I-->EG
6I-->FS
6K-->20
6K-->2V
6K-->3T
6K-->DK
6K-->EG
6K-->FS
6M-->6R
6M-->20
6M-->EG
6M-->FS
6N-->6O
6N-->Q
6O-->Q
6P-->6D
6P-->DK
6Q-->6E
6Q-->6P
6R-->5V
6R-->20
6R-->2V
6R-->3T
6V-->Q
6V-->3G
6V-->EG
6V-->FS
6W-->6V
6X-->6W
71-->74
71-->76
71-->20
71-->EG
72-->71
72-->74
72-->76
74-->20
74-->2V
74-->DK
74-->EG
74-->FS
76-->Q
76-->20
76-->2V
76-->3T
76-->DK
76-->EG
76-->FS
77-->71
77-->DK
78-->72
78-->77
7C-->7T
7C-->7V
7C-->Q
7C-->20
7C-->2V
7C-->EG
7C-->FS
7E-->7U
7E-->EG
7G-->7C
7G-->7M
7G-->7P
7G-->EG
7I-->Q
7I-->EG
7K-->7X
7K-->EG
7M-->7U
7M-->7V
7M-->7X
7M-->7E
7M-->7I
7M-->7K
7M-->Q
7M-->20
7M-->EG
7M-->FS
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
7P-->EG
7P-->FS
7R-->80
7S-->Q
7T-->Q
7T-->2V
7T-->EG
7T-->FS
7U-->7S
7U-->Q
7U-->2V
7U-->EG
7U-->FS
7V-->Q
7V-->20
7V-->2V
7V-->3T
7W-->7G
7W-->DK
7X-->Q
7X-->2V
7X-->EG
7X-->FS
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
7Z-->DK
7Z-->FS
84-->8D
84-->EG
86-->8E
86-->88
86-->EG
88-->8E
88-->EG
8A-->8E
8A-->EG
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
8K-->EG
8L-->8K
8M-->8K
8N-->8L
8N-->8M
8P-->Q
8S-->9L
8S-->4M
8S-->EG
8U-->EG
8W-->90
8W-->EG
8Y-->90
8Y-->EG
90-->EG
92-->8P
92-->90
92-->EG
94-->9P
94-->EG
96-->8P
96-->EG
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
98-->EG
9A-->17
9A-->EG
9A-->FS
9C-->9L
9C-->9Q
9C-->9J
9C-->Q
9C-->17
9C-->EG
9E-->Q
9E-->EG
9G-->9M
9G-->8U
9G-->98
9G-->9C
9G-->9E
9G-->20
9G-->EG
9H-->98
9H-->9A
9H-->9C
9H-->9E
9H-->9G
9J-->9L
9J-->8S
9J-->Q
9J-->EG
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
9V-->EG
9V-->FS
9X-->AQ
9X-->EG
9Z-->EG
A1-->AR
A1-->AS
A1-->AU
A1-->20
A1-->2V
A1-->EG
A3-->AU
A3-->3K
A3-->DK
A3-->EG
A5-->AP
A5-->AU
A5-->9Z
A5-->20
A5-->2V
A5-->DK
A5-->EG
A5-->FS
A7-->AS
A7-->AU
A7-->20
A7-->2V
A7-->EG
A7-->FS
A9-->20
A9-->8G
A9-->EG
AB-->AQ
AB-->AU
AB-->EG
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
AD-->DK
AD-->EG
AD-->FS
AF-->AQ
AF-->AU
AF-->9V
AF-->9X
AF-->A3
AF-->AB
AF-->EG
AH-->AU
AH-->20
AH-->2V
AH-->3T
AH-->DK
AH-->EG
AH-->FS
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
AK-->EG
AM-->AS
AM-->AU
AM-->AW
AM-->AX
AM-->EG
AM-->FS
AO-->AU
AO-->AW
AO-->AX
AO-->AM
AO-->Q
AO-->EG
AP-->2V
AP-->DK
AP-->FS
AQ-->Q
AR-->AS
AR-->Q
AR-->2V
AR-->EG
AR-->FS
AS-->FS
AT-->AD
AT-->AF
AT-->AK
AT-->DK
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
B2-->EG
B4-->BD
B4-->59
B4-->EG
B6-->BD
B6-->1J
B6-->20
B6-->59
B6-->EG
B8-->Q
B8-->1J
B8-->20
B8-->59
B8-->EG
B8-->FS
BA-->Q
BA-->20
BA-->59
BA-->EG
BA-->FS
BB-->B0
BB-->BC
BC-->B2
BD-->59
BD-->EG
BG-->BI
BG-->BK
BI-->BM
BI-->Q
BI-->20
BI-->EG
BI-->G8
BK-->BO
BK-->BI
BK-->Q
BK-->EG
BL-->BG
BL-->BM
BL-->BN
BL-->BO
BM-->Q
BN-->BK
BO-->Q
BO-->FS
BQ-->EG
BT-->BQ
BT-->C5
BT-->BV
BT-->BX
BT-->20
BT-->2V
BT-->EG
BT-->FS
BV-->BQ
BV-->EG
BX-->BQ
BX-->EG
BY-->BT
BY-->BV
BY-->BX
BY-->C0
BY-->C2
C0-->BT
C0-->C2
C0-->20
C0-->EG
C2-->C4
C2-->C5
C2-->20
C2-->2V
C2-->DK
C2-->EG
C2-->FS
C3-->BY
C3-->C6
C5-->20
C5-->2V
C5-->3T
C6-->C0
C9-->CH
CB-->1E
CB-->EG
CD-->20
CD-->EG
CD-->FS
CF-->6X
CF-->EG
CH-->CB
CH-->CD
CH-->CF
CH-->CJ
CH-->CL
CH-->CN
CH-->EG
CJ-->20
CJ-->EG
CJ-->FS
CL-->20
CL-->EG
CL-->FS
CN-->20
CN-->3K
CN-->EG
CO-->C9
CO-->CP
CP-->CH
CR-->Q
CU-->Q
CU-->20
CU-->3P
CU-->EG
CU-->FS
CW-->CR
CX-->CZ
CX-->D1
CX-->D3
CX-->D7
CX-->D9
CZ-->CR
CZ-->B
CZ-->20
CZ-->EG
D1-->CR
D1-->CU
D1-->B
D1-->Q
D1-->20
D1-->3P
D1-->59
D1-->EG
D3-->CR
D3-->DB
D3-->B
D3-->20
D3-->EG
D3-->FS
D5-->CR
D5-->DC
D5-->CW
D5-->EG
D5-->FS
D7-->CR
D7-->DB
D7-->DC
D7-->CZ
D7-->D1
D7-->D3
D7-->D5
D7-->D9
D7-->B
D7-->Q
D7-->20
D7-->3T
D7-->59
D7-->EG
D7-->FS
D9-->20
D9-->3T
D9-->EG
D9-->FS
DA-->DD
DB-->Q
DB-->3T
DC-->Q
DD-->D7
DK-->DG
DK-->DH
DK-->DJ
DK-->DL
DK-->DM
DM-->FS
DP-->DV
DP-->E9
DP-->EB
DP-->EI
DP-->FA
DP-->Q
DP-->FS
DR-->FS
DT-->FS
DV-->FS
DX-->FS
DZ-->DV
DZ-->EK
DZ-->EO
DZ-->FA
E1-->FS
E3-->DV
E3-->E7
E3-->FS
E5-->FS
E7-->FS
E9-->ED
E9-->FA
EB-->FS
ED-->FS
EG-->DP
EG-->DR
EG-->DT
EG-->DV
EG-->DX
EG-->DZ
EG-->E1
EG-->E3
EG-->E5
EG-->E7
EG-->E9
EG-->EB
EG-->ED
EG-->EF
EG-->EI
EG-->EK
EG-->EM
EG-->EO
EG-->EQ
EG-->ES
EG-->EU
EG-->EW
EG-->EY
EG-->F0
EG-->F2
EG-->F4
EG-->F6
EG-->F8
EG-->FA
EI-->FS
EK-->FS
EM-->ED
EO-->FS
EQ-->ED
EQ-->FA
ES-->DV
ES-->ED
ES-->FA
ES-->FS
EU-->FS
EW-->FS
EY-->DV
EY-->20
F0-->DP
F0-->DV
F0-->ED
F0-->EU
F0-->FA
F0-->Q
F0-->FS
F2-->FS
F4-->EW
F4-->FA
F4-->FS
F6-->FS
F8-->FS
FA-->FS
FC-->FK
FF-->FP
FI-->FP
FJ-->FK
FK-->FP
FO-->FP
FS-->FC
FS-->FD
FS-->FE
FS-->FF
FS-->FG
FS-->FH
FS-->FI
FS-->FK
FS-->FJ
FS-->FL
FS-->FM
FS-->FN
FS-->FP
FS-->FQ
FS-->FR
FS-->FT
FS-->FU
FS-->FV
FS-->FW
FS-->FX
FS-->FY
FS-->FZ
FS-->G0
FS-->G1
FS-->G2
FS-->G3
FS-->G4
FS-->G5
FS-->G9
FS-->GA
FV-->FP
FY-->FI
FY-->FZ
FZ-->FI
G2-->FF
```
