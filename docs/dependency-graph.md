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
- 272 leaf nodes, 724 edges.
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
subgraph 84["category-select-cell"]
85["category-select-cell.component.ts"]
end
86["index.ts"]
subgraph 87["transaction-bulk-bar"]
88["transaction-bulk-bar.component.ts"]
end
subgraph 89["transaction-edit-form"]
8A["transaction-edit-form.component.ts"]
end
subgraph 8B["transaction-filters"]
8C["transaction-filters.component.ts"]
end
subgraph 8D["transaction-row"]
8E["transaction-row.component.ts"]
end
subgraph 8F["transactions-overview"]
8G["transactions-overview.component.ts"]
end
subgraph 8H["transfer-review"]
8I["transfer-review.component.ts"]
end
end
8J["index.ts"]
8K["transaction-filters.ts"]
8L["transaction-row-vm.ts"]
8M["transactions.routes.ts"]
end
subgraph 8N["shared"]
subgraph 8O["echarts"]
8P["chart-theme.ts"]
8Q["echarts-setup.ts"]
8R["index.ts"]
8S["tooltip-formatter.ts"]
end
subgraph 8T["ui"]
subgraph 8U["alert"]
8V["alert.component.ts"]
end
subgraph 8W["badge"]
8X["badge.component.ts"]
end
subgraph 8Y["bento-grid"]
8Z["bento-grid.component.ts"]
90["bento-item.component.ts"]
end
subgraph 91["button"]
92["button.component.ts"]
end
subgraph 93["collapse"]
94["collapse.component.ts"]
end
subgraph 95["confirm-dialog"]
96["confirm-dialog.component.ts"]
end
subgraph 97["date-range-input"]
98["date-range-input.component.ts"]
end
subgraph 99["divider"]
9A["divider.component.ts"]
end
subgraph 9B["dropdown"]
9C["dropdown.component.ts"]
end
subgraph 9D["empty-state"]
9E["empty-state.component.ts"]
end
subgraph 9F["fieldset"]
9G["fieldset.component.ts"]
end
subgraph 9H["flex"]
9I["flex.component.ts"]
end
subgraph 9J["granularity-picker"]
9K["granularity-picker.component.ts"]
end
9L["index.ts"]
subgraph 9M["input"]
9N["input.component.ts"]
end
subgraph 9O["label"]
9P["label.component.ts"]
end
subgraph 9Q["loading-skeleton"]
9R["loading-skeleton.component.ts"]
end
subgraph 9S["modal"]
9T["mm-modal.component.ts"]
end
subgraph 9U["page-header"]
9V["page-header.component.ts"]
end
subgraph 9W["paginator"]
9X["paginator.component.ts"]
end
subgraph 9Y["paper"]
9Z["paper.component.ts"]
end
subgraph A0["range-grouping-switcher"]
A1["range-grouping-switcher.component.ts"]
end
subgraph A2["select"]
A3["select.component.ts"]
end
subgraph A4["stat-card"]
A5["stat-card.component.ts"]
end
subgraph A6["table"]
A7["table.component.ts"]
end
subgraph A8["tabs"]
A9["tabs.component.ts"]
end
subgraph AA["typography"]
AB["typography.component.ts"]
end
end
subgraph AC["utils"]
AD["confidence-color.ts"]
AE["confirm-state.ts"]
AF["currency-format.ts"]
AG["currency-symbol-presets.ts"]
AH["daisy-classes.ts"]
AI["date-buckets.ts"]
AJ["date-format.pipe.ts"]
AK["date-format.ts"]
AL["debounced-text.ts"]
AM["download-json.ts"]
AN["fingerprint.ts"]
AO["format-settings.ts"]
AP["iban.ts"]
AQ["index.ts"]
AR["locale-presets.ts"]
AS["number-format.ts"]
AT["pagination.ts"]
AU["percentage.ts"]
AV["search-params.ts"]
AW["selection-model.ts"]
AX["signed-amount.pipe.ts"]
AY["sortable.ts"]
AZ["structural-filters.ts"]
B0["theme-hooks.ts"]
subgraph B1["validators"]
B2["iban.validator.ts"]
B3["percentage.validator.ts"]
end
B4["with-archivable.ts"]
B5["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->2W
5-->4
5-->6
6-->N
6-->AQ
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
F-->AN
F-->AO
G-->F
G-->2N
G-->AQ
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
U-->AQ
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
11-->AQ
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->26
15-->92
15-->A1
15-->AB
15-->AQ
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
1O-->AQ
1P-->N
1P-->2N
1P-->AQ
1Q-->1S
1Q-->N
1Q-->AQ
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
1W-->AQ
1X-->22
1X-->N
1Y-->1X
1Y-->N
1Y-->AQ
1Z-->N
20-->1X
20-->2C
20-->N
21-->AQ
22-->1Z
22-->23
22-->N
22-->2W
23-->5
23-->N
24-->N
25-->AQ
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
2A-->AQ
2B-->22
2B-->N
2C-->AQ
2D-->AQ
2E-->AQ
2F-->N
2F-->2W
2G-->22
2G-->N
2G-->AQ
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
30-->AQ
32-->N
33-->N
34-->N
35-->3H
35-->3J
35-->8R
36-->N
36-->1R
36-->26
36-->AQ
39-->9L
39-->AQ
3B-->36
3B-->N
3B-->26
3B-->8R
3B-->9L
3B-->AQ
3D-->32
3D-->33
3D-->39
3D-->9L
3F-->33
3F-->34
3F-->N
3F-->9L
3F-->AQ
3F-->B2
3F-->B3
3H-->39
3H-->3B
3H-->3F
3H-->1R
3H-->9L
3H-->AQ
3J-->32
3J-->33
3J-->3D
3J-->3F
3J-->3M
3J-->N
3J-->1R
3J-->9L
3J-->AQ
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
3M-->8R
3M-->9L
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
3V-->9L
3V-->AQ
3X-->3Q
3X-->N
3X-->9L
3Y-->3V
3Y-->3X
3Y-->40
3Y-->42
3Y-->44
3Y-->46
40-->48
40-->1R
40-->9L
40-->AQ
42-->49
42-->A
42-->N
42-->1R
42-->9L
44-->4A
44-->4C
44-->9L
44-->AQ
46-->48
46-->4B
46-->4C
46-->40
46-->42
46-->44
46-->N
46-->1R
46-->9L
46-->AQ
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
4C-->AQ
4E-->4H
4H-->4K
4H-->4L
4H-->4M
4H-->4N
4H-->9L
4I-->4H
4M-->4K
4N-->4L
4O-->4E
4O-->4I
4Q-->N
4U-->1R
4U-->9L
4U-->AQ
4W-->1R
4W-->2W
4W-->9L
4W-->AQ
4Y-->5K
4Y-->1R
4Y-->26
4Y-->8R
4Y-->9L
4Y-->AQ
50-->4Q
50-->4R
50-->5K
50-->52
50-->1R
50-->9L
50-->AQ
52-->4R
52-->9L
54-->5G
54-->5H
54-->N
54-->9L
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
56-->9L
56-->AQ
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
59-->9L
59-->AQ
5B-->5K
5B-->1R
5B-->26
5B-->9L
5B-->AQ
5D-->1R
5D-->26
5D-->2W
5D-->8R
5D-->9L
5D-->AQ
5F-->5K
5F-->26
5F-->9L
5F-->AQ
5G-->5H
5G-->N
5H-->N
5I-->56
5I-->8R
5J-->57
5J-->5I
5K-->4Q
5K-->1R
5K-->26
5K-->2W
5O-->N
5O-->2J
5O-->9L
5O-->AQ
5P-->5O
5Q-->5O
5R-->5P
5R-->5Q
5V-->62
5V-->9L
5X-->63
5X-->9L
5Z-->63
5Z-->9L
60-->5V
60-->5X
60-->5Z
64-->5V
64-->5X
64-->5Z
65-->60
65-->64
69-->19
69-->9L
6A-->69
6B-->69
6C-->6A
6C-->6B
6E-->N
6H-->7A
6H-->3N
6H-->9L
6J-->9L
6L-->6P
6L-->9L
6N-->6P
6N-->9L
6P-->9L
6R-->6E
6R-->6P
6R-->9L
6T-->7E
6T-->9L
6V-->6E
6V-->9L
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
6X-->9L
6Z-->12
6Z-->9L
6Z-->AQ
71-->7A
71-->7F
71-->78
71-->N
71-->12
71-->9L
73-->N
73-->9L
75-->7B
75-->6J
75-->6X
75-->71
75-->73
75-->1R
75-->9L
76-->6X
76-->6Z
76-->71
76-->73
76-->75
78-->7A
78-->6H
78-->N
78-->9L
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
7K-->9L
7M-->1E
7M-->1R
7M-->47
7M-->9L
7O-->N
7O-->1E
7O-->1R
7O-->47
7O-->9L
7O-->AQ
7Q-->N
7Q-->1R
7Q-->47
7Q-->9L
7Q-->AQ
7R-->7I
7R-->7S
7S-->7K
7V-->7X
7X-->19
7X-->1R
7X-->2N
7X-->5R
7X-->9L
7X-->AQ
7Y-->7V
7Y-->7Z
7Z-->7X
83-->N
83-->1R
83-->2S
83-->9L
83-->AQ
86-->88
86-->8A
86-->8C
86-->8G
86-->8I
88-->1R
88-->9L
8A-->83
8A-->N
8A-->1R
8A-->2S
8A-->47
8A-->9L
8C-->8K
8C-->1R
8C-->9L
8C-->AQ
8E-->8L
8E-->85
8E-->9L
8E-->AQ
8G-->8K
8G-->8L
8G-->85
8G-->88
8G-->8A
8G-->8C
8G-->8E
8G-->8I
8G-->N
8G-->1R
8G-->2W
8G-->47
8G-->9L
8G-->AQ
8I-->1R
8I-->2W
8I-->9L
8I-->AQ
8J-->8M
8K-->N
8K-->2W
8L-->N
8M-->8G
8R-->8P
8R-->8Q
8R-->8S
8S-->AQ
8V-->AQ
8X-->AQ
8Z-->AQ
90-->AQ
92-->AQ
94-->AQ
96-->92
96-->9P
96-->9T
96-->AB
98-->9C
98-->AQ
9A-->AQ
9C-->AQ
9E-->9I
9E-->AB
9G-->AQ
9I-->AQ
9L-->8V
9L-->8X
9L-->8Z
9L-->90
9L-->92
9L-->94
9L-->96
9L-->98
9L-->9A
9L-->9C
9L-->9E
9L-->9G
9L-->9I
9L-->9K
9L-->9N
9L-->9P
9L-->9R
9L-->9T
9L-->9V
9L-->9X
9L-->9Z
9L-->A1
9L-->A3
9L-->A5
9L-->A7
9L-->A9
9L-->AB
9N-->AQ
9P-->AQ
9R-->9I
9T-->AQ
9V-->9I
9V-->AB
9X-->92
9X-->9I
9X-->AB
9X-->AQ
9Z-->AQ
A1-->92
A1-->98
A1-->9I
A3-->AQ
A5-->AB
A5-->AQ
A7-->AQ
A9-->AQ
AB-->AQ
AF-->AO
AI-->AO
AJ-->AK
AK-->AO
AQ-->AD
AQ-->AE
AQ-->AF
AQ-->AG
AQ-->AH
AQ-->AI
AQ-->AK
AQ-->AJ
AQ-->AL
AQ-->AM
AQ-->AN
AQ-->AO
AQ-->AP
AQ-->AR
AQ-->AS
AQ-->AT
AQ-->AU
AQ-->AV
AQ-->AW
AQ-->AX
AQ-->AY
AQ-->AZ
AQ-->B0
AQ-->B4
AQ-->B5
AS-->AO
AX-->AF
```
