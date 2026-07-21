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
- 212 leaf nodes, 582 edges.
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
1V["net-margin.ts"]
1W["net-worth-trend.ts"]
1X["period-stats.ts"]
1Y["period-window.ts"]
1Z["periodized-rate.ts"]
20["range-state.store.ts"]
21["top-transactions.ts"]
22["weekday-weekend-split.ts"]
23["year-over-year.ts"]
end
subgraph 24["storage"]
25["index.ts"]
26["storage-status.service.ts"]
end
subgraph 27["theme"]
28["index.ts"]
29["theme-styles.ts"]
2A["theme.service.ts"]
end
subgraph 2B["transactions"]
2C["attribution-override.ts"]
2D["index.ts"]
2E["nullify-transaction.ts"]
2F["transaction-deletion.service.ts"]
end
subgraph 2G["transfers"]
2H["index.ts"]
2I["transfer-cleanup.service.ts"]
2J["transfer-linking.service.ts"]
2K["transfer-matching.service.ts"]
2L["transfer-matching.ts"]
end
end
subgraph 2M["feature-accounts"]
2N["account-icons.ts"]
2O["accounts.routes.ts"]
2P["balance-trend-signals.ts"]
subgraph 2Q["components"]
subgraph 2R["account-balance-chart"]
2S["account-balance-chart.component.ts"]
end
subgraph 2T["account-form"]
2U["account-form.component.ts"]
end
subgraph 2V["accounts-detail"]
2W["accounts-detail.component.ts"]
end
subgraph 2X["accounts-overview"]
2Y["accounts-overview.component.ts"]
end
2Z["index.ts"]
subgraph 30["net-worth-history-chart"]
31["net-worth-history-chart.component.ts"]
end
end
32["index.ts"]
end
subgraph 33["feature-categories"]
34["categories.routes.ts"]
35["category-icons.ts"]
36["category-model.service.ts"]
37["category-model.store.ts"]
subgraph 38["components"]
subgraph 39["categories-overview"]
3A["categories-overview.component.ts"]
end
subgraph 3B["category-form"]
3C["category-form.component.ts"]
end
3D["index.ts"]
subgraph 3E["rule-filters"]
3F["rule-filters.component.ts"]
end
subgraph 3G["rule-form"]
3H["rule-form.component.ts"]
end
subgraph 3I["rule-share-bar"]
3J["rule-share-bar.component.ts"]
end
subgraph 3K["rules-overview"]
3L["rules-overview.component.ts"]
end
end
3M["index.ts"]
3N["rule-filters.ts"]
3O["rule-labels.ts"]
3P["rule-share.ts"]
3Q["rule-summary.ts"]
3R["rules.store.ts"]
end
subgraph 3S["feature-dashboard"]
3T["category-comparison-settings.store.ts"]
subgraph 3U["components"]
subgraph 3V["account-balance-strip"]
3W["account-balance-strip.component.ts"]
end
subgraph 3X["action-queue-panel"]
3Y["action-queue-panel.component.ts"]
end
subgraph 3Z["category-breakdown-panel"]
40["category-breakdown-panel.component.ts"]
end
subgraph 41["category-comparison-panel"]
42["category-comparison-panel.component.ts"]
end
subgraph 43["dashboard-customize-panel"]
44["dashboard-customize-panel.component.ts"]
end
subgraph 45["dashboard-overview"]
46["dashboard-overview.component.ts"]
end
47["index.ts"]
subgraph 48["net-worth-header"]
49["net-worth-header.component.ts"]
end
subgraph 4A["top-transactions-panel"]
4B["top-transactions-panel.component.ts"]
end
subgraph 4C["trend-chart-panel"]
4D["trend-chart-panel.component.ts"]
end
subgraph 4E["weekday-weekend-split-panel"]
4F["weekday-weekend-split-panel.component.ts"]
end
end
4G["dashboard-layout-settings.store.ts"]
4H["dashboard-row-order.ts"]
4I["dashboard.routes.ts"]
4J["index.ts"]
4K["stats.store.ts"]
end
subgraph 4L["feature-data-management"]
subgraph 4M["components"]
subgraph 4N["data-management-overview"]
4O["data-management-overview.component.ts"]
end
4P["index.ts"]
end
4Q["data-management.routes.ts"]
4R["index.ts"]
end
subgraph 4S["feature-import"]
subgraph 4T["components"]
subgraph 4U["import-map-step"]
4V["import-map-step.component.ts"]
end
subgraph 4W["import-preview-step"]
4X["import-preview-step.component.ts"]
end
subgraph 4Y["import-select-step"]
4Z["import-select-step.component.ts"]
end
subgraph 50["import-summary-step"]
51["import-summary-step.component.ts"]
end
subgraph 52["import-wizard"]
53["import-wizard.component.ts"]
end
54["index.ts"]
end
55["import-batches.store.ts"]
56["import.routes.ts"]
57["index.ts"]
58["mapping-profiles.store.ts"]
end
subgraph 59["feature-learning"]
subgraph 5A["components"]
5B["index.ts"]
subgraph 5C["learning-overview"]
5D["learning-overview.component.ts"]
end
subgraph 5E["model-status"]
5F["model-status.component.ts"]
end
subgraph 5G["rule-proposals"]
5H["rule-proposals.component.ts"]
end
subgraph 5I["suggestions-table"]
5J["suggestions-table.component.ts"]
end
end
5K["index.ts"]
5L["learning.routes.ts"]
end
subgraph 5M["feature-settings"]
subgraph 5N["components"]
5O["index.ts"]
subgraph 5P["settings-overview"]
5Q["settings-overview.component.ts"]
end
end
5R["index.ts"]
5S["settings.routes.ts"]
end
subgraph 5T["feature-transactions"]
subgraph 5U["components"]
subgraph 5V["attribution-override-fieldset"]
5W["attribution-override-fieldset.component.ts"]
end
5X["index.ts"]
subgraph 5Y["transaction-bulk-bar"]
5Z["transaction-bulk-bar.component.ts"]
end
subgraph 60["transaction-edit-form"]
61["transaction-edit-form.component.ts"]
end
subgraph 62["transaction-filters"]
63["transaction-filters.component.ts"]
end
subgraph 64["transactions-overview"]
65["transactions-overview.component.ts"]
end
subgraph 66["transfer-review"]
67["transfer-review.component.ts"]
end
end
68["index.ts"]
69["transaction-filters.ts"]
6A["transactions.routes.ts"]
end
subgraph 6B["shared"]
subgraph 6C["echarts"]
6D["chart-theme.ts"]
6E["echarts-setup.ts"]
6F["index.ts"]
6G["tooltip-formatter.ts"]
end
subgraph 6H["ui"]
subgraph 6I["alert"]
6J["alert.component.ts"]
end
subgraph 6K["badge"]
6L["badge.component.ts"]
end
subgraph 6M["bento-grid"]
6N["bento-grid.component.ts"]
6O["bento-item.component.ts"]
end
subgraph 6P["button"]
6Q["button.component.ts"]
end
subgraph 6R["confirm-dialog"]
6S["confirm-dialog.component.ts"]
end
subgraph 6T["date-range-input"]
6U["date-range-input.component.ts"]
end
subgraph 6V["divider"]
6W["divider.component.ts"]
end
subgraph 6X["dropdown"]
6Y["dropdown.component.ts"]
end
subgraph 6Z["empty-state"]
70["empty-state.component.ts"]
end
subgraph 71["fieldset"]
72["fieldset.component.ts"]
end
subgraph 73["flex"]
74["flex.component.ts"]
end
subgraph 75["granularity-picker"]
76["granularity-picker.component.ts"]
end
77["index.ts"]
subgraph 78["input"]
79["input.component.ts"]
end
subgraph 7A["label"]
7B["label.component.ts"]
end
subgraph 7C["loading-skeleton"]
7D["loading-skeleton.component.ts"]
end
subgraph 7E["modal"]
7F["mm-modal.component.ts"]
end
subgraph 7G["page-header"]
7H["page-header.component.ts"]
end
subgraph 7I["paginator"]
7J["paginator.component.ts"]
end
subgraph 7K["paper"]
7L["paper.component.ts"]
end
subgraph 7M["range-grouping-switcher"]
7N["range-grouping-switcher.component.ts"]
end
subgraph 7O["select"]
7P["select.component.ts"]
end
subgraph 7Q["stat-card"]
7R["stat-card.component.ts"]
end
subgraph 7S["table"]
7T["table.component.ts"]
end
subgraph 7U["tabs"]
7V["tabs.component.ts"]
end
subgraph 7W["typography"]
7X["typography.component.ts"]
end
end
subgraph 7Y["utils"]
7Z["confidence-color.ts"]
80["confirm-state.ts"]
81["currency-format.ts"]
82["daisy-classes.ts"]
83["date-buckets.ts"]
84["debounced-text.ts"]
85["download-json.ts"]
86["fingerprint.ts"]
87["iban.ts"]
88["index.ts"]
89["pagination.ts"]
8A["percentage.ts"]
8B["search-params.ts"]
8C["selection-model.ts"]
8D["signed-amount.pipe.ts"]
8E["sortable.ts"]
8F["structural-filters.ts"]
8G["theme-hooks.ts"]
subgraph 8H["validators"]
8I["iban.validator.ts"]
8J["percentage.validator.ts"]
end
8K["with-archivable.ts"]
8L["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2H
5-->4
5-->6
6-->M
6-->88
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
F-->86
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
T-->88
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
10-->2H
10-->88
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
1B-->2H
1B-->88
1C-->1E
1C-->M
1C-->88
1D-->1B
1D-->1C
1D-->1E
1D-->1F
1D-->1G
1E-->M
1E-->2D
1E-->2H
1F-->M
1G-->1E
1G-->1F
1G-->M
1G-->2H
1I-->1P
1I-->1W
1I-->M
1I-->88
1J-->1O
1J-->M
1K-->1J
1K-->M
1K-->88
1L-->M
1M-->1J
1M-->1Y
1M-->M
1N-->88
1O-->1L
1O-->1P
1O-->M
1O-->2H
1P-->5
1P-->M
1Q-->M
1R-->88
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
1S-->23
1T-->1P
1T-->M
1U-->1P
1U-->5
1U-->M
1W-->1P
1W-->M
1W-->88
1X-->1O
1X-->M
1Y-->88
1Z-->88
20-->88
21-->M
21-->2H
22-->1O
22-->M
22-->88
23-->1X
23-->M
25-->26
28-->29
28-->2A
2A-->29
2C-->M
2D-->2C
2D-->2E
2D-->2F
2E-->M
2F-->M
2F-->2H
2H-->2I
2H-->2J
2H-->2L
2H-->2K
2I-->M
2J-->2L
2J-->M
2K-->2J
2K-->2L
2K-->M
2L-->6
2L-->M
2L-->88
2N-->M
2O-->2W
2O-->2Y
2O-->6F
2P-->M
2P-->1D
2P-->1S
2P-->88
2S-->2P
2S-->M
2S-->1S
2S-->6F
2S-->77
2S-->88
2U-->2N
2U-->M
2U-->77
2U-->88
2U-->8I
2U-->8J
2W-->2S
2W-->2U
2W-->1D
2W-->77
2W-->88
2Y-->2N
2Y-->2U
2Y-->31
2Y-->M
2Y-->1D
2Y-->77
2Y-->88
2Z-->2S
2Z-->2U
2Z-->2W
2Z-->2Y
2Z-->31
31-->2P
31-->M
31-->1D
31-->1S
31-->6F
31-->77
32-->2O
32-->2Z
34-->3A
34-->3L
36-->16
37-->36
37-->3R
37-->M
37-->16
37-->1D
3A-->35
3A-->3C
3A-->M
3A-->1D
3A-->77
3A-->88
3C-->35
3C-->M
3C-->77
3D-->3A
3D-->3C
3D-->3F
3D-->3H
3D-->3J
3D-->3L
3F-->3N
3F-->1D
3F-->77
3F-->88
3H-->3O
3H-->A
3H-->M
3H-->1D
3H-->77
3J-->3P
3J-->3R
3J-->77
3J-->88
3L-->3N
3L-->3Q
3L-->3R
3L-->3F
3L-->3H
3L-->3J
3L-->M
3L-->1D
3L-->77
3L-->88
3M-->34
3M-->35
3M-->36
3M-->37
3M-->3D
3M-->3N
3M-->3Q
3M-->3R
3N-->3Q
3N-->M
3O-->M
3P-->M
3Q-->3O
3Q-->M
3R-->3P
3R-->A
3R-->M
3R-->1D
3R-->88
3T-->M
3W-->1D
3W-->77
3W-->88
3Y-->1D
3Y-->2H
3Y-->77
3Y-->88
40-->4K
40-->1D
40-->1S
40-->6F
40-->77
40-->88
42-->3T
42-->4K
42-->1D
42-->77
42-->88
44-->4G
44-->4H
44-->M
44-->77
46-->4G
46-->4H
46-->4K
46-->3W
46-->3Y
46-->40
46-->42
46-->44
46-->49
46-->4B
46-->4D
46-->4F
46-->1D
46-->1S
46-->77
46-->88
47-->3W
47-->3Y
47-->40
47-->42
47-->44
47-->46
47-->49
47-->4B
47-->4D
47-->4F
49-->1D
49-->77
49-->88
4B-->4K
4B-->1D
4B-->1S
4B-->77
4B-->88
4D-->1D
4D-->1S
4D-->2H
4D-->6F
4D-->77
4D-->88
4F-->4K
4F-->1S
4F-->77
4F-->88
4G-->4H
4G-->M
4H-->M
4I-->46
4I-->6F
4J-->47
4J-->4I
4K-->3T
4K-->1D
4K-->1S
4K-->2H
4O-->M
4O-->25
4O-->77
4O-->88
4P-->4O
4Q-->4O
4R-->4P
4R-->4Q
4V-->58
4V-->M
4V-->11
4V-->77
4X-->11
4X-->77
4X-->88
4Z-->58
4Z-->M
4Z-->11
4Z-->77
51-->M
51-->77
53-->55
53-->58
53-->4V
53-->4X
53-->4Z
53-->51
53-->M
53-->11
53-->1D
53-->77
54-->4V
54-->4X
54-->4Z
54-->51
54-->53
55-->A
55-->M
55-->11
55-->1D
56-->53
57-->54
57-->55
57-->56
57-->58
58-->M
5B-->5D
5B-->5F
5B-->5H
5B-->5J
5D-->5F
5D-->5H
5D-->5J
5D-->77
5F-->16
5F-->1D
5F-->3M
5F-->77
5H-->M
5H-->16
5H-->1D
5H-->3M
5H-->77
5H-->88
5J-->M
5J-->1D
5J-->3M
5J-->77
5J-->88
5K-->5B
5K-->5L
5L-->5D
5O-->5Q
5Q-->28
5Q-->77
5R-->5O
5R-->5S
5S-->5Q
5W-->M
5W-->1D
5W-->2D
5W-->77
5W-->88
5X-->5Z
5X-->61
5X-->63
5X-->65
5X-->67
5Z-->1D
5Z-->77
61-->5W
61-->M
61-->1D
61-->2D
61-->3M
61-->77
63-->69
63-->1D
63-->77
63-->88
65-->69
65-->5Z
65-->61
65-->63
65-->67
65-->M
65-->1D
65-->2H
65-->77
65-->88
67-->1D
67-->2H
67-->77
67-->88
68-->6A
69-->M
69-->2H
6A-->65
6F-->6D
6F-->6E
6F-->6G
6G-->88
6J-->88
6L-->88
6N-->88
6O-->88
6Q-->88
6S-->6Q
6S-->7B
6S-->7F
6S-->7X
6U-->6Y
6U-->88
6W-->88
6Y-->88
70-->74
70-->7X
72-->88
74-->88
77-->6J
77-->6L
77-->6N
77-->6O
77-->6Q
77-->6S
77-->6U
77-->6W
77-->6Y
77-->70
77-->72
77-->74
77-->76
77-->79
77-->7B
77-->7D
77-->7F
77-->7H
77-->7J
77-->7L
77-->7N
77-->7P
77-->7R
77-->7T
77-->7V
77-->7X
79-->88
7B-->88
7D-->74
7F-->88
7H-->74
7H-->7X
7J-->6Q
7J-->74
7J-->7X
7J-->88
7L-->88
7N-->6Q
7N-->6U
7N-->74
7P-->88
7R-->7X
7R-->88
7T-->88
7V-->88
7X-->88
88-->7Z
88-->80
88-->81
88-->82
88-->83
88-->84
88-->85
88-->86
88-->87
88-->89
88-->8A
88-->8B
88-->8C
88-->8D
88-->8E
88-->8F
88-->8G
88-->8K
88-->8L
8D-->81
```
