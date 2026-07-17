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
- 195 leaf nodes, 550 edges.
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
1Q["date-buckets.ts"]
1R["full-history-range.ts"]
1S["granularity-for-span.ts"]
1T["index.ts"]
1U["joint-account-stake.ts"]
1V["joint-contributor-breakdown.ts"]
1W["net-worth-trend.ts"]
1X["period-stats.ts"]
1Y["period-window.ts"]
1Z["range-state.store.ts"]
20["spending-rate.ts"]
21["top-transactions.ts"]
22["weekday-weekend-split.ts"]
23["year-over-year.ts"]
end
subgraph 24["storage"]
25["index.ts"]
26["storage-status.service.ts"]
end
subgraph 27["transactions"]
28["attribution-override.ts"]
29["index.ts"]
2A["nullify-transaction.ts"]
2B["transaction-deletion.service.ts"]
end
subgraph 2C["transfers"]
2D["index.ts"]
2E["transfer-cleanup.service.ts"]
2F["transfer-linking.service.ts"]
2G["transfer-matching.service.ts"]
2H["transfer-matching.ts"]
end
end
subgraph 2I["feature-accounts"]
2J["account-icons.ts"]
2K["accounts.routes.ts"]
2L["balance-trend-signals.ts"]
subgraph 2M["components"]
subgraph 2N["account-balance-chart"]
2O["account-balance-chart.component.ts"]
end
subgraph 2P["account-form"]
2Q["account-form.component.ts"]
end
subgraph 2R["accounts-detail"]
2S["accounts-detail.component.ts"]
end
subgraph 2T["accounts-overview"]
2U["accounts-overview.component.ts"]
end
2V["index.ts"]
subgraph 2W["net-worth-history-chart"]
2X["net-worth-history-chart.component.ts"]
end
end
2Y["index.ts"]
end
subgraph 2Z["feature-categories"]
30["categories.routes.ts"]
31["category-icons.ts"]
32["category-model.service.ts"]
33["category-model.store.ts"]
subgraph 34["components"]
subgraph 35["categories-overview"]
36["categories-overview.component.ts"]
end
subgraph 37["category-form"]
38["category-form.component.ts"]
end
39["index.ts"]
subgraph 3A["rule-filters"]
3B["rule-filters.component.ts"]
end
subgraph 3C["rule-form"]
3D["rule-form.component.ts"]
end
subgraph 3E["rule-share-bar"]
3F["rule-share-bar.component.ts"]
end
subgraph 3G["rules-overview"]
3H["rules-overview.component.ts"]
end
end
3I["index.ts"]
3J["rule-filters.ts"]
3K["rule-labels.ts"]
3L["rule-share.ts"]
3M["rule-summary.ts"]
3N["rules.store.ts"]
end
subgraph 3O["feature-dashboard"]
3P["category-comparison-settings.store.ts"]
subgraph 3Q["components"]
subgraph 3R["account-balance-strip"]
3S["account-balance-strip.component.ts"]
end
subgraph 3T["action-queue-panel"]
3U["action-queue-panel.component.ts"]
end
subgraph 3V["category-breakdown-panel"]
3W["category-breakdown-panel.component.ts"]
end
subgraph 3X["category-comparison-panel"]
3Y["category-comparison-panel.component.ts"]
end
subgraph 3Z["dashboard-customize-panel"]
40["dashboard-customize-panel.component.ts"]
end
subgraph 41["dashboard-overview"]
42["dashboard-overview.component.ts"]
end
43["index.ts"]
subgraph 44["net-worth-header"]
45["net-worth-header.component.ts"]
end
subgraph 46["top-transactions-panel"]
47["top-transactions-panel.component.ts"]
end
subgraph 48["trend-chart-panel"]
49["trend-chart-panel.component.ts"]
end
subgraph 4A["weekday-weekend-split-panel"]
4B["weekday-weekend-split-panel.component.ts"]
end
end
4C["dashboard-layout-settings.store.ts"]
4D["dashboard-row-order.ts"]
4E["dashboard.routes.ts"]
4F["index.ts"]
4G["stats.store.ts"]
end
subgraph 4H["feature-data-management"]
subgraph 4I["components"]
subgraph 4J["data-management-overview"]
4K["data-management-overview.component.ts"]
end
4L["index.ts"]
end
4M["data-management.routes.ts"]
4N["index.ts"]
end
subgraph 4O["feature-import"]
subgraph 4P["components"]
subgraph 4Q["import-map-step"]
4R["import-map-step.component.ts"]
end
subgraph 4S["import-preview-step"]
4T["import-preview-step.component.ts"]
end
subgraph 4U["import-select-step"]
4V["import-select-step.component.ts"]
end
subgraph 4W["import-summary-step"]
4X["import-summary-step.component.ts"]
end
subgraph 4Y["import-wizard"]
4Z["import-wizard.component.ts"]
end
50["index.ts"]
end
51["import-batches.store.ts"]
52["import.routes.ts"]
53["index.ts"]
54["mapping-profiles.store.ts"]
end
subgraph 55["feature-learning"]
subgraph 56["components"]
57["index.ts"]
subgraph 58["learning-overview"]
59["learning-overview.component.ts"]
end
subgraph 5A["model-status"]
5B["model-status.component.ts"]
end
subgraph 5C["rule-proposals"]
5D["rule-proposals.component.ts"]
end
subgraph 5E["suggestions-table"]
5F["suggestions-table.component.ts"]
end
end
5G["index.ts"]
5H["learning.routes.ts"]
end
subgraph 5I["feature-transactions"]
subgraph 5J["components"]
subgraph 5K["attribution-override-fieldset"]
5L["attribution-override-fieldset.component.ts"]
end
5M["index.ts"]
subgraph 5N["transaction-bulk-bar"]
5O["transaction-bulk-bar.component.ts"]
end
subgraph 5P["transaction-edit-form"]
5Q["transaction-edit-form.component.ts"]
end
subgraph 5R["transaction-filters"]
5S["transaction-filters.component.ts"]
end
subgraph 5T["transactions-overview"]
5U["transactions-overview.component.ts"]
end
subgraph 5V["transfer-review"]
5W["transfer-review.component.ts"]
end
end
5X["index.ts"]
5Y["transaction-filters.ts"]
5Z["transactions.routes.ts"]
end
subgraph 60["shared"]
subgraph 61["echarts"]
62["echarts-setup.ts"]
63["index.ts"]
64["tooltip-formatter.ts"]
end
subgraph 65["ui"]
subgraph 66["alert"]
67["alert.component.ts"]
end
subgraph 68["badge"]
69["badge.component.ts"]
end
subgraph 6A["bento-grid"]
6B["bento-grid.component.ts"]
6C["bento-item.component.ts"]
end
subgraph 6D["button"]
6E["button.component.ts"]
end
subgraph 6F["confirm-dialog"]
6G["confirm-dialog.component.ts"]
end
subgraph 6H["date-range-input"]
6I["date-range-input.component.ts"]
end
subgraph 6J["empty-state"]
6K["empty-state.component.ts"]
end
subgraph 6L["granularity-picker"]
6M["granularity-picker.component.ts"]
end
6N["index.ts"]
subgraph 6O["input"]
6P["input.component.ts"]
end
subgraph 6Q["loading-skeleton"]
6R["loading-skeleton.component.ts"]
end
subgraph 6S["modal"]
6T["mm-modal.component.ts"]
end
subgraph 6U["page-header"]
6V["page-header.component.ts"]
end
subgraph 6W["paginator"]
6X["paginator.component.ts"]
end
subgraph 6Y["paper"]
6Z["paper.component.ts"]
end
subgraph 70["range-grouping-switcher"]
71["range-grouping-switcher.component.ts"]
end
subgraph 72["select"]
73["select.component.ts"]
end
subgraph 74["stat-card"]
75["stat-card.component.ts"]
end
subgraph 76["typography"]
77["typography.component.ts"]
end
end
subgraph 78["utils"]
79["confidence-color.ts"]
7A["confirm-state.ts"]
7B["currency-format.ts"]
7C["daisy-classes.ts"]
7D["debounced-text.ts"]
7E["download-json.ts"]
7F["fingerprint.ts"]
7G["iban.ts"]
7H["index.ts"]
7I["pagination.ts"]
7J["percentage.ts"]
7K["search-params.ts"]
7L["selection-model.ts"]
7M["signed-amount.pipe.ts"]
7N["sortable.ts"]
7O["structural-filters.ts"]
subgraph 7P["validators"]
7Q["iban.validator.ts"]
7R["percentage.validator.ts"]
end
7S["with-archivable.ts"]
7T["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2D
5-->4
5-->6
6-->M
6-->7H
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
F-->7F
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
T-->7H
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
10-->2D
10-->7H
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
1B-->1T
1B-->2D
1B-->7H
1C-->1E
1C-->M
1C-->7H
1D-->1B
1D-->1C
1D-->1E
1D-->1F
1D-->1G
1E-->M
1E-->29
1E-->2D
1F-->M
1G-->1E
1G-->1F
1G-->M
1G-->2D
1I-->1P
1I-->1Q
1I-->1W
1I-->M
1J-->1O
1J-->M
1K-->1J
1K-->1Q
1K-->M
1L-->M
1M-->1J
1M-->1Y
1M-->M
1N-->1Q
1O-->1L
1O-->1P
1O-->M
1O-->2D
1P-->5
1P-->M
1R-->M
1S-->1Q
1T-->1I
1T-->1J
1T-->1K
1T-->1L
1T-->1M
1T-->1N
1T-->1O
1T-->1P
1T-->1Q
1T-->1R
1T-->1S
1T-->1U
1T-->1V
1T-->1W
1T-->1X
1T-->1Y
1T-->1Z
1T-->20
1T-->21
1T-->22
1T-->23
1U-->1P
1U-->M
1V-->1P
1V-->5
1V-->M
1W-->1P
1W-->1Q
1W-->M
1X-->1O
1X-->M
1Y-->1Q
1Z-->1Q
20-->1Q
20-->1X
20-->M
21-->M
21-->2D
22-->1O
22-->1Q
22-->M
23-->1X
23-->M
25-->26
28-->M
29-->28
29-->2A
29-->2B
2A-->M
2B-->M
2B-->2D
2D-->2E
2D-->2F
2D-->2H
2D-->2G
2E-->M
2F-->2H
2F-->M
2G-->2F
2G-->2H
2G-->M
2H-->6
2H-->M
2H-->7H
2J-->M
2K-->2S
2K-->2U
2K-->63
2L-->M
2L-->1D
2L-->1T
2O-->2L
2O-->M
2O-->1T
2O-->63
2O-->6N
2O-->7H
2Q-->2J
2Q-->M
2Q-->6N
2Q-->7H
2Q-->7Q
2Q-->7R
2S-->2O
2S-->2Q
2S-->1D
2S-->6N
2S-->7H
2U-->2J
2U-->2Q
2U-->2X
2U-->M
2U-->1D
2U-->6N
2U-->7H
2V-->2O
2V-->2Q
2V-->2S
2V-->2U
2V-->2X
2X-->2L
2X-->M
2X-->1D
2X-->1T
2X-->63
2X-->6N
2Y-->2K
2Y-->2V
30-->36
30-->3H
32-->16
33-->32
33-->3N
33-->M
33-->16
33-->1D
36-->31
36-->38
36-->M
36-->1D
36-->6N
36-->7H
38-->31
38-->M
38-->6N
39-->36
39-->38
39-->3B
39-->3D
39-->3F
39-->3H
3B-->3J
3B-->1D
3B-->6N
3B-->7H
3D-->3K
3D-->A
3D-->M
3D-->1D
3D-->6N
3F-->3L
3F-->3N
3F-->6N
3F-->7H
3H-->3J
3H-->3M
3H-->3N
3H-->3B
3H-->3D
3H-->3F
3H-->M
3H-->1D
3H-->6N
3H-->7H
3I-->30
3I-->31
3I-->32
3I-->33
3I-->39
3I-->3J
3I-->3M
3I-->3N
3J-->3M
3J-->M
3K-->M
3L-->M
3M-->3K
3M-->M
3N-->3L
3N-->A
3N-->M
3N-->1D
3N-->7H
3P-->M
3S-->1D
3S-->6N
3S-->7H
3U-->1D
3U-->2D
3U-->6N
3U-->7H
3W-->4G
3W-->1D
3W-->1T
3W-->6N
3W-->7H
3Y-->3P
3Y-->4G
3Y-->1D
3Y-->1T
3Y-->6N
3Y-->7H
40-->4C
40-->4D
40-->M
40-->6N
42-->4C
42-->4D
42-->4G
42-->3S
42-->3U
42-->3W
42-->3Y
42-->40
42-->45
42-->47
42-->49
42-->4B
42-->1D
42-->1T
42-->6N
42-->7H
43-->3S
43-->3U
43-->3W
43-->3Y
43-->40
43-->42
43-->45
43-->47
43-->49
43-->4B
45-->1D
45-->6N
45-->7H
47-->4G
47-->1D
47-->1T
47-->6N
47-->7H
49-->1D
49-->1T
49-->2D
49-->63
49-->6N
49-->7H
4B-->4G
4B-->1T
4B-->6N
4B-->7H
4C-->4D
4C-->M
4D-->M
4E-->42
4E-->63
4F-->43
4F-->4E
4G-->3P
4G-->1D
4G-->1T
4G-->2D
4K-->M
4K-->25
4K-->6N
4K-->7H
4L-->4K
4M-->4K
4N-->4L
4N-->4M
4R-->54
4R-->M
4R-->11
4R-->6N
4T-->11
4T-->6N
4T-->7H
4V-->54
4V-->M
4V-->11
4V-->6N
4X-->M
4X-->6N
4Z-->51
4Z-->54
4Z-->4R
4Z-->4T
4Z-->4V
4Z-->4X
4Z-->M
4Z-->11
4Z-->1D
4Z-->6N
50-->4R
50-->4T
50-->4V
50-->4X
50-->4Z
51-->A
51-->M
51-->11
51-->1D
52-->4Z
53-->50
53-->51
53-->52
53-->54
54-->M
57-->59
57-->5B
57-->5D
57-->5F
59-->5B
59-->5D
59-->5F
59-->6N
5B-->16
5B-->1D
5B-->3I
5B-->6N
5D-->M
5D-->16
5D-->1D
5D-->3I
5D-->6N
5D-->7H
5F-->M
5F-->1D
5F-->3I
5F-->6N
5F-->7H
5G-->57
5G-->5H
5H-->59
5L-->M
5L-->1D
5L-->29
5L-->6N
5L-->7H
5M-->5O
5M-->5Q
5M-->5S
5M-->5U
5M-->5W
5O-->1D
5O-->6N
5Q-->5L
5Q-->M
5Q-->1D
5Q-->29
5Q-->3I
5Q-->6N
5S-->5Y
5S-->1D
5S-->6N
5S-->7H
5U-->5Y
5U-->5O
5U-->5Q
5U-->5S
5U-->5W
5U-->M
5U-->1D
5U-->2D
5U-->6N
5U-->7H
5W-->1D
5W-->2D
5W-->6N
5W-->7H
5X-->5Z
5Y-->M
5Y-->2D
5Z-->5U
63-->62
63-->64
64-->7H
67-->7H
69-->7H
6B-->7H
6C-->7H
6E-->7H
6G-->6E
6G-->6T
6G-->77
6I-->1Q
6I-->7H
6K-->77
6N-->67
6N-->69
6N-->6B
6N-->6C
6N-->6E
6N-->6G
6N-->6I
6N-->6K
6N-->6M
6N-->6P
6N-->6R
6N-->6T
6N-->6V
6N-->6X
6N-->6Z
6N-->71
6N-->73
6N-->75
6N-->77
6P-->7H
6T-->7H
6V-->77
6X-->6E
6X-->77
6X-->7H
6Z-->7H
71-->6E
71-->6I
73-->7H
75-->77
77-->7H
7H-->79
7H-->7A
7H-->7B
7H-->7C
7H-->7D
7H-->7E
7H-->7F
7H-->7G
7H-->7I
7H-->7J
7H-->7K
7H-->7L
7H-->7M
7H-->7N
7H-->7O
7H-->7S
7H-->7T
7M-->7B
```
