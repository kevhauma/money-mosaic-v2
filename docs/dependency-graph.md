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
- 211 leaf nodes, 583 edges.
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
subgraph 12["ml"]
13["category-model.worker.ts"]
14["category-model.worker.types.ts"]
15["feature-hashing.ts"]
16["index.ts"]
17["model-config.ts"]
18["rule-proposal-mining.ts"]
19["training-window.ts"]
end
subgraph 1A["state"]
1B["accounts.store.ts"]
1C["categories.store.ts"]
1D["index.ts"]
1E["transactions.store.ts"]
1F["transfer-settings.store.ts"]
1G["transfers.store.ts"]
end
subgraph 1H["stats"]
1I["account-balance-trend.ts"]
1J["category-breakdown.ts"]
1K["category-composition-trend.ts"]
1L["category-kind-contribution.ts"]
1M["category-period-comparison.ts"]
1N["chart-zoom-window.ts"]
1O["classify-for-stats.ts"]
1P["classify-joint-leg.ts"]
1Q["full-history-range.ts"]
1R["granularity-for-span.ts"]
1S["index.ts"]
1T["joint-account-stake.ts"]
1U["joint-contributor-breakdown.ts"]
1V["net-worth-trend.ts"]
1W["period-stats.ts"]
1X["period-window.ts"]
1Y["range-state.store.ts"]
1Z["spending-rate.ts"]
20["top-transactions.ts"]
21["weekday-weekend-split.ts"]
22["year-over-year.ts"]
end
subgraph 23["storage"]
24["index.ts"]
25["storage-status.service.ts"]
end
subgraph 26["theme"]
27["index.ts"]
28["theme-styles.ts"]
29["theme.service.ts"]
end
subgraph 2A["transactions"]
2B["attribution-override.ts"]
2C["index.ts"]
2D["nullify-transaction.ts"]
2E["transaction-deletion.service.ts"]
end
subgraph 2F["transfers"]
2G["index.ts"]
2H["transfer-cleanup.service.ts"]
2I["transfer-linking.service.ts"]
2J["transfer-matching.service.ts"]
2K["transfer-matching.ts"]
end
end
subgraph 2L["feature-accounts"]
2M["account-icons.ts"]
2N["accounts.routes.ts"]
2O["balance-trend-signals.ts"]
subgraph 2P["components"]
subgraph 2Q["account-balance-chart"]
2R["account-balance-chart.component.ts"]
end
subgraph 2S["account-form"]
2T["account-form.component.ts"]
end
subgraph 2U["accounts-detail"]
2V["accounts-detail.component.ts"]
end
subgraph 2W["accounts-overview"]
2X["accounts-overview.component.ts"]
end
2Y["index.ts"]
subgraph 2Z["net-worth-history-chart"]
30["net-worth-history-chart.component.ts"]
end
end
31["index.ts"]
end
subgraph 32["feature-categories"]
33["categories.routes.ts"]
34["category-icons.ts"]
35["category-model.service.ts"]
36["category-model.store.ts"]
subgraph 37["components"]
subgraph 38["categories-overview"]
39["categories-overview.component.ts"]
end
subgraph 3A["category-form"]
3B["category-form.component.ts"]
end
3C["index.ts"]
subgraph 3D["rule-filters"]
3E["rule-filters.component.ts"]
end
subgraph 3F["rule-form"]
3G["rule-form.component.ts"]
end
subgraph 3H["rule-share-bar"]
3I["rule-share-bar.component.ts"]
end
subgraph 3J["rules-overview"]
3K["rules-overview.component.ts"]
end
end
3L["index.ts"]
3M["rule-filters.ts"]
3N["rule-labels.ts"]
3O["rule-share.ts"]
3P["rule-summary.ts"]
3Q["rules.store.ts"]
end
subgraph 3R["feature-dashboard"]
3S["category-comparison-settings.store.ts"]
subgraph 3T["components"]
subgraph 3U["account-balance-strip"]
3V["account-balance-strip.component.ts"]
end
subgraph 3W["action-queue-panel"]
3X["action-queue-panel.component.ts"]
end
subgraph 3Y["category-breakdown-panel"]
3Z["category-breakdown-panel.component.ts"]
end
subgraph 40["category-comparison-panel"]
41["category-comparison-panel.component.ts"]
end
subgraph 42["dashboard-customize-panel"]
43["dashboard-customize-panel.component.ts"]
end
subgraph 44["dashboard-overview"]
45["dashboard-overview.component.ts"]
end
46["index.ts"]
subgraph 47["net-worth-header"]
48["net-worth-header.component.ts"]
end
subgraph 49["top-transactions-panel"]
4A["top-transactions-panel.component.ts"]
end
subgraph 4B["trend-chart-panel"]
4C["trend-chart-panel.component.ts"]
end
subgraph 4D["weekday-weekend-split-panel"]
4E["weekday-weekend-split-panel.component.ts"]
end
end
4F["dashboard-layout-settings.store.ts"]
4G["dashboard-row-order.ts"]
4H["dashboard.routes.ts"]
4I["index.ts"]
4J["stats.store.ts"]
end
subgraph 4K["feature-data-management"]
subgraph 4L["components"]
subgraph 4M["data-management-overview"]
4N["data-management-overview.component.ts"]
end
4O["index.ts"]
end
4P["data-management.routes.ts"]
4Q["index.ts"]
end
subgraph 4R["feature-import"]
subgraph 4S["components"]
subgraph 4T["import-map-step"]
4U["import-map-step.component.ts"]
end
subgraph 4V["import-preview-step"]
4W["import-preview-step.component.ts"]
end
subgraph 4X["import-select-step"]
4Y["import-select-step.component.ts"]
end
subgraph 4Z["import-summary-step"]
50["import-summary-step.component.ts"]
end
subgraph 51["import-wizard"]
52["import-wizard.component.ts"]
end
53["index.ts"]
end
54["import-batches.store.ts"]
55["import.routes.ts"]
56["index.ts"]
57["mapping-profiles.store.ts"]
end
subgraph 58["feature-learning"]
subgraph 59["components"]
5A["index.ts"]
subgraph 5B["learning-overview"]
5C["learning-overview.component.ts"]
end
subgraph 5D["model-status"]
5E["model-status.component.ts"]
end
subgraph 5F["rule-proposals"]
5G["rule-proposals.component.ts"]
end
subgraph 5H["suggestions-table"]
5I["suggestions-table.component.ts"]
end
end
5J["index.ts"]
5K["learning.routes.ts"]
end
subgraph 5L["feature-settings"]
subgraph 5M["components"]
5N["index.ts"]
subgraph 5O["settings-overview"]
5P["settings-overview.component.ts"]
end
end
5Q["index.ts"]
5R["settings.routes.ts"]
end
subgraph 5S["feature-transactions"]
subgraph 5T["components"]
subgraph 5U["attribution-override-fieldset"]
5V["attribution-override-fieldset.component.ts"]
end
5W["index.ts"]
subgraph 5X["transaction-bulk-bar"]
5Y["transaction-bulk-bar.component.ts"]
end
subgraph 5Z["transaction-edit-form"]
60["transaction-edit-form.component.ts"]
end
subgraph 61["transaction-filters"]
62["transaction-filters.component.ts"]
end
subgraph 63["transactions-overview"]
64["transactions-overview.component.ts"]
end
subgraph 65["transfer-review"]
66["transfer-review.component.ts"]
end
end
67["index.ts"]
68["transaction-filters.ts"]
69["transactions.routes.ts"]
end
subgraph 6A["shared"]
subgraph 6B["echarts"]
6C["chart-theme.ts"]
6D["echarts-setup.ts"]
6E["index.ts"]
6F["tooltip-formatter.ts"]
end
subgraph 6G["ui"]
subgraph 6H["alert"]
6I["alert.component.ts"]
end
subgraph 6J["badge"]
6K["badge.component.ts"]
end
subgraph 6L["bento-grid"]
6M["bento-grid.component.ts"]
6N["bento-item.component.ts"]
end
subgraph 6O["button"]
6P["button.component.ts"]
end
subgraph 6Q["confirm-dialog"]
6R["confirm-dialog.component.ts"]
end
subgraph 6S["date-range-input"]
6T["date-range-input.component.ts"]
end
subgraph 6U["divider"]
6V["divider.component.ts"]
end
subgraph 6W["dropdown"]
6X["dropdown.component.ts"]
end
subgraph 6Y["empty-state"]
6Z["empty-state.component.ts"]
end
subgraph 70["fieldset"]
71["fieldset.component.ts"]
end
subgraph 72["flex"]
73["flex.component.ts"]
end
subgraph 74["granularity-picker"]
75["granularity-picker.component.ts"]
end
76["index.ts"]
subgraph 77["input"]
78["input.component.ts"]
end
subgraph 79["label"]
7A["label.component.ts"]
end
subgraph 7B["loading-skeleton"]
7C["loading-skeleton.component.ts"]
end
subgraph 7D["modal"]
7E["mm-modal.component.ts"]
end
subgraph 7F["page-header"]
7G["page-header.component.ts"]
end
subgraph 7H["paginator"]
7I["paginator.component.ts"]
end
subgraph 7J["paper"]
7K["paper.component.ts"]
end
subgraph 7L["range-grouping-switcher"]
7M["range-grouping-switcher.component.ts"]
end
subgraph 7N["select"]
7O["select.component.ts"]
end
subgraph 7P["stat-card"]
7Q["stat-card.component.ts"]
end
subgraph 7R["table"]
7S["table.component.ts"]
end
subgraph 7T["tabs"]
7U["tabs.component.ts"]
end
subgraph 7V["typography"]
7W["typography.component.ts"]
end
end
subgraph 7X["utils"]
7Y["confidence-color.ts"]
7Z["confirm-state.ts"]
80["currency-format.ts"]
81["daisy-classes.ts"]
82["date-buckets.ts"]
83["debounced-text.ts"]
84["download-json.ts"]
85["fingerprint.ts"]
86["iban.ts"]
87["index.ts"]
88["pagination.ts"]
89["percentage.ts"]
8A["search-params.ts"]
8B["selection-model.ts"]
8C["signed-amount.pipe.ts"]
8D["sortable.ts"]
8E["structural-filters.ts"]
8F["theme-hooks.ts"]
subgraph 8G["validators"]
8H["iban.validator.ts"]
8I["percentage.validator.ts"]
end
8J["with-archivable.ts"]
8K["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2G
5-->4
5-->6
6-->M
6-->87
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
F-->17
F-->85
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
T-->87
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
10-->2G
10-->87
11-->T
11-->U
11-->V
11-->X
11-->Y
11-->Z
11-->10
13-->14
13-->15
13-->17
14-->17
15-->17
16-->14
16-->15
16-->17
16-->18
16-->19
18-->A
18-->M
1B-->1C
1B-->1E
1B-->1G
1B-->5
1B-->M
1B-->1S
1B-->2G
1B-->87
1C-->1E
1C-->M
1C-->87
1D-->1B
1D-->1C
1D-->1E
1D-->1F
1D-->1G
1E-->M
1E-->2C
1E-->2G
1F-->M
1G-->1E
1G-->1F
1G-->M
1G-->2G
1I-->1P
1I-->1V
1I-->M
1I-->87
1J-->1O
1J-->M
1K-->1J
1K-->M
1K-->87
1L-->M
1M-->1J
1M-->1X
1M-->M
1N-->87
1O-->1L
1O-->1P
1O-->M
1O-->2G
1P-->5
1P-->M
1Q-->M
1R-->87
1S-->1I
1S-->1J
1S-->1K
1S-->1L
1S-->1M
1S-->1N
1S-->1O
1S-->1P
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1S-->1W
1S-->1X
1S-->1Y
1S-->1Z
1S-->20
1S-->21
1S-->22
1T-->1P
1T-->M
1U-->1P
1U-->5
1U-->M
1V-->1P
1V-->M
1V-->87
1W-->1O
1W-->M
1X-->87
1Y-->87
1Z-->1W
1Z-->M
1Z-->87
20-->M
20-->2G
21-->1O
21-->M
21-->87
22-->1W
22-->M
24-->25
27-->28
27-->29
29-->28
2B-->M
2C-->2B
2C-->2D
2C-->2E
2D-->M
2E-->M
2E-->2G
2G-->2H
2G-->2I
2G-->2K
2G-->2J
2H-->M
2I-->2K
2I-->M
2J-->2I
2J-->2K
2J-->M
2K-->6
2K-->M
2K-->87
2M-->M
2N-->2V
2N-->2X
2N-->6E
2O-->M
2O-->1D
2O-->1S
2O-->87
2R-->2O
2R-->M
2R-->1S
2R-->6E
2R-->76
2R-->87
2T-->2M
2T-->M
2T-->76
2T-->87
2T-->8H
2T-->8I
2V-->2R
2V-->2T
2V-->1D
2V-->76
2V-->87
2X-->2M
2X-->2T
2X-->30
2X-->M
2X-->1D
2X-->76
2X-->87
2Y-->2R
2Y-->2T
2Y-->2V
2Y-->2X
2Y-->30
30-->2O
30-->M
30-->1D
30-->1S
30-->6E
30-->76
31-->2N
31-->2Y
33-->39
33-->3K
35-->16
36-->35
36-->3Q
36-->M
36-->16
36-->1D
39-->34
39-->3B
39-->M
39-->1D
39-->76
39-->87
3B-->34
3B-->M
3B-->76
3C-->39
3C-->3B
3C-->3E
3C-->3G
3C-->3I
3C-->3K
3E-->3M
3E-->1D
3E-->76
3E-->87
3G-->3N
3G-->A
3G-->M
3G-->1D
3G-->76
3I-->3O
3I-->3Q
3I-->76
3I-->87
3K-->3M
3K-->3P
3K-->3Q
3K-->3E
3K-->3G
3K-->3I
3K-->M
3K-->1D
3K-->76
3K-->87
3L-->33
3L-->34
3L-->35
3L-->36
3L-->3C
3L-->3M
3L-->3P
3L-->3Q
3M-->3P
3M-->M
3N-->M
3O-->M
3P-->3N
3P-->M
3Q-->3O
3Q-->A
3Q-->M
3Q-->1D
3Q-->87
3S-->M
3V-->1D
3V-->76
3V-->87
3X-->1D
3X-->2G
3X-->76
3X-->87
3Z-->4J
3Z-->1D
3Z-->1S
3Z-->6E
3Z-->76
3Z-->87
41-->3S
41-->4J
41-->1D
41-->76
41-->87
43-->4F
43-->4G
43-->M
43-->76
45-->4F
45-->4G
45-->4J
45-->3V
45-->3X
45-->3Z
45-->41
45-->43
45-->48
45-->4A
45-->4C
45-->4E
45-->1D
45-->1S
45-->76
45-->87
46-->3V
46-->3X
46-->3Z
46-->41
46-->43
46-->45
46-->48
46-->4A
46-->4C
46-->4E
48-->1D
48-->76
48-->87
4A-->4J
4A-->1D
4A-->1S
4A-->76
4A-->87
4C-->1D
4C-->1S
4C-->2G
4C-->6E
4C-->76
4C-->87
4E-->4J
4E-->1S
4E-->76
4E-->87
4F-->4G
4F-->M
4G-->M
4H-->45
4H-->6E
4I-->46
4I-->4H
4J-->3S
4J-->1D
4J-->1S
4J-->2G
4N-->M
4N-->24
4N-->76
4N-->87
4O-->4N
4P-->4N
4Q-->4O
4Q-->4P
4U-->57
4U-->M
4U-->11
4U-->76
4W-->11
4W-->76
4W-->87
4Y-->57
4Y-->M
4Y-->11
4Y-->76
50-->M
50-->76
52-->54
52-->57
52-->4U
52-->4W
52-->4Y
52-->50
52-->M
52-->11
52-->1D
52-->76
53-->4U
53-->4W
53-->4Y
53-->50
53-->52
54-->A
54-->M
54-->11
54-->1D
55-->52
56-->53
56-->54
56-->55
56-->57
57-->M
5A-->5C
5A-->5E
5A-->5G
5A-->5I
5C-->5E
5C-->5G
5C-->5I
5C-->76
5E-->16
5E-->1D
5E-->3L
5E-->76
5G-->M
5G-->16
5G-->1D
5G-->3L
5G-->76
5G-->87
5I-->M
5I-->1D
5I-->3L
5I-->76
5I-->87
5J-->5A
5J-->5K
5K-->5C
5N-->5P
5P-->27
5P-->76
5Q-->5N
5Q-->5R
5R-->5P
5V-->M
5V-->1D
5V-->2C
5V-->76
5V-->87
5W-->5Y
5W-->60
5W-->62
5W-->64
5W-->66
5Y-->1D
5Y-->76
60-->5V
60-->M
60-->1D
60-->2C
60-->3L
60-->76
62-->68
62-->1D
62-->76
62-->87
64-->68
64-->5Y
64-->60
64-->62
64-->66
64-->M
64-->1D
64-->2G
64-->76
64-->87
66-->1D
66-->2G
66-->76
66-->87
67-->69
68-->M
68-->2G
69-->64
6E-->6C
6E-->6D
6E-->6F
6F-->87
6I-->87
6K-->87
6M-->87
6N-->87
6P-->87
6R-->6P
6R-->7A
6R-->7E
6R-->7W
6T-->6X
6T-->87
6V-->87
6X-->87
6Z-->73
6Z-->7W
71-->87
73-->87
76-->6I
76-->6K
76-->6M
76-->6N
76-->6P
76-->6R
76-->6T
76-->6V
76-->6X
76-->6Z
76-->71
76-->73
76-->75
76-->78
76-->7A
76-->7C
76-->7E
76-->7G
76-->7I
76-->7K
76-->7M
76-->7O
76-->7Q
76-->7S
76-->7U
76-->7W
78-->87
7A-->87
7C-->73
7E-->87
7G-->73
7G-->7W
7I-->6P
7I-->73
7I-->7W
7I-->87
7K-->87
7M-->6P
7M-->6T
7M-->73
7O-->87
7Q-->7W
7Q-->87
7S-->87
7U-->87
7W-->87
87-->7Y
87-->7Z
87-->80
87-->81
87-->82
87-->83
87-->84
87-->85
87-->86
87-->88
87-->89
87-->8A
87-->8B
87-->8C
87-->8D
87-->8E
87-->8F
87-->8J
87-->8K
8C-->80
```
