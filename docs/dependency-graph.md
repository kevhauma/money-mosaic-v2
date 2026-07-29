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
- 269 leaf nodes, 716 edges.
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
subgraph 3Z["rule-filters"]
40["rule-filters.component.ts"]
end
subgraph 41["rule-form"]
42["rule-form.component.ts"]
end
subgraph 43["rule-share-bar"]
44["rule-share-bar.component.ts"]
end
subgraph 45["rules-overview"]
46["rules-overview.component.ts"]
end
end
47["index.ts"]
48["rule-filters.ts"]
49["rule-labels.ts"]
4A["rule-share.ts"]
4B["rule-summary.ts"]
4C["rules.store.ts"]
end
subgraph 4D["feature-changelog"]
4E["changelog.routes.ts"]
subgraph 4F["components"]
subgraph 4G["changelog-page"]
4H["changelog-page.component.ts"]
end
4I["index.ts"]
end
subgraph 4J["data"]
4K["changelog-entries.ts"]
4L["roadmap-entries.ts"]
end
4M["group-changelog-entries.ts"]
4N["group-roadmap-entries.ts"]
4O["index.ts"]
end
subgraph 4P["feature-dashboard"]
4Q["category-comparison-settings.store.ts"]
4R["category-comparison-vm.ts"]
subgraph 4S["components"]
subgraph 4T["account-balance-strip"]
4U["account-balance-strip.component.ts"]
end
subgraph 4V["action-queue-panel"]
4W["action-queue-panel.component.ts"]
end
subgraph 4X["category-breakdown-panel"]
4Y["category-breakdown-panel.component.ts"]
end
subgraph 4Z["category-comparison-panel"]
50["category-comparison-panel.component.ts"]
end
subgraph 51["comparison-category-card"]
52["comparison-category-card.component.ts"]
end
subgraph 53["dashboard-customize-panel"]
54["dashboard-customize-panel.component.ts"]
end
subgraph 55["dashboard-overview"]
56["dashboard-overview.component.ts"]
end
57["index.ts"]
subgraph 58["net-worth-header"]
59["net-worth-header.component.ts"]
end
subgraph 5A["top-transactions-panel"]
5B["top-transactions-panel.component.ts"]
end
subgraph 5C["trend-chart-panel"]
5D["trend-chart-panel.component.ts"]
end
subgraph 5E["weekday-weekend-split-panel"]
5F["weekday-weekend-split-panel.component.ts"]
end
end
5G["dashboard-layout-settings.store.ts"]
5H["dashboard-row-order.ts"]
5I["dashboard.routes.ts"]
5J["index.ts"]
5K["stats.store.ts"]
end
subgraph 5L["feature-data-management"]
subgraph 5M["components"]
subgraph 5N["data-management-overview"]
5O["data-management-overview.component.ts"]
end
5P["index.ts"]
end
5Q["data-management.routes.ts"]
5R["index.ts"]
end
subgraph 5S["feature-help"]
subgraph 5T["components"]
subgraph 5U["faq-page"]
5V["faq-page.component.ts"]
end
subgraph 5W["guide-detail"]
5X["guide-detail.component.ts"]
end
subgraph 5Y["guides-index"]
5Z["guides-index.component.ts"]
end
60["index.ts"]
end
subgraph 61["data"]
62["faq.ts"]
63["guides.ts"]
end
64["help.routes.ts"]
65["index.ts"]
end
subgraph 66["feature-home"]
subgraph 67["components"]
subgraph 68["home-landing"]
69["home-landing.component.ts"]
end
6A["index.ts"]
end
6B["home.routes.ts"]
6C["index.ts"]
end
subgraph 6D["feature-import"]
6E["column-mapping.ts"]
subgraph 6F["components"]
subgraph 6G["account-draft-editor"]
6H["account-draft-editor.component.ts"]
end
subgraph 6I["batch-wait-card"]
6J["batch-wait-card.component.ts"]
end
subgraph 6K["column-map-amount-field"]
6L["column-map-amount-field.component.ts"]
end
subgraph 6M["column-map-counterparty-field"]
6N["column-map-counterparty-field.component.ts"]
end
subgraph 6O["column-map-sample-caption"]
6P["column-map-sample-caption.component.ts"]
end
subgraph 6Q["column-map-simple-field"]
6R["column-map-simple-field.component.ts"]
end
subgraph 6S["column-map-stepper"]
6T["column-map-stepper.component.ts"]
end
subgraph 6U["column-map-summary-step"]
6V["column-map-summary-step.component.ts"]
end
subgraph 6W["import-map-step"]
6X["import-map-step.component.ts"]
end
subgraph 6Y["import-preview-step"]
6Z["import-preview-step.component.ts"]
end
subgraph 70["import-select-step"]
71["import-select-step.component.ts"]
end
subgraph 72["import-summary-step"]
73["import-summary-step.component.ts"]
end
subgraph 74["import-wizard"]
75["import-wizard.component.ts"]
end
76["index.ts"]
subgraph 77["queued-file-row"]
78["queued-file-row.component.ts"]
end
end
79["import-batches.store.ts"]
7A["import-queue.ts"]
7B["import-wizard-session.ts"]
7C["import.routes.ts"]
7D["index.ts"]
7E["mapper-steps.ts"]
7F["mapping-profiles.store.ts"]
end
subgraph 7G["feature-learning"]
subgraph 7H["components"]
7I["index.ts"]
subgraph 7J["learning-overview"]
7K["learning-overview.component.ts"]
end
subgraph 7L["model-status"]
7M["model-status.component.ts"]
end
subgraph 7N["rule-proposals"]
7O["rule-proposals.component.ts"]
end
subgraph 7P["suggestions-table"]
7Q["suggestions-table.component.ts"]
end
end
7R["index.ts"]
7S["learning.routes.ts"]
end
subgraph 7T["feature-settings"]
subgraph 7U["components"]
7V["index.ts"]
subgraph 7W["settings-overview"]
7X["settings-overview.component.ts"]
end
end
7Y["index.ts"]
7Z["settings.routes.ts"]
end
subgraph 80["feature-transactions"]
subgraph 81["components"]
subgraph 82["attribution-override-fieldset"]
83["attribution-override-fieldset.component.ts"]
end
84["index.ts"]
subgraph 85["transaction-bulk-bar"]
86["transaction-bulk-bar.component.ts"]
end
subgraph 87["transaction-edit-form"]
88["transaction-edit-form.component.ts"]
end
subgraph 89["transaction-filters"]
8A["transaction-filters.component.ts"]
end
subgraph 8B["transactions-overview"]
8C["transactions-overview.component.ts"]
end
subgraph 8D["transfer-review"]
8E["transfer-review.component.ts"]
end
end
8F["index.ts"]
8G["transaction-filters.ts"]
8H["transactions.routes.ts"]
end
subgraph 8I["shared"]
subgraph 8J["echarts"]
8K["chart-theme.ts"]
8L["echarts-setup.ts"]
8M["index.ts"]
8N["tooltip-formatter.ts"]
end
subgraph 8O["ui"]
subgraph 8P["alert"]
8Q["alert.component.ts"]
end
subgraph 8R["badge"]
8S["badge.component.ts"]
end
subgraph 8T["bento-grid"]
8U["bento-grid.component.ts"]
8V["bento-item.component.ts"]
end
subgraph 8W["button"]
8X["button.component.ts"]
end
subgraph 8Y["collapse"]
8Z["collapse.component.ts"]
end
subgraph 90["confirm-dialog"]
91["confirm-dialog.component.ts"]
end
subgraph 92["date-range-input"]
93["date-range-input.component.ts"]
end
subgraph 94["divider"]
95["divider.component.ts"]
end
subgraph 96["dropdown"]
97["dropdown.component.ts"]
end
subgraph 98["empty-state"]
99["empty-state.component.ts"]
end
subgraph 9A["fieldset"]
9B["fieldset.component.ts"]
end
subgraph 9C["flex"]
9D["flex.component.ts"]
end
subgraph 9E["granularity-picker"]
9F["granularity-picker.component.ts"]
end
9G["index.ts"]
subgraph 9H["input"]
9I["input.component.ts"]
end
subgraph 9J["label"]
9K["label.component.ts"]
end
subgraph 9L["loading-skeleton"]
9M["loading-skeleton.component.ts"]
end
subgraph 9N["modal"]
9O["mm-modal.component.ts"]
end
subgraph 9P["page-header"]
9Q["page-header.component.ts"]
end
subgraph 9R["paginator"]
9S["paginator.component.ts"]
end
subgraph 9T["paper"]
9U["paper.component.ts"]
end
subgraph 9V["range-grouping-switcher"]
9W["range-grouping-switcher.component.ts"]
end
subgraph 9X["select"]
9Y["select.component.ts"]
end
subgraph 9Z["stat-card"]
A0["stat-card.component.ts"]
end
subgraph A1["table"]
A2["table.component.ts"]
end
subgraph A3["tabs"]
A4["tabs.component.ts"]
end
subgraph A5["typography"]
A6["typography.component.ts"]
end
end
subgraph A7["utils"]
A8["confidence-color.ts"]
A9["confirm-state.ts"]
AA["currency-format.ts"]
AB["currency-symbol-presets.ts"]
AC["daisy-classes.ts"]
AD["date-buckets.ts"]
AE["date-format.pipe.ts"]
AF["date-format.ts"]
AG["debounced-text.ts"]
AH["download-json.ts"]
AI["fingerprint.ts"]
AJ["format-settings.ts"]
AK["iban.ts"]
AL["index.ts"]
AM["locale-presets.ts"]
AN["number-format.ts"]
AO["pagination.ts"]
AP["percentage.ts"]
AQ["search-params.ts"]
AR["selection-model.ts"]
AS["signed-amount.pipe.ts"]
AT["sortable.ts"]
AU["structural-filters.ts"]
AV["theme-hooks.ts"]
subgraph AW["validators"]
AX["iban.validator.ts"]
AY["percentage.validator.ts"]
end
AZ["with-archivable.ts"]
B0["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->2W
5-->4
5-->6
6-->N
6-->AL
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
F-->AI
F-->AJ
G-->F
G-->2N
G-->AL
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
U-->AL
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
11-->AL
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->26
15-->8X
15-->9W
15-->A6
15-->AL
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
1O-->AL
1P-->N
1P-->2N
1P-->AL
1Q-->1S
1Q-->N
1Q-->AL
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
1W-->AL
1X-->22
1X-->N
1Y-->1X
1Y-->N
1Y-->AL
1Z-->N
20-->1X
20-->2C
20-->N
21-->AL
22-->1Z
22-->23
22-->N
22-->2W
23-->5
23-->N
24-->N
25-->AL
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
2A-->AL
2B-->22
2B-->N
2C-->AL
2D-->AL
2E-->AL
2F-->N
2F-->2W
2G-->22
2G-->N
2G-->AL
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
30-->AL
32-->N
33-->N
34-->N
35-->3H
35-->3J
35-->8M
36-->N
36-->1R
36-->26
36-->AL
39-->9G
39-->AL
3B-->36
3B-->N
3B-->26
3B-->8M
3B-->9G
3B-->AL
3D-->32
3D-->33
3D-->39
3D-->9G
3F-->33
3F-->34
3F-->N
3F-->9G
3F-->AL
3F-->AX
3F-->AY
3H-->39
3H-->3B
3H-->3F
3H-->1R
3H-->9G
3H-->AL
3J-->32
3J-->33
3J-->3D
3J-->3F
3J-->3M
3J-->N
3J-->1R
3J-->9G
3J-->AL
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
3M-->8M
3M-->9G
3N-->33
3N-->34
3N-->35
3N-->3K
3P-->3V
3P-->46
3R-->1E
3S-->3R
3S-->4C
3S-->N
3S-->1E
3S-->1R
3V-->3Q
3V-->3X
3V-->N
3V-->1R
3V-->9G
3V-->AL
3X-->3Q
3X-->N
3X-->9G
3Y-->3V
3Y-->3X
3Y-->40
3Y-->42
3Y-->44
3Y-->46
40-->48
40-->1R
40-->9G
40-->AL
42-->49
42-->A
42-->N
42-->1R
42-->9G
44-->4A
44-->4C
44-->9G
44-->AL
46-->48
46-->4B
46-->4C
46-->40
46-->42
46-->44
46-->N
46-->1R
46-->9G
46-->AL
47-->3P
47-->3Q
47-->3R
47-->3S
47-->3Y
47-->48
47-->4B
47-->4C
48-->4B
48-->N
49-->N
4A-->N
4B-->49
4B-->N
4C-->4A
4C-->A
4C-->N
4C-->1R
4C-->AL
4E-->4H
4H-->4K
4H-->4L
4H-->4M
4H-->4N
4H-->9G
4I-->4H
4M-->4K
4N-->4L
4O-->4E
4O-->4I
4Q-->N
4U-->1R
4U-->9G
4U-->AL
4W-->1R
4W-->2W
4W-->9G
4W-->AL
4Y-->5K
4Y-->1R
4Y-->26
4Y-->8M
4Y-->9G
4Y-->AL
50-->4Q
50-->4R
50-->5K
50-->52
50-->1R
50-->9G
50-->AL
52-->4R
52-->9G
54-->5G
54-->5H
54-->N
54-->9G
56-->5G
56-->5H
56-->5K
56-->4U
56-->4W
56-->4Y
56-->50
56-->54
56-->59
56-->5B
56-->5D
56-->5F
56-->1R
56-->26
56-->9G
56-->AL
57-->4U
57-->4W
57-->4Y
57-->50
57-->54
57-->56
57-->59
57-->5B
57-->5D
57-->5F
59-->1R
59-->9G
59-->AL
5B-->5K
5B-->1R
5B-->26
5B-->9G
5B-->AL
5D-->1R
5D-->26
5D-->2W
5D-->8M
5D-->9G
5D-->AL
5F-->5K
5F-->26
5F-->9G
5F-->AL
5G-->5H
5G-->N
5H-->N
5I-->56
5I-->8M
5J-->57
5J-->5I
5K-->4Q
5K-->1R
5K-->26
5K-->2W
5O-->N
5O-->2J
5O-->9G
5O-->AL
5P-->5O
5Q-->5O
5R-->5P
5R-->5Q
5V-->62
5V-->9G
5X-->63
5X-->9G
5Z-->63
5Z-->9G
60-->5V
60-->5X
60-->5Z
64-->5V
64-->5X
64-->5Z
65-->60
65-->64
69-->19
69-->9G
6A-->69
6B-->69
6C-->6A
6C-->6B
6E-->N
6H-->7A
6H-->3N
6H-->9G
6J-->9G
6L-->6P
6L-->9G
6N-->6P
6N-->9G
6P-->9G
6R-->6E
6R-->6P
6R-->9G
6T-->7E
6T-->9G
6V-->6E
6V-->9G
6X-->6E
6X-->7E
6X-->7F
6X-->6L
6X-->6N
6X-->6R
6X-->6T
6X-->6V
6X-->6Z
6X-->N
6X-->12
6X-->9G
6Z-->12
6Z-->9G
6Z-->AL
71-->7A
71-->7F
71-->78
71-->N
71-->12
71-->9G
73-->N
73-->9G
75-->7B
75-->6J
75-->6X
75-->71
75-->73
75-->1R
75-->9G
76-->6X
76-->6Z
76-->71
76-->73
76-->75
78-->7A
78-->6H
78-->N
78-->9G
79-->A
79-->N
79-->12
79-->1R
7A-->N
7B-->6E
7B-->79
7B-->7A
7B-->7F
7B-->N
7B-->12
7B-->1R
7B-->3N
7C-->75
7D-->6E
7D-->76
7D-->79
7D-->7A
7D-->7C
7D-->7E
7D-->7F
7E-->6E
7F-->N
7I-->7K
7I-->7M
7I-->7O
7I-->7Q
7K-->7M
7K-->7O
7K-->7Q
7K-->9G
7M-->1E
7M-->1R
7M-->47
7M-->9G
7O-->N
7O-->1E
7O-->1R
7O-->47
7O-->9G
7O-->AL
7Q-->N
7Q-->1R
7Q-->47
7Q-->9G
7Q-->AL
7R-->7I
7R-->7S
7S-->7K
7V-->7X
7X-->19
7X-->1R
7X-->2N
7X-->5R
7X-->9G
7X-->AL
7Y-->7V
7Y-->7Z
7Z-->7X
83-->N
83-->1R
83-->2S
83-->9G
83-->AL
84-->86
84-->88
84-->8A
84-->8C
84-->8E
86-->1R
86-->9G
88-->83
88-->N
88-->1R
88-->2S
88-->47
88-->9G
8A-->8G
8A-->1R
8A-->9G
8A-->AL
8C-->8G
8C-->86
8C-->88
8C-->8A
8C-->8E
8C-->N
8C-->1R
8C-->2W
8C-->47
8C-->9G
8C-->AL
8E-->1R
8E-->2W
8E-->9G
8E-->AL
8F-->8H
8G-->N
8G-->2W
8H-->8C
8M-->8K
8M-->8L
8M-->8N
8N-->AL
8Q-->AL
8S-->AL
8U-->AL
8V-->AL
8X-->AL
8Z-->AL
91-->8X
91-->9K
91-->9O
91-->A6
93-->97
93-->AL
95-->AL
97-->AL
99-->9D
99-->A6
9B-->AL
9D-->AL
9G-->8Q
9G-->8S
9G-->8U
9G-->8V
9G-->8X
9G-->8Z
9G-->91
9G-->93
9G-->95
9G-->97
9G-->99
9G-->9B
9G-->9D
9G-->9F
9G-->9I
9G-->9K
9G-->9M
9G-->9O
9G-->9Q
9G-->9S
9G-->9U
9G-->9W
9G-->9Y
9G-->A0
9G-->A2
9G-->A4
9G-->A6
9I-->AL
9K-->AL
9M-->9D
9O-->AL
9Q-->9D
9Q-->A6
9S-->8X
9S-->9D
9S-->A6
9S-->AL
9U-->AL
9W-->8X
9W-->93
9W-->9D
9Y-->AL
A0-->A6
A0-->AL
A2-->AL
A4-->AL
A6-->AL
AA-->AJ
AD-->AJ
AE-->AF
AF-->AJ
AL-->A8
AL-->A9
AL-->AA
AL-->AB
AL-->AC
AL-->AD
AL-->AF
AL-->AE
AL-->AG
AL-->AH
AL-->AI
AL-->AJ
AL-->AK
AL-->AM
AL-->AN
AL-->AO
AL-->AP
AL-->AQ
AL-->AR
AL-->AS
AL-->AT
AL-->AU
AL-->AV
AL-->AZ
AL-->B0
AN-->AJ
AS-->AA
```
