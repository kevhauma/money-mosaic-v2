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
- 318 leaf nodes, 906 edges.
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
2R["wage-change-detection.ts"]
2S["weekday-weekend-split.ts"]
2T["year-over-year.ts"]
2U["yearly-income-summary.ts"]
end
subgraph 2V["storage"]
2W["index.ts"]
2X["storage-status.service.ts"]
end
subgraph 2Y["theme"]
2Z["accent-colors.ts"]
30["index.ts"]
31["theme-styles.ts"]
32["theme.service.ts"]
end
subgraph 33["transactions"]
34["attribution-override.ts"]
35["index.ts"]
36["nullify-transaction.ts"]
37["transaction-deletion.service.ts"]
end
subgraph 38["transfers"]
39["index.ts"]
3A["transfer-cleanup.service.ts"]
3B["transfer-linking.service.ts"]
3C["transfer-matching.service.ts"]
3D["transfer-matching.ts"]
end
end
subgraph 3E["feature-accounts"]
3F["account-card-vm.ts"]
3G["account-icons.ts"]
3H["account-types.ts"]
3I["accounts.routes.ts"]
3J["balance-trend-signals.ts"]
subgraph 3K["components"]
subgraph 3L["account-balance-block"]
3M["account-balance-block.component.ts"]
end
subgraph 3N["account-balance-chart"]
3O["account-balance-chart.component.ts"]
end
subgraph 3P["account-card"]
3Q["account-card.component.ts"]
end
subgraph 3R["account-form"]
3S["account-form.component.ts"]
end
subgraph 3T["accounts-detail"]
3U["accounts-detail.component.ts"]
end
subgraph 3V["accounts-overview"]
3W["accounts-overview.component.ts"]
end
3X["index.ts"]
subgraph 3Y["net-worth-history-chart"]
3Z["net-worth-history-chart.component.ts"]
end
end
40["index.ts"]
end
subgraph 41["feature-categories"]
42["categories.routes.ts"]
43["category-icons.ts"]
44["category-model.service.ts"]
45["category-model.store.ts"]
subgraph 46["components"]
subgraph 47["categories-overview"]
48["categories-overview.component.ts"]
end
subgraph 49["category-form"]
4A["category-form.component.ts"]
end
4B["index.ts"]
subgraph 4C["rule-condition-row"]
4D["rule-condition-row.component.ts"]
end
subgraph 4E["rule-filters"]
4F["rule-filters.component.ts"]
end
subgraph 4G["rule-form"]
4H["rule-form.component.ts"]
end
subgraph 4I["rule-share-bar"]
4J["rule-share-bar.component.ts"]
end
subgraph 4K["rules-overview"]
4L["rules-overview.component.ts"]
end
end
4M["index.ts"]
4N["rule-condition-editor.ts"]
4O["rule-filters.ts"]
4P["rule-labels.ts"]
4Q["rule-share.ts"]
4R["rule-summary.ts"]
4S["rules.store.ts"]
end
subgraph 4T["feature-changelog"]
4U["changelog.routes.ts"]
subgraph 4V["components"]
subgraph 4W["changelog-entry-row"]
4X["changelog-entry-row.component.ts"]
end
subgraph 4Y["changelog-page"]
4Z["changelog-page.component.ts"]
end
50["index.ts"]
end
subgraph 51["data"]
52["changelog-entries.ts"]
53["roadmap-entries.ts"]
end
54["group-changelog-entries.ts"]
55["group-roadmap-entries.ts"]
56["index.ts"]
end
subgraph 57["feature-dashboard"]
58["category-comparison-settings.store.ts"]
59["category-comparison-vm.ts"]
subgraph 5A["components"]
subgraph 5B["account-balance-strip"]
5C["account-balance-strip.component.ts"]
end
subgraph 5D["action-queue-panel"]
5E["action-queue-panel.component.ts"]
end
subgraph 5F["category-breakdown-panel"]
5G["category-breakdown-panel.component.ts"]
end
subgraph 5H["category-comparison-panel"]
5I["category-comparison-panel.component.ts"]
end
subgraph 5J["comparison-category-card"]
5K["comparison-category-card.component.ts"]
end
subgraph 5L["dashboard-customize-panel"]
5M["dashboard-customize-panel.component.ts"]
end
subgraph 5N["dashboard-overview"]
5O["dashboard-overview.component.ts"]
end
5P["index.ts"]
subgraph 5Q["net-worth-header"]
5R["net-worth-header.component.ts"]
end
subgraph 5S["top-transactions-panel"]
5T["top-transactions-panel.component.ts"]
end
subgraph 5U["trend-chart-panel"]
5V["trend-chart-panel.component.ts"]
end
subgraph 5W["weekday-weekend-split-panel"]
5X["weekday-weekend-split-panel.component.ts"]
end
end
5Y["dashboard-layout-settings.store.ts"]
5Z["dashboard-row-order.ts"]
60["dashboard.routes.ts"]
61["index.ts"]
62["stats.store.ts"]
end
subgraph 63["feature-data-management"]
subgraph 64["components"]
subgraph 65["data-management-overview"]
66["data-management-overview.component.ts"]
end
67["index.ts"]
end
68["index.ts"]
end
subgraph 69["feature-help"]
subgraph 6A["components"]
subgraph 6B["faq-page"]
6C["faq-page.component.ts"]
end
subgraph 6D["guide-detail"]
6E["guide-detail.component.ts"]
end
subgraph 6F["guide-steps"]
6G["guide-steps.component.ts"]
end
subgraph 6H["guides-index"]
6I["guides-index.component.ts"]
end
6J["index.ts"]
end
subgraph 6K["data"]
6L["faq.ts"]
6M["guides.ts"]
end
6N["help.routes.ts"]
6O["index.ts"]
end
subgraph 6P["feature-home"]
subgraph 6Q["components"]
subgraph 6R["home-landing"]
6S["home-landing.component.ts"]
end
6T["index.ts"]
end
6U["home.routes.ts"]
6V["index.ts"]
end
subgraph 6W["feature-import"]
6X["column-mapping.ts"]
subgraph 6Y["components"]
subgraph 6Z["account-draft-editor"]
70["account-draft-editor.component.ts"]
end
subgraph 71["batch-wait-card"]
72["batch-wait-card.component.ts"]
end
subgraph 73["column-map-amount-field"]
74["column-map-amount-field.component.ts"]
end
subgraph 75["column-map-counterparty-field"]
76["column-map-counterparty-field.component.ts"]
end
subgraph 77["column-map-sample-caption"]
78["column-map-sample-caption.component.ts"]
end
subgraph 79["column-map-simple-field"]
7A["column-map-simple-field.component.ts"]
end
subgraph 7B["column-map-stepper"]
7C["column-map-stepper.component.ts"]
end
subgraph 7D["column-map-summary-step"]
7E["column-map-summary-step.component.ts"]
end
subgraph 7F["import-map-step"]
7G["import-map-step.component.ts"]
end
subgraph 7H["import-preview-step"]
7I["import-preview-step.component.ts"]
end
subgraph 7J["import-select-step"]
7K["import-select-step.component.ts"]
end
subgraph 7L["import-summary-step"]
7M["import-summary-step.component.ts"]
end
subgraph 7N["import-wizard"]
7O["import-wizard.component.ts"]
end
7P["index.ts"]
subgraph 7Q["queued-file-row"]
7R["queued-file-row.component.ts"]
end
end
7S["import-batches.store.ts"]
7T["import-queue.ts"]
7U["import-wizard-session.ts"]
7V["import.routes.ts"]
7W["index.ts"]
7X["mapper-steps.ts"]
7Y["mapping-profiles.store.ts"]
end
subgraph 7Z["feature-income"]
80["career-start-date.ts"]
subgraph 81["components"]
subgraph 82["income-career-start"]
83["income-career-start.component.ts"]
end
subgraph 84["income-category-checklist"]
85["income-category-checklist.component.ts"]
end
subgraph 86["income-chart-cell"]
87["income-chart-cell.component.ts"]
end
subgraph 88["income-events-sidebar"]
89["income-events-sidebar.component.ts"]
end
subgraph 8A["income-gross-color"]
8B["income-gross-color.component.ts"]
end
subgraph 8C["income-gross-net-section"]
8D["income-gross-net-section.component.ts"]
end
subgraph 8E["income-growth-panel"]
8F["income-growth-panel.component.ts"]
end
subgraph 8G["income-intro"]
8H["income-intro.component.ts"]
end
subgraph 8I["income-overview"]
8J["income-overview.component.ts"]
end
subgraph 8K["income-settings-page"]
8L["income-settings-page.component.ts"]
end
subgraph 8M["income-yearly-panel"]
8N["income-yearly-panel.component.ts"]
end
8O["index.ts"]
subgraph 8P["salary-details-page"]
8Q["salary-details-page.component.ts"]
end
subgraph 8R["salary-metadata-table"]
8S["salary-metadata-table.component.ts"]
end
subgraph 8T["salary-month-modal"]
8U["salary-month-modal.component.ts"]
end
end
8V["gross-net-chart-options.ts"]
8W["income-category-vm.ts"]
8X["income-event-vm.ts"]
8Y["income-granularity.ts"]
8Z["income.routes.ts"]
90["income.store.ts"]
91["index.ts"]
92["salary-metadata-edit.ts"]
93["salary-metadata-rows.ts"]
end
subgraph 94["feature-learning"]
subgraph 95["components"]
96["index.ts"]
subgraph 97["learning-overview"]
98["learning-overview.component.ts"]
end
subgraph 99["model-status"]
9A["model-status.component.ts"]
end
subgraph 9B["rule-proposals"]
9C["rule-proposals.component.ts"]
end
subgraph 9D["suggestions-table"]
9E["suggestions-table.component.ts"]
end
end
9F["index.ts"]
9G["learning.routes.ts"]
end
subgraph 9H["feature-settings"]
subgraph 9I["components"]
9J["index.ts"]
subgraph 9K["settings-about-section"]
9L["settings-about-section.component.ts"]
end
subgraph 9M["settings-currency-locale-section"]
9N["settings-currency-locale-section.component.ts"]
end
subgraph 9O["settings-data-section"]
9P["settings-data-section.component.ts"]
end
subgraph 9Q["settings-overview"]
9R["settings-overview.component.ts"]
end
subgraph 9S["settings-theme-section"]
9T["settings-theme-section.component.ts"]
end
end
9U["index.ts"]
9V["settings.routes.ts"]
end
subgraph 9W["feature-transactions"]
subgraph 9X["components"]
subgraph 9Y["attribution-override-fieldset"]
9Z["attribution-override-fieldset.component.ts"]
end
subgraph A0["category-select-cell"]
A1["category-select-cell.component.ts"]
end
A2["index.ts"]
subgraph A3["transaction-bulk-bar"]
A4["transaction-bulk-bar.component.ts"]
end
subgraph A5["transaction-edit-form"]
A6["transaction-edit-form.component.ts"]
end
subgraph A7["transaction-filters"]
A8["transaction-filters.component.ts"]
end
subgraph A9["transaction-row"]
AA["transaction-row.component.ts"]
end
subgraph AB["transactions-overview"]
AC["transactions-overview.component.ts"]
end
subgraph AD["transfer-review"]
AE["transfer-review.component.ts"]
end
end
AF["index.ts"]
AG["transaction-filters.ts"]
AH["transaction-row-vm.ts"]
AI["transactions.routes.ts"]
end
subgraph AJ["shared"]
subgraph AK["echarts"]
AL["bucketed-axis-option.ts"]
AM["chart-theme.ts"]
AN["echarts-setup.ts"]
AO["index.ts"]
AP["tooltip-formatter.ts"]
end
subgraph AQ["ui"]
subgraph AR["alert"]
AS["alert.component.ts"]
end
subgraph AT["badge"]
AU["badge.component.ts"]
end
subgraph AV["button"]
AW["button.component.ts"]
end
subgraph AX["collapse"]
AY["collapse.component.ts"]
end
subgraph AZ["confirm-dialog"]
B0["confirm-dialog.component.ts"]
end
subgraph B1["date-range-input"]
B2["date-range-input.component.ts"]
end
subgraph B3["divider"]
B4["divider.component.ts"]
end
subgraph B5["dropdown"]
B6["dropdown.component.ts"]
end
subgraph B7["empty-state"]
B8["empty-state.component.ts"]
end
subgraph B9["fieldset"]
BA["fieldset.component.ts"]
end
subgraph BB["flex"]
BC["flex.component.ts"]
end
subgraph BD["granularity-picker"]
BE["granularity-picker.component.ts"]
end
BF["index.ts"]
subgraph BG["input"]
BH["input.component.ts"]
end
subgraph BI["label"]
BJ["label.component.ts"]
end
subgraph BK["loading-skeleton"]
BL["loading-skeleton.component.ts"]
end
subgraph BM["modal"]
BN["mm-modal.component.ts"]
end
subgraph BO["page-header"]
BP["page-header.component.ts"]
end
subgraph BQ["paginator"]
BR["paginator.component.ts"]
end
subgraph BS["paper"]
BT["paper.component.ts"]
end
subgraph BU["range-grouping-switcher"]
BV["range-grouping-switcher.component.ts"]
end
subgraph BW["select"]
BX["select.component.ts"]
end
subgraph BY["stat-card"]
BZ["stat-card.component.ts"]
end
subgraph C0["table"]
C1["table.component.ts"]
end
subgraph C2["tabs"]
C3["tabs.component.ts"]
end
subgraph C4["typography"]
C5["typography.component.ts"]
end
end
subgraph C6["utils"]
C7["confidence-color.ts"]
C8["confirm-state.ts"]
C9["currency-format.ts"]
CA["currency-symbol-presets.ts"]
CB["daisy-classes.ts"]
CC["date-buckets.ts"]
CD["date-format.pipe.ts"]
CE["date-format.ts"]
CF["debounced-text.ts"]
CG["download-json.ts"]
CH["fingerprint.ts"]
CI["format-settings.testing.ts"]
CJ["format-settings.ts"]
CK["iban.ts"]
CL["index.ts"]
CM["link-control-to-setting.ts"]
CN["locale-presets.ts"]
CO["number-format.ts"]
CP["pagination.ts"]
CQ["percentage.ts"]
CR["search-params.ts"]
CS["selection-model.ts"]
CT["signed-amount.pipe.ts"]
CU["sortable.ts"]
CV["structural-filters.ts"]
CW["theme-hooks.ts"]
subgraph CX["validators"]
CY["iban.validator.ts"]
CZ["percentage.validator.ts"]
end
D0["with-archivable.ts"]
D1["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->39
5-->4
5-->6
6-->N
6-->CL
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
F-->2Z
F-->CH
F-->CJ
G-->F
G-->30
G-->CL
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
V-->CL
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
12-->39
12-->CL
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1S
16-->2H
16-->AW
16-->BV
16-->C5
16-->CL
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
1P-->39
1P-->CL
1Q-->N
1Q-->30
1Q-->CL
1R-->1U
1R-->N
1R-->CL
1S-->1P
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1S-->1W
1T-->CL
1U-->N
1U-->35
1U-->39
1V-->N
1W-->1U
1W-->1V
1W-->N
1W-->39
1Y-->26
1Y-->2M
1Y-->N
1Y-->CL
1Z-->21
1Z-->2C
1Z-->CL
20-->25
20-->N
21-->20
21-->N
21-->CL
22-->N
23-->20
23-->2O
23-->N
24-->CL
25-->22
25-->26
25-->N
25-->39
26-->5
26-->N
27-->2C
27-->N
27-->CL
28-->N
29-->CL
2A-->2B
2B-->2C
2B-->N
2C-->21
2C-->N
2C-->CL
2D-->2E
2D-->2G
2D-->2R
2D-->N
2E-->21
2E-->2C
2E-->CL
2F-->2C
2F-->2T
2F-->CL
2G-->21
2G-->2C
2G-->CL
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
2H-->2U
2I-->26
2I-->N
2J-->26
2J-->5
2J-->N
2K-->2U
2M-->26
2M-->N
2M-->CL
2N-->25
2N-->N
2O-->CL
2P-->CL
2Q-->N
2Q-->39
2R-->2B
2S-->25
2S-->N
2S-->CL
2T-->2N
2T-->N
2U-->21
2U-->N
2U-->CL
2W-->2X
2Z-->31
30-->2Z
30-->31
30-->32
32-->31
34-->N
35-->34
35-->36
35-->37
36-->N
37-->N
37-->39
39-->3A
39-->3B
39-->3D
39-->3C
3A-->N
3B-->3D
3B-->N
3C-->3B
3C-->3D
3C-->N
3D-->6
3D-->N
3D-->CL
3F-->N
3G-->N
3H-->N
3I-->3U
3I-->3W
3I-->AO
3J-->N
3J-->1S
3J-->2H
3J-->CL
3M-->BF
3M-->CL
3O-->3J
3O-->N
3O-->2H
3O-->AO
3O-->BF
3O-->CL
3Q-->3F
3Q-->3G
3Q-->3M
3Q-->BF
3S-->3G
3S-->3H
3S-->N
3S-->BF
3S-->CL
3S-->CY
3S-->CZ
3U-->3M
3U-->3O
3U-->3S
3U-->1S
3U-->BF
3U-->CL
3W-->3F
3W-->3G
3W-->3Q
3W-->3S
3W-->3Z
3W-->N
3W-->1S
3W-->BF
3W-->CL
3X-->3M
3X-->3O
3X-->3Q
3X-->3S
3X-->3U
3X-->3W
3X-->3Z
3Z-->3J
3Z-->N
3Z-->1S
3Z-->2H
3Z-->AO
3Z-->BF
40-->3G
40-->3H
40-->3I
40-->3X
42-->48
42-->4L
44-->1F
45-->44
45-->4S
45-->N
45-->1F
45-->1S
48-->43
48-->4A
48-->N
48-->1S
48-->BF
48-->CL
4A-->43
4A-->N
4A-->BF
4B-->48
4B-->4A
4B-->4F
4B-->4H
4B-->4J
4B-->4L
4D-->4N
4D-->4P
4D-->A
4D-->N
4D-->1S
4D-->BF
4F-->4O
4F-->1S
4F-->BF
4F-->CL
4H-->4N
4H-->4D
4H-->N
4H-->1S
4H-->BF
4J-->4Q
4J-->4S
4J-->BF
4J-->CL
4L-->4O
4L-->4R
4L-->4S
4L-->4F
4L-->4H
4L-->4J
4L-->N
4L-->1S
4L-->BF
4L-->CL
4M-->42
4M-->43
4M-->44
4M-->45
4M-->4B
4M-->4O
4M-->4R
4M-->4S
4N-->4P
4N-->N
4O-->4R
4O-->N
4P-->N
4Q-->N
4R-->4P
4R-->N
4S-->4Q
4S-->A
4S-->N
4S-->1S
4S-->CL
4U-->4Z
4X-->BF
4Z-->52
4Z-->53
4Z-->54
4Z-->55
4Z-->4X
4Z-->BF
50-->4Z
54-->52
55-->53
56-->4U
56-->50
58-->N
5C-->1S
5C-->BF
5C-->CL
5E-->1S
5E-->39
5E-->BF
5E-->CL
5G-->62
5G-->1S
5G-->2H
5G-->AO
5G-->BF
5G-->CL
5I-->58
5I-->59
5I-->62
5I-->5K
5I-->1S
5I-->BF
5I-->CL
5K-->59
5K-->BF
5M-->5Y
5M-->5Z
5M-->N
5M-->BF
5O-->5Y
5O-->5Z
5O-->62
5O-->5C
5O-->5E
5O-->5G
5O-->5I
5O-->5M
5O-->5R
5O-->5T
5O-->5V
5O-->5X
5O-->1S
5O-->2H
5O-->BF
5O-->CL
5P-->5C
5P-->5E
5P-->5G
5P-->5I
5P-->5M
5P-->5O
5P-->5R
5P-->5T
5P-->5V
5P-->5X
5R-->1S
5R-->BF
5R-->CL
5T-->62
5T-->1S
5T-->BF
5T-->CL
5V-->1S
5V-->2H
5V-->39
5V-->AO
5V-->BF
5V-->CL
5X-->62
5X-->1S
5X-->BF
5X-->CL
5Y-->5Z
5Y-->N
5Z-->N
60-->5O
60-->AO
61-->5P
61-->60
62-->58
62-->1S
62-->2H
62-->39
66-->N
66-->2W
66-->BF
66-->CL
67-->66
68-->67
6C-->6L
6C-->BF
6E-->6M
6E-->6G
6E-->BF
6G-->6M
6G-->BF
6I-->6M
6I-->BF
6J-->6C
6J-->6E
6J-->6G
6J-->6I
6N-->6C
6N-->6E
6N-->6I
6O-->6J
6O-->6M
6O-->6N
6S-->1A
6S-->BF
6T-->6S
6U-->6S
6V-->6T
6V-->6U
6X-->N
70-->7T
70-->40
70-->BF
72-->BF
74-->78
74-->BF
76-->78
76-->BF
78-->BF
7A-->6X
7A-->78
7A-->BF
7C-->7X
7C-->BF
7E-->6X
7E-->BF
7G-->6X
7G-->7X
7G-->7Y
7G-->74
7G-->76
7G-->7A
7G-->7C
7G-->7E
7G-->7I
7G-->N
7G-->13
7G-->BF
7I-->13
7I-->BF
7I-->CL
7K-->7T
7K-->7Y
7K-->7R
7K-->N
7K-->13
7K-->BF
7M-->N
7M-->BF
7O-->7U
7O-->72
7O-->7G
7O-->7K
7O-->7M
7O-->1S
7O-->BF
7P-->7G
7P-->7I
7P-->7K
7P-->7M
7P-->7O
7R-->7T
7R-->70
7R-->N
7R-->BF
7S-->A
7S-->N
7S-->13
7S-->1S
7T-->N
7U-->6X
7U-->7S
7U-->7T
7U-->7Y
7U-->N
7U-->13
7U-->1S
7U-->40
7V-->7O
7W-->6X
7W-->7P
7W-->7S
7W-->7T
7W-->7V
7W-->7X
7W-->7Y
7X-->6X
7Y-->N
80-->2H
83-->80
83-->90
83-->BF
83-->CL
85-->8W
85-->BF
87-->BF
89-->8X
89-->8Y
89-->90
89-->1S
89-->2H
89-->BF
8B-->90
8B-->30
8B-->AO
8B-->BF
8D-->8V
8D-->90
8D-->87
8D-->2H
8D-->AO
8D-->BF
8D-->CL
8F-->8Y
8F-->90
8F-->2H
8F-->BF
8F-->CL
8H-->1S
8H-->6O
8H-->BF
8J-->90
8J-->93
8J-->89
8J-->8D
8J-->8F
8J-->8H
8J-->8N
8J-->8U
8J-->1S
8J-->2H
8J-->6O
8J-->AO
8J-->BF
8J-->CL
8L-->8W
8L-->90
8L-->83
8L-->85
8L-->8B
8L-->BF
8N-->90
8N-->1S
8N-->2H
8N-->39
8N-->AO
8N-->BF
8N-->CL
8O-->83
8O-->85
8O-->87
8O-->89
8O-->8D
8O-->8F
8O-->8H
8O-->8J
8O-->8L
8O-->8N
8O-->8Q
8O-->8S
8O-->8U
8Q-->8S
8Q-->BF
8S-->8Y
8S-->90
8S-->92
8S-->93
8S-->BF
8S-->CL
8U-->90
8U-->92
8U-->93
8U-->8S
8U-->N
8U-->BF
8V-->2H
8V-->AO
8V-->CL
8W-->N
8X-->8Y
8X-->N
8X-->2H
8X-->BF
8X-->CL
8Y-->CL
8Z-->8J
8Z-->8L
8Z-->8Q
8Z-->AO
90-->80
90-->8Y
90-->N
90-->1S
90-->2H
90-->30
90-->39
91-->8O
91-->8W
91-->8Y
91-->8Z
91-->90
91-->92
91-->93
92-->N
93-->N
96-->98
96-->9A
96-->9C
96-->9E
98-->9A
98-->9C
98-->9E
98-->BF
9A-->1F
9A-->1S
9A-->4M
9A-->BF
9C-->N
9C-->1F
9C-->1S
9C-->4M
9C-->BF
9C-->CL
9E-->N
9E-->1S
9E-->4M
9E-->BF
9E-->CL
9F-->96
9F-->9G
9G-->98
9J-->9R
9L-->1A
9L-->BF
9N-->1S
9N-->BF
9N-->CL
9P-->68
9P-->BF
9R-->9L
9R-->9N
9R-->9P
9R-->9T
9R-->BF
9T-->1S
9T-->30
9T-->BF
9U-->9J
9U-->9V
9V-->9R
9Z-->N
9Z-->1S
9Z-->35
9Z-->BF
9Z-->CL
A2-->A4
A2-->A6
A2-->A8
A2-->AC
A2-->AE
A4-->1S
A4-->BF
A6-->9Z
A6-->N
A6-->1S
A6-->35
A6-->4M
A6-->BF
A8-->AG
A8-->1S
A8-->BF
A8-->CL
AA-->AH
AA-->A1
AA-->BF
AA-->CL
AC-->AG
AC-->AH
AC-->A1
AC-->A4
AC-->A6
AC-->A8
AC-->AA
AC-->AE
AC-->N
AC-->1S
AC-->39
AC-->4M
AC-->BF
AC-->CL
AE-->1S
AE-->39
AE-->BF
AE-->CL
AF-->AI
AG-->N
AG-->39
AH-->N
AI-->AC
AO-->AL
AO-->AM
AO-->AN
AO-->AP
AP-->CL
AS-->CL
AU-->CL
AW-->CL
AY-->CL
B0-->AW
B0-->BJ
B0-->BN
B0-->C5
B2-->B6
B2-->CL
B4-->CL
B6-->CL
B8-->BC
B8-->C5
BA-->CL
BC-->CL
BF-->AS
BF-->AU
BF-->AW
BF-->AY
BF-->B0
BF-->B2
BF-->B4
BF-->B6
BF-->B8
BF-->BA
BF-->BC
BF-->BE
BF-->BH
BF-->BJ
BF-->BL
BF-->BN
BF-->BP
BF-->BR
BF-->BT
BF-->BV
BF-->BX
BF-->BZ
BF-->C1
BF-->C3
BF-->C5
BH-->CL
BJ-->CL
BL-->BC
BN-->CL
BP-->BC
BP-->C5
BR-->AW
BR-->BC
BR-->C5
BR-->CL
BT-->CL
BV-->AW
BV-->B2
BV-->BC
BX-->CL
BZ-->C5
BZ-->CL
C1-->CL
C3-->CL
C5-->CL
C9-->CJ
CC-->CJ
CD-->CE
CE-->CJ
CI-->CJ
CL-->C7
CL-->C8
CL-->C9
CL-->CA
CL-->CB
CL-->CC
CL-->CE
CL-->CD
CL-->CF
CL-->CG
CL-->CH
CL-->CJ
CL-->CK
CL-->CM
CL-->CN
CL-->CO
CL-->CP
CL-->CQ
CL-->CR
CL-->CS
CL-->CT
CL-->CU
CL-->CV
CL-->CW
CL-->D0
CL-->D1
CO-->CJ
CT-->C9
```
