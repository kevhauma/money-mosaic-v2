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
- 313 leaf nodes, 878 edges.
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
2D["income-events.ts"]
2E["income-gap-detection.ts"]
2F["income-growth.ts"]
2G["income-step-change-detection.ts"]
2H["index.ts"]
2I["joint-account-stake.ts"]
2J["joint-contributor-breakdown.ts"]
2K["multi-year-income-comparison.ts"]
2L["net-margin.ts"]
2M["net-worth-trend.ts"]
2N["period-stats.ts"]
2O["period-window.ts"]
2P["periodized-rate.ts"]
2Q["top-transactions.ts"]
2R["weekday-weekend-split.ts"]
2S["year-over-year.ts"]
2T["yearly-income-summary.ts"]
end
subgraph 2U["storage"]
2V["index.ts"]
2W["storage-status.service.ts"]
end
subgraph 2X["theme"]
2Y["accent-colors.ts"]
2Z["index.ts"]
30["theme-styles.ts"]
31["theme.service.ts"]
end
subgraph 32["transactions"]
33["attribution-override.ts"]
34["index.ts"]
35["nullify-transaction.ts"]
36["transaction-deletion.service.ts"]
end
subgraph 37["transfers"]
38["index.ts"]
39["transfer-cleanup.service.ts"]
3A["transfer-linking.service.ts"]
3B["transfer-matching.service.ts"]
3C["transfer-matching.ts"]
end
end
subgraph 3D["feature-accounts"]
3E["account-card-vm.ts"]
3F["account-icons.ts"]
3G["account-types.ts"]
3H["accounts.routes.ts"]
3I["balance-trend-signals.ts"]
subgraph 3J["components"]
subgraph 3K["account-balance-block"]
3L["account-balance-block.component.ts"]
end
subgraph 3M["account-balance-chart"]
3N["account-balance-chart.component.ts"]
end
subgraph 3O["account-card"]
3P["account-card.component.ts"]
end
subgraph 3Q["account-form"]
3R["account-form.component.ts"]
end
subgraph 3S["accounts-detail"]
3T["accounts-detail.component.ts"]
end
subgraph 3U["accounts-overview"]
3V["accounts-overview.component.ts"]
end
3W["index.ts"]
subgraph 3X["net-worth-history-chart"]
3Y["net-worth-history-chart.component.ts"]
end
end
3Z["index.ts"]
end
subgraph 40["feature-categories"]
41["categories.routes.ts"]
42["category-icons.ts"]
43["category-model.service.ts"]
44["category-model.store.ts"]
subgraph 45["components"]
subgraph 46["categories-overview"]
47["categories-overview.component.ts"]
end
subgraph 48["category-form"]
49["category-form.component.ts"]
end
4A["index.ts"]
subgraph 4B["rule-condition-row"]
4C["rule-condition-row.component.ts"]
end
subgraph 4D["rule-filters"]
4E["rule-filters.component.ts"]
end
subgraph 4F["rule-form"]
4G["rule-form.component.ts"]
end
subgraph 4H["rule-share-bar"]
4I["rule-share-bar.component.ts"]
end
subgraph 4J["rules-overview"]
4K["rules-overview.component.ts"]
end
end
4L["index.ts"]
4M["rule-condition-editor.ts"]
4N["rule-filters.ts"]
4O["rule-labels.ts"]
4P["rule-share.ts"]
4Q["rule-summary.ts"]
4R["rules.store.ts"]
end
subgraph 4S["feature-changelog"]
4T["changelog.routes.ts"]
subgraph 4U["components"]
subgraph 4V["changelog-entry-row"]
4W["changelog-entry-row.component.ts"]
end
subgraph 4X["changelog-page"]
4Y["changelog-page.component.ts"]
end
4Z["index.ts"]
end
subgraph 50["data"]
51["changelog-entries.ts"]
52["roadmap-entries.ts"]
end
53["group-changelog-entries.ts"]
54["group-roadmap-entries.ts"]
55["index.ts"]
end
subgraph 56["feature-dashboard"]
57["category-comparison-settings.store.ts"]
58["category-comparison-vm.ts"]
subgraph 59["components"]
subgraph 5A["account-balance-strip"]
5B["account-balance-strip.component.ts"]
end
subgraph 5C["action-queue-panel"]
5D["action-queue-panel.component.ts"]
end
subgraph 5E["category-breakdown-panel"]
5F["category-breakdown-panel.component.ts"]
end
subgraph 5G["category-comparison-panel"]
5H["category-comparison-panel.component.ts"]
end
subgraph 5I["comparison-category-card"]
5J["comparison-category-card.component.ts"]
end
subgraph 5K["dashboard-customize-panel"]
5L["dashboard-customize-panel.component.ts"]
end
subgraph 5M["dashboard-overview"]
5N["dashboard-overview.component.ts"]
end
5O["index.ts"]
subgraph 5P["net-worth-header"]
5Q["net-worth-header.component.ts"]
end
subgraph 5R["top-transactions-panel"]
5S["top-transactions-panel.component.ts"]
end
subgraph 5T["trend-chart-panel"]
5U["trend-chart-panel.component.ts"]
end
subgraph 5V["weekday-weekend-split-panel"]
5W["weekday-weekend-split-panel.component.ts"]
end
end
5X["dashboard-layout-settings.store.ts"]
5Y["dashboard-row-order.ts"]
5Z["dashboard.routes.ts"]
60["index.ts"]
61["stats.store.ts"]
end
subgraph 62["feature-data-management"]
subgraph 63["components"]
subgraph 64["data-management-overview"]
65["data-management-overview.component.ts"]
end
66["index.ts"]
end
67["index.ts"]
end
subgraph 68["feature-help"]
subgraph 69["components"]
subgraph 6A["faq-page"]
6B["faq-page.component.ts"]
end
subgraph 6C["guide-detail"]
6D["guide-detail.component.ts"]
end
subgraph 6E["guides-index"]
6F["guides-index.component.ts"]
end
6G["index.ts"]
end
subgraph 6H["data"]
6I["faq.ts"]
6J["guides.ts"]
end
6K["help.routes.ts"]
6L["index.ts"]
end
subgraph 6M["feature-home"]
subgraph 6N["components"]
subgraph 6O["home-landing"]
6P["home-landing.component.ts"]
end
6Q["index.ts"]
end
6R["home.routes.ts"]
6S["index.ts"]
end
subgraph 6T["feature-import"]
6U["column-mapping.ts"]
subgraph 6V["components"]
subgraph 6W["account-draft-editor"]
6X["account-draft-editor.component.ts"]
end
subgraph 6Y["batch-wait-card"]
6Z["batch-wait-card.component.ts"]
end
subgraph 70["column-map-amount-field"]
71["column-map-amount-field.component.ts"]
end
subgraph 72["column-map-counterparty-field"]
73["column-map-counterparty-field.component.ts"]
end
subgraph 74["column-map-sample-caption"]
75["column-map-sample-caption.component.ts"]
end
subgraph 76["column-map-simple-field"]
77["column-map-simple-field.component.ts"]
end
subgraph 78["column-map-stepper"]
79["column-map-stepper.component.ts"]
end
subgraph 7A["column-map-summary-step"]
7B["column-map-summary-step.component.ts"]
end
subgraph 7C["import-map-step"]
7D["import-map-step.component.ts"]
end
subgraph 7E["import-preview-step"]
7F["import-preview-step.component.ts"]
end
subgraph 7G["import-select-step"]
7H["import-select-step.component.ts"]
end
subgraph 7I["import-summary-step"]
7J["import-summary-step.component.ts"]
end
subgraph 7K["import-wizard"]
7L["import-wizard.component.ts"]
end
7M["index.ts"]
subgraph 7N["queued-file-row"]
7O["queued-file-row.component.ts"]
end
end
7P["import-batches.store.ts"]
7Q["import-queue.ts"]
7R["import-wizard-session.ts"]
7S["import.routes.ts"]
7T["index.ts"]
7U["mapper-steps.ts"]
7V["mapping-profiles.store.ts"]
end
subgraph 7W["feature-income"]
7X["career-start-date.ts"]
subgraph 7Y["components"]
subgraph 7Z["income-career-start"]
80["income-career-start.component.ts"]
end
subgraph 81["income-category-checklist"]
82["income-category-checklist.component.ts"]
end
subgraph 83["income-chart-cell"]
84["income-chart-cell.component.ts"]
end
subgraph 85["income-events-sidebar"]
86["income-events-sidebar.component.ts"]
end
subgraph 87["income-gross-color"]
88["income-gross-color.component.ts"]
end
subgraph 89["income-gross-net-section"]
8A["income-gross-net-section.component.ts"]
end
subgraph 8B["income-growth-panel"]
8C["income-growth-panel.component.ts"]
end
subgraph 8D["income-overview"]
8E["income-overview.component.ts"]
end
subgraph 8F["income-settings"]
8G["income-settings.component.ts"]
end
subgraph 8H["income-yearly-panel"]
8I["income-yearly-panel.component.ts"]
end
8J["index.ts"]
subgraph 8K["salary-metadata-table"]
8L["salary-metadata-table.component.ts"]
end
end
8M["gross-net-chart-options.ts"]
8N["income-category-vm.ts"]
8O["income-event-vm.ts"]
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
4-->38
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
F-->2Y
F-->C8
F-->CA
G-->F
G-->2Z
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
12-->38
12-->CC
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1S
16-->2H
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
1P-->2H
1P-->38
1P-->CC
1Q-->N
1Q-->2Z
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
1U-->34
1U-->38
1V-->N
1W-->1U
1W-->1V
1W-->N
1W-->38
1Y-->26
1Y-->2M
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
23-->2O
23-->N
24-->CC
25-->22
25-->26
25-->N
25-->38
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
2D-->2E
2D-->2G
2D-->N
2E-->21
2E-->2C
2E-->CC
2F-->2C
2F-->2S
2F-->CC
2G-->21
2G-->2C
2G-->CC
2H-->1Y
2H-->1Z
2H-->20
2H-->21
2H-->22
2H-->23
2H-->24
2H-->25
2H-->26
2H-->27
2H-->28
2H-->29
2H-->2A
2H-->2B
2H-->2C
2H-->2D
2H-->2E
2H-->2F
2H-->2G
2H-->2I
2H-->2J
2H-->2K
2H-->2L
2H-->2M
2H-->2N
2H-->2O
2H-->2P
2H-->2Q
2H-->2R
2H-->2S
2H-->2T
2I-->26
2I-->N
2J-->26
2J-->5
2J-->N
2K-->2T
2M-->26
2M-->N
2M-->CC
2N-->25
2N-->N
2O-->CC
2P-->CC
2Q-->N
2Q-->38
2R-->25
2R-->N
2R-->CC
2S-->2N
2S-->N
2T-->21
2T-->N
2T-->CC
2V-->2W
2Y-->30
2Z-->2Y
2Z-->30
2Z-->31
31-->30
33-->N
34-->33
34-->35
34-->36
35-->N
36-->N
36-->38
38-->39
38-->3A
38-->3C
38-->3B
39-->N
3A-->3C
3A-->N
3B-->3A
3B-->3C
3B-->N
3C-->6
3C-->N
3C-->CC
3E-->N
3F-->N
3G-->N
3H-->3T
3H-->3V
3H-->AF
3I-->N
3I-->1S
3I-->2H
3I-->CC
3L-->B6
3L-->CC
3N-->3I
3N-->N
3N-->2H
3N-->AF
3N-->B6
3N-->CC
3P-->3E
3P-->3F
3P-->3L
3P-->B6
3R-->3F
3R-->3G
3R-->N
3R-->B6
3R-->CC
3R-->CP
3R-->CQ
3T-->3L
3T-->3N
3T-->3R
3T-->1S
3T-->B6
3T-->CC
3V-->3E
3V-->3F
3V-->3P
3V-->3R
3V-->3Y
3V-->N
3V-->1S
3V-->B6
3V-->CC
3W-->3L
3W-->3N
3W-->3P
3W-->3R
3W-->3T
3W-->3V
3W-->3Y
3Y-->3I
3Y-->N
3Y-->1S
3Y-->2H
3Y-->AF
3Y-->B6
3Z-->3F
3Z-->3G
3Z-->3H
3Z-->3W
41-->47
41-->4K
43-->1F
44-->43
44-->4R
44-->N
44-->1F
44-->1S
47-->42
47-->49
47-->N
47-->1S
47-->B6
47-->CC
49-->42
49-->N
49-->B6
4A-->47
4A-->49
4A-->4E
4A-->4G
4A-->4I
4A-->4K
4C-->4M
4C-->4O
4C-->A
4C-->N
4C-->1S
4C-->B6
4E-->4N
4E-->1S
4E-->B6
4E-->CC
4G-->4M
4G-->4C
4G-->N
4G-->1S
4G-->B6
4I-->4P
4I-->4R
4I-->B6
4I-->CC
4K-->4N
4K-->4Q
4K-->4R
4K-->4E
4K-->4G
4K-->4I
4K-->N
4K-->1S
4K-->B6
4K-->CC
4L-->41
4L-->42
4L-->43
4L-->44
4L-->4A
4L-->4N
4L-->4Q
4L-->4R
4M-->4O
4M-->N
4N-->4Q
4N-->N
4O-->N
4P-->N
4Q-->4O
4Q-->N
4R-->4P
4R-->A
4R-->N
4R-->1S
4R-->CC
4T-->4Y
4W-->B6
4Y-->51
4Y-->52
4Y-->53
4Y-->54
4Y-->4W
4Y-->B6
4Z-->4Y
53-->51
54-->52
55-->4T
55-->4Z
57-->N
5B-->1S
5B-->B6
5B-->CC
5D-->1S
5D-->38
5D-->B6
5D-->CC
5F-->61
5F-->1S
5F-->2H
5F-->AF
5F-->B6
5F-->CC
5H-->57
5H-->58
5H-->61
5H-->5J
5H-->1S
5H-->B6
5H-->CC
5J-->58
5J-->B6
5L-->5X
5L-->5Y
5L-->N
5L-->B6
5N-->5X
5N-->5Y
5N-->61
5N-->5B
5N-->5D
5N-->5F
5N-->5H
5N-->5L
5N-->5Q
5N-->5S
5N-->5U
5N-->5W
5N-->1S
5N-->2H
5N-->B6
5N-->CC
5O-->5B
5O-->5D
5O-->5F
5O-->5H
5O-->5L
5O-->5N
5O-->5Q
5O-->5S
5O-->5U
5O-->5W
5Q-->1S
5Q-->B6
5Q-->CC
5S-->61
5S-->1S
5S-->B6
5S-->CC
5U-->1S
5U-->2H
5U-->38
5U-->AF
5U-->B6
5U-->CC
5W-->61
5W-->1S
5W-->B6
5W-->CC
5X-->5Y
5X-->N
5Y-->N
5Z-->5N
5Z-->AF
60-->5O
60-->5Z
61-->57
61-->1S
61-->2H
61-->38
65-->N
65-->2V
65-->B6
65-->CC
66-->65
67-->66
6B-->6I
6B-->B6
6D-->6J
6D-->B6
6F-->6J
6F-->B6
6G-->6B
6G-->6D
6G-->6F
6K-->6B
6K-->6D
6K-->6F
6L-->6G
6L-->6K
6P-->1A
6P-->B6
6Q-->6P
6R-->6P
6S-->6Q
6S-->6R
6U-->N
6X-->7Q
6X-->3Z
6X-->B6
6Z-->B6
71-->75
71-->B6
73-->75
73-->B6
75-->B6
77-->6U
77-->75
77-->B6
79-->7U
79-->B6
7B-->6U
7B-->B6
7D-->6U
7D-->7U
7D-->7V
7D-->71
7D-->73
7D-->77
7D-->79
7D-->7B
7D-->7F
7D-->N
7D-->13
7D-->B6
7F-->13
7F-->B6
7F-->CC
7H-->7Q
7H-->7V
7H-->7O
7H-->N
7H-->13
7H-->B6
7J-->N
7J-->B6
7L-->7R
7L-->6Z
7L-->7D
7L-->7H
7L-->7J
7L-->1S
7L-->B6
7M-->7D
7M-->7F
7M-->7H
7M-->7J
7M-->7L
7O-->7Q
7O-->6X
7O-->N
7O-->B6
7P-->A
7P-->N
7P-->13
7P-->1S
7Q-->N
7R-->6U
7R-->7P
7R-->7Q
7R-->7V
7R-->N
7R-->13
7R-->1S
7R-->3Z
7S-->7L
7T-->6U
7T-->7M
7T-->7P
7T-->7Q
7T-->7S
7T-->7U
7T-->7V
7U-->6U
7V-->N
7X-->2H
80-->7X
80-->8R
80-->B6
80-->CC
82-->8N
82-->B6
84-->B6
86-->8O
86-->8P
86-->8R
86-->1S
86-->2H
86-->B6
88-->8R
88-->2Z
88-->AF
88-->B6
8A-->8M
8A-->8R
8A-->84
8A-->2H
8A-->AF
8A-->B6
8A-->CC
8C-->8P
8C-->8R
8C-->2H
8C-->B6
8C-->CC
8E-->8R
8E-->86
8E-->8A
8E-->8C
8E-->8G
8E-->8I
8E-->8L
8E-->2H
8E-->AF
8E-->B6
8E-->CC
8G-->8N
8G-->8R
8G-->80
8G-->82
8G-->88
8G-->B6
8I-->8R
8I-->1S
8I-->2H
8I-->38
8I-->AF
8I-->B6
8I-->CC
8J-->80
8J-->82
8J-->84
8J-->86
8J-->8A
8J-->8C
8J-->8E
8J-->8G
8J-->8I
8J-->8L
8L-->8P
8L-->8R
8L-->8T
8L-->8U
8L-->B6
8L-->CC
8M-->2H
8M-->AF
8M-->CC
8N-->N
8O-->8P
8O-->N
8O-->2H
8O-->CC
8P-->CC
8Q-->8E
8Q-->AF
8R-->7X
8R-->8P
8R-->N
8R-->1S
8R-->2H
8R-->2Z
8R-->38
8S-->8J
8S-->8N
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
91-->4L
91-->B6
93-->N
93-->1F
93-->1S
93-->4L
93-->B6
93-->CC
95-->N
95-->1S
95-->4L
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
9G-->67
9G-->B6
9I-->9C
9I-->9E
9I-->9G
9I-->9K
9I-->B6
9K-->1S
9K-->2Z
9K-->B6
9L-->9A
9L-->9M
9M-->9I
9Q-->N
9Q-->1S
9Q-->34
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
9X-->34
9X-->4L
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
A3-->38
A3-->4L
A3-->B6
A3-->CC
A5-->1S
A5-->38
A5-->B6
A5-->CC
A6-->A9
A7-->N
A7-->38
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
