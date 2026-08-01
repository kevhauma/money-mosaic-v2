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
- 290 leaf nodes, 784 edges.
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
1S["range-state.store.ts"]
1T["transactions.store.ts"]
1U["transfer-settings.store.ts"]
1V["transfers.store.ts"]
end
subgraph 1W["stats"]
1X["account-balance-trend.ts"]
1Y["category-breakdown.ts"]
1Z["category-composition-trend.ts"]
20["category-kind-contribution.ts"]
21["category-period-comparison.ts"]
22["chart-zoom-window.ts"]
23["classify-for-stats.ts"]
24["classify-joint-leg.ts"]
25["full-history-range.ts"]
26["granularity-for-span.ts"]
27["income-category-series.ts"]
28["index.ts"]
29["joint-account-stake.ts"]
2A["joint-contributor-breakdown.ts"]
2B["multi-year-income-comparison.ts"]
2C["net-margin.ts"]
2D["net-worth-trend.ts"]
2E["period-stats.ts"]
2F["period-window.ts"]
2G["periodized-rate.ts"]
2H["top-transactions.ts"]
2I["weekday-weekend-split.ts"]
2J["year-over-year.ts"]
2K["yearly-income-summary.ts"]
end
subgraph 2L["storage"]
2M["index.ts"]
2N["storage-status.service.ts"]
end
subgraph 2O["theme"]
2P["accent-colors.ts"]
2Q["index.ts"]
2R["theme-styles.ts"]
2S["theme.service.ts"]
end
subgraph 2T["transactions"]
2U["attribution-override.ts"]
2V["index.ts"]
2W["nullify-transaction.ts"]
2X["transaction-deletion.service.ts"]
end
subgraph 2Y["transfers"]
2Z["index.ts"]
30["transfer-cleanup.service.ts"]
31["transfer-linking.service.ts"]
32["transfer-matching.service.ts"]
33["transfer-matching.ts"]
end
end
subgraph 34["feature-accounts"]
35["account-card-vm.ts"]
36["account-icons.ts"]
37["account-types.ts"]
38["accounts.routes.ts"]
39["balance-trend-signals.ts"]
subgraph 3A["components"]
subgraph 3B["account-balance-block"]
3C["account-balance-block.component.ts"]
end
subgraph 3D["account-balance-chart"]
3E["account-balance-chart.component.ts"]
end
subgraph 3F["account-card"]
3G["account-card.component.ts"]
end
subgraph 3H["account-form"]
3I["account-form.component.ts"]
end
subgraph 3J["accounts-detail"]
3K["accounts-detail.component.ts"]
end
subgraph 3L["accounts-overview"]
3M["accounts-overview.component.ts"]
end
3N["index.ts"]
subgraph 3O["net-worth-history-chart"]
3P["net-worth-history-chart.component.ts"]
end
end
3Q["index.ts"]
end
subgraph 3R["feature-categories"]
3S["categories.routes.ts"]
3T["category-icons.ts"]
3U["category-model.service.ts"]
3V["category-model.store.ts"]
subgraph 3W["components"]
subgraph 3X["categories-overview"]
3Y["categories-overview.component.ts"]
end
subgraph 3Z["category-form"]
40["category-form.component.ts"]
end
41["index.ts"]
subgraph 42["rule-condition-row"]
43["rule-condition-row.component.ts"]
end
subgraph 44["rule-filters"]
45["rule-filters.component.ts"]
end
subgraph 46["rule-form"]
47["rule-form.component.ts"]
end
subgraph 48["rule-share-bar"]
49["rule-share-bar.component.ts"]
end
subgraph 4A["rules-overview"]
4B["rules-overview.component.ts"]
end
end
4C["index.ts"]
4D["rule-condition-editor.ts"]
4E["rule-filters.ts"]
4F["rule-labels.ts"]
4G["rule-share.ts"]
4H["rule-summary.ts"]
4I["rules.store.ts"]
end
subgraph 4J["feature-changelog"]
4K["changelog.routes.ts"]
subgraph 4L["components"]
subgraph 4M["changelog-page"]
4N["changelog-page.component.ts"]
end
4O["index.ts"]
end
subgraph 4P["data"]
4Q["changelog-entries.ts"]
4R["roadmap-entries.ts"]
end
4S["group-changelog-entries.ts"]
4T["group-roadmap-entries.ts"]
4U["index.ts"]
end
subgraph 4V["feature-dashboard"]
4W["category-comparison-settings.store.ts"]
4X["category-comparison-vm.ts"]
subgraph 4Y["components"]
subgraph 4Z["account-balance-strip"]
50["account-balance-strip.component.ts"]
end
subgraph 51["action-queue-panel"]
52["action-queue-panel.component.ts"]
end
subgraph 53["category-breakdown-panel"]
54["category-breakdown-panel.component.ts"]
end
subgraph 55["category-comparison-panel"]
56["category-comparison-panel.component.ts"]
end
subgraph 57["comparison-category-card"]
58["comparison-category-card.component.ts"]
end
subgraph 59["dashboard-customize-panel"]
5A["dashboard-customize-panel.component.ts"]
end
subgraph 5B["dashboard-overview"]
5C["dashboard-overview.component.ts"]
end
5D["index.ts"]
subgraph 5E["net-worth-header"]
5F["net-worth-header.component.ts"]
end
subgraph 5G["top-transactions-panel"]
5H["top-transactions-panel.component.ts"]
end
subgraph 5I["trend-chart-panel"]
5J["trend-chart-panel.component.ts"]
end
subgraph 5K["weekday-weekend-split-panel"]
5L["weekday-weekend-split-panel.component.ts"]
end
end
5M["dashboard-layout-settings.store.ts"]
5N["dashboard-row-order.ts"]
5O["dashboard.routes.ts"]
5P["index.ts"]
5Q["stats.store.ts"]
end
subgraph 5R["feature-data-management"]
subgraph 5S["components"]
subgraph 5T["data-management-overview"]
5U["data-management-overview.component.ts"]
end
5V["index.ts"]
end
5W["index.ts"]
end
subgraph 5X["feature-help"]
subgraph 5Y["components"]
subgraph 5Z["faq-page"]
60["faq-page.component.ts"]
end
subgraph 61["guide-detail"]
62["guide-detail.component.ts"]
end
subgraph 63["guides-index"]
64["guides-index.component.ts"]
end
65["index.ts"]
end
subgraph 66["data"]
67["faq.ts"]
68["guides.ts"]
end
69["help.routes.ts"]
6A["index.ts"]
end
subgraph 6B["feature-home"]
subgraph 6C["components"]
subgraph 6D["home-landing"]
6E["home-landing.component.ts"]
end
6F["index.ts"]
end
6G["home.routes.ts"]
6H["index.ts"]
end
subgraph 6I["feature-import"]
6J["column-mapping.ts"]
subgraph 6K["components"]
subgraph 6L["account-draft-editor"]
6M["account-draft-editor.component.ts"]
end
subgraph 6N["batch-wait-card"]
6O["batch-wait-card.component.ts"]
end
subgraph 6P["column-map-amount-field"]
6Q["column-map-amount-field.component.ts"]
end
subgraph 6R["column-map-counterparty-field"]
6S["column-map-counterparty-field.component.ts"]
end
subgraph 6T["column-map-sample-caption"]
6U["column-map-sample-caption.component.ts"]
end
subgraph 6V["column-map-simple-field"]
6W["column-map-simple-field.component.ts"]
end
subgraph 6X["column-map-stepper"]
6Y["column-map-stepper.component.ts"]
end
subgraph 6Z["column-map-summary-step"]
70["column-map-summary-step.component.ts"]
end
subgraph 71["import-map-step"]
72["import-map-step.component.ts"]
end
subgraph 73["import-preview-step"]
74["import-preview-step.component.ts"]
end
subgraph 75["import-select-step"]
76["import-select-step.component.ts"]
end
subgraph 77["import-summary-step"]
78["import-summary-step.component.ts"]
end
subgraph 79["import-wizard"]
7A["import-wizard.component.ts"]
end
7B["index.ts"]
subgraph 7C["queued-file-row"]
7D["queued-file-row.component.ts"]
end
end
7E["import-batches.store.ts"]
7F["import-queue.ts"]
7G["import-wizard-session.ts"]
7H["import.routes.ts"]
7I["index.ts"]
7J["mapper-steps.ts"]
7K["mapping-profiles.store.ts"]
end
subgraph 7L["feature-income"]
7M["career-start-date.ts"]
subgraph 7N["components"]
subgraph 7O["income-career-start"]
7P["income-career-start.component.ts"]
end
subgraph 7Q["income-category-filter"]
7R["income-category-filter.component.ts"]
end
subgraph 7S["income-overview"]
7T["income-overview.component.ts"]
end
subgraph 7U["income-yearly-panel"]
7V["income-yearly-panel.component.ts"]
end
7W["index.ts"]
end
7X["income.routes.ts"]
7Y["income.store.ts"]
7Z["index.ts"]
end
subgraph 80["feature-learning"]
subgraph 81["components"]
82["index.ts"]
subgraph 83["learning-overview"]
84["learning-overview.component.ts"]
end
subgraph 85["model-status"]
86["model-status.component.ts"]
end
subgraph 87["rule-proposals"]
88["rule-proposals.component.ts"]
end
subgraph 89["suggestions-table"]
8A["suggestions-table.component.ts"]
end
end
8B["index.ts"]
8C["learning.routes.ts"]
end
subgraph 8D["feature-settings"]
subgraph 8E["components"]
8F["index.ts"]
subgraph 8G["settings-about-section"]
8H["settings-about-section.component.ts"]
end
subgraph 8I["settings-currency-locale-section"]
8J["settings-currency-locale-section.component.ts"]
end
subgraph 8K["settings-data-section"]
8L["settings-data-section.component.ts"]
end
subgraph 8M["settings-overview"]
8N["settings-overview.component.ts"]
end
subgraph 8O["settings-theme-section"]
8P["settings-theme-section.component.ts"]
end
end
8Q["index.ts"]
8R["settings.routes.ts"]
end
subgraph 8S["feature-transactions"]
subgraph 8T["components"]
subgraph 8U["attribution-override-fieldset"]
8V["attribution-override-fieldset.component.ts"]
end
subgraph 8W["category-select-cell"]
8X["category-select-cell.component.ts"]
end
8Y["index.ts"]
subgraph 8Z["transaction-bulk-bar"]
90["transaction-bulk-bar.component.ts"]
end
subgraph 91["transaction-edit-form"]
92["transaction-edit-form.component.ts"]
end
subgraph 93["transaction-filters"]
94["transaction-filters.component.ts"]
end
subgraph 95["transaction-row"]
96["transaction-row.component.ts"]
end
subgraph 97["transactions-overview"]
98["transactions-overview.component.ts"]
end
subgraph 99["transfer-review"]
9A["transfer-review.component.ts"]
end
end
9B["index.ts"]
9C["transaction-filters.ts"]
9D["transaction-row-vm.ts"]
9E["transactions.routes.ts"]
end
subgraph 9F["shared"]
subgraph 9G["echarts"]
9H["bucketed-axis-option.ts"]
9I["chart-theme.ts"]
9J["echarts-setup.ts"]
9K["index.ts"]
9L["tooltip-formatter.ts"]
end
subgraph 9M["ui"]
subgraph 9N["alert"]
9O["alert.component.ts"]
end
subgraph 9P["badge"]
9Q["badge.component.ts"]
end
subgraph 9R["button"]
9S["button.component.ts"]
end
subgraph 9T["collapse"]
9U["collapse.component.ts"]
end
subgraph 9V["confirm-dialog"]
9W["confirm-dialog.component.ts"]
end
subgraph 9X["date-range-input"]
9Y["date-range-input.component.ts"]
end
subgraph 9Z["divider"]
A0["divider.component.ts"]
end
subgraph A1["dropdown"]
A2["dropdown.component.ts"]
end
subgraph A3["empty-state"]
A4["empty-state.component.ts"]
end
subgraph A5["fieldset"]
A6["fieldset.component.ts"]
end
subgraph A7["flex"]
A8["flex.component.ts"]
end
subgraph A9["granularity-picker"]
AA["granularity-picker.component.ts"]
end
AB["index.ts"]
subgraph AC["input"]
AD["input.component.ts"]
end
subgraph AE["label"]
AF["label.component.ts"]
end
subgraph AG["loading-skeleton"]
AH["loading-skeleton.component.ts"]
end
subgraph AI["modal"]
AJ["mm-modal.component.ts"]
end
subgraph AK["page-header"]
AL["page-header.component.ts"]
end
subgraph AM["paginator"]
AN["paginator.component.ts"]
end
subgraph AO["paper"]
AP["paper.component.ts"]
end
subgraph AQ["range-grouping-switcher"]
AR["range-grouping-switcher.component.ts"]
end
subgraph AS["select"]
AT["select.component.ts"]
end
subgraph AU["stat-card"]
AV["stat-card.component.ts"]
end
subgraph AW["table"]
AX["table.component.ts"]
end
subgraph AY["tabs"]
AZ["tabs.component.ts"]
end
subgraph B0["typography"]
B1["typography.component.ts"]
end
end
subgraph B2["utils"]
B3["confidence-color.ts"]
B4["confirm-state.ts"]
B5["currency-format.ts"]
B6["currency-symbol-presets.ts"]
B7["daisy-classes.ts"]
B8["date-buckets.ts"]
B9["date-format.pipe.ts"]
BA["date-format.ts"]
BB["debounced-text.ts"]
BC["download-json.ts"]
BD["fingerprint.ts"]
BE["format-settings.testing.ts"]
BF["format-settings.ts"]
BG["iban.ts"]
BH["index.ts"]
BI["link-control-to-setting.ts"]
BJ["locale-presets.ts"]
BK["number-format.ts"]
BL["pagination.ts"]
BM["percentage.ts"]
BN["search-params.ts"]
BO["selection-model.ts"]
BP["signed-amount.pipe.ts"]
BQ["sortable.ts"]
BR["structural-filters.ts"]
BS["theme-hooks.ts"]
subgraph BT["validators"]
BU["iban.validator.ts"]
BV["percentage.validator.ts"]
end
BW["with-archivable.ts"]
BX["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->2Z
5-->4
5-->6
6-->N
6-->BH
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
F-->2P
F-->BD
F-->BF
G-->F
G-->2Q
G-->BH
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
U-->BH
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
11-->2Z
11-->BH
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->28
15-->9S
15-->AR
15-->B1
15-->BH
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
1O-->1T
1O-->1V
1O-->5
1O-->N
1O-->28
1O-->2Z
1O-->BH
1P-->N
1P-->2Q
1P-->BH
1Q-->1T
1Q-->N
1Q-->BH
1R-->1O
1R-->1P
1R-->1Q
1R-->1S
1R-->1T
1R-->1U
1R-->1V
1S-->BH
1T-->N
1T-->2V
1T-->2Z
1U-->N
1V-->1T
1V-->1U
1V-->N
1V-->2Z
1X-->24
1X-->2D
1X-->N
1X-->BH
1Y-->23
1Y-->N
1Z-->1Y
1Z-->N
1Z-->BH
20-->N
21-->1Y
21-->2F
21-->N
22-->BH
23-->20
23-->24
23-->N
23-->2Z
24-->5
24-->N
25-->N
26-->BH
27-->1Z
27-->N
27-->BH
28-->1X
28-->1Y
28-->1Z
28-->20
28-->21
28-->22
28-->23
28-->24
28-->25
28-->26
28-->27
28-->29
28-->2A
28-->2B
28-->2C
28-->2D
28-->2E
28-->2F
28-->2G
28-->2H
28-->2I
28-->2J
28-->2K
29-->24
29-->N
2A-->24
2A-->5
2A-->N
2B-->2K
2D-->24
2D-->N
2D-->BH
2E-->23
2E-->N
2F-->BH
2G-->BH
2H-->N
2H-->2Z
2I-->23
2I-->N
2I-->BH
2J-->2E
2J-->N
2K-->1Z
2K-->N
2K-->BH
2M-->2N
2P-->2R
2Q-->2P
2Q-->2R
2Q-->2S
2S-->2R
2U-->N
2V-->2U
2V-->2W
2V-->2X
2W-->N
2X-->N
2X-->2Z
2Z-->30
2Z-->31
2Z-->33
2Z-->32
30-->N
31-->33
31-->N
32-->31
32-->33
32-->N
33-->6
33-->N
33-->BH
35-->N
36-->N
37-->N
38-->3K
38-->3M
38-->9K
39-->N
39-->1R
39-->28
39-->BH
3C-->AB
3C-->BH
3E-->39
3E-->N
3E-->28
3E-->9K
3E-->AB
3E-->BH
3G-->35
3G-->36
3G-->3C
3G-->AB
3I-->36
3I-->37
3I-->N
3I-->AB
3I-->BH
3I-->BU
3I-->BV
3K-->3C
3K-->3E
3K-->3I
3K-->1R
3K-->AB
3K-->BH
3M-->35
3M-->36
3M-->3G
3M-->3I
3M-->3P
3M-->N
3M-->1R
3M-->AB
3M-->BH
3N-->3C
3N-->3E
3N-->3G
3N-->3I
3N-->3K
3N-->3M
3N-->3P
3P-->39
3P-->N
3P-->1R
3P-->28
3P-->9K
3P-->AB
3Q-->36
3Q-->37
3Q-->38
3Q-->3N
3S-->3Y
3S-->4B
3U-->1E
3V-->3U
3V-->4I
3V-->N
3V-->1E
3V-->1R
3Y-->3T
3Y-->40
3Y-->N
3Y-->1R
3Y-->AB
3Y-->BH
40-->3T
40-->N
40-->AB
41-->3Y
41-->40
41-->45
41-->47
41-->49
41-->4B
43-->4D
43-->4F
43-->A
43-->N
43-->1R
43-->AB
45-->4E
45-->1R
45-->AB
45-->BH
47-->4D
47-->43
47-->N
47-->1R
47-->AB
49-->4G
49-->4I
49-->AB
49-->BH
4B-->4E
4B-->4H
4B-->4I
4B-->45
4B-->47
4B-->49
4B-->N
4B-->1R
4B-->AB
4B-->BH
4C-->3S
4C-->3T
4C-->3U
4C-->3V
4C-->41
4C-->4E
4C-->4H
4C-->4I
4D-->4F
4D-->N
4E-->4H
4E-->N
4F-->N
4G-->N
4H-->4F
4H-->N
4I-->4G
4I-->A
4I-->N
4I-->1R
4I-->BH
4K-->4N
4N-->4Q
4N-->4R
4N-->4S
4N-->4T
4N-->AB
4O-->4N
4S-->4Q
4T-->4R
4U-->4K
4U-->4O
4W-->N
50-->1R
50-->AB
50-->BH
52-->1R
52-->2Z
52-->AB
52-->BH
54-->5Q
54-->1R
54-->28
54-->9K
54-->AB
54-->BH
56-->4W
56-->4X
56-->5Q
56-->58
56-->1R
56-->AB
56-->BH
58-->4X
58-->AB
5A-->5M
5A-->5N
5A-->N
5A-->AB
5C-->5M
5C-->5N
5C-->5Q
5C-->50
5C-->52
5C-->54
5C-->56
5C-->5A
5C-->5F
5C-->5H
5C-->5J
5C-->5L
5C-->1R
5C-->28
5C-->AB
5C-->BH
5D-->50
5D-->52
5D-->54
5D-->56
5D-->5A
5D-->5C
5D-->5F
5D-->5H
5D-->5J
5D-->5L
5F-->1R
5F-->AB
5F-->BH
5H-->5Q
5H-->1R
5H-->AB
5H-->BH
5J-->1R
5J-->28
5J-->2Z
5J-->9K
5J-->AB
5J-->BH
5L-->5Q
5L-->1R
5L-->AB
5L-->BH
5M-->5N
5M-->N
5N-->N
5O-->5C
5O-->9K
5P-->5D
5P-->5O
5Q-->4W
5Q-->1R
5Q-->28
5Q-->2Z
5U-->N
5U-->2M
5U-->AB
5U-->BH
5V-->5U
5W-->5V
60-->67
60-->AB
62-->68
62-->AB
64-->68
64-->AB
65-->60
65-->62
65-->64
69-->60
69-->62
69-->64
6A-->65
6A-->69
6E-->19
6E-->AB
6F-->6E
6G-->6E
6H-->6F
6H-->6G
6J-->N
6M-->7F
6M-->3Q
6M-->AB
6O-->AB
6Q-->6U
6Q-->AB
6S-->6U
6S-->AB
6U-->AB
6W-->6J
6W-->6U
6W-->AB
6Y-->7J
6Y-->AB
70-->6J
70-->AB
72-->6J
72-->7J
72-->7K
72-->6Q
72-->6S
72-->6W
72-->6Y
72-->70
72-->74
72-->N
72-->12
72-->AB
74-->12
74-->AB
74-->BH
76-->7F
76-->7K
76-->7D
76-->N
76-->12
76-->AB
78-->N
78-->AB
7A-->7G
7A-->6O
7A-->72
7A-->76
7A-->78
7A-->1R
7A-->AB
7B-->72
7B-->74
7B-->76
7B-->78
7B-->7A
7D-->7F
7D-->6M
7D-->N
7D-->AB
7E-->A
7E-->N
7E-->12
7E-->1R
7F-->N
7G-->6J
7G-->7E
7G-->7F
7G-->7K
7G-->N
7G-->12
7G-->1R
7G-->3Q
7H-->7A
7I-->6J
7I-->7B
7I-->7E
7I-->7F
7I-->7H
7I-->7J
7I-->7K
7J-->6J
7K-->N
7M-->28
7P-->7M
7P-->7Y
7P-->AB
7P-->BH
7R-->7Y
7R-->AB
7T-->7Y
7T-->7P
7T-->7R
7T-->7V
7T-->1R
7T-->28
7T-->2Z
7T-->9K
7T-->AB
7T-->BH
7V-->7Y
7V-->1R
7V-->28
7V-->2Z
7V-->9K
7V-->AB
7V-->BH
7W-->7P
7W-->7R
7W-->7T
7W-->7V
7X-->7T
7X-->9K
7Y-->7M
7Y-->1R
7Y-->28
7Z-->7W
7Z-->7X
7Z-->7Y
82-->84
82-->86
82-->88
82-->8A
84-->86
84-->88
84-->8A
84-->AB
86-->1E
86-->1R
86-->4C
86-->AB
88-->N
88-->1E
88-->1R
88-->4C
88-->AB
88-->BH
8A-->N
8A-->1R
8A-->4C
8A-->AB
8A-->BH
8B-->82
8B-->8C
8C-->84
8F-->8N
8H-->19
8H-->AB
8J-->1R
8J-->AB
8J-->BH
8L-->5W
8L-->AB
8N-->8H
8N-->8J
8N-->8L
8N-->8P
8N-->AB
8P-->1R
8P-->2Q
8P-->AB
8Q-->8F
8Q-->8R
8R-->8N
8V-->N
8V-->1R
8V-->2V
8V-->AB
8V-->BH
8Y-->90
8Y-->92
8Y-->94
8Y-->98
8Y-->9A
90-->1R
90-->AB
92-->8V
92-->N
92-->1R
92-->2V
92-->4C
92-->AB
94-->9C
94-->1R
94-->AB
94-->BH
96-->9D
96-->8X
96-->AB
96-->BH
98-->9C
98-->9D
98-->8X
98-->90
98-->92
98-->94
98-->96
98-->9A
98-->N
98-->1R
98-->2Z
98-->4C
98-->AB
98-->BH
9A-->1R
9A-->2Z
9A-->AB
9A-->BH
9B-->9E
9C-->N
9C-->2Z
9D-->N
9E-->98
9K-->9H
9K-->9I
9K-->9J
9K-->9L
9L-->BH
9O-->BH
9Q-->BH
9S-->BH
9U-->BH
9W-->9S
9W-->AF
9W-->AJ
9W-->B1
9Y-->A2
9Y-->BH
A0-->BH
A2-->BH
A4-->A8
A4-->B1
A6-->BH
A8-->BH
AB-->9O
AB-->9Q
AB-->9S
AB-->9U
AB-->9W
AB-->9Y
AB-->A0
AB-->A2
AB-->A4
AB-->A6
AB-->A8
AB-->AA
AB-->AD
AB-->AF
AB-->AH
AB-->AJ
AB-->AL
AB-->AN
AB-->AP
AB-->AR
AB-->AT
AB-->AV
AB-->AX
AB-->AZ
AB-->B1
AD-->BH
AF-->BH
AH-->A8
AJ-->BH
AL-->A8
AL-->B1
AN-->9S
AN-->A8
AN-->B1
AN-->BH
AP-->BH
AR-->9S
AR-->9Y
AR-->A8
AT-->BH
AV-->B1
AV-->BH
AX-->BH
AZ-->BH
B1-->BH
B5-->BF
B8-->BF
B9-->BA
BA-->BF
BE-->BF
BH-->B3
BH-->B4
BH-->B5
BH-->B6
BH-->B7
BH-->B8
BH-->BA
BH-->B9
BH-->BB
BH-->BC
BH-->BD
BH-->BF
BH-->BG
BH-->BI
BH-->BJ
BH-->BK
BH-->BL
BH-->BM
BH-->BN
BH-->BO
BH-->BP
BH-->BQ
BH-->BR
BH-->BS
BH-->BW
BH-->BX
BK-->BF
BP-->B5
```
