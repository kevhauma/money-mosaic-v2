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
- 300 leaf nodes, 834 edges.
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
1Y["annual-lump-sum-smoothing.ts"]
1Z["category-breakdown.ts"]
20["category-composition-trend.ts"]
21["category-kind-contribution.ts"]
22["category-period-comparison.ts"]
23["chart-zoom-window.ts"]
24["classify-for-stats.ts"]
25["classify-joint-leg.ts"]
26["full-history-range.ts"]
27["granularity-for-span.ts"]
28["income-category-series.ts"]
29["income-gap-detection.ts"]
2A["income-growth.ts"]
2B["income-step-change-detection.ts"]
2C["index.ts"]
2D["joint-account-stake.ts"]
2E["joint-contributor-breakdown.ts"]
2F["multi-year-income-comparison.ts"]
2G["net-margin.ts"]
2H["net-worth-trend.ts"]
2I["period-stats.ts"]
2J["period-window.ts"]
2K["periodized-rate.ts"]
2L["top-transactions.ts"]
2M["weekday-weekend-split.ts"]
2N["year-over-year.ts"]
2O["yearly-income-summary.ts"]
end
subgraph 2P["storage"]
2Q["index.ts"]
2R["storage-status.service.ts"]
end
subgraph 2S["theme"]
2T["accent-colors.ts"]
2U["index.ts"]
2V["theme-styles.ts"]
2W["theme.service.ts"]
end
subgraph 2X["transactions"]
2Y["attribution-override.ts"]
2Z["index.ts"]
30["nullify-transaction.ts"]
31["transaction-deletion.service.ts"]
end
subgraph 32["transfers"]
33["index.ts"]
34["transfer-cleanup.service.ts"]
35["transfer-linking.service.ts"]
36["transfer-matching.service.ts"]
37["transfer-matching.ts"]
end
end
subgraph 38["feature-accounts"]
39["account-card-vm.ts"]
3A["account-icons.ts"]
3B["account-types.ts"]
3C["accounts.routes.ts"]
3D["balance-trend-signals.ts"]
subgraph 3E["components"]
subgraph 3F["account-balance-block"]
3G["account-balance-block.component.ts"]
end
subgraph 3H["account-balance-chart"]
3I["account-balance-chart.component.ts"]
end
subgraph 3J["account-card"]
3K["account-card.component.ts"]
end
subgraph 3L["account-form"]
3M["account-form.component.ts"]
end
subgraph 3N["accounts-detail"]
3O["accounts-detail.component.ts"]
end
subgraph 3P["accounts-overview"]
3Q["accounts-overview.component.ts"]
end
3R["index.ts"]
subgraph 3S["net-worth-history-chart"]
3T["net-worth-history-chart.component.ts"]
end
end
3U["index.ts"]
end
subgraph 3V["feature-categories"]
3W["categories.routes.ts"]
3X["category-icons.ts"]
3Y["category-model.service.ts"]
3Z["category-model.store.ts"]
subgraph 40["components"]
subgraph 41["categories-overview"]
42["categories-overview.component.ts"]
end
subgraph 43["category-form"]
44["category-form.component.ts"]
end
45["index.ts"]
subgraph 46["rule-condition-row"]
47["rule-condition-row.component.ts"]
end
subgraph 48["rule-filters"]
49["rule-filters.component.ts"]
end
subgraph 4A["rule-form"]
4B["rule-form.component.ts"]
end
subgraph 4C["rule-share-bar"]
4D["rule-share-bar.component.ts"]
end
subgraph 4E["rules-overview"]
4F["rules-overview.component.ts"]
end
end
4G["index.ts"]
4H["rule-condition-editor.ts"]
4I["rule-filters.ts"]
4J["rule-labels.ts"]
4K["rule-share.ts"]
4L["rule-summary.ts"]
4M["rules.store.ts"]
end
subgraph 4N["feature-changelog"]
4O["changelog.routes.ts"]
subgraph 4P["components"]
subgraph 4Q["changelog-page"]
4R["changelog-page.component.ts"]
end
4S["index.ts"]
end
subgraph 4T["data"]
4U["changelog-entries.ts"]
4V["roadmap-entries.ts"]
end
4W["group-changelog-entries.ts"]
4X["group-roadmap-entries.ts"]
4Y["index.ts"]
end
subgraph 4Z["feature-dashboard"]
50["category-comparison-settings.store.ts"]
51["category-comparison-vm.ts"]
subgraph 52["components"]
subgraph 53["account-balance-strip"]
54["account-balance-strip.component.ts"]
end
subgraph 55["action-queue-panel"]
56["action-queue-panel.component.ts"]
end
subgraph 57["category-breakdown-panel"]
58["category-breakdown-panel.component.ts"]
end
subgraph 59["category-comparison-panel"]
5A["category-comparison-panel.component.ts"]
end
subgraph 5B["comparison-category-card"]
5C["comparison-category-card.component.ts"]
end
subgraph 5D["dashboard-customize-panel"]
5E["dashboard-customize-panel.component.ts"]
end
subgraph 5F["dashboard-overview"]
5G["dashboard-overview.component.ts"]
end
5H["index.ts"]
subgraph 5I["net-worth-header"]
5J["net-worth-header.component.ts"]
end
subgraph 5K["top-transactions-panel"]
5L["top-transactions-panel.component.ts"]
end
subgraph 5M["trend-chart-panel"]
5N["trend-chart-panel.component.ts"]
end
subgraph 5O["weekday-weekend-split-panel"]
5P["weekday-weekend-split-panel.component.ts"]
end
end
5Q["dashboard-layout-settings.store.ts"]
5R["dashboard-row-order.ts"]
5S["dashboard.routes.ts"]
5T["index.ts"]
5U["stats.store.ts"]
end
subgraph 5V["feature-data-management"]
subgraph 5W["components"]
subgraph 5X["data-management-overview"]
5Y["data-management-overview.component.ts"]
end
5Z["index.ts"]
end
60["index.ts"]
end
subgraph 61["feature-help"]
subgraph 62["components"]
subgraph 63["faq-page"]
64["faq-page.component.ts"]
end
subgraph 65["guide-detail"]
66["guide-detail.component.ts"]
end
subgraph 67["guides-index"]
68["guides-index.component.ts"]
end
69["index.ts"]
end
subgraph 6A["data"]
6B["faq.ts"]
6C["guides.ts"]
end
6D["help.routes.ts"]
6E["index.ts"]
end
subgraph 6F["feature-home"]
subgraph 6G["components"]
subgraph 6H["home-landing"]
6I["home-landing.component.ts"]
end
6J["index.ts"]
end
6K["home.routes.ts"]
6L["index.ts"]
end
subgraph 6M["feature-import"]
6N["column-mapping.ts"]
subgraph 6O["components"]
subgraph 6P["account-draft-editor"]
6Q["account-draft-editor.component.ts"]
end
subgraph 6R["batch-wait-card"]
6S["batch-wait-card.component.ts"]
end
subgraph 6T["column-map-amount-field"]
6U["column-map-amount-field.component.ts"]
end
subgraph 6V["column-map-counterparty-field"]
6W["column-map-counterparty-field.component.ts"]
end
subgraph 6X["column-map-sample-caption"]
6Y["column-map-sample-caption.component.ts"]
end
subgraph 6Z["column-map-simple-field"]
70["column-map-simple-field.component.ts"]
end
subgraph 71["column-map-stepper"]
72["column-map-stepper.component.ts"]
end
subgraph 73["column-map-summary-step"]
74["column-map-summary-step.component.ts"]
end
subgraph 75["import-map-step"]
76["import-map-step.component.ts"]
end
subgraph 77["import-preview-step"]
78["import-preview-step.component.ts"]
end
subgraph 79["import-select-step"]
7A["import-select-step.component.ts"]
end
subgraph 7B["import-summary-step"]
7C["import-summary-step.component.ts"]
end
subgraph 7D["import-wizard"]
7E["import-wizard.component.ts"]
end
7F["index.ts"]
subgraph 7G["queued-file-row"]
7H["queued-file-row.component.ts"]
end
end
7I["import-batches.store.ts"]
7J["import-queue.ts"]
7K["import-wizard-session.ts"]
7L["import.routes.ts"]
7M["index.ts"]
7N["mapper-steps.ts"]
7O["mapping-profiles.store.ts"]
end
subgraph 7P["feature-income"]
7Q["career-start-date.ts"]
subgraph 7R["components"]
subgraph 7S["income-career-start"]
7T["income-career-start.component.ts"]
end
subgraph 7U["income-category-checklist"]
7V["income-category-checklist.component.ts"]
end
subgraph 7W["income-gap-warnings"]
7X["income-gap-warnings.component.ts"]
end
subgraph 7Y["income-growth-panel"]
7Z["income-growth-panel.component.ts"]
end
subgraph 80["income-overview"]
81["income-overview.component.ts"]
end
subgraph 82["income-settings"]
83["income-settings.component.ts"]
end
subgraph 84["income-step-changes"]
85["income-step-changes.component.ts"]
end
subgraph 86["income-yearly-panel"]
87["income-yearly-panel.component.ts"]
end
88["index.ts"]
end
89["income-category-vm.ts"]
8A["income-granularity.ts"]
8B["income.routes.ts"]
8C["income.store.ts"]
8D["index.ts"]
end
subgraph 8E["feature-learning"]
subgraph 8F["components"]
8G["index.ts"]
subgraph 8H["learning-overview"]
8I["learning-overview.component.ts"]
end
subgraph 8J["model-status"]
8K["model-status.component.ts"]
end
subgraph 8L["rule-proposals"]
8M["rule-proposals.component.ts"]
end
subgraph 8N["suggestions-table"]
8O["suggestions-table.component.ts"]
end
end
8P["index.ts"]
8Q["learning.routes.ts"]
end
subgraph 8R["feature-settings"]
subgraph 8S["components"]
8T["index.ts"]
subgraph 8U["settings-about-section"]
8V["settings-about-section.component.ts"]
end
subgraph 8W["settings-currency-locale-section"]
8X["settings-currency-locale-section.component.ts"]
end
subgraph 8Y["settings-data-section"]
8Z["settings-data-section.component.ts"]
end
subgraph 90["settings-overview"]
91["settings-overview.component.ts"]
end
subgraph 92["settings-theme-section"]
93["settings-theme-section.component.ts"]
end
end
94["index.ts"]
95["settings.routes.ts"]
end
subgraph 96["feature-transactions"]
subgraph 97["components"]
subgraph 98["attribution-override-fieldset"]
99["attribution-override-fieldset.component.ts"]
end
subgraph 9A["category-select-cell"]
9B["category-select-cell.component.ts"]
end
9C["index.ts"]
subgraph 9D["transaction-bulk-bar"]
9E["transaction-bulk-bar.component.ts"]
end
subgraph 9F["transaction-edit-form"]
9G["transaction-edit-form.component.ts"]
end
subgraph 9H["transaction-filters"]
9I["transaction-filters.component.ts"]
end
subgraph 9J["transaction-row"]
9K["transaction-row.component.ts"]
end
subgraph 9L["transactions-overview"]
9M["transactions-overview.component.ts"]
end
subgraph 9N["transfer-review"]
9O["transfer-review.component.ts"]
end
end
9P["index.ts"]
9Q["transaction-filters.ts"]
9R["transaction-row-vm.ts"]
9S["transactions.routes.ts"]
end
subgraph 9T["shared"]
subgraph 9U["echarts"]
9V["bucketed-axis-option.ts"]
9W["chart-theme.ts"]
9X["echarts-setup.ts"]
9Y["index.ts"]
9Z["tooltip-formatter.ts"]
end
subgraph A0["ui"]
subgraph A1["alert"]
A2["alert.component.ts"]
end
subgraph A3["badge"]
A4["badge.component.ts"]
end
subgraph A5["button"]
A6["button.component.ts"]
end
subgraph A7["collapse"]
A8["collapse.component.ts"]
end
subgraph A9["confirm-dialog"]
AA["confirm-dialog.component.ts"]
end
subgraph AB["date-range-input"]
AC["date-range-input.component.ts"]
end
subgraph AD["divider"]
AE["divider.component.ts"]
end
subgraph AF["dropdown"]
AG["dropdown.component.ts"]
end
subgraph AH["empty-state"]
AI["empty-state.component.ts"]
end
subgraph AJ["fieldset"]
AK["fieldset.component.ts"]
end
subgraph AL["flex"]
AM["flex.component.ts"]
end
subgraph AN["granularity-picker"]
AO["granularity-picker.component.ts"]
end
AP["index.ts"]
subgraph AQ["input"]
AR["input.component.ts"]
end
subgraph AS["label"]
AT["label.component.ts"]
end
subgraph AU["loading-skeleton"]
AV["loading-skeleton.component.ts"]
end
subgraph AW["modal"]
AX["mm-modal.component.ts"]
end
subgraph AY["page-header"]
AZ["page-header.component.ts"]
end
subgraph B0["paginator"]
B1["paginator.component.ts"]
end
subgraph B2["paper"]
B3["paper.component.ts"]
end
subgraph B4["range-grouping-switcher"]
B5["range-grouping-switcher.component.ts"]
end
subgraph B6["select"]
B7["select.component.ts"]
end
subgraph B8["stat-card"]
B9["stat-card.component.ts"]
end
subgraph BA["table"]
BB["table.component.ts"]
end
subgraph BC["tabs"]
BD["tabs.component.ts"]
end
subgraph BE["typography"]
BF["typography.component.ts"]
end
end
subgraph BG["utils"]
BH["confidence-color.ts"]
BI["confirm-state.ts"]
BJ["currency-format.ts"]
BK["currency-symbol-presets.ts"]
BL["daisy-classes.ts"]
BM["date-buckets.ts"]
BN["date-format.pipe.ts"]
BO["date-format.ts"]
BP["debounced-text.ts"]
BQ["download-json.ts"]
BR["fingerprint.ts"]
BS["format-settings.testing.ts"]
BT["format-settings.ts"]
BU["iban.ts"]
BV["index.ts"]
BW["link-control-to-setting.ts"]
BX["locale-presets.ts"]
BY["number-format.ts"]
BZ["pagination.ts"]
C0["percentage.ts"]
C1["search-params.ts"]
C2["selection-model.ts"]
C3["signed-amount.pipe.ts"]
C4["sortable.ts"]
C5["structural-filters.ts"]
C6["theme-hooks.ts"]
subgraph C7["validators"]
C8["iban.validator.ts"]
C9["percentage.validator.ts"]
end
CA["with-archivable.ts"]
CB["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->33
5-->4
5-->6
6-->N
6-->BV
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
F-->2T
F-->BR
F-->BT
G-->F
G-->2U
G-->BV
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
U-->BV
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
11-->33
11-->BV
12-->U
12-->V
12-->W
12-->Y
12-->Z
12-->10
12-->11
15-->1R
15-->2C
15-->A6
15-->B5
15-->BF
15-->BV
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
1O-->2C
1O-->33
1O-->BV
1P-->N
1P-->2U
1P-->BV
1Q-->1T
1Q-->N
1Q-->BV
1R-->1O
1R-->1P
1R-->1Q
1R-->1S
1R-->1T
1R-->1U
1R-->1V
1S-->BV
1T-->N
1T-->2Z
1T-->33
1U-->N
1V-->1T
1V-->1U
1V-->N
1V-->33
1X-->25
1X-->2H
1X-->N
1X-->BV
1Y-->20
1Y-->28
1Y-->BV
1Z-->24
1Z-->N
20-->1Z
20-->N
20-->BV
21-->N
22-->1Z
22-->2J
22-->N
23-->BV
24-->21
24-->25
24-->N
24-->33
25-->5
25-->N
26-->N
27-->BV
28-->20
28-->N
28-->BV
29-->20
29-->28
29-->BV
2A-->28
2A-->2N
2A-->BV
2B-->20
2B-->28
2B-->BV
2C-->1X
2C-->1Y
2C-->1Z
2C-->20
2C-->21
2C-->22
2C-->23
2C-->24
2C-->25
2C-->26
2C-->27
2C-->28
2C-->29
2C-->2A
2C-->2B
2C-->2D
2C-->2E
2C-->2F
2C-->2G
2C-->2H
2C-->2I
2C-->2J
2C-->2K
2C-->2L
2C-->2M
2C-->2N
2C-->2O
2D-->25
2D-->N
2E-->25
2E-->5
2E-->N
2F-->2O
2H-->25
2H-->N
2H-->BV
2I-->24
2I-->N
2J-->BV
2K-->BV
2L-->N
2L-->33
2M-->24
2M-->N
2M-->BV
2N-->2I
2N-->N
2O-->20
2O-->N
2O-->BV
2Q-->2R
2T-->2V
2U-->2T
2U-->2V
2U-->2W
2W-->2V
2Y-->N
2Z-->2Y
2Z-->30
2Z-->31
30-->N
31-->N
31-->33
33-->34
33-->35
33-->37
33-->36
34-->N
35-->37
35-->N
36-->35
36-->37
36-->N
37-->6
37-->N
37-->BV
39-->N
3A-->N
3B-->N
3C-->3O
3C-->3Q
3C-->9Y
3D-->N
3D-->1R
3D-->2C
3D-->BV
3G-->AP
3G-->BV
3I-->3D
3I-->N
3I-->2C
3I-->9Y
3I-->AP
3I-->BV
3K-->39
3K-->3A
3K-->3G
3K-->AP
3M-->3A
3M-->3B
3M-->N
3M-->AP
3M-->BV
3M-->C8
3M-->C9
3O-->3G
3O-->3I
3O-->3M
3O-->1R
3O-->AP
3O-->BV
3Q-->39
3Q-->3A
3Q-->3K
3Q-->3M
3Q-->3T
3Q-->N
3Q-->1R
3Q-->AP
3Q-->BV
3R-->3G
3R-->3I
3R-->3K
3R-->3M
3R-->3O
3R-->3Q
3R-->3T
3T-->3D
3T-->N
3T-->1R
3T-->2C
3T-->9Y
3T-->AP
3U-->3A
3U-->3B
3U-->3C
3U-->3R
3W-->42
3W-->4F
3Y-->1E
3Z-->3Y
3Z-->4M
3Z-->N
3Z-->1E
3Z-->1R
42-->3X
42-->44
42-->N
42-->1R
42-->AP
42-->BV
44-->3X
44-->N
44-->AP
45-->42
45-->44
45-->49
45-->4B
45-->4D
45-->4F
47-->4H
47-->4J
47-->A
47-->N
47-->1R
47-->AP
49-->4I
49-->1R
49-->AP
49-->BV
4B-->4H
4B-->47
4B-->N
4B-->1R
4B-->AP
4D-->4K
4D-->4M
4D-->AP
4D-->BV
4F-->4I
4F-->4L
4F-->4M
4F-->49
4F-->4B
4F-->4D
4F-->N
4F-->1R
4F-->AP
4F-->BV
4G-->3W
4G-->3X
4G-->3Y
4G-->3Z
4G-->45
4G-->4I
4G-->4L
4G-->4M
4H-->4J
4H-->N
4I-->4L
4I-->N
4J-->N
4K-->N
4L-->4J
4L-->N
4M-->4K
4M-->A
4M-->N
4M-->1R
4M-->BV
4O-->4R
4R-->4U
4R-->4V
4R-->4W
4R-->4X
4R-->AP
4S-->4R
4W-->4U
4X-->4V
4Y-->4O
4Y-->4S
50-->N
54-->1R
54-->AP
54-->BV
56-->1R
56-->33
56-->AP
56-->BV
58-->5U
58-->1R
58-->2C
58-->9Y
58-->AP
58-->BV
5A-->50
5A-->51
5A-->5U
5A-->5C
5A-->1R
5A-->AP
5A-->BV
5C-->51
5C-->AP
5E-->5Q
5E-->5R
5E-->N
5E-->AP
5G-->5Q
5G-->5R
5G-->5U
5G-->54
5G-->56
5G-->58
5G-->5A
5G-->5E
5G-->5J
5G-->5L
5G-->5N
5G-->5P
5G-->1R
5G-->2C
5G-->AP
5G-->BV
5H-->54
5H-->56
5H-->58
5H-->5A
5H-->5E
5H-->5G
5H-->5J
5H-->5L
5H-->5N
5H-->5P
5J-->1R
5J-->AP
5J-->BV
5L-->5U
5L-->1R
5L-->AP
5L-->BV
5N-->1R
5N-->2C
5N-->33
5N-->9Y
5N-->AP
5N-->BV
5P-->5U
5P-->1R
5P-->AP
5P-->BV
5Q-->5R
5Q-->N
5R-->N
5S-->5G
5S-->9Y
5T-->5H
5T-->5S
5U-->50
5U-->1R
5U-->2C
5U-->33
5Y-->N
5Y-->2Q
5Y-->AP
5Y-->BV
5Z-->5Y
60-->5Z
64-->6B
64-->AP
66-->6C
66-->AP
68-->6C
68-->AP
69-->64
69-->66
69-->68
6D-->64
6D-->66
6D-->68
6E-->69
6E-->6D
6I-->19
6I-->AP
6J-->6I
6K-->6I
6L-->6J
6L-->6K
6N-->N
6Q-->7J
6Q-->3U
6Q-->AP
6S-->AP
6U-->6Y
6U-->AP
6W-->6Y
6W-->AP
6Y-->AP
70-->6N
70-->6Y
70-->AP
72-->7N
72-->AP
74-->6N
74-->AP
76-->6N
76-->7N
76-->7O
76-->6U
76-->6W
76-->70
76-->72
76-->74
76-->78
76-->N
76-->12
76-->AP
78-->12
78-->AP
78-->BV
7A-->7J
7A-->7O
7A-->7H
7A-->N
7A-->12
7A-->AP
7C-->N
7C-->AP
7E-->7K
7E-->6S
7E-->76
7E-->7A
7E-->7C
7E-->1R
7E-->AP
7F-->76
7F-->78
7F-->7A
7F-->7C
7F-->7E
7H-->7J
7H-->6Q
7H-->N
7H-->AP
7I-->A
7I-->N
7I-->12
7I-->1R
7J-->N
7K-->6N
7K-->7I
7K-->7J
7K-->7O
7K-->N
7K-->12
7K-->1R
7K-->3U
7L-->7E
7M-->6N
7M-->7F
7M-->7I
7M-->7J
7M-->7L
7M-->7N
7M-->7O
7N-->6N
7O-->N
7Q-->2C
7T-->7Q
7T-->8C
7T-->AP
7T-->BV
7V-->89
7V-->AP
7X-->8A
7X-->8C
7X-->N
7X-->1R
7X-->2C
7X-->AP
7X-->BV
7Z-->8A
7Z-->8C
7Z-->2C
7Z-->AP
7Z-->BV
81-->8C
81-->7X
81-->7Z
81-->83
81-->85
81-->87
81-->2C
81-->9Y
81-->AP
81-->BV
83-->89
83-->8C
83-->7T
83-->7V
83-->AP
85-->8A
85-->8C
85-->N
85-->1R
85-->2C
85-->AP
85-->BV
87-->8C
87-->1R
87-->2C
87-->33
87-->9Y
87-->AP
87-->BV
88-->7T
88-->7V
88-->7X
88-->7Z
88-->81
88-->83
88-->85
88-->87
89-->N
8A-->BV
8B-->81
8B-->9Y
8C-->7Q
8C-->8A
8C-->1R
8C-->2C
8C-->33
8D-->88
8D-->89
8D-->8A
8D-->8B
8D-->8C
8G-->8I
8G-->8K
8G-->8M
8G-->8O
8I-->8K
8I-->8M
8I-->8O
8I-->AP
8K-->1E
8K-->1R
8K-->4G
8K-->AP
8M-->N
8M-->1E
8M-->1R
8M-->4G
8M-->AP
8M-->BV
8O-->N
8O-->1R
8O-->4G
8O-->AP
8O-->BV
8P-->8G
8P-->8Q
8Q-->8I
8T-->91
8V-->19
8V-->AP
8X-->1R
8X-->AP
8X-->BV
8Z-->60
8Z-->AP
91-->8V
91-->8X
91-->8Z
91-->93
91-->AP
93-->1R
93-->2U
93-->AP
94-->8T
94-->95
95-->91
99-->N
99-->1R
99-->2Z
99-->AP
99-->BV
9C-->9E
9C-->9G
9C-->9I
9C-->9M
9C-->9O
9E-->1R
9E-->AP
9G-->99
9G-->N
9G-->1R
9G-->2Z
9G-->4G
9G-->AP
9I-->9Q
9I-->1R
9I-->AP
9I-->BV
9K-->9R
9K-->9B
9K-->AP
9K-->BV
9M-->9Q
9M-->9R
9M-->9B
9M-->9E
9M-->9G
9M-->9I
9M-->9K
9M-->9O
9M-->N
9M-->1R
9M-->33
9M-->4G
9M-->AP
9M-->BV
9O-->1R
9O-->33
9O-->AP
9O-->BV
9P-->9S
9Q-->N
9Q-->33
9R-->N
9S-->9M
9Y-->9V
9Y-->9W
9Y-->9X
9Y-->9Z
9Z-->BV
A2-->BV
A4-->BV
A6-->BV
A8-->BV
AA-->A6
AA-->AT
AA-->AX
AA-->BF
AC-->AG
AC-->BV
AE-->BV
AG-->BV
AI-->AM
AI-->BF
AK-->BV
AM-->BV
AP-->A2
AP-->A4
AP-->A6
AP-->A8
AP-->AA
AP-->AC
AP-->AE
AP-->AG
AP-->AI
AP-->AK
AP-->AM
AP-->AO
AP-->AR
AP-->AT
AP-->AV
AP-->AX
AP-->AZ
AP-->B1
AP-->B3
AP-->B5
AP-->B7
AP-->B9
AP-->BB
AP-->BD
AP-->BF
AR-->BV
AT-->BV
AV-->AM
AX-->BV
AZ-->AM
AZ-->BF
B1-->A6
B1-->AM
B1-->BF
B1-->BV
B3-->BV
B5-->A6
B5-->AC
B5-->AM
B7-->BV
B9-->BF
B9-->BV
BB-->BV
BD-->BV
BF-->BV
BJ-->BT
BM-->BT
BN-->BO
BO-->BT
BS-->BT
BV-->BH
BV-->BI
BV-->BJ
BV-->BK
BV-->BL
BV-->BM
BV-->BO
BV-->BN
BV-->BP
BV-->BQ
BV-->BR
BV-->BT
BV-->BU
BV-->BW
BV-->BX
BV-->BY
BV-->BZ
BV-->C0
BV-->C1
BV-->C2
BV-->C3
BV-->C4
BV-->C5
BV-->C6
BV-->CA
BV-->CB
BY-->BT
C3-->BJ
```
