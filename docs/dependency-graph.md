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
- 321 leaf nodes, 916 edges.
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
1T["page-range-control.ts"]
1U["range-state.store.ts"]
1V["transactions.store.ts"]
1W["transfer-settings.store.ts"]
1X["transfers.store.ts"]
end
subgraph 1Y["stats"]
1Z["account-balance-history.ts"]
20["account-balance-trend.ts"]
21["annual-lump-sum-smoothing.ts"]
22["category-breakdown.ts"]
23["category-composition-trend.ts"]
24["category-kind-contribution.ts"]
25["category-period-comparison.ts"]
26["chart-zoom-window.ts"]
27["classify-for-stats.ts"]
28["classify-joint-leg.ts"]
29["embedded-bonus-smoothing.ts"]
2A["full-history-range.ts"]
2B["granularity-for-span.ts"]
2C["gross-net-growth.ts"]
2D["gross-net-ratio.ts"]
2E["income-category-series.ts"]
2F["income-events.ts"]
2G["income-gap-detection.ts"]
2H["income-growth.ts"]
2I["income-step-change-detection.ts"]
2J["index.ts"]
2K["joint-account-stake.ts"]
2L["joint-contributor-breakdown.ts"]
2M["multi-year-income-comparison.ts"]
2N["net-margin.ts"]
2O["period-stats.ts"]
2P["period-window.ts"]
2Q["periodized-rate.ts"]
2R["top-transactions.ts"]
2S["wage-change-detection.ts"]
2T["weekday-weekend-split.ts"]
2U["year-over-year.ts"]
2V["yearly-income-summary.ts"]
end
subgraph 2W["storage"]
2X["index.ts"]
2Y["storage-status.service.ts"]
end
subgraph 2Z["theme"]
30["accent-colors.ts"]
31["index.ts"]
32["theme-styles.ts"]
33["theme.service.ts"]
end
subgraph 34["transactions"]
35["attribution-override.ts"]
36["index.ts"]
37["nullify-transaction.ts"]
38["transaction-deletion.service.ts"]
end
subgraph 39["transfers"]
3A["index.ts"]
3B["transfer-cleanup.service.ts"]
3C["transfer-linking.service.ts"]
3D["transfer-matching.service.ts"]
3E["transfer-matching.ts"]
end
end
subgraph 3F["feature-accounts"]
3G["account-card-vm.ts"]
3H["account-icons.ts"]
3I["account-types.ts"]
3J["accounts.routes.ts"]
3K["balance-trend-signals.ts"]
subgraph 3L["components"]
subgraph 3M["account-balance-block"]
3N["account-balance-block.component.ts"]
end
subgraph 3O["account-balance-chart"]
3P["account-balance-chart.component.ts"]
end
subgraph 3Q["account-balance-history-chart"]
3R["account-balance-history-chart.component.ts"]
end
subgraph 3S["account-card"]
3T["account-card.component.ts"]
end
subgraph 3U["account-form"]
3V["account-form.component.ts"]
end
subgraph 3W["accounts-detail"]
3X["accounts-detail.component.ts"]
end
subgraph 3Y["accounts-overview"]
3Z["accounts-overview.component.ts"]
end
40["index.ts"]
end
41["index.ts"]
end
subgraph 42["feature-categories"]
43["categories.routes.ts"]
44["category-icons.ts"]
45["category-model.service.ts"]
46["category-model.store.ts"]
subgraph 47["components"]
subgraph 48["categories-overview"]
49["categories-overview.component.ts"]
end
subgraph 4A["category-form"]
4B["category-form.component.ts"]
end
4C["index.ts"]
subgraph 4D["rule-condition-row"]
4E["rule-condition-row.component.ts"]
end
subgraph 4F["rule-filters"]
4G["rule-filters.component.ts"]
end
subgraph 4H["rule-form"]
4I["rule-form.component.ts"]
end
subgraph 4J["rule-share-bar"]
4K["rule-share-bar.component.ts"]
end
subgraph 4L["rules-overview"]
4M["rules-overview.component.ts"]
end
end
4N["index.ts"]
4O["rule-condition-editor.ts"]
4P["rule-filters.ts"]
4Q["rule-labels.ts"]
4R["rule-share.ts"]
4S["rule-summary.ts"]
4T["rules.store.ts"]
end
subgraph 4U["feature-changelog"]
4V["changelog.routes.ts"]
subgraph 4W["components"]
subgraph 4X["changelog-entry-row"]
4Y["changelog-entry-row.component.ts"]
end
subgraph 4Z["changelog-page"]
50["changelog-page.component.ts"]
end
51["index.ts"]
end
subgraph 52["data"]
53["changelog-entries.ts"]
54["roadmap-entries.ts"]
end
55["group-changelog-entries.ts"]
56["group-roadmap-entries.ts"]
57["index.ts"]
end
subgraph 58["feature-dashboard"]
59["category-comparison-settings.store.ts"]
5A["category-comparison-vm.ts"]
subgraph 5B["components"]
subgraph 5C["account-balance-strip"]
5D["account-balance-strip.component.ts"]
end
subgraph 5E["action-queue-panel"]
5F["action-queue-panel.component.ts"]
end
subgraph 5G["category-breakdown-panel"]
5H["category-breakdown-panel.component.ts"]
end
subgraph 5I["category-comparison-panel"]
5J["category-comparison-panel.component.ts"]
end
subgraph 5K["comparison-category-card"]
5L["comparison-category-card.component.ts"]
end
subgraph 5M["dashboard-customize-panel"]
5N["dashboard-customize-panel.component.ts"]
end
subgraph 5O["dashboard-overview"]
5P["dashboard-overview.component.ts"]
end
5Q["index.ts"]
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
subgraph 6E["guide-steps"]
6F["guide-steps.component.ts"]
end
subgraph 6G["guides-index"]
6H["guides-index.component.ts"]
end
6I["index.ts"]
end
subgraph 6J["data"]
6K["faq.ts"]
6L["guides.ts"]
end
6M["help.routes.ts"]
6N["index.ts"]
end
subgraph 6O["feature-home"]
subgraph 6P["components"]
subgraph 6Q["home-landing"]
6R["home-landing.component.ts"]
end
6S["index.ts"]
end
6T["home.routes.ts"]
6U["index.ts"]
end
subgraph 6V["feature-import"]
6W["column-mapping.ts"]
subgraph 6X["components"]
subgraph 6Y["account-draft-editor"]
6Z["account-draft-editor.component.ts"]
end
subgraph 70["batch-wait-card"]
71["batch-wait-card.component.ts"]
end
subgraph 72["column-map-amount-field"]
73["column-map-amount-field.component.ts"]
end
subgraph 74["column-map-counterparty-field"]
75["column-map-counterparty-field.component.ts"]
end
subgraph 76["column-map-sample-caption"]
77["column-map-sample-caption.component.ts"]
end
subgraph 78["column-map-simple-field"]
79["column-map-simple-field.component.ts"]
end
subgraph 7A["column-map-stepper"]
7B["column-map-stepper.component.ts"]
end
subgraph 7C["column-map-summary-step"]
7D["column-map-summary-step.component.ts"]
end
subgraph 7E["import-map-step"]
7F["import-map-step.component.ts"]
end
subgraph 7G["import-preview-step"]
7H["import-preview-step.component.ts"]
end
subgraph 7I["import-select-step"]
7J["import-select-step.component.ts"]
end
subgraph 7K["import-summary-step"]
7L["import-summary-step.component.ts"]
end
subgraph 7M["import-wizard"]
7N["import-wizard.component.ts"]
end
7O["index.ts"]
subgraph 7P["queued-file-row"]
7Q["queued-file-row.component.ts"]
end
end
7R["import-batches.store.ts"]
7S["import-queue.ts"]
7T["import-wizard-session.ts"]
7U["import.routes.ts"]
7V["index.ts"]
7W["mapper-steps.ts"]
7X["mapping-profiles.store.ts"]
end
subgraph 7Y["feature-income"]
7Z["career-start-date.ts"]
subgraph 80["components"]
subgraph 81["income-career-start"]
82["income-career-start.component.ts"]
end
subgraph 83["income-category-checklist"]
84["income-category-checklist.component.ts"]
end
subgraph 85["income-chart-cell"]
86["income-chart-cell.component.ts"]
end
subgraph 87["income-events-sidebar"]
88["income-events-sidebar.component.ts"]
end
subgraph 89["income-gross-color"]
8A["income-gross-color.component.ts"]
end
subgraph 8B["income-gross-net-section"]
8C["income-gross-net-section.component.ts"]
end
subgraph 8D["income-growth-panel"]
8E["income-growth-panel.component.ts"]
end
subgraph 8F["income-intro"]
8G["income-intro.component.ts"]
end
subgraph 8H["income-main-category"]
8I["income-main-category.component.ts"]
end
subgraph 8J["income-overview"]
8K["income-overview.component.ts"]
end
subgraph 8L["income-settings-page"]
8M["income-settings-page.component.ts"]
end
subgraph 8N["income-yearly-panel"]
8O["income-yearly-panel.component.ts"]
end
8P["index.ts"]
subgraph 8Q["salary-details-page"]
8R["salary-details-page.component.ts"]
end
subgraph 8S["salary-metadata-table"]
8T["salary-metadata-table.component.ts"]
end
subgraph 8U["salary-month-modal"]
8V["salary-month-modal.component.ts"]
end
end
8W["gross-net-chart-options.ts"]
8X["income-category-vm.ts"]
8Y["income-event-vm.ts"]
8Z["income-granularity.ts"]
90["income.routes.ts"]
91["income.store.ts"]
92["index.ts"]
93["salary-metadata-edit.ts"]
94["salary-metadata-rows.ts"]
end
subgraph 95["feature-learning"]
subgraph 96["components"]
97["index.ts"]
subgraph 98["learning-overview"]
99["learning-overview.component.ts"]
end
subgraph 9A["model-status-badge"]
9B["model-status-badge.component.ts"]
end
subgraph 9C["model-status"]
9D["model-status.component.ts"]
end
subgraph 9E["rule-proposals"]
9F["rule-proposals.component.ts"]
end
subgraph 9G["suggestions-table"]
9H["suggestions-table.component.ts"]
end
end
9I["index.ts"]
9J["learning.routes.ts"]
9K["model-status-display.ts"]
end
subgraph 9L["feature-settings"]
subgraph 9M["components"]
9N["index.ts"]
subgraph 9O["settings-about-section"]
9P["settings-about-section.component.ts"]
end
subgraph 9Q["settings-currency-locale-section"]
9R["settings-currency-locale-section.component.ts"]
end
subgraph 9S["settings-data-section"]
9T["settings-data-section.component.ts"]
end
subgraph 9U["settings-overview"]
9V["settings-overview.component.ts"]
end
subgraph 9W["settings-theme-section"]
9X["settings-theme-section.component.ts"]
end
end
9Y["index.ts"]
9Z["settings.routes.ts"]
end
subgraph A0["feature-transactions"]
subgraph A1["components"]
subgraph A2["attribution-override-fieldset"]
A3["attribution-override-fieldset.component.ts"]
end
subgraph A4["category-select-cell"]
A5["category-select-cell.component.ts"]
end
A6["index.ts"]
subgraph A7["transaction-bulk-bar"]
A8["transaction-bulk-bar.component.ts"]
end
subgraph A9["transaction-edit-form"]
AA["transaction-edit-form.component.ts"]
end
subgraph AB["transaction-filters"]
AC["transaction-filters.component.ts"]
end
subgraph AD["transaction-row"]
AE["transaction-row.component.ts"]
end
subgraph AF["transactions-overview"]
AG["transactions-overview.component.ts"]
end
subgraph AH["transfer-review"]
AI["transfer-review.component.ts"]
end
end
AJ["index.ts"]
AK["transaction-filters.ts"]
AL["transaction-row-vm.ts"]
AM["transactions.routes.ts"]
end
subgraph AN["shared"]
subgraph AO["echarts"]
AP["bucketed-axis-option.ts"]
AQ["chart-theme.ts"]
AR["echarts-setup.ts"]
AS["index.ts"]
AT["tooltip-formatter.ts"]
end
subgraph AU["ui"]
subgraph AV["alert"]
AW["alert.component.ts"]
end
subgraph AX["badge"]
AY["badge.component.ts"]
end
subgraph AZ["button"]
B0["button.component.ts"]
end
subgraph B1["collapse"]
B2["collapse.component.ts"]
end
subgraph B3["confirm-dialog"]
B4["confirm-dialog.component.ts"]
end
subgraph B5["date-range-input"]
B6["date-range-input.component.ts"]
end
subgraph B7["divider"]
B8["divider.component.ts"]
end
subgraph B9["dropdown"]
BA["dropdown.component.ts"]
end
subgraph BB["empty-state"]
BC["empty-state.component.ts"]
end
subgraph BD["fieldset"]
BE["fieldset.component.ts"]
end
subgraph BF["flex"]
BG["flex.component.ts"]
end
subgraph BH["granularity-picker"]
BI["granularity-picker.component.ts"]
end
BJ["index.ts"]
subgraph BK["input"]
BL["input.component.ts"]
end
subgraph BM["label"]
BN["label.component.ts"]
end
subgraph BO["loading-skeleton"]
BP["loading-skeleton.component.ts"]
end
subgraph BQ["modal"]
BR["mm-modal.component.ts"]
end
subgraph BS["page-header"]
BT["page-header.component.ts"]
end
subgraph BU["paginator"]
BV["paginator.component.ts"]
end
subgraph BW["paper"]
BX["paper.component.ts"]
end
subgraph BY["range-grouping-switcher"]
BZ["range-grouping-switcher.component.ts"]
end
subgraph C0["select"]
C1["select.component.ts"]
end
subgraph C2["stat-card"]
C3["stat-card.component.ts"]
end
subgraph C4["table"]
C5["table.component.ts"]
end
subgraph C6["tabs"]
C7["tabs.component.ts"]
end
subgraph C8["typography"]
C9["typography.component.ts"]
end
end
subgraph CA["utils"]
CB["confidence-color.ts"]
CC["confirm-state.ts"]
CD["currency-format.ts"]
CE["currency-symbol-presets.ts"]
CF["daisy-classes.ts"]
CG["date-buckets.ts"]
CH["date-format.pipe.ts"]
CI["date-format.ts"]
CJ["debounced-text.ts"]
CK["download-json.ts"]
CL["fingerprint.ts"]
CM["format-settings.testing.ts"]
CN["format-settings.ts"]
CO["iban.ts"]
CP["index.ts"]
CQ["link-control-to-setting.ts"]
CR["locale-presets.ts"]
CS["number-format.ts"]
CT["pagination.ts"]
CU["percentage.ts"]
CV["search-params.ts"]
CW["selection-model.ts"]
CX["signed-amount.pipe.ts"]
CY["sortable.ts"]
CZ["structural-filters.ts"]
D0["theme-hooks.ts"]
subgraph D1["validators"]
D2["iban.validator.ts"]
D3["percentage.validator.ts"]
end
D4["with-archivable.ts"]
D5["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->3A
5-->4
5-->6
6-->N
6-->CP
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
F-->30
F-->CL
F-->CN
G-->F
G-->31
G-->CP
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
V-->CP
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
12-->3A
12-->CP
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1S
16-->B0
16-->C9
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
1P-->1V
1P-->1X
1P-->5
1P-->N
1P-->2J
1P-->3A
1P-->CP
1Q-->N
1Q-->31
1Q-->CP
1R-->1V
1R-->N
1R-->CP
1S-->1P
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1S-->1W
1S-->1X
1T-->1P
1T-->1U
1T-->1V
1T-->2J
1T-->CP
1U-->CP
1V-->N
1V-->36
1V-->3A
1W-->N
1X-->1V
1X-->1W
1X-->N
1X-->3A
1Z-->N
1Z-->CP
20-->1Z
20-->N
20-->CP
21-->23
21-->2E
21-->CP
22-->27
22-->N
23-->22
23-->N
23-->CP
24-->N
25-->22
25-->2P
25-->N
26-->CP
27-->24
27-->28
27-->N
27-->3A
28-->5
28-->N
29-->23
29-->2E
29-->N
29-->CP
2A-->N
2B-->CP
2C-->2D
2D-->2E
2D-->N
2E-->23
2E-->N
2E-->CP
2F-->2G
2F-->2I
2F-->2S
2F-->N
2G-->23
2G-->2E
2G-->CP
2H-->2E
2H-->2U
2H-->CP
2I-->23
2I-->29
2I-->2E
2I-->CP
2J-->1Z
2J-->20
2J-->21
2J-->22
2J-->23
2J-->24
2J-->25
2J-->26
2J-->27
2J-->28
2J-->29
2J-->2A
2J-->2B
2J-->2C
2J-->2D
2J-->2E
2J-->2F
2J-->2G
2J-->2H
2J-->2I
2J-->2K
2J-->2L
2J-->2M
2J-->2N
2J-->2O
2J-->2P
2J-->2Q
2J-->2R
2J-->2S
2J-->2T
2J-->2U
2J-->2V
2K-->28
2K-->N
2L-->28
2L-->5
2L-->N
2M-->2V
2O-->27
2O-->N
2P-->CP
2Q-->CP
2R-->N
2R-->3A
2S-->2D
2T-->27
2T-->N
2T-->CP
2U-->2O
2U-->N
2V-->23
2V-->N
2V-->CP
2X-->2Y
30-->32
31-->30
31-->32
31-->33
33-->32
35-->N
36-->35
36-->37
36-->38
37-->N
38-->N
38-->3A
3A-->3B
3A-->3C
3A-->3E
3A-->3D
3B-->N
3C-->3E
3C-->N
3D-->3C
3D-->3E
3D-->N
3E-->6
3E-->N
3E-->CP
3G-->N
3H-->N
3I-->N
3J-->3X
3J-->3Z
3J-->AS
3K-->N
3K-->1S
3K-->2J
3K-->CP
3N-->BJ
3N-->CP
3P-->3K
3P-->N
3P-->2J
3P-->AS
3P-->BJ
3P-->CP
3R-->3K
3R-->N
3R-->1S
3R-->2J
3R-->AS
3R-->BJ
3T-->3G
3T-->3H
3T-->3N
3T-->BJ
3V-->3H
3V-->3I
3V-->N
3V-->BJ
3V-->CP
3V-->D2
3V-->D3
3X-->3N
3X-->3P
3X-->3V
3X-->1S
3X-->BJ
3X-->CP
3Z-->3G
3Z-->3H
3Z-->3R
3Z-->3T
3Z-->3V
3Z-->N
3Z-->1S
3Z-->BJ
3Z-->CP
40-->3N
40-->3P
40-->3R
40-->3T
40-->3V
40-->3X
40-->3Z
41-->3H
41-->3I
41-->3J
41-->40
43-->49
43-->4M
45-->1F
46-->45
46-->4T
46-->N
46-->1F
46-->1S
49-->44
49-->4B
49-->N
49-->1S
49-->BJ
49-->CP
4B-->44
4B-->N
4B-->BJ
4C-->49
4C-->4B
4C-->4G
4C-->4I
4C-->4K
4C-->4M
4E-->4O
4E-->4Q
4E-->A
4E-->N
4E-->1S
4E-->BJ
4G-->4P
4G-->1S
4G-->BJ
4G-->CP
4I-->4O
4I-->4E
4I-->N
4I-->1S
4I-->BJ
4K-->4R
4K-->4T
4K-->BJ
4K-->CP
4M-->4P
4M-->4S
4M-->4T
4M-->4G
4M-->4I
4M-->4K
4M-->N
4M-->1S
4M-->BJ
4M-->CP
4N-->43
4N-->44
4N-->45
4N-->46
4N-->4C
4N-->4P
4N-->4S
4N-->4T
4O-->4Q
4O-->N
4P-->4S
4P-->N
4Q-->N
4R-->N
4S-->4Q
4S-->N
4T-->4R
4T-->A
4T-->N
4T-->1S
4T-->CP
4V-->50
4Y-->BJ
50-->53
50-->54
50-->55
50-->56
50-->4Y
50-->BJ
51-->50
55-->53
56-->54
57-->4V
57-->51
59-->N
5D-->1S
5D-->BJ
5D-->CP
5F-->1S
5F-->3A
5F-->BJ
5F-->CP
5H-->61
5H-->1S
5H-->2J
5H-->AS
5H-->BJ
5H-->CP
5J-->59
5J-->5A
5J-->61
5J-->5L
5J-->1S
5J-->BJ
5J-->CP
5L-->5A
5L-->BJ
5N-->5X
5N-->5Y
5N-->N
5N-->BJ
5P-->5X
5P-->5Y
5P-->61
5P-->5D
5P-->5F
5P-->5H
5P-->5J
5P-->5N
5P-->5S
5P-->5U
5P-->5W
5P-->1S
5P-->2J
5P-->BJ
5P-->CP
5Q-->5D
5Q-->5F
5Q-->5H
5Q-->5J
5Q-->5N
5Q-->5P
5Q-->5S
5Q-->5U
5Q-->5W
5S-->61
5S-->1S
5S-->BJ
5S-->CP
5U-->1S
5U-->2J
5U-->3A
5U-->AS
5U-->BJ
5U-->CP
5W-->61
5W-->1S
5W-->BJ
5W-->CP
5X-->5Y
5X-->N
5Y-->N
5Z-->5P
5Z-->AS
60-->5Q
60-->5Z
61-->59
61-->1S
61-->2J
61-->3A
65-->N
65-->2X
65-->BJ
65-->CP
66-->65
67-->66
6B-->6K
6B-->BJ
6D-->6L
6D-->6F
6D-->BJ
6F-->6L
6F-->BJ
6H-->6L
6H-->BJ
6I-->6B
6I-->6D
6I-->6F
6I-->6H
6M-->6B
6M-->6D
6M-->6H
6N-->6I
6N-->6L
6N-->6M
6R-->1A
6R-->BJ
6S-->6R
6T-->6R
6U-->6S
6U-->6T
6W-->N
6Z-->7S
6Z-->41
6Z-->BJ
71-->BJ
73-->77
73-->BJ
75-->77
75-->BJ
77-->BJ
79-->6W
79-->77
79-->BJ
7B-->7W
7B-->BJ
7D-->6W
7D-->BJ
7F-->6W
7F-->7W
7F-->7X
7F-->73
7F-->75
7F-->79
7F-->7B
7F-->7D
7F-->7H
7F-->N
7F-->13
7F-->BJ
7H-->13
7H-->BJ
7H-->CP
7J-->7S
7J-->7X
7J-->7Q
7J-->N
7J-->13
7J-->BJ
7L-->N
7L-->BJ
7N-->7T
7N-->71
7N-->7F
7N-->7J
7N-->7L
7N-->1S
7N-->BJ
7O-->7F
7O-->7H
7O-->7J
7O-->7L
7O-->7N
7Q-->7S
7Q-->6Z
7Q-->N
7Q-->BJ
7R-->A
7R-->N
7R-->13
7R-->1S
7S-->N
7T-->6W
7T-->7R
7T-->7S
7T-->7X
7T-->N
7T-->13
7T-->1S
7T-->41
7U-->7N
7V-->6W
7V-->7O
7V-->7R
7V-->7S
7V-->7U
7V-->7W
7V-->7X
7W-->6W
7X-->N
7Z-->2J
82-->7Z
82-->91
82-->BJ
82-->CP
84-->8X
84-->BJ
86-->BJ
88-->8Y
88-->8Z
88-->91
88-->1S
88-->2J
88-->BJ
8A-->91
8A-->31
8A-->AS
8A-->BJ
8C-->8W
8C-->91
8C-->86
8C-->2J
8C-->AS
8C-->BJ
8C-->CP
8E-->8Z
8E-->91
8E-->2J
8E-->BJ
8E-->CP
8G-->1S
8G-->6N
8G-->BJ
8I-->8X
8I-->91
8I-->BJ
8K-->91
8K-->94
8K-->88
8K-->8C
8K-->8E
8K-->8G
8K-->8O
8K-->8V
8K-->1S
8K-->2J
8K-->6N
8K-->AS
8K-->BJ
8K-->CP
8M-->8X
8M-->91
8M-->82
8M-->84
8M-->8A
8M-->8I
8M-->BJ
8O-->91
8O-->1S
8O-->2J
8O-->3A
8O-->AS
8O-->BJ
8O-->CP
8P-->82
8P-->84
8P-->86
8P-->88
8P-->8C
8P-->8E
8P-->8G
8P-->8I
8P-->8K
8P-->8M
8P-->8O
8P-->8R
8P-->8T
8P-->8V
8R-->8T
8R-->BJ
8T-->8Z
8T-->91
8T-->93
8T-->94
8T-->BJ
8T-->CP
8V-->91
8V-->93
8V-->94
8V-->8T
8V-->N
8V-->BJ
8W-->2J
8W-->AS
8W-->CP
8X-->N
8Y-->8Z
8Y-->N
8Y-->2J
8Y-->BJ
8Y-->CP
8Z-->CP
90-->8K
90-->8M
90-->8R
90-->AS
91-->7Z
91-->8Z
91-->N
91-->1S
91-->2J
91-->31
91-->3A
92-->8P
92-->8X
92-->8Z
92-->90
92-->91
92-->93
92-->94
93-->N
94-->N
97-->99
97-->9D
97-->9F
97-->9H
99-->9B
99-->9D
99-->9F
99-->9H
99-->BJ
9B-->9K
9B-->4N
9B-->BJ
9D-->9K
9D-->1F
9D-->1S
9D-->4N
9D-->BJ
9F-->N
9F-->1F
9F-->1S
9F-->4N
9F-->BJ
9F-->CP
9H-->N
9H-->1S
9H-->4N
9H-->BJ
9H-->CP
9I-->97
9I-->9J
9J-->99
9K-->4N
9K-->BJ
9N-->9V
9P-->1A
9P-->BJ
9R-->1S
9R-->BJ
9R-->CP
9T-->67
9T-->BJ
9V-->9P
9V-->9R
9V-->9T
9V-->9X
9V-->BJ
9X-->1S
9X-->31
9X-->BJ
9Y-->9N
9Y-->9Z
9Z-->9V
A3-->N
A3-->1S
A3-->36
A3-->BJ
A3-->CP
A6-->A8
A6-->AA
A6-->AC
A6-->AG
A6-->AI
A8-->1S
A8-->BJ
AA-->A3
AA-->N
AA-->1S
AA-->36
AA-->4N
AA-->BJ
AC-->AK
AC-->1S
AC-->BJ
AC-->CP
AE-->AL
AE-->A5
AE-->BJ
AE-->CP
AG-->AK
AG-->AL
AG-->A5
AG-->A8
AG-->AA
AG-->AC
AG-->AE
AG-->AI
AG-->N
AG-->1S
AG-->3A
AG-->4N
AG-->BJ
AG-->CP
AI-->1S
AI-->3A
AI-->BJ
AI-->CP
AJ-->AM
AK-->N
AK-->3A
AL-->N
AM-->AG
AS-->AP
AS-->AQ
AS-->AR
AS-->AT
AT-->CP
AW-->CP
AY-->CP
B0-->CP
B2-->CP
B4-->B0
B4-->BN
B4-->BR
B4-->C9
B6-->BA
B6-->CP
B8-->CP
BA-->CP
BC-->BG
BC-->C9
BE-->CP
BG-->CP
BJ-->AW
BJ-->AY
BJ-->B0
BJ-->B2
BJ-->B4
BJ-->B6
BJ-->B8
BJ-->BA
BJ-->BC
BJ-->BE
BJ-->BG
BJ-->BI
BJ-->BL
BJ-->BN
BJ-->BP
BJ-->BR
BJ-->BT
BJ-->BV
BJ-->BX
BJ-->BZ
BJ-->C1
BJ-->C3
BJ-->C5
BJ-->C7
BJ-->C9
BL-->CP
BN-->CP
BP-->BG
BR-->CP
BT-->BG
BT-->C9
BV-->B0
BV-->BG
BV-->C9
BV-->CP
BX-->CP
BZ-->B0
BZ-->B6
BZ-->BG
C1-->CP
C3-->C9
C3-->CP
C5-->CP
C7-->CP
C9-->CP
CD-->CN
CG-->CN
CH-->CI
CI-->CN
CM-->CN
CP-->CB
CP-->CC
CP-->CD
CP-->CE
CP-->CF
CP-->CG
CP-->CI
CP-->CH
CP-->CJ
CP-->CK
CP-->CL
CP-->CN
CP-->CO
CP-->CQ
CP-->CR
CP-->CS
CP-->CT
CP-->CU
CP-->CV
CP-->CW
CP-->CX
CP-->CY
CP-->CZ
CP-->D0
CP-->D4
CP-->D5
CS-->CN
CX-->CD
```
