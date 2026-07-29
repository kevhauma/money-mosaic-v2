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
- 273 leaf nodes, 730 edges.
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
32["account-card-vm.ts"]
33["account-icons.ts"]
34["account-types.ts"]
35["accounts.routes.ts"]
36["balance-trend-signals.ts"]
subgraph 37["components"]
subgraph 38["account-balance-block"]
39["account-balance-block.component.ts"]
end
subgraph 3A["account-balance-chart"]
3B["account-balance-chart.component.ts"]
end
subgraph 3C["account-card"]
3D["account-card.component.ts"]
end
subgraph 3E["account-form"]
3F["account-form.component.ts"]
end
subgraph 3G["accounts-detail"]
3H["accounts-detail.component.ts"]
end
subgraph 3I["accounts-overview"]
3J["accounts-overview.component.ts"]
end
3K["index.ts"]
subgraph 3L["net-worth-history-chart"]
3M["net-worth-history-chart.component.ts"]
end
end
3N["index.ts"]
end
subgraph 3O["feature-categories"]
3P["categories.routes.ts"]
3Q["category-icons.ts"]
3R["category-model.service.ts"]
3S["category-model.store.ts"]
subgraph 3T["components"]
subgraph 3U["categories-overview"]
3V["categories-overview.component.ts"]
end
subgraph 3W["category-form"]
3X["category-form.component.ts"]
end
3Y["index.ts"]
subgraph 3Z["rule-condition-row"]
40["rule-condition-row.component.ts"]
end
subgraph 41["rule-filters"]
42["rule-filters.component.ts"]
end
subgraph 43["rule-form"]
44["rule-form.component.ts"]
end
subgraph 45["rule-share-bar"]
46["rule-share-bar.component.ts"]
end
subgraph 47["rules-overview"]
48["rules-overview.component.ts"]
end
end
49["index.ts"]
4A["rule-condition-editor.ts"]
4B["rule-filters.ts"]
4C["rule-labels.ts"]
4D["rule-share.ts"]
4E["rule-summary.ts"]
4F["rules.store.ts"]
end
subgraph 4G["feature-changelog"]
4H["changelog.routes.ts"]
subgraph 4I["components"]
subgraph 4J["changelog-page"]
4K["changelog-page.component.ts"]
end
4L["index.ts"]
end
subgraph 4M["data"]
4N["changelog-entries.ts"]
4O["roadmap-entries.ts"]
end
4P["group-changelog-entries.ts"]
4Q["group-roadmap-entries.ts"]
4R["index.ts"]
end
subgraph 4S["feature-dashboard"]
4T["category-comparison-settings.store.ts"]
4U["category-comparison-vm.ts"]
subgraph 4V["components"]
subgraph 4W["account-balance-strip"]
4X["account-balance-strip.component.ts"]
end
subgraph 4Y["action-queue-panel"]
4Z["action-queue-panel.component.ts"]
end
subgraph 50["category-breakdown-panel"]
51["category-breakdown-panel.component.ts"]
end
subgraph 52["category-comparison-panel"]
53["category-comparison-panel.component.ts"]
end
subgraph 54["comparison-category-card"]
55["comparison-category-card.component.ts"]
end
subgraph 56["dashboard-customize-panel"]
57["dashboard-customize-panel.component.ts"]
end
subgraph 58["dashboard-overview"]
59["dashboard-overview.component.ts"]
end
5A["index.ts"]
subgraph 5B["net-worth-header"]
5C["net-worth-header.component.ts"]
end
subgraph 5D["top-transactions-panel"]
5E["top-transactions-panel.component.ts"]
end
subgraph 5F["trend-chart-panel"]
5G["trend-chart-panel.component.ts"]
end
subgraph 5H["weekday-weekend-split-panel"]
5I["weekday-weekend-split-panel.component.ts"]
end
end
5J["dashboard-layout-settings.store.ts"]
5K["dashboard-row-order.ts"]
5L["dashboard.routes.ts"]
5M["index.ts"]
5N["stats.store.ts"]
end
subgraph 5O["feature-data-management"]
subgraph 5P["components"]
subgraph 5Q["data-management-overview"]
5R["data-management-overview.component.ts"]
end
5S["index.ts"]
end
5T["index.ts"]
end
subgraph 5U["feature-help"]
subgraph 5V["components"]
subgraph 5W["faq-page"]
5X["faq-page.component.ts"]
end
subgraph 5Y["guide-detail"]
5Z["guide-detail.component.ts"]
end
subgraph 60["guides-index"]
61["guides-index.component.ts"]
end
62["index.ts"]
end
subgraph 63["data"]
64["faq.ts"]
65["guides.ts"]
end
66["help.routes.ts"]
67["index.ts"]
end
subgraph 68["feature-home"]
subgraph 69["components"]
subgraph 6A["home-landing"]
6B["home-landing.component.ts"]
end
6C["index.ts"]
end
6D["home.routes.ts"]
6E["index.ts"]
end
subgraph 6F["feature-import"]
6G["column-mapping.ts"]
subgraph 6H["components"]
subgraph 6I["account-draft-editor"]
6J["account-draft-editor.component.ts"]
end
subgraph 6K["batch-wait-card"]
6L["batch-wait-card.component.ts"]
end
subgraph 6M["column-map-amount-field"]
6N["column-map-amount-field.component.ts"]
end
subgraph 6O["column-map-counterparty-field"]
6P["column-map-counterparty-field.component.ts"]
end
subgraph 6Q["column-map-sample-caption"]
6R["column-map-sample-caption.component.ts"]
end
subgraph 6S["column-map-simple-field"]
6T["column-map-simple-field.component.ts"]
end
subgraph 6U["column-map-stepper"]
6V["column-map-stepper.component.ts"]
end
subgraph 6W["column-map-summary-step"]
6X["column-map-summary-step.component.ts"]
end
subgraph 6Y["import-map-step"]
6Z["import-map-step.component.ts"]
end
subgraph 70["import-preview-step"]
71["import-preview-step.component.ts"]
end
subgraph 72["import-select-step"]
73["import-select-step.component.ts"]
end
subgraph 74["import-summary-step"]
75["import-summary-step.component.ts"]
end
subgraph 76["import-wizard"]
77["import-wizard.component.ts"]
end
78["index.ts"]
subgraph 79["queued-file-row"]
7A["queued-file-row.component.ts"]
end
end
7B["import-batches.store.ts"]
7C["import-queue.ts"]
7D["import-wizard-session.ts"]
7E["import.routes.ts"]
7F["index.ts"]
7G["mapper-steps.ts"]
7H["mapping-profiles.store.ts"]
end
subgraph 7I["feature-learning"]
subgraph 7J["components"]
7K["index.ts"]
subgraph 7L["learning-overview"]
7M["learning-overview.component.ts"]
end
subgraph 7N["model-status"]
7O["model-status.component.ts"]
end
subgraph 7P["rule-proposals"]
7Q["rule-proposals.component.ts"]
end
subgraph 7R["suggestions-table"]
7S["suggestions-table.component.ts"]
end
end
7T["index.ts"]
7U["learning.routes.ts"]
end
subgraph 7V["feature-settings"]
subgraph 7W["components"]
7X["index.ts"]
subgraph 7Y["settings-overview"]
7Z["settings-overview.component.ts"]
end
end
80["index.ts"]
81["settings.routes.ts"]
end
subgraph 82["feature-transactions"]
subgraph 83["components"]
subgraph 84["attribution-override-fieldset"]
85["attribution-override-fieldset.component.ts"]
end
subgraph 86["category-select-cell"]
87["category-select-cell.component.ts"]
end
88["index.ts"]
subgraph 89["transaction-bulk-bar"]
8A["transaction-bulk-bar.component.ts"]
end
subgraph 8B["transaction-edit-form"]
8C["transaction-edit-form.component.ts"]
end
subgraph 8D["transaction-filters"]
8E["transaction-filters.component.ts"]
end
subgraph 8F["transaction-row"]
8G["transaction-row.component.ts"]
end
subgraph 8H["transactions-overview"]
8I["transactions-overview.component.ts"]
end
subgraph 8J["transfer-review"]
8K["transfer-review.component.ts"]
end
end
8L["index.ts"]
8M["transaction-filters.ts"]
8N["transaction-row-vm.ts"]
8O["transactions.routes.ts"]
end
subgraph 8P["shared"]
subgraph 8Q["echarts"]
8R["chart-theme.ts"]
8S["echarts-setup.ts"]
8T["index.ts"]
8U["tooltip-formatter.ts"]
end
subgraph 8V["ui"]
subgraph 8W["alert"]
8X["alert.component.ts"]
end
subgraph 8Y["badge"]
8Z["badge.component.ts"]
end
subgraph 90["bento-grid"]
91["bento-grid.component.ts"]
92["bento-item.component.ts"]
end
subgraph 93["button"]
94["button.component.ts"]
end
subgraph 95["collapse"]
96["collapse.component.ts"]
end
subgraph 97["confirm-dialog"]
98["confirm-dialog.component.ts"]
end
subgraph 99["date-range-input"]
9A["date-range-input.component.ts"]
end
subgraph 9B["divider"]
9C["divider.component.ts"]
end
subgraph 9D["dropdown"]
9E["dropdown.component.ts"]
end
subgraph 9F["empty-state"]
9G["empty-state.component.ts"]
end
subgraph 9H["fieldset"]
9I["fieldset.component.ts"]
end
subgraph 9J["flex"]
9K["flex.component.ts"]
end
subgraph 9L["granularity-picker"]
9M["granularity-picker.component.ts"]
end
9N["index.ts"]
subgraph 9O["input"]
9P["input.component.ts"]
end
subgraph 9Q["label"]
9R["label.component.ts"]
end
subgraph 9S["loading-skeleton"]
9T["loading-skeleton.component.ts"]
end
subgraph 9U["modal"]
9V["mm-modal.component.ts"]
end
subgraph 9W["page-header"]
9X["page-header.component.ts"]
end
subgraph 9Y["paginator"]
9Z["paginator.component.ts"]
end
subgraph A0["paper"]
A1["paper.component.ts"]
end
subgraph A2["range-grouping-switcher"]
A3["range-grouping-switcher.component.ts"]
end
subgraph A4["select"]
A5["select.component.ts"]
end
subgraph A6["stat-card"]
A7["stat-card.component.ts"]
end
subgraph A8["table"]
A9["table.component.ts"]
end
subgraph AA["tabs"]
AB["tabs.component.ts"]
end
subgraph AC["typography"]
AD["typography.component.ts"]
end
end
subgraph AE["utils"]
AF["confidence-color.ts"]
AG["confirm-state.ts"]
AH["currency-format.ts"]
AI["currency-symbol-presets.ts"]
AJ["daisy-classes.ts"]
AK["date-buckets.ts"]
AL["date-format.pipe.ts"]
AM["date-format.ts"]
AN["debounced-text.ts"]
AO["download-json.ts"]
AP["fingerprint.ts"]
AQ["format-settings.ts"]
AR["iban.ts"]
AS["index.ts"]
AT["locale-presets.ts"]
AU["number-format.ts"]
AV["pagination.ts"]
AW["percentage.ts"]
AX["search-params.ts"]
AY["selection-model.ts"]
AZ["signed-amount.pipe.ts"]
B0["sortable.ts"]
B1["structural-filters.ts"]
B2["theme-hooks.ts"]
subgraph B3["validators"]
B4["iban.validator.ts"]
B5["percentage.validator.ts"]
end
B6["with-archivable.ts"]
B7["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->2W
5-->4
5-->6
6-->N
6-->AS
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
F-->AP
F-->AQ
G-->F
G-->2N
G-->AS
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
U-->AS
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
11-->AS
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->26
15-->94
15-->A3
15-->AD
15-->AS
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
1O-->AS
1P-->N
1P-->2N
1P-->AS
1Q-->1S
1Q-->N
1Q-->AS
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
1W-->AS
1X-->22
1X-->N
1Y-->1X
1Y-->N
1Y-->AS
1Z-->N
20-->1X
20-->2C
20-->N
21-->AS
22-->1Z
22-->23
22-->N
22-->2W
23-->5
23-->N
24-->N
25-->AS
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
2A-->AS
2B-->22
2B-->N
2C-->AS
2D-->AS
2E-->AS
2F-->N
2F-->2W
2G-->22
2G-->N
2G-->AS
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
30-->AS
32-->N
33-->N
34-->N
35-->3H
35-->3J
35-->8T
36-->N
36-->1R
36-->26
36-->AS
39-->9N
39-->AS
3B-->36
3B-->N
3B-->26
3B-->8T
3B-->9N
3B-->AS
3D-->32
3D-->33
3D-->39
3D-->9N
3F-->33
3F-->34
3F-->N
3F-->9N
3F-->AS
3F-->B4
3F-->B5
3H-->39
3H-->3B
3H-->3F
3H-->1R
3H-->9N
3H-->AS
3J-->32
3J-->33
3J-->3D
3J-->3F
3J-->3M
3J-->N
3J-->1R
3J-->9N
3J-->AS
3K-->39
3K-->3B
3K-->3D
3K-->3F
3K-->3H
3K-->3J
3K-->3M
3M-->36
3M-->N
3M-->1R
3M-->26
3M-->8T
3M-->9N
3N-->33
3N-->34
3N-->35
3N-->3K
3P-->3V
3P-->48
3R-->1E
3S-->3R
3S-->4F
3S-->N
3S-->1E
3S-->1R
3V-->3Q
3V-->3X
3V-->N
3V-->1R
3V-->9N
3V-->AS
3X-->3Q
3X-->N
3X-->9N
3Y-->3V
3Y-->3X
3Y-->42
3Y-->44
3Y-->46
3Y-->48
40-->4A
40-->4C
40-->A
40-->N
40-->1R
40-->9N
42-->4B
42-->1R
42-->9N
42-->AS
44-->4A
44-->40
44-->N
44-->1R
44-->9N
46-->4D
46-->4F
46-->9N
46-->AS
48-->4B
48-->4E
48-->4F
48-->42
48-->44
48-->46
48-->N
48-->1R
48-->9N
48-->AS
49-->3P
49-->3Q
49-->3R
49-->3S
49-->3Y
49-->4B
49-->4E
49-->4F
4A-->4C
4A-->N
4B-->4E
4B-->N
4C-->N
4D-->N
4E-->4C
4E-->N
4F-->4D
4F-->A
4F-->N
4F-->1R
4F-->AS
4H-->4K
4K-->4N
4K-->4O
4K-->4P
4K-->4Q
4K-->9N
4L-->4K
4P-->4N
4Q-->4O
4R-->4H
4R-->4L
4T-->N
4X-->1R
4X-->9N
4X-->AS
4Z-->1R
4Z-->2W
4Z-->9N
4Z-->AS
51-->5N
51-->1R
51-->26
51-->8T
51-->9N
51-->AS
53-->4T
53-->4U
53-->5N
53-->55
53-->1R
53-->9N
53-->AS
55-->4U
55-->9N
57-->5J
57-->5K
57-->N
57-->9N
59-->5J
59-->5K
59-->5N
59-->4X
59-->4Z
59-->51
59-->53
59-->57
59-->5C
59-->5E
59-->5G
59-->5I
59-->1R
59-->26
59-->9N
59-->AS
5A-->4X
5A-->4Z
5A-->51
5A-->53
5A-->57
5A-->59
5A-->5C
5A-->5E
5A-->5G
5A-->5I
5C-->1R
5C-->9N
5C-->AS
5E-->5N
5E-->1R
5E-->26
5E-->9N
5E-->AS
5G-->1R
5G-->26
5G-->2W
5G-->8T
5G-->9N
5G-->AS
5I-->5N
5I-->26
5I-->9N
5I-->AS
5J-->5K
5J-->N
5K-->N
5L-->59
5L-->8T
5M-->5A
5M-->5L
5N-->4T
5N-->1R
5N-->26
5N-->2W
5R-->N
5R-->2J
5R-->9N
5R-->AS
5S-->5R
5T-->5S
5X-->64
5X-->9N
5Z-->65
5Z-->9N
61-->65
61-->9N
62-->5X
62-->5Z
62-->61
66-->5X
66-->5Z
66-->61
67-->62
67-->66
6B-->19
6B-->9N
6C-->6B
6D-->6B
6E-->6C
6E-->6D
6G-->N
6J-->7C
6J-->3N
6J-->9N
6L-->9N
6N-->6R
6N-->9N
6P-->6R
6P-->9N
6R-->9N
6T-->6G
6T-->6R
6T-->9N
6V-->7G
6V-->9N
6X-->6G
6X-->9N
6Z-->6G
6Z-->7G
6Z-->7H
6Z-->6N
6Z-->6P
6Z-->6T
6Z-->6V
6Z-->6X
6Z-->71
6Z-->N
6Z-->12
6Z-->9N
71-->12
71-->9N
71-->AS
73-->7C
73-->7H
73-->7A
73-->N
73-->12
73-->9N
75-->N
75-->9N
77-->7D
77-->6L
77-->6Z
77-->73
77-->75
77-->1R
77-->9N
78-->6Z
78-->71
78-->73
78-->75
78-->77
7A-->7C
7A-->6J
7A-->N
7A-->9N
7B-->A
7B-->N
7B-->12
7B-->1R
7C-->N
7D-->6G
7D-->7B
7D-->7C
7D-->7H
7D-->N
7D-->12
7D-->1R
7D-->3N
7E-->77
7F-->6G
7F-->78
7F-->7B
7F-->7C
7F-->7E
7F-->7G
7F-->7H
7G-->6G
7H-->N
7K-->7M
7K-->7O
7K-->7Q
7K-->7S
7M-->7O
7M-->7Q
7M-->7S
7M-->9N
7O-->1E
7O-->1R
7O-->49
7O-->9N
7Q-->N
7Q-->1E
7Q-->1R
7Q-->49
7Q-->9N
7Q-->AS
7S-->N
7S-->1R
7S-->49
7S-->9N
7S-->AS
7T-->7K
7T-->7U
7U-->7M
7X-->7Z
7Z-->19
7Z-->1R
7Z-->2N
7Z-->5T
7Z-->9N
7Z-->AS
80-->7X
80-->81
81-->7Z
85-->N
85-->1R
85-->2S
85-->9N
85-->AS
88-->8A
88-->8C
88-->8E
88-->8I
88-->8K
8A-->1R
8A-->9N
8C-->85
8C-->N
8C-->1R
8C-->2S
8C-->49
8C-->9N
8E-->8M
8E-->1R
8E-->9N
8E-->AS
8G-->8N
8G-->87
8G-->9N
8G-->AS
8I-->8M
8I-->8N
8I-->87
8I-->8A
8I-->8C
8I-->8E
8I-->8G
8I-->8K
8I-->N
8I-->1R
8I-->2W
8I-->49
8I-->9N
8I-->AS
8K-->1R
8K-->2W
8K-->9N
8K-->AS
8L-->8O
8M-->N
8M-->2W
8N-->N
8O-->8I
8T-->8R
8T-->8S
8T-->8U
8U-->AS
8X-->AS
8Z-->AS
91-->AS
92-->AS
94-->AS
96-->AS
98-->94
98-->9R
98-->9V
98-->AD
9A-->9E
9A-->AS
9C-->AS
9E-->AS
9G-->9K
9G-->AD
9I-->AS
9K-->AS
9N-->8X
9N-->8Z
9N-->91
9N-->92
9N-->94
9N-->96
9N-->98
9N-->9A
9N-->9C
9N-->9E
9N-->9G
9N-->9I
9N-->9K
9N-->9M
9N-->9P
9N-->9R
9N-->9T
9N-->9V
9N-->9X
9N-->9Z
9N-->A1
9N-->A3
9N-->A5
9N-->A7
9N-->A9
9N-->AB
9N-->AD
9P-->AS
9R-->AS
9T-->9K
9V-->AS
9X-->9K
9X-->AD
9Z-->94
9Z-->9K
9Z-->AD
9Z-->AS
A1-->AS
A3-->94
A3-->9A
A3-->9K
A5-->AS
A7-->AD
A7-->AS
A9-->AS
AB-->AS
AD-->AS
AH-->AQ
AK-->AQ
AL-->AM
AM-->AQ
AS-->AF
AS-->AG
AS-->AH
AS-->AI
AS-->AJ
AS-->AK
AS-->AM
AS-->AL
AS-->AN
AS-->AO
AS-->AP
AS-->AQ
AS-->AR
AS-->AT
AS-->AU
AS-->AV
AS-->AW
AS-->AX
AS-->AY
AS-->AZ
AS-->B0
AS-->B1
AS-->B2
AS-->B6
AS-->B7
AU-->AQ
AZ-->AH
```
