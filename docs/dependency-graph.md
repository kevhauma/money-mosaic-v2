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
- 325 leaf nodes, 924 edges.
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
1S["chart-options-control.ts"]
1T["chart-options.store.ts"]
1U["index.ts"]
1V["page-range-control.ts"]
1W["range-state.store.ts"]
1X["transactions.store.ts"]
1Y["transfer-settings.store.ts"]
1Z["transfers.store.ts"]
end
subgraph 20["stats"]
21["account-balance-history.ts"]
22["account-balance-trend.ts"]
23["annual-lump-sum-smoothing.ts"]
24["category-breakdown.ts"]
25["category-composition-trend.ts"]
26["category-kind-contribution.ts"]
27["category-period-comparison.ts"]
28["chart-zoom-window.ts"]
29["classify-for-stats.ts"]
2A["classify-joint-leg.ts"]
2B["embedded-bonus-smoothing.ts"]
2C["full-history-range.ts"]
2D["granularity-for-span.ts"]
2E["gross-net-growth.ts"]
2F["gross-net-ratio.ts"]
2G["income-category-series.ts"]
2H["income-events.ts"]
2I["income-gap-detection.ts"]
2J["income-growth.ts"]
2K["income-step-change-detection.ts"]
2L["index.ts"]
2M["joint-account-stake.ts"]
2N["joint-contributor-breakdown.ts"]
2O["multi-year-income-comparison.ts"]
2P["net-margin.ts"]
2Q["period-stats.ts"]
2R["period-window.ts"]
2S["periodized-rate.ts"]
2T["top-transactions.ts"]
2U["wage-change-detection.ts"]
2V["weekday-weekend-split.ts"]
2W["year-over-year.ts"]
2X["yearly-income-summary.ts"]
end
subgraph 2Y["storage"]
2Z["index.ts"]
30["storage-status.service.ts"]
end
subgraph 31["theme"]
32["accent-colors.ts"]
33["index.ts"]
34["theme-styles.ts"]
35["theme.service.ts"]
end
subgraph 36["transactions"]
37["attribution-override.ts"]
38["index.ts"]
39["nullify-transaction.ts"]
3A["transaction-deletion.service.ts"]
end
subgraph 3B["transfers"]
3C["index.ts"]
3D["transfer-cleanup.service.ts"]
3E["transfer-linking.service.ts"]
3F["transfer-matching.service.ts"]
3G["transfer-matching.ts"]
end
end
subgraph 3H["feature-accounts"]
3I["account-card-vm.ts"]
3J["account-icons.ts"]
3K["account-types.ts"]
3L["accounts.routes.ts"]
3M["balance-trend-signals.ts"]
subgraph 3N["components"]
subgraph 3O["account-balance-block"]
3P["account-balance-block.component.ts"]
end
subgraph 3Q["account-balance-chart"]
3R["account-balance-chart.component.ts"]
end
subgraph 3S["account-balance-history-chart"]
3T["account-balance-history-chart.component.ts"]
end
subgraph 3U["account-card"]
3V["account-card.component.ts"]
end
subgraph 3W["account-form"]
3X["account-form.component.ts"]
end
subgraph 3Y["accounts-detail"]
3Z["accounts-detail.component.ts"]
end
subgraph 40["accounts-overview"]
41["accounts-overview.component.ts"]
end
42["index.ts"]
end
43["index.ts"]
end
subgraph 44["feature-categories"]
45["categories.routes.ts"]
46["category-icons.ts"]
47["category-model.service.ts"]
48["category-model.store.ts"]
subgraph 49["components"]
subgraph 4A["categories-overview"]
4B["categories-overview.component.ts"]
end
subgraph 4C["category-form"]
4D["category-form.component.ts"]
end
4E["index.ts"]
subgraph 4F["rule-condition-row"]
4G["rule-condition-row.component.ts"]
end
subgraph 4H["rule-filters"]
4I["rule-filters.component.ts"]
end
subgraph 4J["rule-form"]
4K["rule-form.component.ts"]
end
subgraph 4L["rule-share-bar"]
4M["rule-share-bar.component.ts"]
end
subgraph 4N["rules-overview"]
4O["rules-overview.component.ts"]
end
end
4P["index.ts"]
4Q["rule-condition-editor.ts"]
4R["rule-filters.ts"]
4S["rule-labels.ts"]
4T["rule-share.ts"]
4U["rule-summary.ts"]
4V["rules.store.ts"]
end
subgraph 4W["feature-changelog"]
4X["changelog.routes.ts"]
subgraph 4Y["components"]
subgraph 4Z["changelog-entry-row"]
50["changelog-entry-row.component.ts"]
end
subgraph 51["changelog-page"]
52["changelog-page.component.ts"]
end
53["index.ts"]
end
subgraph 54["data"]
55["changelog-entries.ts"]
56["roadmap-entries.ts"]
end
57["group-changelog-entries.ts"]
58["group-roadmap-entries.ts"]
59["index.ts"]
end
subgraph 5A["feature-dashboard"]
5B["category-comparison-settings.store.ts"]
5C["category-comparison-vm.ts"]
subgraph 5D["components"]
subgraph 5E["account-balance-strip"]
5F["account-balance-strip.component.ts"]
end
subgraph 5G["action-queue-panel"]
5H["action-queue-panel.component.ts"]
end
subgraph 5I["category-breakdown-panel"]
5J["category-breakdown-panel.component.ts"]
end
subgraph 5K["category-comparison-panel"]
5L["category-comparison-panel.component.ts"]
end
subgraph 5M["comparison-category-card"]
5N["comparison-category-card.component.ts"]
end
subgraph 5O["dashboard-customize-panel"]
5P["dashboard-customize-panel.component.ts"]
end
subgraph 5Q["dashboard-overview"]
5R["dashboard-overview.component.ts"]
end
5S["index.ts"]
subgraph 5T["top-transactions-panel"]
5U["top-transactions-panel.component.ts"]
end
subgraph 5V["trend-chart-panel"]
5W["trend-chart-panel.component.ts"]
end
subgraph 5X["weekday-weekend-split-panel"]
5Y["weekday-weekend-split-panel.component.ts"]
end
end
5Z["dashboard-layout-settings.store.ts"]
60["dashboard-row-order.ts"]
61["dashboard.routes.ts"]
62["index.ts"]
63["stats.store.ts"]
end
subgraph 64["feature-data-management"]
subgraph 65["components"]
subgraph 66["data-management-overview"]
67["data-management-overview.component.ts"]
end
68["index.ts"]
end
69["index.ts"]
end
subgraph 6A["feature-help"]
subgraph 6B["components"]
subgraph 6C["faq-page"]
6D["faq-page.component.ts"]
end
subgraph 6E["guide-detail"]
6F["guide-detail.component.ts"]
end
subgraph 6G["guide-steps"]
6H["guide-steps.component.ts"]
end
subgraph 6I["guides-index"]
6J["guides-index.component.ts"]
end
6K["index.ts"]
end
subgraph 6L["data"]
6M["faq.ts"]
6N["guides.ts"]
end
6O["help.routes.ts"]
6P["index.ts"]
end
subgraph 6Q["feature-home"]
subgraph 6R["components"]
subgraph 6S["home-landing"]
6T["home-landing.component.ts"]
end
6U["index.ts"]
end
6V["home.routes.ts"]
6W["index.ts"]
end
subgraph 6X["feature-import"]
6Y["column-mapping.ts"]
subgraph 6Z["components"]
subgraph 70["account-draft-editor"]
71["account-draft-editor.component.ts"]
end
subgraph 72["batch-wait-card"]
73["batch-wait-card.component.ts"]
end
subgraph 74["column-map-amount-field"]
75["column-map-amount-field.component.ts"]
end
subgraph 76["column-map-counterparty-field"]
77["column-map-counterparty-field.component.ts"]
end
subgraph 78["column-map-sample-caption"]
79["column-map-sample-caption.component.ts"]
end
subgraph 7A["column-map-simple-field"]
7B["column-map-simple-field.component.ts"]
end
subgraph 7C["column-map-stepper"]
7D["column-map-stepper.component.ts"]
end
subgraph 7E["column-map-summary-step"]
7F["column-map-summary-step.component.ts"]
end
subgraph 7G["import-map-step"]
7H["import-map-step.component.ts"]
end
subgraph 7I["import-preview-step"]
7J["import-preview-step.component.ts"]
end
subgraph 7K["import-select-step"]
7L["import-select-step.component.ts"]
end
subgraph 7M["import-summary-step"]
7N["import-summary-step.component.ts"]
end
subgraph 7O["import-wizard"]
7P["import-wizard.component.ts"]
end
7Q["index.ts"]
subgraph 7R["queued-file-row"]
7S["queued-file-row.component.ts"]
end
end
7T["import-batches.store.ts"]
7U["import-queue.ts"]
7V["import-wizard-session.ts"]
7W["import.routes.ts"]
7X["index.ts"]
7Y["mapper-steps.ts"]
7Z["mapping-profiles.store.ts"]
end
subgraph 80["feature-income"]
81["career-start-date.ts"]
subgraph 82["components"]
subgraph 83["income-career-start"]
84["income-career-start.component.ts"]
end
subgraph 85["income-category-checklist"]
86["income-category-checklist.component.ts"]
end
subgraph 87["income-chart-cell"]
88["income-chart-cell.component.ts"]
end
subgraph 89["income-events-sidebar"]
8A["income-events-sidebar.component.ts"]
end
subgraph 8B["income-gross-color"]
8C["income-gross-color.component.ts"]
end
subgraph 8D["income-gross-net-section"]
8E["income-gross-net-section.component.ts"]
end
subgraph 8F["income-growth-panel"]
8G["income-growth-panel.component.ts"]
end
subgraph 8H["income-intro"]
8I["income-intro.component.ts"]
end
subgraph 8J["income-main-category"]
8K["income-main-category.component.ts"]
end
subgraph 8L["income-overview"]
8M["income-overview.component.ts"]
end
subgraph 8N["income-settings-page"]
8O["income-settings-page.component.ts"]
end
subgraph 8P["income-yearly-panel"]
8Q["income-yearly-panel.component.ts"]
end
8R["index.ts"]
subgraph 8S["salary-details-page"]
8T["salary-details-page.component.ts"]
end
subgraph 8U["salary-metadata-table"]
8V["salary-metadata-table.component.ts"]
end
subgraph 8W["salary-month-modal"]
8X["salary-month-modal.component.ts"]
end
end
8Y["gross-net-chart-options.ts"]
8Z["income-category-vm.ts"]
90["income-event-vm.ts"]
91["income-granularity.ts"]
92["income.routes.ts"]
93["income.store.ts"]
94["index.ts"]
95["salary-metadata-edit.ts"]
96["salary-metadata-rows.ts"]
end
subgraph 97["feature-learning"]
subgraph 98["components"]
99["index.ts"]
subgraph 9A["learning-overview"]
9B["learning-overview.component.ts"]
end
subgraph 9C["model-status-badge"]
9D["model-status-badge.component.ts"]
end
subgraph 9E["model-status"]
9F["model-status.component.ts"]
end
subgraph 9G["rule-proposals"]
9H["rule-proposals.component.ts"]
end
subgraph 9I["suggestions-table"]
9J["suggestions-table.component.ts"]
end
end
9K["index.ts"]
9L["learning.routes.ts"]
9M["model-status-display.ts"]
end
subgraph 9N["feature-settings"]
subgraph 9O["components"]
9P["index.ts"]
subgraph 9Q["settings-about-section"]
9R["settings-about-section.component.ts"]
end
subgraph 9S["settings-currency-locale-section"]
9T["settings-currency-locale-section.component.ts"]
end
subgraph 9U["settings-data-section"]
9V["settings-data-section.component.ts"]
end
subgraph 9W["settings-overview"]
9X["settings-overview.component.ts"]
end
subgraph 9Y["settings-theme-section"]
9Z["settings-theme-section.component.ts"]
end
end
A0["index.ts"]
A1["settings.routes.ts"]
end
subgraph A2["feature-transactions"]
subgraph A3["components"]
subgraph A4["attribution-override-fieldset"]
A5["attribution-override-fieldset.component.ts"]
end
subgraph A6["category-select-cell"]
A7["category-select-cell.component.ts"]
end
A8["index.ts"]
subgraph A9["transaction-bulk-bar"]
AA["transaction-bulk-bar.component.ts"]
end
subgraph AB["transaction-edit-form"]
AC["transaction-edit-form.component.ts"]
end
subgraph AD["transaction-filters"]
AE["transaction-filters.component.ts"]
end
subgraph AF["transaction-row"]
AG["transaction-row.component.ts"]
end
subgraph AH["transactions-overview"]
AI["transactions-overview.component.ts"]
end
subgraph AJ["transfer-review"]
AK["transfer-review.component.ts"]
end
end
AL["index.ts"]
AM["transaction-filters.ts"]
AN["transaction-row-vm.ts"]
AO["transactions.routes.ts"]
end
subgraph AP["shared"]
subgraph AQ["echarts"]
AR["bucketed-axis-option.ts"]
AS["chart-theme.ts"]
AT["echarts-jsdom.testing.ts"]
AU["echarts-setup.ts"]
AV["index.ts"]
AW["legend-option.ts"]
AX["tooltip-formatter.ts"]
end
subgraph AY["ui"]
subgraph AZ["alert"]
B0["alert.component.ts"]
end
subgraph B1["badge"]
B2["badge.component.ts"]
end
subgraph B3["button"]
B4["button.component.ts"]
end
subgraph B5["collapse"]
B6["collapse.component.ts"]
end
subgraph B7["confirm-dialog"]
B8["confirm-dialog.component.ts"]
end
subgraph B9["date-range-input"]
BA["date-range-input.component.ts"]
end
subgraph BB["divider"]
BC["divider.component.ts"]
end
subgraph BD["dropdown"]
BE["dropdown.component.ts"]
end
subgraph BF["empty-state"]
BG["empty-state.component.ts"]
end
subgraph BH["fieldset"]
BI["fieldset.component.ts"]
end
subgraph BJ["flex"]
BK["flex.component.ts"]
end
subgraph BL["granularity-picker"]
BM["granularity-picker.component.ts"]
end
BN["index.ts"]
subgraph BO["input"]
BP["input.component.ts"]
end
subgraph BQ["label"]
BR["label.component.ts"]
end
subgraph BS["loading-skeleton"]
BT["loading-skeleton.component.ts"]
end
subgraph BU["modal"]
BV["mm-modal.component.ts"]
end
subgraph BW["page-header"]
BX["page-header.component.ts"]
end
subgraph BY["paginator"]
BZ["paginator.component.ts"]
end
subgraph C0["paper"]
C1["paper.component.ts"]
end
subgraph C2["range-grouping-switcher"]
C3["range-grouping-switcher.component.ts"]
end
subgraph C4["select"]
C5["select.component.ts"]
end
subgraph C6["stat-card"]
C7["stat-card.component.ts"]
end
subgraph C8["table"]
C9["table.component.ts"]
end
subgraph CA["tabs"]
CB["tabs.component.ts"]
end
subgraph CC["typography"]
CD["typography.component.ts"]
end
end
subgraph CE["utils"]
CF["confidence-color.ts"]
CG["confirm-state.ts"]
CH["currency-format.ts"]
CI["currency-symbol-presets.ts"]
CJ["daisy-classes.ts"]
CK["date-buckets.ts"]
CL["date-format.pipe.ts"]
CM["date-format.ts"]
CN["debounced-text.ts"]
CO["download-json.ts"]
CP["fingerprint.ts"]
CQ["format-settings.testing.ts"]
CR["format-settings.ts"]
CS["iban.ts"]
CT["index.ts"]
CU["link-control-to-setting.ts"]
CV["locale-presets.ts"]
CW["number-format.ts"]
CX["pagination.ts"]
CY["percentage.ts"]
CZ["search-params.ts"]
D0["selection-model.ts"]
D1["signed-amount.pipe.ts"]
D2["sortable.ts"]
D3["structural-filters.ts"]
D4["theme-hooks.ts"]
subgraph D5["validators"]
D6["iban.validator.ts"]
D7["percentage.validator.ts"]
end
D8["with-archivable.ts"]
D9["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->3C
5-->4
5-->6
6-->N
6-->CT
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
F-->32
F-->CP
F-->CR
G-->F
G-->33
G-->CT
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
V-->CT
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
12-->3C
12-->CT
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1U
16-->B4
16-->CD
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
1P-->1X
1P-->1Z
1P-->5
1P-->N
1P-->2L
1P-->3C
1P-->CT
1Q-->N
1Q-->33
1Q-->CT
1R-->1X
1R-->N
1R-->CT
1S-->1T
1S-->AV
1S-->CT
1T-->AV
1T-->CT
1U-->1P
1U-->1Q
1U-->1R
1U-->1S
1U-->1T
1U-->1V
1U-->1W
1U-->1X
1U-->1Y
1U-->1Z
1V-->1P
1V-->1W
1V-->1X
1V-->2L
1V-->CT
1W-->CT
1X-->N
1X-->38
1X-->3C
1Y-->N
1Z-->1X
1Z-->1Y
1Z-->N
1Z-->3C
21-->N
21-->CT
22-->21
22-->N
22-->CT
23-->25
23-->2G
23-->CT
24-->29
24-->N
25-->24
25-->N
25-->CT
26-->N
27-->24
27-->2R
27-->N
28-->CT
29-->26
29-->2A
29-->N
29-->3C
2A-->5
2A-->N
2B-->25
2B-->2G
2B-->N
2B-->CT
2C-->N
2D-->CT
2E-->2F
2F-->2G
2F-->N
2G-->25
2G-->N
2G-->CT
2H-->2I
2H-->2K
2H-->2U
2H-->N
2I-->25
2I-->2G
2I-->CT
2J-->2G
2J-->2W
2J-->CT
2K-->25
2K-->2B
2K-->2G
2K-->CT
2L-->21
2L-->22
2L-->23
2L-->24
2L-->25
2L-->26
2L-->27
2L-->28
2L-->29
2L-->2A
2L-->2B
2L-->2C
2L-->2D
2L-->2E
2L-->2F
2L-->2G
2L-->2H
2L-->2I
2L-->2J
2L-->2K
2L-->2M
2L-->2N
2L-->2O
2L-->2P
2L-->2Q
2L-->2R
2L-->2S
2L-->2T
2L-->2U
2L-->2V
2L-->2W
2L-->2X
2M-->2A
2M-->N
2N-->2A
2N-->5
2N-->N
2O-->2X
2Q-->29
2Q-->N
2R-->CT
2S-->CT
2T-->N
2T-->3C
2U-->2F
2V-->29
2V-->N
2V-->CT
2W-->2Q
2W-->N
2X-->25
2X-->N
2X-->CT
2Z-->30
32-->34
33-->32
33-->34
33-->35
35-->34
37-->N
38-->37
38-->39
38-->3A
39-->N
3A-->N
3A-->3C
3C-->3D
3C-->3E
3C-->3G
3C-->3F
3D-->N
3E-->3G
3E-->N
3F-->3E
3F-->3G
3F-->N
3G-->6
3G-->N
3G-->CT
3I-->N
3J-->N
3K-->N
3L-->3Z
3L-->41
3L-->AV
3M-->N
3M-->1U
3M-->2L
3M-->CT
3P-->BN
3P-->CT
3R-->3M
3R-->N
3R-->2L
3R-->AV
3R-->BN
3R-->CT
3T-->3M
3T-->N
3T-->1U
3T-->2L
3T-->AV
3T-->BN
3V-->3I
3V-->3J
3V-->3P
3V-->BN
3X-->3J
3X-->3K
3X-->N
3X-->BN
3X-->CT
3X-->D6
3X-->D7
3Z-->3P
3Z-->3R
3Z-->3X
3Z-->1U
3Z-->BN
3Z-->CT
41-->3I
41-->3J
41-->3T
41-->3V
41-->3X
41-->N
41-->1U
41-->BN
41-->CT
42-->3P
42-->3R
42-->3T
42-->3V
42-->3X
42-->3Z
42-->41
43-->3J
43-->3K
43-->3L
43-->42
45-->4B
45-->4O
47-->1F
48-->47
48-->4V
48-->N
48-->1F
48-->1U
4B-->46
4B-->4D
4B-->N
4B-->1U
4B-->BN
4B-->CT
4D-->46
4D-->N
4D-->BN
4E-->4B
4E-->4D
4E-->4I
4E-->4K
4E-->4M
4E-->4O
4G-->4Q
4G-->4S
4G-->A
4G-->N
4G-->1U
4G-->BN
4I-->4R
4I-->1U
4I-->BN
4I-->CT
4K-->4Q
4K-->4G
4K-->N
4K-->1U
4K-->BN
4M-->4T
4M-->4V
4M-->BN
4M-->CT
4O-->4R
4O-->4U
4O-->4V
4O-->4I
4O-->4K
4O-->4M
4O-->N
4O-->1U
4O-->BN
4O-->CT
4P-->45
4P-->46
4P-->47
4P-->48
4P-->4E
4P-->4R
4P-->4U
4P-->4V
4Q-->4S
4Q-->N
4R-->4U
4R-->N
4S-->N
4T-->N
4U-->4S
4U-->N
4V-->4T
4V-->A
4V-->N
4V-->1U
4V-->CT
4X-->52
50-->BN
52-->55
52-->56
52-->57
52-->58
52-->50
52-->BN
53-->52
57-->55
58-->56
59-->4X
59-->53
5B-->N
5F-->1U
5F-->BN
5F-->CT
5H-->1U
5H-->3C
5H-->BN
5H-->CT
5J-->63
5J-->1U
5J-->2L
5J-->AV
5J-->BN
5J-->CT
5L-->5B
5L-->5C
5L-->63
5L-->5N
5L-->1U
5L-->BN
5L-->CT
5N-->5C
5N-->BN
5P-->5Z
5P-->60
5P-->N
5P-->BN
5R-->5Z
5R-->60
5R-->63
5R-->5F
5R-->5H
5R-->5J
5R-->5L
5R-->5P
5R-->5U
5R-->5W
5R-->5Y
5R-->1U
5R-->2L
5R-->BN
5R-->CT
5S-->5F
5S-->5H
5S-->5J
5S-->5L
5S-->5P
5S-->5R
5S-->5U
5S-->5W
5S-->5Y
5U-->63
5U-->1U
5U-->BN
5U-->CT
5W-->1U
5W-->2L
5W-->3C
5W-->AV
5W-->BN
5W-->CT
5Y-->63
5Y-->1U
5Y-->BN
5Y-->CT
5Z-->60
5Z-->N
60-->N
61-->5R
61-->AV
62-->5S
62-->61
63-->5B
63-->1U
63-->2L
63-->3C
67-->N
67-->2Z
67-->BN
67-->CT
68-->67
69-->68
6D-->6M
6D-->BN
6F-->6N
6F-->6H
6F-->BN
6H-->6N
6H-->BN
6J-->6N
6J-->BN
6K-->6D
6K-->6F
6K-->6H
6K-->6J
6O-->6D
6O-->6F
6O-->6J
6P-->6K
6P-->6N
6P-->6O
6T-->1A
6T-->BN
6U-->6T
6V-->6T
6W-->6U
6W-->6V
6Y-->N
71-->7U
71-->43
71-->BN
73-->BN
75-->79
75-->BN
77-->79
77-->BN
79-->BN
7B-->6Y
7B-->79
7B-->BN
7D-->7Y
7D-->BN
7F-->6Y
7F-->BN
7H-->6Y
7H-->7Y
7H-->7Z
7H-->75
7H-->77
7H-->7B
7H-->7D
7H-->7F
7H-->7J
7H-->N
7H-->13
7H-->BN
7J-->13
7J-->BN
7J-->CT
7L-->7U
7L-->7Z
7L-->7S
7L-->N
7L-->13
7L-->BN
7N-->N
7N-->BN
7P-->7V
7P-->73
7P-->7H
7P-->7L
7P-->7N
7P-->1U
7P-->BN
7Q-->7H
7Q-->7J
7Q-->7L
7Q-->7N
7Q-->7P
7S-->7U
7S-->71
7S-->N
7S-->BN
7T-->A
7T-->N
7T-->13
7T-->1U
7U-->N
7V-->6Y
7V-->7T
7V-->7U
7V-->7Z
7V-->N
7V-->13
7V-->1U
7V-->43
7W-->7P
7X-->6Y
7X-->7Q
7X-->7T
7X-->7U
7X-->7W
7X-->7Y
7X-->7Z
7Y-->6Y
7Z-->N
81-->2L
84-->81
84-->93
84-->BN
84-->CT
86-->8Z
86-->BN
88-->BN
8A-->90
8A-->91
8A-->93
8A-->1U
8A-->2L
8A-->BN
8C-->93
8C-->33
8C-->AV
8C-->BN
8E-->8Y
8E-->93
8E-->88
8E-->2L
8E-->AV
8E-->BN
8E-->CT
8G-->91
8G-->93
8G-->2L
8G-->BN
8G-->CT
8I-->1U
8I-->6P
8I-->BN
8K-->8Z
8K-->93
8K-->BN
8M-->93
8M-->96
8M-->8A
8M-->8E
8M-->8G
8M-->8I
8M-->8Q
8M-->8X
8M-->1U
8M-->2L
8M-->6P
8M-->AV
8M-->BN
8M-->CT
8O-->8Z
8O-->93
8O-->84
8O-->86
8O-->8C
8O-->8K
8O-->BN
8Q-->93
8Q-->1U
8Q-->2L
8Q-->3C
8Q-->AV
8Q-->BN
8Q-->CT
8R-->84
8R-->86
8R-->88
8R-->8A
8R-->8E
8R-->8G
8R-->8I
8R-->8K
8R-->8M
8R-->8O
8R-->8Q
8R-->8T
8R-->8V
8R-->8X
8T-->8V
8T-->BN
8V-->91
8V-->93
8V-->95
8V-->96
8V-->BN
8V-->CT
8X-->93
8X-->95
8X-->96
8X-->8V
8X-->N
8X-->BN
8Y-->2L
8Y-->AV
8Y-->CT
8Z-->N
90-->91
90-->N
90-->2L
90-->BN
90-->CT
91-->CT
92-->8M
92-->8O
92-->8T
92-->AV
93-->81
93-->91
93-->N
93-->1U
93-->2L
93-->33
93-->3C
94-->8R
94-->8Z
94-->91
94-->92
94-->93
94-->95
94-->96
95-->N
96-->N
99-->9B
99-->9F
99-->9H
99-->9J
9B-->9D
9B-->9F
9B-->9H
9B-->9J
9B-->BN
9D-->9M
9D-->4P
9D-->BN
9F-->9M
9F-->1F
9F-->1U
9F-->4P
9F-->BN
9H-->N
9H-->1F
9H-->1U
9H-->4P
9H-->BN
9H-->CT
9J-->N
9J-->1U
9J-->4P
9J-->BN
9J-->CT
9K-->99
9K-->9L
9L-->9B
9M-->4P
9M-->BN
9P-->9X
9R-->1A
9R-->BN
9T-->1U
9T-->BN
9T-->CT
9V-->69
9V-->BN
9X-->9R
9X-->9T
9X-->9V
9X-->9Z
9X-->BN
9Z-->1U
9Z-->33
9Z-->BN
A0-->9P
A0-->A1
A1-->9X
A5-->N
A5-->1U
A5-->38
A5-->BN
A5-->CT
A8-->AA
A8-->AC
A8-->AE
A8-->AI
A8-->AK
AA-->1U
AA-->BN
AC-->A5
AC-->N
AC-->1U
AC-->38
AC-->4P
AC-->BN
AE-->AM
AE-->1U
AE-->BN
AE-->CT
AG-->AN
AG-->A7
AG-->BN
AG-->CT
AI-->AM
AI-->AN
AI-->A7
AI-->AA
AI-->AC
AI-->AE
AI-->AG
AI-->AK
AI-->N
AI-->1U
AI-->3C
AI-->4P
AI-->BN
AI-->CT
AK-->1U
AK-->3C
AK-->BN
AK-->CT
AL-->AO
AM-->N
AM-->3C
AN-->N
AO-->AI
AV-->AR
AV-->AS
AV-->AU
AV-->AW
AV-->AX
AX-->CT
B0-->CT
B2-->CT
B4-->CT
B6-->CT
B8-->B4
B8-->BR
B8-->BV
B8-->CD
BA-->BE
BA-->CT
BC-->CT
BE-->CT
BG-->BK
BG-->CD
BI-->CT
BK-->CT
BN-->B0
BN-->B2
BN-->B4
BN-->B6
BN-->B8
BN-->BA
BN-->BC
BN-->BE
BN-->BG
BN-->BI
BN-->BK
BN-->BM
BN-->BP
BN-->BR
BN-->BT
BN-->BV
BN-->BX
BN-->BZ
BN-->C1
BN-->C3
BN-->C5
BN-->C7
BN-->C9
BN-->CB
BN-->CD
BP-->CT
BR-->CT
BT-->BK
BV-->CT
BX-->BK
BX-->CD
BZ-->B4
BZ-->BK
BZ-->CD
BZ-->CT
C1-->CT
C3-->B4
C3-->BA
C3-->BK
C5-->CT
C7-->CD
C7-->CT
C9-->CT
CB-->CT
CD-->CT
CH-->CR
CK-->CR
CL-->CM
CM-->CR
CQ-->CR
CT-->CF
CT-->CG
CT-->CH
CT-->CI
CT-->CJ
CT-->CK
CT-->CM
CT-->CL
CT-->CN
CT-->CO
CT-->CP
CT-->CR
CT-->CS
CT-->CU
CT-->CV
CT-->CW
CT-->CX
CT-->CY
CT-->CZ
CT-->D0
CT-->D1
CT-->D2
CT-->D3
CT-->D4
CT-->D8
CT-->D9
CW-->CR
D1-->CH
```
