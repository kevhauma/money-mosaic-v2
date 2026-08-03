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
- 328 leaf nodes, 932 edges.
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
8["co-owner-contribution.service.ts"]
9["co-owner-contribution.ts"]
A["index.ts"]
B["rule-matching.ts"]
C["rules-engine.service.ts"]
end
subgraph D["data-access"]
E["accounts.repository.ts"]
F["app-db.ts"]
G["app-settings.repository.ts"]
H["categories.repository.ts"]
I["category-comparison-settings.repository.ts"]
J["category-model.repository.ts"]
K["dashboard-layout-settings.repository.ts"]
L["data-management.repository.ts"]
M["import-batches.repository.ts"]
N["index.ts"]
O["mapping-profiles.repository.ts"]
P["rules.repository.ts"]
Q["salary-metadata.repository.ts"]
R["transactions.repository.ts"]
S["transfer-settings.repository.ts"]
T["transfers.repository.ts"]
end
subgraph U["import"]
V["account-detection.ts"]
W["csv-import.service.ts"]
X["csv-parse.ts"]
Y["csv-parse.worker.ts"]
Z["csv-row-mapper.ts"]
10["csv-worker.types.ts"]
11["delimiter-guess.ts"]
12["import.service.ts"]
13["index.ts"]
end
subgraph 14["layout"]
subgraph 15["app-shell"]
16["app-shell.component.ts"]
end
17["index.ts"]
end
subgraph 18["links"]
19["external-links.ts"]
1A["index.ts"]
end
subgraph 1B["ml"]
1C["category-model.worker.ts"]
1D["category-model.worker.types.ts"]
1E["feature-hashing.ts"]
1F["index.ts"]
1G["model-config.ts"]
1H["rule-proposal-mining.ts"]
1I["training-window.ts"]
end
subgraph 1J["onboarding"]
1K["home-redirect.guard.ts"]
1L["index.ts"]
1M["mark-visited.guard.ts"]
1N["visited.service.ts"]
end
subgraph 1O["state"]
1P["accounts.store.ts"]
1Q["app-settings.store.ts"]
1R["categories.store.ts"]
1S["chart-options-control.ts"]
1T["chart-options.store.ts"]
1U["index.ts"]
1V["page-range-control.ts"]
1W["range-state.store.ts"]
1X["transactions.store.ts"]
1Y["transfer-settings.store.ts"]
1Z["transfers.store.ts"]
end
subgraph 20["stats"]
21["account-balance-history.ts"]
22["account-balance-trend.ts"]
23["annual-lump-sum-smoothing.ts"]
24["category-breakdown.ts"]
25["category-composition-trend.ts"]
26["category-kind-contribution.ts"]
27["category-period-comparison.ts"]
28["chart-zoom-window.ts"]
29["classify-for-stats.ts"]
2A["classify-joint-leg.ts"]
2B["day-transactions.ts"]
2C["embedded-bonus-smoothing.ts"]
2D["full-history-range.ts"]
2E["granularity-for-span.ts"]
2F["gross-net-growth.ts"]
2G["gross-net-ratio.ts"]
2H["income-category-series.ts"]
2I["income-events.ts"]
2J["income-gap-detection.ts"]
2K["income-growth.ts"]
2L["income-step-change-detection.ts"]
2M["index.ts"]
2N["joint-account-stake.ts"]
2O["joint-contributor-breakdown.ts"]
2P["multi-year-income-comparison.ts"]
2Q["net-margin.ts"]
2R["period-stats.ts"]
2S["period-window.ts"]
2T["periodized-rate.ts"]
2U["top-transactions.ts"]
2V["wage-change-detection.ts"]
2W["weekday-weekend-split.ts"]
2X["year-over-year.ts"]
2Y["yearly-income-summary.ts"]
end
subgraph 2Z["storage"]
30["index.ts"]
31["storage-status.service.ts"]
end
subgraph 32["theme"]
33["accent-colors.ts"]
34["index.ts"]
35["theme-styles.ts"]
36["theme.service.ts"]
end
subgraph 37["transactions"]
38["attribution-override.ts"]
39["index.ts"]
3A["nullify-transaction.ts"]
3B["transaction-deletion.service.ts"]
end
subgraph 3C["transfers"]
3D["index.ts"]
3E["transfer-cleanup.service.ts"]
3F["transfer-linking.service.ts"]
3G["transfer-matching.service.ts"]
3H["transfer-matching.ts"]
end
end
subgraph 3I["feature-accounts"]
3J["account-card-vm.ts"]
3K["account-icons.ts"]
3L["account-list-order.ts"]
3M["account-types.ts"]
3N["accounts.routes.ts"]
3O["balance-day-tooltip.ts"]
3P["balance-trend-signals.ts"]
subgraph 3Q["components"]
subgraph 3R["account-balance-block"]
3S["account-balance-block.component.ts"]
end
subgraph 3T["account-balance-chart"]
3U["account-balance-chart.component.ts"]
end
subgraph 3V["account-balance-history-chart"]
3W["account-balance-history-chart.component.ts"]
end
subgraph 3X["account-card"]
3Y["account-card.component.ts"]
end
subgraph 3Z["account-form"]
40["account-form.component.ts"]
end
subgraph 41["accounts-detail"]
42["accounts-detail.component.ts"]
end
subgraph 43["accounts-overview"]
44["accounts-overview.component.ts"]
end
45["index.ts"]
end
46["index.ts"]
end
subgraph 47["feature-categories"]
48["categories.routes.ts"]
49["category-icons.ts"]
4A["category-model.service.ts"]
4B["category-model.store.ts"]
subgraph 4C["components"]
subgraph 4D["categories-overview"]
4E["categories-overview.component.ts"]
end
subgraph 4F["category-form"]
4G["category-form.component.ts"]
end
4H["index.ts"]
subgraph 4I["rule-condition-row"]
4J["rule-condition-row.component.ts"]
end
subgraph 4K["rule-filters"]
4L["rule-filters.component.ts"]
end
subgraph 4M["rule-form"]
4N["rule-form.component.ts"]
end
subgraph 4O["rule-share-bar"]
4P["rule-share-bar.component.ts"]
end
subgraph 4Q["rules-overview"]
4R["rules-overview.component.ts"]
end
end
4S["index.ts"]
4T["rule-condition-editor.ts"]
4U["rule-filters.ts"]
4V["rule-labels.ts"]
4W["rule-share.ts"]
4X["rule-summary.ts"]
4Y["rules.store.ts"]
end
subgraph 4Z["feature-changelog"]
50["changelog.routes.ts"]
subgraph 51["components"]
subgraph 52["changelog-entry-row"]
53["changelog-entry-row.component.ts"]
end
subgraph 54["changelog-page"]
55["changelog-page.component.ts"]
end
56["index.ts"]
end
subgraph 57["data"]
58["changelog-entries.ts"]
59["roadmap-entries.ts"]
end
5A["group-changelog-entries.ts"]
5B["group-roadmap-entries.ts"]
5C["index.ts"]
end
subgraph 5D["feature-dashboard"]
5E["category-comparison-settings.store.ts"]
5F["category-comparison-vm.ts"]
subgraph 5G["components"]
subgraph 5H["account-balance-strip"]
5I["account-balance-strip.component.ts"]
end
subgraph 5J["action-queue-panel"]
5K["action-queue-panel.component.ts"]
end
subgraph 5L["category-breakdown-panel"]
5M["category-breakdown-panel.component.ts"]
end
subgraph 5N["category-comparison-panel"]
5O["category-comparison-panel.component.ts"]
end
subgraph 5P["comparison-category-card"]
5Q["comparison-category-card.component.ts"]
end
subgraph 5R["dashboard-customize-panel"]
5S["dashboard-customize-panel.component.ts"]
end
subgraph 5T["dashboard-overview"]
5U["dashboard-overview.component.ts"]
end
5V["index.ts"]
subgraph 5W["top-transactions-panel"]
5X["top-transactions-panel.component.ts"]
end
subgraph 5Y["trend-chart-panel"]
5Z["trend-chart-panel.component.ts"]
end
subgraph 60["weekday-weekend-split-panel"]
61["weekday-weekend-split-panel.component.ts"]
end
end
62["dashboard-layout-settings.store.ts"]
63["dashboard-row-order.ts"]
64["dashboard.routes.ts"]
65["index.ts"]
66["stats.store.ts"]
end
subgraph 67["feature-data-management"]
subgraph 68["components"]
subgraph 69["data-management-overview"]
6A["data-management-overview.component.ts"]
end
6B["index.ts"]
end
6C["index.ts"]
end
subgraph 6D["feature-help"]
subgraph 6E["components"]
subgraph 6F["faq-page"]
6G["faq-page.component.ts"]
end
subgraph 6H["guide-detail"]
6I["guide-detail.component.ts"]
end
subgraph 6J["guide-steps"]
6K["guide-steps.component.ts"]
end
subgraph 6L["guides-index"]
6M["guides-index.component.ts"]
end
6N["index.ts"]
end
subgraph 6O["data"]
6P["faq.ts"]
6Q["guides.ts"]
end
6R["help.routes.ts"]
6S["index.ts"]
end
subgraph 6T["feature-home"]
subgraph 6U["components"]
subgraph 6V["home-landing"]
6W["home-landing.component.ts"]
end
6X["index.ts"]
end
6Y["home.routes.ts"]
6Z["index.ts"]
end
subgraph 70["feature-import"]
71["column-mapping.ts"]
subgraph 72["components"]
subgraph 73["account-draft-editor"]
74["account-draft-editor.component.ts"]
end
subgraph 75["batch-wait-card"]
76["batch-wait-card.component.ts"]
end
subgraph 77["column-map-amount-field"]
78["column-map-amount-field.component.ts"]
end
subgraph 79["column-map-counterparty-field"]
7A["column-map-counterparty-field.component.ts"]
end
subgraph 7B["column-map-sample-caption"]
7C["column-map-sample-caption.component.ts"]
end
subgraph 7D["column-map-simple-field"]
7E["column-map-simple-field.component.ts"]
end
subgraph 7F["column-map-stepper"]
7G["column-map-stepper.component.ts"]
end
subgraph 7H["column-map-summary-step"]
7I["column-map-summary-step.component.ts"]
end
subgraph 7J["import-map-step"]
7K["import-map-step.component.ts"]
end
subgraph 7L["import-preview-step"]
7M["import-preview-step.component.ts"]
end
subgraph 7N["import-select-step"]
7O["import-select-step.component.ts"]
end
subgraph 7P["import-summary-step"]
7Q["import-summary-step.component.ts"]
end
subgraph 7R["import-wizard"]
7S["import-wizard.component.ts"]
end
7T["index.ts"]
subgraph 7U["queued-file-row"]
7V["queued-file-row.component.ts"]
end
end
7W["import-batches.store.ts"]
7X["import-queue.ts"]
7Y["import-wizard-session.ts"]
7Z["import.routes.ts"]
80["index.ts"]
81["mapper-steps.ts"]
82["mapping-profiles.store.ts"]
end
subgraph 83["feature-income"]
84["career-start-date.ts"]
subgraph 85["components"]
subgraph 86["income-career-start"]
87["income-career-start.component.ts"]
end
subgraph 88["income-category-checklist"]
89["income-category-checklist.component.ts"]
end
subgraph 8A["income-chart-cell"]
8B["income-chart-cell.component.ts"]
end
subgraph 8C["income-events-sidebar"]
8D["income-events-sidebar.component.ts"]
end
subgraph 8E["income-gross-color"]
8F["income-gross-color.component.ts"]
end
subgraph 8G["income-gross-net-section"]
8H["income-gross-net-section.component.ts"]
end
subgraph 8I["income-growth-panel"]
8J["income-growth-panel.component.ts"]
end
subgraph 8K["income-intro"]
8L["income-intro.component.ts"]
end
subgraph 8M["income-main-category"]
8N["income-main-category.component.ts"]
end
subgraph 8O["income-overview"]
8P["income-overview.component.ts"]
end
subgraph 8Q["income-settings-page"]
8R["income-settings-page.component.ts"]
end
subgraph 8S["income-yearly-panel"]
8T["income-yearly-panel.component.ts"]
end
8U["index.ts"]
subgraph 8V["salary-details-page"]
8W["salary-details-page.component.ts"]
end
subgraph 8X["salary-metadata-table"]
8Y["salary-metadata-table.component.ts"]
end
subgraph 8Z["salary-month-modal"]
90["salary-month-modal.component.ts"]
end
end
91["gross-net-chart-options.ts"]
92["income-category-vm.ts"]
93["income-event-vm.ts"]
94["income-granularity.ts"]
95["income.routes.ts"]
96["income.store.ts"]
97["index.ts"]
98["salary-metadata-edit.ts"]
99["salary-metadata-rows.ts"]
end
subgraph 9A["feature-learning"]
subgraph 9B["components"]
9C["index.ts"]
subgraph 9D["learning-overview"]
9E["learning-overview.component.ts"]
end
subgraph 9F["model-status-badge"]
9G["model-status-badge.component.ts"]
end
subgraph 9H["model-status"]
9I["model-status.component.ts"]
end
subgraph 9J["rule-proposals"]
9K["rule-proposals.component.ts"]
end
subgraph 9L["suggestions-table"]
9M["suggestions-table.component.ts"]
end
end
9N["index.ts"]
9O["learning.routes.ts"]
9P["model-status-display.ts"]
end
subgraph 9Q["feature-settings"]
subgraph 9R["components"]
9S["index.ts"]
subgraph 9T["settings-about-section"]
9U["settings-about-section.component.ts"]
end
subgraph 9V["settings-currency-locale-section"]
9W["settings-currency-locale-section.component.ts"]
end
subgraph 9X["settings-data-section"]
9Y["settings-data-section.component.ts"]
end
subgraph 9Z["settings-overview"]
A0["settings-overview.component.ts"]
end
subgraph A1["settings-theme-section"]
A2["settings-theme-section.component.ts"]
end
end
A3["index.ts"]
A4["settings.routes.ts"]
end
subgraph A5["feature-transactions"]
subgraph A6["components"]
subgraph A7["attribution-override-fieldset"]
A8["attribution-override-fieldset.component.ts"]
end
subgraph A9["category-select-cell"]
AA["category-select-cell.component.ts"]
end
AB["index.ts"]
subgraph AC["transaction-bulk-bar"]
AD["transaction-bulk-bar.component.ts"]
end
subgraph AE["transaction-edit-form"]
AF["transaction-edit-form.component.ts"]
end
subgraph AG["transaction-filters"]
AH["transaction-filters.component.ts"]
end
subgraph AI["transaction-row"]
AJ["transaction-row.component.ts"]
end
subgraph AK["transactions-overview"]
AL["transactions-overview.component.ts"]
end
subgraph AM["transfer-review"]
AN["transfer-review.component.ts"]
end
end
AO["index.ts"]
AP["transaction-filters.ts"]
AQ["transaction-row-vm.ts"]
AR["transactions.routes.ts"]
end
subgraph AS["shared"]
subgraph AT["echarts"]
AU["bucketed-axis-option.ts"]
AV["chart-theme.ts"]
AW["echarts-jsdom.testing.ts"]
AX["echarts-setup.ts"]
AY["index.ts"]
AZ["legend-option.ts"]
B0["tooltip-formatter.ts"]
end
subgraph B1["ui"]
subgraph B2["alert"]
B3["alert.component.ts"]
end
subgraph B4["badge"]
B5["badge.component.ts"]
end
subgraph B6["button"]
B7["button.component.ts"]
end
subgraph B8["collapse"]
B9["collapse.component.ts"]
end
subgraph BA["confirm-dialog"]
BB["confirm-dialog.component.ts"]
end
subgraph BC["date-range-input"]
BD["date-range-input.component.ts"]
end
subgraph BE["divider"]
BF["divider.component.ts"]
end
subgraph BG["dropdown"]
BH["dropdown.component.ts"]
end
subgraph BI["empty-state"]
BJ["empty-state.component.ts"]
end
subgraph BK["fieldset"]
BL["fieldset.component.ts"]
end
subgraph BM["flex"]
BN["flex.component.ts"]
end
subgraph BO["granularity-picker"]
BP["granularity-picker.component.ts"]
end
BQ["index.ts"]
subgraph BR["input"]
BS["input.component.ts"]
end
subgraph BT["label"]
BU["label.component.ts"]
end
subgraph BV["loading-skeleton"]
BW["loading-skeleton.component.ts"]
end
subgraph BX["modal"]
BY["mm-modal.component.ts"]
end
subgraph BZ["page-header"]
C0["page-header.component.ts"]
end
subgraph C1["paginator"]
C2["paginator.component.ts"]
end
subgraph C3["paper"]
C4["paper.component.ts"]
end
subgraph C5["range-grouping-switcher"]
C6["range-grouping-switcher.component.ts"]
end
subgraph C7["select"]
C8["select.component.ts"]
end
subgraph C9["stat-card"]
CA["stat-card.component.ts"]
end
subgraph CB["table"]
CC["table.component.ts"]
end
subgraph CD["tabs"]
CE["tabs.component.ts"]
end
subgraph CF["typography"]
CG["typography.component.ts"]
end
end
subgraph CH["utils"]
CI["confidence-color.ts"]
CJ["confirm-state.ts"]
CK["currency-format.ts"]
CL["currency-symbol-presets.ts"]
CM["daisy-classes.ts"]
CN["date-buckets.ts"]
CO["date-format.pipe.ts"]
CP["date-format.ts"]
CQ["debounced-text.ts"]
CR["download-json.ts"]
CS["fingerprint.ts"]
CT["format-settings.testing.ts"]
CU["format-settings.ts"]
CV["iban.ts"]
CW["index.ts"]
CX["link-control-to-setting.ts"]
CY["locale-presets.ts"]
CZ["number-format.ts"]
D0["pagination.ts"]
D1["percentage.ts"]
D2["search-params.ts"]
D3["selection-model.ts"]
D4["signed-amount.pipe.ts"]
D5["sortable.ts"]
D6["structural-filters.ts"]
D7["theme-hooks.ts"]
subgraph D8["validators"]
D9["iban.validator.ts"]
DA["percentage.validator.ts"]
end
DB["with-archivable.ts"]
DC["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->3D
5-->4
5-->6
6-->N
6-->CW
8-->9
8-->N
9-->5
9-->N
A-->9
A-->8
A-->B
A-->C
B-->N
C-->B
C-->N
E-->F
F-->1G
F-->33
F-->CS
F-->CU
G-->F
G-->34
G-->CW
H-->F
I-->F
J-->F
K-->F
L-->F
M-->F
N-->E
N-->F
N-->G
N-->H
N-->I
N-->J
N-->K
N-->L
N-->M
N-->O
N-->P
N-->Q
N-->R
N-->S
N-->T
O-->F
P-->F
Q-->F
R-->F
S-->F
T-->F
V-->N
V-->CW
W-->10
W-->N
X-->Z
X-->10
Y-->X
Y-->10
Z-->N
10-->Z
10-->N
12-->Z
12-->N
12-->3D
12-->CW
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1U
16-->B7
16-->CG
17-->16
1A-->19
1C-->1D
1C-->1E
1C-->1G
1D-->1G
1E-->1G
1F-->1D
1F-->1E
1F-->1G
1F-->1H
1F-->1I
1H-->A
1H-->N
1K-->1N
1L-->1K
1L-->1M
1L-->1N
1M-->1N
1P-->1R
1P-->1X
1P-->1Z
1P-->5
1P-->N
1P-->2M
1P-->3D
1P-->CW
1Q-->N
1Q-->34
1Q-->CW
1R-->1X
1R-->N
1R-->CW
1S-->1T
1S-->AY
1S-->CW
1T-->AY
1T-->CW
1U-->1P
1U-->1Q
1U-->1R
1U-->1S
1U-->1T
1U-->1V
1U-->1W
1U-->1X
1U-->1Y
1U-->1Z
1V-->1P
1V-->1W
1V-->1X
1V-->2M
1V-->CW
1W-->CW
1X-->N
1X-->39
1X-->3D
1Y-->N
1Z-->1X
1Z-->1Y
1Z-->N
1Z-->3D
21-->N
21-->CW
22-->21
22-->N
22-->CW
23-->25
23-->2H
23-->CW
24-->29
24-->N
25-->24
25-->N
25-->CW
26-->N
27-->24
27-->2S
27-->N
28-->CW
29-->26
29-->2A
29-->N
29-->3D
2A-->5
2A-->N
2B-->N
2C-->25
2C-->2H
2C-->N
2C-->CW
2D-->N
2E-->CW
2F-->2G
2G-->2H
2G-->N
2H-->25
2H-->N
2H-->CW
2I-->2J
2I-->2L
2I-->2V
2I-->N
2J-->25
2J-->2H
2J-->CW
2K-->2H
2K-->2X
2K-->CW
2L-->25
2L-->2C
2L-->2H
2L-->CW
2M-->21
2M-->22
2M-->23
2M-->24
2M-->25
2M-->26
2M-->27
2M-->28
2M-->29
2M-->2A
2M-->2B
2M-->2C
2M-->2D
2M-->2E
2M-->2F
2M-->2G
2M-->2H
2M-->2I
2M-->2J
2M-->2K
2M-->2L
2M-->2N
2M-->2O
2M-->2P
2M-->2Q
2M-->2R
2M-->2S
2M-->2T
2M-->2U
2M-->2V
2M-->2W
2M-->2X
2M-->2Y
2N-->2A
2N-->N
2O-->2A
2O-->5
2O-->N
2P-->2Y
2R-->29
2R-->N
2S-->CW
2T-->CW
2U-->N
2U-->3D
2V-->2G
2W-->29
2W-->N
2W-->CW
2X-->2R
2X-->N
2Y-->25
2Y-->N
2Y-->CW
30-->31
33-->35
34-->33
34-->35
34-->36
36-->35
38-->N
39-->38
39-->3A
39-->3B
3A-->N
3B-->N
3B-->3D
3D-->3E
3D-->3F
3D-->3H
3D-->3G
3E-->N
3F-->3H
3F-->N
3G-->3F
3G-->3H
3G-->N
3H-->6
3H-->N
3H-->CW
3J-->N
3K-->N
3L-->N
3M-->N
3N-->42
3N-->44
3N-->AY
3O-->2M
3O-->CW
3P-->N
3P-->1U
3P-->2M
3P-->CW
3S-->BQ
3S-->CW
3U-->3O
3U-->3P
3U-->N
3U-->2M
3U-->AY
3U-->BQ
3U-->CW
3W-->3O
3W-->3P
3W-->N
3W-->1U
3W-->2M
3W-->AY
3W-->BQ
3Y-->3J
3Y-->3K
3Y-->3S
3Y-->BQ
40-->3K
40-->3M
40-->N
40-->BQ
40-->CW
40-->D9
40-->DA
42-->3S
42-->3U
42-->40
42-->1U
42-->BQ
42-->CW
44-->3J
44-->3K
44-->3L
44-->3W
44-->3Y
44-->40
44-->N
44-->1U
44-->BQ
44-->CW
45-->3S
45-->3U
45-->3W
45-->3Y
45-->40
45-->42
45-->44
46-->3K
46-->3M
46-->3N
46-->45
48-->4E
48-->4R
4A-->1F
4B-->4A
4B-->4Y
4B-->N
4B-->1F
4B-->1U
4E-->49
4E-->4G
4E-->N
4E-->1U
4E-->BQ
4E-->CW
4G-->49
4G-->N
4G-->BQ
4H-->4E
4H-->4G
4H-->4L
4H-->4N
4H-->4P
4H-->4R
4J-->4T
4J-->4V
4J-->A
4J-->N
4J-->1U
4J-->BQ
4L-->4U
4L-->1U
4L-->BQ
4L-->CW
4N-->4T
4N-->4J
4N-->N
4N-->1U
4N-->BQ
4P-->4W
4P-->4Y
4P-->BQ
4P-->CW
4R-->4U
4R-->4X
4R-->4Y
4R-->4L
4R-->4N
4R-->4P
4R-->N
4R-->1U
4R-->BQ
4R-->CW
4S-->48
4S-->49
4S-->4A
4S-->4B
4S-->4H
4S-->4U
4S-->4X
4S-->4Y
4T-->4V
4T-->N
4U-->4X
4U-->N
4V-->N
4W-->N
4X-->4V
4X-->N
4Y-->4W
4Y-->A
4Y-->N
4Y-->1U
4Y-->CW
50-->55
53-->BQ
55-->58
55-->59
55-->5A
55-->5B
55-->53
55-->BQ
56-->55
5A-->58
5B-->59
5C-->50
5C-->56
5E-->N
5I-->1U
5I-->BQ
5I-->CW
5K-->1U
5K-->3D
5K-->BQ
5K-->CW
5M-->66
5M-->1U
5M-->2M
5M-->AY
5M-->BQ
5M-->CW
5O-->5E
5O-->5F
5O-->66
5O-->5Q
5O-->1U
5O-->BQ
5O-->CW
5Q-->5F
5Q-->BQ
5S-->62
5S-->63
5S-->N
5S-->BQ
5U-->62
5U-->63
5U-->66
5U-->5I
5U-->5K
5U-->5M
5U-->5O
5U-->5S
5U-->5X
5U-->5Z
5U-->61
5U-->1U
5U-->2M
5U-->BQ
5U-->CW
5V-->5I
5V-->5K
5V-->5M
5V-->5O
5V-->5S
5V-->5U
5V-->5X
5V-->5Z
5V-->61
5X-->66
5X-->1U
5X-->BQ
5X-->CW
5Z-->1U
5Z-->2M
5Z-->3D
5Z-->AY
5Z-->BQ
5Z-->CW
61-->66
61-->1U
61-->BQ
61-->CW
62-->63
62-->N
63-->N
64-->5U
64-->AY
65-->5V
65-->64
66-->5E
66-->1U
66-->2M
66-->3D
6A-->N
6A-->30
6A-->BQ
6A-->CW
6B-->6A
6C-->6B
6G-->6P
6G-->BQ
6I-->6Q
6I-->6K
6I-->BQ
6K-->6Q
6K-->BQ
6M-->6Q
6M-->BQ
6N-->6G
6N-->6I
6N-->6K
6N-->6M
6R-->6G
6R-->6I
6R-->6M
6S-->6N
6S-->6Q
6S-->6R
6W-->1A
6W-->BQ
6X-->6W
6Y-->6W
6Z-->6X
6Z-->6Y
71-->N
74-->7X
74-->46
74-->BQ
76-->BQ
78-->7C
78-->BQ
7A-->7C
7A-->BQ
7C-->BQ
7E-->71
7E-->7C
7E-->BQ
7G-->81
7G-->BQ
7I-->71
7I-->BQ
7K-->71
7K-->81
7K-->82
7K-->78
7K-->7A
7K-->7E
7K-->7G
7K-->7I
7K-->7M
7K-->N
7K-->13
7K-->BQ
7M-->13
7M-->BQ
7M-->CW
7O-->7X
7O-->82
7O-->7V
7O-->N
7O-->13
7O-->BQ
7Q-->N
7Q-->BQ
7S-->7Y
7S-->76
7S-->7K
7S-->7O
7S-->7Q
7S-->1U
7S-->BQ
7T-->7K
7T-->7M
7T-->7O
7T-->7Q
7T-->7S
7V-->7X
7V-->74
7V-->N
7V-->BQ
7W-->A
7W-->N
7W-->13
7W-->1U
7X-->N
7Y-->71
7Y-->7W
7Y-->7X
7Y-->82
7Y-->N
7Y-->13
7Y-->1U
7Y-->46
7Z-->7S
80-->71
80-->7T
80-->7W
80-->7X
80-->7Z
80-->81
80-->82
81-->71
82-->N
84-->2M
87-->84
87-->96
87-->BQ
87-->CW
89-->92
89-->BQ
8B-->BQ
8D-->93
8D-->94
8D-->96
8D-->1U
8D-->2M
8D-->BQ
8F-->96
8F-->34
8F-->AY
8F-->BQ
8H-->91
8H-->96
8H-->8B
8H-->2M
8H-->AY
8H-->BQ
8H-->CW
8J-->94
8J-->96
8J-->2M
8J-->BQ
8J-->CW
8L-->1U
8L-->6S
8L-->BQ
8N-->92
8N-->96
8N-->BQ
8P-->96
8P-->99
8P-->8D
8P-->8H
8P-->8J
8P-->8L
8P-->8T
8P-->90
8P-->1U
8P-->2M
8P-->6S
8P-->AY
8P-->BQ
8P-->CW
8R-->92
8R-->96
8R-->87
8R-->89
8R-->8F
8R-->8N
8R-->BQ
8T-->96
8T-->1U
8T-->2M
8T-->3D
8T-->AY
8T-->BQ
8T-->CW
8U-->87
8U-->89
8U-->8B
8U-->8D
8U-->8H
8U-->8J
8U-->8L
8U-->8N
8U-->8P
8U-->8R
8U-->8T
8U-->8W
8U-->8Y
8U-->90
8W-->8Y
8W-->BQ
8Y-->94
8Y-->96
8Y-->98
8Y-->99
8Y-->BQ
8Y-->CW
90-->96
90-->98
90-->99
90-->8Y
90-->N
90-->BQ
91-->2M
91-->AY
91-->CW
92-->N
93-->94
93-->N
93-->2M
93-->BQ
93-->CW
94-->CW
95-->8P
95-->8R
95-->8W
95-->AY
96-->84
96-->94
96-->N
96-->1U
96-->2M
96-->34
96-->3D
97-->8U
97-->92
97-->94
97-->95
97-->96
97-->98
97-->99
98-->N
99-->N
9C-->9E
9C-->9I
9C-->9K
9C-->9M
9E-->9G
9E-->9I
9E-->9K
9E-->9M
9E-->BQ
9G-->9P
9G-->4S
9G-->BQ
9I-->9P
9I-->1F
9I-->1U
9I-->4S
9I-->BQ
9K-->N
9K-->1F
9K-->1U
9K-->4S
9K-->BQ
9K-->CW
9M-->N
9M-->1U
9M-->4S
9M-->BQ
9M-->CW
9N-->9C
9N-->9O
9O-->9E
9P-->4S
9P-->BQ
9S-->A0
9U-->1A
9U-->BQ
9W-->1U
9W-->BQ
9W-->CW
9Y-->6C
9Y-->BQ
A0-->9U
A0-->9W
A0-->9Y
A0-->A2
A0-->BQ
A2-->1U
A2-->34
A2-->BQ
A3-->9S
A3-->A4
A4-->A0
A8-->N
A8-->1U
A8-->39
A8-->BQ
A8-->CW
AB-->AD
AB-->AF
AB-->AH
AB-->AL
AB-->AN
AD-->1U
AD-->BQ
AF-->A8
AF-->N
AF-->1U
AF-->39
AF-->4S
AF-->BQ
AH-->AP
AH-->1U
AH-->BQ
AH-->CW
AJ-->AQ
AJ-->AA
AJ-->BQ
AJ-->CW
AL-->AP
AL-->AQ
AL-->AA
AL-->AD
AL-->AF
AL-->AH
AL-->AJ
AL-->AN
AL-->N
AL-->1U
AL-->3D
AL-->4S
AL-->BQ
AL-->CW
AN-->1U
AN-->3D
AN-->BQ
AN-->CW
AO-->AR
AP-->N
AP-->3D
AQ-->N
AR-->AL
AY-->AU
AY-->AV
AY-->AX
AY-->AZ
AY-->B0
B0-->CW
B3-->CW
B5-->CW
B7-->CW
B9-->CW
BB-->B7
BB-->BU
BB-->BY
BB-->CG
BD-->BH
BD-->CW
BF-->CW
BH-->CW
BJ-->BN
BJ-->CG
BL-->CW
BN-->CW
BQ-->B3
BQ-->B5
BQ-->B7
BQ-->B9
BQ-->BB
BQ-->BD
BQ-->BF
BQ-->BH
BQ-->BJ
BQ-->BL
BQ-->BN
BQ-->BP
BQ-->BS
BQ-->BU
BQ-->BW
BQ-->BY
BQ-->C0
BQ-->C2
BQ-->C4
BQ-->C6
BQ-->C8
BQ-->CA
BQ-->CC
BQ-->CE
BQ-->CG
BS-->CW
BU-->CW
BW-->BN
BY-->CW
C0-->BN
C0-->CG
C2-->B7
C2-->BN
C2-->CG
C2-->CW
C4-->CW
C6-->B7
C6-->BD
C6-->BN
C8-->CW
CA-->CG
CA-->CW
CC-->CW
CE-->CW
CG-->CW
CK-->CU
CN-->CU
CO-->CP
CP-->CU
CT-->CU
CW-->CI
CW-->CJ
CW-->CK
CW-->CL
CW-->CM
CW-->CN
CW-->CP
CW-->CO
CW-->CQ
CW-->CR
CW-->CS
CW-->CU
CW-->CV
CW-->CX
CW-->CY
CW-->CZ
CW-->D0
CW-->D1
CW-->D2
CW-->D3
CW-->D4
CW-->D5
CW-->D6
CW-->D7
CW-->DB
CW-->DC
CZ-->CU
D4-->CK
```
