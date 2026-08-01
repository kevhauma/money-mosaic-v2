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
- 315 leaf nodes, 890 edges.
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
subgraph 8F["income-settings-page"]
8G["income-settings-page.component.ts"]
end
subgraph 8H["income-yearly-panel"]
8I["income-yearly-panel.component.ts"]
end
8J["index.ts"]
subgraph 8K["salary-details-page"]
8L["salary-details-page.component.ts"]
end
subgraph 8M["salary-metadata-table"]
8N["salary-metadata-table.component.ts"]
end
subgraph 8O["salary-month-modal"]
8P["salary-month-modal.component.ts"]
end
end
8Q["gross-net-chart-options.ts"]
8R["income-category-vm.ts"]
8S["income-event-vm.ts"]
8T["income-granularity.ts"]
8U["income.routes.ts"]
8V["income.store.ts"]
8W["index.ts"]
8X["salary-metadata-edit.ts"]
8Y["salary-metadata-rows.ts"]
end
subgraph 8Z["feature-learning"]
subgraph 90["components"]
91["index.ts"]
subgraph 92["learning-overview"]
93["learning-overview.component.ts"]
end
subgraph 94["model-status"]
95["model-status.component.ts"]
end
subgraph 96["rule-proposals"]
97["rule-proposals.component.ts"]
end
subgraph 98["suggestions-table"]
99["suggestions-table.component.ts"]
end
end
9A["index.ts"]
9B["learning.routes.ts"]
end
subgraph 9C["feature-settings"]
subgraph 9D["components"]
9E["index.ts"]
subgraph 9F["settings-about-section"]
9G["settings-about-section.component.ts"]
end
subgraph 9H["settings-currency-locale-section"]
9I["settings-currency-locale-section.component.ts"]
end
subgraph 9J["settings-data-section"]
9K["settings-data-section.component.ts"]
end
subgraph 9L["settings-overview"]
9M["settings-overview.component.ts"]
end
subgraph 9N["settings-theme-section"]
9O["settings-theme-section.component.ts"]
end
end
9P["index.ts"]
9Q["settings.routes.ts"]
end
subgraph 9R["feature-transactions"]
subgraph 9S["components"]
subgraph 9T["attribution-override-fieldset"]
9U["attribution-override-fieldset.component.ts"]
end
subgraph 9V["category-select-cell"]
9W["category-select-cell.component.ts"]
end
9X["index.ts"]
subgraph 9Y["transaction-bulk-bar"]
9Z["transaction-bulk-bar.component.ts"]
end
subgraph A0["transaction-edit-form"]
A1["transaction-edit-form.component.ts"]
end
subgraph A2["transaction-filters"]
A3["transaction-filters.component.ts"]
end
subgraph A4["transaction-row"]
A5["transaction-row.component.ts"]
end
subgraph A6["transactions-overview"]
A7["transactions-overview.component.ts"]
end
subgraph A8["transfer-review"]
A9["transfer-review.component.ts"]
end
end
AA["index.ts"]
AB["transaction-filters.ts"]
AC["transaction-row-vm.ts"]
AD["transactions.routes.ts"]
end
subgraph AE["shared"]
subgraph AF["echarts"]
AG["bucketed-axis-option.ts"]
AH["chart-theme.ts"]
AI["echarts-setup.ts"]
AJ["index.ts"]
AK["tooltip-formatter.ts"]
end
subgraph AL["ui"]
subgraph AM["alert"]
AN["alert.component.ts"]
end
subgraph AO["badge"]
AP["badge.component.ts"]
end
subgraph AQ["button"]
AR["button.component.ts"]
end
subgraph AS["collapse"]
AT["collapse.component.ts"]
end
subgraph AU["confirm-dialog"]
AV["confirm-dialog.component.ts"]
end
subgraph AW["date-range-input"]
AX["date-range-input.component.ts"]
end
subgraph AY["divider"]
AZ["divider.component.ts"]
end
subgraph B0["dropdown"]
B1["dropdown.component.ts"]
end
subgraph B2["empty-state"]
B3["empty-state.component.ts"]
end
subgraph B4["fieldset"]
B5["fieldset.component.ts"]
end
subgraph B6["flex"]
B7["flex.component.ts"]
end
subgraph B8["granularity-picker"]
B9["granularity-picker.component.ts"]
end
BA["index.ts"]
subgraph BB["input"]
BC["input.component.ts"]
end
subgraph BD["label"]
BE["label.component.ts"]
end
subgraph BF["loading-skeleton"]
BG["loading-skeleton.component.ts"]
end
subgraph BH["modal"]
BI["mm-modal.component.ts"]
end
subgraph BJ["page-header"]
BK["page-header.component.ts"]
end
subgraph BL["paginator"]
BM["paginator.component.ts"]
end
subgraph BN["paper"]
BO["paper.component.ts"]
end
subgraph BP["range-grouping-switcher"]
BQ["range-grouping-switcher.component.ts"]
end
subgraph BR["select"]
BS["select.component.ts"]
end
subgraph BT["stat-card"]
BU["stat-card.component.ts"]
end
subgraph BV["table"]
BW["table.component.ts"]
end
subgraph BX["tabs"]
BY["tabs.component.ts"]
end
subgraph BZ["typography"]
C0["typography.component.ts"]
end
end
subgraph C1["utils"]
C2["confidence-color.ts"]
C3["confirm-state.ts"]
C4["currency-format.ts"]
C5["currency-symbol-presets.ts"]
C6["daisy-classes.ts"]
C7["date-buckets.ts"]
C8["date-format.pipe.ts"]
C9["date-format.ts"]
CA["debounced-text.ts"]
CB["download-json.ts"]
CC["fingerprint.ts"]
CD["format-settings.testing.ts"]
CE["format-settings.ts"]
CF["iban.ts"]
CG["index.ts"]
CH["link-control-to-setting.ts"]
CI["locale-presets.ts"]
CJ["number-format.ts"]
CK["pagination.ts"]
CL["percentage.ts"]
CM["search-params.ts"]
CN["selection-model.ts"]
CO["signed-amount.pipe.ts"]
CP["sortable.ts"]
CQ["structural-filters.ts"]
CR["theme-hooks.ts"]
subgraph CS["validators"]
CT["iban.validator.ts"]
CU["percentage.validator.ts"]
end
CV["with-archivable.ts"]
CW["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->38
5-->4
5-->6
6-->N
6-->CG
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
F-->CC
F-->CE
G-->F
G-->2Z
G-->CG
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
V-->CG
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
12-->CG
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1S
16-->2H
16-->AR
16-->BQ
16-->C0
16-->CG
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
1P-->CG
1Q-->N
1Q-->2Z
1Q-->CG
1R-->1U
1R-->N
1R-->CG
1S-->1P
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1S-->1W
1T-->CG
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
1Y-->CG
1Z-->21
1Z-->2C
1Z-->CG
20-->25
20-->N
21-->20
21-->N
21-->CG
22-->N
23-->20
23-->2O
23-->N
24-->CG
25-->22
25-->26
25-->N
25-->38
26-->5
26-->N
27-->2C
27-->N
27-->CG
28-->N
29-->CG
2A-->2B
2B-->2C
2B-->N
2C-->21
2C-->N
2C-->CG
2D-->2E
2D-->2G
2D-->N
2E-->21
2E-->2C
2E-->CG
2F-->2C
2F-->2S
2F-->CG
2G-->21
2G-->2C
2G-->CG
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
2M-->CG
2N-->25
2N-->N
2O-->CG
2P-->CG
2Q-->N
2Q-->38
2R-->25
2R-->N
2R-->CG
2S-->2N
2S-->N
2T-->21
2T-->N
2T-->CG
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
3C-->CG
3E-->N
3F-->N
3G-->N
3H-->3T
3H-->3V
3H-->AJ
3I-->N
3I-->1S
3I-->2H
3I-->CG
3L-->BA
3L-->CG
3N-->3I
3N-->N
3N-->2H
3N-->AJ
3N-->BA
3N-->CG
3P-->3E
3P-->3F
3P-->3L
3P-->BA
3R-->3F
3R-->3G
3R-->N
3R-->BA
3R-->CG
3R-->CT
3R-->CU
3T-->3L
3T-->3N
3T-->3R
3T-->1S
3T-->BA
3T-->CG
3V-->3E
3V-->3F
3V-->3P
3V-->3R
3V-->3Y
3V-->N
3V-->1S
3V-->BA
3V-->CG
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
3Y-->AJ
3Y-->BA
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
47-->BA
47-->CG
49-->42
49-->N
49-->BA
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
4C-->BA
4E-->4N
4E-->1S
4E-->BA
4E-->CG
4G-->4M
4G-->4C
4G-->N
4G-->1S
4G-->BA
4I-->4P
4I-->4R
4I-->BA
4I-->CG
4K-->4N
4K-->4Q
4K-->4R
4K-->4E
4K-->4G
4K-->4I
4K-->N
4K-->1S
4K-->BA
4K-->CG
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
4R-->CG
4T-->4Y
4W-->BA
4Y-->51
4Y-->52
4Y-->53
4Y-->54
4Y-->4W
4Y-->BA
4Z-->4Y
53-->51
54-->52
55-->4T
55-->4Z
57-->N
5B-->1S
5B-->BA
5B-->CG
5D-->1S
5D-->38
5D-->BA
5D-->CG
5F-->61
5F-->1S
5F-->2H
5F-->AJ
5F-->BA
5F-->CG
5H-->57
5H-->58
5H-->61
5H-->5J
5H-->1S
5H-->BA
5H-->CG
5J-->58
5J-->BA
5L-->5X
5L-->5Y
5L-->N
5L-->BA
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
5N-->BA
5N-->CG
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
5Q-->BA
5Q-->CG
5S-->61
5S-->1S
5S-->BA
5S-->CG
5U-->1S
5U-->2H
5U-->38
5U-->AJ
5U-->BA
5U-->CG
5W-->61
5W-->1S
5W-->BA
5W-->CG
5X-->5Y
5X-->N
5Y-->N
5Z-->5N
5Z-->AJ
60-->5O
60-->5Z
61-->57
61-->1S
61-->2H
61-->38
65-->N
65-->2V
65-->BA
65-->CG
66-->65
67-->66
6B-->6I
6B-->BA
6D-->6J
6D-->BA
6F-->6J
6F-->BA
6G-->6B
6G-->6D
6G-->6F
6K-->6B
6K-->6D
6K-->6F
6L-->6G
6L-->6K
6P-->1A
6P-->BA
6Q-->6P
6R-->6P
6S-->6Q
6S-->6R
6U-->N
6X-->7Q
6X-->3Z
6X-->BA
6Z-->BA
71-->75
71-->BA
73-->75
73-->BA
75-->BA
77-->6U
77-->75
77-->BA
79-->7U
79-->BA
7B-->6U
7B-->BA
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
7D-->BA
7F-->13
7F-->BA
7F-->CG
7H-->7Q
7H-->7V
7H-->7O
7H-->N
7H-->13
7H-->BA
7J-->N
7J-->BA
7L-->7R
7L-->6Z
7L-->7D
7L-->7H
7L-->7J
7L-->1S
7L-->BA
7M-->7D
7M-->7F
7M-->7H
7M-->7J
7M-->7L
7O-->7Q
7O-->6X
7O-->N
7O-->BA
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
80-->8V
80-->BA
80-->CG
82-->8R
82-->BA
84-->BA
86-->8S
86-->8T
86-->8V
86-->1S
86-->2H
86-->BA
88-->8V
88-->2Z
88-->AJ
88-->BA
8A-->8Q
8A-->8V
8A-->84
8A-->2H
8A-->AJ
8A-->BA
8A-->CG
8C-->8T
8C-->8V
8C-->2H
8C-->BA
8C-->CG
8E-->8V
8E-->8Y
8E-->86
8E-->8A
8E-->8C
8E-->8I
8E-->8P
8E-->2H
8E-->AJ
8E-->BA
8E-->CG
8G-->8R
8G-->8V
8G-->80
8G-->82
8G-->88
8G-->BA
8I-->8V
8I-->1S
8I-->2H
8I-->38
8I-->AJ
8I-->BA
8I-->CG
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
8J-->8N
8J-->8P
8L-->8N
8L-->BA
8N-->8T
8N-->8V
8N-->8X
8N-->8Y
8N-->BA
8N-->CG
8P-->8V
8P-->8X
8P-->8Y
8P-->8N
8P-->N
8P-->BA
8Q-->2H
8Q-->AJ
8Q-->CG
8R-->N
8S-->8T
8S-->N
8S-->2H
8S-->CG
8T-->CG
8U-->8E
8U-->8G
8U-->8L
8U-->AJ
8V-->7X
8V-->8T
8V-->N
8V-->1S
8V-->2H
8V-->2Z
8V-->38
8W-->8J
8W-->8R
8W-->8T
8W-->8U
8W-->8V
8W-->8X
8W-->8Y
8X-->N
8Y-->N
91-->93
91-->95
91-->97
91-->99
93-->95
93-->97
93-->99
93-->BA
95-->1F
95-->1S
95-->4L
95-->BA
97-->N
97-->1F
97-->1S
97-->4L
97-->BA
97-->CG
99-->N
99-->1S
99-->4L
99-->BA
99-->CG
9A-->91
9A-->9B
9B-->93
9E-->9M
9G-->1A
9G-->BA
9I-->1S
9I-->BA
9I-->CG
9K-->67
9K-->BA
9M-->9G
9M-->9I
9M-->9K
9M-->9O
9M-->BA
9O-->1S
9O-->2Z
9O-->BA
9P-->9E
9P-->9Q
9Q-->9M
9U-->N
9U-->1S
9U-->34
9U-->BA
9U-->CG
9X-->9Z
9X-->A1
9X-->A3
9X-->A7
9X-->A9
9Z-->1S
9Z-->BA
A1-->9U
A1-->N
A1-->1S
A1-->34
A1-->4L
A1-->BA
A3-->AB
A3-->1S
A3-->BA
A3-->CG
A5-->AC
A5-->9W
A5-->BA
A5-->CG
A7-->AB
A7-->AC
A7-->9W
A7-->9Z
A7-->A1
A7-->A3
A7-->A5
A7-->A9
A7-->N
A7-->1S
A7-->38
A7-->4L
A7-->BA
A7-->CG
A9-->1S
A9-->38
A9-->BA
A9-->CG
AA-->AD
AB-->N
AB-->38
AC-->N
AD-->A7
AJ-->AG
AJ-->AH
AJ-->AI
AJ-->AK
AK-->CG
AN-->CG
AP-->CG
AR-->CG
AT-->CG
AV-->AR
AV-->BE
AV-->BI
AV-->C0
AX-->B1
AX-->CG
AZ-->CG
B1-->CG
B3-->B7
B3-->C0
B5-->CG
B7-->CG
BA-->AN
BA-->AP
BA-->AR
BA-->AT
BA-->AV
BA-->AX
BA-->AZ
BA-->B1
BA-->B3
BA-->B5
BA-->B7
BA-->B9
BA-->BC
BA-->BE
BA-->BG
BA-->BI
BA-->BK
BA-->BM
BA-->BO
BA-->BQ
BA-->BS
BA-->BU
BA-->BW
BA-->BY
BA-->C0
BC-->CG
BE-->CG
BG-->B7
BI-->CG
BK-->B7
BK-->C0
BM-->AR
BM-->B7
BM-->C0
BM-->CG
BO-->CG
BQ-->AR
BQ-->AX
BQ-->B7
BS-->CG
BU-->C0
BU-->CG
BW-->CG
BY-->CG
C0-->CG
C4-->CE
C7-->CE
C8-->C9
C9-->CE
CD-->CE
CG-->C2
CG-->C3
CG-->C4
CG-->C5
CG-->C6
CG-->C7
CG-->C9
CG-->C8
CG-->CA
CG-->CB
CG-->CC
CG-->CE
CG-->CF
CG-->CH
CG-->CI
CG-->CJ
CG-->CK
CG-->CL
CG-->CM
CG-->CN
CG-->CO
CG-->CP
CG-->CQ
CG-->CR
CG-->CV
CG-->CW
CJ-->CE
CO-->C4
```
