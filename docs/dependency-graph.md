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
- 304 leaf nodes, 849 edges.
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
29["income-category-series.ts"]
2A["income-gap-detection.ts"]
2B["income-growth.ts"]
2C["income-step-change-detection.ts"]
2D["index.ts"]
2E["joint-account-stake.ts"]
2F["joint-contributor-breakdown.ts"]
2G["multi-year-income-comparison.ts"]
2H["net-margin.ts"]
2I["net-worth-trend.ts"]
2J["period-stats.ts"]
2K["period-window.ts"]
2L["periodized-rate.ts"]
2M["top-transactions.ts"]
2N["weekday-weekend-split.ts"]
2O["year-over-year.ts"]
2P["yearly-income-summary.ts"]
end
subgraph 2Q["storage"]
2R["index.ts"]
2S["storage-status.service.ts"]
end
subgraph 2T["theme"]
2U["accent-colors.ts"]
2V["index.ts"]
2W["theme-styles.ts"]
2X["theme.service.ts"]
end
subgraph 2Y["transactions"]
2Z["attribution-override.ts"]
30["index.ts"]
31["nullify-transaction.ts"]
32["transaction-deletion.service.ts"]
end
subgraph 33["transfers"]
34["index.ts"]
35["transfer-cleanup.service.ts"]
36["transfer-linking.service.ts"]
37["transfer-matching.service.ts"]
38["transfer-matching.ts"]
end
end
subgraph 39["feature-accounts"]
3A["account-card-vm.ts"]
3B["account-icons.ts"]
3C["account-types.ts"]
3D["accounts.routes.ts"]
3E["balance-trend-signals.ts"]
subgraph 3F["components"]
subgraph 3G["account-balance-block"]
3H["account-balance-block.component.ts"]
end
subgraph 3I["account-balance-chart"]
3J["account-balance-chart.component.ts"]
end
subgraph 3K["account-card"]
3L["account-card.component.ts"]
end
subgraph 3M["account-form"]
3N["account-form.component.ts"]
end
subgraph 3O["accounts-detail"]
3P["accounts-detail.component.ts"]
end
subgraph 3Q["accounts-overview"]
3R["accounts-overview.component.ts"]
end
3S["index.ts"]
subgraph 3T["net-worth-history-chart"]
3U["net-worth-history-chart.component.ts"]
end
end
3V["index.ts"]
end
subgraph 3W["feature-categories"]
3X["categories.routes.ts"]
3Y["category-icons.ts"]
3Z["category-model.service.ts"]
40["category-model.store.ts"]
subgraph 41["components"]
subgraph 42["categories-overview"]
43["categories-overview.component.ts"]
end
subgraph 44["category-form"]
45["category-form.component.ts"]
end
46["index.ts"]
subgraph 47["rule-condition-row"]
48["rule-condition-row.component.ts"]
end
subgraph 49["rule-filters"]
4A["rule-filters.component.ts"]
end
subgraph 4B["rule-form"]
4C["rule-form.component.ts"]
end
subgraph 4D["rule-share-bar"]
4E["rule-share-bar.component.ts"]
end
subgraph 4F["rules-overview"]
4G["rules-overview.component.ts"]
end
end
4H["index.ts"]
4I["rule-condition-editor.ts"]
4J["rule-filters.ts"]
4K["rule-labels.ts"]
4L["rule-share.ts"]
4M["rule-summary.ts"]
4N["rules.store.ts"]
end
subgraph 4O["feature-changelog"]
4P["changelog.routes.ts"]
subgraph 4Q["components"]
subgraph 4R["changelog-page"]
4S["changelog-page.component.ts"]
end
4T["index.ts"]
end
subgraph 4U["data"]
4V["changelog-entries.ts"]
4W["roadmap-entries.ts"]
end
4X["group-changelog-entries.ts"]
4Y["group-roadmap-entries.ts"]
4Z["index.ts"]
end
subgraph 50["feature-dashboard"]
51["category-comparison-settings.store.ts"]
52["category-comparison-vm.ts"]
subgraph 53["components"]
subgraph 54["account-balance-strip"]
55["account-balance-strip.component.ts"]
end
subgraph 56["action-queue-panel"]
57["action-queue-panel.component.ts"]
end
subgraph 58["category-breakdown-panel"]
59["category-breakdown-panel.component.ts"]
end
subgraph 5A["category-comparison-panel"]
5B["category-comparison-panel.component.ts"]
end
subgraph 5C["comparison-category-card"]
5D["comparison-category-card.component.ts"]
end
subgraph 5E["dashboard-customize-panel"]
5F["dashboard-customize-panel.component.ts"]
end
subgraph 5G["dashboard-overview"]
5H["dashboard-overview.component.ts"]
end
5I["index.ts"]
subgraph 5J["net-worth-header"]
5K["net-worth-header.component.ts"]
end
subgraph 5L["top-transactions-panel"]
5M["top-transactions-panel.component.ts"]
end
subgraph 5N["trend-chart-panel"]
5O["trend-chart-panel.component.ts"]
end
subgraph 5P["weekday-weekend-split-panel"]
5Q["weekday-weekend-split-panel.component.ts"]
end
end
5R["dashboard-layout-settings.store.ts"]
5S["dashboard-row-order.ts"]
5T["dashboard.routes.ts"]
5U["index.ts"]
5V["stats.store.ts"]
end
subgraph 5W["feature-data-management"]
subgraph 5X["components"]
subgraph 5Y["data-management-overview"]
5Z["data-management-overview.component.ts"]
end
60["index.ts"]
end
61["index.ts"]
end
subgraph 62["feature-help"]
subgraph 63["components"]
subgraph 64["faq-page"]
65["faq-page.component.ts"]
end
subgraph 66["guide-detail"]
67["guide-detail.component.ts"]
end
subgraph 68["guides-index"]
69["guides-index.component.ts"]
end
6A["index.ts"]
end
subgraph 6B["data"]
6C["faq.ts"]
6D["guides.ts"]
end
6E["help.routes.ts"]
6F["index.ts"]
end
subgraph 6G["feature-home"]
subgraph 6H["components"]
subgraph 6I["home-landing"]
6J["home-landing.component.ts"]
end
6K["index.ts"]
end
6L["home.routes.ts"]
6M["index.ts"]
end
subgraph 6N["feature-import"]
6O["column-mapping.ts"]
subgraph 6P["components"]
subgraph 6Q["account-draft-editor"]
6R["account-draft-editor.component.ts"]
end
subgraph 6S["batch-wait-card"]
6T["batch-wait-card.component.ts"]
end
subgraph 6U["column-map-amount-field"]
6V["column-map-amount-field.component.ts"]
end
subgraph 6W["column-map-counterparty-field"]
6X["column-map-counterparty-field.component.ts"]
end
subgraph 6Y["column-map-sample-caption"]
6Z["column-map-sample-caption.component.ts"]
end
subgraph 70["column-map-simple-field"]
71["column-map-simple-field.component.ts"]
end
subgraph 72["column-map-stepper"]
73["column-map-stepper.component.ts"]
end
subgraph 74["column-map-summary-step"]
75["column-map-summary-step.component.ts"]
end
subgraph 76["import-map-step"]
77["import-map-step.component.ts"]
end
subgraph 78["import-preview-step"]
79["import-preview-step.component.ts"]
end
subgraph 7A["import-select-step"]
7B["import-select-step.component.ts"]
end
subgraph 7C["import-summary-step"]
7D["import-summary-step.component.ts"]
end
subgraph 7E["import-wizard"]
7F["import-wizard.component.ts"]
end
7G["index.ts"]
subgraph 7H["queued-file-row"]
7I["queued-file-row.component.ts"]
end
end
7J["import-batches.store.ts"]
7K["import-queue.ts"]
7L["import-wizard-session.ts"]
7M["import.routes.ts"]
7N["index.ts"]
7O["mapper-steps.ts"]
7P["mapping-profiles.store.ts"]
end
subgraph 7Q["feature-income"]
7R["career-start-date.ts"]
subgraph 7S["components"]
subgraph 7T["income-career-start"]
7U["income-career-start.component.ts"]
end
subgraph 7V["income-category-checklist"]
7W["income-category-checklist.component.ts"]
end
subgraph 7X["income-gap-warnings"]
7Y["income-gap-warnings.component.ts"]
end
subgraph 7Z["income-growth-panel"]
80["income-growth-panel.component.ts"]
end
subgraph 81["income-overview"]
82["income-overview.component.ts"]
end
subgraph 83["income-settings"]
84["income-settings.component.ts"]
end
subgraph 85["income-step-changes"]
86["income-step-changes.component.ts"]
end
subgraph 87["income-yearly-panel"]
88["income-yearly-panel.component.ts"]
end
89["index.ts"]
subgraph 8A["salary-metadata-table"]
8B["salary-metadata-table.component.ts"]
end
end
8C["income-category-vm.ts"]
8D["income-granularity.ts"]
8E["income.routes.ts"]
8F["income.store.ts"]
8G["index.ts"]
8H["salary-metadata-edit.ts"]
8I["salary-metadata-rows.ts"]
end
subgraph 8J["feature-learning"]
subgraph 8K["components"]
8L["index.ts"]
subgraph 8M["learning-overview"]
8N["learning-overview.component.ts"]
end
subgraph 8O["model-status"]
8P["model-status.component.ts"]
end
subgraph 8Q["rule-proposals"]
8R["rule-proposals.component.ts"]
end
subgraph 8S["suggestions-table"]
8T["suggestions-table.component.ts"]
end
end
8U["index.ts"]
8V["learning.routes.ts"]
end
subgraph 8W["feature-settings"]
subgraph 8X["components"]
8Y["index.ts"]
subgraph 8Z["settings-about-section"]
90["settings-about-section.component.ts"]
end
subgraph 91["settings-currency-locale-section"]
92["settings-currency-locale-section.component.ts"]
end
subgraph 93["settings-data-section"]
94["settings-data-section.component.ts"]
end
subgraph 95["settings-overview"]
96["settings-overview.component.ts"]
end
subgraph 97["settings-theme-section"]
98["settings-theme-section.component.ts"]
end
end
99["index.ts"]
9A["settings.routes.ts"]
end
subgraph 9B["feature-transactions"]
subgraph 9C["components"]
subgraph 9D["attribution-override-fieldset"]
9E["attribution-override-fieldset.component.ts"]
end
subgraph 9F["category-select-cell"]
9G["category-select-cell.component.ts"]
end
9H["index.ts"]
subgraph 9I["transaction-bulk-bar"]
9J["transaction-bulk-bar.component.ts"]
end
subgraph 9K["transaction-edit-form"]
9L["transaction-edit-form.component.ts"]
end
subgraph 9M["transaction-filters"]
9N["transaction-filters.component.ts"]
end
subgraph 9O["transaction-row"]
9P["transaction-row.component.ts"]
end
subgraph 9Q["transactions-overview"]
9R["transactions-overview.component.ts"]
end
subgraph 9S["transfer-review"]
9T["transfer-review.component.ts"]
end
end
9U["index.ts"]
9V["transaction-filters.ts"]
9W["transaction-row-vm.ts"]
9X["transactions.routes.ts"]
end
subgraph 9Y["shared"]
subgraph 9Z["echarts"]
A0["bucketed-axis-option.ts"]
A1["chart-theme.ts"]
A2["echarts-setup.ts"]
A3["index.ts"]
A4["tooltip-formatter.ts"]
end
subgraph A5["ui"]
subgraph A6["alert"]
A7["alert.component.ts"]
end
subgraph A8["badge"]
A9["badge.component.ts"]
end
subgraph AA["button"]
AB["button.component.ts"]
end
subgraph AC["collapse"]
AD["collapse.component.ts"]
end
subgraph AE["confirm-dialog"]
AF["confirm-dialog.component.ts"]
end
subgraph AG["date-range-input"]
AH["date-range-input.component.ts"]
end
subgraph AI["divider"]
AJ["divider.component.ts"]
end
subgraph AK["dropdown"]
AL["dropdown.component.ts"]
end
subgraph AM["empty-state"]
AN["empty-state.component.ts"]
end
subgraph AO["fieldset"]
AP["fieldset.component.ts"]
end
subgraph AQ["flex"]
AR["flex.component.ts"]
end
subgraph AS["granularity-picker"]
AT["granularity-picker.component.ts"]
end
AU["index.ts"]
subgraph AV["input"]
AW["input.component.ts"]
end
subgraph AX["label"]
AY["label.component.ts"]
end
subgraph AZ["loading-skeleton"]
B0["loading-skeleton.component.ts"]
end
subgraph B1["modal"]
B2["mm-modal.component.ts"]
end
subgraph B3["page-header"]
B4["page-header.component.ts"]
end
subgraph B5["paginator"]
B6["paginator.component.ts"]
end
subgraph B7["paper"]
B8["paper.component.ts"]
end
subgraph B9["range-grouping-switcher"]
BA["range-grouping-switcher.component.ts"]
end
subgraph BB["select"]
BC["select.component.ts"]
end
subgraph BD["stat-card"]
BE["stat-card.component.ts"]
end
subgraph BF["table"]
BG["table.component.ts"]
end
subgraph BH["tabs"]
BI["tabs.component.ts"]
end
subgraph BJ["typography"]
BK["typography.component.ts"]
end
end
subgraph BL["utils"]
BM["confidence-color.ts"]
BN["confirm-state.ts"]
BO["currency-format.ts"]
BP["currency-symbol-presets.ts"]
BQ["daisy-classes.ts"]
BR["date-buckets.ts"]
BS["date-format.pipe.ts"]
BT["date-format.ts"]
BU["debounced-text.ts"]
BV["download-json.ts"]
BW["fingerprint.ts"]
BX["format-settings.testing.ts"]
BY["format-settings.ts"]
BZ["iban.ts"]
C0["index.ts"]
C1["link-control-to-setting.ts"]
C2["locale-presets.ts"]
C3["number-format.ts"]
C4["pagination.ts"]
C5["percentage.ts"]
C6["search-params.ts"]
C7["selection-model.ts"]
C8["signed-amount.pipe.ts"]
C9["sortable.ts"]
CA["structural-filters.ts"]
CB["theme-hooks.ts"]
subgraph CC["validators"]
CD["iban.validator.ts"]
CE["percentage.validator.ts"]
end
CF["with-archivable.ts"]
CG["with-persisted-crud.ts"]
end
end
end
end
4-->N
4-->34
5-->4
5-->6
6-->N
6-->C0
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
F-->2U
F-->BW
F-->BY
G-->F
G-->2V
G-->C0
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
V-->C0
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
12-->34
12-->C0
13-->V
13-->W
13-->X
13-->Z
13-->10
13-->11
13-->12
16-->1S
16-->2D
16-->AB
16-->BA
16-->BK
16-->C0
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
1P-->2D
1P-->34
1P-->C0
1Q-->N
1Q-->2V
1Q-->C0
1R-->1U
1R-->N
1R-->C0
1S-->1P
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1S-->1W
1T-->C0
1U-->N
1U-->30
1U-->34
1V-->N
1W-->1U
1W-->1V
1W-->N
1W-->34
1Y-->26
1Y-->2I
1Y-->N
1Y-->C0
1Z-->21
1Z-->29
1Z-->C0
20-->25
20-->N
21-->20
21-->N
21-->C0
22-->N
23-->20
23-->2K
23-->N
24-->C0
25-->22
25-->26
25-->N
25-->34
26-->5
26-->N
27-->N
28-->C0
29-->21
29-->N
29-->C0
2A-->21
2A-->29
2A-->C0
2B-->29
2B-->2O
2B-->C0
2C-->21
2C-->29
2C-->C0
2D-->1Y
2D-->1Z
2D-->20
2D-->21
2D-->22
2D-->23
2D-->24
2D-->25
2D-->26
2D-->27
2D-->28
2D-->29
2D-->2A
2D-->2B
2D-->2C
2D-->2E
2D-->2F
2D-->2G
2D-->2H
2D-->2I
2D-->2J
2D-->2K
2D-->2L
2D-->2M
2D-->2N
2D-->2O
2D-->2P
2E-->26
2E-->N
2F-->26
2F-->5
2F-->N
2G-->2P
2I-->26
2I-->N
2I-->C0
2J-->25
2J-->N
2K-->C0
2L-->C0
2M-->N
2M-->34
2N-->25
2N-->N
2N-->C0
2O-->2J
2O-->N
2P-->21
2P-->N
2P-->C0
2R-->2S
2U-->2W
2V-->2U
2V-->2W
2V-->2X
2X-->2W
2Z-->N
30-->2Z
30-->31
30-->32
31-->N
32-->N
32-->34
34-->35
34-->36
34-->38
34-->37
35-->N
36-->38
36-->N
37-->36
37-->38
37-->N
38-->6
38-->N
38-->C0
3A-->N
3B-->N
3C-->N
3D-->3P
3D-->3R
3D-->A3
3E-->N
3E-->1S
3E-->2D
3E-->C0
3H-->AU
3H-->C0
3J-->3E
3J-->N
3J-->2D
3J-->A3
3J-->AU
3J-->C0
3L-->3A
3L-->3B
3L-->3H
3L-->AU
3N-->3B
3N-->3C
3N-->N
3N-->AU
3N-->C0
3N-->CD
3N-->CE
3P-->3H
3P-->3J
3P-->3N
3P-->1S
3P-->AU
3P-->C0
3R-->3A
3R-->3B
3R-->3L
3R-->3N
3R-->3U
3R-->N
3R-->1S
3R-->AU
3R-->C0
3S-->3H
3S-->3J
3S-->3L
3S-->3N
3S-->3P
3S-->3R
3S-->3U
3U-->3E
3U-->N
3U-->1S
3U-->2D
3U-->A3
3U-->AU
3V-->3B
3V-->3C
3V-->3D
3V-->3S
3X-->43
3X-->4G
3Z-->1F
40-->3Z
40-->4N
40-->N
40-->1F
40-->1S
43-->3Y
43-->45
43-->N
43-->1S
43-->AU
43-->C0
45-->3Y
45-->N
45-->AU
46-->43
46-->45
46-->4A
46-->4C
46-->4E
46-->4G
48-->4I
48-->4K
48-->A
48-->N
48-->1S
48-->AU
4A-->4J
4A-->1S
4A-->AU
4A-->C0
4C-->4I
4C-->48
4C-->N
4C-->1S
4C-->AU
4E-->4L
4E-->4N
4E-->AU
4E-->C0
4G-->4J
4G-->4M
4G-->4N
4G-->4A
4G-->4C
4G-->4E
4G-->N
4G-->1S
4G-->AU
4G-->C0
4H-->3X
4H-->3Y
4H-->3Z
4H-->40
4H-->46
4H-->4J
4H-->4M
4H-->4N
4I-->4K
4I-->N
4J-->4M
4J-->N
4K-->N
4L-->N
4M-->4K
4M-->N
4N-->4L
4N-->A
4N-->N
4N-->1S
4N-->C0
4P-->4S
4S-->4V
4S-->4W
4S-->4X
4S-->4Y
4S-->AU
4T-->4S
4X-->4V
4Y-->4W
4Z-->4P
4Z-->4T
51-->N
55-->1S
55-->AU
55-->C0
57-->1S
57-->34
57-->AU
57-->C0
59-->5V
59-->1S
59-->2D
59-->A3
59-->AU
59-->C0
5B-->51
5B-->52
5B-->5V
5B-->5D
5B-->1S
5B-->AU
5B-->C0
5D-->52
5D-->AU
5F-->5R
5F-->5S
5F-->N
5F-->AU
5H-->5R
5H-->5S
5H-->5V
5H-->55
5H-->57
5H-->59
5H-->5B
5H-->5F
5H-->5K
5H-->5M
5H-->5O
5H-->5Q
5H-->1S
5H-->2D
5H-->AU
5H-->C0
5I-->55
5I-->57
5I-->59
5I-->5B
5I-->5F
5I-->5H
5I-->5K
5I-->5M
5I-->5O
5I-->5Q
5K-->1S
5K-->AU
5K-->C0
5M-->5V
5M-->1S
5M-->AU
5M-->C0
5O-->1S
5O-->2D
5O-->34
5O-->A3
5O-->AU
5O-->C0
5Q-->5V
5Q-->1S
5Q-->AU
5Q-->C0
5R-->5S
5R-->N
5S-->N
5T-->5H
5T-->A3
5U-->5I
5U-->5T
5V-->51
5V-->1S
5V-->2D
5V-->34
5Z-->N
5Z-->2R
5Z-->AU
5Z-->C0
60-->5Z
61-->60
65-->6C
65-->AU
67-->6D
67-->AU
69-->6D
69-->AU
6A-->65
6A-->67
6A-->69
6E-->65
6E-->67
6E-->69
6F-->6A
6F-->6E
6J-->1A
6J-->AU
6K-->6J
6L-->6J
6M-->6K
6M-->6L
6O-->N
6R-->7K
6R-->3V
6R-->AU
6T-->AU
6V-->6Z
6V-->AU
6X-->6Z
6X-->AU
6Z-->AU
71-->6O
71-->6Z
71-->AU
73-->7O
73-->AU
75-->6O
75-->AU
77-->6O
77-->7O
77-->7P
77-->6V
77-->6X
77-->71
77-->73
77-->75
77-->79
77-->N
77-->13
77-->AU
79-->13
79-->AU
79-->C0
7B-->7K
7B-->7P
7B-->7I
7B-->N
7B-->13
7B-->AU
7D-->N
7D-->AU
7F-->7L
7F-->6T
7F-->77
7F-->7B
7F-->7D
7F-->1S
7F-->AU
7G-->77
7G-->79
7G-->7B
7G-->7D
7G-->7F
7I-->7K
7I-->6R
7I-->N
7I-->AU
7J-->A
7J-->N
7J-->13
7J-->1S
7K-->N
7L-->6O
7L-->7J
7L-->7K
7L-->7P
7L-->N
7L-->13
7L-->1S
7L-->3V
7M-->7F
7N-->6O
7N-->7G
7N-->7J
7N-->7K
7N-->7M
7N-->7O
7N-->7P
7O-->6O
7P-->N
7R-->2D
7U-->7R
7U-->8F
7U-->AU
7U-->C0
7W-->8C
7W-->AU
7Y-->8D
7Y-->8F
7Y-->N
7Y-->1S
7Y-->2D
7Y-->AU
7Y-->C0
80-->8D
80-->8F
80-->2D
80-->AU
80-->C0
82-->8F
82-->7Y
82-->80
82-->84
82-->86
82-->88
82-->8B
82-->2D
82-->A3
82-->AU
82-->C0
84-->8C
84-->8F
84-->7U
84-->7W
84-->AU
86-->8D
86-->8F
86-->N
86-->1S
86-->2D
86-->AU
86-->C0
88-->8F
88-->1S
88-->2D
88-->34
88-->A3
88-->AU
88-->C0
89-->7U
89-->7W
89-->7Y
89-->80
89-->82
89-->84
89-->86
89-->88
89-->8B
8B-->8D
8B-->8F
8B-->8H
8B-->8I
8B-->AU
8B-->C0
8C-->N
8D-->C0
8E-->82
8E-->A3
8F-->7R
8F-->8D
8F-->N
8F-->1S
8F-->2D
8F-->34
8G-->89
8G-->8C
8G-->8D
8G-->8E
8G-->8F
8G-->8H
8G-->8I
8H-->N
8I-->N
8L-->8N
8L-->8P
8L-->8R
8L-->8T
8N-->8P
8N-->8R
8N-->8T
8N-->AU
8P-->1F
8P-->1S
8P-->4H
8P-->AU
8R-->N
8R-->1F
8R-->1S
8R-->4H
8R-->AU
8R-->C0
8T-->N
8T-->1S
8T-->4H
8T-->AU
8T-->C0
8U-->8L
8U-->8V
8V-->8N
8Y-->96
90-->1A
90-->AU
92-->1S
92-->AU
92-->C0
94-->61
94-->AU
96-->90
96-->92
96-->94
96-->98
96-->AU
98-->1S
98-->2V
98-->AU
99-->8Y
99-->9A
9A-->96
9E-->N
9E-->1S
9E-->30
9E-->AU
9E-->C0
9H-->9J
9H-->9L
9H-->9N
9H-->9R
9H-->9T
9J-->1S
9J-->AU
9L-->9E
9L-->N
9L-->1S
9L-->30
9L-->4H
9L-->AU
9N-->9V
9N-->1S
9N-->AU
9N-->C0
9P-->9W
9P-->9G
9P-->AU
9P-->C0
9R-->9V
9R-->9W
9R-->9G
9R-->9J
9R-->9L
9R-->9N
9R-->9P
9R-->9T
9R-->N
9R-->1S
9R-->34
9R-->4H
9R-->AU
9R-->C0
9T-->1S
9T-->34
9T-->AU
9T-->C0
9U-->9X
9V-->N
9V-->34
9W-->N
9X-->9R
A3-->A0
A3-->A1
A3-->A2
A3-->A4
A4-->C0
A7-->C0
A9-->C0
AB-->C0
AD-->C0
AF-->AB
AF-->AY
AF-->B2
AF-->BK
AH-->AL
AH-->C0
AJ-->C0
AL-->C0
AN-->AR
AN-->BK
AP-->C0
AR-->C0
AU-->A7
AU-->A9
AU-->AB
AU-->AD
AU-->AF
AU-->AH
AU-->AJ
AU-->AL
AU-->AN
AU-->AP
AU-->AR
AU-->AT
AU-->AW
AU-->AY
AU-->B0
AU-->B2
AU-->B4
AU-->B6
AU-->B8
AU-->BA
AU-->BC
AU-->BE
AU-->BG
AU-->BI
AU-->BK
AW-->C0
AY-->C0
B0-->AR
B2-->C0
B4-->AR
B4-->BK
B6-->AB
B6-->AR
B6-->BK
B6-->C0
B8-->C0
BA-->AB
BA-->AH
BA-->AR
BC-->C0
BE-->BK
BE-->C0
BG-->C0
BI-->C0
BK-->C0
BO-->BY
BR-->BY
BS-->BT
BT-->BY
BX-->BY
C0-->BM
C0-->BN
C0-->BO
C0-->BP
C0-->BQ
C0-->BR
C0-->BT
C0-->BS
C0-->BU
C0-->BV
C0-->BW
C0-->BY
C0-->BZ
C0-->C1
C0-->C2
C0-->C3
C0-->C4
C0-->C5
C0-->C6
C0-->C7
C0-->C8
C0-->C9
C0-->CA
C0-->CB
C0-->CF
C0-->CG
C3-->BY
C8-->BO
```
