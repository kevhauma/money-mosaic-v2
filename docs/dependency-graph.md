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
- 371 leaf nodes, 1084 edges.
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
2L["granularity-for-span.ts"]
2M["gross-net-growth.ts"]
2N["gross-net-ratio.ts"]
2O["income-category-series.ts"]
2P["income-events.ts"]
2Q["income-gap-detection.ts"]
2R["income-growth.ts"]
2S["income-step-change-detection.ts"]
2T["index.ts"]
2U["joint-account-stake.ts"]
2V["joint-contributor-breakdown.ts"]
2W["money-flow-graph.ts"]
2X["multi-year-income-comparison.ts"]
2Y["net-margin.ts"]
2Z["period-stats.ts"]
30["period-window.ts"]
31["periodized-rate.ts"]
32["recurring-payments.ts"]
33["recurring-projection.ts"]
34["saving-velocity.ts"]
35["spending-mosaic.ts"]
36["top-transactions.ts"]
37["wage-change-detection.ts"]
38["weekday-weekend-split.ts"]
39["year-over-year.ts"]
3A["yearly-income-summary.ts"]
end
subgraph 3B["storage"]
3C["index.ts"]
3D["storage-status.service.ts"]
end
subgraph 3E["theme"]
3F["accent-colors.ts"]
3G["index.ts"]
3H["theme-styles.ts"]
3I["theme.service.ts"]
end
subgraph 3J["transactions"]
3K["attribution-override.ts"]
3L["index.ts"]
3M["nullify-transaction.ts"]
3N["transaction-deletion.service.ts"]
end
subgraph 3O["transfers"]
3P["index.ts"]
3Q["transfer-cleanup.service.ts"]
3R["transfer-linking.service.ts"]
3S["transfer-matching.service.ts"]
3T["transfer-matching.ts"]
end
end
subgraph 3U["feature-accounts"]
3V["account-card-vm.ts"]
3W["account-icons.ts"]
3X["account-list-order.ts"]
3Y["account-types.ts"]
3Z["accounts.routes.ts"]
40["balance-day-tooltip.ts"]
41["balance-trend-signals.ts"]
subgraph 42["components"]
subgraph 43["account-balance-block"]
44["account-balance-block.component.ts"]
end
subgraph 45["account-balance-chart"]
46["account-balance-chart.component.ts"]
end
subgraph 47["account-balance-history-chart"]
48["account-balance-history-chart.component.ts"]
end
subgraph 49["account-card"]
4A["account-card.component.ts"]
end
subgraph 4B["account-form"]
4C["account-form.component.ts"]
end
subgraph 4D["accounts-detail"]
4E["accounts-detail.component.ts"]
end
subgraph 4F["accounts-overview"]
4G["accounts-overview.component.ts"]
end
4H["index.ts"]
end
4I["index.ts"]
end
subgraph 4J["feature-categories"]
4K["categories.routes.ts"]
4L["category-icons.ts"]
4M["category-model.service.ts"]
4N["category-model.store.ts"]
4O["category-row-vm.ts"]
subgraph 4P["components"]
subgraph 4Q["categories-overview"]
4R["categories-overview.component.ts"]
end
subgraph 4S["category-form"]
4T["category-form.component.ts"]
end
4U["index.ts"]
subgraph 4V["rule-condition-row"]
4W["rule-condition-row.component.ts"]
end
subgraph 4X["rule-filters"]
4Y["rule-filters.component.ts"]
end
subgraph 4Z["rule-form"]
50["rule-form.component.ts"]
end
subgraph 51["rule-share-bar"]
52["rule-share-bar.component.ts"]
end
subgraph 53["rules-overview"]
54["rules-overview.component.ts"]
end
end
55["index.ts"]
56["rule-condition-editor.ts"]
57["rule-filters.ts"]
58["rule-labels.ts"]
59["rule-share.ts"]
5A["rule-summary.ts"]
5B["rules.store.ts"]
end
subgraph 5C["feature-changelog"]
5D["changelog.routes.ts"]
subgraph 5E["components"]
subgraph 5F["changelog-entry-row"]
5G["changelog-entry-row.component.ts"]
end
subgraph 5H["changelog-page"]
5I["changelog-page.component.ts"]
end
5J["index.ts"]
end
subgraph 5K["data"]
5L["changelog-entries.ts"]
5M["roadmap-entries.ts"]
end
5N["group-changelog-entries.ts"]
5O["group-roadmap-entries.ts"]
5P["index.ts"]
end
subgraph 5Q["feature-dashboard"]
5R["category-comparison-settings.store.ts"]
5S["category-comparison-vm.ts"]
subgraph 5T["components"]
subgraph 5U["account-balance-strip"]
5V["account-balance-strip.component.ts"]
end
subgraph 5W["action-queue-panel"]
5X["action-queue-panel.component.ts"]
end
subgraph 5Y["category-breakdown-panel"]
5Z["category-breakdown-panel.component.ts"]
end
subgraph 60["category-comparison-panel"]
61["category-comparison-panel.component.ts"]
end
subgraph 62["category-exclusion-dropdown"]
63["category-exclusion-dropdown.component.ts"]
end
subgraph 64["comparison-category-card"]
65["comparison-category-card.component.ts"]
end
subgraph 66["dashboard-customize-panel"]
67["dashboard-customize-panel.component.ts"]
end
subgraph 68["dashboard-overview"]
69["dashboard-overview.component.ts"]
end
6A["index.ts"]
subgraph 6B["spending-heatmap-panel"]
6C["spending-heatmap-panel.component.ts"]
end
subgraph 6D["top-transactions-panel"]
6E["top-transactions-panel.component.ts"]
end
subgraph 6F["trend-chart-panel"]
6G["trend-chart-panel.component.ts"]
end
subgraph 6H["weekday-weekend-split-panel"]
6I["weekday-weekend-split-panel.component.ts"]
end
end
6J["dashboard-layout-settings.store.ts"]
6K["dashboard-row-order.ts"]
6L["dashboard.routes.ts"]
6M["index.ts"]
6N["stats.store.ts"]
end
subgraph 6O["feature-data-management"]
subgraph 6P["components"]
subgraph 6Q["data-management-overview"]
6R["data-management-overview.component.ts"]
end
6S["index.ts"]
end
6T["index.ts"]
end
subgraph 6U["feature-explore"]
subgraph 6V["components"]
subgraph 6W["explore-overview"]
6X["explore-overview.component.ts"]
end
6Y["index.ts"]
subgraph 6Z["money-flow-panel"]
70["money-flow-panel.component.ts"]
end
subgraph 71["spending-mosaic-panel"]
72["spending-mosaic-panel.component.ts"]
end
end
73["explore.routes.ts"]
74["index.ts"]
end
subgraph 75["feature-future"]
subgraph 76["components"]
subgraph 77["future-overview"]
78["future-overview.component.ts"]
end
79["index.ts"]
end
7A["future.routes.ts"]
7B["index.ts"]
end
subgraph 7C["feature-help"]
subgraph 7D["components"]
subgraph 7E["faq-page"]
7F["faq-page.component.ts"]
end
subgraph 7G["guide-detail"]
7H["guide-detail.component.ts"]
end
subgraph 7I["guide-steps"]
7J["guide-steps.component.ts"]
end
subgraph 7K["guides-index"]
7L["guides-index.component.ts"]
end
7M["index.ts"]
end
subgraph 7N["data"]
7O["faq.ts"]
7P["guides.ts"]
end
7Q["help.routes.ts"]
7R["index.ts"]
end
subgraph 7S["feature-home"]
subgraph 7T["components"]
subgraph 7U["home-landing"]
7V["home-landing.component.ts"]
end
7W["index.ts"]
end
7X["home.routes.ts"]
7Y["index.ts"]
end
subgraph 7Z["feature-import"]
80["column-mapping.ts"]
subgraph 81["components"]
subgraph 82["account-draft-editor"]
83["account-draft-editor.component.ts"]
end
subgraph 84["batch-wait-card"]
85["batch-wait-card.component.ts"]
end
subgraph 86["column-map-amount-field"]
87["column-map-amount-field.component.ts"]
end
subgraph 88["column-map-counterparty-field"]
89["column-map-counterparty-field.component.ts"]
end
subgraph 8A["column-map-sample-caption"]
8B["column-map-sample-caption.component.ts"]
end
subgraph 8C["column-map-simple-field"]
8D["column-map-simple-field.component.ts"]
end
subgraph 8E["column-map-stepper"]
8F["column-map-stepper.component.ts"]
end
subgraph 8G["column-map-summary-step"]
8H["column-map-summary-step.component.ts"]
end
subgraph 8I["import-map-step"]
8J["import-map-step.component.ts"]
end
subgraph 8K["import-preview-step"]
8L["import-preview-step.component.ts"]
end
subgraph 8M["import-select-step"]
8N["import-select-step.component.ts"]
end
subgraph 8O["import-summary-step"]
8P["import-summary-step.component.ts"]
end
subgraph 8Q["import-wizard"]
8R["import-wizard.component.ts"]
end
8S["index.ts"]
subgraph 8T["queued-file-row"]
8U["queued-file-row.component.ts"]
end
end
8V["import-batches.store.ts"]
8W["import-queue.ts"]
8X["import-wizard-session.ts"]
8Y["import.routes.ts"]
8Z["index.ts"]
90["mapper-steps.ts"]
91["mapping-profiles.store.ts"]
end
subgraph 92["feature-income"]
93["career-start-date.ts"]
subgraph 94["components"]
subgraph 95["income-career-start"]
96["income-career-start.component.ts"]
end
subgraph 97["income-category-checklist"]
98["income-category-checklist.component.ts"]
end
subgraph 99["income-chart-cell"]
9A["income-chart-cell.component.ts"]
end
subgraph 9B["income-events-sidebar"]
9C["income-events-sidebar.component.ts"]
end
subgraph 9D["income-gross-color"]
9E["income-gross-color.component.ts"]
end
subgraph 9F["income-gross-net-section"]
9G["income-gross-net-section.component.ts"]
end
subgraph 9H["income-growth-panel"]
9I["income-growth-panel.component.ts"]
end
subgraph 9J["income-intro"]
9K["income-intro.component.ts"]
end
subgraph 9L["income-main-category"]
9M["income-main-category.component.ts"]
end
subgraph 9N["income-overview"]
9O["income-overview.component.ts"]
end
subgraph 9P["income-settings-page"]
9Q["income-settings-page.component.ts"]
end
subgraph 9R["income-yearly-panel"]
9S["income-yearly-panel.component.ts"]
end
9T["index.ts"]
subgraph 9U["salary-details-page"]
9V["salary-details-page.component.ts"]
end
subgraph 9W["salary-metadata-table"]
9X["salary-metadata-table.component.ts"]
end
subgraph 9Y["salary-month-modal"]
9Z["salary-month-modal.component.ts"]
end
end
A0["gross-net-chart-options.ts"]
A1["income-category-vm.ts"]
A2["income-event-vm.ts"]
A3["income-granularity.ts"]
A4["income.routes.ts"]
A5["income.store.ts"]
A6["index.ts"]
A7["salary-metadata-edit.ts"]
A8["salary-metadata-rows.ts"]
end
subgraph A9["feature-learning"]
subgraph AA["components"]
AB["index.ts"]
subgraph AC["learning-overview"]
AD["learning-overview.component.ts"]
end
subgraph AE["model-status-badge"]
AF["model-status-badge.component.ts"]
end
subgraph AG["model-status"]
AH["model-status.component.ts"]
end
subgraph AI["rule-proposals"]
AJ["rule-proposals.component.ts"]
end
subgraph AK["suggestions-table"]
AL["suggestions-table.component.ts"]
end
end
AM["index.ts"]
AN["learning.routes.ts"]
AO["model-status-display.ts"]
end
subgraph AP["feature-recurring"]
AQ["bills-calendar-vm.ts"]
subgraph AR["components"]
subgraph AS["bills-calendar"]
AT["bills-calendar.component.ts"]
end
subgraph AU["bills-day-list"]
AV["bills-day-list.component.ts"]
end
subgraph AW["bills-month-grid"]
AX["bills-month-grid.component.ts"]
end
AY["index.ts"]
subgraph AZ["recurring-overview"]
B0["recurring-overview.component.ts"]
end
subgraph B1["recurring-payments-panel"]
B2["recurring-payments-panel.component.ts"]
end
end
B3["index.ts"]
B4["recurring-payments-row-vm.ts"]
B5["recurring-series.store.ts"]
B6["recurring.routes.ts"]
end
subgraph B7["feature-settings"]
subgraph B8["components"]
B9["index.ts"]
subgraph BA["settings-about-section"]
BB["settings-about-section.component.ts"]
end
subgraph BC["settings-currency-locale-section"]
BD["settings-currency-locale-section.component.ts"]
end
subgraph BE["settings-data-section"]
BF["settings-data-section.component.ts"]
end
subgraph BG["settings-overview"]
BH["settings-overview.component.ts"]
end
subgraph BI["settings-privacy-section"]
BJ["settings-privacy-section.component.ts"]
end
subgraph BK["settings-theme-section"]
BL["settings-theme-section.component.ts"]
end
end
BM["index.ts"]
BN["settings.routes.ts"]
end
subgraph BO["feature-transactions"]
BP["category-picker.ts"]
subgraph BQ["components"]
subgraph BR["attribution-override-fieldset"]
BS["attribution-override-fieldset.component.ts"]
end
subgraph BT["category-select-cell"]
BU["category-select-cell.component.ts"]
end
BV["index.ts"]
subgraph BW["transaction-bulk-bar"]
BX["transaction-bulk-bar.component.ts"]
end
subgraph BY["transaction-edit-form"]
BZ["transaction-edit-form.component.ts"]
end
subgraph C0["transaction-filters"]
C1["transaction-filters.component.ts"]
end
subgraph C2["transaction-row"]
C3["transaction-row.component.ts"]
end
subgraph C4["transactions-overview"]
C5["transactions-overview.component.ts"]
end
subgraph C6["transfer-review"]
C7["transfer-review.component.ts"]
end
end
C8["index.ts"]
C9["transaction-filters.ts"]
CA["transaction-row-vm.ts"]
CB["transactions.routes.ts"]
end
subgraph CC["shared"]
subgraph CD["echarts"]
CE["bucketed-axis-option.ts"]
CF["chart-theme.ts"]
CG["echarts-jsdom.testing.ts"]
CH["echarts-setup.ts"]
CI["index.ts"]
CJ["legend-option.ts"]
CK["tooltip-formatter.ts"]
end
subgraph CL["ui"]
subgraph CM["alert"]
CN["alert.component.ts"]
end
subgraph CO["badge"]
CP["badge.component.ts"]
end
subgraph CQ["button"]
CR["button.component.ts"]
end
subgraph CS["collapse"]
CT["collapse.component.ts"]
end
subgraph CU["confirm-dialog"]
CV["confirm-dialog.component.ts"]
end
subgraph CW["cycle-picker"]
CX["cycle-picker.component.ts"]
end
subgraph CY["date-range-input"]
CZ["date-range-input.component.ts"]
end
subgraph D0["divider"]
D1["divider.component.ts"]
end
subgraph D2["dropdown"]
D3["dropdown.component.ts"]
end
subgraph D4["empty-state"]
D5["empty-state.component.ts"]
end
subgraph D6["fieldset"]
D7["fieldset.component.ts"]
end
subgraph D8["flex"]
D9["flex.component.ts"]
end
subgraph DA["granularity-picker"]
DB["granularity-picker.component.ts"]
end
DC["index.ts"]
subgraph DD["input"]
DE["input.component.ts"]
end
subgraph DF["label"]
DG["label.component.ts"]
end
subgraph DH["loading-skeleton"]
DI["loading-skeleton.component.ts"]
end
subgraph DJ["modal"]
DK["mm-modal.component.ts"]
end
subgraph DL["page-header"]
DM["page-header.component.ts"]
end
subgraph DN["paginator"]
DO["paginator.component.ts"]
end
subgraph DP["paper"]
DQ["paper.component.ts"]
end
subgraph DR["privacy-blur"]
DS["privacy-blur.component.ts"]
end
subgraph DT["privacy-toggle"]
DU["privacy-toggle.component.ts"]
end
subgraph DV["range-grouping-switcher"]
DW["range-grouping-switcher.component.ts"]
end
subgraph DX["select"]
DY["select.component.ts"]
end
subgraph DZ["stat-card"]
E0["stat-card.component.ts"]
end
subgraph E1["table"]
E2["table.component.ts"]
end
subgraph E3["tabs"]
E4["tabs.component.ts"]
end
subgraph E5["typography"]
E6["typography.component.ts"]
end
end
subgraph E7["utils"]
E8["calendar-cycles.ts"]
E9["confidence-color.ts"]
EA["confirm-state.ts"]
EB["currency-format.ts"]
EC["currency-symbol-presets.ts"]
ED["daisy-classes.ts"]
EE["date-buckets.ts"]
EF["date-format.pipe.ts"]
EG["date-format.ts"]
EH["debounced-text.ts"]
EI["download-json.ts"]
EJ["fingerprint.ts"]
EK["format-settings.testing.ts"]
EL["format-settings.ts"]
EM["hidden-amount.ts"]
EN["iban.ts"]
EO["index.ts"]
EP["link-control-to-setting.ts"]
EQ["locale-presets.ts"]
ER["number-format.ts"]
ES["pagination.ts"]
ET["percentage.ts"]
EU["search-params.ts"]
EV["selection-model.ts"]
EW["signed-amount.pipe.ts"]
EX["sortable.ts"]
EY["structural-filters.ts"]
EZ["theme-hooks.ts"]
subgraph F0["validators"]
F1["iban.validator.ts"]
F2["percentage.validator.ts"]
end
F3["with-archivable.ts"]
F4["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3P
5-->4
5-->6
6-->Q
6-->EO
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
G-->34
G-->3F
G-->EJ
G-->EL
H-->G
H-->3G
H-->EO
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->2T
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
Y-->EO
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
15-->3P
15-->EO
16-->Y
16-->Z
16-->10
16-->12
16-->13
16-->14
16-->15
19-->1Z
19-->CR
19-->E6
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
1S-->2T
1S-->3P
1S-->EO
1T-->Q
1T-->3G
1T-->EO
1U-->22
1U-->Q
1U-->EO
1V-->1W
1V-->2T
1V-->CI
1V-->EO
1W-->2T
1W-->CI
1W-->EO
1X-->Q
1X-->2T
1Y-->Q
1Y-->EO
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
20-->2T
20-->EO
21-->EO
22-->Q
22-->3L
22-->3P
23-->Q
24-->22
24-->23
24-->Q
24-->3P
26-->Q
26-->EO
27-->26
27-->Q
27-->EO
28-->2A
28-->2O
28-->EO
29-->2G
29-->Q
2A-->29
2A-->Q
2A-->EO
2B-->29
2B-->2G
2B-->Q
2B-->EO
2C-->2G
2C-->Q
2D-->Q
2E-->29
2E-->30
2E-->Q
2F-->EO
2G-->2D
2G-->2H
2G-->Q
2G-->3P
2H-->5
2H-->Q
2I-->Q
2J-->2A
2J-->2O
2J-->Q
2J-->EO
2K-->Q
2L-->EO
2M-->2N
2N-->2O
2N-->Q
2O-->2A
2O-->Q
2O-->EO
2P-->2Q
2P-->2S
2P-->37
2P-->Q
2Q-->2A
2Q-->2O
2Q-->EO
2R-->2O
2R-->39
2R-->EO
2S-->2A
2S-->2J
2S-->2O
2S-->EO
2T-->26
2T-->27
2T-->28
2T-->29
2T-->2A
2T-->2B
2T-->2C
2T-->2D
2T-->2E
2T-->2F
2T-->2G
2T-->2H
2T-->2I
2T-->2J
2T-->2K
2T-->2L
2T-->2M
2T-->2N
2T-->2O
2T-->2P
2T-->2Q
2T-->2R
2T-->2S
2T-->2U
2T-->2V
2T-->2W
2T-->2X
2T-->2Y
2T-->2Z
2T-->30
2T-->31
2T-->32
2T-->33
2T-->34
2T-->35
2T-->36
2T-->37
2T-->38
2T-->39
2T-->3A
2U-->2H
2U-->Q
2V-->2H
2V-->5
2V-->Q
2W-->Q
2W-->EO
2X-->3A
2Z-->2G
2Z-->Q
30-->EO
31-->EO
32-->2G
32-->B
32-->Q
32-->EO
33-->32
33-->EO
34-->2Z
34-->Q
34-->EO
35-->29
35-->2C
35-->Q
36-->Q
36-->3P
37-->2N
38-->2G
38-->Q
38-->EO
39-->2Z
39-->Q
3A-->2A
3A-->Q
3A-->EO
3C-->3D
3F-->3H
3G-->3F
3G-->3H
3G-->3I
3I-->3H
3K-->Q
3L-->3K
3L-->3M
3L-->3N
3M-->Q
3N-->Q
3N-->3P
3P-->3Q
3P-->3R
3P-->3T
3P-->3S
3Q-->Q
3R-->3T
3R-->Q
3S-->3R
3S-->3T
3S-->Q
3T-->6
3T-->Q
3T-->EO
3V-->Q
3W-->Q
3X-->Q
3Y-->Q
3Z-->4E
3Z-->4G
3Z-->CI
40-->2T
40-->EO
41-->Q
41-->1Z
41-->2T
41-->EO
44-->DC
44-->EO
46-->40
46-->41
46-->Q
46-->2T
46-->CI
46-->DC
46-->EO
48-->40
48-->41
48-->Q
48-->1Z
48-->2T
48-->CI
48-->DC
4A-->3V
4A-->3W
4A-->44
4A-->DC
4C-->3W
4C-->3Y
4C-->Q
4C-->DC
4C-->EO
4C-->F1
4C-->F2
4E-->44
4E-->46
4E-->4C
4E-->1Z
4E-->DC
4E-->EO
4G-->3V
4G-->3W
4G-->3X
4G-->48
4G-->4A
4G-->4C
4G-->Q
4G-->1Z
4G-->DC
4G-->EO
4H-->44
4H-->46
4H-->48
4H-->4A
4H-->4C
4H-->4E
4H-->4G
4I-->3W
4I-->3Y
4I-->3Z
4I-->4H
4K-->4R
4K-->54
4M-->1I
4N-->4M
4N-->5B
4N-->Q
4N-->1I
4N-->1Z
4O-->Q
4O-->DC
4R-->4L
4R-->4O
4R-->4T
4R-->B
4R-->Q
4R-->1Z
4R-->DC
4R-->EO
4T-->4L
4T-->Q
4T-->DC
4U-->4R
4U-->4T
4U-->4Y
4U-->50
4U-->52
4U-->54
4W-->56
4W-->58
4W-->B
4W-->Q
4W-->1Z
4W-->DC
4Y-->57
4Y-->1Z
4Y-->DC
4Y-->EO
50-->56
50-->4W
50-->B
50-->Q
50-->1Z
50-->DC
52-->59
52-->5B
52-->DC
52-->EO
54-->57
54-->5A
54-->5B
54-->4Y
54-->50
54-->52
54-->Q
54-->1Z
54-->DC
54-->EO
55-->4K
55-->4L
55-->4M
55-->4N
55-->4U
55-->57
55-->5A
55-->5B
56-->58
56-->Q
57-->5A
57-->Q
58-->Q
59-->Q
5A-->58
5A-->Q
5B-->59
5B-->B
5B-->Q
5B-->1Z
5B-->EO
5D-->5I
5G-->DC
5I-->5L
5I-->5M
5I-->5N
5I-->5O
5I-->5G
5I-->DC
5J-->5I
5N-->5L
5O-->5M
5P-->5D
5P-->5J
5R-->Q
5V-->1Z
5V-->DC
5V-->EO
5X-->1Z
5X-->3P
5X-->DC
5X-->EO
5Z-->6N
5Z-->1Z
5Z-->2T
5Z-->CI
5Z-->DC
5Z-->EO
61-->5R
61-->5S
61-->6N
61-->63
61-->65
61-->1Z
61-->DC
61-->EO
63-->1Z
63-->DC
65-->5S
65-->DC
67-->6J
67-->6K
67-->Q
67-->DC
69-->6J
69-->6K
69-->6N
69-->5V
69-->5X
69-->5Z
69-->61
69-->67
69-->6C
69-->6E
69-->6G
69-->6I
69-->1Z
69-->2T
69-->DC
69-->EO
6A-->5V
6A-->5X
6A-->5Z
6A-->61
6A-->63
6A-->67
6A-->69
6A-->6C
6A-->6E
6A-->6G
6A-->6I
6C-->63
6C-->1Z
6C-->2T
6C-->3P
6C-->CI
6C-->DC
6C-->EO
6E-->6N
6E-->1Z
6E-->DC
6E-->EO
6G-->1Z
6G-->2T
6G-->3P
6G-->CI
6G-->DC
6G-->EO
6I-->6N
6I-->1Z
6I-->DC
6I-->EO
6J-->6K
6J-->Q
6K-->Q
6L-->69
6L-->CI
6M-->6A
6M-->6L
6N-->5R
6N-->1Z
6N-->2T
6N-->3P
6R-->Q
6R-->3C
6R-->DC
6R-->EO
6S-->6R
6T-->6S
6X-->70
6X-->72
6X-->1Z
6X-->DC
6Y-->6X
6Y-->70
6Y-->72
70-->1Z
70-->2T
70-->CI
70-->DC
70-->EO
72-->Q
72-->1Z
72-->2T
72-->3P
72-->CI
72-->DC
72-->EO
73-->6X
73-->CI
74-->6Y
74-->73
78-->DC
79-->78
7A-->78
7A-->CI
7B-->79
7B-->7A
7F-->7O
7F-->DC
7H-->7P
7H-->7J
7H-->DC
7J-->7P
7J-->DC
7L-->7P
7L-->DC
7M-->7F
7M-->7H
7M-->7J
7M-->7L
7Q-->7F
7Q-->7H
7Q-->7L
7R-->7M
7R-->7P
7R-->7Q
7V-->1D
7V-->DC
7W-->7V
7X-->7V
7Y-->7W
7Y-->7X
80-->Q
83-->8W
83-->4I
83-->DC
85-->DC
87-->8B
87-->DC
89-->8B
89-->DC
8B-->DC
8D-->80
8D-->8B
8D-->DC
8F-->90
8F-->DC
8H-->80
8H-->DC
8J-->80
8J-->90
8J-->91
8J-->87
8J-->89
8J-->8D
8J-->8F
8J-->8H
8J-->8L
8J-->Q
8J-->16
8J-->DC
8L-->16
8L-->DC
8L-->EO
8N-->8W
8N-->91
8N-->8U
8N-->Q
8N-->16
8N-->DC
8P-->Q
8P-->DC
8R-->8X
8R-->85
8R-->8J
8R-->8N
8R-->8P
8R-->1Z
8R-->DC
8S-->8J
8S-->8L
8S-->8N
8S-->8P
8S-->8R
8U-->8W
8U-->83
8U-->Q
8U-->DC
8V-->B
8V-->Q
8V-->16
8V-->1Z
8W-->Q
8X-->80
8X-->8V
8X-->8W
8X-->91
8X-->Q
8X-->16
8X-->1Z
8X-->4I
8Y-->8R
8Z-->80
8Z-->8S
8Z-->8V
8Z-->8W
8Z-->8Y
8Z-->90
8Z-->91
90-->80
91-->Q
93-->2T
96-->93
96-->A5
96-->DC
96-->EO
98-->A1
98-->DC
9A-->DC
9C-->A2
9C-->A3
9C-->A5
9C-->1Z
9C-->2T
9C-->DC
9E-->A5
9E-->3G
9E-->CI
9E-->DC
9G-->A0
9G-->A5
9G-->9A
9G-->1Z
9G-->2T
9G-->CI
9G-->DC
9G-->EO
9I-->A3
9I-->A5
9I-->1Z
9I-->2T
9I-->DC
9I-->EO
9K-->1Z
9K-->7R
9K-->DC
9M-->A1
9M-->A5
9M-->DC
9O-->A5
9O-->A8
9O-->9C
9O-->9G
9O-->9I
9O-->9K
9O-->9S
9O-->9Z
9O-->1Z
9O-->2T
9O-->7R
9O-->CI
9O-->DC
9O-->EO
9Q-->A1
9Q-->A5
9Q-->96
9Q-->98
9Q-->9E
9Q-->9M
9Q-->DC
9S-->A5
9S-->1Z
9S-->2T
9S-->3P
9S-->CI
9S-->DC
9S-->EO
9T-->96
9T-->98
9T-->9A
9T-->9C
9T-->9G
9T-->9I
9T-->9K
9T-->9M
9T-->9O
9T-->9Q
9T-->9S
9T-->9V
9T-->9X
9T-->9Z
9V-->9X
9V-->DC
9X-->A3
9X-->A5
9X-->A7
9X-->A8
9X-->DC
9X-->EO
9Z-->A5
9Z-->A7
9Z-->A8
9Z-->9X
9Z-->Q
9Z-->DC
A0-->2T
A0-->CI
A0-->EO
A1-->Q
A2-->A3
A2-->Q
A2-->2T
A2-->DC
A2-->EO
A3-->EO
A4-->9O
A4-->9Q
A4-->9V
A4-->CI
A5-->93
A5-->A3
A5-->Q
A5-->1Z
A5-->2T
A5-->3G
A5-->3P
A6-->9T
A6-->A1
A6-->A3
A6-->A4
A6-->A5
A6-->A7
A6-->A8
A7-->Q
A8-->Q
AB-->AD
AB-->AH
AB-->AJ
AB-->AL
AD-->AF
AD-->AH
AD-->AJ
AD-->AL
AD-->DC
AF-->AO
AF-->55
AF-->DC
AH-->AO
AH-->1I
AH-->1Z
AH-->55
AH-->DC
AJ-->Q
AJ-->1I
AJ-->1Z
AJ-->55
AJ-->DC
AJ-->EO
AL-->Q
AL-->1Z
AL-->55
AL-->DC
AL-->EO
AM-->AB
AM-->AN
AN-->AD
AO-->55
AO-->DC
AQ-->DC
AT-->AQ
AT-->B5
AT-->AV
AT-->AX
AT-->1Z
AT-->2T
AT-->DC
AT-->EO
AV-->AQ
AV-->DC
AX-->AQ
AX-->DC
AY-->AT
AY-->AV
AY-->AX
AY-->B0
AY-->B2
B0-->AT
B0-->B2
B0-->1Z
B0-->DC
B2-->B4
B2-->B5
B2-->1Z
B2-->2T
B2-->CI
B2-->DC
B2-->EO
B3-->AY
B3-->B6
B5-->1Z
B5-->2T
B5-->3P
B6-->B0
B9-->BH
BB-->1D
BB-->DC
BD-->1Z
BD-->DC
BD-->EO
BF-->6T
BF-->DC
BH-->BB
BH-->BD
BH-->BF
BH-->BJ
BH-->BL
BH-->DC
BJ-->1Z
BJ-->DC
BJ-->EO
BL-->1Z
BL-->3G
BL-->DC
BM-->B9
BM-->BN
BN-->BH
BP-->Q
BS-->Q
BS-->1Z
BS-->3L
BS-->DC
BS-->EO
BU-->BP
BV-->BX
BV-->BZ
BV-->C1
BV-->C5
BV-->C7
BX-->BP
BX-->B
BX-->1Z
BX-->DC
BZ-->BP
BZ-->BS
BZ-->B
BZ-->Q
BZ-->1Z
BZ-->3L
BZ-->55
BZ-->DC
C1-->BP
C1-->C9
C1-->B
C1-->1Z
C1-->DC
C1-->EO
C3-->BP
C3-->CA
C3-->BU
C3-->DC
C3-->EO
C5-->BP
C5-->C9
C5-->CA
C5-->BX
C5-->BZ
C5-->C1
C5-->C3
C5-->C7
C5-->B
C5-->Q
C5-->1Z
C5-->3P
C5-->55
C5-->DC
C5-->EO
C7-->1Z
C7-->3P
C7-->DC
C7-->EO
C8-->CB
C9-->Q
C9-->3P
CA-->Q
CB-->C5
CI-->CE
CI-->CF
CI-->CH
CI-->CJ
CI-->CK
CK-->EO
CN-->EO
CP-->EO
CR-->EO
CT-->EO
CV-->CR
CV-->DG
CV-->DK
CV-->E6
CX-->EO
CZ-->D3
CZ-->EO
D1-->EO
D3-->EO
D5-->D9
D5-->E6
D7-->EO
D9-->EO
DC-->CN
DC-->CP
DC-->CR
DC-->CT
DC-->CV
DC-->CX
DC-->CZ
DC-->D1
DC-->D3
DC-->D5
DC-->D7
DC-->D9
DC-->DB
DC-->DE
DC-->DG
DC-->DI
DC-->DK
DC-->DM
DC-->DO
DC-->DQ
DC-->DS
DC-->DU
DC-->DW
DC-->DY
DC-->E0
DC-->E2
DC-->E4
DC-->E6
DE-->EO
DG-->EO
DI-->D9
DK-->EO
DM-->D9
DM-->E6
DO-->CR
DO-->D9
DO-->E6
DO-->EO
DQ-->EO
DS-->EO
DU-->CR
DU-->1Z
DW-->CR
DW-->CZ
DW-->D9
DY-->EO
E0-->DS
E0-->E6
E0-->EO
E2-->EO
E4-->EO
E6-->EO
E8-->EG
EB-->EL
EE-->EL
EF-->EG
EG-->EL
EK-->EL
EO-->E8
EO-->E9
EO-->EA
EO-->EB
EO-->EC
EO-->ED
EO-->EE
EO-->EG
EO-->EF
EO-->EH
EO-->EI
EO-->EJ
EO-->EL
EO-->EM
EO-->EN
EO-->EP
EO-->EQ
EO-->ER
EO-->ES
EO-->ET
EO-->EU
EO-->EV
EO-->EW
EO-->EX
EO-->EY
EO-->EZ
EO-->F3
EO-->F4
ER-->EL
EW-->EB
```
