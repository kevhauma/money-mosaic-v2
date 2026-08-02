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
- 319 leaf nodes, 911 edges.
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
1S["index.ts"]
1T["range-state.store.ts"]
1U["transactions.store.ts"]
1V["transfer-settings.store.ts"]
1W["transfers.store.ts"]
end
subgraph 1X["stats"]
1Y["account-balance-history.ts"]
1Z["account-balance-trend.ts"]
20["annual-lump-sum-smoothing.ts"]
21["category-breakdown.ts"]
22["category-composition-trend.ts"]
23["category-kind-contribution.ts"]
24["category-period-comparison.ts"]
25["chart-zoom-window.ts"]
26["classify-for-stats.ts"]
27["classify-joint-leg.ts"]
28["embedded-bonus-smoothing.ts"]
29["full-history-range.ts"]
2A["granularity-for-span.ts"]
2B["gross-net-growth.ts"]
2C["gross-net-ratio.ts"]
2D["income-category-series.ts"]
2E["income-events.ts"]
2F["income-gap-detection.ts"]
2G["income-growth.ts"]
2H["income-step-change-detection.ts"]
2I["index.ts"]
2J["joint-account-stake.ts"]
2K["joint-contributor-breakdown.ts"]
2L["multi-year-income-comparison.ts"]
2M["net-margin.ts"]
2N["period-stats.ts"]
2O["period-window.ts"]
2P["periodized-rate.ts"]
2Q["top-transactions.ts"]
2R["wage-change-detection.ts"]
2S["weekday-weekend-split.ts"]
2T["year-over-year.ts"]
2U["yearly-income-summary.ts"]
end
subgraph 2V["storage"]
2W["index.ts"]
2X["storage-status.service.ts"]
end
subgraph 2Y["theme"]
2Z["accent-colors.ts"]
30["index.ts"]
31["theme-styles.ts"]
32["theme.service.ts"]
end
subgraph 33["transactions"]
34["attribution-override.ts"]
35["index.ts"]
36["nullify-transaction.ts"]
37["transaction-deletion.service.ts"]
end
subgraph 38["transfers"]
39["index.ts"]
3A["transfer-cleanup.service.ts"]
3B["transfer-linking.service.ts"]
3C["transfer-matching.service.ts"]
3D["transfer-matching.ts"]
end
end
subgraph 3E["feature-accounts"]
3F["account-card-vm.ts"]
3G["account-icons.ts"]
3H["account-types.ts"]
3I["accounts.routes.ts"]
3J["balance-trend-signals.ts"]
subgraph 3K["components"]
subgraph 3L["account-balance-block"]
3M["account-balance-block.component.ts"]
end
subgraph 3N["account-balance-chart"]
3O["account-balance-chart.component.ts"]
end
subgraph 3P["account-balance-history-chart"]
3Q["account-balance-history-chart.component.ts"]
end
subgraph 3R["account-card"]
3S["account-card.component.ts"]
end
subgraph 3T["account-form"]
3U["account-form.component.ts"]
end
subgraph 3V["accounts-detail"]
3W["accounts-detail.component.ts"]
end
subgraph 3X["accounts-overview"]
3Y["accounts-overview.component.ts"]
end
3Z["index.ts"]
end
40["index.ts"]
end
subgraph 41["feature-categories"]
42["categories.routes.ts"]
43["category-icons.ts"]
44["category-model.service.ts"]
45["category-model.store.ts"]
subgraph 46["components"]
subgraph 47["categories-overview"]
48["categories-overview.component.ts"]
end
subgraph 49["category-form"]
4A["category-form.component.ts"]
end
4B["index.ts"]
subgraph 4C["rule-condition-row"]
4D["rule-condition-row.component.ts"]
end
subgraph 4E["rule-filters"]
4F["rule-filters.component.ts"]
end
subgraph 4G["rule-form"]
4H["rule-form.component.ts"]
end
subgraph 4I["rule-share-bar"]
4J["rule-share-bar.component.ts"]
end
subgraph 4K["rules-overview"]
4L["rules-overview.component.ts"]
end
end
4M["index.ts"]
4N["rule-condition-editor.ts"]
4O["rule-filters.ts"]
4P["rule-labels.ts"]
4Q["rule-share.ts"]
4R["rule-summary.ts"]
4S["rules.store.ts"]
end
subgraph 4T["feature-changelog"]
4U["changelog.routes.ts"]
subgraph 4V["components"]
subgraph 4W["changelog-entry-row"]
4X["changelog-entry-row.component.ts"]
end
subgraph 4Y["changelog-page"]
4Z["changelog-page.component.ts"]
end
50["index.ts"]
end
subgraph 51["data"]
52["changelog-entries.ts"]
53["roadmap-entries.ts"]
end
54["group-changelog-entries.ts"]
55["group-roadmap-entries.ts"]
56["index.ts"]
end
subgraph 57["feature-dashboard"]
58["category-comparison-settings.store.ts"]
59["category-comparison-vm.ts"]
subgraph 5A["components"]
subgraph 5B["account-balance-strip"]
5C["account-balance-strip.component.ts"]
end
subgraph 5D["action-queue-panel"]
5E["action-queue-panel.component.ts"]
end
subgraph 5F["category-breakdown-panel"]
5G["category-breakdown-panel.component.ts"]
end
subgraph 5H["category-comparison-panel"]
5I["category-comparison-panel.component.ts"]
end
subgraph 5J["comparison-category-card"]
5K["comparison-category-card.component.ts"]
end
subgraph 5L["dashboard-customize-panel"]
5M["dashboard-customize-panel.component.ts"]
end
subgraph 5N["dashboard-overview"]
5O["dashboard-overview.component.ts"]
end
5P["index.ts"]
subgraph 5Q["net-worth-header"]
5R["net-worth-header.component.ts"]
end
subgraph 5S["top-transactions-panel"]
5T["top-transactions-panel.component.ts"]
end
subgraph 5U["trend-chart-panel"]
5V["trend-chart-panel.component.ts"]
end
subgraph 5W["weekday-weekend-split-panel"]
5X["weekday-weekend-split-panel.component.ts"]
end
end
5Y["dashboard-layout-settings.store.ts"]
5Z["dashboard-row-order.ts"]
60["dashboard.routes.ts"]
61["index.ts"]
62["stats.store.ts"]
end
subgraph 63["feature-data-management"]
subgraph 64["components"]
subgraph 65["data-management-overview"]
66["data-management-overview.component.ts"]
end
67["index.ts"]
end
68["index.ts"]
end
subgraph 69["feature-help"]
subgraph 6A["components"]
subgraph 6B["faq-page"]
6C["faq-page.component.ts"]
end
subgraph 6D["guide-detail"]
6E["guide-detail.component.ts"]
end
subgraph 6F["guide-steps"]
6G["guide-steps.component.ts"]
end
subgraph 6H["guides-index"]
6I["guides-index.component.ts"]
end
6J["index.ts"]
end
subgraph 6K["data"]
6L["faq.ts"]
6M["guides.ts"]
end
6N["help.routes.ts"]
6O["index.ts"]
end
subgraph 6P["feature-home"]
subgraph 6Q["components"]
subgraph 6R["home-landing"]
6S["home-landing.component.ts"]
end
6T["index.ts"]
end
6U["home.routes.ts"]
6V["index.ts"]
end
subgraph 6W["feature-import"]
6X["column-mapping.ts"]
subgraph 6Y["components"]
subgraph 6Z["account-draft-editor"]
70["account-draft-editor.component.ts"]
end
subgraph 71["batch-wait-card"]
72["batch-wait-card.component.ts"]
end
subgraph 73["column-map-amount-field"]
74["column-map-amount-field.component.ts"]
end
subgraph 75["column-map-counterparty-field"]
76["column-map-counterparty-field.component.ts"]
end
subgraph 77["column-map-sample-caption"]
78["column-map-sample-caption.component.ts"]
end
subgraph 79["column-map-simple-field"]
7A["column-map-simple-field.component.ts"]
end
subgraph 7B["column-map-stepper"]
7C["column-map-stepper.component.ts"]
end
subgraph 7D["column-map-summary-step"]
7E["column-map-summary-step.component.ts"]
end
subgraph 7F["import-map-step"]
7G["import-map-step.component.ts"]
end
subgraph 7H["import-preview-step"]
7I["import-preview-step.component.ts"]
end
subgraph 7J["import-select-step"]
7K["import-select-step.component.ts"]
end
subgraph 7L["import-summary-step"]
7M["import-summary-step.component.ts"]
end
subgraph 7N["import-wizard"]
7O["import-wizard.component.ts"]
end
7P["index.ts"]
subgraph 7Q["queued-file-row"]
7R["queued-file-row.component.ts"]
end
end
7S["import-batches.store.ts"]
7T["import-queue.ts"]
7U["import-wizard-session.ts"]
7V["import.routes.ts"]
7W["index.ts"]
7X["mapper-steps.ts"]
7Y["mapping-profiles.store.ts"]
end
subgraph 7Z["feature-income"]
80["career-start-date.ts"]
subgraph 81["components"]
subgraph 82["income-career-start"]
83["income-career-start.component.ts"]
end
subgraph 84["income-category-checklist"]
85["income-category-checklist.component.ts"]
end
subgraph 86["income-chart-cell"]
87["income-chart-cell.component.ts"]
end
subgraph 88["income-events-sidebar"]
89["income-events-sidebar.component.ts"]
end
subgraph 8A["income-gross-color"]
8B["income-gross-color.component.ts"]
end
subgraph 8C["income-gross-net-section"]
8D["income-gross-net-section.component.ts"]
end
subgraph 8E["income-growth-panel"]
8F["income-growth-panel.component.ts"]
end
subgraph 8G["income-intro"]
8H["income-intro.component.ts"]
end
subgraph 8I["income-main-category"]
8J["income-main-category.component.ts"]
end
subgraph 8K["income-overview"]
8L["income-overview.component.ts"]
end
subgraph 8M["income-settings-page"]
8N["income-settings-page.component.ts"]
end
subgraph 8O["income-yearly-panel"]
8P["income-yearly-panel.component.ts"]
end
8Q["index.ts"]
subgraph 8R["salary-details-page"]
8S["salary-details-page.component.ts"]
end
subgraph 8T["salary-metadata-table"]
8U["salary-metadata-table.component.ts"]
end
subgraph 8V["salary-month-modal"]
8W["salary-month-modal.component.ts"]
end
end
8X["gross-net-chart-options.ts"]
8Y["income-category-vm.ts"]
8Z["income-event-vm.ts"]
90["income-granularity.ts"]
91["income.routes.ts"]
92["income.store.ts"]
93["index.ts"]
94["salary-metadata-edit.ts"]
95["salary-metadata-rows.ts"]
end
subgraph 96["feature-learning"]
subgraph 97["components"]
98["index.ts"]
subgraph 99["learning-overview"]
9A["learning-overview.component.ts"]
end
subgraph 9B["model-status"]
9C["model-status.component.ts"]
end
subgraph 9D["rule-proposals"]
9E["rule-proposals.component.ts"]
end
subgraph 9F["suggestions-table"]
9G["suggestions-table.component.ts"]
end
end
9H["index.ts"]
9I["learning.routes.ts"]
end
subgraph 9J["feature-settings"]
subgraph 9K["components"]
9L["index.ts"]
subgraph 9M["settings-about-section"]
9N["settings-about-section.component.ts"]
end
subgraph 9O["settings-currency-locale-section"]
9P["settings-currency-locale-section.component.ts"]
end
subgraph 9Q["settings-data-section"]
9R["settings-data-section.component.ts"]
end
subgraph 9S["settings-overview"]
9T["settings-overview.component.ts"]
end
subgraph 9U["settings-theme-section"]
9V["settings-theme-section.component.ts"]
end
end
9W["index.ts"]
9X["settings.routes.ts"]
end
subgraph 9Y["feature-transactions"]
subgraph 9Z["components"]
subgraph A0["attribution-override-fieldset"]
A1["attribution-override-fieldset.component.ts"]
end
subgraph A2["category-select-cell"]
A3["category-select-cell.component.ts"]
end
A4["index.ts"]
subgraph A5["transaction-bulk-bar"]
A6["transaction-bulk-bar.component.ts"]
end
subgraph A7["transaction-edit-form"]
A8["transaction-edit-form.component.ts"]
end
subgraph A9["transaction-filters"]
AA["transaction-filters.component.ts"]
end
subgraph AB["transaction-row"]
AC["transaction-row.component.ts"]
end
subgraph AD["transactions-overview"]
AE["transactions-overview.component.ts"]
end
subgraph AF["transfer-review"]
AG["transfer-review.component.ts"]
end
end
AH["index.ts"]
AI["transaction-filters.ts"]
AJ["transaction-row-vm.ts"]
AK["transactions.routes.ts"]
end
subgraph AL["shared"]
subgraph AM["echarts"]
AN["bucketed-axis-option.ts"]
AO["chart-theme.ts"]
AP["echarts-setup.ts"]
AQ["index.ts"]
AR["tooltip-formatter.ts"]
end
subgraph AS["ui"]
subgraph AT["alert"]
AU["alert.component.ts"]
end
subgraph AV["badge"]
AW["badge.component.ts"]
end
subgraph AX["button"]
AY["button.component.ts"]
end
subgraph AZ["collapse"]
B0["collapse.component.ts"]
end
subgraph B1["confirm-dialog"]
B2["confirm-dialog.component.ts"]
end
subgraph B3["date-range-input"]
B4["date-range-input.component.ts"]
end
subgraph B5["divider"]
B6["divider.component.ts"]
end
subgraph B7["dropdown"]
B8["dropdown.component.ts"]
end
subgraph B9["empty-state"]
BA["empty-state.component.ts"]
end
subgraph BB["fieldset"]
BC["fieldset.component.ts"]
end
subgraph BD["flex"]
BE["flex.component.ts"]
end
subgraph BF["granularity-picker"]
BG["granularity-picker.component.ts"]
end
BH["index.ts"]
subgraph BI["input"]
BJ["input.component.ts"]
end
subgraph BK["label"]
BL["label.component.ts"]
end
subgraph BM["loading-skeleton"]
BN["loading-skeleton.component.ts"]
end
subgraph BO["modal"]
BP["mm-modal.component.ts"]
end
subgraph BQ["page-header"]
BR["page-header.component.ts"]
end
subgraph BS["paginator"]
BT["paginator.component.ts"]
end
subgraph BU["paper"]
BV["paper.component.ts"]
end
subgraph BW["range-grouping-switcher"]
BX["range-grouping-switcher.component.ts"]
end
subgraph BY["select"]
BZ["select.component.ts"]
end
subgraph C0["stat-card"]
C1["stat-card.component.ts"]
end
subgraph C2["table"]
C3["table.component.ts"]
end
subgraph C4["tabs"]
C5["tabs.component.ts"]
end
subgraph C6["typography"]
C7["typography.component.ts"]
end
end
subgraph C8["utils"]
C9["confidence-color.ts"]
CA["confirm-state.ts"]
CB["currency-format.ts"]
CC["currency-symbol-presets.ts"]
CD["daisy-classes.ts"]
CE["date-buckets.ts"]
CF["date-format.pipe.ts"]
CG["date-format.ts"]
CH["debounced-text.ts"]
CI["download-json.ts"]
CJ["fingerprint.ts"]
CK["format-settings.testing.ts"]
CL["format-settings.ts"]
CM["iban.ts"]
CN["index.ts"]
CO["link-control-to-setting.ts"]
CP["locale-presets.ts"]
CQ["number-format.ts"]
CR["pagination.ts"]
CS["percentage.ts"]
CT["search-params.ts"]
CU["selection-model.ts"]
CV["signed-amount.pipe.ts"]
CW["sortable.ts"]
CX["structural-filters.ts"]
CY["theme-hooks.ts"]
subgraph CZ["validators"]
D0["iban.validator.ts"]
D1["percentage.validator.ts"]
end
D2["with-archivable.ts"]
D3["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->39
5-->4
5-->6
6-->N
6-->CN
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
F-->2Z
F-->CJ
F-->CL
G-->F
G-->30
G-->CN
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
V-->CN
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
12-->39
12-->CN
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1S
16-->2I
16-->AY
16-->BX
16-->C7
16-->CN
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
1P-->1U
1P-->1W
1P-->5
1P-->N
1P-->2I
1P-->39
1P-->CN
1Q-->N
1Q-->30
1Q-->CN
1R-->1U
1R-->N
1R-->CN
1S-->1P
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1S-->1W
1T-->CN
1U-->N
1U-->35
1U-->39
1V-->N
1W-->1U
1W-->1V
1W-->N
1W-->39
1Y-->N
1Y-->CN
1Z-->1Y
1Z-->N
1Z-->CN
20-->22
20-->2D
20-->CN
21-->26
21-->N
22-->21
22-->N
22-->CN
23-->N
24-->21
24-->2O
24-->N
25-->CN
26-->23
26-->27
26-->N
26-->39
27-->5
27-->N
28-->22
28-->2D
28-->N
28-->CN
29-->N
2A-->CN
2B-->2C
2C-->2D
2C-->N
2D-->22
2D-->N
2D-->CN
2E-->2F
2E-->2H
2E-->2R
2E-->N
2F-->22
2F-->2D
2F-->CN
2G-->2D
2G-->2T
2G-->CN
2H-->22
2H-->28
2H-->2D
2H-->CN
2I-->1Y
2I-->1Z
2I-->20
2I-->21
2I-->22
2I-->23
2I-->24
2I-->25
2I-->26
2I-->27
2I-->28
2I-->29
2I-->2A
2I-->2B
2I-->2C
2I-->2D
2I-->2E
2I-->2F
2I-->2G
2I-->2H
2I-->2J
2I-->2K
2I-->2L
2I-->2M
2I-->2N
2I-->2O
2I-->2P
2I-->2Q
2I-->2R
2I-->2S
2I-->2T
2I-->2U
2J-->27
2J-->N
2K-->27
2K-->5
2K-->N
2L-->2U
2N-->26
2N-->N
2O-->CN
2P-->CN
2Q-->N
2Q-->39
2R-->2C
2S-->26
2S-->N
2S-->CN
2T-->2N
2T-->N
2U-->22
2U-->N
2U-->CN
2W-->2X
2Z-->31
30-->2Z
30-->31
30-->32
32-->31
34-->N
35-->34
35-->36
35-->37
36-->N
37-->N
37-->39
39-->3A
39-->3B
39-->3D
39-->3C
3A-->N
3B-->3D
3B-->N
3C-->3B
3C-->3D
3C-->N
3D-->6
3D-->N
3D-->CN
3F-->N
3G-->N
3H-->N
3I-->3W
3I-->3Y
3I-->AQ
3J-->N
3J-->1S
3J-->2I
3J-->CN
3M-->BH
3M-->CN
3O-->3J
3O-->N
3O-->2I
3O-->AQ
3O-->BH
3O-->CN
3Q-->3J
3Q-->N
3Q-->1S
3Q-->2I
3Q-->AQ
3Q-->BH
3S-->3F
3S-->3G
3S-->3M
3S-->BH
3U-->3G
3U-->3H
3U-->N
3U-->BH
3U-->CN
3U-->D0
3U-->D1
3W-->3M
3W-->3O
3W-->3U
3W-->1S
3W-->BH
3W-->CN
3Y-->3F
3Y-->3G
3Y-->3Q
3Y-->3S
3Y-->3U
3Y-->N
3Y-->1S
3Y-->BH
3Y-->CN
3Z-->3M
3Z-->3O
3Z-->3Q
3Z-->3S
3Z-->3U
3Z-->3W
3Z-->3Y
40-->3G
40-->3H
40-->3I
40-->3Z
42-->48
42-->4L
44-->1F
45-->44
45-->4S
45-->N
45-->1F
45-->1S
48-->43
48-->4A
48-->N
48-->1S
48-->BH
48-->CN
4A-->43
4A-->N
4A-->BH
4B-->48
4B-->4A
4B-->4F
4B-->4H
4B-->4J
4B-->4L
4D-->4N
4D-->4P
4D-->A
4D-->N
4D-->1S
4D-->BH
4F-->4O
4F-->1S
4F-->BH
4F-->CN
4H-->4N
4H-->4D
4H-->N
4H-->1S
4H-->BH
4J-->4Q
4J-->4S
4J-->BH
4J-->CN
4L-->4O
4L-->4R
4L-->4S
4L-->4F
4L-->4H
4L-->4J
4L-->N
4L-->1S
4L-->BH
4L-->CN
4M-->42
4M-->43
4M-->44
4M-->45
4M-->4B
4M-->4O
4M-->4R
4M-->4S
4N-->4P
4N-->N
4O-->4R
4O-->N
4P-->N
4Q-->N
4R-->4P
4R-->N
4S-->4Q
4S-->A
4S-->N
4S-->1S
4S-->CN
4U-->4Z
4X-->BH
4Z-->52
4Z-->53
4Z-->54
4Z-->55
4Z-->4X
4Z-->BH
50-->4Z
54-->52
55-->53
56-->4U
56-->50
58-->N
5C-->1S
5C-->BH
5C-->CN
5E-->1S
5E-->39
5E-->BH
5E-->CN
5G-->62
5G-->1S
5G-->2I
5G-->AQ
5G-->BH
5G-->CN
5I-->58
5I-->59
5I-->62
5I-->5K
5I-->1S
5I-->BH
5I-->CN
5K-->59
5K-->BH
5M-->5Y
5M-->5Z
5M-->N
5M-->BH
5O-->5Y
5O-->5Z
5O-->62
5O-->5C
5O-->5E
5O-->5G
5O-->5I
5O-->5M
5O-->5R
5O-->5T
5O-->5V
5O-->5X
5O-->1S
5O-->2I
5O-->BH
5O-->CN
5P-->5C
5P-->5E
5P-->5G
5P-->5I
5P-->5M
5P-->5O
5P-->5R
5P-->5T
5P-->5V
5P-->5X
5R-->1S
5R-->BH
5R-->CN
5T-->62
5T-->1S
5T-->BH
5T-->CN
5V-->1S
5V-->2I
5V-->39
5V-->AQ
5V-->BH
5V-->CN
5X-->62
5X-->1S
5X-->BH
5X-->CN
5Y-->5Z
5Y-->N
5Z-->N
60-->5O
60-->AQ
61-->5P
61-->60
62-->58
62-->1S
62-->2I
62-->39
66-->N
66-->2W
66-->BH
66-->CN
67-->66
68-->67
6C-->6L
6C-->BH
6E-->6M
6E-->6G
6E-->BH
6G-->6M
6G-->BH
6I-->6M
6I-->BH
6J-->6C
6J-->6E
6J-->6G
6J-->6I
6N-->6C
6N-->6E
6N-->6I
6O-->6J
6O-->6M
6O-->6N
6S-->1A
6S-->BH
6T-->6S
6U-->6S
6V-->6T
6V-->6U
6X-->N
70-->7T
70-->40
70-->BH
72-->BH
74-->78
74-->BH
76-->78
76-->BH
78-->BH
7A-->6X
7A-->78
7A-->BH
7C-->7X
7C-->BH
7E-->6X
7E-->BH
7G-->6X
7G-->7X
7G-->7Y
7G-->74
7G-->76
7G-->7A
7G-->7C
7G-->7E
7G-->7I
7G-->N
7G-->13
7G-->BH
7I-->13
7I-->BH
7I-->CN
7K-->7T
7K-->7Y
7K-->7R
7K-->N
7K-->13
7K-->BH
7M-->N
7M-->BH
7O-->7U
7O-->72
7O-->7G
7O-->7K
7O-->7M
7O-->1S
7O-->BH
7P-->7G
7P-->7I
7P-->7K
7P-->7M
7P-->7O
7R-->7T
7R-->70
7R-->N
7R-->BH
7S-->A
7S-->N
7S-->13
7S-->1S
7T-->N
7U-->6X
7U-->7S
7U-->7T
7U-->7Y
7U-->N
7U-->13
7U-->1S
7U-->40
7V-->7O
7W-->6X
7W-->7P
7W-->7S
7W-->7T
7W-->7V
7W-->7X
7W-->7Y
7X-->6X
7Y-->N
80-->2I
83-->80
83-->92
83-->BH
83-->CN
85-->8Y
85-->BH
87-->BH
89-->8Z
89-->90
89-->92
89-->1S
89-->2I
89-->BH
8B-->92
8B-->30
8B-->AQ
8B-->BH
8D-->8X
8D-->92
8D-->87
8D-->2I
8D-->AQ
8D-->BH
8D-->CN
8F-->90
8F-->92
8F-->2I
8F-->BH
8F-->CN
8H-->1S
8H-->6O
8H-->BH
8J-->8Y
8J-->92
8J-->BH
8L-->92
8L-->95
8L-->89
8L-->8D
8L-->8F
8L-->8H
8L-->8P
8L-->8W
8L-->1S
8L-->2I
8L-->6O
8L-->AQ
8L-->BH
8L-->CN
8N-->8Y
8N-->92
8N-->83
8N-->85
8N-->8B
8N-->8J
8N-->BH
8P-->92
8P-->1S
8P-->2I
8P-->39
8P-->AQ
8P-->BH
8P-->CN
8Q-->83
8Q-->85
8Q-->87
8Q-->89
8Q-->8D
8Q-->8F
8Q-->8H
8Q-->8J
8Q-->8L
8Q-->8N
8Q-->8P
8Q-->8S
8Q-->8U
8Q-->8W
8S-->8U
8S-->BH
8U-->90
8U-->92
8U-->94
8U-->95
8U-->BH
8U-->CN
8W-->92
8W-->94
8W-->95
8W-->8U
8W-->N
8W-->BH
8X-->2I
8X-->AQ
8X-->CN
8Y-->N
8Z-->90
8Z-->N
8Z-->2I
8Z-->BH
8Z-->CN
90-->CN
91-->8L
91-->8N
91-->8S
91-->AQ
92-->80
92-->90
92-->N
92-->1S
92-->2I
92-->30
92-->39
93-->8Q
93-->8Y
93-->90
93-->91
93-->92
93-->94
93-->95
94-->N
95-->N
98-->9A
98-->9C
98-->9E
98-->9G
9A-->9C
9A-->9E
9A-->9G
9A-->BH
9C-->1F
9C-->1S
9C-->4M
9C-->BH
9E-->N
9E-->1F
9E-->1S
9E-->4M
9E-->BH
9E-->CN
9G-->N
9G-->1S
9G-->4M
9G-->BH
9G-->CN
9H-->98
9H-->9I
9I-->9A
9L-->9T
9N-->1A
9N-->BH
9P-->1S
9P-->BH
9P-->CN
9R-->68
9R-->BH
9T-->9N
9T-->9P
9T-->9R
9T-->9V
9T-->BH
9V-->1S
9V-->30
9V-->BH
9W-->9L
9W-->9X
9X-->9T
A1-->N
A1-->1S
A1-->35
A1-->BH
A1-->CN
A4-->A6
A4-->A8
A4-->AA
A4-->AE
A4-->AG
A6-->1S
A6-->BH
A8-->A1
A8-->N
A8-->1S
A8-->35
A8-->4M
A8-->BH
AA-->AI
AA-->1S
AA-->BH
AA-->CN
AC-->AJ
AC-->A3
AC-->BH
AC-->CN
AE-->AI
AE-->AJ
AE-->A3
AE-->A6
AE-->A8
AE-->AA
AE-->AC
AE-->AG
AE-->N
AE-->1S
AE-->39
AE-->4M
AE-->BH
AE-->CN
AG-->1S
AG-->39
AG-->BH
AG-->CN
AH-->AK
AI-->N
AI-->39
AJ-->N
AK-->AE
AQ-->AN
AQ-->AO
AQ-->AP
AQ-->AR
AR-->CN
AU-->CN
AW-->CN
AY-->CN
B0-->CN
B2-->AY
B2-->BL
B2-->BP
B2-->C7
B4-->B8
B4-->CN
B6-->CN
B8-->CN
BA-->BE
BA-->C7
BC-->CN
BE-->CN
BH-->AU
BH-->AW
BH-->AY
BH-->B0
BH-->B2
BH-->B4
BH-->B6
BH-->B8
BH-->BA
BH-->BC
BH-->BE
BH-->BG
BH-->BJ
BH-->BL
BH-->BN
BH-->BP
BH-->BR
BH-->BT
BH-->BV
BH-->BX
BH-->BZ
BH-->C1
BH-->C3
BH-->C5
BH-->C7
BJ-->CN
BL-->CN
BN-->BE
BP-->CN
BR-->BE
BR-->C7
BT-->AY
BT-->BE
BT-->C7
BT-->CN
BV-->CN
BX-->AY
BX-->B4
BX-->BE
BZ-->CN
C1-->C7
C1-->CN
C3-->CN
C5-->CN
C7-->CN
CB-->CL
CE-->CL
CF-->CG
CG-->CL
CK-->CL
CN-->C9
CN-->CA
CN-->CB
CN-->CC
CN-->CD
CN-->CE
CN-->CG
CN-->CF
CN-->CH
CN-->CI
CN-->CJ
CN-->CL
CN-->CM
CN-->CO
CN-->CP
CN-->CQ
CN-->CR
CN-->CS
CN-->CT
CN-->CU
CN-->CV
CN-->CW
CN-->CX
CN-->CY
CN-->D2
CN-->D3
CQ-->CL
CV-->CB
```
