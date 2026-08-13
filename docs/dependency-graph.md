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
- 388 leaf nodes, 1162 edges.
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
R["mapping-profiles.repository.ts"]
S["rules.repository.ts"]
T["salary-metadata.repository.ts"]
U["transactions.repository.ts"]
V["transfer-settings.repository.ts"]
W["transfers.repository.ts"]
end
subgraph X["import"]
Y["account-detection.ts"]
Z["csv-import.service.ts"]
10["csv-parse.ts"]
11["csv-parse.worker.ts"]
12["csv-row-mapper.ts"]
13["csv-worker.types.ts"]
14["delimiter-guess.ts"]
15["import.service.ts"]
16["index.ts"]
end
subgraph 17["layout"]
subgraph 18["app-shell"]
19["app-shell.component.ts"]
end
1A["index.ts"]
end
subgraph 1B["links"]
1C["external-links.ts"]
1D["index.ts"]
end
subgraph 1E["ml"]
1F["category-model.worker.ts"]
1G["category-model.worker.types.ts"]
1H["feature-hashing.ts"]
1I["index.ts"]
1J["model-config.ts"]
1K["rule-proposal-mining.ts"]
1L["training-window.ts"]
end
subgraph 1M["onboarding"]
1N["home-redirect.guard.ts"]
1O["index.ts"]
1P["mark-visited.guard.ts"]
1Q["visited.service.ts"]
end
subgraph 1R["state"]
1S["accounts.store.ts"]
1T["app-settings.store.ts"]
1U["categories.store.ts"]
1V["chart-options-control.ts"]
1W["chart-options.store.ts"]
1X["forecast-settings.store.ts"]
1Y["goals.store.ts"]
1Z["index.ts"]
20["page-range-control.ts"]
21["range-state.store.ts"]
22["transactions.store.ts"]
23["transfer-settings.store.ts"]
24["transfers.store.ts"]
end
subgraph 25["stats"]
26["account-balance-history.ts"]
27["account-balance-trend.ts"]
28["annual-lump-sum-smoothing.ts"]
29["category-breakdown.ts"]
2A["category-composition-trend.ts"]
2B["category-cycle-heatmap.ts"]
2C["category-expense-transactions.ts"]
2D["category-kind-contribution.ts"]
2E["category-period-comparison.ts"]
2F["chart-zoom-window.ts"]
2G["classify-for-stats.ts"]
2H["classify-joint-leg.ts"]
2I["day-transactions.ts"]
2J["embedded-bonus-smoothing.ts"]
2K["full-history-range.ts"]
2L["goal-affordability.ts"]
2M["granularity-for-span.ts"]
2N["gross-net-growth.ts"]
2O["gross-net-ratio.ts"]
2P["income-category-series.ts"]
2Q["income-events.ts"]
2R["income-gap-detection.ts"]
2S["income-growth.ts"]
2T["income-step-change-detection.ts"]
2U["index.ts"]
2V["joint-account-stake.ts"]
2W["joint-contributor-breakdown.ts"]
2X["money-flow-graph.ts"]
2Y["multi-year-income-comparison.ts"]
2Z["net-margin.ts"]
30["net-worth-projection.ts"]
31["period-stats.ts"]
32["period-window.ts"]
33["periodized-rate.ts"]
34["recurring-payments.ts"]
35["recurring-projection.ts"]
36["required-saving-rate.ts"]
37["saving-velocity.ts"]
38["spending-mosaic.ts"]
39["top-transactions.ts"]
3A["wage-change-detection.ts"]
3B["weekday-weekend-split.ts"]
3C["year-over-year.ts"]
3D["yearly-income-summary.ts"]
end
subgraph 3E["storage"]
3F["index.ts"]
3G["storage-status.service.ts"]
end
subgraph 3H["theme"]
3I["accent-colors.ts"]
3J["index.ts"]
3K["theme-styles.ts"]
3L["theme.service.ts"]
end
subgraph 3M["transactions"]
3N["attribution-override.ts"]
3O["index.ts"]
3P["nullify-transaction.ts"]
3Q["transaction-deletion.service.ts"]
end
subgraph 3R["transfers"]
3S["index.ts"]
3T["transfer-cleanup.service.ts"]
3U["transfer-linking.service.ts"]
3V["transfer-matching.service.ts"]
3W["transfer-matching.ts"]
end
end
subgraph 3X["feature-accounts"]
3Y["account-card-vm.ts"]
3Z["account-icons.ts"]
40["account-list-order.ts"]
41["account-types.ts"]
42["accounts.routes.ts"]
43["balance-day-tooltip.ts"]
44["balance-trend-signals.ts"]
subgraph 45["components"]
subgraph 46["account-balance-block"]
47["account-balance-block.component.ts"]
end
subgraph 48["account-balance-chart"]
49["account-balance-chart.component.ts"]
end
subgraph 4A["account-balance-history-chart"]
4B["account-balance-history-chart.component.ts"]
end
subgraph 4C["account-card"]
4D["account-card.component.ts"]
end
subgraph 4E["account-form"]
4F["account-form.component.ts"]
end
subgraph 4G["accounts-detail"]
4H["accounts-detail.component.ts"]
end
subgraph 4I["accounts-overview"]
4J["accounts-overview.component.ts"]
end
4K["index.ts"]
end
4L["index.ts"]
end
subgraph 4M["feature-categories"]
4N["categories.routes.ts"]
4O["category-icons.ts"]
4P["category-model.service.ts"]
4Q["category-model.store.ts"]
4R["category-row-vm.ts"]
subgraph 4S["components"]
subgraph 4T["categories-overview"]
4U["categories-overview.component.ts"]
end
subgraph 4V["category-form"]
4W["category-form.component.ts"]
end
4X["index.ts"]
subgraph 4Y["rule-condition-row"]
4Z["rule-condition-row.component.ts"]
end
subgraph 50["rule-filters"]
51["rule-filters.component.ts"]
end
subgraph 52["rule-form"]
53["rule-form.component.ts"]
end
subgraph 54["rule-share-bar"]
55["rule-share-bar.component.ts"]
end
subgraph 56["rules-overview"]
57["rules-overview.component.ts"]
end
end
58["index.ts"]
59["rule-condition-editor.ts"]
5A["rule-filters.ts"]
5B["rule-labels.ts"]
5C["rule-share.ts"]
5D["rule-summary.ts"]
5E["rules.store.ts"]
end
subgraph 5F["feature-changelog"]
5G["changelog.routes.ts"]
subgraph 5H["components"]
subgraph 5I["changelog-entry-row"]
5J["changelog-entry-row.component.ts"]
end
subgraph 5K["changelog-page"]
5L["changelog-page.component.ts"]
end
5M["index.ts"]
end
subgraph 5N["data"]
5O["changelog-entries.ts"]
5P["roadmap-entries.ts"]
end
5Q["group-changelog-entries.ts"]
5R["group-roadmap-entries.ts"]
5S["index.ts"]
end
subgraph 5T["feature-dashboard"]
5U["category-comparison-settings.store.ts"]
5V["category-comparison-vm.ts"]
subgraph 5W["components"]
subgraph 5X["account-balance-strip"]
5Y["account-balance-strip.component.ts"]
end
subgraph 5Z["action-queue-panel"]
60["action-queue-panel.component.ts"]
end
subgraph 61["category-breakdown-panel"]
62["category-breakdown-panel.component.ts"]
end
subgraph 63["category-comparison-panel"]
64["category-comparison-panel.component.ts"]
end
subgraph 65["category-exclusion-dropdown"]
66["category-exclusion-dropdown.component.ts"]
end
subgraph 67["comparison-category-card"]
68["comparison-category-card.component.ts"]
end
subgraph 69["dashboard-customize-panel"]
6A["dashboard-customize-panel.component.ts"]
end
subgraph 6B["dashboard-overview"]
6C["dashboard-overview.component.ts"]
end
6D["index.ts"]
subgraph 6E["spending-heatmap-panel"]
6F["spending-heatmap-panel.component.ts"]
end
subgraph 6G["top-transactions-panel"]
6H["top-transactions-panel.component.ts"]
end
subgraph 6I["trend-chart-panel"]
6J["trend-chart-panel.component.ts"]
end
subgraph 6K["weekday-weekend-split-panel"]
6L["weekday-weekend-split-panel.component.ts"]
end
end
6M["dashboard-layout-settings.store.ts"]
6N["dashboard-row-order.ts"]
6O["dashboard.routes.ts"]
6P["index.ts"]
6Q["stats.store.ts"]
end
subgraph 6R["feature-data-management"]
subgraph 6S["components"]
subgraph 6T["data-management-overview"]
6U["data-management-overview.component.ts"]
end
6V["index.ts"]
end
6W["index.ts"]
end
subgraph 6X["feature-explore"]
subgraph 6Y["components"]
subgraph 6Z["explore-overview"]
70["explore-overview.component.ts"]
end
71["index.ts"]
subgraph 72["money-flow-panel"]
73["money-flow-panel.component.ts"]
end
subgraph 74["spending-mosaic-panel"]
75["spending-mosaic-panel.component.ts"]
end
end
76["explore.routes.ts"]
77["index.ts"]
end
subgraph 78["feature-future"]
subgraph 79["components"]
subgraph 7A["forecast-controls"]
7B["forecast-controls.component.ts"]
end
subgraph 7C["forecast-notice"]
7D["forecast-notice.component.ts"]
end
subgraph 7E["future-overview"]
7F["future-overview.component.ts"]
end
subgraph 7G["goal-form"]
7H["goal-form.component.ts"]
end
subgraph 7I["goal-row"]
7J["goal-row.component.ts"]
end
subgraph 7K["goals-panel"]
7L["goals-panel.component.ts"]
end
7M["index.ts"]
subgraph 7N["net-worth-projection-chart"]
7O["net-worth-projection-chart.component.ts"]
end
subgraph 7P["projection-figure-table"]
7Q["projection-figure-table.component.ts"]
end
end
7R["forecast-chart-copy.ts"]
7S["forecast-controls-vm.ts"]
7T["forecast-notices.ts"]
7U["forecast.store.ts"]
7V["future.routes.ts"]
7W["goal-row-vm.ts"]
7X["index.ts"]
7Y["net-worth-projection-chart-option.ts"]
7Z["projection-accessible-row.ts"]
end
subgraph 80["feature-help"]
subgraph 81["components"]
subgraph 82["faq-page"]
83["faq-page.component.ts"]
end
subgraph 84["guide-detail"]
85["guide-detail.component.ts"]
end
subgraph 86["guide-steps"]
87["guide-steps.component.ts"]
end
subgraph 88["guides-index"]
89["guides-index.component.ts"]
end
8A["index.ts"]
end
subgraph 8B["data"]
8C["faq.ts"]
8D["guides.ts"]
end
8E["help.routes.ts"]
8F["index.ts"]
end
subgraph 8G["feature-home"]
subgraph 8H["components"]
subgraph 8I["home-landing"]
8J["home-landing.component.ts"]
end
8K["index.ts"]
end
8L["home.routes.ts"]
8M["index.ts"]
end
subgraph 8N["feature-import"]
8O["column-mapping.ts"]
subgraph 8P["components"]
subgraph 8Q["account-draft-editor"]
8R["account-draft-editor.component.ts"]
end
subgraph 8S["batch-wait-card"]
8T["batch-wait-card.component.ts"]
end
subgraph 8U["column-map-amount-field"]
8V["column-map-amount-field.component.ts"]
end
subgraph 8W["column-map-counterparty-field"]
8X["column-map-counterparty-field.component.ts"]
end
subgraph 8Y["column-map-sample-caption"]
8Z["column-map-sample-caption.component.ts"]
end
subgraph 90["column-map-simple-field"]
91["column-map-simple-field.component.ts"]
end
subgraph 92["column-map-stepper"]
93["column-map-stepper.component.ts"]
end
subgraph 94["column-map-summary-step"]
95["column-map-summary-step.component.ts"]
end
subgraph 96["import-map-step"]
97["import-map-step.component.ts"]
end
subgraph 98["import-preview-step"]
99["import-preview-step.component.ts"]
end
subgraph 9A["import-select-step"]
9B["import-select-step.component.ts"]
end
subgraph 9C["import-summary-step"]
9D["import-summary-step.component.ts"]
end
subgraph 9E["import-wizard"]
9F["import-wizard.component.ts"]
end
9G["index.ts"]
subgraph 9H["queued-file-row"]
9I["queued-file-row.component.ts"]
end
end
9J["import-batches.store.ts"]
9K["import-queue.ts"]
9L["import-wizard-session.ts"]
9M["import.routes.ts"]
9N["index.ts"]
9O["mapper-steps.ts"]
9P["mapping-profiles.store.ts"]
end
subgraph 9Q["feature-income"]
9R["career-start-date.ts"]
subgraph 9S["components"]
subgraph 9T["income-career-start"]
9U["income-career-start.component.ts"]
end
subgraph 9V["income-category-checklist"]
9W["income-category-checklist.component.ts"]
end
subgraph 9X["income-chart-cell"]
9Y["income-chart-cell.component.ts"]
end
subgraph 9Z["income-events-sidebar"]
A0["income-events-sidebar.component.ts"]
end
subgraph A1["income-gross-color"]
A2["income-gross-color.component.ts"]
end
subgraph A3["income-gross-net-section"]
A4["income-gross-net-section.component.ts"]
end
subgraph A5["income-growth-panel"]
A6["income-growth-panel.component.ts"]
end
subgraph A7["income-intro"]
A8["income-intro.component.ts"]
end
subgraph A9["income-main-category"]
AA["income-main-category.component.ts"]
end
subgraph AB["income-overview"]
AC["income-overview.component.ts"]
end
subgraph AD["income-settings-page"]
AE["income-settings-page.component.ts"]
end
subgraph AF["income-yearly-panel"]
AG["income-yearly-panel.component.ts"]
end
AH["index.ts"]
subgraph AI["salary-details-page"]
AJ["salary-details-page.component.ts"]
end
subgraph AK["salary-metadata-table"]
AL["salary-metadata-table.component.ts"]
end
subgraph AM["salary-month-modal"]
AN["salary-month-modal.component.ts"]
end
end
AO["gross-net-chart-options.ts"]
AP["income-category-vm.ts"]
AQ["income-event-vm.ts"]
AR["income-granularity.ts"]
AS["income.routes.ts"]
AT["income.store.ts"]
AU["index.ts"]
AV["salary-metadata-edit.ts"]
AW["salary-metadata-rows.ts"]
end
subgraph AX["feature-learning"]
subgraph AY["components"]
AZ["index.ts"]
subgraph B0["learning-overview"]
B1["learning-overview.component.ts"]
end
subgraph B2["model-status-badge"]
B3["model-status-badge.component.ts"]
end
subgraph B4["model-status"]
B5["model-status.component.ts"]
end
subgraph B6["rule-proposals"]
B7["rule-proposals.component.ts"]
end
subgraph B8["suggestions-table"]
B9["suggestions-table.component.ts"]
end
end
BA["index.ts"]
BB["learning.routes.ts"]
BC["model-status-display.ts"]
end
subgraph BD["feature-recurring"]
BE["bills-calendar-vm.ts"]
subgraph BF["components"]
subgraph BG["bills-calendar"]
BH["bills-calendar.component.ts"]
end
subgraph BI["bills-day-list"]
BJ["bills-day-list.component.ts"]
end
subgraph BK["bills-month-grid"]
BL["bills-month-grid.component.ts"]
end
BM["index.ts"]
subgraph BN["recurring-overview"]
BO["recurring-overview.component.ts"]
end
subgraph BP["recurring-payments-panel"]
BQ["recurring-payments-panel.component.ts"]
end
end
BR["index.ts"]
BS["recurring-payments-row-vm.ts"]
BT["recurring-series.store.ts"]
BU["recurring.routes.ts"]
end
subgraph BV["feature-settings"]
subgraph BW["components"]
BX["index.ts"]
subgraph BY["settings-about-section"]
BZ["settings-about-section.component.ts"]
end
subgraph C0["settings-currency-locale-section"]
C1["settings-currency-locale-section.component.ts"]
end
subgraph C2["settings-data-section"]
C3["settings-data-section.component.ts"]
end
subgraph C4["settings-overview"]
C5["settings-overview.component.ts"]
end
subgraph C6["settings-privacy-section"]
C7["settings-privacy-section.component.ts"]
end
subgraph C8["settings-theme-section"]
C9["settings-theme-section.component.ts"]
end
end
CA["index.ts"]
CB["settings.routes.ts"]
end
subgraph CC["feature-transactions"]
CD["category-picker.ts"]
subgraph CE["components"]
subgraph CF["attribution-override-fieldset"]
CG["attribution-override-fieldset.component.ts"]
end
subgraph CH["category-select-cell"]
CI["category-select-cell.component.ts"]
end
CJ["index.ts"]
subgraph CK["transaction-bulk-bar"]
CL["transaction-bulk-bar.component.ts"]
end
subgraph CM["transaction-edit-form"]
CN["transaction-edit-form.component.ts"]
end
subgraph CO["transaction-filters"]
CP["transaction-filters.component.ts"]
end
subgraph CQ["transaction-row"]
CR["transaction-row.component.ts"]
end
subgraph CS["transactions-overview"]
CT["transactions-overview.component.ts"]
end
subgraph CU["transfer-review"]
CV["transfer-review.component.ts"]
end
end
CW["index.ts"]
CX["transaction-filters.ts"]
CY["transaction-row-vm.ts"]
CZ["transactions.routes.ts"]
end
subgraph D0["shared"]
subgraph D1["echarts"]
D2["bucketed-axis-option.ts"]
D3["chart-theme.ts"]
D4["echarts-jsdom.testing.ts"]
D5["echarts-setup.ts"]
D6["index.ts"]
D7["legend-option.ts"]
D8["tooltip-formatter.ts"]
end
subgraph D9["ui"]
subgraph DA["alert"]
DB["alert.component.ts"]
end
subgraph DC["badge"]
DD["badge.component.ts"]
end
subgraph DE["button"]
DF["button.component.ts"]
end
subgraph DG["collapse"]
DH["collapse.component.ts"]
end
subgraph DI["confirm-dialog"]
DJ["confirm-dialog.component.ts"]
end
subgraph DK["cycle-picker"]
DL["cycle-picker.component.ts"]
end
subgraph DM["date-range-input"]
DN["date-range-input.component.ts"]
end
subgraph DO["divider"]
DP["divider.component.ts"]
end
subgraph DQ["dropdown"]
DR["dropdown.component.ts"]
end
subgraph DS["empty-state"]
DT["empty-state.component.ts"]
end
subgraph DU["fieldset"]
DV["fieldset.component.ts"]
end
subgraph DW["flex"]
DX["flex.component.ts"]
end
subgraph DY["granularity-picker"]
DZ["granularity-picker.component.ts"]
end
E0["index.ts"]
subgraph E1["input"]
E2["input.component.ts"]
end
subgraph E3["label"]
E4["label.component.ts"]
end
subgraph E5["loading-skeleton"]
E6["loading-skeleton.component.ts"]
end
subgraph E7["modal"]
E8["mm-modal.component.ts"]
end
subgraph E9["page-header"]
EA["page-header.component.ts"]
end
subgraph EB["paginator"]
EC["paginator.component.ts"]
end
subgraph ED["paper"]
EE["paper.component.ts"]
end
subgraph EF["privacy-blur"]
EG["privacy-blur.component.ts"]
end
subgraph EH["privacy-toggle"]
EI["privacy-toggle.component.ts"]
end
subgraph EJ["range-grouping-switcher"]
EK["range-grouping-switcher.component.ts"]
end
subgraph EL["select"]
EM["select.component.ts"]
end
subgraph EN["stat-card"]
EO["stat-card.component.ts"]
end
subgraph EP["table"]
EQ["table.component.ts"]
end
subgraph ER["tabs"]
ES["tabs.component.ts"]
end
subgraph ET["typography"]
EU["typography.component.ts"]
end
end
subgraph EV["utils"]
EW["calendar-cycles.ts"]
EX["confidence-color.ts"]
EY["confirm-state.ts"]
EZ["currency-format.ts"]
F0["currency-symbol-presets.ts"]
F1["daisy-classes.ts"]
F2["date-buckets.ts"]
F3["date-format.pipe.ts"]
F4["date-format.ts"]
F5["debounced-text.ts"]
F6["download-json.ts"]
F7["fingerprint.ts"]
F8["format-settings.testing.ts"]
F9["format-settings.ts"]
FA["hidden-amount.ts"]
FB["iban.ts"]
FC["index.ts"]
FD["link-control-to-setting.ts"]
FE["locale-presets.ts"]
FF["number-format.ts"]
FG["pagination.ts"]
FH["percentage.ts"]
FI["search-params.ts"]
FJ["selection-model.ts"]
FK["signed-amount.pipe.ts"]
FL["sortable.ts"]
FM["structural-filters.ts"]
FN["theme-hooks.ts"]
subgraph FO["validators"]
FP["iban.validator.ts"]
FQ["percentage.validator.ts"]
end
FR["with-archivable.ts"]
FS["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3S
5-->4
5-->6
6-->Q
6-->FC
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
G-->1J
G-->37
G-->3I
G-->F7
G-->F9
H-->G
H-->3J
H-->FC
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->2U
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
R-->G
S-->G
T-->G
U-->G
V-->G
W-->G
Y-->Q
Y-->FC
Z-->13
Z-->Q
10-->12
10-->13
11-->10
11-->13
12-->Q
13-->12
13-->Q
15-->12
15-->Q
15-->3S
15-->FC
16-->Y
16-->Z
16-->10
16-->12
16-->13
16-->14
16-->15
19-->1Z
19-->DF
19-->EU
1A-->19
1D-->1C
1F-->1G
1F-->1H
1F-->1J
1G-->1J
1H-->1J
1I-->1G
1I-->1H
1I-->1J
1I-->1K
1I-->1L
1K-->B
1K-->Q
1N-->1Q
1O-->1N
1O-->1P
1O-->1Q
1P-->1Q
1S-->1U
1S-->22
1S-->24
1S-->5
1S-->Q
1S-->2U
1S-->3S
1S-->FC
1T-->Q
1T-->3J
1T-->FC
1U-->22
1U-->Q
1U-->FC
1V-->1W
1V-->2U
1V-->D6
1V-->FC
1W-->2U
1W-->D6
1W-->FC
1X-->Q
1X-->2U
1Y-->Q
1Y-->FC
1Z-->1S
1Z-->1T
1Z-->1U
1Z-->1V
1Z-->1W
1Z-->1X
1Z-->1Y
1Z-->20
1Z-->21
1Z-->22
1Z-->23
1Z-->24
20-->1S
20-->21
20-->22
20-->2U
20-->FC
21-->FC
22-->Q
22-->3O
22-->3S
23-->Q
24-->22
24-->23
24-->Q
24-->3S
26-->Q
26-->FC
27-->26
27-->Q
27-->FC
28-->2A
28-->2P
28-->FC
29-->2G
29-->Q
2A-->29
2A-->Q
2A-->FC
2B-->29
2B-->2G
2B-->Q
2B-->FC
2C-->2G
2C-->Q
2D-->Q
2E-->29
2E-->32
2E-->Q
2F-->FC
2G-->2D
2G-->2H
2G-->Q
2G-->3S
2H-->5
2H-->Q
2I-->Q
2J-->2A
2J-->2P
2J-->Q
2J-->FC
2K-->Q
2L-->Q
2L-->FC
2M-->FC
2N-->2O
2O-->2P
2O-->Q
2P-->2A
2P-->Q
2P-->FC
2Q-->2R
2Q-->2T
2Q-->3A
2Q-->Q
2R-->2A
2R-->2P
2R-->FC
2S-->2P
2S-->3C
2S-->FC
2T-->2A
2T-->2J
2T-->2P
2T-->FC
2U-->26
2U-->27
2U-->28
2U-->29
2U-->2A
2U-->2B
2U-->2C
2U-->2D
2U-->2E
2U-->2F
2U-->2G
2U-->2H
2U-->2I
2U-->2J
2U-->2K
2U-->2L
2U-->2M
2U-->2N
2U-->2O
2U-->2P
2U-->2Q
2U-->2R
2U-->2S
2U-->2T
2U-->2V
2U-->2W
2U-->2X
2U-->2Y
2U-->2Z
2U-->30
2U-->31
2U-->32
2U-->33
2U-->34
2U-->35
2U-->36
2U-->37
2U-->38
2U-->39
2U-->3A
2U-->3B
2U-->3C
2U-->3D
2V-->2H
2V-->Q
2W-->2H
2W-->5
2W-->Q
2X-->Q
2X-->FC
2Y-->3D
30-->FC
31-->2G
31-->Q
32-->FC
33-->FC
34-->2G
34-->B
34-->Q
34-->FC
35-->34
35-->FC
36-->Q
36-->FC
37-->31
37-->Q
37-->FC
38-->29
38-->2C
38-->Q
39-->Q
39-->3S
3A-->2O
3B-->2G
3B-->Q
3B-->FC
3C-->31
3C-->Q
3D-->2A
3D-->Q
3D-->FC
3F-->3G
3I-->3K
3J-->3I
3J-->3K
3J-->3L
3L-->3K
3N-->Q
3O-->3N
3O-->3P
3O-->3Q
3P-->Q
3Q-->Q
3Q-->3S
3S-->3T
3S-->3U
3S-->3W
3S-->3V
3T-->Q
3U-->3W
3U-->Q
3V-->3U
3V-->3W
3V-->Q
3W-->6
3W-->Q
3W-->FC
3Y-->Q
3Z-->Q
40-->Q
41-->Q
42-->4H
42-->4J
42-->D6
43-->2U
43-->FC
44-->Q
44-->1Z
44-->2U
44-->FC
47-->E0
47-->FC
49-->43
49-->44
49-->Q
49-->2U
49-->D6
49-->E0
49-->FC
4B-->43
4B-->44
4B-->Q
4B-->1Z
4B-->2U
4B-->D6
4B-->E0
4D-->3Y
4D-->3Z
4D-->47
4D-->E0
4F-->3Z
4F-->41
4F-->Q
4F-->E0
4F-->FC
4F-->FP
4F-->FQ
4H-->47
4H-->49
4H-->4F
4H-->1Z
4H-->E0
4H-->FC
4J-->3Y
4J-->3Z
4J-->40
4J-->4B
4J-->4D
4J-->4F
4J-->Q
4J-->1Z
4J-->E0
4J-->FC
4K-->47
4K-->49
4K-->4B
4K-->4D
4K-->4F
4K-->4H
4K-->4J
4L-->3Z
4L-->41
4L-->42
4L-->4K
4N-->4U
4N-->57
4P-->1I
4Q-->4P
4Q-->5E
4Q-->Q
4Q-->1I
4Q-->1Z
4R-->Q
4R-->E0
4U-->4O
4U-->4R
4U-->4W
4U-->B
4U-->Q
4U-->1Z
4U-->E0
4U-->FC
4W-->4O
4W-->Q
4W-->E0
4X-->4U
4X-->4W
4X-->51
4X-->53
4X-->55
4X-->57
4Z-->59
4Z-->5B
4Z-->B
4Z-->Q
4Z-->1Z
4Z-->E0
51-->5A
51-->1Z
51-->E0
51-->FC
53-->59
53-->4Z
53-->B
53-->Q
53-->1Z
53-->E0
55-->5C
55-->5E
55-->E0
55-->FC
57-->5A
57-->5D
57-->5E
57-->51
57-->53
57-->55
57-->Q
57-->1Z
57-->E0
57-->FC
58-->4N
58-->4O
58-->4P
58-->4Q
58-->4X
58-->5A
58-->5D
58-->5E
59-->5B
59-->Q
5A-->5D
5A-->Q
5B-->Q
5C-->Q
5D-->5B
5D-->Q
5E-->5C
5E-->B
5E-->Q
5E-->1Z
5E-->FC
5G-->5L
5J-->E0
5L-->5O
5L-->5P
5L-->5Q
5L-->5R
5L-->5J
5L-->E0
5M-->5L
5Q-->5O
5R-->5P
5S-->5G
5S-->5M
5U-->Q
5Y-->1Z
5Y-->E0
5Y-->FC
60-->1Z
60-->3S
60-->E0
60-->FC
62-->6Q
62-->1Z
62-->2U
62-->D6
62-->E0
62-->FC
64-->5U
64-->5V
64-->6Q
64-->66
64-->68
64-->1Z
64-->E0
64-->FC
66-->1Z
66-->E0
68-->5V
68-->E0
6A-->6M
6A-->6N
6A-->Q
6A-->E0
6C-->6M
6C-->6N
6C-->6Q
6C-->5Y
6C-->60
6C-->62
6C-->64
6C-->6A
6C-->6F
6C-->6H
6C-->6J
6C-->6L
6C-->1Z
6C-->2U
6C-->E0
6C-->FC
6D-->5Y
6D-->60
6D-->62
6D-->64
6D-->66
6D-->6A
6D-->6C
6D-->6F
6D-->6H
6D-->6J
6D-->6L
6F-->66
6F-->1Z
6F-->2U
6F-->3S
6F-->D6
6F-->E0
6F-->FC
6H-->6Q
6H-->1Z
6H-->E0
6H-->FC
6J-->1Z
6J-->2U
6J-->3S
6J-->D6
6J-->E0
6J-->FC
6L-->6Q
6L-->1Z
6L-->E0
6L-->FC
6M-->6N
6M-->Q
6N-->Q
6O-->6C
6O-->D6
6P-->6D
6P-->6O
6Q-->5U
6Q-->1Z
6Q-->2U
6Q-->3S
6U-->Q
6U-->3F
6U-->E0
6U-->FC
6V-->6U
6W-->6V
70-->73
70-->75
70-->1Z
70-->E0
71-->70
71-->73
71-->75
73-->1Z
73-->2U
73-->D6
73-->E0
73-->FC
75-->Q
75-->1Z
75-->2U
75-->3S
75-->D6
75-->E0
75-->FC
76-->70
76-->D6
77-->71
77-->76
7B-->7S
7B-->7U
7B-->Q
7B-->1Z
7B-->2U
7B-->E0
7B-->FC
7D-->7T
7D-->E0
7F-->7B
7F-->7L
7F-->7O
7F-->E0
7H-->Q
7H-->E0
7J-->7W
7J-->E0
7L-->7T
7L-->7U
7L-->7W
7L-->7D
7L-->7H
7L-->7J
7L-->Q
7L-->1Z
7L-->E0
7L-->FC
7M-->7B
7M-->7D
7M-->7F
7M-->7H
7M-->7J
7M-->7L
7M-->7O
7M-->7Q
7O-->7R
7O-->7U
7O-->7Y
7O-->7Z
7O-->7Q
7O-->1Z
7O-->E0
7O-->FC
7Q-->7Z
7R-->Q
7S-->Q
7S-->2U
7S-->E0
7S-->FC
7T-->7R
7T-->Q
7T-->2U
7T-->E0
7T-->FC
7U-->Q
7U-->1Z
7U-->2U
7U-->3S
7V-->7F
7V-->D6
7W-->Q
7W-->2U
7W-->E0
7W-->FC
7X-->7M
7X-->7R
7X-->7S
7X-->7T
7X-->7U
7X-->7V
7X-->7W
7X-->7Y
7X-->7Z
7Y-->2U
7Y-->D6
7Y-->FC
83-->8C
83-->E0
85-->8D
85-->87
85-->E0
87-->8D
87-->E0
89-->8D
89-->E0
8A-->83
8A-->85
8A-->87
8A-->89
8E-->83
8E-->85
8E-->89
8F-->8A
8F-->8D
8F-->8E
8J-->1D
8J-->E0
8K-->8J
8L-->8J
8M-->8K
8M-->8L
8O-->Q
8R-->9K
8R-->4L
8R-->E0
8T-->E0
8V-->8Z
8V-->E0
8X-->8Z
8X-->E0
8Z-->E0
91-->8O
91-->8Z
91-->E0
93-->9O
93-->E0
95-->8O
95-->E0
97-->8O
97-->9O
97-->9P
97-->8V
97-->8X
97-->91
97-->93
97-->95
97-->99
97-->Q
97-->16
97-->E0
99-->16
99-->E0
99-->FC
9B-->9K
9B-->9P
9B-->9I
9B-->Q
9B-->16
9B-->E0
9D-->Q
9D-->E0
9F-->9L
9F-->8T
9F-->97
9F-->9B
9F-->9D
9F-->1Z
9F-->E0
9G-->97
9G-->99
9G-->9B
9G-->9D
9G-->9F
9I-->9K
9I-->8R
9I-->Q
9I-->E0
9J-->B
9J-->Q
9J-->16
9J-->1Z
9K-->Q
9L-->8O
9L-->9J
9L-->9K
9L-->9P
9L-->Q
9L-->16
9L-->1Z
9L-->4L
9M-->9F
9N-->8O
9N-->9G
9N-->9J
9N-->9K
9N-->9M
9N-->9O
9N-->9P
9O-->8O
9P-->Q
9R-->2U
9U-->9R
9U-->AT
9U-->E0
9U-->FC
9W-->AP
9W-->E0
9Y-->E0
A0-->AQ
A0-->AR
A0-->AT
A0-->1Z
A0-->2U
A0-->E0
A2-->AT
A2-->3J
A2-->D6
A2-->E0
A4-->AO
A4-->AT
A4-->9Y
A4-->1Z
A4-->2U
A4-->D6
A4-->E0
A4-->FC
A6-->AR
A6-->AT
A6-->1Z
A6-->2U
A6-->E0
A6-->FC
A8-->1Z
A8-->8F
A8-->E0
AA-->AP
AA-->AT
AA-->E0
AC-->AT
AC-->AW
AC-->A0
AC-->A4
AC-->A6
AC-->A8
AC-->AG
AC-->AN
AC-->1Z
AC-->2U
AC-->8F
AC-->D6
AC-->E0
AC-->FC
AE-->AP
AE-->AT
AE-->9U
AE-->9W
AE-->A2
AE-->AA
AE-->E0
AG-->AT
AG-->1Z
AG-->2U
AG-->3S
AG-->D6
AG-->E0
AG-->FC
AH-->9U
AH-->9W
AH-->9Y
AH-->A0
AH-->A4
AH-->A6
AH-->A8
AH-->AA
AH-->AC
AH-->AE
AH-->AG
AH-->AJ
AH-->AL
AH-->AN
AJ-->AL
AJ-->E0
AL-->AR
AL-->AT
AL-->AV
AL-->AW
AL-->E0
AL-->FC
AN-->AT
AN-->AV
AN-->AW
AN-->AL
AN-->Q
AN-->E0
AO-->2U
AO-->D6
AO-->FC
AP-->Q
AQ-->AR
AQ-->Q
AQ-->2U
AQ-->E0
AQ-->FC
AR-->FC
AS-->AC
AS-->AE
AS-->AJ
AS-->D6
AT-->9R
AT-->AR
AT-->Q
AT-->1Z
AT-->2U
AT-->3J
AT-->3S
AU-->AH
AU-->AP
AU-->AR
AU-->AS
AU-->AT
AU-->AV
AU-->AW
AV-->Q
AW-->Q
AZ-->B1
AZ-->B5
AZ-->B7
AZ-->B9
B1-->B3
B1-->B5
B1-->B7
B1-->B9
B1-->E0
B3-->BC
B3-->58
B3-->E0
B5-->BC
B5-->1I
B5-->1Z
B5-->58
B5-->E0
B7-->Q
B7-->1I
B7-->1Z
B7-->58
B7-->E0
B7-->FC
B9-->Q
B9-->1Z
B9-->58
B9-->E0
B9-->FC
BA-->AZ
BA-->BB
BB-->B1
BC-->58
BC-->E0
BE-->E0
BH-->BE
BH-->BT
BH-->BJ
BH-->BL
BH-->1Z
BH-->2U
BH-->E0
BH-->FC
BJ-->BE
BJ-->E0
BL-->BE
BL-->E0
BM-->BH
BM-->BJ
BM-->BL
BM-->BO
BM-->BQ
BO-->BH
BO-->BQ
BO-->1Z
BO-->E0
BQ-->BS
BQ-->BT
BQ-->1Z
BQ-->2U
BQ-->D6
BQ-->E0
BQ-->FC
BR-->BM
BR-->BU
BT-->1Z
BT-->2U
BT-->3S
BU-->BO
BX-->C5
BZ-->1D
BZ-->E0
C1-->1Z
C1-->E0
C1-->FC
C3-->6W
C3-->E0
C5-->BZ
C5-->C1
C5-->C3
C5-->C7
C5-->C9
C5-->E0
C7-->1Z
C7-->E0
C7-->FC
C9-->1Z
C9-->3J
C9-->E0
CA-->BX
CA-->CB
CB-->C5
CD-->Q
CG-->Q
CG-->1Z
CG-->3O
CG-->E0
CG-->FC
CI-->CD
CJ-->CL
CJ-->CN
CJ-->CP
CJ-->CT
CJ-->CV
CL-->CD
CL-->B
CL-->1Z
CL-->E0
CN-->CD
CN-->CG
CN-->B
CN-->Q
CN-->1Z
CN-->3O
CN-->58
CN-->E0
CP-->CD
CP-->CX
CP-->B
CP-->1Z
CP-->E0
CP-->FC
CR-->CD
CR-->CY
CR-->CI
CR-->E0
CR-->FC
CT-->CD
CT-->CX
CT-->CY
CT-->CL
CT-->CN
CT-->CP
CT-->CR
CT-->CV
CT-->B
CT-->Q
CT-->1Z
CT-->3S
CT-->58
CT-->E0
CT-->FC
CV-->1Z
CV-->3S
CV-->E0
CV-->FC
CW-->CZ
CX-->Q
CX-->3S
CY-->Q
CZ-->CT
D6-->D2
D6-->D3
D6-->D5
D6-->D7
D6-->D8
D8-->FC
DB-->FC
DD-->FC
DF-->FC
DH-->FC
DJ-->DF
DJ-->E4
DJ-->E8
DJ-->EU
DL-->FC
DN-->DR
DN-->FC
DP-->FC
DR-->FC
DT-->DX
DT-->EU
DV-->FC
DX-->FC
E0-->DB
E0-->DD
E0-->DF
E0-->DH
E0-->DJ
E0-->DL
E0-->DN
E0-->DP
E0-->DR
E0-->DT
E0-->DV
E0-->DX
E0-->DZ
E0-->E2
E0-->E4
E0-->E6
E0-->E8
E0-->EA
E0-->EC
E0-->EE
E0-->EG
E0-->EI
E0-->EK
E0-->EM
E0-->EO
E0-->EQ
E0-->ES
E0-->EU
E2-->FC
E4-->FC
E6-->DX
E8-->FC
EA-->DX
EA-->EU
EC-->DF
EC-->DX
EC-->EU
EC-->FC
EE-->FC
EG-->FC
EI-->DF
EI-->1Z
EK-->DF
EK-->DN
EK-->DX
EM-->FC
EO-->EG
EO-->EU
EO-->FC
EQ-->FC
ES-->FC
EU-->FC
EW-->F4
EZ-->F9
F2-->F9
F3-->F4
F4-->F9
F8-->F9
FC-->EW
FC-->EX
FC-->EY
FC-->EZ
FC-->F0
FC-->F1
FC-->F2
FC-->F4
FC-->F3
FC-->F5
FC-->F6
FC-->F7
FC-->F9
FC-->FA
FC-->FB
FC-->FD
FC-->FE
FC-->FF
FC-->FG
FC-->FH
FC-->FI
FC-->FJ
FC-->FK
FC-->FL
FC-->FM
FC-->FN
FC-->FR
FC-->FS
FF-->F9
FK-->EZ
```
