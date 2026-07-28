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
- 261 leaf nodes, 693 edges.
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
66["column-mapping.ts"]
subgraph 67["components"]
subgraph 68["account-draft-editor"]
69["account-draft-editor.component.ts"]
end
subgraph 6A["column-map-amount-field"]
6B["column-map-amount-field.component.ts"]
end
subgraph 6C["column-map-counterparty-field"]
6D["column-map-counterparty-field.component.ts"]
end
subgraph 6E["column-map-sample-caption"]
6F["column-map-sample-caption.component.ts"]
end
subgraph 6G["column-map-simple-field"]
6H["column-map-simple-field.component.ts"]
end
subgraph 6I["column-map-stepper"]
6J["column-map-stepper.component.ts"]
end
subgraph 6K["column-map-summary-step"]
6L["column-map-summary-step.component.ts"]
end
subgraph 6M["import-map-step"]
6N["import-map-step.component.ts"]
end
subgraph 6O["import-preview-step"]
6P["import-preview-step.component.ts"]
end
subgraph 6Q["import-select-step"]
6R["import-select-step.component.ts"]
end
subgraph 6S["import-summary-step"]
6T["import-summary-step.component.ts"]
end
subgraph 6U["import-wizard"]
6V["import-wizard.component.ts"]
end
6W["index.ts"]
subgraph 6X["queued-file-row"]
6Y["queued-file-row.component.ts"]
end
end
6Z["import-batches.store.ts"]
70["import-queue.ts"]
71["import-wizard-session.ts"]
72["import.routes.ts"]
73["index.ts"]
74["mapper-steps.ts"]
75["mapping-profiles.store.ts"]
end
subgraph 76["feature-learning"]
subgraph 77["components"]
78["index.ts"]
subgraph 79["learning-overview"]
7A["learning-overview.component.ts"]
end
subgraph 7B["model-status"]
7C["model-status.component.ts"]
end
subgraph 7D["rule-proposals"]
7E["rule-proposals.component.ts"]
end
subgraph 7F["suggestions-table"]
7G["suggestions-table.component.ts"]
end
end
7H["index.ts"]
7I["learning.routes.ts"]
end
subgraph 7J["feature-settings"]
subgraph 7K["components"]
7L["index.ts"]
subgraph 7M["settings-overview"]
7N["settings-overview.component.ts"]
end
end
7O["index.ts"]
7P["settings.routes.ts"]
end
subgraph 7Q["feature-transactions"]
subgraph 7R["components"]
subgraph 7S["attribution-override-fieldset"]
7T["attribution-override-fieldset.component.ts"]
end
7U["index.ts"]
subgraph 7V["transaction-bulk-bar"]
7W["transaction-bulk-bar.component.ts"]
end
subgraph 7X["transaction-edit-form"]
7Y["transaction-edit-form.component.ts"]
end
subgraph 7Z["transaction-filters"]
80["transaction-filters.component.ts"]
end
subgraph 81["transactions-overview"]
82["transactions-overview.component.ts"]
end
subgraph 83["transfer-review"]
84["transfer-review.component.ts"]
end
end
85["index.ts"]
86["transaction-filters.ts"]
87["transactions.routes.ts"]
end
subgraph 88["shared"]
subgraph 89["echarts"]
8A["chart-theme.ts"]
8B["echarts-setup.ts"]
8C["index.ts"]
8D["tooltip-formatter.ts"]
end
subgraph 8E["ui"]
subgraph 8F["alert"]
8G["alert.component.ts"]
end
subgraph 8H["badge"]
8I["badge.component.ts"]
end
subgraph 8J["bento-grid"]
8K["bento-grid.component.ts"]
8L["bento-item.component.ts"]
end
subgraph 8M["button"]
8N["button.component.ts"]
end
subgraph 8O["collapse"]
8P["collapse.component.ts"]
end
subgraph 8Q["confirm-dialog"]
8R["confirm-dialog.component.ts"]
end
subgraph 8S["date-range-input"]
8T["date-range-input.component.ts"]
end
subgraph 8U["divider"]
8V["divider.component.ts"]
end
subgraph 8W["dropdown"]
8X["dropdown.component.ts"]
end
subgraph 8Y["empty-state"]
8Z["empty-state.component.ts"]
end
subgraph 90["fieldset"]
91["fieldset.component.ts"]
end
subgraph 92["flex"]
93["flex.component.ts"]
end
subgraph 94["granularity-picker"]
95["granularity-picker.component.ts"]
end
96["index.ts"]
subgraph 97["input"]
98["input.component.ts"]
end
subgraph 99["label"]
9A["label.component.ts"]
end
subgraph 9B["loading-skeleton"]
9C["loading-skeleton.component.ts"]
end
subgraph 9D["modal"]
9E["mm-modal.component.ts"]
end
subgraph 9F["page-header"]
9G["page-header.component.ts"]
end
subgraph 9H["paginator"]
9I["paginator.component.ts"]
end
subgraph 9J["paper"]
9K["paper.component.ts"]
end
subgraph 9L["range-grouping-switcher"]
9M["range-grouping-switcher.component.ts"]
end
subgraph 9N["select"]
9O["select.component.ts"]
end
subgraph 9P["stat-card"]
9Q["stat-card.component.ts"]
end
subgraph 9R["table"]
9S["table.component.ts"]
end
subgraph 9T["tabs"]
9U["tabs.component.ts"]
end
subgraph 9V["typography"]
9W["typography.component.ts"]
end
end
subgraph 9X["utils"]
9Y["confidence-color.ts"]
9Z["confirm-state.ts"]
A0["currency-format.ts"]
A1["currency-symbol-presets.ts"]
A2["daisy-classes.ts"]
A3["date-buckets.ts"]
A4["date-format.pipe.ts"]
A5["date-format.ts"]
A6["debounced-text.ts"]
A7["download-json.ts"]
A8["fingerprint.ts"]
A9["iban.ts"]
AA["index.ts"]
AB["locale-presets.ts"]
AC["pagination.ts"]
AD["percentage.ts"]
AE["search-params.ts"]
AF["selection-model.ts"]
AG["signed-amount.pipe.ts"]
AH["sortable.ts"]
AI["structural-filters.ts"]
AJ["theme-hooks.ts"]
subgraph AK["validators"]
AL["iban.validator.ts"]
AM["percentage.validator.ts"]
end
AN["with-archivable.ts"]
AO["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->2W
5-->4
5-->6
6-->N
6-->AA
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
F-->A0
F-->A8
G-->F
G-->2N
G-->AA
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
U-->AA
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
11-->AA
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->26
15-->8N
15-->9M
15-->9W
15-->AA
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
1O-->AA
1P-->N
1P-->2N
1P-->AA
1Q-->1S
1Q-->N
1Q-->AA
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
1W-->AA
1X-->22
1X-->N
1Y-->1X
1Y-->N
1Y-->AA
1Z-->N
20-->1X
20-->2C
20-->N
21-->AA
22-->1Z
22-->23
22-->N
22-->2W
23-->5
23-->N
24-->N
25-->AA
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
2A-->AA
2B-->22
2B-->N
2C-->AA
2D-->AA
2E-->AA
2F-->N
2F-->2W
2G-->22
2G-->N
2G-->AA
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
30-->AA
32-->N
33-->N
34-->3C
34-->3E
34-->8C
35-->N
35-->1R
35-->26
35-->AA
38-->35
38-->N
38-->26
38-->8C
38-->96
38-->AA
3A-->32
3A-->33
3A-->N
3A-->96
3A-->AA
3A-->AL
3A-->AM
3C-->38
3C-->3A
3C-->1R
3C-->96
3C-->AA
3E-->32
3E-->3A
3E-->3H
3E-->N
3E-->1R
3E-->96
3E-->AA
3F-->38
3F-->3A
3F-->3C
3F-->3E
3F-->3H
3H-->35
3H-->N
3H-->1R
3H-->26
3H-->8C
3H-->96
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
3Q-->96
3Q-->AA
3S-->3L
3S-->N
3S-->96
3T-->3Q
3T-->3S
3T-->3V
3T-->3X
3T-->3Z
3T-->41
3V-->43
3V-->1R
3V-->96
3V-->AA
3X-->44
3X-->A
3X-->N
3X-->1R
3X-->96
3Z-->45
3Z-->47
3Z-->96
3Z-->AA
41-->43
41-->46
41-->47
41-->3V
41-->3X
41-->3Z
41-->N
41-->1R
41-->96
41-->AA
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
47-->AA
49-->4C
4C-->4F
4C-->4G
4C-->4H
4C-->4I
4C-->96
4D-->4C
4H-->4F
4I-->4G
4J-->49
4J-->4D
4L-->N
4O-->1R
4O-->96
4O-->AA
4Q-->1R
4Q-->2W
4Q-->96
4Q-->AA
4S-->5C
4S-->1R
4S-->26
4S-->8C
4S-->96
4S-->AA
4U-->4L
4U-->5C
4U-->1R
4U-->96
4U-->AA
4W-->58
4W-->59
4W-->N
4W-->96
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
4Y-->96
4Y-->AA
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
51-->96
51-->AA
53-->5C
53-->1R
53-->26
53-->96
53-->AA
55-->1R
55-->26
55-->2W
55-->8C
55-->96
55-->AA
57-->5C
57-->26
57-->96
57-->AA
58-->59
58-->N
59-->N
5A-->4Y
5A-->8C
5B-->4Z
5B-->5A
5C-->4L
5C-->1R
5C-->26
5C-->2W
5G-->N
5G-->2J
5G-->96
5G-->AA
5H-->5G
5I-->5G
5J-->5H
5J-->5I
5N-->5U
5N-->96
5P-->5V
5P-->96
5R-->5V
5R-->96
5S-->5N
5S-->5P
5S-->5R
5W-->5N
5W-->5P
5W-->5R
5X-->5S
5X-->5W
61-->19
61-->96
62-->61
63-->61
64-->62
64-->63
66-->N
69-->70
69-->3I
69-->96
6B-->6F
6B-->96
6D-->6F
6D-->96
6F-->96
6H-->66
6H-->6F
6H-->96
6J-->74
6J-->96
6L-->66
6L-->96
6N-->66
6N-->74
6N-->75
6N-->6B
6N-->6D
6N-->6H
6N-->6J
6N-->6L
6N-->6P
6N-->N
6N-->12
6N-->96
6P-->12
6P-->96
6P-->AA
6R-->70
6R-->75
6R-->6Y
6R-->N
6R-->12
6R-->96
6T-->N
6T-->96
6V-->71
6V-->6N
6V-->6R
6V-->6T
6V-->1R
6V-->96
6W-->6N
6W-->6P
6W-->6R
6W-->6T
6W-->6V
6Y-->70
6Y-->69
6Y-->N
6Y-->96
6Z-->A
6Z-->N
6Z-->12
6Z-->1R
70-->N
71-->66
71-->6Z
71-->70
71-->75
71-->N
71-->12
71-->1R
71-->3I
72-->6V
73-->66
73-->6W
73-->6Z
73-->70
73-->72
73-->74
73-->75
74-->66
75-->N
78-->7A
78-->7C
78-->7E
78-->7G
7A-->7C
7A-->7E
7A-->7G
7A-->96
7C-->1E
7C-->1R
7C-->42
7C-->96
7E-->N
7E-->1E
7E-->1R
7E-->42
7E-->96
7E-->AA
7G-->N
7G-->1R
7G-->42
7G-->96
7G-->AA
7H-->78
7H-->7I
7I-->7A
7L-->7N
7N-->19
7N-->1R
7N-->2N
7N-->5J
7N-->96
7N-->AA
7O-->7L
7O-->7P
7P-->7N
7T-->N
7T-->1R
7T-->2S
7T-->96
7T-->AA
7U-->7W
7U-->7Y
7U-->80
7U-->82
7U-->84
7W-->1R
7W-->96
7Y-->7T
7Y-->N
7Y-->1R
7Y-->2S
7Y-->42
7Y-->96
80-->86
80-->1R
80-->96
80-->AA
82-->86
82-->7W
82-->7Y
82-->80
82-->84
82-->N
82-->1R
82-->2W
82-->42
82-->96
82-->AA
84-->1R
84-->2W
84-->96
84-->AA
85-->87
86-->N
86-->2W
87-->82
8C-->8A
8C-->8B
8C-->8D
8D-->AA
8G-->AA
8I-->AA
8K-->AA
8L-->AA
8N-->AA
8P-->AA
8R-->8N
8R-->9A
8R-->9E
8R-->9W
8T-->8X
8T-->AA
8V-->AA
8X-->AA
8Z-->93
8Z-->9W
91-->AA
93-->AA
96-->8G
96-->8I
96-->8K
96-->8L
96-->8N
96-->8P
96-->8R
96-->8T
96-->8V
96-->8X
96-->8Z
96-->91
96-->93
96-->95
96-->98
96-->9A
96-->9C
96-->9E
96-->9G
96-->9I
96-->9K
96-->9M
96-->9O
96-->9Q
96-->9S
96-->9U
96-->9W
98-->AA
9A-->AA
9C-->93
9E-->AA
9G-->93
9G-->9W
9I-->8N
9I-->93
9I-->9W
9I-->AA
9K-->AA
9M-->8N
9M-->8T
9M-->93
9O-->AA
9Q-->9W
9Q-->AA
9S-->AA
9U-->AA
9W-->AA
A4-->A5
A5-->A0
AA-->9Y
AA-->9Z
AA-->A0
AA-->A1
AA-->A2
AA-->A3
AA-->A5
AA-->A4
AA-->A6
AA-->A7
AA-->A8
AA-->A9
AA-->AB
AA-->AC
AA-->AD
AA-->AE
AA-->AF
AA-->AG
AA-->AH
AA-->AI
AA-->AJ
AA-->AN
AA-->AO
AG-->A0
```
