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
- 268 leaf nodes, 712 edges.
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
subgraph 38["account-balance-chart"]
39["account-balance-chart.component.ts"]
end
subgraph 3A["account-card"]
3B["account-card.component.ts"]
end
subgraph 3C["account-form"]
3D["account-form.component.ts"]
end
subgraph 3E["accounts-detail"]
3F["accounts-detail.component.ts"]
end
subgraph 3G["accounts-overview"]
3H["accounts-overview.component.ts"]
end
3I["index.ts"]
subgraph 3J["net-worth-history-chart"]
3K["net-worth-history-chart.component.ts"]
end
end
3L["index.ts"]
end
subgraph 3M["feature-categories"]
3N["categories.routes.ts"]
3O["category-icons.ts"]
3P["category-model.service.ts"]
3Q["category-model.store.ts"]
subgraph 3R["components"]
subgraph 3S["categories-overview"]
3T["categories-overview.component.ts"]
end
subgraph 3U["category-form"]
3V["category-form.component.ts"]
end
3W["index.ts"]
subgraph 3X["rule-filters"]
3Y["rule-filters.component.ts"]
end
subgraph 3Z["rule-form"]
40["rule-form.component.ts"]
end
subgraph 41["rule-share-bar"]
42["rule-share-bar.component.ts"]
end
subgraph 43["rules-overview"]
44["rules-overview.component.ts"]
end
end
45["index.ts"]
46["rule-filters.ts"]
47["rule-labels.ts"]
48["rule-share.ts"]
49["rule-summary.ts"]
4A["rules.store.ts"]
end
subgraph 4B["feature-changelog"]
4C["changelog.routes.ts"]
subgraph 4D["components"]
subgraph 4E["changelog-page"]
4F["changelog-page.component.ts"]
end
4G["index.ts"]
end
subgraph 4H["data"]
4I["changelog-entries.ts"]
4J["roadmap-entries.ts"]
end
4K["group-changelog-entries.ts"]
4L["group-roadmap-entries.ts"]
4M["index.ts"]
end
subgraph 4N["feature-dashboard"]
4O["category-comparison-settings.store.ts"]
4P["category-comparison-vm.ts"]
subgraph 4Q["components"]
subgraph 4R["account-balance-strip"]
4S["account-balance-strip.component.ts"]
end
subgraph 4T["action-queue-panel"]
4U["action-queue-panel.component.ts"]
end
subgraph 4V["category-breakdown-panel"]
4W["category-breakdown-panel.component.ts"]
end
subgraph 4X["category-comparison-panel"]
4Y["category-comparison-panel.component.ts"]
end
subgraph 4Z["comparison-category-card"]
50["comparison-category-card.component.ts"]
end
subgraph 51["dashboard-customize-panel"]
52["dashboard-customize-panel.component.ts"]
end
subgraph 53["dashboard-overview"]
54["dashboard-overview.component.ts"]
end
55["index.ts"]
subgraph 56["net-worth-header"]
57["net-worth-header.component.ts"]
end
subgraph 58["top-transactions-panel"]
59["top-transactions-panel.component.ts"]
end
subgraph 5A["trend-chart-panel"]
5B["trend-chart-panel.component.ts"]
end
subgraph 5C["weekday-weekend-split-panel"]
5D["weekday-weekend-split-panel.component.ts"]
end
end
5E["dashboard-layout-settings.store.ts"]
5F["dashboard-row-order.ts"]
5G["dashboard.routes.ts"]
5H["index.ts"]
5I["stats.store.ts"]
end
subgraph 5J["feature-data-management"]
subgraph 5K["components"]
subgraph 5L["data-management-overview"]
5M["data-management-overview.component.ts"]
end
5N["index.ts"]
end
5O["data-management.routes.ts"]
5P["index.ts"]
end
subgraph 5Q["feature-help"]
subgraph 5R["components"]
subgraph 5S["faq-page"]
5T["faq-page.component.ts"]
end
subgraph 5U["guide-detail"]
5V["guide-detail.component.ts"]
end
subgraph 5W["guides-index"]
5X["guides-index.component.ts"]
end
5Y["index.ts"]
end
subgraph 5Z["data"]
60["faq.ts"]
61["guides.ts"]
end
62["help.routes.ts"]
63["index.ts"]
end
subgraph 64["feature-home"]
subgraph 65["components"]
subgraph 66["home-landing"]
67["home-landing.component.ts"]
end
68["index.ts"]
end
69["home.routes.ts"]
6A["index.ts"]
end
subgraph 6B["feature-import"]
6C["column-mapping.ts"]
subgraph 6D["components"]
subgraph 6E["account-draft-editor"]
6F["account-draft-editor.component.ts"]
end
subgraph 6G["batch-wait-card"]
6H["batch-wait-card.component.ts"]
end
subgraph 6I["column-map-amount-field"]
6J["column-map-amount-field.component.ts"]
end
subgraph 6K["column-map-counterparty-field"]
6L["column-map-counterparty-field.component.ts"]
end
subgraph 6M["column-map-sample-caption"]
6N["column-map-sample-caption.component.ts"]
end
subgraph 6O["column-map-simple-field"]
6P["column-map-simple-field.component.ts"]
end
subgraph 6Q["column-map-stepper"]
6R["column-map-stepper.component.ts"]
end
subgraph 6S["column-map-summary-step"]
6T["column-map-summary-step.component.ts"]
end
subgraph 6U["import-map-step"]
6V["import-map-step.component.ts"]
end
subgraph 6W["import-preview-step"]
6X["import-preview-step.component.ts"]
end
subgraph 6Y["import-select-step"]
6Z["import-select-step.component.ts"]
end
subgraph 70["import-summary-step"]
71["import-summary-step.component.ts"]
end
subgraph 72["import-wizard"]
73["import-wizard.component.ts"]
end
74["index.ts"]
subgraph 75["queued-file-row"]
76["queued-file-row.component.ts"]
end
end
77["import-batches.store.ts"]
78["import-queue.ts"]
79["import-wizard-session.ts"]
7A["import.routes.ts"]
7B["index.ts"]
7C["mapper-steps.ts"]
7D["mapping-profiles.store.ts"]
end
subgraph 7E["feature-learning"]
subgraph 7F["components"]
7G["index.ts"]
subgraph 7H["learning-overview"]
7I["learning-overview.component.ts"]
end
subgraph 7J["model-status"]
7K["model-status.component.ts"]
end
subgraph 7L["rule-proposals"]
7M["rule-proposals.component.ts"]
end
subgraph 7N["suggestions-table"]
7O["suggestions-table.component.ts"]
end
end
7P["index.ts"]
7Q["learning.routes.ts"]
end
subgraph 7R["feature-settings"]
subgraph 7S["components"]
7T["index.ts"]
subgraph 7U["settings-overview"]
7V["settings-overview.component.ts"]
end
end
7W["index.ts"]
7X["settings.routes.ts"]
end
subgraph 7Y["feature-transactions"]
subgraph 7Z["components"]
subgraph 80["attribution-override-fieldset"]
81["attribution-override-fieldset.component.ts"]
end
82["index.ts"]
subgraph 83["transaction-bulk-bar"]
84["transaction-bulk-bar.component.ts"]
end
subgraph 85["transaction-edit-form"]
86["transaction-edit-form.component.ts"]
end
subgraph 87["transaction-filters"]
88["transaction-filters.component.ts"]
end
subgraph 89["transactions-overview"]
8A["transactions-overview.component.ts"]
end
subgraph 8B["transfer-review"]
8C["transfer-review.component.ts"]
end
end
8D["index.ts"]
8E["transaction-filters.ts"]
8F["transactions.routes.ts"]
end
subgraph 8G["shared"]
subgraph 8H["echarts"]
8I["chart-theme.ts"]
8J["echarts-setup.ts"]
8K["index.ts"]
8L["tooltip-formatter.ts"]
end
subgraph 8M["ui"]
subgraph 8N["alert"]
8O["alert.component.ts"]
end
subgraph 8P["badge"]
8Q["badge.component.ts"]
end
subgraph 8R["bento-grid"]
8S["bento-grid.component.ts"]
8T["bento-item.component.ts"]
end
subgraph 8U["button"]
8V["button.component.ts"]
end
subgraph 8W["collapse"]
8X["collapse.component.ts"]
end
subgraph 8Y["confirm-dialog"]
8Z["confirm-dialog.component.ts"]
end
subgraph 90["date-range-input"]
91["date-range-input.component.ts"]
end
subgraph 92["divider"]
93["divider.component.ts"]
end
subgraph 94["dropdown"]
95["dropdown.component.ts"]
end
subgraph 96["empty-state"]
97["empty-state.component.ts"]
end
subgraph 98["fieldset"]
99["fieldset.component.ts"]
end
subgraph 9A["flex"]
9B["flex.component.ts"]
end
subgraph 9C["granularity-picker"]
9D["granularity-picker.component.ts"]
end
9E["index.ts"]
subgraph 9F["input"]
9G["input.component.ts"]
end
subgraph 9H["label"]
9I["label.component.ts"]
end
subgraph 9J["loading-skeleton"]
9K["loading-skeleton.component.ts"]
end
subgraph 9L["modal"]
9M["mm-modal.component.ts"]
end
subgraph 9N["page-header"]
9O["page-header.component.ts"]
end
subgraph 9P["paginator"]
9Q["paginator.component.ts"]
end
subgraph 9R["paper"]
9S["paper.component.ts"]
end
subgraph 9T["range-grouping-switcher"]
9U["range-grouping-switcher.component.ts"]
end
subgraph 9V["select"]
9W["select.component.ts"]
end
subgraph 9X["stat-card"]
9Y["stat-card.component.ts"]
end
subgraph 9Z["table"]
A0["table.component.ts"]
end
subgraph A1["tabs"]
A2["tabs.component.ts"]
end
subgraph A3["typography"]
A4["typography.component.ts"]
end
end
subgraph A5["utils"]
A6["confidence-color.ts"]
A7["confirm-state.ts"]
A8["currency-format.ts"]
A9["currency-symbol-presets.ts"]
AA["daisy-classes.ts"]
AB["date-buckets.ts"]
AC["date-format.pipe.ts"]
AD["date-format.ts"]
AE["debounced-text.ts"]
AF["download-json.ts"]
AG["fingerprint.ts"]
AH["format-settings.ts"]
AI["iban.ts"]
AJ["index.ts"]
AK["locale-presets.ts"]
AL["number-format.ts"]
AM["pagination.ts"]
AN["percentage.ts"]
AO["search-params.ts"]
AP["selection-model.ts"]
AQ["signed-amount.pipe.ts"]
AR["sortable.ts"]
AS["structural-filters.ts"]
AT["theme-hooks.ts"]
subgraph AU["validators"]
AV["iban.validator.ts"]
AW["percentage.validator.ts"]
end
AX["with-archivable.ts"]
AY["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->2W
5-->4
5-->6
6-->N
6-->AJ
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
F-->AG
F-->AH
G-->F
G-->2N
G-->AJ
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
U-->AJ
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
11-->AJ
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->26
15-->8V
15-->9U
15-->A4
15-->AJ
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
1O-->AJ
1P-->N
1P-->2N
1P-->AJ
1Q-->1S
1Q-->N
1Q-->AJ
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
1W-->AJ
1X-->22
1X-->N
1Y-->1X
1Y-->N
1Y-->AJ
1Z-->N
20-->1X
20-->2C
20-->N
21-->AJ
22-->1Z
22-->23
22-->N
22-->2W
23-->5
23-->N
24-->N
25-->AJ
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
2A-->AJ
2B-->22
2B-->N
2C-->AJ
2D-->AJ
2E-->AJ
2F-->N
2F-->2W
2G-->22
2G-->N
2G-->AJ
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
30-->AJ
32-->N
33-->N
34-->N
35-->3F
35-->3H
35-->8K
36-->N
36-->1R
36-->26
36-->AJ
39-->36
39-->N
39-->26
39-->8K
39-->9E
39-->AJ
3B-->32
3B-->33
3B-->9E
3B-->AJ
3D-->33
3D-->34
3D-->N
3D-->9E
3D-->AJ
3D-->AV
3D-->AW
3F-->39
3F-->3D
3F-->1R
3F-->9E
3F-->AJ
3H-->32
3H-->33
3H-->3B
3H-->3D
3H-->3K
3H-->N
3H-->1R
3H-->9E
3H-->AJ
3I-->39
3I-->3B
3I-->3D
3I-->3F
3I-->3H
3I-->3K
3K-->36
3K-->N
3K-->1R
3K-->26
3K-->8K
3K-->9E
3L-->33
3L-->34
3L-->35
3L-->3I
3N-->3T
3N-->44
3P-->1E
3Q-->3P
3Q-->4A
3Q-->N
3Q-->1E
3Q-->1R
3T-->3O
3T-->3V
3T-->N
3T-->1R
3T-->9E
3T-->AJ
3V-->3O
3V-->N
3V-->9E
3W-->3T
3W-->3V
3W-->3Y
3W-->40
3W-->42
3W-->44
3Y-->46
3Y-->1R
3Y-->9E
3Y-->AJ
40-->47
40-->A
40-->N
40-->1R
40-->9E
42-->48
42-->4A
42-->9E
42-->AJ
44-->46
44-->49
44-->4A
44-->3Y
44-->40
44-->42
44-->N
44-->1R
44-->9E
44-->AJ
45-->3N
45-->3O
45-->3P
45-->3Q
45-->3W
45-->46
45-->49
45-->4A
46-->49
46-->N
47-->N
48-->N
49-->47
49-->N
4A-->48
4A-->A
4A-->N
4A-->1R
4A-->AJ
4C-->4F
4F-->4I
4F-->4J
4F-->4K
4F-->4L
4F-->9E
4G-->4F
4K-->4I
4L-->4J
4M-->4C
4M-->4G
4O-->N
4S-->1R
4S-->9E
4S-->AJ
4U-->1R
4U-->2W
4U-->9E
4U-->AJ
4W-->5I
4W-->1R
4W-->26
4W-->8K
4W-->9E
4W-->AJ
4Y-->4O
4Y-->4P
4Y-->5I
4Y-->50
4Y-->1R
4Y-->9E
4Y-->AJ
50-->4P
50-->9E
52-->5E
52-->5F
52-->N
52-->9E
54-->5E
54-->5F
54-->5I
54-->4S
54-->4U
54-->4W
54-->4Y
54-->52
54-->57
54-->59
54-->5B
54-->5D
54-->1R
54-->26
54-->9E
54-->AJ
55-->4S
55-->4U
55-->4W
55-->4Y
55-->52
55-->54
55-->57
55-->59
55-->5B
55-->5D
57-->1R
57-->9E
57-->AJ
59-->5I
59-->1R
59-->26
59-->9E
59-->AJ
5B-->1R
5B-->26
5B-->2W
5B-->8K
5B-->9E
5B-->AJ
5D-->5I
5D-->26
5D-->9E
5D-->AJ
5E-->5F
5E-->N
5F-->N
5G-->54
5G-->8K
5H-->55
5H-->5G
5I-->4O
5I-->1R
5I-->26
5I-->2W
5M-->N
5M-->2J
5M-->9E
5M-->AJ
5N-->5M
5O-->5M
5P-->5N
5P-->5O
5T-->60
5T-->9E
5V-->61
5V-->9E
5X-->61
5X-->9E
5Y-->5T
5Y-->5V
5Y-->5X
62-->5T
62-->5V
62-->5X
63-->5Y
63-->62
67-->19
67-->9E
68-->67
69-->67
6A-->68
6A-->69
6C-->N
6F-->78
6F-->3L
6F-->9E
6H-->9E
6J-->6N
6J-->9E
6L-->6N
6L-->9E
6N-->9E
6P-->6C
6P-->6N
6P-->9E
6R-->7C
6R-->9E
6T-->6C
6T-->9E
6V-->6C
6V-->7C
6V-->7D
6V-->6J
6V-->6L
6V-->6P
6V-->6R
6V-->6T
6V-->6X
6V-->N
6V-->12
6V-->9E
6X-->12
6X-->9E
6X-->AJ
6Z-->78
6Z-->7D
6Z-->76
6Z-->N
6Z-->12
6Z-->9E
71-->N
71-->9E
73-->79
73-->6H
73-->6V
73-->6Z
73-->71
73-->1R
73-->9E
74-->6V
74-->6X
74-->6Z
74-->71
74-->73
76-->78
76-->6F
76-->N
76-->9E
77-->A
77-->N
77-->12
77-->1R
78-->N
79-->6C
79-->77
79-->78
79-->7D
79-->N
79-->12
79-->1R
79-->3L
7A-->73
7B-->6C
7B-->74
7B-->77
7B-->78
7B-->7A
7B-->7C
7B-->7D
7C-->6C
7D-->N
7G-->7I
7G-->7K
7G-->7M
7G-->7O
7I-->7K
7I-->7M
7I-->7O
7I-->9E
7K-->1E
7K-->1R
7K-->45
7K-->9E
7M-->N
7M-->1E
7M-->1R
7M-->45
7M-->9E
7M-->AJ
7O-->N
7O-->1R
7O-->45
7O-->9E
7O-->AJ
7P-->7G
7P-->7Q
7Q-->7I
7T-->7V
7V-->19
7V-->1R
7V-->2N
7V-->5P
7V-->9E
7V-->AJ
7W-->7T
7W-->7X
7X-->7V
81-->N
81-->1R
81-->2S
81-->9E
81-->AJ
82-->84
82-->86
82-->88
82-->8A
82-->8C
84-->1R
84-->9E
86-->81
86-->N
86-->1R
86-->2S
86-->45
86-->9E
88-->8E
88-->1R
88-->9E
88-->AJ
8A-->8E
8A-->84
8A-->86
8A-->88
8A-->8C
8A-->N
8A-->1R
8A-->2W
8A-->45
8A-->9E
8A-->AJ
8C-->1R
8C-->2W
8C-->9E
8C-->AJ
8D-->8F
8E-->N
8E-->2W
8F-->8A
8K-->8I
8K-->8J
8K-->8L
8L-->AJ
8O-->AJ
8Q-->AJ
8S-->AJ
8T-->AJ
8V-->AJ
8X-->AJ
8Z-->8V
8Z-->9I
8Z-->9M
8Z-->A4
91-->95
91-->AJ
93-->AJ
95-->AJ
97-->9B
97-->A4
99-->AJ
9B-->AJ
9E-->8O
9E-->8Q
9E-->8S
9E-->8T
9E-->8V
9E-->8X
9E-->8Z
9E-->91
9E-->93
9E-->95
9E-->97
9E-->99
9E-->9B
9E-->9D
9E-->9G
9E-->9I
9E-->9K
9E-->9M
9E-->9O
9E-->9Q
9E-->9S
9E-->9U
9E-->9W
9E-->9Y
9E-->A0
9E-->A2
9E-->A4
9G-->AJ
9I-->AJ
9K-->9B
9M-->AJ
9O-->9B
9O-->A4
9Q-->8V
9Q-->9B
9Q-->A4
9Q-->AJ
9S-->AJ
9U-->8V
9U-->91
9U-->9B
9W-->AJ
9Y-->A4
9Y-->AJ
A0-->AJ
A2-->AJ
A4-->AJ
A8-->AH
AB-->AH
AC-->AD
AD-->AH
AJ-->A6
AJ-->A7
AJ-->A8
AJ-->A9
AJ-->AA
AJ-->AB
AJ-->AD
AJ-->AC
AJ-->AE
AJ-->AF
AJ-->AG
AJ-->AH
AJ-->AI
AJ-->AK
AJ-->AL
AJ-->AM
AJ-->AN
AJ-->AO
AJ-->AP
AJ-->AQ
AJ-->AR
AJ-->AS
AJ-->AT
AJ-->AX
AJ-->AY
AL-->AH
AQ-->A8
```
