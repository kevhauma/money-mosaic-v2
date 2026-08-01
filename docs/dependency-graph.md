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
- 308 leaf nodes, 867 edges.
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
27["full-history-range.ts"]
28["granularity-for-span.ts"]
29["gross-net-ratio.ts"]
2A["income-category-series.ts"]
2B["income-gap-detection.ts"]
2C["income-growth.ts"]
2D["income-step-change-detection.ts"]
2E["index.ts"]
2F["joint-account-stake.ts"]
2G["joint-contributor-breakdown.ts"]
2H["multi-year-income-comparison.ts"]
2I["net-margin.ts"]
2J["net-worth-trend.ts"]
2K["period-stats.ts"]
2L["period-window.ts"]
2M["periodized-rate.ts"]
2N["top-transactions.ts"]
2O["weekday-weekend-split.ts"]
2P["year-over-year.ts"]
2Q["yearly-income-summary.ts"]
end
subgraph 2R["storage"]
2S["index.ts"]
2T["storage-status.service.ts"]
end
subgraph 2U["theme"]
2V["accent-colors.ts"]
2W["index.ts"]
2X["theme-styles.ts"]
2Y["theme.service.ts"]
end
subgraph 2Z["transactions"]
30["attribution-override.ts"]
31["index.ts"]
32["nullify-transaction.ts"]
33["transaction-deletion.service.ts"]
end
subgraph 34["transfers"]
35["index.ts"]
36["transfer-cleanup.service.ts"]
37["transfer-linking.service.ts"]
38["transfer-matching.service.ts"]
39["transfer-matching.ts"]
end
end
subgraph 3A["feature-accounts"]
3B["account-card-vm.ts"]
3C["account-icons.ts"]
3D["account-types.ts"]
3E["accounts.routes.ts"]
3F["balance-trend-signals.ts"]
subgraph 3G["components"]
subgraph 3H["account-balance-block"]
3I["account-balance-block.component.ts"]
end
subgraph 3J["account-balance-chart"]
3K["account-balance-chart.component.ts"]
end
subgraph 3L["account-card"]
3M["account-card.component.ts"]
end
subgraph 3N["account-form"]
3O["account-form.component.ts"]
end
subgraph 3P["accounts-detail"]
3Q["accounts-detail.component.ts"]
end
subgraph 3R["accounts-overview"]
3S["accounts-overview.component.ts"]
end
3T["index.ts"]
subgraph 3U["net-worth-history-chart"]
3V["net-worth-history-chart.component.ts"]
end
end
3W["index.ts"]
end
subgraph 3X["feature-categories"]
3Y["categories.routes.ts"]
3Z["category-icons.ts"]
40["category-model.service.ts"]
41["category-model.store.ts"]
subgraph 42["components"]
subgraph 43["categories-overview"]
44["categories-overview.component.ts"]
end
subgraph 45["category-form"]
46["category-form.component.ts"]
end
47["index.ts"]
subgraph 48["rule-condition-row"]
49["rule-condition-row.component.ts"]
end
subgraph 4A["rule-filters"]
4B["rule-filters.component.ts"]
end
subgraph 4C["rule-form"]
4D["rule-form.component.ts"]
end
subgraph 4E["rule-share-bar"]
4F["rule-share-bar.component.ts"]
end
subgraph 4G["rules-overview"]
4H["rules-overview.component.ts"]
end
end
4I["index.ts"]
4J["rule-condition-editor.ts"]
4K["rule-filters.ts"]
4L["rule-labels.ts"]
4M["rule-share.ts"]
4N["rule-summary.ts"]
4O["rules.store.ts"]
end
subgraph 4P["feature-changelog"]
4Q["changelog.routes.ts"]
subgraph 4R["components"]
subgraph 4S["changelog-entry-row"]
4T["changelog-entry-row.component.ts"]
end
subgraph 4U["changelog-page"]
4V["changelog-page.component.ts"]
end
4W["index.ts"]
end
subgraph 4X["data"]
4Y["changelog-entries.ts"]
4Z["roadmap-entries.ts"]
end
50["group-changelog-entries.ts"]
51["group-roadmap-entries.ts"]
52["index.ts"]
end
subgraph 53["feature-dashboard"]
54["category-comparison-settings.store.ts"]
55["category-comparison-vm.ts"]
subgraph 56["components"]
subgraph 57["account-balance-strip"]
58["account-balance-strip.component.ts"]
end
subgraph 59["action-queue-panel"]
5A["action-queue-panel.component.ts"]
end
subgraph 5B["category-breakdown-panel"]
5C["category-breakdown-panel.component.ts"]
end
subgraph 5D["category-comparison-panel"]
5E["category-comparison-panel.component.ts"]
end
subgraph 5F["comparison-category-card"]
5G["comparison-category-card.component.ts"]
end
subgraph 5H["dashboard-customize-panel"]
5I["dashboard-customize-panel.component.ts"]
end
subgraph 5J["dashboard-overview"]
5K["dashboard-overview.component.ts"]
end
5L["index.ts"]
subgraph 5M["net-worth-header"]
5N["net-worth-header.component.ts"]
end
subgraph 5O["top-transactions-panel"]
5P["top-transactions-panel.component.ts"]
end
subgraph 5Q["trend-chart-panel"]
5R["trend-chart-panel.component.ts"]
end
subgraph 5S["weekday-weekend-split-panel"]
5T["weekday-weekend-split-panel.component.ts"]
end
end
5U["dashboard-layout-settings.store.ts"]
5V["dashboard-row-order.ts"]
5W["dashboard.routes.ts"]
5X["index.ts"]
5Y["stats.store.ts"]
end
subgraph 5Z["feature-data-management"]
subgraph 60["components"]
subgraph 61["data-management-overview"]
62["data-management-overview.component.ts"]
end
63["index.ts"]
end
64["index.ts"]
end
subgraph 65["feature-help"]
subgraph 66["components"]
subgraph 67["faq-page"]
68["faq-page.component.ts"]
end
subgraph 69["guide-detail"]
6A["guide-detail.component.ts"]
end
subgraph 6B["guides-index"]
6C["guides-index.component.ts"]
end
6D["index.ts"]
end
subgraph 6E["data"]
6F["faq.ts"]
6G["guides.ts"]
end
6H["help.routes.ts"]
6I["index.ts"]
end
subgraph 6J["feature-home"]
subgraph 6K["components"]
subgraph 6L["home-landing"]
6M["home-landing.component.ts"]
end
6N["index.ts"]
end
6O["home.routes.ts"]
6P["index.ts"]
end
subgraph 6Q["feature-import"]
6R["column-mapping.ts"]
subgraph 6S["components"]
subgraph 6T["account-draft-editor"]
6U["account-draft-editor.component.ts"]
end
subgraph 6V["batch-wait-card"]
6W["batch-wait-card.component.ts"]
end
subgraph 6X["column-map-amount-field"]
6Y["column-map-amount-field.component.ts"]
end
subgraph 6Z["column-map-counterparty-field"]
70["column-map-counterparty-field.component.ts"]
end
subgraph 71["column-map-sample-caption"]
72["column-map-sample-caption.component.ts"]
end
subgraph 73["column-map-simple-field"]
74["column-map-simple-field.component.ts"]
end
subgraph 75["column-map-stepper"]
76["column-map-stepper.component.ts"]
end
subgraph 77["column-map-summary-step"]
78["column-map-summary-step.component.ts"]
end
subgraph 79["import-map-step"]
7A["import-map-step.component.ts"]
end
subgraph 7B["import-preview-step"]
7C["import-preview-step.component.ts"]
end
subgraph 7D["import-select-step"]
7E["import-select-step.component.ts"]
end
subgraph 7F["import-summary-step"]
7G["import-summary-step.component.ts"]
end
subgraph 7H["import-wizard"]
7I["import-wizard.component.ts"]
end
7J["index.ts"]
subgraph 7K["queued-file-row"]
7L["queued-file-row.component.ts"]
end
end
7M["import-batches.store.ts"]
7N["import-queue.ts"]
7O["import-wizard-session.ts"]
7P["import.routes.ts"]
7Q["index.ts"]
7R["mapper-steps.ts"]
7S["mapping-profiles.store.ts"]
end
subgraph 7T["feature-income"]
7U["career-start-date.ts"]
subgraph 7V["components"]
subgraph 7W["income-career-start"]
7X["income-career-start.component.ts"]
end
subgraph 7Y["income-category-checklist"]
7Z["income-category-checklist.component.ts"]
end
subgraph 80["income-gap-warnings"]
81["income-gap-warnings.component.ts"]
end
subgraph 82["income-gross-color"]
83["income-gross-color.component.ts"]
end
subgraph 84["income-gross-net-panel"]
85["income-gross-net-panel.component.ts"]
end
subgraph 86["income-growth-panel"]
87["income-growth-panel.component.ts"]
end
subgraph 88["income-overview"]
89["income-overview.component.ts"]
end
subgraph 8A["income-settings"]
8B["income-settings.component.ts"]
end
subgraph 8C["income-step-changes"]
8D["income-step-changes.component.ts"]
end
subgraph 8E["income-yearly-panel"]
8F["income-yearly-panel.component.ts"]
end
8G["index.ts"]
subgraph 8H["salary-metadata-table"]
8I["salary-metadata-table.component.ts"]
end
end
8J["income-category-vm.ts"]
8K["income-granularity.ts"]
8L["income.routes.ts"]
8M["income.store.ts"]
8N["index.ts"]
8O["salary-metadata-edit.ts"]
8P["salary-metadata-rows.ts"]
end
subgraph 8Q["feature-learning"]
subgraph 8R["components"]
8S["index.ts"]
subgraph 8T["learning-overview"]
8U["learning-overview.component.ts"]
end
subgraph 8V["model-status"]
8W["model-status.component.ts"]
end
subgraph 8X["rule-proposals"]
8Y["rule-proposals.component.ts"]
end
subgraph 8Z["suggestions-table"]
90["suggestions-table.component.ts"]
end
end
91["index.ts"]
92["learning.routes.ts"]
end
subgraph 93["feature-settings"]
subgraph 94["components"]
95["index.ts"]
subgraph 96["settings-about-section"]
97["settings-about-section.component.ts"]
end
subgraph 98["settings-currency-locale-section"]
99["settings-currency-locale-section.component.ts"]
end
subgraph 9A["settings-data-section"]
9B["settings-data-section.component.ts"]
end
subgraph 9C["settings-overview"]
9D["settings-overview.component.ts"]
end
subgraph 9E["settings-theme-section"]
9F["settings-theme-section.component.ts"]
end
end
9G["index.ts"]
9H["settings.routes.ts"]
end
subgraph 9I["feature-transactions"]
subgraph 9J["components"]
subgraph 9K["attribution-override-fieldset"]
9L["attribution-override-fieldset.component.ts"]
end
subgraph 9M["category-select-cell"]
9N["category-select-cell.component.ts"]
end
9O["index.ts"]
subgraph 9P["transaction-bulk-bar"]
9Q["transaction-bulk-bar.component.ts"]
end
subgraph 9R["transaction-edit-form"]
9S["transaction-edit-form.component.ts"]
end
subgraph 9T["transaction-filters"]
9U["transaction-filters.component.ts"]
end
subgraph 9V["transaction-row"]
9W["transaction-row.component.ts"]
end
subgraph 9X["transactions-overview"]
9Y["transactions-overview.component.ts"]
end
subgraph 9Z["transfer-review"]
A0["transfer-review.component.ts"]
end
end
A1["index.ts"]
A2["transaction-filters.ts"]
A3["transaction-row-vm.ts"]
A4["transactions.routes.ts"]
end
subgraph A5["shared"]
subgraph A6["echarts"]
A7["bucketed-axis-option.ts"]
A8["chart-theme.ts"]
A9["echarts-setup.ts"]
AA["index.ts"]
AB["tooltip-formatter.ts"]
end
subgraph AC["ui"]
subgraph AD["alert"]
AE["alert.component.ts"]
end
subgraph AF["badge"]
AG["badge.component.ts"]
end
subgraph AH["button"]
AI["button.component.ts"]
end
subgraph AJ["collapse"]
AK["collapse.component.ts"]
end
subgraph AL["confirm-dialog"]
AM["confirm-dialog.component.ts"]
end
subgraph AN["date-range-input"]
AO["date-range-input.component.ts"]
end
subgraph AP["divider"]
AQ["divider.component.ts"]
end
subgraph AR["dropdown"]
AS["dropdown.component.ts"]
end
subgraph AT["empty-state"]
AU["empty-state.component.ts"]
end
subgraph AV["fieldset"]
AW["fieldset.component.ts"]
end
subgraph AX["flex"]
AY["flex.component.ts"]
end
subgraph AZ["granularity-picker"]
B0["granularity-picker.component.ts"]
end
B1["index.ts"]
subgraph B2["input"]
B3["input.component.ts"]
end
subgraph B4["label"]
B5["label.component.ts"]
end
subgraph B6["loading-skeleton"]
B7["loading-skeleton.component.ts"]
end
subgraph B8["modal"]
B9["mm-modal.component.ts"]
end
subgraph BA["page-header"]
BB["page-header.component.ts"]
end
subgraph BC["paginator"]
BD["paginator.component.ts"]
end
subgraph BE["paper"]
BF["paper.component.ts"]
end
subgraph BG["range-grouping-switcher"]
BH["range-grouping-switcher.component.ts"]
end
subgraph BI["select"]
BJ["select.component.ts"]
end
subgraph BK["stat-card"]
BL["stat-card.component.ts"]
end
subgraph BM["table"]
BN["table.component.ts"]
end
subgraph BO["tabs"]
BP["tabs.component.ts"]
end
subgraph BQ["typography"]
BR["typography.component.ts"]
end
end
subgraph BS["utils"]
BT["confidence-color.ts"]
BU["confirm-state.ts"]
BV["currency-format.ts"]
BW["currency-symbol-presets.ts"]
BX["daisy-classes.ts"]
BY["date-buckets.ts"]
BZ["date-format.pipe.ts"]
C0["date-format.ts"]
C1["debounced-text.ts"]
C2["download-json.ts"]
C3["fingerprint.ts"]
C4["format-settings.testing.ts"]
C5["format-settings.ts"]
C6["iban.ts"]
C7["index.ts"]
C8["link-control-to-setting.ts"]
C9["locale-presets.ts"]
CA["number-format.ts"]
CB["pagination.ts"]
CC["percentage.ts"]
CD["search-params.ts"]
CE["selection-model.ts"]
CF["signed-amount.pipe.ts"]
CG["sortable.ts"]
CH["structural-filters.ts"]
CI["theme-hooks.ts"]
subgraph CJ["validators"]
CK["iban.validator.ts"]
CL["percentage.validator.ts"]
end
CM["with-archivable.ts"]
CN["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->35
5-->4
5-->6
6-->N
6-->C7
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
F-->2V
F-->C3
F-->C5
G-->F
G-->2W
G-->C7
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
V-->C7
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
12-->35
12-->C7
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1S
16-->2E
16-->AI
16-->BH
16-->BR
16-->C7
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
1P-->2E
1P-->35
1P-->C7
1Q-->N
1Q-->2W
1Q-->C7
1R-->1U
1R-->N
1R-->C7
1S-->1P
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1S-->1W
1T-->C7
1U-->N
1U-->31
1U-->35
1V-->N
1W-->1U
1W-->1V
1W-->N
1W-->35
1Y-->26
1Y-->2J
1Y-->N
1Y-->C7
1Z-->21
1Z-->2A
1Z-->C7
20-->25
20-->N
21-->20
21-->N
21-->C7
22-->N
23-->20
23-->2L
23-->N
24-->C7
25-->22
25-->26
25-->N
25-->35
26-->5
26-->N
27-->N
28-->C7
29-->2A
29-->N
2A-->21
2A-->N
2A-->C7
2B-->21
2B-->2A
2B-->C7
2C-->2A
2C-->2P
2C-->C7
2D-->21
2D-->2A
2D-->C7
2E-->1Y
2E-->1Z
2E-->20
2E-->21
2E-->22
2E-->23
2E-->24
2E-->25
2E-->26
2E-->27
2E-->28
2E-->29
2E-->2A
2E-->2B
2E-->2C
2E-->2D
2E-->2F
2E-->2G
2E-->2H
2E-->2I
2E-->2J
2E-->2K
2E-->2L
2E-->2M
2E-->2N
2E-->2O
2E-->2P
2E-->2Q
2F-->26
2F-->N
2G-->26
2G-->5
2G-->N
2H-->2Q
2J-->26
2J-->N
2J-->C7
2K-->25
2K-->N
2L-->C7
2M-->C7
2N-->N
2N-->35
2O-->25
2O-->N
2O-->C7
2P-->2K
2P-->N
2Q-->21
2Q-->N
2Q-->C7
2S-->2T
2V-->2X
2W-->2V
2W-->2X
2W-->2Y
2Y-->2X
30-->N
31-->30
31-->32
31-->33
32-->N
33-->N
33-->35
35-->36
35-->37
35-->39
35-->38
36-->N
37-->39
37-->N
38-->37
38-->39
38-->N
39-->6
39-->N
39-->C7
3B-->N
3C-->N
3D-->N
3E-->3Q
3E-->3S
3E-->AA
3F-->N
3F-->1S
3F-->2E
3F-->C7
3I-->B1
3I-->C7
3K-->3F
3K-->N
3K-->2E
3K-->AA
3K-->B1
3K-->C7
3M-->3B
3M-->3C
3M-->3I
3M-->B1
3O-->3C
3O-->3D
3O-->N
3O-->B1
3O-->C7
3O-->CK
3O-->CL
3Q-->3I
3Q-->3K
3Q-->3O
3Q-->1S
3Q-->B1
3Q-->C7
3S-->3B
3S-->3C
3S-->3M
3S-->3O
3S-->3V
3S-->N
3S-->1S
3S-->B1
3S-->C7
3T-->3I
3T-->3K
3T-->3M
3T-->3O
3T-->3Q
3T-->3S
3T-->3V
3V-->3F
3V-->N
3V-->1S
3V-->2E
3V-->AA
3V-->B1
3W-->3C
3W-->3D
3W-->3E
3W-->3T
3Y-->44
3Y-->4H
40-->1F
41-->40
41-->4O
41-->N
41-->1F
41-->1S
44-->3Z
44-->46
44-->N
44-->1S
44-->B1
44-->C7
46-->3Z
46-->N
46-->B1
47-->44
47-->46
47-->4B
47-->4D
47-->4F
47-->4H
49-->4J
49-->4L
49-->A
49-->N
49-->1S
49-->B1
4B-->4K
4B-->1S
4B-->B1
4B-->C7
4D-->4J
4D-->49
4D-->N
4D-->1S
4D-->B1
4F-->4M
4F-->4O
4F-->B1
4F-->C7
4H-->4K
4H-->4N
4H-->4O
4H-->4B
4H-->4D
4H-->4F
4H-->N
4H-->1S
4H-->B1
4H-->C7
4I-->3Y
4I-->3Z
4I-->40
4I-->41
4I-->47
4I-->4K
4I-->4N
4I-->4O
4J-->4L
4J-->N
4K-->4N
4K-->N
4L-->N
4M-->N
4N-->4L
4N-->N
4O-->4M
4O-->A
4O-->N
4O-->1S
4O-->C7
4Q-->4V
4T-->B1
4V-->4Y
4V-->4Z
4V-->50
4V-->51
4V-->4T
4V-->B1
4W-->4V
50-->4Y
51-->4Z
52-->4Q
52-->4W
54-->N
58-->1S
58-->B1
58-->C7
5A-->1S
5A-->35
5A-->B1
5A-->C7
5C-->5Y
5C-->1S
5C-->2E
5C-->AA
5C-->B1
5C-->C7
5E-->54
5E-->55
5E-->5Y
5E-->5G
5E-->1S
5E-->B1
5E-->C7
5G-->55
5G-->B1
5I-->5U
5I-->5V
5I-->N
5I-->B1
5K-->5U
5K-->5V
5K-->5Y
5K-->58
5K-->5A
5K-->5C
5K-->5E
5K-->5I
5K-->5N
5K-->5P
5K-->5R
5K-->5T
5K-->1S
5K-->2E
5K-->B1
5K-->C7
5L-->58
5L-->5A
5L-->5C
5L-->5E
5L-->5I
5L-->5K
5L-->5N
5L-->5P
5L-->5R
5L-->5T
5N-->1S
5N-->B1
5N-->C7
5P-->5Y
5P-->1S
5P-->B1
5P-->C7
5R-->1S
5R-->2E
5R-->35
5R-->AA
5R-->B1
5R-->C7
5T-->5Y
5T-->1S
5T-->B1
5T-->C7
5U-->5V
5U-->N
5V-->N
5W-->5K
5W-->AA
5X-->5L
5X-->5W
5Y-->54
5Y-->1S
5Y-->2E
5Y-->35
62-->N
62-->2S
62-->B1
62-->C7
63-->62
64-->63
68-->6F
68-->B1
6A-->6G
6A-->B1
6C-->6G
6C-->B1
6D-->68
6D-->6A
6D-->6C
6H-->68
6H-->6A
6H-->6C
6I-->6D
6I-->6H
6M-->1A
6M-->B1
6N-->6M
6O-->6M
6P-->6N
6P-->6O
6R-->N
6U-->7N
6U-->3W
6U-->B1
6W-->B1
6Y-->72
6Y-->B1
70-->72
70-->B1
72-->B1
74-->6R
74-->72
74-->B1
76-->7R
76-->B1
78-->6R
78-->B1
7A-->6R
7A-->7R
7A-->7S
7A-->6Y
7A-->70
7A-->74
7A-->76
7A-->78
7A-->7C
7A-->N
7A-->13
7A-->B1
7C-->13
7C-->B1
7C-->C7
7E-->7N
7E-->7S
7E-->7L
7E-->N
7E-->13
7E-->B1
7G-->N
7G-->B1
7I-->7O
7I-->6W
7I-->7A
7I-->7E
7I-->7G
7I-->1S
7I-->B1
7J-->7A
7J-->7C
7J-->7E
7J-->7G
7J-->7I
7L-->7N
7L-->6U
7L-->N
7L-->B1
7M-->A
7M-->N
7M-->13
7M-->1S
7N-->N
7O-->6R
7O-->7M
7O-->7N
7O-->7S
7O-->N
7O-->13
7O-->1S
7O-->3W
7P-->7I
7Q-->6R
7Q-->7J
7Q-->7M
7Q-->7N
7Q-->7P
7Q-->7R
7Q-->7S
7R-->6R
7S-->N
7U-->2E
7X-->7U
7X-->8M
7X-->B1
7X-->C7
7Z-->8J
7Z-->B1
81-->8K
81-->8M
81-->N
81-->1S
81-->2E
81-->B1
81-->C7
83-->8M
83-->2W
83-->AA
83-->B1
85-->8M
85-->2E
85-->AA
85-->B1
85-->C7
87-->8K
87-->8M
87-->2E
87-->B1
87-->C7
89-->8M
89-->81
89-->85
89-->87
89-->8B
89-->8D
89-->8F
89-->8I
89-->2E
89-->AA
89-->B1
89-->C7
8B-->8J
8B-->8M
8B-->7X
8B-->7Z
8B-->83
8B-->B1
8D-->8K
8D-->8M
8D-->N
8D-->1S
8D-->2E
8D-->B1
8D-->C7
8F-->8M
8F-->1S
8F-->2E
8F-->35
8F-->AA
8F-->B1
8F-->C7
8G-->7X
8G-->7Z
8G-->81
8G-->85
8G-->87
8G-->89
8G-->8B
8G-->8D
8G-->8F
8G-->8I
8I-->8K
8I-->8M
8I-->8O
8I-->8P
8I-->B1
8I-->C7
8J-->N
8K-->C7
8L-->89
8L-->AA
8M-->7U
8M-->8K
8M-->N
8M-->1S
8M-->2E
8M-->2W
8M-->35
8N-->8G
8N-->8J
8N-->8K
8N-->8L
8N-->8M
8N-->8O
8N-->8P
8O-->N
8P-->N
8S-->8U
8S-->8W
8S-->8Y
8S-->90
8U-->8W
8U-->8Y
8U-->90
8U-->B1
8W-->1F
8W-->1S
8W-->4I
8W-->B1
8Y-->N
8Y-->1F
8Y-->1S
8Y-->4I
8Y-->B1
8Y-->C7
90-->N
90-->1S
90-->4I
90-->B1
90-->C7
91-->8S
91-->92
92-->8U
95-->9D
97-->1A
97-->B1
99-->1S
99-->B1
99-->C7
9B-->64
9B-->B1
9D-->97
9D-->99
9D-->9B
9D-->9F
9D-->B1
9F-->1S
9F-->2W
9F-->B1
9G-->95
9G-->9H
9H-->9D
9L-->N
9L-->1S
9L-->31
9L-->B1
9L-->C7
9O-->9Q
9O-->9S
9O-->9U
9O-->9Y
9O-->A0
9Q-->1S
9Q-->B1
9S-->9L
9S-->N
9S-->1S
9S-->31
9S-->4I
9S-->B1
9U-->A2
9U-->1S
9U-->B1
9U-->C7
9W-->A3
9W-->9N
9W-->B1
9W-->C7
9Y-->A2
9Y-->A3
9Y-->9N
9Y-->9Q
9Y-->9S
9Y-->9U
9Y-->9W
9Y-->A0
9Y-->N
9Y-->1S
9Y-->35
9Y-->4I
9Y-->B1
9Y-->C7
A0-->1S
A0-->35
A0-->B1
A0-->C7
A1-->A4
A2-->N
A2-->35
A3-->N
A4-->9Y
AA-->A7
AA-->A8
AA-->A9
AA-->AB
AB-->C7
AE-->C7
AG-->C7
AI-->C7
AK-->C7
AM-->AI
AM-->B5
AM-->B9
AM-->BR
AO-->AS
AO-->C7
AQ-->C7
AS-->C7
AU-->AY
AU-->BR
AW-->C7
AY-->C7
B1-->AE
B1-->AG
B1-->AI
B1-->AK
B1-->AM
B1-->AO
B1-->AQ
B1-->AS
B1-->AU
B1-->AW
B1-->AY
B1-->B0
B1-->B3
B1-->B5
B1-->B7
B1-->B9
B1-->BB
B1-->BD
B1-->BF
B1-->BH
B1-->BJ
B1-->BL
B1-->BN
B1-->BP
B1-->BR
B3-->C7
B5-->C7
B7-->AY
B9-->C7
BB-->AY
BB-->BR
BD-->AI
BD-->AY
BD-->BR
BD-->C7
BF-->C7
BH-->AI
BH-->AO
BH-->AY
BJ-->C7
BL-->BR
BL-->C7
BN-->C7
BP-->C7
BR-->C7
BV-->C5
BY-->C5
BZ-->C0
C0-->C5
C4-->C5
C7-->BT
C7-->BU
C7-->BV
C7-->BW
C7-->BX
C7-->BY
C7-->C0
C7-->BZ
C7-->C1
C7-->C2
C7-->C3
C7-->C5
C7-->C6
C7-->C8
C7-->C9
C7-->CA
C7-->CB
C7-->CC
C7-->CD
C7-->CE
C7-->CF
C7-->CG
C7-->CH
C7-->CI
C7-->CM
C7-->CN
CA-->C5
CF-->BV
```
