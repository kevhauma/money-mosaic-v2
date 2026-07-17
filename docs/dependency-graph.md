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
- 201 leaf nodes, 563 edges.
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
subgraph 26["transactions"]
27["attribution-override.ts"]
28["index.ts"]
29["nullify-transaction.ts"]
2A["transaction-deletion.service.ts"]
end
subgraph 2B["transfers"]
2C["index.ts"]
2D["transfer-cleanup.service.ts"]
2E["transfer-linking.service.ts"]
2F["transfer-matching.service.ts"]
2G["transfer-matching.ts"]
end
end
subgraph 2H["feature-accounts"]
2I["account-icons.ts"]
2J["accounts.routes.ts"]
2K["balance-trend-signals.ts"]
subgraph 2L["components"]
subgraph 2M["account-balance-chart"]
2N["account-balance-chart.component.ts"]
end
subgraph 2O["account-form"]
2P["account-form.component.ts"]
end
subgraph 2Q["accounts-detail"]
2R["accounts-detail.component.ts"]
end
subgraph 2S["accounts-overview"]
2T["accounts-overview.component.ts"]
end
2U["index.ts"]
subgraph 2V["net-worth-history-chart"]
2W["net-worth-history-chart.component.ts"]
end
end
2X["index.ts"]
end
subgraph 2Y["feature-categories"]
2Z["categories.routes.ts"]
30["category-icons.ts"]
31["category-model.service.ts"]
32["category-model.store.ts"]
subgraph 33["components"]
subgraph 34["categories-overview"]
35["categories-overview.component.ts"]
end
subgraph 36["category-form"]
37["category-form.component.ts"]
end
38["index.ts"]
subgraph 39["rule-filters"]
3A["rule-filters.component.ts"]
end
subgraph 3B["rule-form"]
3C["rule-form.component.ts"]
end
subgraph 3D["rule-share-bar"]
3E["rule-share-bar.component.ts"]
end
subgraph 3F["rules-overview"]
3G["rules-overview.component.ts"]
end
end
3H["index.ts"]
3I["rule-filters.ts"]
3J["rule-labels.ts"]
3K["rule-share.ts"]
3L["rule-summary.ts"]
3M["rules.store.ts"]
end
subgraph 3N["feature-dashboard"]
3O["category-comparison-settings.store.ts"]
subgraph 3P["components"]
subgraph 3Q["account-balance-strip"]
3R["account-balance-strip.component.ts"]
end
subgraph 3S["action-queue-panel"]
3T["action-queue-panel.component.ts"]
end
subgraph 3U["category-breakdown-panel"]
3V["category-breakdown-panel.component.ts"]
end
subgraph 3W["category-comparison-panel"]
3X["category-comparison-panel.component.ts"]
end
subgraph 3Y["dashboard-customize-panel"]
3Z["dashboard-customize-panel.component.ts"]
end
subgraph 40["dashboard-overview"]
41["dashboard-overview.component.ts"]
end
42["index.ts"]
subgraph 43["net-worth-header"]
44["net-worth-header.component.ts"]
end
subgraph 45["top-transactions-panel"]
46["top-transactions-panel.component.ts"]
end
subgraph 47["trend-chart-panel"]
48["trend-chart-panel.component.ts"]
end
subgraph 49["weekday-weekend-split-panel"]
4A["weekday-weekend-split-panel.component.ts"]
end
end
4B["dashboard-layout-settings.store.ts"]
4C["dashboard-row-order.ts"]
4D["dashboard.routes.ts"]
4E["index.ts"]
4F["stats.store.ts"]
end
subgraph 4G["feature-data-management"]
subgraph 4H["components"]
subgraph 4I["data-management-overview"]
4J["data-management-overview.component.ts"]
end
4K["index.ts"]
end
4L["data-management.routes.ts"]
4M["index.ts"]
end
subgraph 4N["feature-import"]
subgraph 4O["components"]
subgraph 4P["import-map-step"]
4Q["import-map-step.component.ts"]
end
subgraph 4R["import-preview-step"]
4S["import-preview-step.component.ts"]
end
subgraph 4T["import-select-step"]
4U["import-select-step.component.ts"]
end
subgraph 4V["import-summary-step"]
4W["import-summary-step.component.ts"]
end
subgraph 4X["import-wizard"]
4Y["import-wizard.component.ts"]
end
4Z["index.ts"]
end
50["import-batches.store.ts"]
51["import.routes.ts"]
52["index.ts"]
53["mapping-profiles.store.ts"]
end
subgraph 54["feature-learning"]
subgraph 55["components"]
56["index.ts"]
subgraph 57["learning-overview"]
58["learning-overview.component.ts"]
end
subgraph 59["model-status"]
5A["model-status.component.ts"]
end
subgraph 5B["rule-proposals"]
5C["rule-proposals.component.ts"]
end
subgraph 5D["suggestions-table"]
5E["suggestions-table.component.ts"]
end
end
5F["index.ts"]
5G["learning.routes.ts"]
end
subgraph 5H["feature-transactions"]
subgraph 5I["components"]
subgraph 5J["attribution-override-fieldset"]
5K["attribution-override-fieldset.component.ts"]
end
5L["index.ts"]
subgraph 5M["transaction-bulk-bar"]
5N["transaction-bulk-bar.component.ts"]
end
subgraph 5O["transaction-edit-form"]
5P["transaction-edit-form.component.ts"]
end
subgraph 5Q["transaction-filters"]
5R["transaction-filters.component.ts"]
end
subgraph 5S["transactions-overview"]
5T["transactions-overview.component.ts"]
end
subgraph 5U["transfer-review"]
5V["transfer-review.component.ts"]
end
end
5W["index.ts"]
5X["transaction-filters.ts"]
5Y["transactions.routes.ts"]
end
subgraph 5Z["shared"]
subgraph 60["echarts"]
61["echarts-setup.ts"]
62["index.ts"]
63["tooltip-formatter.ts"]
end
subgraph 64["ui"]
subgraph 65["alert"]
66["alert.component.ts"]
end
subgraph 67["badge"]
68["badge.component.ts"]
end
subgraph 69["bento-grid"]
6A["bento-grid.component.ts"]
6B["bento-item.component.ts"]
end
subgraph 6C["button"]
6D["button.component.ts"]
end
subgraph 6E["confirm-dialog"]
6F["confirm-dialog.component.ts"]
end
subgraph 6G["date-range-input"]
6H["date-range-input.component.ts"]
end
subgraph 6I["divider"]
6J["divider.component.ts"]
end
subgraph 6K["dropdown"]
6L["dropdown.component.ts"]
end
subgraph 6M["empty-state"]
6N["empty-state.component.ts"]
end
subgraph 6O["fieldset"]
6P["fieldset.component.ts"]
end
subgraph 6Q["granularity-picker"]
6R["granularity-picker.component.ts"]
end
6S["index.ts"]
subgraph 6T["input"]
6U["input.component.ts"]
end
subgraph 6V["label"]
6W["label.component.ts"]
end
subgraph 6X["loading-skeleton"]
6Y["loading-skeleton.component.ts"]
end
subgraph 6Z["modal"]
70["mm-modal.component.ts"]
end
subgraph 71["page-header"]
72["page-header.component.ts"]
end
subgraph 73["paginator"]
74["paginator.component.ts"]
end
subgraph 75["paper"]
76["paper.component.ts"]
end
subgraph 77["range-grouping-switcher"]
78["range-grouping-switcher.component.ts"]
end
subgraph 79["select"]
7A["select.component.ts"]
end
subgraph 7B["stat-card"]
7C["stat-card.component.ts"]
end
subgraph 7D["table"]
7E["table.component.ts"]
end
subgraph 7F["tabs"]
7G["tabs.component.ts"]
end
subgraph 7H["typography"]
7I["typography.component.ts"]
end
end
subgraph 7J["utils"]
7K["confidence-color.ts"]
7L["confirm-state.ts"]
7M["currency-format.ts"]
7N["daisy-classes.ts"]
7O["date-buckets.ts"]
7P["debounced-text.ts"]
7Q["download-json.ts"]
7R["fingerprint.ts"]
7S["iban.ts"]
7T["index.ts"]
7U["pagination.ts"]
7V["percentage.ts"]
7W["search-params.ts"]
7X["selection-model.ts"]
7Y["signed-amount.pipe.ts"]
7Z["sortable.ts"]
80["structural-filters.ts"]
subgraph 81["validators"]
82["iban.validator.ts"]
83["percentage.validator.ts"]
end
84["with-archivable.ts"]
85["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2C
5-->4
5-->6
6-->M
6-->7T
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
F-->7R
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
T-->7T
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
10-->2C
10-->7T
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
1B-->2C
1B-->7T
1C-->1E
1C-->M
1C-->7T
1D-->1B
1D-->1C
1D-->1E
1D-->1F
1D-->1G
1E-->M
1E-->28
1E-->2C
1F-->M
1G-->1E
1G-->1F
1G-->M
1G-->2C
1I-->1P
1I-->1V
1I-->M
1I-->7T
1J-->1O
1J-->M
1K-->1J
1K-->M
1K-->7T
1L-->M
1M-->1J
1M-->1X
1M-->M
1N-->7T
1O-->1L
1O-->1P
1O-->M
1O-->2C
1P-->5
1P-->M
1Q-->M
1R-->7T
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
1V-->7T
1W-->1O
1W-->M
1X-->7T
1Y-->7T
1Z-->1W
1Z-->M
1Z-->7T
20-->M
20-->2C
21-->1O
21-->M
21-->7T
22-->1W
22-->M
24-->25
27-->M
28-->27
28-->29
28-->2A
29-->M
2A-->M
2A-->2C
2C-->2D
2C-->2E
2C-->2G
2C-->2F
2D-->M
2E-->2G
2E-->M
2F-->2E
2F-->2G
2F-->M
2G-->6
2G-->M
2G-->7T
2I-->M
2J-->2R
2J-->2T
2J-->62
2K-->M
2K-->1D
2K-->1S
2K-->7T
2N-->2K
2N-->M
2N-->1S
2N-->62
2N-->6S
2N-->7T
2P-->2I
2P-->M
2P-->6S
2P-->7T
2P-->82
2P-->83
2R-->2N
2R-->2P
2R-->1D
2R-->6S
2R-->7T
2T-->2I
2T-->2P
2T-->2W
2T-->M
2T-->1D
2T-->6S
2T-->7T
2U-->2N
2U-->2P
2U-->2R
2U-->2T
2U-->2W
2W-->2K
2W-->M
2W-->1D
2W-->1S
2W-->62
2W-->6S
2X-->2J
2X-->2U
2Z-->35
2Z-->3G
31-->16
32-->31
32-->3M
32-->M
32-->16
32-->1D
35-->30
35-->37
35-->M
35-->1D
35-->6S
35-->7T
37-->30
37-->M
37-->6S
38-->35
38-->37
38-->3A
38-->3C
38-->3E
38-->3G
3A-->3I
3A-->1D
3A-->6S
3A-->7T
3C-->3J
3C-->A
3C-->M
3C-->1D
3C-->6S
3E-->3K
3E-->3M
3E-->6S
3E-->7T
3G-->3I
3G-->3L
3G-->3M
3G-->3A
3G-->3C
3G-->3E
3G-->M
3G-->1D
3G-->6S
3G-->7T
3H-->2Z
3H-->30
3H-->31
3H-->32
3H-->38
3H-->3I
3H-->3L
3H-->3M
3I-->3L
3I-->M
3J-->M
3K-->M
3L-->3J
3L-->M
3M-->3K
3M-->A
3M-->M
3M-->1D
3M-->7T
3O-->M
3R-->1D
3R-->6S
3R-->7T
3T-->1D
3T-->2C
3T-->6S
3T-->7T
3V-->4F
3V-->1D
3V-->1S
3V-->6S
3V-->7T
3X-->3O
3X-->4F
3X-->1D
3X-->6S
3X-->7T
3Z-->4B
3Z-->4C
3Z-->M
3Z-->6S
41-->4B
41-->4C
41-->4F
41-->3R
41-->3T
41-->3V
41-->3X
41-->3Z
41-->44
41-->46
41-->48
41-->4A
41-->1D
41-->1S
41-->6S
41-->7T
42-->3R
42-->3T
42-->3V
42-->3X
42-->3Z
42-->41
42-->44
42-->46
42-->48
42-->4A
44-->1D
44-->6S
44-->7T
46-->4F
46-->1D
46-->1S
46-->6S
46-->7T
48-->1D
48-->1S
48-->2C
48-->62
48-->6S
48-->7T
4A-->4F
4A-->1S
4A-->6S
4A-->7T
4B-->4C
4B-->M
4C-->M
4D-->41
4D-->62
4E-->42
4E-->4D
4F-->3O
4F-->1D
4F-->1S
4F-->2C
4J-->M
4J-->24
4J-->6S
4J-->7T
4K-->4J
4L-->4J
4M-->4K
4M-->4L
4Q-->53
4Q-->M
4Q-->11
4Q-->6S
4S-->11
4S-->6S
4S-->7T
4U-->53
4U-->M
4U-->11
4U-->6S
4W-->M
4W-->6S
4Y-->50
4Y-->53
4Y-->4Q
4Y-->4S
4Y-->4U
4Y-->4W
4Y-->M
4Y-->11
4Y-->1D
4Y-->6S
4Z-->4Q
4Z-->4S
4Z-->4U
4Z-->4W
4Z-->4Y
50-->A
50-->M
50-->11
50-->1D
51-->4Y
52-->4Z
52-->50
52-->51
52-->53
53-->M
56-->58
56-->5A
56-->5C
56-->5E
58-->5A
58-->5C
58-->5E
58-->6S
5A-->16
5A-->1D
5A-->3H
5A-->6S
5C-->M
5C-->16
5C-->1D
5C-->3H
5C-->6S
5C-->7T
5E-->M
5E-->1D
5E-->3H
5E-->6S
5E-->7T
5F-->56
5F-->5G
5G-->58
5K-->M
5K-->1D
5K-->28
5K-->6S
5K-->7T
5L-->5N
5L-->5P
5L-->5R
5L-->5T
5L-->5V
5N-->1D
5N-->6S
5P-->5K
5P-->M
5P-->1D
5P-->28
5P-->3H
5P-->6S
5R-->5X
5R-->1D
5R-->6S
5R-->7T
5T-->5X
5T-->5N
5T-->5P
5T-->5R
5T-->5V
5T-->M
5T-->1D
5T-->2C
5T-->6S
5T-->7T
5V-->1D
5V-->2C
5V-->6S
5V-->7T
5W-->5Y
5X-->M
5X-->2C
5Y-->5T
62-->61
62-->63
63-->7T
66-->7T
68-->7T
6A-->7T
6B-->7T
6D-->7T
6F-->6D
6F-->6W
6F-->70
6F-->7I
6H-->6L
6H-->7T
6J-->7T
6L-->7T
6N-->7I
6P-->7T
6S-->66
6S-->68
6S-->6A
6S-->6B
6S-->6D
6S-->6F
6S-->6H
6S-->6J
6S-->6L
6S-->6N
6S-->6P
6S-->6R
6S-->6U
6S-->6W
6S-->6Y
6S-->70
6S-->72
6S-->74
6S-->76
6S-->78
6S-->7A
6S-->7C
6S-->7E
6S-->7G
6S-->7I
6U-->7T
6W-->7T
70-->7T
72-->7I
74-->6D
74-->7I
74-->7T
76-->7T
78-->6D
78-->6H
7A-->7T
7C-->7I
7E-->7T
7G-->7T
7I-->7T
7T-->7K
7T-->7L
7T-->7M
7T-->7N
7T-->7O
7T-->7P
7T-->7Q
7T-->7R
7T-->7S
7T-->7U
7T-->7V
7T-->7W
7T-->7X
7T-->7Y
7T-->7Z
7T-->80
7T-->84
7T-->85
7Y-->7M
```
