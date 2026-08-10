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
- 359 leaf nodes, 1044 edges.
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
N["import-batches.repository.ts"]
O["index.ts"]
P["mapping-profiles.repository.ts"]
Q["rules.repository.ts"]
R["salary-metadata.repository.ts"]
S["transactions.repository.ts"]
T["transfer-settings.repository.ts"]
U["transfers.repository.ts"]
end
subgraph V["import"]
W["account-detection.ts"]
X["csv-import.service.ts"]
Y["csv-parse.ts"]
Z["csv-parse.worker.ts"]
10["csv-row-mapper.ts"]
11["csv-worker.types.ts"]
12["delimiter-guess.ts"]
13["import.service.ts"]
14["index.ts"]
end
subgraph 15["layout"]
subgraph 16["app-shell"]
17["app-shell.component.ts"]
end
18["index.ts"]
end
subgraph 19["links"]
1A["external-links.ts"]
1B["index.ts"]
end
subgraph 1C["ml"]
1D["category-model.worker.ts"]
1E["category-model.worker.types.ts"]
1F["feature-hashing.ts"]
1G["index.ts"]
1H["model-config.ts"]
1I["rule-proposal-mining.ts"]
1J["training-window.ts"]
end
subgraph 1K["onboarding"]
1L["home-redirect.guard.ts"]
1M["index.ts"]
1N["mark-visited.guard.ts"]
1O["visited.service.ts"]
end
subgraph 1P["state"]
1Q["accounts.store.ts"]
1R["app-settings.store.ts"]
1S["categories.store.ts"]
1T["chart-options-control.ts"]
1U["chart-options.store.ts"]
1V["index.ts"]
1W["page-range-control.ts"]
1X["range-state.store.ts"]
1Y["transactions.store.ts"]
1Z["transfer-settings.store.ts"]
20["transfers.store.ts"]
end
subgraph 21["stats"]
22["account-balance-history.ts"]
23["account-balance-trend.ts"]
24["annual-lump-sum-smoothing.ts"]
25["category-breakdown.ts"]
26["category-composition-trend.ts"]
27["category-cycle-heatmap.ts"]
28["category-kind-contribution.ts"]
29["category-period-comparison.ts"]
2A["chart-zoom-window.ts"]
2B["classify-for-stats.ts"]
2C["classify-joint-leg.ts"]
2D["day-transactions.ts"]
2E["embedded-bonus-smoothing.ts"]
2F["full-history-range.ts"]
2G["granularity-for-span.ts"]
2H["gross-net-growth.ts"]
2I["gross-net-ratio.ts"]
2J["income-category-series.ts"]
2K["income-events.ts"]
2L["income-gap-detection.ts"]
2M["income-growth.ts"]
2N["income-step-change-detection.ts"]
2O["index.ts"]
2P["joint-account-stake.ts"]
2Q["joint-contributor-breakdown.ts"]
2R["money-flow-graph.ts"]
2S["multi-year-income-comparison.ts"]
2T["net-margin.ts"]
2U["period-stats.ts"]
2V["period-window.ts"]
2W["periodized-rate.ts"]
2X["recurring-payments.ts"]
2Y["recurring-projection.ts"]
2Z["top-transactions.ts"]
30["wage-change-detection.ts"]
31["weekday-weekend-split.ts"]
32["year-over-year.ts"]
33["yearly-income-summary.ts"]
end
subgraph 34["storage"]
35["index.ts"]
36["storage-status.service.ts"]
end
subgraph 37["theme"]
38["accent-colors.ts"]
39["index.ts"]
3A["theme-styles.ts"]
3B["theme.service.ts"]
end
subgraph 3C["transactions"]
3D["attribution-override.ts"]
3E["index.ts"]
3F["nullify-transaction.ts"]
3G["transaction-deletion.service.ts"]
end
subgraph 3H["transfers"]
3I["index.ts"]
3J["transfer-cleanup.service.ts"]
3K["transfer-linking.service.ts"]
3L["transfer-matching.service.ts"]
3M["transfer-matching.ts"]
end
end
subgraph 3N["feature-accounts"]
3O["account-card-vm.ts"]
3P["account-icons.ts"]
3Q["account-list-order.ts"]
3R["account-types.ts"]
3S["accounts.routes.ts"]
3T["balance-day-tooltip.ts"]
3U["balance-trend-signals.ts"]
subgraph 3V["components"]
subgraph 3W["account-balance-block"]
3X["account-balance-block.component.ts"]
end
subgraph 3Y["account-balance-chart"]
3Z["account-balance-chart.component.ts"]
end
subgraph 40["account-balance-history-chart"]
41["account-balance-history-chart.component.ts"]
end
subgraph 42["account-card"]
43["account-card.component.ts"]
end
subgraph 44["account-form"]
45["account-form.component.ts"]
end
subgraph 46["accounts-detail"]
47["accounts-detail.component.ts"]
end
subgraph 48["accounts-overview"]
49["accounts-overview.component.ts"]
end
4A["index.ts"]
end
4B["index.ts"]
end
subgraph 4C["feature-categories"]
4D["categories.routes.ts"]
4E["category-icons.ts"]
4F["category-model.service.ts"]
4G["category-model.store.ts"]
4H["category-row-vm.ts"]
subgraph 4I["components"]
subgraph 4J["categories-overview"]
4K["categories-overview.component.ts"]
end
subgraph 4L["category-form"]
4M["category-form.component.ts"]
end
4N["index.ts"]
subgraph 4O["rule-condition-row"]
4P["rule-condition-row.component.ts"]
end
subgraph 4Q["rule-filters"]
4R["rule-filters.component.ts"]
end
subgraph 4S["rule-form"]
4T["rule-form.component.ts"]
end
subgraph 4U["rule-share-bar"]
4V["rule-share-bar.component.ts"]
end
subgraph 4W["rules-overview"]
4X["rules-overview.component.ts"]
end
end
4Y["index.ts"]
4Z["rule-condition-editor.ts"]
50["rule-filters.ts"]
51["rule-labels.ts"]
52["rule-share.ts"]
53["rule-summary.ts"]
54["rules.store.ts"]
end
subgraph 55["feature-changelog"]
56["changelog.routes.ts"]
subgraph 57["components"]
subgraph 58["changelog-entry-row"]
59["changelog-entry-row.component.ts"]
end
subgraph 5A["changelog-page"]
5B["changelog-page.component.ts"]
end
5C["index.ts"]
end
subgraph 5D["data"]
5E["changelog-entries.ts"]
5F["roadmap-entries.ts"]
end
5G["group-changelog-entries.ts"]
5H["group-roadmap-entries.ts"]
5I["index.ts"]
end
subgraph 5J["feature-dashboard"]
5K["category-comparison-settings.store.ts"]
5L["category-comparison-vm.ts"]
subgraph 5M["components"]
subgraph 5N["account-balance-strip"]
5O["account-balance-strip.component.ts"]
end
subgraph 5P["action-queue-panel"]
5Q["action-queue-panel.component.ts"]
end
subgraph 5R["category-breakdown-panel"]
5S["category-breakdown-panel.component.ts"]
end
subgraph 5T["category-comparison-panel"]
5U["category-comparison-panel.component.ts"]
end
subgraph 5V["category-exclusion-dropdown"]
5W["category-exclusion-dropdown.component.ts"]
end
subgraph 5X["comparison-category-card"]
5Y["comparison-category-card.component.ts"]
end
subgraph 5Z["dashboard-customize-panel"]
60["dashboard-customize-panel.component.ts"]
end
subgraph 61["dashboard-overview"]
62["dashboard-overview.component.ts"]
end
63["index.ts"]
subgraph 64["spending-heatmap-panel"]
65["spending-heatmap-panel.component.ts"]
end
subgraph 66["top-transactions-panel"]
67["top-transactions-panel.component.ts"]
end
subgraph 68["trend-chart-panel"]
69["trend-chart-panel.component.ts"]
end
subgraph 6A["weekday-weekend-split-panel"]
6B["weekday-weekend-split-panel.component.ts"]
end
end
6C["dashboard-layout-settings.store.ts"]
6D["dashboard-row-order.ts"]
6E["dashboard.routes.ts"]
6F["index.ts"]
6G["stats.store.ts"]
end
subgraph 6H["feature-data-management"]
subgraph 6I["components"]
subgraph 6J["data-management-overview"]
6K["data-management-overview.component.ts"]
end
6L["index.ts"]
end
6M["index.ts"]
end
subgraph 6N["feature-explore"]
subgraph 6O["components"]
subgraph 6P["explore-overview"]
6Q["explore-overview.component.ts"]
end
6R["index.ts"]
subgraph 6S["money-flow-panel"]
6T["money-flow-panel.component.ts"]
end
end
6U["explore.routes.ts"]
6V["index.ts"]
end
subgraph 6W["feature-help"]
subgraph 6X["components"]
subgraph 6Y["faq-page"]
6Z["faq-page.component.ts"]
end
subgraph 70["guide-detail"]
71["guide-detail.component.ts"]
end
subgraph 72["guide-steps"]
73["guide-steps.component.ts"]
end
subgraph 74["guides-index"]
75["guides-index.component.ts"]
end
76["index.ts"]
end
subgraph 77["data"]
78["faq.ts"]
79["guides.ts"]
end
7A["help.routes.ts"]
7B["index.ts"]
end
subgraph 7C["feature-home"]
subgraph 7D["components"]
subgraph 7E["home-landing"]
7F["home-landing.component.ts"]
end
7G["index.ts"]
end
7H["home.routes.ts"]
7I["index.ts"]
end
subgraph 7J["feature-import"]
7K["column-mapping.ts"]
subgraph 7L["components"]
subgraph 7M["account-draft-editor"]
7N["account-draft-editor.component.ts"]
end
subgraph 7O["batch-wait-card"]
7P["batch-wait-card.component.ts"]
end
subgraph 7Q["column-map-amount-field"]
7R["column-map-amount-field.component.ts"]
end
subgraph 7S["column-map-counterparty-field"]
7T["column-map-counterparty-field.component.ts"]
end
subgraph 7U["column-map-sample-caption"]
7V["column-map-sample-caption.component.ts"]
end
subgraph 7W["column-map-simple-field"]
7X["column-map-simple-field.component.ts"]
end
subgraph 7Y["column-map-stepper"]
7Z["column-map-stepper.component.ts"]
end
subgraph 80["column-map-summary-step"]
81["column-map-summary-step.component.ts"]
end
subgraph 82["import-map-step"]
83["import-map-step.component.ts"]
end
subgraph 84["import-preview-step"]
85["import-preview-step.component.ts"]
end
subgraph 86["import-select-step"]
87["import-select-step.component.ts"]
end
subgraph 88["import-summary-step"]
89["import-summary-step.component.ts"]
end
subgraph 8A["import-wizard"]
8B["import-wizard.component.ts"]
end
8C["index.ts"]
subgraph 8D["queued-file-row"]
8E["queued-file-row.component.ts"]
end
end
8F["import-batches.store.ts"]
8G["import-queue.ts"]
8H["import-wizard-session.ts"]
8I["import.routes.ts"]
8J["index.ts"]
8K["mapper-steps.ts"]
8L["mapping-profiles.store.ts"]
end
subgraph 8M["feature-income"]
8N["career-start-date.ts"]
subgraph 8O["components"]
subgraph 8P["income-career-start"]
8Q["income-career-start.component.ts"]
end
subgraph 8R["income-category-checklist"]
8S["income-category-checklist.component.ts"]
end
subgraph 8T["income-chart-cell"]
8U["income-chart-cell.component.ts"]
end
subgraph 8V["income-events-sidebar"]
8W["income-events-sidebar.component.ts"]
end
subgraph 8X["income-gross-color"]
8Y["income-gross-color.component.ts"]
end
subgraph 8Z["income-gross-net-section"]
90["income-gross-net-section.component.ts"]
end
subgraph 91["income-growth-panel"]
92["income-growth-panel.component.ts"]
end
subgraph 93["income-intro"]
94["income-intro.component.ts"]
end
subgraph 95["income-main-category"]
96["income-main-category.component.ts"]
end
subgraph 97["income-overview"]
98["income-overview.component.ts"]
end
subgraph 99["income-settings-page"]
9A["income-settings-page.component.ts"]
end
subgraph 9B["income-yearly-panel"]
9C["income-yearly-panel.component.ts"]
end
9D["index.ts"]
subgraph 9E["salary-details-page"]
9F["salary-details-page.component.ts"]
end
subgraph 9G["salary-metadata-table"]
9H["salary-metadata-table.component.ts"]
end
subgraph 9I["salary-month-modal"]
9J["salary-month-modal.component.ts"]
end
end
9K["gross-net-chart-options.ts"]
9L["income-category-vm.ts"]
9M["income-event-vm.ts"]
9N["income-granularity.ts"]
9O["income.routes.ts"]
9P["income.store.ts"]
9Q["index.ts"]
9R["salary-metadata-edit.ts"]
9S["salary-metadata-rows.ts"]
end
subgraph 9T["feature-learning"]
subgraph 9U["components"]
9V["index.ts"]
subgraph 9W["learning-overview"]
9X["learning-overview.component.ts"]
end
subgraph 9Y["model-status-badge"]
9Z["model-status-badge.component.ts"]
end
subgraph A0["model-status"]
A1["model-status.component.ts"]
end
subgraph A2["rule-proposals"]
A3["rule-proposals.component.ts"]
end
subgraph A4["suggestions-table"]
A5["suggestions-table.component.ts"]
end
end
A6["index.ts"]
A7["learning.routes.ts"]
A8["model-status-display.ts"]
end
subgraph A9["feature-recurring"]
AA["bills-calendar-vm.ts"]
subgraph AB["components"]
subgraph AC["bills-calendar"]
AD["bills-calendar.component.ts"]
end
subgraph AE["bills-day-list"]
AF["bills-day-list.component.ts"]
end
subgraph AG["bills-month-grid"]
AH["bills-month-grid.component.ts"]
end
AI["index.ts"]
subgraph AJ["recurring-overview"]
AK["recurring-overview.component.ts"]
end
subgraph AL["recurring-payments-panel"]
AM["recurring-payments-panel.component.ts"]
end
end
AN["index.ts"]
AO["recurring-payments-row-vm.ts"]
AP["recurring-series.store.ts"]
AQ["recurring.routes.ts"]
end
subgraph AR["feature-settings"]
subgraph AS["components"]
AT["index.ts"]
subgraph AU["settings-about-section"]
AV["settings-about-section.component.ts"]
end
subgraph AW["settings-currency-locale-section"]
AX["settings-currency-locale-section.component.ts"]
end
subgraph AY["settings-data-section"]
AZ["settings-data-section.component.ts"]
end
subgraph B0["settings-overview"]
B1["settings-overview.component.ts"]
end
subgraph B2["settings-privacy-section"]
B3["settings-privacy-section.component.ts"]
end
subgraph B4["settings-theme-section"]
B5["settings-theme-section.component.ts"]
end
end
B6["index.ts"]
B7["settings.routes.ts"]
end
subgraph B8["feature-transactions"]
B9["category-picker.ts"]
subgraph BA["components"]
subgraph BB["attribution-override-fieldset"]
BC["attribution-override-fieldset.component.ts"]
end
subgraph BD["category-select-cell"]
BE["category-select-cell.component.ts"]
end
BF["index.ts"]
subgraph BG["transaction-bulk-bar"]
BH["transaction-bulk-bar.component.ts"]
end
subgraph BI["transaction-edit-form"]
BJ["transaction-edit-form.component.ts"]
end
subgraph BK["transaction-filters"]
BL["transaction-filters.component.ts"]
end
subgraph BM["transaction-row"]
BN["transaction-row.component.ts"]
end
subgraph BO["transactions-overview"]
BP["transactions-overview.component.ts"]
end
subgraph BQ["transfer-review"]
BR["transfer-review.component.ts"]
end
end
BS["index.ts"]
BT["transaction-filters.ts"]
BU["transaction-row-vm.ts"]
BV["transactions.routes.ts"]
end
subgraph BW["shared"]
subgraph BX["echarts"]
BY["bucketed-axis-option.ts"]
BZ["chart-theme.ts"]
C0["echarts-jsdom.testing.ts"]
C1["echarts-setup.ts"]
C2["index.ts"]
C3["legend-option.ts"]
C4["tooltip-formatter.ts"]
end
subgraph C5["ui"]
subgraph C6["alert"]
C7["alert.component.ts"]
end
subgraph C8["badge"]
C9["badge.component.ts"]
end
subgraph CA["button"]
CB["button.component.ts"]
end
subgraph CC["collapse"]
CD["collapse.component.ts"]
end
subgraph CE["confirm-dialog"]
CF["confirm-dialog.component.ts"]
end
subgraph CG["cycle-picker"]
CH["cycle-picker.component.ts"]
end
subgraph CI["date-range-input"]
CJ["date-range-input.component.ts"]
end
subgraph CK["divider"]
CL["divider.component.ts"]
end
subgraph CM["dropdown"]
CN["dropdown.component.ts"]
end
subgraph CO["empty-state"]
CP["empty-state.component.ts"]
end
subgraph CQ["fieldset"]
CR["fieldset.component.ts"]
end
subgraph CS["flex"]
CT["flex.component.ts"]
end
subgraph CU["granularity-picker"]
CV["granularity-picker.component.ts"]
end
CW["index.ts"]
subgraph CX["input"]
CY["input.component.ts"]
end
subgraph CZ["label"]
D0["label.component.ts"]
end
subgraph D1["loading-skeleton"]
D2["loading-skeleton.component.ts"]
end
subgraph D3["modal"]
D4["mm-modal.component.ts"]
end
subgraph D5["page-header"]
D6["page-header.component.ts"]
end
subgraph D7["paginator"]
D8["paginator.component.ts"]
end
subgraph D9["paper"]
DA["paper.component.ts"]
end
subgraph DB["privacy-blur"]
DC["privacy-blur.component.ts"]
end
subgraph DD["privacy-toggle"]
DE["privacy-toggle.component.ts"]
end
subgraph DF["range-grouping-switcher"]
DG["range-grouping-switcher.component.ts"]
end
subgraph DH["select"]
DI["select.component.ts"]
end
subgraph DJ["stat-card"]
DK["stat-card.component.ts"]
end
subgraph DL["table"]
DM["table.component.ts"]
end
subgraph DN["tabs"]
DO["tabs.component.ts"]
end
subgraph DP["typography"]
DQ["typography.component.ts"]
end
end
subgraph DR["utils"]
DS["calendar-cycles.ts"]
DT["confidence-color.ts"]
DU["confirm-state.ts"]
DV["currency-format.ts"]
DW["currency-symbol-presets.ts"]
DX["daisy-classes.ts"]
DY["date-buckets.ts"]
DZ["date-format.pipe.ts"]
E0["date-format.ts"]
E1["debounced-text.ts"]
E2["download-json.ts"]
E3["fingerprint.ts"]
E4["format-settings.testing.ts"]
E5["format-settings.ts"]
E6["hidden-amount.ts"]
E7["iban.ts"]
E8["index.ts"]
E9["link-control-to-setting.ts"]
EA["locale-presets.ts"]
EB["number-format.ts"]
EC["pagination.ts"]
ED["percentage.ts"]
EE["search-params.ts"]
EF["selection-model.ts"]
EG["signed-amount.pipe.ts"]
EH["sortable.ts"]
EI["structural-filters.ts"]
EJ["theme-hooks.ts"]
subgraph EK["validators"]
EL["iban.validator.ts"]
EM["percentage.validator.ts"]
end
EN["with-archivable.ts"]
EO["with-persisted-crud.ts"]
end
end
end
end
4-->O
4-->3I
5-->4
5-->6
6-->O
6-->E8
8-->O
9-->A
9-->O
A-->5
A-->O
B-->8
B-->A
B-->9
B-->C
B-->D
C-->O
D-->C
D-->O
F-->G
G-->1H
G-->38
G-->E3
G-->E5
H-->G
H-->39
H-->E8
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
O-->F
O-->G
O-->H
O-->I
O-->J
O-->K
O-->L
O-->M
O-->N
O-->P
O-->Q
O-->R
O-->S
O-->T
O-->U
P-->G
Q-->G
R-->G
S-->G
T-->G
U-->G
W-->O
W-->E8
X-->11
X-->O
Y-->10
Y-->11
Z-->Y
Z-->11
10-->O
11-->10
11-->O
13-->10
13-->O
13-->3I
13-->E8
14-->W
14-->X
14-->Y
14-->10
14-->11
14-->12
14-->13
17-->1V
17-->CB
17-->DQ
18-->17
1B-->1A
1D-->1E
1D-->1F
1D-->1H
1E-->1H
1F-->1H
1G-->1E
1G-->1F
1G-->1H
1G-->1I
1G-->1J
1I-->B
1I-->O
1L-->1O
1M-->1L
1M-->1N
1M-->1O
1N-->1O
1Q-->1S
1Q-->1Y
1Q-->20
1Q-->5
1Q-->O
1Q-->2O
1Q-->3I
1Q-->E8
1R-->O
1R-->39
1R-->E8
1S-->1Y
1S-->O
1S-->E8
1T-->1U
1T-->C2
1T-->E8
1U-->C2
1U-->E8
1V-->1Q
1V-->1R
1V-->1S
1V-->1T
1V-->1U
1V-->1W
1V-->1X
1V-->1Y
1V-->1Z
1V-->20
1W-->1Q
1W-->1X
1W-->1Y
1W-->2O
1W-->E8
1X-->E8
1Y-->O
1Y-->3E
1Y-->3I
1Z-->O
20-->1Y
20-->1Z
20-->O
20-->3I
22-->O
22-->E8
23-->22
23-->O
23-->E8
24-->26
24-->2J
24-->E8
25-->2B
25-->O
26-->25
26-->O
26-->E8
27-->25
27-->2B
27-->O
27-->E8
28-->O
29-->25
29-->2V
29-->O
2A-->E8
2B-->28
2B-->2C
2B-->O
2B-->3I
2C-->5
2C-->O
2D-->O
2E-->26
2E-->2J
2E-->O
2E-->E8
2F-->O
2G-->E8
2H-->2I
2I-->2J
2I-->O
2J-->26
2J-->O
2J-->E8
2K-->2L
2K-->2N
2K-->30
2K-->O
2L-->26
2L-->2J
2L-->E8
2M-->2J
2M-->32
2M-->E8
2N-->26
2N-->2E
2N-->2J
2N-->E8
2O-->22
2O-->23
2O-->24
2O-->25
2O-->26
2O-->27
2O-->28
2O-->29
2O-->2A
2O-->2B
2O-->2C
2O-->2D
2O-->2E
2O-->2F
2O-->2G
2O-->2H
2O-->2I
2O-->2J
2O-->2K
2O-->2L
2O-->2M
2O-->2N
2O-->2P
2O-->2Q
2O-->2R
2O-->2S
2O-->2T
2O-->2U
2O-->2V
2O-->2W
2O-->2X
2O-->2Y
2O-->2Z
2O-->30
2O-->31
2O-->32
2O-->33
2P-->2C
2P-->O
2Q-->2C
2Q-->5
2Q-->O
2R-->O
2R-->E8
2S-->33
2U-->2B
2U-->O
2V-->E8
2W-->E8
2X-->2B
2X-->B
2X-->O
2X-->E8
2Y-->2X
2Y-->E8
2Z-->O
2Z-->3I
30-->2I
31-->2B
31-->O
31-->E8
32-->2U
32-->O
33-->26
33-->O
33-->E8
35-->36
38-->3A
39-->38
39-->3A
39-->3B
3B-->3A
3D-->O
3E-->3D
3E-->3F
3E-->3G
3F-->O
3G-->O
3G-->3I
3I-->3J
3I-->3K
3I-->3M
3I-->3L
3J-->O
3K-->3M
3K-->O
3L-->3K
3L-->3M
3L-->O
3M-->6
3M-->O
3M-->E8
3O-->O
3P-->O
3Q-->O
3R-->O
3S-->47
3S-->49
3S-->C2
3T-->2O
3T-->E8
3U-->O
3U-->1V
3U-->2O
3U-->E8
3X-->CW
3X-->E8
3Z-->3T
3Z-->3U
3Z-->O
3Z-->2O
3Z-->C2
3Z-->CW
3Z-->E8
41-->3T
41-->3U
41-->O
41-->1V
41-->2O
41-->C2
41-->CW
43-->3O
43-->3P
43-->3X
43-->CW
45-->3P
45-->3R
45-->O
45-->CW
45-->E8
45-->EL
45-->EM
47-->3X
47-->3Z
47-->45
47-->1V
47-->CW
47-->E8
49-->3O
49-->3P
49-->3Q
49-->41
49-->43
49-->45
49-->O
49-->1V
49-->CW
49-->E8
4A-->3X
4A-->3Z
4A-->41
4A-->43
4A-->45
4A-->47
4A-->49
4B-->3P
4B-->3R
4B-->3S
4B-->4A
4D-->4K
4D-->4X
4F-->1G
4G-->4F
4G-->54
4G-->O
4G-->1G
4G-->1V
4H-->O
4H-->CW
4K-->4E
4K-->4H
4K-->4M
4K-->B
4K-->O
4K-->1V
4K-->CW
4K-->E8
4M-->4E
4M-->O
4M-->CW
4N-->4K
4N-->4M
4N-->4R
4N-->4T
4N-->4V
4N-->4X
4P-->4Z
4P-->51
4P-->B
4P-->O
4P-->1V
4P-->CW
4R-->50
4R-->1V
4R-->CW
4R-->E8
4T-->4Z
4T-->4P
4T-->B
4T-->O
4T-->1V
4T-->CW
4V-->52
4V-->54
4V-->CW
4V-->E8
4X-->50
4X-->53
4X-->54
4X-->4R
4X-->4T
4X-->4V
4X-->O
4X-->1V
4X-->CW
4X-->E8
4Y-->4D
4Y-->4E
4Y-->4F
4Y-->4G
4Y-->4N
4Y-->50
4Y-->53
4Y-->54
4Z-->51
4Z-->O
50-->53
50-->O
51-->O
52-->O
53-->51
53-->O
54-->52
54-->B
54-->O
54-->1V
54-->E8
56-->5B
59-->CW
5B-->5E
5B-->5F
5B-->5G
5B-->5H
5B-->59
5B-->CW
5C-->5B
5G-->5E
5H-->5F
5I-->56
5I-->5C
5K-->O
5O-->1V
5O-->CW
5O-->E8
5Q-->1V
5Q-->3I
5Q-->CW
5Q-->E8
5S-->6G
5S-->1V
5S-->2O
5S-->C2
5S-->CW
5S-->E8
5U-->5K
5U-->5L
5U-->6G
5U-->5W
5U-->5Y
5U-->1V
5U-->CW
5U-->E8
5W-->1V
5W-->CW
5Y-->5L
5Y-->CW
60-->6C
60-->6D
60-->O
60-->CW
62-->6C
62-->6D
62-->6G
62-->5O
62-->5Q
62-->5S
62-->5U
62-->60
62-->65
62-->67
62-->69
62-->6B
62-->1V
62-->2O
62-->CW
62-->E8
63-->5O
63-->5Q
63-->5S
63-->5U
63-->5W
63-->60
63-->62
63-->65
63-->67
63-->69
63-->6B
65-->5W
65-->1V
65-->2O
65-->3I
65-->C2
65-->CW
65-->E8
67-->6G
67-->1V
67-->CW
67-->E8
69-->1V
69-->2O
69-->3I
69-->C2
69-->CW
69-->E8
6B-->6G
6B-->1V
6B-->CW
6B-->E8
6C-->6D
6C-->O
6D-->O
6E-->62
6E-->C2
6F-->63
6F-->6E
6G-->5K
6G-->1V
6G-->2O
6G-->3I
6K-->O
6K-->35
6K-->CW
6K-->E8
6L-->6K
6M-->6L
6Q-->6T
6Q-->1V
6Q-->CW
6R-->6Q
6R-->6T
6T-->1V
6T-->2O
6T-->C2
6T-->CW
6T-->E8
6U-->6Q
6U-->C2
6V-->6R
6V-->6U
6Z-->78
6Z-->CW
71-->79
71-->73
71-->CW
73-->79
73-->CW
75-->79
75-->CW
76-->6Z
76-->71
76-->73
76-->75
7A-->6Z
7A-->71
7A-->75
7B-->76
7B-->79
7B-->7A
7F-->1B
7F-->CW
7G-->7F
7H-->7F
7I-->7G
7I-->7H
7K-->O
7N-->8G
7N-->4B
7N-->CW
7P-->CW
7R-->7V
7R-->CW
7T-->7V
7T-->CW
7V-->CW
7X-->7K
7X-->7V
7X-->CW
7Z-->8K
7Z-->CW
81-->7K
81-->CW
83-->7K
83-->8K
83-->8L
83-->7R
83-->7T
83-->7X
83-->7Z
83-->81
83-->85
83-->O
83-->14
83-->CW
85-->14
85-->CW
85-->E8
87-->8G
87-->8L
87-->8E
87-->O
87-->14
87-->CW
89-->O
89-->CW
8B-->8H
8B-->7P
8B-->83
8B-->87
8B-->89
8B-->1V
8B-->CW
8C-->83
8C-->85
8C-->87
8C-->89
8C-->8B
8E-->8G
8E-->7N
8E-->O
8E-->CW
8F-->B
8F-->O
8F-->14
8F-->1V
8G-->O
8H-->7K
8H-->8F
8H-->8G
8H-->8L
8H-->O
8H-->14
8H-->1V
8H-->4B
8I-->8B
8J-->7K
8J-->8C
8J-->8F
8J-->8G
8J-->8I
8J-->8K
8J-->8L
8K-->7K
8L-->O
8N-->2O
8Q-->8N
8Q-->9P
8Q-->CW
8Q-->E8
8S-->9L
8S-->CW
8U-->CW
8W-->9M
8W-->9N
8W-->9P
8W-->1V
8W-->2O
8W-->CW
8Y-->9P
8Y-->39
8Y-->C2
8Y-->CW
90-->9K
90-->9P
90-->8U
90-->1V
90-->2O
90-->C2
90-->CW
90-->E8
92-->9N
92-->9P
92-->1V
92-->2O
92-->CW
92-->E8
94-->1V
94-->7B
94-->CW
96-->9L
96-->9P
96-->CW
98-->9P
98-->9S
98-->8W
98-->90
98-->92
98-->94
98-->9C
98-->9J
98-->1V
98-->2O
98-->7B
98-->C2
98-->CW
98-->E8
9A-->9L
9A-->9P
9A-->8Q
9A-->8S
9A-->8Y
9A-->96
9A-->CW
9C-->9P
9C-->1V
9C-->2O
9C-->3I
9C-->C2
9C-->CW
9C-->E8
9D-->8Q
9D-->8S
9D-->8U
9D-->8W
9D-->90
9D-->92
9D-->94
9D-->96
9D-->98
9D-->9A
9D-->9C
9D-->9F
9D-->9H
9D-->9J
9F-->9H
9F-->CW
9H-->9N
9H-->9P
9H-->9R
9H-->9S
9H-->CW
9H-->E8
9J-->9P
9J-->9R
9J-->9S
9J-->9H
9J-->O
9J-->CW
9K-->2O
9K-->C2
9K-->E8
9L-->O
9M-->9N
9M-->O
9M-->2O
9M-->CW
9M-->E8
9N-->E8
9O-->98
9O-->9A
9O-->9F
9O-->C2
9P-->8N
9P-->9N
9P-->O
9P-->1V
9P-->2O
9P-->39
9P-->3I
9Q-->9D
9Q-->9L
9Q-->9N
9Q-->9O
9Q-->9P
9Q-->9R
9Q-->9S
9R-->O
9S-->O
9V-->9X
9V-->A1
9V-->A3
9V-->A5
9X-->9Z
9X-->A1
9X-->A3
9X-->A5
9X-->CW
9Z-->A8
9Z-->4Y
9Z-->CW
A1-->A8
A1-->1G
A1-->1V
A1-->4Y
A1-->CW
A3-->O
A3-->1G
A3-->1V
A3-->4Y
A3-->CW
A3-->E8
A5-->O
A5-->1V
A5-->4Y
A5-->CW
A5-->E8
A6-->9V
A6-->A7
A7-->9X
A8-->4Y
A8-->CW
AA-->CW
AD-->AA
AD-->AP
AD-->AF
AD-->AH
AD-->1V
AD-->2O
AD-->CW
AD-->E8
AF-->AA
AF-->CW
AH-->AA
AH-->CW
AI-->AD
AI-->AF
AI-->AH
AI-->AK
AI-->AM
AK-->AD
AK-->AM
AK-->1V
AK-->CW
AM-->AO
AM-->AP
AM-->1V
AM-->2O
AM-->C2
AM-->CW
AM-->E8
AN-->AI
AN-->AQ
AP-->1V
AP-->2O
AP-->3I
AQ-->AK
AT-->B1
AV-->1B
AV-->CW
AX-->1V
AX-->CW
AX-->E8
AZ-->6M
AZ-->CW
B1-->AV
B1-->AX
B1-->AZ
B1-->B3
B1-->B5
B1-->CW
B3-->1V
B3-->CW
B3-->E8
B5-->1V
B5-->39
B5-->CW
B6-->AT
B6-->B7
B7-->B1
B9-->O
BC-->O
BC-->1V
BC-->3E
BC-->CW
BC-->E8
BE-->B9
BF-->BH
BF-->BJ
BF-->BL
BF-->BP
BF-->BR
BH-->B9
BH-->B
BH-->1V
BH-->CW
BJ-->B9
BJ-->BC
BJ-->B
BJ-->O
BJ-->1V
BJ-->3E
BJ-->4Y
BJ-->CW
BL-->B9
BL-->BT
BL-->B
BL-->1V
BL-->CW
BL-->E8
BN-->B9
BN-->BU
BN-->BE
BN-->CW
BN-->E8
BP-->B9
BP-->BT
BP-->BU
BP-->BH
BP-->BJ
BP-->BL
BP-->BN
BP-->BR
BP-->B
BP-->O
BP-->1V
BP-->3I
BP-->4Y
BP-->CW
BP-->E8
BR-->1V
BR-->3I
BR-->CW
BR-->E8
BS-->BV
BT-->O
BT-->3I
BU-->O
BV-->BP
C2-->BY
C2-->BZ
C2-->C1
C2-->C3
C2-->C4
C4-->E8
C7-->E8
C9-->E8
CB-->E8
CD-->E8
CF-->CB
CF-->D0
CF-->D4
CF-->DQ
CH-->E8
CJ-->CN
CJ-->E8
CL-->E8
CN-->E8
CP-->CT
CP-->DQ
CR-->E8
CT-->E8
CW-->C7
CW-->C9
CW-->CB
CW-->CD
CW-->CF
CW-->CH
CW-->CJ
CW-->CL
CW-->CN
CW-->CP
CW-->CR
CW-->CT
CW-->CV
CW-->CY
CW-->D0
CW-->D2
CW-->D4
CW-->D6
CW-->D8
CW-->DA
CW-->DC
CW-->DE
CW-->DG
CW-->DI
CW-->DK
CW-->DM
CW-->DO
CW-->DQ
CY-->E8
D0-->E8
D2-->CT
D4-->E8
D6-->CT
D6-->DQ
D8-->CB
D8-->CT
D8-->DQ
D8-->E8
DA-->E8
DC-->E8
DE-->CB
DE-->1V
DG-->CB
DG-->CJ
DG-->CT
DI-->E8
DK-->DC
DK-->DQ
DK-->E8
DM-->E8
DO-->E8
DQ-->E8
DS-->E0
DV-->E5
DY-->E5
DZ-->E0
E0-->E5
E4-->E5
E8-->DS
E8-->DT
E8-->DU
E8-->DV
E8-->DW
E8-->DX
E8-->DY
E8-->E0
E8-->DZ
E8-->E1
E8-->E2
E8-->E3
E8-->E5
E8-->E6
E8-->E7
E8-->E9
E8-->EA
E8-->EB
E8-->EC
E8-->ED
E8-->EE
E8-->EF
E8-->EG
E8-->EH
E8-->EI
E8-->EJ
E8-->EN
E8-->EO
EB-->E5
EG-->DV
```
