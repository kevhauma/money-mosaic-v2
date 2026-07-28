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
- 266 leaf nodes, 704 edges.
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
4M["category-comparison-vm.ts"]
subgraph 4N["components"]
subgraph 4O["account-balance-strip"]
4P["account-balance-strip.component.ts"]
end
subgraph 4Q["action-queue-panel"]
4R["action-queue-panel.component.ts"]
end
subgraph 4S["category-breakdown-panel"]
4T["category-breakdown-panel.component.ts"]
end
subgraph 4U["category-comparison-panel"]
4V["category-comparison-panel.component.ts"]
end
subgraph 4W["comparison-category-card"]
4X["comparison-category-card.component.ts"]
end
subgraph 4Y["dashboard-customize-panel"]
4Z["dashboard-customize-panel.component.ts"]
end
subgraph 50["dashboard-overview"]
51["dashboard-overview.component.ts"]
end
52["index.ts"]
subgraph 53["net-worth-header"]
54["net-worth-header.component.ts"]
end
subgraph 55["top-transactions-panel"]
56["top-transactions-panel.component.ts"]
end
subgraph 57["trend-chart-panel"]
58["trend-chart-panel.component.ts"]
end
subgraph 59["weekday-weekend-split-panel"]
5A["weekday-weekend-split-panel.component.ts"]
end
end
5B["dashboard-layout-settings.store.ts"]
5C["dashboard-row-order.ts"]
5D["dashboard.routes.ts"]
5E["index.ts"]
5F["stats.store.ts"]
end
subgraph 5G["feature-data-management"]
subgraph 5H["components"]
subgraph 5I["data-management-overview"]
5J["data-management-overview.component.ts"]
end
5K["index.ts"]
end
5L["data-management.routes.ts"]
5M["index.ts"]
end
subgraph 5N["feature-help"]
subgraph 5O["components"]
subgraph 5P["faq-page"]
5Q["faq-page.component.ts"]
end
subgraph 5R["guide-detail"]
5S["guide-detail.component.ts"]
end
subgraph 5T["guides-index"]
5U["guides-index.component.ts"]
end
5V["index.ts"]
end
subgraph 5W["data"]
5X["faq.ts"]
5Y["guides.ts"]
end
5Z["help.routes.ts"]
60["index.ts"]
end
subgraph 61["feature-home"]
subgraph 62["components"]
subgraph 63["home-landing"]
64["home-landing.component.ts"]
end
65["index.ts"]
end
66["home.routes.ts"]
67["index.ts"]
end
subgraph 68["feature-import"]
69["column-mapping.ts"]
subgraph 6A["components"]
subgraph 6B["account-draft-editor"]
6C["account-draft-editor.component.ts"]
end
subgraph 6D["batch-wait-card"]
6E["batch-wait-card.component.ts"]
end
subgraph 6F["column-map-amount-field"]
6G["column-map-amount-field.component.ts"]
end
subgraph 6H["column-map-counterparty-field"]
6I["column-map-counterparty-field.component.ts"]
end
subgraph 6J["column-map-sample-caption"]
6K["column-map-sample-caption.component.ts"]
end
subgraph 6L["column-map-simple-field"]
6M["column-map-simple-field.component.ts"]
end
subgraph 6N["column-map-stepper"]
6O["column-map-stepper.component.ts"]
end
subgraph 6P["column-map-summary-step"]
6Q["column-map-summary-step.component.ts"]
end
subgraph 6R["import-map-step"]
6S["import-map-step.component.ts"]
end
subgraph 6T["import-preview-step"]
6U["import-preview-step.component.ts"]
end
subgraph 6V["import-select-step"]
6W["import-select-step.component.ts"]
end
subgraph 6X["import-summary-step"]
6Y["import-summary-step.component.ts"]
end
subgraph 6Z["import-wizard"]
70["import-wizard.component.ts"]
end
71["index.ts"]
subgraph 72["queued-file-row"]
73["queued-file-row.component.ts"]
end
end
74["import-batches.store.ts"]
75["import-queue.ts"]
76["import-wizard-session.ts"]
77["import.routes.ts"]
78["index.ts"]
79["mapper-steps.ts"]
7A["mapping-profiles.store.ts"]
end
subgraph 7B["feature-learning"]
subgraph 7C["components"]
7D["index.ts"]
subgraph 7E["learning-overview"]
7F["learning-overview.component.ts"]
end
subgraph 7G["model-status"]
7H["model-status.component.ts"]
end
subgraph 7I["rule-proposals"]
7J["rule-proposals.component.ts"]
end
subgraph 7K["suggestions-table"]
7L["suggestions-table.component.ts"]
end
end
7M["index.ts"]
7N["learning.routes.ts"]
end
subgraph 7O["feature-settings"]
subgraph 7P["components"]
7Q["index.ts"]
subgraph 7R["settings-overview"]
7S["settings-overview.component.ts"]
end
end
7T["index.ts"]
7U["settings.routes.ts"]
end
subgraph 7V["feature-transactions"]
subgraph 7W["components"]
subgraph 7X["attribution-override-fieldset"]
7Y["attribution-override-fieldset.component.ts"]
end
7Z["index.ts"]
subgraph 80["transaction-bulk-bar"]
81["transaction-bulk-bar.component.ts"]
end
subgraph 82["transaction-edit-form"]
83["transaction-edit-form.component.ts"]
end
subgraph 84["transaction-filters"]
85["transaction-filters.component.ts"]
end
subgraph 86["transactions-overview"]
87["transactions-overview.component.ts"]
end
subgraph 88["transfer-review"]
89["transfer-review.component.ts"]
end
end
8A["index.ts"]
8B["transaction-filters.ts"]
8C["transactions.routes.ts"]
end
subgraph 8D["shared"]
subgraph 8E["echarts"]
8F["chart-theme.ts"]
8G["echarts-setup.ts"]
8H["index.ts"]
8I["tooltip-formatter.ts"]
end
subgraph 8J["ui"]
subgraph 8K["alert"]
8L["alert.component.ts"]
end
subgraph 8M["badge"]
8N["badge.component.ts"]
end
subgraph 8O["bento-grid"]
8P["bento-grid.component.ts"]
8Q["bento-item.component.ts"]
end
subgraph 8R["button"]
8S["button.component.ts"]
end
subgraph 8T["collapse"]
8U["collapse.component.ts"]
end
subgraph 8V["confirm-dialog"]
8W["confirm-dialog.component.ts"]
end
subgraph 8X["date-range-input"]
8Y["date-range-input.component.ts"]
end
subgraph 8Z["divider"]
90["divider.component.ts"]
end
subgraph 91["dropdown"]
92["dropdown.component.ts"]
end
subgraph 93["empty-state"]
94["empty-state.component.ts"]
end
subgraph 95["fieldset"]
96["fieldset.component.ts"]
end
subgraph 97["flex"]
98["flex.component.ts"]
end
subgraph 99["granularity-picker"]
9A["granularity-picker.component.ts"]
end
9B["index.ts"]
subgraph 9C["input"]
9D["input.component.ts"]
end
subgraph 9E["label"]
9F["label.component.ts"]
end
subgraph 9G["loading-skeleton"]
9H["loading-skeleton.component.ts"]
end
subgraph 9I["modal"]
9J["mm-modal.component.ts"]
end
subgraph 9K["page-header"]
9L["page-header.component.ts"]
end
subgraph 9M["paginator"]
9N["paginator.component.ts"]
end
subgraph 9O["paper"]
9P["paper.component.ts"]
end
subgraph 9Q["range-grouping-switcher"]
9R["range-grouping-switcher.component.ts"]
end
subgraph 9S["select"]
9T["select.component.ts"]
end
subgraph 9U["stat-card"]
9V["stat-card.component.ts"]
end
subgraph 9W["table"]
9X["table.component.ts"]
end
subgraph 9Y["tabs"]
9Z["tabs.component.ts"]
end
subgraph A0["typography"]
A1["typography.component.ts"]
end
end
subgraph A2["utils"]
A3["confidence-color.ts"]
A4["confirm-state.ts"]
A5["currency-format.ts"]
A6["currency-symbol-presets.ts"]
A7["daisy-classes.ts"]
A8["date-buckets.ts"]
A9["date-format.pipe.ts"]
AA["date-format.ts"]
AB["debounced-text.ts"]
AC["download-json.ts"]
AD["fingerprint.ts"]
AE["format-settings.ts"]
AF["iban.ts"]
AG["index.ts"]
AH["locale-presets.ts"]
AI["number-format.ts"]
AJ["pagination.ts"]
AK["percentage.ts"]
AL["search-params.ts"]
AM["selection-model.ts"]
AN["signed-amount.pipe.ts"]
AO["sortable.ts"]
AP["structural-filters.ts"]
AQ["theme-hooks.ts"]
subgraph AR["validators"]
AS["iban.validator.ts"]
AT["percentage.validator.ts"]
end
AU["with-archivable.ts"]
AV["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->2W
5-->4
5-->6
6-->N
6-->AG
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
F-->AD
F-->AE
G-->F
G-->2N
G-->AG
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
U-->AG
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
11-->AG
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->26
15-->8S
15-->9R
15-->A1
15-->AG
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
1O-->AG
1P-->N
1P-->2N
1P-->AG
1Q-->1S
1Q-->N
1Q-->AG
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
1W-->AG
1X-->22
1X-->N
1Y-->1X
1Y-->N
1Y-->AG
1Z-->N
20-->1X
20-->2C
20-->N
21-->AG
22-->1Z
22-->23
22-->N
22-->2W
23-->5
23-->N
24-->N
25-->AG
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
2A-->AG
2B-->22
2B-->N
2C-->AG
2D-->AG
2E-->AG
2F-->N
2F-->2W
2G-->22
2G-->N
2G-->AG
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
30-->AG
32-->N
33-->N
34-->3C
34-->3E
34-->8H
35-->N
35-->1R
35-->26
35-->AG
38-->35
38-->N
38-->26
38-->8H
38-->9B
38-->AG
3A-->32
3A-->33
3A-->N
3A-->9B
3A-->AG
3A-->AS
3A-->AT
3C-->38
3C-->3A
3C-->1R
3C-->9B
3C-->AG
3E-->32
3E-->3A
3E-->3H
3E-->N
3E-->1R
3E-->9B
3E-->AG
3F-->38
3F-->3A
3F-->3C
3F-->3E
3F-->3H
3H-->35
3H-->N
3H-->1R
3H-->26
3H-->8H
3H-->9B
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
3Q-->9B
3Q-->AG
3S-->3L
3S-->N
3S-->9B
3T-->3Q
3T-->3S
3T-->3V
3T-->3X
3T-->3Z
3T-->41
3V-->43
3V-->1R
3V-->9B
3V-->AG
3X-->44
3X-->A
3X-->N
3X-->1R
3X-->9B
3Z-->45
3Z-->47
3Z-->9B
3Z-->AG
41-->43
41-->46
41-->47
41-->3V
41-->3X
41-->3Z
41-->N
41-->1R
41-->9B
41-->AG
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
47-->AG
49-->4C
4C-->4F
4C-->4G
4C-->4H
4C-->4I
4C-->9B
4D-->4C
4H-->4F
4I-->4G
4J-->49
4J-->4D
4L-->N
4P-->1R
4P-->9B
4P-->AG
4R-->1R
4R-->2W
4R-->9B
4R-->AG
4T-->5F
4T-->1R
4T-->26
4T-->8H
4T-->9B
4T-->AG
4V-->4L
4V-->4M
4V-->5F
4V-->4X
4V-->1R
4V-->9B
4V-->AG
4X-->4M
4X-->9B
4Z-->5B
4Z-->5C
4Z-->N
4Z-->9B
51-->5B
51-->5C
51-->5F
51-->4P
51-->4R
51-->4T
51-->4V
51-->4Z
51-->54
51-->56
51-->58
51-->5A
51-->1R
51-->26
51-->9B
51-->AG
52-->4P
52-->4R
52-->4T
52-->4V
52-->4Z
52-->51
52-->54
52-->56
52-->58
52-->5A
54-->1R
54-->9B
54-->AG
56-->5F
56-->1R
56-->26
56-->9B
56-->AG
58-->1R
58-->26
58-->2W
58-->8H
58-->9B
58-->AG
5A-->5F
5A-->26
5A-->9B
5A-->AG
5B-->5C
5B-->N
5C-->N
5D-->51
5D-->8H
5E-->52
5E-->5D
5F-->4L
5F-->1R
5F-->26
5F-->2W
5J-->N
5J-->2J
5J-->9B
5J-->AG
5K-->5J
5L-->5J
5M-->5K
5M-->5L
5Q-->5X
5Q-->9B
5S-->5Y
5S-->9B
5U-->5Y
5U-->9B
5V-->5Q
5V-->5S
5V-->5U
5Z-->5Q
5Z-->5S
5Z-->5U
60-->5V
60-->5Z
64-->19
64-->9B
65-->64
66-->64
67-->65
67-->66
69-->N
6C-->75
6C-->3I
6C-->9B
6E-->9B
6G-->6K
6G-->9B
6I-->6K
6I-->9B
6K-->9B
6M-->69
6M-->6K
6M-->9B
6O-->79
6O-->9B
6Q-->69
6Q-->9B
6S-->69
6S-->79
6S-->7A
6S-->6G
6S-->6I
6S-->6M
6S-->6O
6S-->6Q
6S-->6U
6S-->N
6S-->12
6S-->9B
6U-->12
6U-->9B
6U-->AG
6W-->75
6W-->7A
6W-->73
6W-->N
6W-->12
6W-->9B
6Y-->N
6Y-->9B
70-->76
70-->6E
70-->6S
70-->6W
70-->6Y
70-->1R
70-->9B
71-->6S
71-->6U
71-->6W
71-->6Y
71-->70
73-->75
73-->6C
73-->N
73-->9B
74-->A
74-->N
74-->12
74-->1R
75-->N
76-->69
76-->74
76-->75
76-->7A
76-->N
76-->12
76-->1R
76-->3I
77-->70
78-->69
78-->71
78-->74
78-->75
78-->77
78-->79
78-->7A
79-->69
7A-->N
7D-->7F
7D-->7H
7D-->7J
7D-->7L
7F-->7H
7F-->7J
7F-->7L
7F-->9B
7H-->1E
7H-->1R
7H-->42
7H-->9B
7J-->N
7J-->1E
7J-->1R
7J-->42
7J-->9B
7J-->AG
7L-->N
7L-->1R
7L-->42
7L-->9B
7L-->AG
7M-->7D
7M-->7N
7N-->7F
7Q-->7S
7S-->19
7S-->1R
7S-->2N
7S-->5M
7S-->9B
7S-->AG
7T-->7Q
7T-->7U
7U-->7S
7Y-->N
7Y-->1R
7Y-->2S
7Y-->9B
7Y-->AG
7Z-->81
7Z-->83
7Z-->85
7Z-->87
7Z-->89
81-->1R
81-->9B
83-->7Y
83-->N
83-->1R
83-->2S
83-->42
83-->9B
85-->8B
85-->1R
85-->9B
85-->AG
87-->8B
87-->81
87-->83
87-->85
87-->89
87-->N
87-->1R
87-->2W
87-->42
87-->9B
87-->AG
89-->1R
89-->2W
89-->9B
89-->AG
8A-->8C
8B-->N
8B-->2W
8C-->87
8H-->8F
8H-->8G
8H-->8I
8I-->AG
8L-->AG
8N-->AG
8P-->AG
8Q-->AG
8S-->AG
8U-->AG
8W-->8S
8W-->9F
8W-->9J
8W-->A1
8Y-->92
8Y-->AG
90-->AG
92-->AG
94-->98
94-->A1
96-->AG
98-->AG
9B-->8L
9B-->8N
9B-->8P
9B-->8Q
9B-->8S
9B-->8U
9B-->8W
9B-->8Y
9B-->90
9B-->92
9B-->94
9B-->96
9B-->98
9B-->9A
9B-->9D
9B-->9F
9B-->9H
9B-->9J
9B-->9L
9B-->9N
9B-->9P
9B-->9R
9B-->9T
9B-->9V
9B-->9X
9B-->9Z
9B-->A1
9D-->AG
9F-->AG
9H-->98
9J-->AG
9L-->98
9L-->A1
9N-->8S
9N-->98
9N-->A1
9N-->AG
9P-->AG
9R-->8S
9R-->8Y
9R-->98
9T-->AG
9V-->A1
9V-->AG
9X-->AG
9Z-->AG
A1-->AG
A5-->AE
A8-->AE
A9-->AA
AA-->AE
AG-->A3
AG-->A4
AG-->A5
AG-->A6
AG-->A7
AG-->A8
AG-->AA
AG-->A9
AG-->AB
AG-->AC
AG-->AD
AG-->AE
AG-->AF
AG-->AH
AG-->AI
AG-->AJ
AG-->AK
AG-->AL
AG-->AM
AG-->AN
AG-->AO
AG-->AP
AG-->AQ
AG-->AU
AG-->AV
AI-->AE
AN-->A5
```
