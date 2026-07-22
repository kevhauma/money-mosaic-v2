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
- 241 leaf nodes, 630 edges.
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
G["categories.repository.ts"]
H["category-comparison-settings.repository.ts"]
I["category-model.repository.ts"]
J["dashboard-layout-settings.repository.ts"]
K["data-management.repository.ts"]
L["import-batches.repository.ts"]
M["index.ts"]
N["mapping-profiles.repository.ts"]
O["rules.repository.ts"]
P["transactions.repository.ts"]
Q["transfer-settings.repository.ts"]
R["transfers.repository.ts"]
end
subgraph S["import"]
T["account-detection.ts"]
U["csv-import.service.ts"]
V["csv-parse.ts"]
W["csv-parse.worker.ts"]
X["csv-row-mapper.ts"]
Y["csv-worker.types.ts"]
Z["delimiter-guess.ts"]
10["import.service.ts"]
11["index.ts"]
end
subgraph 12["layout"]
subgraph 13["app-shell"]
14["app-shell.component.ts"]
end
15["index.ts"]
end
subgraph 16["links"]
17["external-links.ts"]
18["index.ts"]
end
subgraph 19["ml"]
1A["category-model.worker.ts"]
1B["category-model.worker.types.ts"]
1C["feature-hashing.ts"]
1D["index.ts"]
1E["model-config.ts"]
1F["rule-proposal-mining.ts"]
1G["training-window.ts"]
end
subgraph 1H["onboarding"]
1I["home-redirect.guard.ts"]
1J["index.ts"]
1K["mark-visited.guard.ts"]
1L["visited.service.ts"]
end
subgraph 1M["state"]
1N["accounts.store.ts"]
1O["categories.store.ts"]
1P["index.ts"]
1Q["transactions.store.ts"]
1R["transfer-settings.store.ts"]
1S["transfers.store.ts"]
end
subgraph 1T["stats"]
1U["account-balance-trend.ts"]
1V["category-breakdown.ts"]
1W["category-composition-trend.ts"]
1X["category-kind-contribution.ts"]
1Y["category-period-comparison.ts"]
1Z["chart-zoom-window.ts"]
20["classify-for-stats.ts"]
21["classify-joint-leg.ts"]
22["full-history-range.ts"]
23["granularity-for-span.ts"]
24["index.ts"]
25["joint-account-stake.ts"]
26["joint-contributor-breakdown.ts"]
27["net-margin.ts"]
28["net-worth-trend.ts"]
29["period-stats.ts"]
2A["period-window.ts"]
2B["periodized-rate.ts"]
2C["range-state.store.ts"]
2D["top-transactions.ts"]
2E["weekday-weekend-split.ts"]
2F["year-over-year.ts"]
end
subgraph 2G["storage"]
2H["index.ts"]
2I["storage-status.service.ts"]
end
subgraph 2J["theme"]
2K["index.ts"]
2L["theme-styles.ts"]
2M["theme.service.ts"]
end
subgraph 2N["transactions"]
2O["attribution-override.ts"]
2P["index.ts"]
2Q["nullify-transaction.ts"]
2R["transaction-deletion.service.ts"]
end
subgraph 2S["transfers"]
2T["index.ts"]
2U["transfer-cleanup.service.ts"]
2V["transfer-linking.service.ts"]
2W["transfer-matching.service.ts"]
2X["transfer-matching.ts"]
end
end
subgraph 2Y["feature-accounts"]
2Z["account-icons.ts"]
30["accounts.routes.ts"]
31["balance-trend-signals.ts"]
subgraph 32["components"]
subgraph 33["account-balance-chart"]
34["account-balance-chart.component.ts"]
end
subgraph 35["account-form"]
36["account-form.component.ts"]
end
subgraph 37["accounts-detail"]
38["accounts-detail.component.ts"]
end
subgraph 39["accounts-overview"]
3A["accounts-overview.component.ts"]
end
3B["index.ts"]
subgraph 3C["net-worth-history-chart"]
3D["net-worth-history-chart.component.ts"]
end
end
3E["index.ts"]
end
subgraph 3F["feature-categories"]
3G["categories.routes.ts"]
3H["category-icons.ts"]
3I["category-model.service.ts"]
3J["category-model.store.ts"]
subgraph 3K["components"]
subgraph 3L["categories-overview"]
3M["categories-overview.component.ts"]
end
subgraph 3N["category-form"]
3O["category-form.component.ts"]
end
3P["index.ts"]
subgraph 3Q["rule-filters"]
3R["rule-filters.component.ts"]
end
subgraph 3S["rule-form"]
3T["rule-form.component.ts"]
end
subgraph 3U["rule-share-bar"]
3V["rule-share-bar.component.ts"]
end
subgraph 3W["rules-overview"]
3X["rules-overview.component.ts"]
end
end
3Y["index.ts"]
3Z["rule-filters.ts"]
40["rule-labels.ts"]
41["rule-share.ts"]
42["rule-summary.ts"]
43["rules.store.ts"]
end
subgraph 44["feature-changelog"]
45["changelog.routes.ts"]
subgraph 46["components"]
subgraph 47["changelog-page"]
48["changelog-page.component.ts"]
end
49["index.ts"]
end
subgraph 4A["data"]
4B["changelog-entries.ts"]
4C["roadmap-entries.ts"]
end
4D["group-changelog-entries.ts"]
4E["group-roadmap-entries.ts"]
4F["index.ts"]
end
subgraph 4G["feature-dashboard"]
4H["category-comparison-settings.store.ts"]
subgraph 4I["components"]
subgraph 4J["account-balance-strip"]
4K["account-balance-strip.component.ts"]
end
subgraph 4L["action-queue-panel"]
4M["action-queue-panel.component.ts"]
end
subgraph 4N["category-breakdown-panel"]
4O["category-breakdown-panel.component.ts"]
end
subgraph 4P["category-comparison-panel"]
4Q["category-comparison-panel.component.ts"]
end
subgraph 4R["dashboard-customize-panel"]
4S["dashboard-customize-panel.component.ts"]
end
subgraph 4T["dashboard-overview"]
4U["dashboard-overview.component.ts"]
end
4V["index.ts"]
subgraph 4W["net-worth-header"]
4X["net-worth-header.component.ts"]
end
subgraph 4Y["top-transactions-panel"]
4Z["top-transactions-panel.component.ts"]
end
subgraph 50["trend-chart-panel"]
51["trend-chart-panel.component.ts"]
end
subgraph 52["weekday-weekend-split-panel"]
53["weekday-weekend-split-panel.component.ts"]
end
end
54["dashboard-layout-settings.store.ts"]
55["dashboard-row-order.ts"]
56["dashboard.routes.ts"]
57["index.ts"]
58["stats.store.ts"]
end
subgraph 59["feature-data-management"]
subgraph 5A["components"]
subgraph 5B["data-management-overview"]
5C["data-management-overview.component.ts"]
end
5D["index.ts"]
end
5E["data-management.routes.ts"]
5F["index.ts"]
end
subgraph 5G["feature-help"]
subgraph 5H["components"]
subgraph 5I["faq-page"]
5J["faq-page.component.ts"]
end
subgraph 5K["guide-detail"]
5L["guide-detail.component.ts"]
end
subgraph 5M["guides-index"]
5N["guides-index.component.ts"]
end
5O["index.ts"]
end
subgraph 5P["data"]
5Q["faq.ts"]
5R["guides.ts"]
end
5S["help.routes.ts"]
5T["index.ts"]
end
subgraph 5U["feature-home"]
subgraph 5V["components"]
subgraph 5W["home-landing"]
5X["home-landing.component.ts"]
end
5Y["index.ts"]
end
5Z["home.routes.ts"]
60["index.ts"]
end
subgraph 61["feature-import"]
subgraph 62["components"]
subgraph 63["import-map-step"]
64["import-map-step.component.ts"]
end
subgraph 65["import-preview-step"]
66["import-preview-step.component.ts"]
end
subgraph 67["import-select-step"]
68["import-select-step.component.ts"]
end
subgraph 69["import-summary-step"]
6A["import-summary-step.component.ts"]
end
subgraph 6B["import-wizard"]
6C["import-wizard.component.ts"]
end
6D["index.ts"]
end
6E["import-batches.store.ts"]
6F["import.routes.ts"]
6G["index.ts"]
6H["mapping-profiles.store.ts"]
end
subgraph 6I["feature-learning"]
subgraph 6J["components"]
6K["index.ts"]
subgraph 6L["learning-overview"]
6M["learning-overview.component.ts"]
end
subgraph 6N["model-status"]
6O["model-status.component.ts"]
end
subgraph 6P["rule-proposals"]
6Q["rule-proposals.component.ts"]
end
subgraph 6R["suggestions-table"]
6S["suggestions-table.component.ts"]
end
end
6T["index.ts"]
6U["learning.routes.ts"]
end
subgraph 6V["feature-settings"]
subgraph 6W["components"]
6X["index.ts"]
subgraph 6Y["settings-overview"]
6Z["settings-overview.component.ts"]
end
end
70["index.ts"]
71["settings.routes.ts"]
end
subgraph 72["feature-transactions"]
subgraph 73["components"]
subgraph 74["attribution-override-fieldset"]
75["attribution-override-fieldset.component.ts"]
end
76["index.ts"]
subgraph 77["transaction-bulk-bar"]
78["transaction-bulk-bar.component.ts"]
end
subgraph 79["transaction-edit-form"]
7A["transaction-edit-form.component.ts"]
end
subgraph 7B["transaction-filters"]
7C["transaction-filters.component.ts"]
end
subgraph 7D["transactions-overview"]
7E["transactions-overview.component.ts"]
end
subgraph 7F["transfer-review"]
7G["transfer-review.component.ts"]
end
end
7H["index.ts"]
7I["transaction-filters.ts"]
7J["transactions.routes.ts"]
end
subgraph 7K["shared"]
subgraph 7L["echarts"]
7M["chart-theme.ts"]
7N["echarts-setup.ts"]
7O["index.ts"]
7P["tooltip-formatter.ts"]
end
subgraph 7Q["ui"]
subgraph 7R["alert"]
7S["alert.component.ts"]
end
subgraph 7T["badge"]
7U["badge.component.ts"]
end
subgraph 7V["bento-grid"]
7W["bento-grid.component.ts"]
7X["bento-item.component.ts"]
end
subgraph 7Y["button"]
7Z["button.component.ts"]
end
subgraph 80["collapse"]
81["collapse.component.ts"]
end
subgraph 82["confirm-dialog"]
83["confirm-dialog.component.ts"]
end
subgraph 84["date-range-input"]
85["date-range-input.component.ts"]
end
subgraph 86["divider"]
87["divider.component.ts"]
end
subgraph 88["dropdown"]
89["dropdown.component.ts"]
end
subgraph 8A["empty-state"]
8B["empty-state.component.ts"]
end
subgraph 8C["fieldset"]
8D["fieldset.component.ts"]
end
subgraph 8E["flex"]
8F["flex.component.ts"]
end
subgraph 8G["granularity-picker"]
8H["granularity-picker.component.ts"]
end
8I["index.ts"]
subgraph 8J["input"]
8K["input.component.ts"]
end
subgraph 8L["label"]
8M["label.component.ts"]
end
subgraph 8N["loading-skeleton"]
8O["loading-skeleton.component.ts"]
end
subgraph 8P["modal"]
8Q["mm-modal.component.ts"]
end
subgraph 8R["page-header"]
8S["page-header.component.ts"]
end
subgraph 8T["paginator"]
8U["paginator.component.ts"]
end
subgraph 8V["paper"]
8W["paper.component.ts"]
end
subgraph 8X["range-grouping-switcher"]
8Y["range-grouping-switcher.component.ts"]
end
subgraph 8Z["select"]
90["select.component.ts"]
end
subgraph 91["stat-card"]
92["stat-card.component.ts"]
end
subgraph 93["table"]
94["table.component.ts"]
end
subgraph 95["tabs"]
96["tabs.component.ts"]
end
subgraph 97["typography"]
98["typography.component.ts"]
end
end
subgraph 99["utils"]
9A["confidence-color.ts"]
9B["confirm-state.ts"]
9C["currency-format.ts"]
9D["daisy-classes.ts"]
9E["date-buckets.ts"]
9F["debounced-text.ts"]
9G["download-json.ts"]
9H["fingerprint.ts"]
9I["iban.ts"]
9J["index.ts"]
9K["pagination.ts"]
9L["percentage.ts"]
9M["search-params.ts"]
9N["selection-model.ts"]
9O["signed-amount.pipe.ts"]
9P["sortable.ts"]
9Q["structural-filters.ts"]
9R["theme-hooks.ts"]
subgraph 9S["validators"]
9T["iban.validator.ts"]
9U["percentage.validator.ts"]
end
9V["with-archivable.ts"]
9W["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2T
5-->4
5-->6
6-->M
6-->9J
8-->9
8-->M
9-->5
9-->M
A-->9
A-->8
A-->B
A-->C
B-->M
C-->B
C-->M
E-->F
F-->1E
F-->9H
G-->F
H-->F
I-->F
J-->F
K-->F
L-->F
M-->E
M-->F
M-->G
M-->H
M-->I
M-->J
M-->K
M-->L
M-->N
M-->O
M-->P
M-->Q
M-->R
N-->F
O-->F
P-->F
Q-->F
R-->F
T-->M
T-->9J
U-->Y
U-->M
V-->X
V-->Y
W-->V
W-->Y
X-->M
Y-->X
Y-->M
10-->X
10-->M
10-->2T
10-->9J
11-->T
11-->U
11-->V
11-->X
11-->Y
11-->Z
11-->10
14-->1P
14-->24
14-->7Z
14-->8Y
14-->98
14-->9J
15-->14
18-->17
1A-->1B
1A-->1C
1A-->1E
1B-->1E
1C-->1E
1D-->1B
1D-->1C
1D-->1E
1D-->1F
1D-->1G
1F-->A
1F-->M
1I-->1L
1J-->1I
1J-->1K
1J-->1L
1K-->1L
1N-->1O
1N-->1Q
1N-->1S
1N-->5
1N-->M
1N-->24
1N-->2T
1N-->9J
1O-->1Q
1O-->M
1O-->9J
1P-->1N
1P-->1O
1P-->1Q
1P-->1R
1P-->1S
1Q-->M
1Q-->2P
1Q-->2T
1R-->M
1S-->1Q
1S-->1R
1S-->M
1S-->2T
1U-->21
1U-->28
1U-->M
1U-->9J
1V-->20
1V-->M
1W-->1V
1W-->M
1W-->9J
1X-->M
1Y-->1V
1Y-->2A
1Y-->M
1Z-->9J
20-->1X
20-->21
20-->M
20-->2T
21-->5
21-->M
22-->M
23-->9J
24-->1U
24-->1V
24-->1W
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
24-->2A
24-->2B
24-->2C
24-->2D
24-->2E
24-->2F
25-->21
25-->M
26-->21
26-->5
26-->M
28-->21
28-->M
28-->9J
29-->20
29-->M
2A-->9J
2B-->9J
2C-->9J
2D-->M
2D-->2T
2E-->20
2E-->M
2E-->9J
2F-->29
2F-->M
2H-->2I
2K-->2L
2K-->2M
2M-->2L
2O-->M
2P-->2O
2P-->2Q
2P-->2R
2Q-->M
2R-->M
2R-->2T
2T-->2U
2T-->2V
2T-->2X
2T-->2W
2U-->M
2V-->2X
2V-->M
2W-->2V
2W-->2X
2W-->M
2X-->6
2X-->M
2X-->9J
2Z-->M
30-->38
30-->3A
30-->7O
31-->M
31-->1P
31-->24
31-->9J
34-->31
34-->M
34-->24
34-->7O
34-->8I
34-->9J
36-->2Z
36-->M
36-->8I
36-->9J
36-->9T
36-->9U
38-->34
38-->36
38-->1P
38-->8I
38-->9J
3A-->2Z
3A-->36
3A-->3D
3A-->M
3A-->1P
3A-->8I
3A-->9J
3B-->34
3B-->36
3B-->38
3B-->3A
3B-->3D
3D-->31
3D-->M
3D-->1P
3D-->24
3D-->7O
3D-->8I
3E-->30
3E-->3B
3G-->3M
3G-->3X
3I-->1D
3J-->3I
3J-->43
3J-->M
3J-->1D
3J-->1P
3M-->3H
3M-->3O
3M-->M
3M-->1P
3M-->8I
3M-->9J
3O-->3H
3O-->M
3O-->8I
3P-->3M
3P-->3O
3P-->3R
3P-->3T
3P-->3V
3P-->3X
3R-->3Z
3R-->1P
3R-->8I
3R-->9J
3T-->40
3T-->A
3T-->M
3T-->1P
3T-->8I
3V-->41
3V-->43
3V-->8I
3V-->9J
3X-->3Z
3X-->42
3X-->43
3X-->3R
3X-->3T
3X-->3V
3X-->M
3X-->1P
3X-->8I
3X-->9J
3Y-->3G
3Y-->3H
3Y-->3I
3Y-->3J
3Y-->3P
3Y-->3Z
3Y-->42
3Y-->43
3Z-->42
3Z-->M
40-->M
41-->M
42-->40
42-->M
43-->41
43-->A
43-->M
43-->1P
43-->9J
45-->48
48-->4B
48-->4C
48-->4D
48-->4E
48-->8I
49-->48
4D-->4B
4E-->4C
4F-->45
4F-->49
4H-->M
4K-->1P
4K-->8I
4K-->9J
4M-->1P
4M-->2T
4M-->8I
4M-->9J
4O-->58
4O-->1P
4O-->24
4O-->7O
4O-->8I
4O-->9J
4Q-->4H
4Q-->58
4Q-->1P
4Q-->8I
4Q-->9J
4S-->54
4S-->55
4S-->M
4S-->8I
4U-->54
4U-->55
4U-->58
4U-->4K
4U-->4M
4U-->4O
4U-->4Q
4U-->4S
4U-->4X
4U-->4Z
4U-->51
4U-->53
4U-->1P
4U-->24
4U-->8I
4U-->9J
4V-->4K
4V-->4M
4V-->4O
4V-->4Q
4V-->4S
4V-->4U
4V-->4X
4V-->4Z
4V-->51
4V-->53
4X-->1P
4X-->8I
4X-->9J
4Z-->58
4Z-->1P
4Z-->24
4Z-->8I
4Z-->9J
51-->1P
51-->24
51-->2T
51-->7O
51-->8I
51-->9J
53-->58
53-->24
53-->8I
53-->9J
54-->55
54-->M
55-->M
56-->4U
56-->7O
57-->4V
57-->56
58-->4H
58-->1P
58-->24
58-->2T
5C-->M
5C-->2H
5C-->8I
5C-->9J
5D-->5C
5E-->5C
5F-->5D
5F-->5E
5J-->5Q
5J-->8I
5L-->5R
5L-->8I
5N-->5R
5N-->8I
5O-->5J
5O-->5L
5O-->5N
5S-->5J
5S-->5L
5S-->5N
5T-->5O
5T-->5S
5X-->18
5X-->8I
5Y-->5X
5Z-->5X
60-->5Y
60-->5Z
64-->6H
64-->M
64-->11
64-->8I
66-->11
66-->8I
66-->9J
68-->6H
68-->M
68-->11
68-->8I
6A-->M
6A-->8I
6C-->6E
6C-->6H
6C-->64
6C-->66
6C-->68
6C-->6A
6C-->M
6C-->11
6C-->1P
6C-->8I
6D-->64
6D-->66
6D-->68
6D-->6A
6D-->6C
6E-->A
6E-->M
6E-->11
6E-->1P
6F-->6C
6G-->6D
6G-->6E
6G-->6F
6G-->6H
6H-->M
6K-->6M
6K-->6O
6K-->6Q
6K-->6S
6M-->6O
6M-->6Q
6M-->6S
6M-->8I
6O-->1D
6O-->1P
6O-->3Y
6O-->8I
6Q-->M
6Q-->1D
6Q-->1P
6Q-->3Y
6Q-->8I
6Q-->9J
6S-->M
6S-->1P
6S-->3Y
6S-->8I
6S-->9J
6T-->6K
6T-->6U
6U-->6M
6X-->6Z
6Z-->18
6Z-->2K
6Z-->5F
6Z-->8I
70-->6X
70-->71
71-->6Z
75-->M
75-->1P
75-->2P
75-->8I
75-->9J
76-->78
76-->7A
76-->7C
76-->7E
76-->7G
78-->1P
78-->8I
7A-->75
7A-->M
7A-->1P
7A-->2P
7A-->3Y
7A-->8I
7C-->7I
7C-->1P
7C-->8I
7C-->9J
7E-->7I
7E-->78
7E-->7A
7E-->7C
7E-->7G
7E-->M
7E-->1P
7E-->2T
7E-->8I
7E-->9J
7G-->1P
7G-->2T
7G-->8I
7G-->9J
7H-->7J
7I-->M
7I-->2T
7J-->7E
7O-->7M
7O-->7N
7O-->7P
7P-->9J
7S-->9J
7U-->9J
7W-->9J
7X-->9J
7Z-->9J
81-->9J
83-->7Z
83-->8M
83-->8Q
83-->98
85-->89
85-->9J
87-->9J
89-->9J
8B-->8F
8B-->98
8D-->9J
8F-->9J
8I-->7S
8I-->7U
8I-->7W
8I-->7X
8I-->7Z
8I-->81
8I-->83
8I-->85
8I-->87
8I-->89
8I-->8B
8I-->8D
8I-->8F
8I-->8H
8I-->8K
8I-->8M
8I-->8O
8I-->8Q
8I-->8S
8I-->8U
8I-->8W
8I-->8Y
8I-->90
8I-->92
8I-->94
8I-->96
8I-->98
8K-->9J
8M-->9J
8O-->8F
8Q-->9J
8S-->8F
8S-->98
8U-->7Z
8U-->8F
8U-->98
8U-->9J
8W-->9J
8Y-->7Z
8Y-->85
8Y-->8F
90-->9J
92-->98
92-->9J
94-->9J
96-->9J
98-->9J
9J-->9A
9J-->9B
9J-->9C
9J-->9D
9J-->9E
9J-->9F
9J-->9G
9J-->9H
9J-->9I
9J-->9K
9J-->9L
9J-->9M
9J-->9N
9J-->9O
9J-->9P
9J-->9Q
9J-->9R
9J-->9V
9J-->9W
9O-->9C
```
