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
- 233 leaf nodes, 619 edges.
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
subgraph 54["feature-help"]
subgraph 55["components"]
subgraph 56["faq-page"]
57["faq-page.component.ts"]
end
subgraph 58["guide-detail"]
59["guide-detail.component.ts"]
end
subgraph 5A["guides-index"]
5B["guides-index.component.ts"]
end
5C["index.ts"]
end
subgraph 5D["data"]
5E["faq.ts"]
5F["guides.ts"]
end
5G["help.routes.ts"]
5H["index.ts"]
end
subgraph 5I["feature-home"]
subgraph 5J["components"]
subgraph 5K["home-landing"]
5L["home-landing.component.ts"]
end
5M["index.ts"]
end
5N["home.routes.ts"]
5O["index.ts"]
end
subgraph 5P["feature-import"]
subgraph 5Q["components"]
subgraph 5R["import-map-step"]
5S["import-map-step.component.ts"]
end
subgraph 5T["import-preview-step"]
5U["import-preview-step.component.ts"]
end
subgraph 5V["import-select-step"]
5W["import-select-step.component.ts"]
end
subgraph 5X["import-summary-step"]
5Y["import-summary-step.component.ts"]
end
subgraph 5Z["import-wizard"]
60["import-wizard.component.ts"]
end
61["index.ts"]
end
62["import-batches.store.ts"]
63["import.routes.ts"]
64["index.ts"]
65["mapping-profiles.store.ts"]
end
subgraph 66["feature-learning"]
subgraph 67["components"]
68["index.ts"]
subgraph 69["learning-overview"]
6A["learning-overview.component.ts"]
end
subgraph 6B["model-status"]
6C["model-status.component.ts"]
end
subgraph 6D["rule-proposals"]
6E["rule-proposals.component.ts"]
end
subgraph 6F["suggestions-table"]
6G["suggestions-table.component.ts"]
end
end
6H["index.ts"]
6I["learning.routes.ts"]
end
subgraph 6J["feature-settings"]
subgraph 6K["components"]
6L["index.ts"]
subgraph 6M["settings-overview"]
6N["settings-overview.component.ts"]
end
end
6O["index.ts"]
6P["settings.routes.ts"]
end
subgraph 6Q["feature-transactions"]
subgraph 6R["components"]
subgraph 6S["attribution-override-fieldset"]
6T["attribution-override-fieldset.component.ts"]
end
6U["index.ts"]
subgraph 6V["transaction-bulk-bar"]
6W["transaction-bulk-bar.component.ts"]
end
subgraph 6X["transaction-edit-form"]
6Y["transaction-edit-form.component.ts"]
end
subgraph 6Z["transaction-filters"]
70["transaction-filters.component.ts"]
end
subgraph 71["transactions-overview"]
72["transactions-overview.component.ts"]
end
subgraph 73["transfer-review"]
74["transfer-review.component.ts"]
end
end
75["index.ts"]
76["transaction-filters.ts"]
77["transactions.routes.ts"]
end
subgraph 78["shared"]
subgraph 79["echarts"]
7A["chart-theme.ts"]
7B["echarts-setup.ts"]
7C["index.ts"]
7D["tooltip-formatter.ts"]
end
subgraph 7E["ui"]
subgraph 7F["alert"]
7G["alert.component.ts"]
end
subgraph 7H["badge"]
7I["badge.component.ts"]
end
subgraph 7J["bento-grid"]
7K["bento-grid.component.ts"]
7L["bento-item.component.ts"]
end
subgraph 7M["button"]
7N["button.component.ts"]
end
subgraph 7O["collapse"]
7P["collapse.component.ts"]
end
subgraph 7Q["confirm-dialog"]
7R["confirm-dialog.component.ts"]
end
subgraph 7S["date-range-input"]
7T["date-range-input.component.ts"]
end
subgraph 7U["divider"]
7V["divider.component.ts"]
end
subgraph 7W["dropdown"]
7X["dropdown.component.ts"]
end
subgraph 7Y["empty-state"]
7Z["empty-state.component.ts"]
end
subgraph 80["fieldset"]
81["fieldset.component.ts"]
end
subgraph 82["flex"]
83["flex.component.ts"]
end
subgraph 84["granularity-picker"]
85["granularity-picker.component.ts"]
end
86["index.ts"]
subgraph 87["input"]
88["input.component.ts"]
end
subgraph 89["label"]
8A["label.component.ts"]
end
subgraph 8B["loading-skeleton"]
8C["loading-skeleton.component.ts"]
end
subgraph 8D["modal"]
8E["mm-modal.component.ts"]
end
subgraph 8F["page-header"]
8G["page-header.component.ts"]
end
subgraph 8H["paginator"]
8I["paginator.component.ts"]
end
subgraph 8J["paper"]
8K["paper.component.ts"]
end
subgraph 8L["range-grouping-switcher"]
8M["range-grouping-switcher.component.ts"]
end
subgraph 8N["select"]
8O["select.component.ts"]
end
subgraph 8P["stat-card"]
8Q["stat-card.component.ts"]
end
subgraph 8R["table"]
8S["table.component.ts"]
end
subgraph 8T["tabs"]
8U["tabs.component.ts"]
end
subgraph 8V["typography"]
8W["typography.component.ts"]
end
end
subgraph 8X["utils"]
8Y["confidence-color.ts"]
8Z["confirm-state.ts"]
90["currency-format.ts"]
91["daisy-classes.ts"]
92["date-buckets.ts"]
93["debounced-text.ts"]
94["download-json.ts"]
95["fingerprint.ts"]
96["iban.ts"]
97["index.ts"]
98["pagination.ts"]
99["percentage.ts"]
9A["search-params.ts"]
9B["selection-model.ts"]
9C["signed-amount.pipe.ts"]
9D["sortable.ts"]
9E["structural-filters.ts"]
9F["theme-hooks.ts"]
subgraph 9G["validators"]
9H["iban.validator.ts"]
9I["percentage.validator.ts"]
end
9J["with-archivable.ts"]
9K["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2T
5-->4
5-->6
6-->M
6-->97
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
F-->95
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
T-->97
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
10-->97
11-->T
11-->U
11-->V
11-->X
11-->Y
11-->Z
11-->10
14-->1P
14-->24
14-->7N
14-->8M
14-->8W
14-->97
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
1N-->97
1O-->1Q
1O-->M
1O-->97
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
1U-->97
1V-->20
1V-->M
1W-->1V
1W-->M
1W-->97
1X-->M
1Y-->1V
1Y-->2A
1Y-->M
1Z-->97
20-->1X
20-->21
20-->M
20-->2T
21-->5
21-->M
22-->M
23-->97
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
28-->97
29-->20
29-->M
2A-->97
2B-->97
2C-->97
2D-->M
2D-->2T
2E-->20
2E-->M
2E-->97
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
2X-->97
2Z-->M
30-->38
30-->3A
30-->7C
31-->M
31-->1P
31-->24
31-->97
34-->31
34-->M
34-->24
34-->7C
34-->86
34-->97
36-->2Z
36-->M
36-->86
36-->97
36-->9H
36-->9I
38-->34
38-->36
38-->1P
38-->86
38-->97
3A-->2Z
3A-->36
3A-->3D
3A-->M
3A-->1P
3A-->86
3A-->97
3B-->34
3B-->36
3B-->38
3B-->3A
3B-->3D
3D-->31
3D-->M
3D-->1P
3D-->24
3D-->7C
3D-->86
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
3M-->86
3M-->97
3O-->3H
3O-->M
3O-->86
3P-->3M
3P-->3O
3P-->3R
3P-->3T
3P-->3V
3P-->3X
3R-->3Z
3R-->1P
3R-->86
3R-->97
3T-->40
3T-->A
3T-->M
3T-->1P
3T-->86
3V-->41
3V-->43
3V-->86
3V-->97
3X-->3Z
3X-->42
3X-->43
3X-->3R
3X-->3T
3X-->3V
3X-->M
3X-->1P
3X-->86
3X-->97
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
43-->97
45-->M
48-->1P
48-->86
48-->97
4A-->1P
4A-->2T
4A-->86
4A-->97
4C-->4W
4C-->1P
4C-->24
4C-->7C
4C-->86
4C-->97
4E-->45
4E-->4W
4E-->1P
4E-->86
4E-->97
4G-->4S
4G-->4T
4G-->M
4G-->86
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
4I-->86
4I-->97
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
4L-->86
4L-->97
4N-->4W
4N-->1P
4N-->24
4N-->86
4N-->97
4P-->1P
4P-->24
4P-->2T
4P-->7C
4P-->86
4P-->97
4R-->4W
4R-->24
4R-->86
4R-->97
4S-->4T
4S-->M
4T-->M
4U-->4I
4U-->7C
4V-->4J
4V-->4U
4W-->45
4W-->1P
4W-->24
4W-->2T
50-->M
50-->2H
50-->86
50-->97
51-->50
52-->50
53-->51
53-->52
57-->5E
57-->86
59-->5F
59-->86
5B-->5F
5B-->86
5C-->57
5C-->59
5C-->5B
5G-->57
5G-->59
5G-->5B
5H-->5C
5H-->5G
5L-->18
5L-->86
5M-->5L
5N-->5L
5O-->5M
5O-->5N
5S-->65
5S-->M
5S-->11
5S-->86
5U-->11
5U-->86
5U-->97
5W-->65
5W-->M
5W-->11
5W-->86
5Y-->M
5Y-->86
60-->62
60-->65
60-->5S
60-->5U
60-->5W
60-->5Y
60-->M
60-->11
60-->1P
60-->86
61-->5S
61-->5U
61-->5W
61-->5Y
61-->60
62-->A
62-->M
62-->11
62-->1P
63-->60
64-->61
64-->62
64-->63
64-->65
65-->M
68-->6A
68-->6C
68-->6E
68-->6G
6A-->6C
6A-->6E
6A-->6G
6A-->86
6C-->1D
6C-->1P
6C-->3Y
6C-->86
6E-->M
6E-->1D
6E-->1P
6E-->3Y
6E-->86
6E-->97
6G-->M
6G-->1P
6G-->3Y
6G-->86
6G-->97
6H-->68
6H-->6I
6I-->6A
6L-->6N
6N-->18
6N-->2K
6N-->86
6O-->6L
6O-->6P
6P-->6N
6P-->53
6T-->M
6T-->1P
6T-->2P
6T-->86
6T-->97
6U-->6W
6U-->6Y
6U-->70
6U-->72
6U-->74
6W-->1P
6W-->86
6Y-->6T
6Y-->M
6Y-->1P
6Y-->2P
6Y-->3Y
6Y-->86
70-->76
70-->1P
70-->86
70-->97
72-->76
72-->6W
72-->6Y
72-->70
72-->74
72-->M
72-->1P
72-->2T
72-->86
72-->97
74-->1P
74-->2T
74-->86
74-->97
75-->77
76-->M
76-->2T
77-->72
7C-->7A
7C-->7B
7C-->7D
7D-->97
7G-->97
7I-->97
7K-->97
7L-->97
7N-->97
7P-->97
7R-->7N
7R-->8A
7R-->8E
7R-->8W
7T-->7X
7T-->97
7V-->97
7X-->97
7Z-->83
7Z-->8W
81-->97
83-->97
86-->7G
86-->7I
86-->7K
86-->7L
86-->7N
86-->7P
86-->7R
86-->7T
86-->7V
86-->7X
86-->7Z
86-->81
86-->83
86-->85
86-->88
86-->8A
86-->8C
86-->8E
86-->8G
86-->8I
86-->8K
86-->8M
86-->8O
86-->8Q
86-->8S
86-->8U
86-->8W
88-->97
8A-->97
8C-->83
8E-->97
8G-->83
8G-->8W
8I-->7N
8I-->83
8I-->8W
8I-->97
8K-->97
8M-->7N
8M-->7T
8M-->83
8O-->97
8Q-->8W
8Q-->97
8S-->97
8U-->97
8W-->97
97-->8Y
97-->8Z
97-->90
97-->91
97-->92
97-->93
97-->94
97-->95
97-->96
97-->98
97-->99
97-->9A
97-->9B
97-->9C
97-->9D
97-->9E
97-->9F
97-->9J
97-->9K
9C-->90
```
