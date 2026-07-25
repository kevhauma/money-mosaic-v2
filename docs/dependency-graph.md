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
- 253 leaf nodes, 669 edges.
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
Q["transactions.repository.ts"]
R["transfer-settings.repository.ts"]
S["transfers.repository.ts"]
end
subgraph T["import"]
U["account-detection.ts"]
V["csv-import.service.ts"]
W["csv-parse.ts"]
X["csv-parse.worker.ts"]
Y["csv-row-mapper.ts"]
Z["csv-worker.types.ts"]
10["delimiter-guess.ts"]
11["import.service.ts"]
12["index.ts"]
end
subgraph 13["layout"]
subgraph 14["app-shell"]
15["app-shell.component.ts"]
end
16["index.ts"]
end
subgraph 17["links"]
18["external-links.ts"]
19["index.ts"]
end
subgraph 1A["ml"]
1B["category-model.worker.ts"]
1C["category-model.worker.types.ts"]
1D["feature-hashing.ts"]
1E["index.ts"]
1F["model-config.ts"]
1G["rule-proposal-mining.ts"]
1H["training-window.ts"]
end
subgraph 1I["onboarding"]
1J["home-redirect.guard.ts"]
1K["index.ts"]
1L["mark-visited.guard.ts"]
1M["visited.service.ts"]
end
subgraph 1N["state"]
1O["accounts.store.ts"]
1P["app-settings.store.ts"]
1Q["categories.store.ts"]
1R["index.ts"]
1S["transactions.store.ts"]
1T["transfer-settings.store.ts"]
1U["transfers.store.ts"]
end
subgraph 1V["stats"]
1W["account-balance-trend.ts"]
1X["category-breakdown.ts"]
1Y["category-composition-trend.ts"]
1Z["category-kind-contribution.ts"]
20["category-period-comparison.ts"]
21["chart-zoom-window.ts"]
22["classify-for-stats.ts"]
23["classify-joint-leg.ts"]
24["full-history-range.ts"]
25["granularity-for-span.ts"]
26["index.ts"]
27["joint-account-stake.ts"]
28["joint-contributor-breakdown.ts"]
29["net-margin.ts"]
2A["net-worth-trend.ts"]
2B["period-stats.ts"]
2C["period-window.ts"]
2D["periodized-rate.ts"]
2E["range-state.store.ts"]
2F["top-transactions.ts"]
2G["weekday-weekend-split.ts"]
2H["year-over-year.ts"]
end
subgraph 2I["storage"]
2J["index.ts"]
2K["storage-status.service.ts"]
end
subgraph 2L["theme"]
2M["accent-colors.ts"]
2N["index.ts"]
2O["theme-styles.ts"]
2P["theme.service.ts"]
end
subgraph 2Q["transactions"]
2R["attribution-override.ts"]
2S["index.ts"]
2T["nullify-transaction.ts"]
2U["transaction-deletion.service.ts"]
end
subgraph 2V["transfers"]
2W["index.ts"]
2X["transfer-cleanup.service.ts"]
2Y["transfer-linking.service.ts"]
2Z["transfer-matching.service.ts"]
30["transfer-matching.ts"]
end
end
subgraph 31["feature-accounts"]
32["account-icons.ts"]
33["account-types.ts"]
34["accounts.routes.ts"]
35["balance-trend-signals.ts"]
subgraph 36["components"]
subgraph 37["account-balance-chart"]
38["account-balance-chart.component.ts"]
end
subgraph 39["account-form"]
3A["account-form.component.ts"]
end
subgraph 3B["accounts-detail"]
3C["accounts-detail.component.ts"]
end
subgraph 3D["accounts-overview"]
3E["accounts-overview.component.ts"]
end
3F["index.ts"]
subgraph 3G["net-worth-history-chart"]
3H["net-worth-history-chart.component.ts"]
end
end
3I["index.ts"]
end
subgraph 3J["feature-categories"]
3K["categories.routes.ts"]
3L["category-icons.ts"]
3M["category-model.service.ts"]
3N["category-model.store.ts"]
subgraph 3O["components"]
subgraph 3P["categories-overview"]
3Q["categories-overview.component.ts"]
end
subgraph 3R["category-form"]
3S["category-form.component.ts"]
end
3T["index.ts"]
subgraph 3U["rule-filters"]
3V["rule-filters.component.ts"]
end
subgraph 3W["rule-form"]
3X["rule-form.component.ts"]
end
subgraph 3Y["rule-share-bar"]
3Z["rule-share-bar.component.ts"]
end
subgraph 40["rules-overview"]
41["rules-overview.component.ts"]
end
end
42["index.ts"]
43["rule-filters.ts"]
44["rule-labels.ts"]
45["rule-share.ts"]
46["rule-summary.ts"]
47["rules.store.ts"]
end
subgraph 48["feature-changelog"]
49["changelog.routes.ts"]
subgraph 4A["components"]
subgraph 4B["changelog-page"]
4C["changelog-page.component.ts"]
end
4D["index.ts"]
end
subgraph 4E["data"]
4F["changelog-entries.ts"]
4G["roadmap-entries.ts"]
end
4H["group-changelog-entries.ts"]
4I["group-roadmap-entries.ts"]
4J["index.ts"]
end
subgraph 4K["feature-dashboard"]
4L["category-comparison-settings.store.ts"]
subgraph 4M["components"]
subgraph 4N["account-balance-strip"]
4O["account-balance-strip.component.ts"]
end
subgraph 4P["action-queue-panel"]
4Q["action-queue-panel.component.ts"]
end
subgraph 4R["category-breakdown-panel"]
4S["category-breakdown-panel.component.ts"]
end
subgraph 4T["category-comparison-panel"]
4U["category-comparison-panel.component.ts"]
end
subgraph 4V["dashboard-customize-panel"]
4W["dashboard-customize-panel.component.ts"]
end
subgraph 4X["dashboard-overview"]
4Y["dashboard-overview.component.ts"]
end
4Z["index.ts"]
subgraph 50["net-worth-header"]
51["net-worth-header.component.ts"]
end
subgraph 52["top-transactions-panel"]
53["top-transactions-panel.component.ts"]
end
subgraph 54["trend-chart-panel"]
55["trend-chart-panel.component.ts"]
end
subgraph 56["weekday-weekend-split-panel"]
57["weekday-weekend-split-panel.component.ts"]
end
end
58["dashboard-layout-settings.store.ts"]
59["dashboard-row-order.ts"]
5A["dashboard.routes.ts"]
5B["index.ts"]
5C["stats.store.ts"]
end
subgraph 5D["feature-data-management"]
subgraph 5E["components"]
subgraph 5F["data-management-overview"]
5G["data-management-overview.component.ts"]
end
5H["index.ts"]
end
5I["data-management.routes.ts"]
5J["index.ts"]
end
subgraph 5K["feature-help"]
subgraph 5L["components"]
subgraph 5M["faq-page"]
5N["faq-page.component.ts"]
end
subgraph 5O["guide-detail"]
5P["guide-detail.component.ts"]
end
subgraph 5Q["guides-index"]
5R["guides-index.component.ts"]
end
5S["index.ts"]
end
subgraph 5T["data"]
5U["faq.ts"]
5V["guides.ts"]
end
5W["help.routes.ts"]
5X["index.ts"]
end
subgraph 5Y["feature-home"]
subgraph 5Z["components"]
subgraph 60["home-landing"]
61["home-landing.component.ts"]
end
62["index.ts"]
end
63["home.routes.ts"]
64["index.ts"]
end
subgraph 65["feature-import"]
subgraph 66["components"]
subgraph 67["account-draft-editor"]
68["account-draft-editor.component.ts"]
end
subgraph 69["column-map-amount-field"]
6A["column-map-amount-field.component.ts"]
end
subgraph 6B["column-map-counterparty-field"]
6C["column-map-counterparty-field.component.ts"]
end
subgraph 6D["column-map-sample-caption"]
6E["column-map-sample-caption.component.ts"]
end
subgraph 6F["column-map-simple-field"]
6G["column-map-simple-field.component.ts"]
end
subgraph 6H["column-map-stepper"]
6I["column-map-stepper.component.ts"]
end
subgraph 6J["column-map-summary-step"]
6K["column-map-summary-step.component.ts"]
end
subgraph 6L["import-map-step"]
6M["import-map-step.component.ts"]
end
subgraph 6N["import-preview-step"]
6O["import-preview-step.component.ts"]
end
subgraph 6P["import-select-step"]
6Q["import-select-step.component.ts"]
end
subgraph 6R["import-summary-step"]
6S["import-summary-step.component.ts"]
end
subgraph 6T["import-wizard"]
6U["import-wizard.component.ts"]
end
6V["index.ts"]
subgraph 6W["queued-file-row"]
6X["queued-file-row.component.ts"]
end
end
6Y["import-batches.store.ts"]
6Z["import.routes.ts"]
70["index.ts"]
71["mapping-profiles.store.ts"]
end
subgraph 72["feature-learning"]
subgraph 73["components"]
74["index.ts"]
subgraph 75["learning-overview"]
76["learning-overview.component.ts"]
end
subgraph 77["model-status"]
78["model-status.component.ts"]
end
subgraph 79["rule-proposals"]
7A["rule-proposals.component.ts"]
end
subgraph 7B["suggestions-table"]
7C["suggestions-table.component.ts"]
end
end
7D["index.ts"]
7E["learning.routes.ts"]
end
subgraph 7F["feature-settings"]
subgraph 7G["components"]
7H["index.ts"]
subgraph 7I["settings-overview"]
7J["settings-overview.component.ts"]
end
end
7K["index.ts"]
7L["settings.routes.ts"]
end
subgraph 7M["feature-transactions"]
subgraph 7N["components"]
subgraph 7O["attribution-override-fieldset"]
7P["attribution-override-fieldset.component.ts"]
end
7Q["index.ts"]
subgraph 7R["transaction-bulk-bar"]
7S["transaction-bulk-bar.component.ts"]
end
subgraph 7T["transaction-edit-form"]
7U["transaction-edit-form.component.ts"]
end
subgraph 7V["transaction-filters"]
7W["transaction-filters.component.ts"]
end
subgraph 7X["transactions-overview"]
7Y["transactions-overview.component.ts"]
end
subgraph 7Z["transfer-review"]
80["transfer-review.component.ts"]
end
end
81["index.ts"]
82["transaction-filters.ts"]
83["transactions.routes.ts"]
end
subgraph 84["shared"]
subgraph 85["echarts"]
86["chart-theme.ts"]
87["echarts-setup.ts"]
88["index.ts"]
89["tooltip-formatter.ts"]
end
subgraph 8A["ui"]
subgraph 8B["alert"]
8C["alert.component.ts"]
end
subgraph 8D["badge"]
8E["badge.component.ts"]
end
subgraph 8F["bento-grid"]
8G["bento-grid.component.ts"]
8H["bento-item.component.ts"]
end
subgraph 8I["button"]
8J["button.component.ts"]
end
subgraph 8K["collapse"]
8L["collapse.component.ts"]
end
subgraph 8M["confirm-dialog"]
8N["confirm-dialog.component.ts"]
end
subgraph 8O["date-range-input"]
8P["date-range-input.component.ts"]
end
subgraph 8Q["divider"]
8R["divider.component.ts"]
end
subgraph 8S["dropdown"]
8T["dropdown.component.ts"]
end
subgraph 8U["empty-state"]
8V["empty-state.component.ts"]
end
subgraph 8W["fieldset"]
8X["fieldset.component.ts"]
end
subgraph 8Y["flex"]
8Z["flex.component.ts"]
end
subgraph 90["granularity-picker"]
91["granularity-picker.component.ts"]
end
92["index.ts"]
subgraph 93["input"]
94["input.component.ts"]
end
subgraph 95["label"]
96["label.component.ts"]
end
subgraph 97["loading-skeleton"]
98["loading-skeleton.component.ts"]
end
subgraph 99["modal"]
9A["mm-modal.component.ts"]
end
subgraph 9B["page-header"]
9C["page-header.component.ts"]
end
subgraph 9D["paginator"]
9E["paginator.component.ts"]
end
subgraph 9F["paper"]
9G["paper.component.ts"]
end
subgraph 9H["range-grouping-switcher"]
9I["range-grouping-switcher.component.ts"]
end
subgraph 9J["select"]
9K["select.component.ts"]
end
subgraph 9L["stat-card"]
9M["stat-card.component.ts"]
end
subgraph 9N["table"]
9O["table.component.ts"]
end
subgraph 9P["tabs"]
9Q["tabs.component.ts"]
end
subgraph 9R["typography"]
9S["typography.component.ts"]
end
end
subgraph 9T["utils"]
9U["confidence-color.ts"]
9V["confirm-state.ts"]
9W["currency-format.ts"]
9X["daisy-classes.ts"]
9Y["date-buckets.ts"]
9Z["debounced-text.ts"]
A0["download-json.ts"]
A1["fingerprint.ts"]
A2["iban.ts"]
A3["index.ts"]
A4["pagination.ts"]
A5["percentage.ts"]
A6["search-params.ts"]
A7["selection-model.ts"]
A8["signed-amount.pipe.ts"]
A9["sortable.ts"]
AA["structural-filters.ts"]
AB["theme-hooks.ts"]
subgraph AC["validators"]
AD["iban.validator.ts"]
AE["percentage.validator.ts"]
end
AF["with-archivable.ts"]
AG["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->2W
5-->4
5-->6
6-->N
6-->A3
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
F-->1F
F-->2M
F-->A1
G-->F
G-->2N
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
O-->F
P-->F
Q-->F
R-->F
S-->F
U-->N
U-->A3
V-->Z
V-->N
W-->Y
W-->Z
X-->W
X-->Z
Y-->N
Z-->Y
Z-->N
11-->Y
11-->N
11-->2W
11-->A3
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->26
15-->8J
15-->9I
15-->9S
15-->A3
16-->15
19-->18
1B-->1C
1B-->1D
1B-->1F
1C-->1F
1D-->1F
1E-->1C
1E-->1D
1E-->1F
1E-->1G
1E-->1H
1G-->A
1G-->N
1J-->1M
1K-->1J
1K-->1L
1K-->1M
1L-->1M
1O-->1Q
1O-->1S
1O-->1U
1O-->5
1O-->N
1O-->26
1O-->2W
1O-->A3
1P-->N
1P-->2N
1Q-->1S
1Q-->N
1Q-->A3
1R-->1O
1R-->1P
1R-->1Q
1R-->1S
1R-->1T
1R-->1U
1S-->N
1S-->2S
1S-->2W
1T-->N
1U-->1S
1U-->1T
1U-->N
1U-->2W
1W-->23
1W-->2A
1W-->N
1W-->A3
1X-->22
1X-->N
1Y-->1X
1Y-->N
1Y-->A3
1Z-->N
20-->1X
20-->2C
20-->N
21-->A3
22-->1Z
22-->23
22-->N
22-->2W
23-->5
23-->N
24-->N
25-->A3
26-->1W
26-->1X
26-->1Y
26-->1Z
26-->20
26-->21
26-->22
26-->23
26-->24
26-->25
26-->27
26-->28
26-->29
26-->2A
26-->2B
26-->2C
26-->2D
26-->2E
26-->2F
26-->2G
26-->2H
27-->23
27-->N
28-->23
28-->5
28-->N
2A-->23
2A-->N
2A-->A3
2B-->22
2B-->N
2C-->A3
2D-->A3
2E-->A3
2F-->N
2F-->2W
2G-->22
2G-->N
2G-->A3
2H-->2B
2H-->N
2J-->2K
2N-->2M
2N-->2O
2N-->2P
2P-->2O
2R-->N
2S-->2R
2S-->2T
2S-->2U
2T-->N
2U-->N
2U-->2W
2W-->2X
2W-->2Y
2W-->30
2W-->2Z
2X-->N
2Y-->30
2Y-->N
2Z-->2Y
2Z-->30
2Z-->N
30-->6
30-->N
30-->A3
32-->N
33-->N
34-->3C
34-->3E
34-->88
35-->N
35-->1R
35-->26
35-->A3
38-->35
38-->N
38-->26
38-->88
38-->92
38-->A3
3A-->32
3A-->33
3A-->N
3A-->92
3A-->A3
3A-->AD
3A-->AE
3C-->38
3C-->3A
3C-->1R
3C-->92
3C-->A3
3E-->32
3E-->3A
3E-->3H
3E-->N
3E-->1R
3E-->92
3E-->A3
3F-->38
3F-->3A
3F-->3C
3F-->3E
3F-->3H
3H-->35
3H-->N
3H-->1R
3H-->26
3H-->88
3H-->92
3I-->32
3I-->33
3I-->34
3I-->3F
3K-->3Q
3K-->41
3M-->1E
3N-->3M
3N-->47
3N-->N
3N-->1E
3N-->1R
3Q-->3L
3Q-->3S
3Q-->N
3Q-->1R
3Q-->92
3Q-->A3
3S-->3L
3S-->N
3S-->92
3T-->3Q
3T-->3S
3T-->3V
3T-->3X
3T-->3Z
3T-->41
3V-->43
3V-->1R
3V-->92
3V-->A3
3X-->44
3X-->A
3X-->N
3X-->1R
3X-->92
3Z-->45
3Z-->47
3Z-->92
3Z-->A3
41-->43
41-->46
41-->47
41-->3V
41-->3X
41-->3Z
41-->N
41-->1R
41-->92
41-->A3
42-->3K
42-->3L
42-->3M
42-->3N
42-->3T
42-->43
42-->46
42-->47
43-->46
43-->N
44-->N
45-->N
46-->44
46-->N
47-->45
47-->A
47-->N
47-->1R
47-->A3
49-->4C
4C-->4F
4C-->4G
4C-->4H
4C-->4I
4C-->92
4D-->4C
4H-->4F
4I-->4G
4J-->49
4J-->4D
4L-->N
4O-->1R
4O-->92
4O-->A3
4Q-->1R
4Q-->2W
4Q-->92
4Q-->A3
4S-->5C
4S-->1R
4S-->26
4S-->88
4S-->92
4S-->A3
4U-->4L
4U-->5C
4U-->1R
4U-->92
4U-->A3
4W-->58
4W-->59
4W-->N
4W-->92
4Y-->58
4Y-->59
4Y-->5C
4Y-->4O
4Y-->4Q
4Y-->4S
4Y-->4U
4Y-->4W
4Y-->51
4Y-->53
4Y-->55
4Y-->57
4Y-->1R
4Y-->26
4Y-->92
4Y-->A3
4Z-->4O
4Z-->4Q
4Z-->4S
4Z-->4U
4Z-->4W
4Z-->4Y
4Z-->51
4Z-->53
4Z-->55
4Z-->57
51-->1R
51-->92
51-->A3
53-->5C
53-->1R
53-->26
53-->92
53-->A3
55-->1R
55-->26
55-->2W
55-->88
55-->92
55-->A3
57-->5C
57-->26
57-->92
57-->A3
58-->59
58-->N
59-->N
5A-->4Y
5A-->88
5B-->4Z
5B-->5A
5C-->4L
5C-->1R
5C-->26
5C-->2W
5G-->N
5G-->2J
5G-->92
5G-->A3
5H-->5G
5I-->5G
5J-->5H
5J-->5I
5N-->5U
5N-->92
5P-->5V
5P-->92
5R-->5V
5R-->92
5S-->5N
5S-->5P
5S-->5R
5W-->5N
5W-->5P
5W-->5R
5X-->5S
5X-->5W
61-->19
61-->92
62-->61
63-->61
64-->62
64-->63
68-->6Q
68-->3I
68-->92
6A-->6E
6A-->92
6C-->6E
6C-->92
6E-->92
6G-->6E
6G-->6M
6G-->92
6I-->6M
6I-->92
6K-->92
6M-->71
6M-->6A
6M-->6C
6M-->6G
6M-->6I
6M-->6K
6M-->6O
6M-->N
6M-->12
6M-->92
6O-->12
6O-->92
6O-->A3
6Q-->71
6Q-->6X
6Q-->N
6Q-->12
6Q-->92
6S-->N
6S-->92
6U-->6Y
6U-->71
6U-->6M
6U-->6Q
6U-->6S
6U-->N
6U-->12
6U-->1R
6U-->3I
6U-->92
6V-->6M
6V-->6O
6V-->6Q
6V-->6S
6V-->6U
6X-->68
6X-->6Q
6X-->N
6X-->92
6Y-->A
6Y-->N
6Y-->12
6Y-->1R
6Z-->6U
70-->6V
70-->6Y
70-->6Z
70-->71
71-->N
74-->76
74-->78
74-->7A
74-->7C
76-->78
76-->7A
76-->7C
76-->92
78-->1E
78-->1R
78-->42
78-->92
7A-->N
7A-->1E
7A-->1R
7A-->42
7A-->92
7A-->A3
7C-->N
7C-->1R
7C-->42
7C-->92
7C-->A3
7D-->74
7D-->7E
7E-->76
7H-->7J
7J-->19
7J-->1R
7J-->2N
7J-->5J
7J-->92
7K-->7H
7K-->7L
7L-->7J
7P-->N
7P-->1R
7P-->2S
7P-->92
7P-->A3
7Q-->7S
7Q-->7U
7Q-->7W
7Q-->7Y
7Q-->80
7S-->1R
7S-->92
7U-->7P
7U-->N
7U-->1R
7U-->2S
7U-->42
7U-->92
7W-->82
7W-->1R
7W-->92
7W-->A3
7Y-->82
7Y-->7S
7Y-->7U
7Y-->7W
7Y-->80
7Y-->N
7Y-->1R
7Y-->2W
7Y-->42
7Y-->92
7Y-->A3
80-->1R
80-->2W
80-->92
80-->A3
81-->83
82-->N
82-->2W
83-->7Y
88-->86
88-->87
88-->89
89-->A3
8C-->A3
8E-->A3
8G-->A3
8H-->A3
8J-->A3
8L-->A3
8N-->8J
8N-->96
8N-->9A
8N-->9S
8P-->8T
8P-->A3
8R-->A3
8T-->A3
8V-->8Z
8V-->9S
8X-->A3
8Z-->A3
92-->8C
92-->8E
92-->8G
92-->8H
92-->8J
92-->8L
92-->8N
92-->8P
92-->8R
92-->8T
92-->8V
92-->8X
92-->8Z
92-->91
92-->94
92-->96
92-->98
92-->9A
92-->9C
92-->9E
92-->9G
92-->9I
92-->9K
92-->9M
92-->9O
92-->9Q
92-->9S
94-->A3
96-->A3
98-->8Z
9A-->A3
9C-->8Z
9C-->9S
9E-->8J
9E-->8Z
9E-->9S
9E-->A3
9G-->A3
9I-->8J
9I-->8P
9I-->8Z
9K-->A3
9M-->9S
9M-->A3
9O-->A3
9Q-->A3
9S-->A3
A3-->9U
A3-->9V
A3-->9W
A3-->9X
A3-->9Y
A3-->9Z
A3-->A0
A3-->A1
A3-->A2
A3-->A4
A3-->A5
A3-->A6
A3-->A7
A3-->A8
A3-->A9
A3-->AA
A3-->AB
A3-->AF
A3-->AG
A8-->9W
```
