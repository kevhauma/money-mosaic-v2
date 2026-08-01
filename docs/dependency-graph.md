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
- 319 leaf nodes, 908 edges.
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
1Y["account-balance-history.ts"]
1Z["account-balance-trend.ts"]
20["annual-lump-sum-smoothing.ts"]
21["category-breakdown.ts"]
22["category-composition-trend.ts"]
23["category-kind-contribution.ts"]
24["category-period-comparison.ts"]
25["chart-zoom-window.ts"]
26["classify-for-stats.ts"]
27["classify-joint-leg.ts"]
28["embedded-bonus-smoothing.ts"]
29["full-history-range.ts"]
2A["granularity-for-span.ts"]
2B["gross-net-growth.ts"]
2C["gross-net-ratio.ts"]
2D["income-category-series.ts"]
2E["income-events.ts"]
2F["income-gap-detection.ts"]
2G["income-growth.ts"]
2H["income-step-change-detection.ts"]
2I["index.ts"]
2J["joint-account-stake.ts"]
2K["joint-contributor-breakdown.ts"]
2L["multi-year-income-comparison.ts"]
2M["net-margin.ts"]
2N["net-worth-trend.ts"]
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
subgraph 5R["net-worth-header"]
5S["net-worth-header.component.ts"]
end
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
subgraph 9A["model-status"]
9B["model-status.component.ts"]
end
subgraph 9C["rule-proposals"]
9D["rule-proposals.component.ts"]
end
subgraph 9E["suggestions-table"]
9F["suggestions-table.component.ts"]
end
end
9G["index.ts"]
9H["learning.routes.ts"]
end
subgraph 9I["feature-settings"]
subgraph 9J["components"]
9K["index.ts"]
subgraph 9L["settings-about-section"]
9M["settings-about-section.component.ts"]
end
subgraph 9N["settings-currency-locale-section"]
9O["settings-currency-locale-section.component.ts"]
end
subgraph 9P["settings-data-section"]
9Q["settings-data-section.component.ts"]
end
subgraph 9R["settings-overview"]
9S["settings-overview.component.ts"]
end
subgraph 9T["settings-theme-section"]
9U["settings-theme-section.component.ts"]
end
end
9V["index.ts"]
9W["settings.routes.ts"]
end
subgraph 9X["feature-transactions"]
subgraph 9Y["components"]
subgraph 9Z["attribution-override-fieldset"]
A0["attribution-override-fieldset.component.ts"]
end
subgraph A1["category-select-cell"]
A2["category-select-cell.component.ts"]
end
A3["index.ts"]
subgraph A4["transaction-bulk-bar"]
A5["transaction-bulk-bar.component.ts"]
end
subgraph A6["transaction-edit-form"]
A7["transaction-edit-form.component.ts"]
end
subgraph A8["transaction-filters"]
A9["transaction-filters.component.ts"]
end
subgraph AA["transaction-row"]
AB["transaction-row.component.ts"]
end
subgraph AC["transactions-overview"]
AD["transactions-overview.component.ts"]
end
subgraph AE["transfer-review"]
AF["transfer-review.component.ts"]
end
end
AG["index.ts"]
AH["transaction-filters.ts"]
AI["transaction-row-vm.ts"]
AJ["transactions.routes.ts"]
end
subgraph AK["shared"]
subgraph AL["echarts"]
AM["bucketed-axis-option.ts"]
AN["chart-theme.ts"]
AO["echarts-setup.ts"]
AP["index.ts"]
AQ["tooltip-formatter.ts"]
end
subgraph AR["ui"]
subgraph AS["alert"]
AT["alert.component.ts"]
end
subgraph AU["badge"]
AV["badge.component.ts"]
end
subgraph AW["button"]
AX["button.component.ts"]
end
subgraph AY["collapse"]
AZ["collapse.component.ts"]
end
subgraph B0["confirm-dialog"]
B1["confirm-dialog.component.ts"]
end
subgraph B2["date-range-input"]
B3["date-range-input.component.ts"]
end
subgraph B4["divider"]
B5["divider.component.ts"]
end
subgraph B6["dropdown"]
B7["dropdown.component.ts"]
end
subgraph B8["empty-state"]
B9["empty-state.component.ts"]
end
subgraph BA["fieldset"]
BB["fieldset.component.ts"]
end
subgraph BC["flex"]
BD["flex.component.ts"]
end
subgraph BE["granularity-picker"]
BF["granularity-picker.component.ts"]
end
BG["index.ts"]
subgraph BH["input"]
BI["input.component.ts"]
end
subgraph BJ["label"]
BK["label.component.ts"]
end
subgraph BL["loading-skeleton"]
BM["loading-skeleton.component.ts"]
end
subgraph BN["modal"]
BO["mm-modal.component.ts"]
end
subgraph BP["page-header"]
BQ["page-header.component.ts"]
end
subgraph BR["paginator"]
BS["paginator.component.ts"]
end
subgraph BT["paper"]
BU["paper.component.ts"]
end
subgraph BV["range-grouping-switcher"]
BW["range-grouping-switcher.component.ts"]
end
subgraph BX["select"]
BY["select.component.ts"]
end
subgraph BZ["stat-card"]
C0["stat-card.component.ts"]
end
subgraph C1["table"]
C2["table.component.ts"]
end
subgraph C3["tabs"]
C4["tabs.component.ts"]
end
subgraph C5["typography"]
C6["typography.component.ts"]
end
end
subgraph C7["utils"]
C8["confidence-color.ts"]
C9["confirm-state.ts"]
CA["currency-format.ts"]
CB["currency-symbol-presets.ts"]
CC["daisy-classes.ts"]
CD["date-buckets.ts"]
CE["date-format.pipe.ts"]
CF["date-format.ts"]
CG["debounced-text.ts"]
CH["download-json.ts"]
CI["fingerprint.ts"]
CJ["format-settings.testing.ts"]
CK["format-settings.ts"]
CL["iban.ts"]
CM["index.ts"]
CN["link-control-to-setting.ts"]
CO["locale-presets.ts"]
CP["number-format.ts"]
CQ["pagination.ts"]
CR["percentage.ts"]
CS["search-params.ts"]
CT["selection-model.ts"]
CU["signed-amount.pipe.ts"]
CV["sortable.ts"]
CW["structural-filters.ts"]
CX["theme-hooks.ts"]
subgraph CY["validators"]
CZ["iban.validator.ts"]
D0["percentage.validator.ts"]
end
D1["with-archivable.ts"]
D2["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->3A
5-->4
5-->6
6-->N
6-->CM
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
F-->CI
F-->CK
G-->F
G-->31
G-->CM
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
V-->CM
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
12-->CM
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1S
16-->2I
16-->AX
16-->BW
16-->C6
16-->CM
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
1P-->2I
1P-->3A
1P-->CM
1Q-->N
1Q-->31
1Q-->CM
1R-->1U
1R-->N
1R-->CM
1S-->1P
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1S-->1W
1T-->CM
1U-->N
1U-->36
1U-->3A
1V-->N
1W-->1U
1W-->1V
1W-->N
1W-->3A
1Y-->N
1Y-->CM
1Z-->1Y
1Z-->N
1Z-->CM
20-->22
20-->2D
20-->CM
21-->26
21-->N
22-->21
22-->N
22-->CM
23-->N
24-->21
24-->2P
24-->N
25-->CM
26-->23
26-->27
26-->N
26-->3A
27-->5
27-->N
28-->2D
28-->N
28-->CM
29-->N
2A-->CM
2B-->2C
2C-->2D
2C-->N
2D-->22
2D-->N
2D-->CM
2E-->2F
2E-->2H
2E-->2S
2E-->N
2F-->22
2F-->2D
2F-->CM
2G-->2D
2G-->2U
2G-->CM
2H-->22
2H-->2D
2H-->CM
2I-->1Y
2I-->1Z
2I-->20
2I-->21
2I-->22
2I-->23
2I-->24
2I-->25
2I-->26
2I-->27
2I-->28
2I-->29
2I-->2A
2I-->2B
2I-->2C
2I-->2D
2I-->2E
2I-->2F
2I-->2G
2I-->2H
2I-->2J
2I-->2K
2I-->2L
2I-->2M
2I-->2N
2I-->2O
2I-->2P
2I-->2Q
2I-->2R
2I-->2S
2I-->2T
2I-->2U
2I-->2V
2J-->27
2J-->N
2K-->27
2K-->5
2K-->N
2L-->2V
2N-->27
2N-->N
2N-->CM
2O-->26
2O-->N
2P-->CM
2Q-->CM
2R-->N
2R-->3A
2S-->2C
2T-->26
2T-->N
2T-->CM
2U-->2O
2U-->N
2V-->22
2V-->N
2V-->CM
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
3E-->CM
3G-->N
3H-->N
3I-->N
3J-->3X
3J-->3Z
3J-->AP
3K-->N
3K-->1S
3K-->2I
3K-->CM
3N-->BG
3N-->CM
3P-->3K
3P-->N
3P-->2I
3P-->AP
3P-->BG
3P-->CM
3R-->3K
3R-->N
3R-->1S
3R-->2I
3R-->AP
3R-->BG
3T-->3G
3T-->3H
3T-->3N
3T-->BG
3V-->3H
3V-->3I
3V-->N
3V-->BG
3V-->CM
3V-->CZ
3V-->D0
3X-->3N
3X-->3P
3X-->3V
3X-->1S
3X-->BG
3X-->CM
3Z-->3G
3Z-->3H
3Z-->3R
3Z-->3T
3Z-->3V
3Z-->N
3Z-->1S
3Z-->BG
3Z-->CM
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
49-->BG
49-->CM
4B-->44
4B-->N
4B-->BG
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
4E-->BG
4G-->4P
4G-->1S
4G-->BG
4G-->CM
4I-->4O
4I-->4E
4I-->N
4I-->1S
4I-->BG
4K-->4R
4K-->4T
4K-->BG
4K-->CM
4M-->4P
4M-->4S
4M-->4T
4M-->4G
4M-->4I
4M-->4K
4M-->N
4M-->1S
4M-->BG
4M-->CM
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
4T-->CM
4V-->50
4Y-->BG
50-->53
50-->54
50-->55
50-->56
50-->4Y
50-->BG
51-->50
55-->53
56-->54
57-->4V
57-->51
59-->N
5D-->1S
5D-->BG
5D-->CM
5F-->1S
5F-->3A
5F-->BG
5F-->CM
5H-->63
5H-->1S
5H-->2I
5H-->AP
5H-->BG
5H-->CM
5J-->59
5J-->5A
5J-->63
5J-->5L
5J-->1S
5J-->BG
5J-->CM
5L-->5A
5L-->BG
5N-->5Z
5N-->60
5N-->N
5N-->BG
5P-->5Z
5P-->60
5P-->63
5P-->5D
5P-->5F
5P-->5H
5P-->5J
5P-->5N
5P-->5S
5P-->5U
5P-->5W
5P-->5Y
5P-->1S
5P-->2I
5P-->BG
5P-->CM
5Q-->5D
5Q-->5F
5Q-->5H
5Q-->5J
5Q-->5N
5Q-->5P
5Q-->5S
5Q-->5U
5Q-->5W
5Q-->5Y
5S-->1S
5S-->BG
5S-->CM
5U-->63
5U-->1S
5U-->BG
5U-->CM
5W-->1S
5W-->2I
5W-->3A
5W-->AP
5W-->BG
5W-->CM
5Y-->63
5Y-->1S
5Y-->BG
5Y-->CM
5Z-->60
5Z-->N
60-->N
61-->5P
61-->AP
62-->5Q
62-->61
63-->59
63-->1S
63-->2I
63-->3A
67-->N
67-->2X
67-->BG
67-->CM
68-->67
69-->68
6D-->6M
6D-->BG
6F-->6N
6F-->6H
6F-->BG
6H-->6N
6H-->BG
6J-->6N
6J-->BG
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
6T-->BG
6U-->6T
6V-->6T
6W-->6U
6W-->6V
6Y-->N
71-->7U
71-->41
71-->BG
73-->BG
75-->79
75-->BG
77-->79
77-->BG
79-->BG
7B-->6Y
7B-->79
7B-->BG
7D-->7Y
7D-->BG
7F-->6Y
7F-->BG
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
7H-->BG
7J-->13
7J-->BG
7J-->CM
7L-->7U
7L-->7Z
7L-->7S
7L-->N
7L-->13
7L-->BG
7N-->N
7N-->BG
7P-->7V
7P-->73
7P-->7H
7P-->7L
7P-->7N
7P-->1S
7P-->BG
7Q-->7H
7Q-->7J
7Q-->7L
7Q-->7N
7Q-->7P
7S-->7U
7S-->71
7S-->N
7S-->BG
7T-->A
7T-->N
7T-->13
7T-->1S
7U-->N
7V-->6Y
7V-->7T
7V-->7U
7V-->7Z
7V-->N
7V-->13
7V-->1S
7V-->41
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
81-->2I
84-->81
84-->91
84-->BG
84-->CM
86-->8X
86-->BG
88-->BG
8A-->8Y
8A-->8Z
8A-->91
8A-->1S
8A-->2I
8A-->BG
8C-->91
8C-->31
8C-->AP
8C-->BG
8E-->8W
8E-->91
8E-->88
8E-->2I
8E-->AP
8E-->BG
8E-->CM
8G-->8Z
8G-->91
8G-->2I
8G-->BG
8G-->CM
8I-->1S
8I-->6P
8I-->BG
8K-->91
8K-->94
8K-->8A
8K-->8E
8K-->8G
8K-->8I
8K-->8O
8K-->8V
8K-->1S
8K-->2I
8K-->6P
8K-->AP
8K-->BG
8K-->CM
8M-->8X
8M-->91
8M-->84
8M-->86
8M-->8C
8M-->BG
8O-->91
8O-->1S
8O-->2I
8O-->3A
8O-->AP
8O-->BG
8O-->CM
8P-->84
8P-->86
8P-->88
8P-->8A
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
8R-->BG
8T-->8Z
8T-->91
8T-->93
8T-->94
8T-->BG
8T-->CM
8V-->91
8V-->93
8V-->94
8V-->8T
8V-->N
8V-->BG
8W-->2I
8W-->AP
8W-->CM
8X-->N
8Y-->8Z
8Y-->N
8Y-->2I
8Y-->BG
8Y-->CM
8Z-->CM
90-->8K
90-->8M
90-->8R
90-->AP
91-->81
91-->8Z
91-->N
91-->1S
91-->2I
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
97-->9B
97-->9D
97-->9F
99-->9B
99-->9D
99-->9F
99-->BG
9B-->1F
9B-->1S
9B-->4N
9B-->BG
9D-->N
9D-->1F
9D-->1S
9D-->4N
9D-->BG
9D-->CM
9F-->N
9F-->1S
9F-->4N
9F-->BG
9F-->CM
9G-->97
9G-->9H
9H-->99
9K-->9S
9M-->1A
9M-->BG
9O-->1S
9O-->BG
9O-->CM
9Q-->69
9Q-->BG
9S-->9M
9S-->9O
9S-->9Q
9S-->9U
9S-->BG
9U-->1S
9U-->31
9U-->BG
9V-->9K
9V-->9W
9W-->9S
A0-->N
A0-->1S
A0-->36
A0-->BG
A0-->CM
A3-->A5
A3-->A7
A3-->A9
A3-->AD
A3-->AF
A5-->1S
A5-->BG
A7-->A0
A7-->N
A7-->1S
A7-->36
A7-->4N
A7-->BG
A9-->AH
A9-->1S
A9-->BG
A9-->CM
AB-->AI
AB-->A2
AB-->BG
AB-->CM
AD-->AH
AD-->AI
AD-->A2
AD-->A5
AD-->A7
AD-->A9
AD-->AB
AD-->AF
AD-->N
AD-->1S
AD-->3A
AD-->4N
AD-->BG
AD-->CM
AF-->1S
AF-->3A
AF-->BG
AF-->CM
AG-->AJ
AH-->N
AH-->3A
AI-->N
AJ-->AD
AP-->AM
AP-->AN
AP-->AO
AP-->AQ
AQ-->CM
AT-->CM
AV-->CM
AX-->CM
AZ-->CM
B1-->AX
B1-->BK
B1-->BO
B1-->C6
B3-->B7
B3-->CM
B5-->CM
B7-->CM
B9-->BD
B9-->C6
BB-->CM
BD-->CM
BG-->AT
BG-->AV
BG-->AX
BG-->AZ
BG-->B1
BG-->B3
BG-->B5
BG-->B7
BG-->B9
BG-->BB
BG-->BD
BG-->BF
BG-->BI
BG-->BK
BG-->BM
BG-->BO
BG-->BQ
BG-->BS
BG-->BU
BG-->BW
BG-->BY
BG-->C0
BG-->C2
BG-->C4
BG-->C6
BI-->CM
BK-->CM
BM-->BD
BO-->CM
BQ-->BD
BQ-->C6
BS-->AX
BS-->BD
BS-->C6
BS-->CM
BU-->CM
BW-->AX
BW-->B3
BW-->BD
BY-->CM
C0-->C6
C0-->CM
C2-->CM
C4-->CM
C6-->CM
CA-->CK
CD-->CK
CE-->CF
CF-->CK
CJ-->CK
CM-->C8
CM-->C9
CM-->CA
CM-->CB
CM-->CC
CM-->CD
CM-->CF
CM-->CE
CM-->CG
CM-->CH
CM-->CI
CM-->CK
CM-->CL
CM-->CN
CM-->CO
CM-->CP
CM-->CQ
CM-->CR
CM-->CS
CM-->CT
CM-->CU
CM-->CV
CM-->CW
CM-->CX
CM-->D1
CM-->D2
CP-->CK
CU-->CA
```
