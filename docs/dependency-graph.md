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
- 224 leaf nodes, 602 edges.
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
subgraph 44["feature-dashboard"]
45["category-comparison-settings.store.ts"]
subgraph 46["components"]
subgraph 47["account-balance-strip"]
48["account-balance-strip.component.ts"]
end
subgraph 49["action-queue-panel"]
4A["action-queue-panel.component.ts"]
end
subgraph 4B["category-breakdown-panel"]
4C["category-breakdown-panel.component.ts"]
end
subgraph 4D["category-comparison-panel"]
4E["category-comparison-panel.component.ts"]
end
subgraph 4F["dashboard-customize-panel"]
4G["dashboard-customize-panel.component.ts"]
end
subgraph 4H["dashboard-overview"]
4I["dashboard-overview.component.ts"]
end
4J["index.ts"]
subgraph 4K["net-worth-header"]
4L["net-worth-header.component.ts"]
end
subgraph 4M["top-transactions-panel"]
4N["top-transactions-panel.component.ts"]
end
subgraph 4O["trend-chart-panel"]
4P["trend-chart-panel.component.ts"]
end
subgraph 4Q["weekday-weekend-split-panel"]
4R["weekday-weekend-split-panel.component.ts"]
end
end
4S["dashboard-layout-settings.store.ts"]
4T["dashboard-row-order.ts"]
4U["dashboard.routes.ts"]
4V["index.ts"]
4W["stats.store.ts"]
end
subgraph 4X["feature-data-management"]
subgraph 4Y["components"]
subgraph 4Z["data-management-overview"]
50["data-management-overview.component.ts"]
end
51["index.ts"]
end
52["data-management.routes.ts"]
53["index.ts"]
end
subgraph 54["feature-home"]
subgraph 55["components"]
subgraph 56["home-landing"]
57["home-landing.component.ts"]
end
58["index.ts"]
end
59["home.routes.ts"]
5A["index.ts"]
end
subgraph 5B["feature-import"]
subgraph 5C["components"]
subgraph 5D["import-map-step"]
5E["import-map-step.component.ts"]
end
subgraph 5F["import-preview-step"]
5G["import-preview-step.component.ts"]
end
subgraph 5H["import-select-step"]
5I["import-select-step.component.ts"]
end
subgraph 5J["import-summary-step"]
5K["import-summary-step.component.ts"]
end
subgraph 5L["import-wizard"]
5M["import-wizard.component.ts"]
end
5N["index.ts"]
end
5O["import-batches.store.ts"]
5P["import.routes.ts"]
5Q["index.ts"]
5R["mapping-profiles.store.ts"]
end
subgraph 5S["feature-learning"]
subgraph 5T["components"]
5U["index.ts"]
subgraph 5V["learning-overview"]
5W["learning-overview.component.ts"]
end
subgraph 5X["model-status"]
5Y["model-status.component.ts"]
end
subgraph 5Z["rule-proposals"]
60["rule-proposals.component.ts"]
end
subgraph 61["suggestions-table"]
62["suggestions-table.component.ts"]
end
end
63["index.ts"]
64["learning.routes.ts"]
end
subgraph 65["feature-settings"]
subgraph 66["components"]
67["index.ts"]
subgraph 68["settings-overview"]
69["settings-overview.component.ts"]
end
end
6A["index.ts"]
6B["settings.routes.ts"]
end
subgraph 6C["feature-transactions"]
subgraph 6D["components"]
subgraph 6E["attribution-override-fieldset"]
6F["attribution-override-fieldset.component.ts"]
end
6G["index.ts"]
subgraph 6H["transaction-bulk-bar"]
6I["transaction-bulk-bar.component.ts"]
end
subgraph 6J["transaction-edit-form"]
6K["transaction-edit-form.component.ts"]
end
subgraph 6L["transaction-filters"]
6M["transaction-filters.component.ts"]
end
subgraph 6N["transactions-overview"]
6O["transactions-overview.component.ts"]
end
subgraph 6P["transfer-review"]
6Q["transfer-review.component.ts"]
end
end
6R["index.ts"]
6S["transaction-filters.ts"]
6T["transactions.routes.ts"]
end
subgraph 6U["shared"]
subgraph 6V["echarts"]
6W["chart-theme.ts"]
6X["echarts-setup.ts"]
6Y["index.ts"]
6Z["tooltip-formatter.ts"]
end
subgraph 70["ui"]
subgraph 71["alert"]
72["alert.component.ts"]
end
subgraph 73["badge"]
74["badge.component.ts"]
end
subgraph 75["bento-grid"]
76["bento-grid.component.ts"]
77["bento-item.component.ts"]
end
subgraph 78["button"]
79["button.component.ts"]
end
subgraph 7A["confirm-dialog"]
7B["confirm-dialog.component.ts"]
end
subgraph 7C["date-range-input"]
7D["date-range-input.component.ts"]
end
subgraph 7E["divider"]
7F["divider.component.ts"]
end
subgraph 7G["dropdown"]
7H["dropdown.component.ts"]
end
subgraph 7I["empty-state"]
7J["empty-state.component.ts"]
end
subgraph 7K["fieldset"]
7L["fieldset.component.ts"]
end
subgraph 7M["flex"]
7N["flex.component.ts"]
end
subgraph 7O["granularity-picker"]
7P["granularity-picker.component.ts"]
end
7Q["index.ts"]
subgraph 7R["input"]
7S["input.component.ts"]
end
subgraph 7T["label"]
7U["label.component.ts"]
end
subgraph 7V["loading-skeleton"]
7W["loading-skeleton.component.ts"]
end
subgraph 7X["modal"]
7Y["mm-modal.component.ts"]
end
subgraph 7Z["page-header"]
80["page-header.component.ts"]
end
subgraph 81["paginator"]
82["paginator.component.ts"]
end
subgraph 83["paper"]
84["paper.component.ts"]
end
subgraph 85["range-grouping-switcher"]
86["range-grouping-switcher.component.ts"]
end
subgraph 87["select"]
88["select.component.ts"]
end
subgraph 89["stat-card"]
8A["stat-card.component.ts"]
end
subgraph 8B["table"]
8C["table.component.ts"]
end
subgraph 8D["tabs"]
8E["tabs.component.ts"]
end
subgraph 8F["typography"]
8G["typography.component.ts"]
end
end
subgraph 8H["utils"]
8I["confidence-color.ts"]
8J["confirm-state.ts"]
8K["currency-format.ts"]
8L["daisy-classes.ts"]
8M["date-buckets.ts"]
8N["debounced-text.ts"]
8O["download-json.ts"]
8P["fingerprint.ts"]
8Q["iban.ts"]
8R["index.ts"]
8S["pagination.ts"]
8T["percentage.ts"]
8U["search-params.ts"]
8V["selection-model.ts"]
8W["signed-amount.pipe.ts"]
8X["sortable.ts"]
8Y["structural-filters.ts"]
8Z["theme-hooks.ts"]
subgraph 90["validators"]
91["iban.validator.ts"]
92["percentage.validator.ts"]
end
93["with-archivable.ts"]
94["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2T
5-->4
5-->6
6-->M
6-->8R
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
F-->8P
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
T-->8R
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
10-->8R
11-->T
11-->U
11-->V
11-->X
11-->Y
11-->Z
11-->10
14-->1P
14-->24
14-->79
14-->86
14-->8G
14-->8R
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
1N-->8R
1O-->1Q
1O-->M
1O-->8R
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
1U-->8R
1V-->20
1V-->M
1W-->1V
1W-->M
1W-->8R
1X-->M
1Y-->1V
1Y-->2A
1Y-->M
1Z-->8R
20-->1X
20-->21
20-->M
20-->2T
21-->5
21-->M
22-->M
23-->8R
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
28-->8R
29-->20
29-->M
2A-->8R
2B-->8R
2C-->8R
2D-->M
2D-->2T
2E-->20
2E-->M
2E-->8R
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
2X-->8R
2Z-->M
30-->38
30-->3A
30-->6Y
31-->M
31-->1P
31-->24
31-->8R
34-->31
34-->M
34-->24
34-->6Y
34-->7Q
34-->8R
36-->2Z
36-->M
36-->7Q
36-->8R
36-->91
36-->92
38-->34
38-->36
38-->1P
38-->7Q
38-->8R
3A-->2Z
3A-->36
3A-->3D
3A-->M
3A-->1P
3A-->7Q
3A-->8R
3B-->34
3B-->36
3B-->38
3B-->3A
3B-->3D
3D-->31
3D-->M
3D-->1P
3D-->24
3D-->6Y
3D-->7Q
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
3M-->7Q
3M-->8R
3O-->3H
3O-->M
3O-->7Q
3P-->3M
3P-->3O
3P-->3R
3P-->3T
3P-->3V
3P-->3X
3R-->3Z
3R-->1P
3R-->7Q
3R-->8R
3T-->40
3T-->A
3T-->M
3T-->1P
3T-->7Q
3V-->41
3V-->43
3V-->7Q
3V-->8R
3X-->3Z
3X-->42
3X-->43
3X-->3R
3X-->3T
3X-->3V
3X-->M
3X-->1P
3X-->7Q
3X-->8R
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
43-->8R
45-->M
48-->1P
48-->7Q
48-->8R
4A-->1P
4A-->2T
4A-->7Q
4A-->8R
4C-->4W
4C-->1P
4C-->24
4C-->6Y
4C-->7Q
4C-->8R
4E-->45
4E-->4W
4E-->1P
4E-->7Q
4E-->8R
4G-->4S
4G-->4T
4G-->M
4G-->7Q
4I-->4S
4I-->4T
4I-->4W
4I-->48
4I-->4A
4I-->4C
4I-->4E
4I-->4G
4I-->4L
4I-->4N
4I-->4P
4I-->4R
4I-->1P
4I-->24
4I-->7Q
4I-->8R
4J-->48
4J-->4A
4J-->4C
4J-->4E
4J-->4G
4J-->4I
4J-->4L
4J-->4N
4J-->4P
4J-->4R
4L-->1P
4L-->7Q
4L-->8R
4N-->4W
4N-->1P
4N-->24
4N-->7Q
4N-->8R
4P-->1P
4P-->24
4P-->2T
4P-->6Y
4P-->7Q
4P-->8R
4R-->4W
4R-->24
4R-->7Q
4R-->8R
4S-->4T
4S-->M
4T-->M
4U-->4I
4U-->6Y
4V-->4J
4V-->4U
4W-->45
4W-->1P
4W-->24
4W-->2T
50-->M
50-->2H
50-->7Q
50-->8R
51-->50
52-->50
53-->51
53-->52
57-->18
57-->7Q
58-->57
59-->57
5A-->58
5A-->59
5E-->5R
5E-->M
5E-->11
5E-->7Q
5G-->11
5G-->7Q
5G-->8R
5I-->5R
5I-->M
5I-->11
5I-->7Q
5K-->M
5K-->7Q
5M-->5O
5M-->5R
5M-->5E
5M-->5G
5M-->5I
5M-->5K
5M-->M
5M-->11
5M-->1P
5M-->7Q
5N-->5E
5N-->5G
5N-->5I
5N-->5K
5N-->5M
5O-->A
5O-->M
5O-->11
5O-->1P
5P-->5M
5Q-->5N
5Q-->5O
5Q-->5P
5Q-->5R
5R-->M
5U-->5W
5U-->5Y
5U-->60
5U-->62
5W-->5Y
5W-->60
5W-->62
5W-->7Q
5Y-->1D
5Y-->1P
5Y-->3Y
5Y-->7Q
60-->M
60-->1D
60-->1P
60-->3Y
60-->7Q
60-->8R
62-->M
62-->1P
62-->3Y
62-->7Q
62-->8R
63-->5U
63-->64
64-->5W
67-->69
69-->18
69-->2K
69-->7Q
6A-->67
6A-->6B
6B-->69
6F-->M
6F-->1P
6F-->2P
6F-->7Q
6F-->8R
6G-->6I
6G-->6K
6G-->6M
6G-->6O
6G-->6Q
6I-->1P
6I-->7Q
6K-->6F
6K-->M
6K-->1P
6K-->2P
6K-->3Y
6K-->7Q
6M-->6S
6M-->1P
6M-->7Q
6M-->8R
6O-->6S
6O-->6I
6O-->6K
6O-->6M
6O-->6Q
6O-->M
6O-->1P
6O-->2T
6O-->7Q
6O-->8R
6Q-->1P
6Q-->2T
6Q-->7Q
6Q-->8R
6R-->6T
6S-->M
6S-->2T
6T-->6O
6Y-->6W
6Y-->6X
6Y-->6Z
6Z-->8R
72-->8R
74-->8R
76-->8R
77-->8R
79-->8R
7B-->79
7B-->7U
7B-->7Y
7B-->8G
7D-->7H
7D-->8R
7F-->8R
7H-->8R
7J-->7N
7J-->8G
7L-->8R
7N-->8R
7Q-->72
7Q-->74
7Q-->76
7Q-->77
7Q-->79
7Q-->7B
7Q-->7D
7Q-->7F
7Q-->7H
7Q-->7J
7Q-->7L
7Q-->7N
7Q-->7P
7Q-->7S
7Q-->7U
7Q-->7W
7Q-->7Y
7Q-->80
7Q-->82
7Q-->84
7Q-->86
7Q-->88
7Q-->8A
7Q-->8C
7Q-->8E
7Q-->8G
7S-->8R
7U-->8R
7W-->7N
7Y-->8R
80-->7N
80-->8G
82-->79
82-->7N
82-->8G
82-->8R
84-->8R
86-->79
86-->7D
86-->7N
88-->8R
8A-->8G
8A-->8R
8C-->8R
8E-->8R
8G-->8R
8R-->8I
8R-->8J
8R-->8K
8R-->8L
8R-->8M
8R-->8N
8R-->8O
8R-->8P
8R-->8Q
8R-->8S
8R-->8T
8R-->8U
8R-->8V
8R-->8W
8R-->8X
8R-->8Y
8R-->8Z
8R-->93
8R-->94
8W-->8K
```
