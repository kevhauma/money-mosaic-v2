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
- 205 leaf nodes, 573 edges.
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
28["theme.service.ts"]
end
subgraph 29["transactions"]
2A["attribution-override.ts"]
2B["index.ts"]
2C["nullify-transaction.ts"]
2D["transaction-deletion.service.ts"]
end
subgraph 2E["transfers"]
2F["index.ts"]
2G["transfer-cleanup.service.ts"]
2H["transfer-linking.service.ts"]
2I["transfer-matching.service.ts"]
2J["transfer-matching.ts"]
end
end
subgraph 2K["feature-accounts"]
2L["account-icons.ts"]
2M["accounts.routes.ts"]
2N["balance-trend-signals.ts"]
subgraph 2O["components"]
subgraph 2P["account-balance-chart"]
2Q["account-balance-chart.component.ts"]
end
subgraph 2R["account-form"]
2S["account-form.component.ts"]
end
subgraph 2T["accounts-detail"]
2U["accounts-detail.component.ts"]
end
subgraph 2V["accounts-overview"]
2W["accounts-overview.component.ts"]
end
2X["index.ts"]
subgraph 2Y["net-worth-history-chart"]
2Z["net-worth-history-chart.component.ts"]
end
end
30["index.ts"]
end
subgraph 31["feature-categories"]
32["categories.routes.ts"]
33["category-icons.ts"]
34["category-model.service.ts"]
35["category-model.store.ts"]
subgraph 36["components"]
subgraph 37["categories-overview"]
38["categories-overview.component.ts"]
end
subgraph 39["category-form"]
3A["category-form.component.ts"]
end
3B["index.ts"]
subgraph 3C["rule-filters"]
3D["rule-filters.component.ts"]
end
subgraph 3E["rule-form"]
3F["rule-form.component.ts"]
end
subgraph 3G["rule-share-bar"]
3H["rule-share-bar.component.ts"]
end
subgraph 3I["rules-overview"]
3J["rules-overview.component.ts"]
end
end
3K["index.ts"]
3L["rule-filters.ts"]
3M["rule-labels.ts"]
3N["rule-share.ts"]
3O["rule-summary.ts"]
3P["rules.store.ts"]
end
subgraph 3Q["feature-dashboard"]
3R["category-comparison-settings.store.ts"]
subgraph 3S["components"]
subgraph 3T["account-balance-strip"]
3U["account-balance-strip.component.ts"]
end
subgraph 3V["action-queue-panel"]
3W["action-queue-panel.component.ts"]
end
subgraph 3X["category-breakdown-panel"]
3Y["category-breakdown-panel.component.ts"]
end
subgraph 3Z["category-comparison-panel"]
40["category-comparison-panel.component.ts"]
end
subgraph 41["dashboard-customize-panel"]
42["dashboard-customize-panel.component.ts"]
end
subgraph 43["dashboard-overview"]
44["dashboard-overview.component.ts"]
end
45["index.ts"]
subgraph 46["net-worth-header"]
47["net-worth-header.component.ts"]
end
subgraph 48["top-transactions-panel"]
49["top-transactions-panel.component.ts"]
end
subgraph 4A["trend-chart-panel"]
4B["trend-chart-panel.component.ts"]
end
subgraph 4C["weekday-weekend-split-panel"]
4D["weekday-weekend-split-panel.component.ts"]
end
end
4E["dashboard-layout-settings.store.ts"]
4F["dashboard-row-order.ts"]
4G["dashboard.routes.ts"]
4H["index.ts"]
4I["stats.store.ts"]
end
subgraph 4J["feature-data-management"]
subgraph 4K["components"]
subgraph 4L["data-management-overview"]
4M["data-management-overview.component.ts"]
end
4N["index.ts"]
end
4O["data-management.routes.ts"]
4P["index.ts"]
end
subgraph 4Q["feature-import"]
subgraph 4R["components"]
subgraph 4S["import-map-step"]
4T["import-map-step.component.ts"]
end
subgraph 4U["import-preview-step"]
4V["import-preview-step.component.ts"]
end
subgraph 4W["import-select-step"]
4X["import-select-step.component.ts"]
end
subgraph 4Y["import-summary-step"]
4Z["import-summary-step.component.ts"]
end
subgraph 50["import-wizard"]
51["import-wizard.component.ts"]
end
52["index.ts"]
end
53["import-batches.store.ts"]
54["import.routes.ts"]
55["index.ts"]
56["mapping-profiles.store.ts"]
end
subgraph 57["feature-learning"]
subgraph 58["components"]
59["index.ts"]
subgraph 5A["learning-overview"]
5B["learning-overview.component.ts"]
end
subgraph 5C["model-status"]
5D["model-status.component.ts"]
end
subgraph 5E["rule-proposals"]
5F["rule-proposals.component.ts"]
end
subgraph 5G["suggestions-table"]
5H["suggestions-table.component.ts"]
end
end
5I["index.ts"]
5J["learning.routes.ts"]
end
subgraph 5K["feature-transactions"]
subgraph 5L["components"]
subgraph 5M["attribution-override-fieldset"]
5N["attribution-override-fieldset.component.ts"]
end
5O["index.ts"]
subgraph 5P["transaction-bulk-bar"]
5Q["transaction-bulk-bar.component.ts"]
end
subgraph 5R["transaction-edit-form"]
5S["transaction-edit-form.component.ts"]
end
subgraph 5T["transaction-filters"]
5U["transaction-filters.component.ts"]
end
subgraph 5V["transactions-overview"]
5W["transactions-overview.component.ts"]
end
subgraph 5X["transfer-review"]
5Y["transfer-review.component.ts"]
end
end
5Z["index.ts"]
60["transaction-filters.ts"]
61["transactions.routes.ts"]
end
subgraph 62["shared"]
subgraph 63["echarts"]
64["chart-theme.ts"]
65["echarts-setup.ts"]
66["index.ts"]
67["tooltip-formatter.ts"]
end
subgraph 68["ui"]
subgraph 69["alert"]
6A["alert.component.ts"]
end
subgraph 6B["badge"]
6C["badge.component.ts"]
end
subgraph 6D["bento-grid"]
6E["bento-grid.component.ts"]
6F["bento-item.component.ts"]
end
subgraph 6G["button"]
6H["button.component.ts"]
end
subgraph 6I["confirm-dialog"]
6J["confirm-dialog.component.ts"]
end
subgraph 6K["date-range-input"]
6L["date-range-input.component.ts"]
end
subgraph 6M["divider"]
6N["divider.component.ts"]
end
subgraph 6O["dropdown"]
6P["dropdown.component.ts"]
end
subgraph 6Q["empty-state"]
6R["empty-state.component.ts"]
end
subgraph 6S["fieldset"]
6T["fieldset.component.ts"]
end
subgraph 6U["flex"]
6V["flex.component.ts"]
end
subgraph 6W["granularity-picker"]
6X["granularity-picker.component.ts"]
end
6Y["index.ts"]
subgraph 6Z["input"]
70["input.component.ts"]
end
subgraph 71["label"]
72["label.component.ts"]
end
subgraph 73["loading-skeleton"]
74["loading-skeleton.component.ts"]
end
subgraph 75["modal"]
76["mm-modal.component.ts"]
end
subgraph 77["page-header"]
78["page-header.component.ts"]
end
subgraph 79["paginator"]
7A["paginator.component.ts"]
end
subgraph 7B["paper"]
7C["paper.component.ts"]
end
subgraph 7D["range-grouping-switcher"]
7E["range-grouping-switcher.component.ts"]
end
subgraph 7F["select"]
7G["select.component.ts"]
end
subgraph 7H["stat-card"]
7I["stat-card.component.ts"]
end
subgraph 7J["table"]
7K["table.component.ts"]
end
subgraph 7L["tabs"]
7M["tabs.component.ts"]
end
subgraph 7N["typography"]
7O["typography.component.ts"]
end
end
subgraph 7P["utils"]
7Q["confidence-color.ts"]
7R["confirm-state.ts"]
7S["currency-format.ts"]
7T["daisy-classes.ts"]
7U["date-buckets.ts"]
7V["debounced-text.ts"]
7W["download-json.ts"]
7X["fingerprint.ts"]
7Y["iban.ts"]
7Z["index.ts"]
80["pagination.ts"]
81["percentage.ts"]
82["search-params.ts"]
83["selection-model.ts"]
84["signed-amount.pipe.ts"]
85["sortable.ts"]
86["structural-filters.ts"]
subgraph 87["validators"]
88["iban.validator.ts"]
89["percentage.validator.ts"]
end
8A["with-archivable.ts"]
8B["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2F
5-->4
5-->6
6-->M
6-->7Z
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
F-->7X
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
T-->7Z
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
10-->2F
10-->7Z
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
1B-->2F
1B-->7Z
1C-->1E
1C-->M
1C-->7Z
1D-->1B
1D-->1C
1D-->1E
1D-->1F
1D-->1G
1E-->M
1E-->2B
1E-->2F
1F-->M
1G-->1E
1G-->1F
1G-->M
1G-->2F
1I-->1P
1I-->1V
1I-->M
1I-->7Z
1J-->1O
1J-->M
1K-->1J
1K-->M
1K-->7Z
1L-->M
1M-->1J
1M-->1X
1M-->M
1N-->7Z
1O-->1L
1O-->1P
1O-->M
1O-->2F
1P-->5
1P-->M
1Q-->M
1R-->7Z
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
1V-->7Z
1W-->1O
1W-->M
1X-->7Z
1Y-->7Z
1Z-->1W
1Z-->M
1Z-->7Z
20-->M
20-->2F
21-->1O
21-->M
21-->7Z
22-->1W
22-->M
24-->25
27-->28
2A-->M
2B-->2A
2B-->2C
2B-->2D
2C-->M
2D-->M
2D-->2F
2F-->2G
2F-->2H
2F-->2J
2F-->2I
2G-->M
2H-->2J
2H-->M
2I-->2H
2I-->2J
2I-->M
2J-->6
2J-->M
2J-->7Z
2L-->M
2M-->2U
2M-->2W
2M-->66
2N-->M
2N-->1D
2N-->1S
2N-->7Z
2Q-->2N
2Q-->M
2Q-->1S
2Q-->66
2Q-->6Y
2Q-->7Z
2S-->2L
2S-->M
2S-->6Y
2S-->7Z
2S-->88
2S-->89
2U-->2Q
2U-->2S
2U-->1D
2U-->6Y
2U-->7Z
2W-->2L
2W-->2S
2W-->2Z
2W-->M
2W-->1D
2W-->6Y
2W-->7Z
2X-->2Q
2X-->2S
2X-->2U
2X-->2W
2X-->2Z
2Z-->2N
2Z-->M
2Z-->1D
2Z-->1S
2Z-->66
2Z-->6Y
30-->2M
30-->2X
32-->38
32-->3J
34-->16
35-->34
35-->3P
35-->M
35-->16
35-->1D
38-->33
38-->3A
38-->M
38-->1D
38-->6Y
38-->7Z
3A-->33
3A-->M
3A-->6Y
3B-->38
3B-->3A
3B-->3D
3B-->3F
3B-->3H
3B-->3J
3D-->3L
3D-->1D
3D-->6Y
3D-->7Z
3F-->3M
3F-->A
3F-->M
3F-->1D
3F-->6Y
3H-->3N
3H-->3P
3H-->6Y
3H-->7Z
3J-->3L
3J-->3O
3J-->3P
3J-->3D
3J-->3F
3J-->3H
3J-->M
3J-->1D
3J-->6Y
3J-->7Z
3K-->32
3K-->33
3K-->34
3K-->35
3K-->3B
3K-->3L
3K-->3O
3K-->3P
3L-->3O
3L-->M
3M-->M
3N-->M
3O-->3M
3O-->M
3P-->3N
3P-->A
3P-->M
3P-->1D
3P-->7Z
3R-->M
3U-->1D
3U-->6Y
3U-->7Z
3W-->1D
3W-->2F
3W-->6Y
3W-->7Z
3Y-->4I
3Y-->1D
3Y-->1S
3Y-->66
3Y-->6Y
3Y-->7Z
40-->3R
40-->4I
40-->1D
40-->6Y
40-->7Z
42-->4E
42-->4F
42-->M
42-->6Y
44-->4E
44-->4F
44-->4I
44-->3U
44-->3W
44-->3Y
44-->40
44-->42
44-->47
44-->49
44-->4B
44-->4D
44-->1D
44-->1S
44-->6Y
44-->7Z
45-->3U
45-->3W
45-->3Y
45-->40
45-->42
45-->44
45-->47
45-->49
45-->4B
45-->4D
47-->1D
47-->6Y
47-->7Z
49-->4I
49-->1D
49-->1S
49-->6Y
49-->7Z
4B-->1D
4B-->1S
4B-->2F
4B-->66
4B-->6Y
4B-->7Z
4D-->4I
4D-->1S
4D-->6Y
4D-->7Z
4E-->4F
4E-->M
4F-->M
4G-->44
4G-->66
4H-->45
4H-->4G
4I-->3R
4I-->1D
4I-->1S
4I-->2F
4M-->M
4M-->24
4M-->6Y
4M-->7Z
4N-->4M
4O-->4M
4P-->4N
4P-->4O
4T-->56
4T-->M
4T-->11
4T-->6Y
4V-->11
4V-->6Y
4V-->7Z
4X-->56
4X-->M
4X-->11
4X-->6Y
4Z-->M
4Z-->6Y
51-->53
51-->56
51-->4T
51-->4V
51-->4X
51-->4Z
51-->M
51-->11
51-->1D
51-->6Y
52-->4T
52-->4V
52-->4X
52-->4Z
52-->51
53-->A
53-->M
53-->11
53-->1D
54-->51
55-->52
55-->53
55-->54
55-->56
56-->M
59-->5B
59-->5D
59-->5F
59-->5H
5B-->5D
5B-->5F
5B-->5H
5B-->6Y
5D-->16
5D-->1D
5D-->3K
5D-->6Y
5F-->M
5F-->16
5F-->1D
5F-->3K
5F-->6Y
5F-->7Z
5H-->M
5H-->1D
5H-->3K
5H-->6Y
5H-->7Z
5I-->59
5I-->5J
5J-->5B
5N-->M
5N-->1D
5N-->2B
5N-->6Y
5N-->7Z
5O-->5Q
5O-->5S
5O-->5U
5O-->5W
5O-->5Y
5Q-->1D
5Q-->6Y
5S-->5N
5S-->M
5S-->1D
5S-->2B
5S-->3K
5S-->6Y
5U-->60
5U-->1D
5U-->6Y
5U-->7Z
5W-->60
5W-->5Q
5W-->5S
5W-->5U
5W-->5Y
5W-->M
5W-->1D
5W-->2F
5W-->6Y
5W-->7Z
5Y-->1D
5Y-->2F
5Y-->6Y
5Y-->7Z
5Z-->61
60-->M
60-->2F
61-->5W
66-->64
66-->65
66-->67
67-->7Z
6A-->7Z
6C-->7Z
6E-->7Z
6F-->7Z
6H-->7Z
6J-->6H
6J-->72
6J-->76
6J-->7O
6L-->6P
6L-->7Z
6N-->7Z
6P-->7Z
6R-->6V
6R-->7O
6T-->7Z
6V-->7Z
6Y-->6A
6Y-->6C
6Y-->6E
6Y-->6F
6Y-->6H
6Y-->6J
6Y-->6L
6Y-->6N
6Y-->6P
6Y-->6R
6Y-->6T
6Y-->6V
6Y-->6X
6Y-->70
6Y-->72
6Y-->74
6Y-->76
6Y-->78
6Y-->7A
6Y-->7C
6Y-->7E
6Y-->7G
6Y-->7I
6Y-->7K
6Y-->7M
6Y-->7O
70-->7Z
72-->7Z
74-->6V
76-->7Z
78-->6V
78-->7O
7A-->6H
7A-->6V
7A-->7O
7A-->7Z
7C-->7Z
7E-->6H
7E-->6L
7E-->6V
7G-->7Z
7I-->7O
7K-->7Z
7M-->7Z
7O-->7Z
7Z-->7Q
7Z-->7R
7Z-->7S
7Z-->7T
7Z-->7U
7Z-->7V
7Z-->7W
7Z-->7X
7Z-->7Y
7Z-->80
7Z-->81
7Z-->82
7Z-->83
7Z-->84
7Z-->85
7Z-->86
7Z-->8A
7Z-->8B
84-->7S
```
