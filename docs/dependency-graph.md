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
- 274 leaf nodes, 732 edges.
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
5T["data-management.routes.ts"]
5U["index.ts"]
end
subgraph 5V["feature-help"]
subgraph 5W["components"]
subgraph 5X["faq-page"]
5Y["faq-page.component.ts"]
end
subgraph 5Z["guide-detail"]
60["guide-detail.component.ts"]
end
subgraph 61["guides-index"]
62["guides-index.component.ts"]
end
63["index.ts"]
end
subgraph 64["data"]
65["faq.ts"]
66["guides.ts"]
end
67["help.routes.ts"]
68["index.ts"]
end
subgraph 69["feature-home"]
subgraph 6A["components"]
subgraph 6B["home-landing"]
6C["home-landing.component.ts"]
end
6D["index.ts"]
end
6E["home.routes.ts"]
6F["index.ts"]
end
subgraph 6G["feature-import"]
6H["column-mapping.ts"]
subgraph 6I["components"]
subgraph 6J["account-draft-editor"]
6K["account-draft-editor.component.ts"]
end
subgraph 6L["batch-wait-card"]
6M["batch-wait-card.component.ts"]
end
subgraph 6N["column-map-amount-field"]
6O["column-map-amount-field.component.ts"]
end
subgraph 6P["column-map-counterparty-field"]
6Q["column-map-counterparty-field.component.ts"]
end
subgraph 6R["column-map-sample-caption"]
6S["column-map-sample-caption.component.ts"]
end
subgraph 6T["column-map-simple-field"]
6U["column-map-simple-field.component.ts"]
end
subgraph 6V["column-map-stepper"]
6W["column-map-stepper.component.ts"]
end
subgraph 6X["column-map-summary-step"]
6Y["column-map-summary-step.component.ts"]
end
subgraph 6Z["import-map-step"]
70["import-map-step.component.ts"]
end
subgraph 71["import-preview-step"]
72["import-preview-step.component.ts"]
end
subgraph 73["import-select-step"]
74["import-select-step.component.ts"]
end
subgraph 75["import-summary-step"]
76["import-summary-step.component.ts"]
end
subgraph 77["import-wizard"]
78["import-wizard.component.ts"]
end
79["index.ts"]
subgraph 7A["queued-file-row"]
7B["queued-file-row.component.ts"]
end
end
7C["import-batches.store.ts"]
7D["import-queue.ts"]
7E["import-wizard-session.ts"]
7F["import.routes.ts"]
7G["index.ts"]
7H["mapper-steps.ts"]
7I["mapping-profiles.store.ts"]
end
subgraph 7J["feature-learning"]
subgraph 7K["components"]
7L["index.ts"]
subgraph 7M["learning-overview"]
7N["learning-overview.component.ts"]
end
subgraph 7O["model-status"]
7P["model-status.component.ts"]
end
subgraph 7Q["rule-proposals"]
7R["rule-proposals.component.ts"]
end
subgraph 7S["suggestions-table"]
7T["suggestions-table.component.ts"]
end
end
7U["index.ts"]
7V["learning.routes.ts"]
end
subgraph 7W["feature-settings"]
subgraph 7X["components"]
7Y["index.ts"]
subgraph 7Z["settings-overview"]
80["settings-overview.component.ts"]
end
end
81["index.ts"]
82["settings.routes.ts"]
end
subgraph 83["feature-transactions"]
subgraph 84["components"]
subgraph 85["attribution-override-fieldset"]
86["attribution-override-fieldset.component.ts"]
end
subgraph 87["category-select-cell"]
88["category-select-cell.component.ts"]
end
89["index.ts"]
subgraph 8A["transaction-bulk-bar"]
8B["transaction-bulk-bar.component.ts"]
end
subgraph 8C["transaction-edit-form"]
8D["transaction-edit-form.component.ts"]
end
subgraph 8E["transaction-filters"]
8F["transaction-filters.component.ts"]
end
subgraph 8G["transaction-row"]
8H["transaction-row.component.ts"]
end
subgraph 8I["transactions-overview"]
8J["transactions-overview.component.ts"]
end
subgraph 8K["transfer-review"]
8L["transfer-review.component.ts"]
end
end
8M["index.ts"]
8N["transaction-filters.ts"]
8O["transaction-row-vm.ts"]
8P["transactions.routes.ts"]
end
subgraph 8Q["shared"]
subgraph 8R["echarts"]
8S["chart-theme.ts"]
8T["echarts-setup.ts"]
8U["index.ts"]
8V["tooltip-formatter.ts"]
end
subgraph 8W["ui"]
subgraph 8X["alert"]
8Y["alert.component.ts"]
end
subgraph 8Z["badge"]
90["badge.component.ts"]
end
subgraph 91["bento-grid"]
92["bento-grid.component.ts"]
93["bento-item.component.ts"]
end
subgraph 94["button"]
95["button.component.ts"]
end
subgraph 96["collapse"]
97["collapse.component.ts"]
end
subgraph 98["confirm-dialog"]
99["confirm-dialog.component.ts"]
end
subgraph 9A["date-range-input"]
9B["date-range-input.component.ts"]
end
subgraph 9C["divider"]
9D["divider.component.ts"]
end
subgraph 9E["dropdown"]
9F["dropdown.component.ts"]
end
subgraph 9G["empty-state"]
9H["empty-state.component.ts"]
end
subgraph 9I["fieldset"]
9J["fieldset.component.ts"]
end
subgraph 9K["flex"]
9L["flex.component.ts"]
end
subgraph 9M["granularity-picker"]
9N["granularity-picker.component.ts"]
end
9O["index.ts"]
subgraph 9P["input"]
9Q["input.component.ts"]
end
subgraph 9R["label"]
9S["label.component.ts"]
end
subgraph 9T["loading-skeleton"]
9U["loading-skeleton.component.ts"]
end
subgraph 9V["modal"]
9W["mm-modal.component.ts"]
end
subgraph 9X["page-header"]
9Y["page-header.component.ts"]
end
subgraph 9Z["paginator"]
A0["paginator.component.ts"]
end
subgraph A1["paper"]
A2["paper.component.ts"]
end
subgraph A3["range-grouping-switcher"]
A4["range-grouping-switcher.component.ts"]
end
subgraph A5["select"]
A6["select.component.ts"]
end
subgraph A7["stat-card"]
A8["stat-card.component.ts"]
end
subgraph A9["table"]
AA["table.component.ts"]
end
subgraph AB["tabs"]
AC["tabs.component.ts"]
end
subgraph AD["typography"]
AE["typography.component.ts"]
end
end
subgraph AF["utils"]
AG["confidence-color.ts"]
AH["confirm-state.ts"]
AI["currency-format.ts"]
AJ["currency-symbol-presets.ts"]
AK["daisy-classes.ts"]
AL["date-buckets.ts"]
AM["date-format.pipe.ts"]
AN["date-format.ts"]
AO["debounced-text.ts"]
AP["download-json.ts"]
AQ["fingerprint.ts"]
AR["format-settings.ts"]
AS["iban.ts"]
AT["index.ts"]
AU["locale-presets.ts"]
AV["number-format.ts"]
AW["pagination.ts"]
AX["percentage.ts"]
AY["search-params.ts"]
AZ["selection-model.ts"]
B0["signed-amount.pipe.ts"]
B1["sortable.ts"]
B2["structural-filters.ts"]
B3["theme-hooks.ts"]
subgraph B4["validators"]
B5["iban.validator.ts"]
B6["percentage.validator.ts"]
end
B7["with-archivable.ts"]
B8["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->2W
5-->4
5-->6
6-->N
6-->AT
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
F-->AQ
F-->AR
G-->F
G-->2N
G-->AT
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
U-->AT
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
11-->AT
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->26
15-->95
15-->A4
15-->AE
15-->AT
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
1O-->AT
1P-->N
1P-->2N
1P-->AT
1Q-->1S
1Q-->N
1Q-->AT
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
1W-->AT
1X-->22
1X-->N
1Y-->1X
1Y-->N
1Y-->AT
1Z-->N
20-->1X
20-->2C
20-->N
21-->AT
22-->1Z
22-->23
22-->N
22-->2W
23-->5
23-->N
24-->N
25-->AT
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
2A-->AT
2B-->22
2B-->N
2C-->AT
2D-->AT
2E-->AT
2F-->N
2F-->2W
2G-->22
2G-->N
2G-->AT
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
30-->AT
32-->N
33-->N
34-->N
35-->3H
35-->3J
35-->8U
36-->N
36-->1R
36-->26
36-->AT
39-->9O
39-->AT
3B-->36
3B-->N
3B-->26
3B-->8U
3B-->9O
3B-->AT
3D-->32
3D-->33
3D-->39
3D-->9O
3F-->33
3F-->34
3F-->N
3F-->9O
3F-->AT
3F-->B5
3F-->B6
3H-->39
3H-->3B
3H-->3F
3H-->1R
3H-->9O
3H-->AT
3J-->32
3J-->33
3J-->3D
3J-->3F
3J-->3M
3J-->N
3J-->1R
3J-->9O
3J-->AT
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
3M-->8U
3M-->9O
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
3V-->9O
3V-->AT
3X-->3Q
3X-->N
3X-->9O
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
40-->9O
42-->4B
42-->1R
42-->9O
42-->AT
44-->4A
44-->40
44-->N
44-->1R
44-->9O
46-->4D
46-->4F
46-->9O
46-->AT
48-->4B
48-->4E
48-->4F
48-->42
48-->44
48-->46
48-->N
48-->1R
48-->9O
48-->AT
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
4F-->AT
4H-->4K
4K-->4N
4K-->4O
4K-->4P
4K-->4Q
4K-->9O
4L-->4K
4P-->4N
4Q-->4O
4R-->4H
4R-->4L
4T-->N
4X-->1R
4X-->9O
4X-->AT
4Z-->1R
4Z-->2W
4Z-->9O
4Z-->AT
51-->5N
51-->1R
51-->26
51-->8U
51-->9O
51-->AT
53-->4T
53-->4U
53-->5N
53-->55
53-->1R
53-->9O
53-->AT
55-->4U
55-->9O
57-->5J
57-->5K
57-->N
57-->9O
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
59-->9O
59-->AT
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
5C-->9O
5C-->AT
5E-->5N
5E-->1R
5E-->26
5E-->9O
5E-->AT
5G-->1R
5G-->26
5G-->2W
5G-->8U
5G-->9O
5G-->AT
5I-->5N
5I-->26
5I-->9O
5I-->AT
5J-->5K
5J-->N
5K-->N
5L-->59
5L-->8U
5M-->5A
5M-->5L
5N-->4T
5N-->1R
5N-->26
5N-->2W
5R-->N
5R-->2J
5R-->9O
5R-->AT
5S-->5R
5T-->5R
5U-->5S
5U-->5T
5Y-->65
5Y-->9O
60-->66
60-->9O
62-->66
62-->9O
63-->5Y
63-->60
63-->62
67-->5Y
67-->60
67-->62
68-->63
68-->67
6C-->19
6C-->9O
6D-->6C
6E-->6C
6F-->6D
6F-->6E
6H-->N
6K-->7D
6K-->3N
6K-->9O
6M-->9O
6O-->6S
6O-->9O
6Q-->6S
6Q-->9O
6S-->9O
6U-->6H
6U-->6S
6U-->9O
6W-->7H
6W-->9O
6Y-->6H
6Y-->9O
70-->6H
70-->7H
70-->7I
70-->6O
70-->6Q
70-->6U
70-->6W
70-->6Y
70-->72
70-->N
70-->12
70-->9O
72-->12
72-->9O
72-->AT
74-->7D
74-->7I
74-->7B
74-->N
74-->12
74-->9O
76-->N
76-->9O
78-->7E
78-->6M
78-->70
78-->74
78-->76
78-->1R
78-->9O
79-->70
79-->72
79-->74
79-->76
79-->78
7B-->7D
7B-->6K
7B-->N
7B-->9O
7C-->A
7C-->N
7C-->12
7C-->1R
7D-->N
7E-->6H
7E-->7C
7E-->7D
7E-->7I
7E-->N
7E-->12
7E-->1R
7E-->3N
7F-->78
7G-->6H
7G-->79
7G-->7C
7G-->7D
7G-->7F
7G-->7H
7G-->7I
7H-->6H
7I-->N
7L-->7N
7L-->7P
7L-->7R
7L-->7T
7N-->7P
7N-->7R
7N-->7T
7N-->9O
7P-->1E
7P-->1R
7P-->49
7P-->9O
7R-->N
7R-->1E
7R-->1R
7R-->49
7R-->9O
7R-->AT
7T-->N
7T-->1R
7T-->49
7T-->9O
7T-->AT
7U-->7L
7U-->7V
7V-->7N
7Y-->80
80-->19
80-->1R
80-->2N
80-->5U
80-->9O
80-->AT
81-->7Y
81-->82
82-->80
86-->N
86-->1R
86-->2S
86-->9O
86-->AT
89-->8B
89-->8D
89-->8F
89-->8J
89-->8L
8B-->1R
8B-->9O
8D-->86
8D-->N
8D-->1R
8D-->2S
8D-->49
8D-->9O
8F-->8N
8F-->1R
8F-->9O
8F-->AT
8H-->8O
8H-->88
8H-->9O
8H-->AT
8J-->8N
8J-->8O
8J-->88
8J-->8B
8J-->8D
8J-->8F
8J-->8H
8J-->8L
8J-->N
8J-->1R
8J-->2W
8J-->49
8J-->9O
8J-->AT
8L-->1R
8L-->2W
8L-->9O
8L-->AT
8M-->8P
8N-->N
8N-->2W
8O-->N
8P-->8J
8U-->8S
8U-->8T
8U-->8V
8V-->AT
8Y-->AT
90-->AT
92-->AT
93-->AT
95-->AT
97-->AT
99-->95
99-->9S
99-->9W
99-->AE
9B-->9F
9B-->AT
9D-->AT
9F-->AT
9H-->9L
9H-->AE
9J-->AT
9L-->AT
9O-->8Y
9O-->90
9O-->92
9O-->93
9O-->95
9O-->97
9O-->99
9O-->9B
9O-->9D
9O-->9F
9O-->9H
9O-->9J
9O-->9L
9O-->9N
9O-->9Q
9O-->9S
9O-->9U
9O-->9W
9O-->9Y
9O-->A0
9O-->A2
9O-->A4
9O-->A6
9O-->A8
9O-->AA
9O-->AC
9O-->AE
9Q-->AT
9S-->AT
9U-->9L
9W-->AT
9Y-->9L
9Y-->AE
A0-->95
A0-->9L
A0-->AE
A0-->AT
A2-->AT
A4-->95
A4-->9B
A4-->9L
A6-->AT
A8-->AE
A8-->AT
AA-->AT
AC-->AT
AE-->AT
AI-->AR
AL-->AR
AM-->AN
AN-->AR
AT-->AG
AT-->AH
AT-->AI
AT-->AJ
AT-->AK
AT-->AL
AT-->AN
AT-->AM
AT-->AO
AT-->AP
AT-->AQ
AT-->AR
AT-->AS
AT-->AU
AT-->AV
AT-->AW
AT-->AX
AT-->AY
AT-->AZ
AT-->B0
AT-->B1
AT-->B2
AT-->B3
AT-->B7
AT-->B8
AV-->AR
B0-->AI
```
