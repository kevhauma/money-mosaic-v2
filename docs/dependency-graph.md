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
- 239 leaf nodes, 627 edges.
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
end
4C["group-changelog-entries.ts"]
4D["index.ts"]
end
subgraph 4E["feature-dashboard"]
4F["category-comparison-settings.store.ts"]
subgraph 4G["components"]
subgraph 4H["account-balance-strip"]
4I["account-balance-strip.component.ts"]
end
subgraph 4J["action-queue-panel"]
4K["action-queue-panel.component.ts"]
end
subgraph 4L["category-breakdown-panel"]
4M["category-breakdown-panel.component.ts"]
end
subgraph 4N["category-comparison-panel"]
4O["category-comparison-panel.component.ts"]
end
subgraph 4P["dashboard-customize-panel"]
4Q["dashboard-customize-panel.component.ts"]
end
subgraph 4R["dashboard-overview"]
4S["dashboard-overview.component.ts"]
end
4T["index.ts"]
subgraph 4U["net-worth-header"]
4V["net-worth-header.component.ts"]
end
subgraph 4W["top-transactions-panel"]
4X["top-transactions-panel.component.ts"]
end
subgraph 4Y["trend-chart-panel"]
4Z["trend-chart-panel.component.ts"]
end
subgraph 50["weekday-weekend-split-panel"]
51["weekday-weekend-split-panel.component.ts"]
end
end
52["dashboard-layout-settings.store.ts"]
53["dashboard-row-order.ts"]
54["dashboard.routes.ts"]
55["index.ts"]
56["stats.store.ts"]
end
subgraph 57["feature-data-management"]
subgraph 58["components"]
subgraph 59["data-management-overview"]
5A["data-management-overview.component.ts"]
end
5B["index.ts"]
end
5C["data-management.routes.ts"]
5D["index.ts"]
end
subgraph 5E["feature-help"]
subgraph 5F["components"]
subgraph 5G["faq-page"]
5H["faq-page.component.ts"]
end
subgraph 5I["guide-detail"]
5J["guide-detail.component.ts"]
end
subgraph 5K["guides-index"]
5L["guides-index.component.ts"]
end
5M["index.ts"]
end
subgraph 5N["data"]
5O["faq.ts"]
5P["guides.ts"]
end
5Q["help.routes.ts"]
5R["index.ts"]
end
subgraph 5S["feature-home"]
subgraph 5T["components"]
subgraph 5U["home-landing"]
5V["home-landing.component.ts"]
end
5W["index.ts"]
end
5X["home.routes.ts"]
5Y["index.ts"]
end
subgraph 5Z["feature-import"]
subgraph 60["components"]
subgraph 61["import-map-step"]
62["import-map-step.component.ts"]
end
subgraph 63["import-preview-step"]
64["import-preview-step.component.ts"]
end
subgraph 65["import-select-step"]
66["import-select-step.component.ts"]
end
subgraph 67["import-summary-step"]
68["import-summary-step.component.ts"]
end
subgraph 69["import-wizard"]
6A["import-wizard.component.ts"]
end
6B["index.ts"]
end
6C["import-batches.store.ts"]
6D["import.routes.ts"]
6E["index.ts"]
6F["mapping-profiles.store.ts"]
end
subgraph 6G["feature-learning"]
subgraph 6H["components"]
6I["index.ts"]
subgraph 6J["learning-overview"]
6K["learning-overview.component.ts"]
end
subgraph 6L["model-status"]
6M["model-status.component.ts"]
end
subgraph 6N["rule-proposals"]
6O["rule-proposals.component.ts"]
end
subgraph 6P["suggestions-table"]
6Q["suggestions-table.component.ts"]
end
end
6R["index.ts"]
6S["learning.routes.ts"]
end
subgraph 6T["feature-settings"]
subgraph 6U["components"]
6V["index.ts"]
subgraph 6W["settings-overview"]
6X["settings-overview.component.ts"]
end
end
6Y["index.ts"]
6Z["settings.routes.ts"]
end
subgraph 70["feature-transactions"]
subgraph 71["components"]
subgraph 72["attribution-override-fieldset"]
73["attribution-override-fieldset.component.ts"]
end
74["index.ts"]
subgraph 75["transaction-bulk-bar"]
76["transaction-bulk-bar.component.ts"]
end
subgraph 77["transaction-edit-form"]
78["transaction-edit-form.component.ts"]
end
subgraph 79["transaction-filters"]
7A["transaction-filters.component.ts"]
end
subgraph 7B["transactions-overview"]
7C["transactions-overview.component.ts"]
end
subgraph 7D["transfer-review"]
7E["transfer-review.component.ts"]
end
end
7F["index.ts"]
7G["transaction-filters.ts"]
7H["transactions.routes.ts"]
end
subgraph 7I["shared"]
subgraph 7J["echarts"]
7K["chart-theme.ts"]
7L["echarts-setup.ts"]
7M["index.ts"]
7N["tooltip-formatter.ts"]
end
subgraph 7O["ui"]
subgraph 7P["alert"]
7Q["alert.component.ts"]
end
subgraph 7R["badge"]
7S["badge.component.ts"]
end
subgraph 7T["bento-grid"]
7U["bento-grid.component.ts"]
7V["bento-item.component.ts"]
end
subgraph 7W["button"]
7X["button.component.ts"]
end
subgraph 7Y["collapse"]
7Z["collapse.component.ts"]
end
subgraph 80["confirm-dialog"]
81["confirm-dialog.component.ts"]
end
subgraph 82["date-range-input"]
83["date-range-input.component.ts"]
end
subgraph 84["divider"]
85["divider.component.ts"]
end
subgraph 86["dropdown"]
87["dropdown.component.ts"]
end
subgraph 88["empty-state"]
89["empty-state.component.ts"]
end
subgraph 8A["fieldset"]
8B["fieldset.component.ts"]
end
subgraph 8C["flex"]
8D["flex.component.ts"]
end
subgraph 8E["granularity-picker"]
8F["granularity-picker.component.ts"]
end
8G["index.ts"]
subgraph 8H["input"]
8I["input.component.ts"]
end
subgraph 8J["label"]
8K["label.component.ts"]
end
subgraph 8L["loading-skeleton"]
8M["loading-skeleton.component.ts"]
end
subgraph 8N["modal"]
8O["mm-modal.component.ts"]
end
subgraph 8P["page-header"]
8Q["page-header.component.ts"]
end
subgraph 8R["paginator"]
8S["paginator.component.ts"]
end
subgraph 8T["paper"]
8U["paper.component.ts"]
end
subgraph 8V["range-grouping-switcher"]
8W["range-grouping-switcher.component.ts"]
end
subgraph 8X["select"]
8Y["select.component.ts"]
end
subgraph 8Z["stat-card"]
90["stat-card.component.ts"]
end
subgraph 91["table"]
92["table.component.ts"]
end
subgraph 93["tabs"]
94["tabs.component.ts"]
end
subgraph 95["typography"]
96["typography.component.ts"]
end
end
subgraph 97["utils"]
98["confidence-color.ts"]
99["confirm-state.ts"]
9A["currency-format.ts"]
9B["daisy-classes.ts"]
9C["date-buckets.ts"]
9D["debounced-text.ts"]
9E["download-json.ts"]
9F["fingerprint.ts"]
9G["iban.ts"]
9H["index.ts"]
9I["pagination.ts"]
9J["percentage.ts"]
9K["search-params.ts"]
9L["selection-model.ts"]
9M["signed-amount.pipe.ts"]
9N["sortable.ts"]
9O["structural-filters.ts"]
9P["theme-hooks.ts"]
subgraph 9Q["validators"]
9R["iban.validator.ts"]
9S["percentage.validator.ts"]
end
9T["with-archivable.ts"]
9U["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2T
5-->4
5-->6
6-->M
6-->9H
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
F-->9F
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
T-->9H
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
10-->9H
11-->T
11-->U
11-->V
11-->X
11-->Y
11-->Z
11-->10
14-->1P
14-->24
14-->7X
14-->8W
14-->96
14-->9H
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
1N-->9H
1O-->1Q
1O-->M
1O-->9H
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
1U-->9H
1V-->20
1V-->M
1W-->1V
1W-->M
1W-->9H
1X-->M
1Y-->1V
1Y-->2A
1Y-->M
1Z-->9H
20-->1X
20-->21
20-->M
20-->2T
21-->5
21-->M
22-->M
23-->9H
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
28-->9H
29-->20
29-->M
2A-->9H
2B-->9H
2C-->9H
2D-->M
2D-->2T
2E-->20
2E-->M
2E-->9H
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
2X-->9H
2Z-->M
30-->38
30-->3A
30-->7M
31-->M
31-->1P
31-->24
31-->9H
34-->31
34-->M
34-->24
34-->7M
34-->8G
34-->9H
36-->2Z
36-->M
36-->8G
36-->9H
36-->9R
36-->9S
38-->34
38-->36
38-->1P
38-->8G
38-->9H
3A-->2Z
3A-->36
3A-->3D
3A-->M
3A-->1P
3A-->8G
3A-->9H
3B-->34
3B-->36
3B-->38
3B-->3A
3B-->3D
3D-->31
3D-->M
3D-->1P
3D-->24
3D-->7M
3D-->8G
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
3M-->8G
3M-->9H
3O-->3H
3O-->M
3O-->8G
3P-->3M
3P-->3O
3P-->3R
3P-->3T
3P-->3V
3P-->3X
3R-->3Z
3R-->1P
3R-->8G
3R-->9H
3T-->40
3T-->A
3T-->M
3T-->1P
3T-->8G
3V-->41
3V-->43
3V-->8G
3V-->9H
3X-->3Z
3X-->42
3X-->43
3X-->3R
3X-->3T
3X-->3V
3X-->M
3X-->1P
3X-->8G
3X-->9H
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
43-->9H
45-->48
48-->4B
48-->4C
48-->8G
49-->48
4C-->4B
4D-->45
4D-->49
4F-->M
4I-->1P
4I-->8G
4I-->9H
4K-->1P
4K-->2T
4K-->8G
4K-->9H
4M-->56
4M-->1P
4M-->24
4M-->7M
4M-->8G
4M-->9H
4O-->4F
4O-->56
4O-->1P
4O-->8G
4O-->9H
4Q-->52
4Q-->53
4Q-->M
4Q-->8G
4S-->52
4S-->53
4S-->56
4S-->4I
4S-->4K
4S-->4M
4S-->4O
4S-->4Q
4S-->4V
4S-->4X
4S-->4Z
4S-->51
4S-->1P
4S-->24
4S-->8G
4S-->9H
4T-->4I
4T-->4K
4T-->4M
4T-->4O
4T-->4Q
4T-->4S
4T-->4V
4T-->4X
4T-->4Z
4T-->51
4V-->1P
4V-->8G
4V-->9H
4X-->56
4X-->1P
4X-->24
4X-->8G
4X-->9H
4Z-->1P
4Z-->24
4Z-->2T
4Z-->7M
4Z-->8G
4Z-->9H
51-->56
51-->24
51-->8G
51-->9H
52-->53
52-->M
53-->M
54-->4S
54-->7M
55-->4T
55-->54
56-->4F
56-->1P
56-->24
56-->2T
5A-->M
5A-->2H
5A-->8G
5A-->9H
5B-->5A
5C-->5A
5D-->5B
5D-->5C
5H-->5O
5H-->8G
5J-->5P
5J-->8G
5L-->5P
5L-->8G
5M-->5H
5M-->5J
5M-->5L
5Q-->5H
5Q-->5J
5Q-->5L
5R-->5M
5R-->5Q
5V-->18
5V-->8G
5W-->5V
5X-->5V
5Y-->5W
5Y-->5X
62-->6F
62-->M
62-->11
62-->8G
64-->11
64-->8G
64-->9H
66-->6F
66-->M
66-->11
66-->8G
68-->M
68-->8G
6A-->6C
6A-->6F
6A-->62
6A-->64
6A-->66
6A-->68
6A-->M
6A-->11
6A-->1P
6A-->8G
6B-->62
6B-->64
6B-->66
6B-->68
6B-->6A
6C-->A
6C-->M
6C-->11
6C-->1P
6D-->6A
6E-->6B
6E-->6C
6E-->6D
6E-->6F
6F-->M
6I-->6K
6I-->6M
6I-->6O
6I-->6Q
6K-->6M
6K-->6O
6K-->6Q
6K-->8G
6M-->1D
6M-->1P
6M-->3Y
6M-->8G
6O-->M
6O-->1D
6O-->1P
6O-->3Y
6O-->8G
6O-->9H
6Q-->M
6Q-->1P
6Q-->3Y
6Q-->8G
6Q-->9H
6R-->6I
6R-->6S
6S-->6K
6V-->6X
6X-->18
6X-->2K
6X-->5D
6X-->8G
6Y-->6V
6Y-->6Z
6Z-->6X
73-->M
73-->1P
73-->2P
73-->8G
73-->9H
74-->76
74-->78
74-->7A
74-->7C
74-->7E
76-->1P
76-->8G
78-->73
78-->M
78-->1P
78-->2P
78-->3Y
78-->8G
7A-->7G
7A-->1P
7A-->8G
7A-->9H
7C-->7G
7C-->76
7C-->78
7C-->7A
7C-->7E
7C-->M
7C-->1P
7C-->2T
7C-->8G
7C-->9H
7E-->1P
7E-->2T
7E-->8G
7E-->9H
7F-->7H
7G-->M
7G-->2T
7H-->7C
7M-->7K
7M-->7L
7M-->7N
7N-->9H
7Q-->9H
7S-->9H
7U-->9H
7V-->9H
7X-->9H
7Z-->9H
81-->7X
81-->8K
81-->8O
81-->96
83-->87
83-->9H
85-->9H
87-->9H
89-->8D
89-->96
8B-->9H
8D-->9H
8G-->7Q
8G-->7S
8G-->7U
8G-->7V
8G-->7X
8G-->7Z
8G-->81
8G-->83
8G-->85
8G-->87
8G-->89
8G-->8B
8G-->8D
8G-->8F
8G-->8I
8G-->8K
8G-->8M
8G-->8O
8G-->8Q
8G-->8S
8G-->8U
8G-->8W
8G-->8Y
8G-->90
8G-->92
8G-->94
8G-->96
8I-->9H
8K-->9H
8M-->8D
8O-->9H
8Q-->8D
8Q-->96
8S-->7X
8S-->8D
8S-->96
8S-->9H
8U-->9H
8W-->7X
8W-->83
8W-->8D
8Y-->9H
90-->96
90-->9H
92-->9H
94-->9H
96-->9H
9H-->98
9H-->99
9H-->9A
9H-->9B
9H-->9C
9H-->9D
9H-->9E
9H-->9F
9H-->9G
9H-->9I
9H-->9J
9H-->9K
9H-->9L
9H-->9M
9H-->9N
9H-->9O
9H-->9P
9H-->9T
9H-->9U
9M-->9A
```
