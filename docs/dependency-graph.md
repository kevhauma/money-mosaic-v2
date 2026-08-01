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
- 312 leaf nodes, 880 edges.
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
Q["salary-metadata.repository.ts"]
R["transactions.repository.ts"]
S["transfer-settings.repository.ts"]
T["transfers.repository.ts"]
end
subgraph U["import"]
V["account-detection.ts"]
W["csv-import.service.ts"]
X["csv-parse.ts"]
Y["csv-parse.worker.ts"]
Z["csv-row-mapper.ts"]
10["csv-worker.types.ts"]
11["delimiter-guess.ts"]
12["import.service.ts"]
13["index.ts"]
end
subgraph 14["layout"]
subgraph 15["app-shell"]
16["app-shell.component.ts"]
end
17["index.ts"]
end
subgraph 18["links"]
19["external-links.ts"]
1A["index.ts"]
end
subgraph 1B["ml"]
1C["category-model.worker.ts"]
1D["category-model.worker.types.ts"]
1E["feature-hashing.ts"]
1F["index.ts"]
1G["model-config.ts"]
1H["rule-proposal-mining.ts"]
1I["training-window.ts"]
end
subgraph 1J["onboarding"]
1K["home-redirect.guard.ts"]
1L["index.ts"]
1M["mark-visited.guard.ts"]
1N["visited.service.ts"]
end
subgraph 1O["state"]
1P["accounts.store.ts"]
1Q["app-settings.store.ts"]
1R["categories.store.ts"]
1S["index.ts"]
1T["range-state.store.ts"]
1U["transactions.store.ts"]
1V["transfer-settings.store.ts"]
1W["transfers.store.ts"]
end
subgraph 1X["stats"]
1Y["account-balance-trend.ts"]
1Z["annual-lump-sum-smoothing.ts"]
20["category-breakdown.ts"]
21["category-composition-trend.ts"]
22["category-kind-contribution.ts"]
23["category-period-comparison.ts"]
24["chart-zoom-window.ts"]
25["classify-for-stats.ts"]
26["classify-joint-leg.ts"]
27["embedded-bonus-smoothing.ts"]
28["full-history-range.ts"]
29["granularity-for-span.ts"]
2A["gross-net-growth.ts"]
2B["gross-net-ratio.ts"]
2C["income-category-series.ts"]
2D["income-gap-detection.ts"]
2E["income-growth.ts"]
2F["income-step-change-detection.ts"]
2G["index.ts"]
2H["joint-account-stake.ts"]
2I["joint-contributor-breakdown.ts"]
2J["multi-year-income-comparison.ts"]
2K["net-margin.ts"]
2L["net-worth-trend.ts"]
2M["period-stats.ts"]
2N["period-window.ts"]
2O["periodized-rate.ts"]
2P["top-transactions.ts"]
2Q["weekday-weekend-split.ts"]
2R["year-over-year.ts"]
2S["yearly-income-summary.ts"]
end
subgraph 2T["storage"]
2U["index.ts"]
2V["storage-status.service.ts"]
end
subgraph 2W["theme"]
2X["accent-colors.ts"]
2Y["index.ts"]
2Z["theme-styles.ts"]
30["theme.service.ts"]
end
subgraph 31["transactions"]
32["attribution-override.ts"]
33["index.ts"]
34["nullify-transaction.ts"]
35["transaction-deletion.service.ts"]
end
subgraph 36["transfers"]
37["index.ts"]
38["transfer-cleanup.service.ts"]
39["transfer-linking.service.ts"]
3A["transfer-matching.service.ts"]
3B["transfer-matching.ts"]
end
end
subgraph 3C["feature-accounts"]
3D["account-card-vm.ts"]
3E["account-icons.ts"]
3F["account-types.ts"]
3G["accounts.routes.ts"]
3H["balance-trend-signals.ts"]
subgraph 3I["components"]
subgraph 3J["account-balance-block"]
3K["account-balance-block.component.ts"]
end
subgraph 3L["account-balance-chart"]
3M["account-balance-chart.component.ts"]
end
subgraph 3N["account-card"]
3O["account-card.component.ts"]
end
subgraph 3P["account-form"]
3Q["account-form.component.ts"]
end
subgraph 3R["accounts-detail"]
3S["accounts-detail.component.ts"]
end
subgraph 3T["accounts-overview"]
3U["accounts-overview.component.ts"]
end
3V["index.ts"]
subgraph 3W["net-worth-history-chart"]
3X["net-worth-history-chart.component.ts"]
end
end
3Y["index.ts"]
end
subgraph 3Z["feature-categories"]
40["categories.routes.ts"]
41["category-icons.ts"]
42["category-model.service.ts"]
43["category-model.store.ts"]
subgraph 44["components"]
subgraph 45["categories-overview"]
46["categories-overview.component.ts"]
end
subgraph 47["category-form"]
48["category-form.component.ts"]
end
49["index.ts"]
subgraph 4A["rule-condition-row"]
4B["rule-condition-row.component.ts"]
end
subgraph 4C["rule-filters"]
4D["rule-filters.component.ts"]
end
subgraph 4E["rule-form"]
4F["rule-form.component.ts"]
end
subgraph 4G["rule-share-bar"]
4H["rule-share-bar.component.ts"]
end
subgraph 4I["rules-overview"]
4J["rules-overview.component.ts"]
end
end
4K["index.ts"]
4L["rule-condition-editor.ts"]
4M["rule-filters.ts"]
4N["rule-labels.ts"]
4O["rule-share.ts"]
4P["rule-summary.ts"]
4Q["rules.store.ts"]
end
subgraph 4R["feature-changelog"]
4S["changelog.routes.ts"]
subgraph 4T["components"]
subgraph 4U["changelog-entry-row"]
4V["changelog-entry-row.component.ts"]
end
subgraph 4W["changelog-page"]
4X["changelog-page.component.ts"]
end
4Y["index.ts"]
end
subgraph 4Z["data"]
50["changelog-entries.ts"]
51["roadmap-entries.ts"]
end
52["group-changelog-entries.ts"]
53["group-roadmap-entries.ts"]
54["index.ts"]
end
subgraph 55["feature-dashboard"]
56["category-comparison-settings.store.ts"]
57["category-comparison-vm.ts"]
subgraph 58["components"]
subgraph 59["account-balance-strip"]
5A["account-balance-strip.component.ts"]
end
subgraph 5B["action-queue-panel"]
5C["action-queue-panel.component.ts"]
end
subgraph 5D["category-breakdown-panel"]
5E["category-breakdown-panel.component.ts"]
end
subgraph 5F["category-comparison-panel"]
5G["category-comparison-panel.component.ts"]
end
subgraph 5H["comparison-category-card"]
5I["comparison-category-card.component.ts"]
end
subgraph 5J["dashboard-customize-panel"]
5K["dashboard-customize-panel.component.ts"]
end
subgraph 5L["dashboard-overview"]
5M["dashboard-overview.component.ts"]
end
5N["index.ts"]
subgraph 5O["net-worth-header"]
5P["net-worth-header.component.ts"]
end
subgraph 5Q["top-transactions-panel"]
5R["top-transactions-panel.component.ts"]
end
subgraph 5S["trend-chart-panel"]
5T["trend-chart-panel.component.ts"]
end
subgraph 5U["weekday-weekend-split-panel"]
5V["weekday-weekend-split-panel.component.ts"]
end
end
5W["dashboard-layout-settings.store.ts"]
5X["dashboard-row-order.ts"]
5Y["dashboard.routes.ts"]
5Z["index.ts"]
60["stats.store.ts"]
end
subgraph 61["feature-data-management"]
subgraph 62["components"]
subgraph 63["data-management-overview"]
64["data-management-overview.component.ts"]
end
65["index.ts"]
end
66["index.ts"]
end
subgraph 67["feature-help"]
subgraph 68["components"]
subgraph 69["faq-page"]
6A["faq-page.component.ts"]
end
subgraph 6B["guide-detail"]
6C["guide-detail.component.ts"]
end
subgraph 6D["guides-index"]
6E["guides-index.component.ts"]
end
6F["index.ts"]
end
subgraph 6G["data"]
6H["faq.ts"]
6I["guides.ts"]
end
6J["help.routes.ts"]
6K["index.ts"]
end
subgraph 6L["feature-home"]
subgraph 6M["components"]
subgraph 6N["home-landing"]
6O["home-landing.component.ts"]
end
6P["index.ts"]
end
6Q["home.routes.ts"]
6R["index.ts"]
end
subgraph 6S["feature-import"]
6T["column-mapping.ts"]
subgraph 6U["components"]
subgraph 6V["account-draft-editor"]
6W["account-draft-editor.component.ts"]
end
subgraph 6X["batch-wait-card"]
6Y["batch-wait-card.component.ts"]
end
subgraph 6Z["column-map-amount-field"]
70["column-map-amount-field.component.ts"]
end
subgraph 71["column-map-counterparty-field"]
72["column-map-counterparty-field.component.ts"]
end
subgraph 73["column-map-sample-caption"]
74["column-map-sample-caption.component.ts"]
end
subgraph 75["column-map-simple-field"]
76["column-map-simple-field.component.ts"]
end
subgraph 77["column-map-stepper"]
78["column-map-stepper.component.ts"]
end
subgraph 79["column-map-summary-step"]
7A["column-map-summary-step.component.ts"]
end
subgraph 7B["import-map-step"]
7C["import-map-step.component.ts"]
end
subgraph 7D["import-preview-step"]
7E["import-preview-step.component.ts"]
end
subgraph 7F["import-select-step"]
7G["import-select-step.component.ts"]
end
subgraph 7H["import-summary-step"]
7I["import-summary-step.component.ts"]
end
subgraph 7J["import-wizard"]
7K["import-wizard.component.ts"]
end
7L["index.ts"]
subgraph 7M["queued-file-row"]
7N["queued-file-row.component.ts"]
end
end
7O["import-batches.store.ts"]
7P["import-queue.ts"]
7Q["import-wizard-session.ts"]
7R["import.routes.ts"]
7S["index.ts"]
7T["mapper-steps.ts"]
7U["mapping-profiles.store.ts"]
end
subgraph 7V["feature-income"]
7W["career-start-date.ts"]
subgraph 7X["components"]
subgraph 7Y["income-career-start"]
7Z["income-career-start.component.ts"]
end
subgraph 80["income-category-checklist"]
81["income-category-checklist.component.ts"]
end
subgraph 82["income-chart-cell"]
83["income-chart-cell.component.ts"]
end
subgraph 84["income-gap-warnings"]
85["income-gap-warnings.component.ts"]
end
subgraph 86["income-gross-color"]
87["income-gross-color.component.ts"]
end
subgraph 88["income-gross-net-section"]
89["income-gross-net-section.component.ts"]
end
subgraph 8A["income-growth-panel"]
8B["income-growth-panel.component.ts"]
end
subgraph 8C["income-overview"]
8D["income-overview.component.ts"]
end
subgraph 8E["income-settings"]
8F["income-settings.component.ts"]
end
subgraph 8G["income-step-changes"]
8H["income-step-changes.component.ts"]
end
subgraph 8I["income-yearly-panel"]
8J["income-yearly-panel.component.ts"]
end
8K["index.ts"]
subgraph 8L["salary-metadata-table"]
8M["salary-metadata-table.component.ts"]
end
end
8N["gross-net-chart-options.ts"]
8O["income-category-vm.ts"]
8P["income-granularity.ts"]
8Q["income.routes.ts"]
8R["income.store.ts"]
8S["index.ts"]
8T["salary-metadata-edit.ts"]
8U["salary-metadata-rows.ts"]
end
subgraph 8V["feature-learning"]
subgraph 8W["components"]
8X["index.ts"]
subgraph 8Y["learning-overview"]
8Z["learning-overview.component.ts"]
end
subgraph 90["model-status"]
91["model-status.component.ts"]
end
subgraph 92["rule-proposals"]
93["rule-proposals.component.ts"]
end
subgraph 94["suggestions-table"]
95["suggestions-table.component.ts"]
end
end
96["index.ts"]
97["learning.routes.ts"]
end
subgraph 98["feature-settings"]
subgraph 99["components"]
9A["index.ts"]
subgraph 9B["settings-about-section"]
9C["settings-about-section.component.ts"]
end
subgraph 9D["settings-currency-locale-section"]
9E["settings-currency-locale-section.component.ts"]
end
subgraph 9F["settings-data-section"]
9G["settings-data-section.component.ts"]
end
subgraph 9H["settings-overview"]
9I["settings-overview.component.ts"]
end
subgraph 9J["settings-theme-section"]
9K["settings-theme-section.component.ts"]
end
end
9L["index.ts"]
9M["settings.routes.ts"]
end
subgraph 9N["feature-transactions"]
subgraph 9O["components"]
subgraph 9P["attribution-override-fieldset"]
9Q["attribution-override-fieldset.component.ts"]
end
subgraph 9R["category-select-cell"]
9S["category-select-cell.component.ts"]
end
9T["index.ts"]
subgraph 9U["transaction-bulk-bar"]
9V["transaction-bulk-bar.component.ts"]
end
subgraph 9W["transaction-edit-form"]
9X["transaction-edit-form.component.ts"]
end
subgraph 9Y["transaction-filters"]
9Z["transaction-filters.component.ts"]
end
subgraph A0["transaction-row"]
A1["transaction-row.component.ts"]
end
subgraph A2["transactions-overview"]
A3["transactions-overview.component.ts"]
end
subgraph A4["transfer-review"]
A5["transfer-review.component.ts"]
end
end
A6["index.ts"]
A7["transaction-filters.ts"]
A8["transaction-row-vm.ts"]
A9["transactions.routes.ts"]
end
subgraph AA["shared"]
subgraph AB["echarts"]
AC["bucketed-axis-option.ts"]
AD["chart-theme.ts"]
AE["echarts-setup.ts"]
AF["index.ts"]
AG["tooltip-formatter.ts"]
end
subgraph AH["ui"]
subgraph AI["alert"]
AJ["alert.component.ts"]
end
subgraph AK["badge"]
AL["badge.component.ts"]
end
subgraph AM["button"]
AN["button.component.ts"]
end
subgraph AO["collapse"]
AP["collapse.component.ts"]
end
subgraph AQ["confirm-dialog"]
AR["confirm-dialog.component.ts"]
end
subgraph AS["date-range-input"]
AT["date-range-input.component.ts"]
end
subgraph AU["divider"]
AV["divider.component.ts"]
end
subgraph AW["dropdown"]
AX["dropdown.component.ts"]
end
subgraph AY["empty-state"]
AZ["empty-state.component.ts"]
end
subgraph B0["fieldset"]
B1["fieldset.component.ts"]
end
subgraph B2["flex"]
B3["flex.component.ts"]
end
subgraph B4["granularity-picker"]
B5["granularity-picker.component.ts"]
end
B6["index.ts"]
subgraph B7["input"]
B8["input.component.ts"]
end
subgraph B9["label"]
BA["label.component.ts"]
end
subgraph BB["loading-skeleton"]
BC["loading-skeleton.component.ts"]
end
subgraph BD["modal"]
BE["mm-modal.component.ts"]
end
subgraph BF["page-header"]
BG["page-header.component.ts"]
end
subgraph BH["paginator"]
BI["paginator.component.ts"]
end
subgraph BJ["paper"]
BK["paper.component.ts"]
end
subgraph BL["range-grouping-switcher"]
BM["range-grouping-switcher.component.ts"]
end
subgraph BN["select"]
BO["select.component.ts"]
end
subgraph BP["stat-card"]
BQ["stat-card.component.ts"]
end
subgraph BR["table"]
BS["table.component.ts"]
end
subgraph BT["tabs"]
BU["tabs.component.ts"]
end
subgraph BV["typography"]
BW["typography.component.ts"]
end
end
subgraph BX["utils"]
BY["confidence-color.ts"]
BZ["confirm-state.ts"]
C0["currency-format.ts"]
C1["currency-symbol-presets.ts"]
C2["daisy-classes.ts"]
C3["date-buckets.ts"]
C4["date-format.pipe.ts"]
C5["date-format.ts"]
C6["debounced-text.ts"]
C7["download-json.ts"]
C8["fingerprint.ts"]
C9["format-settings.testing.ts"]
CA["format-settings.ts"]
CB["iban.ts"]
CC["index.ts"]
CD["link-control-to-setting.ts"]
CE["locale-presets.ts"]
CF["number-format.ts"]
CG["pagination.ts"]
CH["percentage.ts"]
CI["search-params.ts"]
CJ["selection-model.ts"]
CK["signed-amount.pipe.ts"]
CL["sortable.ts"]
CM["structural-filters.ts"]
CN["theme-hooks.ts"]
subgraph CO["validators"]
CP["iban.validator.ts"]
CQ["percentage.validator.ts"]
end
CR["with-archivable.ts"]
CS["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->37
5-->4
5-->6
6-->N
6-->CC
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
F-->1G
F-->2X
F-->C8
F-->CA
G-->F
G-->2Y
G-->CC
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
N-->T
O-->F
P-->F
Q-->F
R-->F
S-->F
T-->F
V-->N
V-->CC
W-->10
W-->N
X-->Z
X-->10
Y-->X
Y-->10
Z-->N
10-->Z
10-->N
12-->Z
12-->N
12-->37
12-->CC
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1S
16-->2G
16-->AN
16-->BM
16-->BW
16-->CC
17-->16
1A-->19
1C-->1D
1C-->1E
1C-->1G
1D-->1G
1E-->1G
1F-->1D
1F-->1E
1F-->1G
1F-->1H
1F-->1I
1H-->A
1H-->N
1K-->1N
1L-->1K
1L-->1M
1L-->1N
1M-->1N
1P-->1R
1P-->1U
1P-->1W
1P-->5
1P-->N
1P-->2G
1P-->37
1P-->CC
1Q-->N
1Q-->2Y
1Q-->CC
1R-->1U
1R-->N
1R-->CC
1S-->1P
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1S-->1W
1T-->CC
1U-->N
1U-->33
1U-->37
1V-->N
1W-->1U
1W-->1V
1W-->N
1W-->37
1Y-->26
1Y-->2L
1Y-->N
1Y-->CC
1Z-->21
1Z-->2C
1Z-->CC
20-->25
20-->N
21-->20
21-->N
21-->CC
22-->N
23-->20
23-->2N
23-->N
24-->CC
25-->22
25-->26
25-->N
25-->37
26-->5
26-->N
27-->2C
27-->N
27-->CC
28-->N
29-->CC
2A-->2B
2B-->2C
2B-->N
2C-->21
2C-->N
2C-->CC
2D-->21
2D-->2C
2D-->CC
2E-->2C
2E-->2R
2E-->CC
2F-->21
2F-->2C
2F-->CC
2G-->1Y
2G-->1Z
2G-->20
2G-->21
2G-->22
2G-->23
2G-->24
2G-->25
2G-->26
2G-->27
2G-->28
2G-->29
2G-->2A
2G-->2B
2G-->2C
2G-->2D
2G-->2E
2G-->2F
2G-->2H
2G-->2I
2G-->2J
2G-->2K
2G-->2L
2G-->2M
2G-->2N
2G-->2O
2G-->2P
2G-->2Q
2G-->2R
2G-->2S
2H-->26
2H-->N
2I-->26
2I-->5
2I-->N
2J-->2S
2L-->26
2L-->N
2L-->CC
2M-->25
2M-->N
2N-->CC
2O-->CC
2P-->N
2P-->37
2Q-->25
2Q-->N
2Q-->CC
2R-->2M
2R-->N
2S-->21
2S-->N
2S-->CC
2U-->2V
2X-->2Z
2Y-->2X
2Y-->2Z
2Y-->30
30-->2Z
32-->N
33-->32
33-->34
33-->35
34-->N
35-->N
35-->37
37-->38
37-->39
37-->3B
37-->3A
38-->N
39-->3B
39-->N
3A-->39
3A-->3B
3A-->N
3B-->6
3B-->N
3B-->CC
3D-->N
3E-->N
3F-->N
3G-->3S
3G-->3U
3G-->AF
3H-->N
3H-->1S
3H-->2G
3H-->CC
3K-->B6
3K-->CC
3M-->3H
3M-->N
3M-->2G
3M-->AF
3M-->B6
3M-->CC
3O-->3D
3O-->3E
3O-->3K
3O-->B6
3Q-->3E
3Q-->3F
3Q-->N
3Q-->B6
3Q-->CC
3Q-->CP
3Q-->CQ
3S-->3K
3S-->3M
3S-->3Q
3S-->1S
3S-->B6
3S-->CC
3U-->3D
3U-->3E
3U-->3O
3U-->3Q
3U-->3X
3U-->N
3U-->1S
3U-->B6
3U-->CC
3V-->3K
3V-->3M
3V-->3O
3V-->3Q
3V-->3S
3V-->3U
3V-->3X
3X-->3H
3X-->N
3X-->1S
3X-->2G
3X-->AF
3X-->B6
3Y-->3E
3Y-->3F
3Y-->3G
3Y-->3V
40-->46
40-->4J
42-->1F
43-->42
43-->4Q
43-->N
43-->1F
43-->1S
46-->41
46-->48
46-->N
46-->1S
46-->B6
46-->CC
48-->41
48-->N
48-->B6
49-->46
49-->48
49-->4D
49-->4F
49-->4H
49-->4J
4B-->4L
4B-->4N
4B-->A
4B-->N
4B-->1S
4B-->B6
4D-->4M
4D-->1S
4D-->B6
4D-->CC
4F-->4L
4F-->4B
4F-->N
4F-->1S
4F-->B6
4H-->4O
4H-->4Q
4H-->B6
4H-->CC
4J-->4M
4J-->4P
4J-->4Q
4J-->4D
4J-->4F
4J-->4H
4J-->N
4J-->1S
4J-->B6
4J-->CC
4K-->40
4K-->41
4K-->42
4K-->43
4K-->49
4K-->4M
4K-->4P
4K-->4Q
4L-->4N
4L-->N
4M-->4P
4M-->N
4N-->N
4O-->N
4P-->4N
4P-->N
4Q-->4O
4Q-->A
4Q-->N
4Q-->1S
4Q-->CC
4S-->4X
4V-->B6
4X-->50
4X-->51
4X-->52
4X-->53
4X-->4V
4X-->B6
4Y-->4X
52-->50
53-->51
54-->4S
54-->4Y
56-->N
5A-->1S
5A-->B6
5A-->CC
5C-->1S
5C-->37
5C-->B6
5C-->CC
5E-->60
5E-->1S
5E-->2G
5E-->AF
5E-->B6
5E-->CC
5G-->56
5G-->57
5G-->60
5G-->5I
5G-->1S
5G-->B6
5G-->CC
5I-->57
5I-->B6
5K-->5W
5K-->5X
5K-->N
5K-->B6
5M-->5W
5M-->5X
5M-->60
5M-->5A
5M-->5C
5M-->5E
5M-->5G
5M-->5K
5M-->5P
5M-->5R
5M-->5T
5M-->5V
5M-->1S
5M-->2G
5M-->B6
5M-->CC
5N-->5A
5N-->5C
5N-->5E
5N-->5G
5N-->5K
5N-->5M
5N-->5P
5N-->5R
5N-->5T
5N-->5V
5P-->1S
5P-->B6
5P-->CC
5R-->60
5R-->1S
5R-->B6
5R-->CC
5T-->1S
5T-->2G
5T-->37
5T-->AF
5T-->B6
5T-->CC
5V-->60
5V-->1S
5V-->B6
5V-->CC
5W-->5X
5W-->N
5X-->N
5Y-->5M
5Y-->AF
5Z-->5N
5Z-->5Y
60-->56
60-->1S
60-->2G
60-->37
64-->N
64-->2U
64-->B6
64-->CC
65-->64
66-->65
6A-->6H
6A-->B6
6C-->6I
6C-->B6
6E-->6I
6E-->B6
6F-->6A
6F-->6C
6F-->6E
6J-->6A
6J-->6C
6J-->6E
6K-->6F
6K-->6J
6O-->1A
6O-->B6
6P-->6O
6Q-->6O
6R-->6P
6R-->6Q
6T-->N
6W-->7P
6W-->3Y
6W-->B6
6Y-->B6
70-->74
70-->B6
72-->74
72-->B6
74-->B6
76-->6T
76-->74
76-->B6
78-->7T
78-->B6
7A-->6T
7A-->B6
7C-->6T
7C-->7T
7C-->7U
7C-->70
7C-->72
7C-->76
7C-->78
7C-->7A
7C-->7E
7C-->N
7C-->13
7C-->B6
7E-->13
7E-->B6
7E-->CC
7G-->7P
7G-->7U
7G-->7N
7G-->N
7G-->13
7G-->B6
7I-->N
7I-->B6
7K-->7Q
7K-->6Y
7K-->7C
7K-->7G
7K-->7I
7K-->1S
7K-->B6
7L-->7C
7L-->7E
7L-->7G
7L-->7I
7L-->7K
7N-->7P
7N-->6W
7N-->N
7N-->B6
7O-->A
7O-->N
7O-->13
7O-->1S
7P-->N
7Q-->6T
7Q-->7O
7Q-->7P
7Q-->7U
7Q-->N
7Q-->13
7Q-->1S
7Q-->3Y
7R-->7K
7S-->6T
7S-->7L
7S-->7O
7S-->7P
7S-->7R
7S-->7T
7S-->7U
7T-->6T
7U-->N
7W-->2G
7Z-->7W
7Z-->8R
7Z-->B6
7Z-->CC
81-->8O
81-->B6
83-->B6
85-->8P
85-->8R
85-->N
85-->1S
85-->2G
85-->B6
85-->CC
87-->8R
87-->2Y
87-->AF
87-->B6
89-->8N
89-->8R
89-->83
89-->2G
89-->AF
89-->B6
89-->CC
8B-->8P
8B-->8R
8B-->2G
8B-->B6
8B-->CC
8D-->8R
8D-->85
8D-->89
8D-->8B
8D-->8F
8D-->8H
8D-->8J
8D-->8M
8D-->2G
8D-->AF
8D-->B6
8D-->CC
8F-->8O
8F-->8R
8F-->7Z
8F-->81
8F-->87
8F-->B6
8H-->8P
8H-->8R
8H-->N
8H-->1S
8H-->2G
8H-->B6
8H-->CC
8J-->8R
8J-->1S
8J-->2G
8J-->37
8J-->AF
8J-->B6
8J-->CC
8K-->7Z
8K-->81
8K-->83
8K-->85
8K-->89
8K-->8B
8K-->8D
8K-->8F
8K-->8H
8K-->8J
8K-->8M
8M-->8P
8M-->8R
8M-->8T
8M-->8U
8M-->B6
8M-->CC
8N-->2G
8N-->AF
8N-->CC
8O-->N
8P-->CC
8Q-->8D
8Q-->AF
8R-->7W
8R-->8P
8R-->N
8R-->1S
8R-->2G
8R-->2Y
8R-->37
8S-->8K
8S-->8O
8S-->8P
8S-->8Q
8S-->8R
8S-->8T
8S-->8U
8T-->N
8U-->N
8X-->8Z
8X-->91
8X-->93
8X-->95
8Z-->91
8Z-->93
8Z-->95
8Z-->B6
91-->1F
91-->1S
91-->4K
91-->B6
93-->N
93-->1F
93-->1S
93-->4K
93-->B6
93-->CC
95-->N
95-->1S
95-->4K
95-->B6
95-->CC
96-->8X
96-->97
97-->8Z
9A-->9I
9C-->1A
9C-->B6
9E-->1S
9E-->B6
9E-->CC
9G-->66
9G-->B6
9I-->9C
9I-->9E
9I-->9G
9I-->9K
9I-->B6
9K-->1S
9K-->2Y
9K-->B6
9L-->9A
9L-->9M
9M-->9I
9Q-->N
9Q-->1S
9Q-->33
9Q-->B6
9Q-->CC
9T-->9V
9T-->9X
9T-->9Z
9T-->A3
9T-->A5
9V-->1S
9V-->B6
9X-->9Q
9X-->N
9X-->1S
9X-->33
9X-->4K
9X-->B6
9Z-->A7
9Z-->1S
9Z-->B6
9Z-->CC
A1-->A8
A1-->9S
A1-->B6
A1-->CC
A3-->A7
A3-->A8
A3-->9S
A3-->9V
A3-->9X
A3-->9Z
A3-->A1
A3-->A5
A3-->N
A3-->1S
A3-->37
A3-->4K
A3-->B6
A3-->CC
A5-->1S
A5-->37
A5-->B6
A5-->CC
A6-->A9
A7-->N
A7-->37
A8-->N
A9-->A3
AF-->AC
AF-->AD
AF-->AE
AF-->AG
AG-->CC
AJ-->CC
AL-->CC
AN-->CC
AP-->CC
AR-->AN
AR-->BA
AR-->BE
AR-->BW
AT-->AX
AT-->CC
AV-->CC
AX-->CC
AZ-->B3
AZ-->BW
B1-->CC
B3-->CC
B6-->AJ
B6-->AL
B6-->AN
B6-->AP
B6-->AR
B6-->AT
B6-->AV
B6-->AX
B6-->AZ
B6-->B1
B6-->B3
B6-->B5
B6-->B8
B6-->BA
B6-->BC
B6-->BE
B6-->BG
B6-->BI
B6-->BK
B6-->BM
B6-->BO
B6-->BQ
B6-->BS
B6-->BU
B6-->BW
B8-->CC
BA-->CC
BC-->B3
BE-->CC
BG-->B3
BG-->BW
BI-->AN
BI-->B3
BI-->BW
BI-->CC
BK-->CC
BM-->AN
BM-->AT
BM-->B3
BO-->CC
BQ-->BW
BQ-->CC
BS-->CC
BU-->CC
BW-->CC
C0-->CA
C3-->CA
C4-->C5
C5-->CA
C9-->CA
CC-->BY
CC-->BZ
CC-->C0
CC-->C1
CC-->C2
CC-->C3
CC-->C5
CC-->C4
CC-->C6
CC-->C7
CC-->C8
CC-->CA
CC-->CB
CC-->CD
CC-->CE
CC-->CF
CC-->CG
CC-->CH
CC-->CI
CC-->CJ
CC-->CK
CC-->CL
CC-->CM
CC-->CN
CC-->CR
CC-->CS
CF-->CA
CK-->C0
```
