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
- 250 leaf nodes, 659 edges.
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
30["account-types.ts"]
31["accounts.routes.ts"]
32["balance-trend-signals.ts"]
subgraph 33["components"]
subgraph 34["account-balance-chart"]
35["account-balance-chart.component.ts"]
end
subgraph 36["account-form"]
37["account-form.component.ts"]
end
subgraph 38["accounts-detail"]
39["accounts-detail.component.ts"]
end
subgraph 3A["accounts-overview"]
3B["accounts-overview.component.ts"]
end
3C["index.ts"]
subgraph 3D["net-worth-history-chart"]
3E["net-worth-history-chart.component.ts"]
end
end
3F["index.ts"]
end
subgraph 3G["feature-categories"]
3H["categories.routes.ts"]
3I["category-icons.ts"]
3J["category-model.service.ts"]
3K["category-model.store.ts"]
subgraph 3L["components"]
subgraph 3M["categories-overview"]
3N["categories-overview.component.ts"]
end
subgraph 3O["category-form"]
3P["category-form.component.ts"]
end
3Q["index.ts"]
subgraph 3R["rule-filters"]
3S["rule-filters.component.ts"]
end
subgraph 3T["rule-form"]
3U["rule-form.component.ts"]
end
subgraph 3V["rule-share-bar"]
3W["rule-share-bar.component.ts"]
end
subgraph 3X["rules-overview"]
3Y["rules-overview.component.ts"]
end
end
3Z["index.ts"]
40["rule-filters.ts"]
41["rule-labels.ts"]
42["rule-share.ts"]
43["rule-summary.ts"]
44["rules.store.ts"]
end
subgraph 45["feature-changelog"]
46["changelog.routes.ts"]
subgraph 47["components"]
subgraph 48["changelog-page"]
49["changelog-page.component.ts"]
end
4A["index.ts"]
end
subgraph 4B["data"]
4C["changelog-entries.ts"]
4D["roadmap-entries.ts"]
end
4E["group-changelog-entries.ts"]
4F["group-roadmap-entries.ts"]
4G["index.ts"]
end
subgraph 4H["feature-dashboard"]
4I["category-comparison-settings.store.ts"]
subgraph 4J["components"]
subgraph 4K["account-balance-strip"]
4L["account-balance-strip.component.ts"]
end
subgraph 4M["action-queue-panel"]
4N["action-queue-panel.component.ts"]
end
subgraph 4O["category-breakdown-panel"]
4P["category-breakdown-panel.component.ts"]
end
subgraph 4Q["category-comparison-panel"]
4R["category-comparison-panel.component.ts"]
end
subgraph 4S["dashboard-customize-panel"]
4T["dashboard-customize-panel.component.ts"]
end
subgraph 4U["dashboard-overview"]
4V["dashboard-overview.component.ts"]
end
4W["index.ts"]
subgraph 4X["net-worth-header"]
4Y["net-worth-header.component.ts"]
end
subgraph 4Z["top-transactions-panel"]
50["top-transactions-panel.component.ts"]
end
subgraph 51["trend-chart-panel"]
52["trend-chart-panel.component.ts"]
end
subgraph 53["weekday-weekend-split-panel"]
54["weekday-weekend-split-panel.component.ts"]
end
end
55["dashboard-layout-settings.store.ts"]
56["dashboard-row-order.ts"]
57["dashboard.routes.ts"]
58["index.ts"]
59["stats.store.ts"]
end
subgraph 5A["feature-data-management"]
subgraph 5B["components"]
subgraph 5C["data-management-overview"]
5D["data-management-overview.component.ts"]
end
5E["index.ts"]
end
5F["data-management.routes.ts"]
5G["index.ts"]
end
subgraph 5H["feature-help"]
subgraph 5I["components"]
subgraph 5J["faq-page"]
5K["faq-page.component.ts"]
end
subgraph 5L["guide-detail"]
5M["guide-detail.component.ts"]
end
subgraph 5N["guides-index"]
5O["guides-index.component.ts"]
end
5P["index.ts"]
end
subgraph 5Q["data"]
5R["faq.ts"]
5S["guides.ts"]
end
5T["help.routes.ts"]
5U["index.ts"]
end
subgraph 5V["feature-home"]
subgraph 5W["components"]
subgraph 5X["home-landing"]
5Y["home-landing.component.ts"]
end
5Z["index.ts"]
end
60["home.routes.ts"]
61["index.ts"]
end
subgraph 62["feature-import"]
subgraph 63["components"]
subgraph 64["account-draft-editor"]
65["account-draft-editor.component.ts"]
end
subgraph 66["column-map-amount-field"]
67["column-map-amount-field.component.ts"]
end
subgraph 68["column-map-counterparty-field"]
69["column-map-counterparty-field.component.ts"]
end
subgraph 6A["column-map-sample-caption"]
6B["column-map-sample-caption.component.ts"]
end
subgraph 6C["column-map-simple-field"]
6D["column-map-simple-field.component.ts"]
end
subgraph 6E["column-map-stepper"]
6F["column-map-stepper.component.ts"]
end
subgraph 6G["column-map-summary-step"]
6H["column-map-summary-step.component.ts"]
end
subgraph 6I["import-map-step"]
6J["import-map-step.component.ts"]
end
subgraph 6K["import-preview-step"]
6L["import-preview-step.component.ts"]
end
subgraph 6M["import-select-step"]
6N["import-select-step.component.ts"]
end
subgraph 6O["import-summary-step"]
6P["import-summary-step.component.ts"]
end
subgraph 6Q["import-wizard"]
6R["import-wizard.component.ts"]
end
6S["index.ts"]
subgraph 6T["queued-file-row"]
6U["queued-file-row.component.ts"]
end
end
6V["import-batches.store.ts"]
6W["import.routes.ts"]
6X["index.ts"]
6Y["mapping-profiles.store.ts"]
end
subgraph 6Z["feature-learning"]
subgraph 70["components"]
71["index.ts"]
subgraph 72["learning-overview"]
73["learning-overview.component.ts"]
end
subgraph 74["model-status"]
75["model-status.component.ts"]
end
subgraph 76["rule-proposals"]
77["rule-proposals.component.ts"]
end
subgraph 78["suggestions-table"]
79["suggestions-table.component.ts"]
end
end
7A["index.ts"]
7B["learning.routes.ts"]
end
subgraph 7C["feature-settings"]
subgraph 7D["components"]
7E["index.ts"]
subgraph 7F["settings-overview"]
7G["settings-overview.component.ts"]
end
end
7H["index.ts"]
7I["settings.routes.ts"]
end
subgraph 7J["feature-transactions"]
subgraph 7K["components"]
subgraph 7L["attribution-override-fieldset"]
7M["attribution-override-fieldset.component.ts"]
end
7N["index.ts"]
subgraph 7O["transaction-bulk-bar"]
7P["transaction-bulk-bar.component.ts"]
end
subgraph 7Q["transaction-edit-form"]
7R["transaction-edit-form.component.ts"]
end
subgraph 7S["transaction-filters"]
7T["transaction-filters.component.ts"]
end
subgraph 7U["transactions-overview"]
7V["transactions-overview.component.ts"]
end
subgraph 7W["transfer-review"]
7X["transfer-review.component.ts"]
end
end
7Y["index.ts"]
7Z["transaction-filters.ts"]
80["transactions.routes.ts"]
end
subgraph 81["shared"]
subgraph 82["echarts"]
83["chart-theme.ts"]
84["echarts-setup.ts"]
85["index.ts"]
86["tooltip-formatter.ts"]
end
subgraph 87["ui"]
subgraph 88["alert"]
89["alert.component.ts"]
end
subgraph 8A["badge"]
8B["badge.component.ts"]
end
subgraph 8C["bento-grid"]
8D["bento-grid.component.ts"]
8E["bento-item.component.ts"]
end
subgraph 8F["button"]
8G["button.component.ts"]
end
subgraph 8H["collapse"]
8I["collapse.component.ts"]
end
subgraph 8J["confirm-dialog"]
8K["confirm-dialog.component.ts"]
end
subgraph 8L["date-range-input"]
8M["date-range-input.component.ts"]
end
subgraph 8N["divider"]
8O["divider.component.ts"]
end
subgraph 8P["dropdown"]
8Q["dropdown.component.ts"]
end
subgraph 8R["empty-state"]
8S["empty-state.component.ts"]
end
subgraph 8T["fieldset"]
8U["fieldset.component.ts"]
end
subgraph 8V["flex"]
8W["flex.component.ts"]
end
subgraph 8X["granularity-picker"]
8Y["granularity-picker.component.ts"]
end
8Z["index.ts"]
subgraph 90["input"]
91["input.component.ts"]
end
subgraph 92["label"]
93["label.component.ts"]
end
subgraph 94["loading-skeleton"]
95["loading-skeleton.component.ts"]
end
subgraph 96["modal"]
97["mm-modal.component.ts"]
end
subgraph 98["page-header"]
99["page-header.component.ts"]
end
subgraph 9A["paginator"]
9B["paginator.component.ts"]
end
subgraph 9C["paper"]
9D["paper.component.ts"]
end
subgraph 9E["range-grouping-switcher"]
9F["range-grouping-switcher.component.ts"]
end
subgraph 9G["select"]
9H["select.component.ts"]
end
subgraph 9I["stat-card"]
9J["stat-card.component.ts"]
end
subgraph 9K["table"]
9L["table.component.ts"]
end
subgraph 9M["tabs"]
9N["tabs.component.ts"]
end
subgraph 9O["typography"]
9P["typography.component.ts"]
end
end
subgraph 9Q["utils"]
9R["confidence-color.ts"]
9S["confirm-state.ts"]
9T["currency-format.ts"]
9U["daisy-classes.ts"]
9V["date-buckets.ts"]
9W["debounced-text.ts"]
9X["download-json.ts"]
9Y["fingerprint.ts"]
9Z["iban.ts"]
A0["index.ts"]
A1["pagination.ts"]
A2["percentage.ts"]
A3["search-params.ts"]
A4["selection-model.ts"]
A5["signed-amount.pipe.ts"]
A6["sortable.ts"]
A7["structural-filters.ts"]
A8["theme-hooks.ts"]
subgraph A9["validators"]
AA["iban.validator.ts"]
AB["percentage.validator.ts"]
end
AC["with-archivable.ts"]
AD["with-persisted-crud.ts"]
end
end
end
end
4-->M
4-->2T
5-->4
5-->6
6-->M
6-->A0
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
F-->9Y
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
T-->A0
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
10-->A0
11-->T
11-->U
11-->V
11-->X
11-->Y
11-->Z
11-->10
14-->1P
14-->24
14-->8G
14-->9F
14-->9P
14-->A0
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
1N-->A0
1O-->1Q
1O-->M
1O-->A0
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
1U-->A0
1V-->20
1V-->M
1W-->1V
1W-->M
1W-->A0
1X-->M
1Y-->1V
1Y-->2A
1Y-->M
1Z-->A0
20-->1X
20-->21
20-->M
20-->2T
21-->5
21-->M
22-->M
23-->A0
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
28-->A0
29-->20
29-->M
2A-->A0
2B-->A0
2C-->A0
2D-->M
2D-->2T
2E-->20
2E-->M
2E-->A0
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
2X-->A0
2Z-->M
30-->M
31-->39
31-->3B
31-->85
32-->M
32-->1P
32-->24
32-->A0
35-->32
35-->M
35-->24
35-->85
35-->8Z
35-->A0
37-->2Z
37-->30
37-->M
37-->8Z
37-->A0
37-->AA
37-->AB
39-->35
39-->37
39-->1P
39-->8Z
39-->A0
3B-->2Z
3B-->37
3B-->3E
3B-->M
3B-->1P
3B-->8Z
3B-->A0
3C-->35
3C-->37
3C-->39
3C-->3B
3C-->3E
3E-->32
3E-->M
3E-->1P
3E-->24
3E-->85
3E-->8Z
3F-->2Z
3F-->30
3F-->31
3F-->3C
3H-->3N
3H-->3Y
3J-->1D
3K-->3J
3K-->44
3K-->M
3K-->1D
3K-->1P
3N-->3I
3N-->3P
3N-->M
3N-->1P
3N-->8Z
3N-->A0
3P-->3I
3P-->M
3P-->8Z
3Q-->3N
3Q-->3P
3Q-->3S
3Q-->3U
3Q-->3W
3Q-->3Y
3S-->40
3S-->1P
3S-->8Z
3S-->A0
3U-->41
3U-->A
3U-->M
3U-->1P
3U-->8Z
3W-->42
3W-->44
3W-->8Z
3W-->A0
3Y-->40
3Y-->43
3Y-->44
3Y-->3S
3Y-->3U
3Y-->3W
3Y-->M
3Y-->1P
3Y-->8Z
3Y-->A0
3Z-->3H
3Z-->3I
3Z-->3J
3Z-->3K
3Z-->3Q
3Z-->40
3Z-->43
3Z-->44
40-->43
40-->M
41-->M
42-->M
43-->41
43-->M
44-->42
44-->A
44-->M
44-->1P
44-->A0
46-->49
49-->4C
49-->4D
49-->4E
49-->4F
49-->8Z
4A-->49
4E-->4C
4F-->4D
4G-->46
4G-->4A
4I-->M
4L-->1P
4L-->8Z
4L-->A0
4N-->1P
4N-->2T
4N-->8Z
4N-->A0
4P-->59
4P-->1P
4P-->24
4P-->85
4P-->8Z
4P-->A0
4R-->4I
4R-->59
4R-->1P
4R-->8Z
4R-->A0
4T-->55
4T-->56
4T-->M
4T-->8Z
4V-->55
4V-->56
4V-->59
4V-->4L
4V-->4N
4V-->4P
4V-->4R
4V-->4T
4V-->4Y
4V-->50
4V-->52
4V-->54
4V-->1P
4V-->24
4V-->8Z
4V-->A0
4W-->4L
4W-->4N
4W-->4P
4W-->4R
4W-->4T
4W-->4V
4W-->4Y
4W-->50
4W-->52
4W-->54
4Y-->1P
4Y-->8Z
4Y-->A0
50-->59
50-->1P
50-->24
50-->8Z
50-->A0
52-->1P
52-->24
52-->2T
52-->85
52-->8Z
52-->A0
54-->59
54-->24
54-->8Z
54-->A0
55-->56
55-->M
56-->M
57-->4V
57-->85
58-->4W
58-->57
59-->4I
59-->1P
59-->24
59-->2T
5D-->M
5D-->2H
5D-->8Z
5D-->A0
5E-->5D
5F-->5D
5G-->5E
5G-->5F
5K-->5R
5K-->8Z
5M-->5S
5M-->8Z
5O-->5S
5O-->8Z
5P-->5K
5P-->5M
5P-->5O
5T-->5K
5T-->5M
5T-->5O
5U-->5P
5U-->5T
5Y-->18
5Y-->8Z
5Z-->5Y
60-->5Y
61-->5Z
61-->60
65-->6N
65-->3F
65-->8Z
67-->6B
67-->8Z
69-->6B
69-->8Z
6B-->8Z
6D-->6B
6D-->6J
6D-->8Z
6F-->6J
6H-->8Z
6J-->6Y
6J-->67
6J-->69
6J-->6D
6J-->6F
6J-->6H
6J-->6L
6J-->M
6J-->11
6J-->8Z
6L-->11
6L-->8Z
6L-->A0
6N-->6Y
6N-->6U
6N-->M
6N-->11
6N-->8Z
6P-->M
6P-->8Z
6R-->6V
6R-->6Y
6R-->6J
6R-->6N
6R-->6P
6R-->M
6R-->11
6R-->1P
6R-->3F
6R-->8Z
6S-->6J
6S-->6L
6S-->6N
6S-->6P
6S-->6R
6U-->65
6U-->6N
6U-->M
6U-->8Z
6V-->A
6V-->M
6V-->11
6V-->1P
6W-->6R
6X-->6S
6X-->6V
6X-->6W
6X-->6Y
6Y-->M
71-->73
71-->75
71-->77
71-->79
73-->75
73-->77
73-->79
73-->8Z
75-->1D
75-->1P
75-->3Z
75-->8Z
77-->M
77-->1D
77-->1P
77-->3Z
77-->8Z
77-->A0
79-->M
79-->1P
79-->3Z
79-->8Z
79-->A0
7A-->71
7A-->7B
7B-->73
7E-->7G
7G-->18
7G-->2K
7G-->5G
7G-->8Z
7H-->7E
7H-->7I
7I-->7G
7M-->M
7M-->1P
7M-->2P
7M-->8Z
7M-->A0
7N-->7P
7N-->7R
7N-->7T
7N-->7V
7N-->7X
7P-->1P
7P-->8Z
7R-->7M
7R-->M
7R-->1P
7R-->2P
7R-->3Z
7R-->8Z
7T-->7Z
7T-->1P
7T-->8Z
7T-->A0
7V-->7Z
7V-->7P
7V-->7R
7V-->7T
7V-->7X
7V-->M
7V-->1P
7V-->2T
7V-->3Z
7V-->8Z
7V-->A0
7X-->1P
7X-->2T
7X-->8Z
7X-->A0
7Y-->80
7Z-->M
7Z-->2T
80-->7V
85-->83
85-->84
85-->86
86-->A0
89-->A0
8B-->A0
8D-->A0
8E-->A0
8G-->A0
8I-->A0
8K-->8G
8K-->93
8K-->97
8K-->9P
8M-->8Q
8M-->A0
8O-->A0
8Q-->A0
8S-->8W
8S-->9P
8U-->A0
8W-->A0
8Z-->89
8Z-->8B
8Z-->8D
8Z-->8E
8Z-->8G
8Z-->8I
8Z-->8K
8Z-->8M
8Z-->8O
8Z-->8Q
8Z-->8S
8Z-->8U
8Z-->8W
8Z-->8Y
8Z-->91
8Z-->93
8Z-->95
8Z-->97
8Z-->99
8Z-->9B
8Z-->9D
8Z-->9F
8Z-->9H
8Z-->9J
8Z-->9L
8Z-->9N
8Z-->9P
91-->A0
93-->A0
95-->8W
97-->A0
99-->8W
99-->9P
9B-->8G
9B-->8W
9B-->9P
9B-->A0
9D-->A0
9F-->8G
9F-->8M
9F-->8W
9H-->A0
9J-->9P
9J-->A0
9L-->A0
9N-->A0
9P-->A0
A0-->9R
A0-->9S
A0-->9T
A0-->9U
A0-->9V
A0-->9W
A0-->9X
A0-->9Y
A0-->9Z
A0-->A1
A0-->A2
A0-->A3
A0-->A4
A0-->A5
A0-->A6
A0-->A7
A0-->A8
A0-->AC
A0-->AD
A5-->9T
```
