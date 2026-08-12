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
- 367 leaf nodes, 1078 edges.
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
8["category-applicability.ts"]
9["co-owner-contribution.service.ts"]
A["co-owner-contribution.ts"]
B["index.ts"]
C["rule-matching.ts"]
D["rules-engine.service.ts"]
end
subgraph E["data-access"]
F["accounts.repository.ts"]
G["app-db.ts"]
H["app-settings.repository.ts"]
I["categories.repository.ts"]
J["category-comparison-settings.repository.ts"]
K["category-model.repository.ts"]
L["dashboard-layout-settings.repository.ts"]
M["data-management.repository.ts"]
N["forecast-settings.repository.ts"]
O["goals.repository.ts"]
P["import-batches.repository.ts"]
Q["index.ts"]
R["mapping-profiles.repository.ts"]
S["rules.repository.ts"]
T["salary-metadata.repository.ts"]
U["transactions.repository.ts"]
V["transfer-settings.repository.ts"]
W["transfers.repository.ts"]
end
subgraph X["import"]
Y["account-detection.ts"]
Z["csv-import.service.ts"]
10["csv-parse.ts"]
11["csv-parse.worker.ts"]
12["csv-row-mapper.ts"]
13["csv-worker.types.ts"]
14["delimiter-guess.ts"]
15["import.service.ts"]
16["index.ts"]
end
subgraph 17["layout"]
subgraph 18["app-shell"]
19["app-shell.component.ts"]
end
1A["index.ts"]
end
subgraph 1B["links"]
1C["external-links.ts"]
1D["index.ts"]
end
subgraph 1E["ml"]
1F["category-model.worker.ts"]
1G["category-model.worker.types.ts"]
1H["feature-hashing.ts"]
1I["index.ts"]
1J["model-config.ts"]
1K["rule-proposal-mining.ts"]
1L["training-window.ts"]
end
subgraph 1M["onboarding"]
1N["home-redirect.guard.ts"]
1O["index.ts"]
1P["mark-visited.guard.ts"]
1Q["visited.service.ts"]
end
subgraph 1R["state"]
1S["accounts.store.ts"]
1T["app-settings.store.ts"]
1U["categories.store.ts"]
1V["chart-options-control.ts"]
1W["chart-options.store.ts"]
1X["forecast-settings.store.ts"]
1Y["goals.store.ts"]
1Z["index.ts"]
20["page-range-control.ts"]
21["range-state.store.ts"]
22["transactions.store.ts"]
23["transfer-settings.store.ts"]
24["transfers.store.ts"]
end
subgraph 25["stats"]
26["account-balance-history.ts"]
27["account-balance-trend.ts"]
28["annual-lump-sum-smoothing.ts"]
29["category-breakdown.ts"]
2A["category-composition-trend.ts"]
2B["category-cycle-heatmap.ts"]
2C["category-expense-transactions.ts"]
2D["category-kind-contribution.ts"]
2E["category-period-comparison.ts"]
2F["chart-zoom-window.ts"]
2G["classify-for-stats.ts"]
2H["classify-joint-leg.ts"]
2I["day-transactions.ts"]
2J["embedded-bonus-smoothing.ts"]
2K["full-history-range.ts"]
2L["granularity-for-span.ts"]
2M["gross-net-growth.ts"]
2N["gross-net-ratio.ts"]
2O["income-category-series.ts"]
2P["income-events.ts"]
2Q["income-gap-detection.ts"]
2R["income-growth.ts"]
2S["income-step-change-detection.ts"]
2T["index.ts"]
2U["joint-account-stake.ts"]
2V["joint-contributor-breakdown.ts"]
2W["money-flow-graph.ts"]
2X["multi-year-income-comparison.ts"]
2Y["net-margin.ts"]
2Z["period-stats.ts"]
30["period-window.ts"]
31["periodized-rate.ts"]
32["recurring-payments.ts"]
33["recurring-projection.ts"]
34["saving-velocity.ts"]
35["spending-mosaic.ts"]
36["top-transactions.ts"]
37["wage-change-detection.ts"]
38["weekday-weekend-split.ts"]
39["year-over-year.ts"]
3A["yearly-income-summary.ts"]
end
subgraph 3B["storage"]
3C["index.ts"]
3D["storage-status.service.ts"]
end
subgraph 3E["theme"]
3F["accent-colors.ts"]
3G["index.ts"]
3H["theme-styles.ts"]
3I["theme.service.ts"]
end
subgraph 3J["transactions"]
3K["attribution-override.ts"]
3L["index.ts"]
3M["nullify-transaction.ts"]
3N["transaction-deletion.service.ts"]
end
subgraph 3O["transfers"]
3P["index.ts"]
3Q["transfer-cleanup.service.ts"]
3R["transfer-linking.service.ts"]
3S["transfer-matching.service.ts"]
3T["transfer-matching.ts"]
end
end
subgraph 3U["feature-accounts"]
3V["account-card-vm.ts"]
3W["account-icons.ts"]
3X["account-list-order.ts"]
3Y["account-types.ts"]
3Z["accounts.routes.ts"]
40["balance-day-tooltip.ts"]
41["balance-trend-signals.ts"]
subgraph 42["components"]
subgraph 43["account-balance-block"]
44["account-balance-block.component.ts"]
end
subgraph 45["account-balance-chart"]
46["account-balance-chart.component.ts"]
end
subgraph 47["account-balance-history-chart"]
48["account-balance-history-chart.component.ts"]
end
subgraph 49["account-card"]
4A["account-card.component.ts"]
end
subgraph 4B["account-form"]
4C["account-form.component.ts"]
end
subgraph 4D["accounts-detail"]
4E["accounts-detail.component.ts"]
end
subgraph 4F["accounts-overview"]
4G["accounts-overview.component.ts"]
end
4H["index.ts"]
end
4I["index.ts"]
end
subgraph 4J["feature-categories"]
4K["categories.routes.ts"]
4L["category-icons.ts"]
4M["category-model.service.ts"]
4N["category-model.store.ts"]
4O["category-row-vm.ts"]
subgraph 4P["components"]
subgraph 4Q["categories-overview"]
4R["categories-overview.component.ts"]
end
subgraph 4S["category-form"]
4T["category-form.component.ts"]
end
4U["index.ts"]
subgraph 4V["rule-condition-row"]
4W["rule-condition-row.component.ts"]
end
subgraph 4X["rule-filters"]
4Y["rule-filters.component.ts"]
end
subgraph 4Z["rule-form"]
50["rule-form.component.ts"]
end
subgraph 51["rule-share-bar"]
52["rule-share-bar.component.ts"]
end
subgraph 53["rules-overview"]
54["rules-overview.component.ts"]
end
end
55["index.ts"]
56["rule-condition-editor.ts"]
57["rule-filters.ts"]
58["rule-labels.ts"]
59["rule-share.ts"]
5A["rule-summary.ts"]
5B["rules.store.ts"]
end
subgraph 5C["feature-changelog"]
5D["changelog.routes.ts"]
subgraph 5E["components"]
subgraph 5F["changelog-entry-row"]
5G["changelog-entry-row.component.ts"]
end
subgraph 5H["changelog-page"]
5I["changelog-page.component.ts"]
end
5J["index.ts"]
end
subgraph 5K["data"]
5L["changelog-entries.ts"]
5M["roadmap-entries.ts"]
end
5N["group-changelog-entries.ts"]
5O["group-roadmap-entries.ts"]
5P["index.ts"]
end
subgraph 5Q["feature-dashboard"]
5R["category-comparison-settings.store.ts"]
5S["category-comparison-vm.ts"]
subgraph 5T["components"]
subgraph 5U["account-balance-strip"]
5V["account-balance-strip.component.ts"]
end
subgraph 5W["action-queue-panel"]
5X["action-queue-panel.component.ts"]
end
subgraph 5Y["category-breakdown-panel"]
5Z["category-breakdown-panel.component.ts"]
end
subgraph 60["category-comparison-panel"]
61["category-comparison-panel.component.ts"]
end
subgraph 62["category-exclusion-dropdown"]
63["category-exclusion-dropdown.component.ts"]
end
subgraph 64["comparison-category-card"]
65["comparison-category-card.component.ts"]
end
subgraph 66["dashboard-customize-panel"]
67["dashboard-customize-panel.component.ts"]
end
subgraph 68["dashboard-overview"]
69["dashboard-overview.component.ts"]
end
6A["index.ts"]
subgraph 6B["spending-heatmap-panel"]
6C["spending-heatmap-panel.component.ts"]
end
subgraph 6D["top-transactions-panel"]
6E["top-transactions-panel.component.ts"]
end
subgraph 6F["trend-chart-panel"]
6G["trend-chart-panel.component.ts"]
end
subgraph 6H["weekday-weekend-split-panel"]
6I["weekday-weekend-split-panel.component.ts"]
end
end
6J["dashboard-layout-settings.store.ts"]
6K["dashboard-row-order.ts"]
6L["dashboard.routes.ts"]
6M["index.ts"]
6N["stats.store.ts"]
end
subgraph 6O["feature-data-management"]
subgraph 6P["components"]
subgraph 6Q["data-management-overview"]
6R["data-management-overview.component.ts"]
end
6S["index.ts"]
end
6T["index.ts"]
end
subgraph 6U["feature-explore"]
subgraph 6V["components"]
subgraph 6W["explore-overview"]
6X["explore-overview.component.ts"]
end
6Y["index.ts"]
subgraph 6Z["money-flow-panel"]
70["money-flow-panel.component.ts"]
end
subgraph 71["spending-mosaic-panel"]
72["spending-mosaic-panel.component.ts"]
end
end
73["explore.routes.ts"]
74["index.ts"]
end
subgraph 75["feature-help"]
subgraph 76["components"]
subgraph 77["faq-page"]
78["faq-page.component.ts"]
end
subgraph 79["guide-detail"]
7A["guide-detail.component.ts"]
end
subgraph 7B["guide-steps"]
7C["guide-steps.component.ts"]
end
subgraph 7D["guides-index"]
7E["guides-index.component.ts"]
end
7F["index.ts"]
end
subgraph 7G["data"]
7H["faq.ts"]
7I["guides.ts"]
end
7J["help.routes.ts"]
7K["index.ts"]
end
subgraph 7L["feature-home"]
subgraph 7M["components"]
subgraph 7N["home-landing"]
7O["home-landing.component.ts"]
end
7P["index.ts"]
end
7Q["home.routes.ts"]
7R["index.ts"]
end
subgraph 7S["feature-import"]
7T["column-mapping.ts"]
subgraph 7U["components"]
subgraph 7V["account-draft-editor"]
7W["account-draft-editor.component.ts"]
end
subgraph 7X["batch-wait-card"]
7Y["batch-wait-card.component.ts"]
end
subgraph 7Z["column-map-amount-field"]
80["column-map-amount-field.component.ts"]
end
subgraph 81["column-map-counterparty-field"]
82["column-map-counterparty-field.component.ts"]
end
subgraph 83["column-map-sample-caption"]
84["column-map-sample-caption.component.ts"]
end
subgraph 85["column-map-simple-field"]
86["column-map-simple-field.component.ts"]
end
subgraph 87["column-map-stepper"]
88["column-map-stepper.component.ts"]
end
subgraph 89["column-map-summary-step"]
8A["column-map-summary-step.component.ts"]
end
subgraph 8B["import-map-step"]
8C["import-map-step.component.ts"]
end
subgraph 8D["import-preview-step"]
8E["import-preview-step.component.ts"]
end
subgraph 8F["import-select-step"]
8G["import-select-step.component.ts"]
end
subgraph 8H["import-summary-step"]
8I["import-summary-step.component.ts"]
end
subgraph 8J["import-wizard"]
8K["import-wizard.component.ts"]
end
8L["index.ts"]
subgraph 8M["queued-file-row"]
8N["queued-file-row.component.ts"]
end
end
8O["import-batches.store.ts"]
8P["import-queue.ts"]
8Q["import-wizard-session.ts"]
8R["import.routes.ts"]
8S["index.ts"]
8T["mapper-steps.ts"]
8U["mapping-profiles.store.ts"]
end
subgraph 8V["feature-income"]
8W["career-start-date.ts"]
subgraph 8X["components"]
subgraph 8Y["income-career-start"]
8Z["income-career-start.component.ts"]
end
subgraph 90["income-category-checklist"]
91["income-category-checklist.component.ts"]
end
subgraph 92["income-chart-cell"]
93["income-chart-cell.component.ts"]
end
subgraph 94["income-events-sidebar"]
95["income-events-sidebar.component.ts"]
end
subgraph 96["income-gross-color"]
97["income-gross-color.component.ts"]
end
subgraph 98["income-gross-net-section"]
99["income-gross-net-section.component.ts"]
end
subgraph 9A["income-growth-panel"]
9B["income-growth-panel.component.ts"]
end
subgraph 9C["income-intro"]
9D["income-intro.component.ts"]
end
subgraph 9E["income-main-category"]
9F["income-main-category.component.ts"]
end
subgraph 9G["income-overview"]
9H["income-overview.component.ts"]
end
subgraph 9I["income-settings-page"]
9J["income-settings-page.component.ts"]
end
subgraph 9K["income-yearly-panel"]
9L["income-yearly-panel.component.ts"]
end
9M["index.ts"]
subgraph 9N["salary-details-page"]
9O["salary-details-page.component.ts"]
end
subgraph 9P["salary-metadata-table"]
9Q["salary-metadata-table.component.ts"]
end
subgraph 9R["salary-month-modal"]
9S["salary-month-modal.component.ts"]
end
end
9T["gross-net-chart-options.ts"]
9U["income-category-vm.ts"]
9V["income-event-vm.ts"]
9W["income-granularity.ts"]
9X["income.routes.ts"]
9Y["income.store.ts"]
9Z["index.ts"]
A0["salary-metadata-edit.ts"]
A1["salary-metadata-rows.ts"]
end
subgraph A2["feature-learning"]
subgraph A3["components"]
A4["index.ts"]
subgraph A5["learning-overview"]
A6["learning-overview.component.ts"]
end
subgraph A7["model-status-badge"]
A8["model-status-badge.component.ts"]
end
subgraph A9["model-status"]
AA["model-status.component.ts"]
end
subgraph AB["rule-proposals"]
AC["rule-proposals.component.ts"]
end
subgraph AD["suggestions-table"]
AE["suggestions-table.component.ts"]
end
end
AF["index.ts"]
AG["learning.routes.ts"]
AH["model-status-display.ts"]
end
subgraph AI["feature-recurring"]
AJ["bills-calendar-vm.ts"]
subgraph AK["components"]
subgraph AL["bills-calendar"]
AM["bills-calendar.component.ts"]
end
subgraph AN["bills-day-list"]
AO["bills-day-list.component.ts"]
end
subgraph AP["bills-month-grid"]
AQ["bills-month-grid.component.ts"]
end
AR["index.ts"]
subgraph AS["recurring-overview"]
AT["recurring-overview.component.ts"]
end
subgraph AU["recurring-payments-panel"]
AV["recurring-payments-panel.component.ts"]
end
end
AW["index.ts"]
AX["recurring-payments-row-vm.ts"]
AY["recurring-series.store.ts"]
AZ["recurring.routes.ts"]
end
subgraph B0["feature-settings"]
subgraph B1["components"]
B2["index.ts"]
subgraph B3["settings-about-section"]
B4["settings-about-section.component.ts"]
end
subgraph B5["settings-currency-locale-section"]
B6["settings-currency-locale-section.component.ts"]
end
subgraph B7["settings-data-section"]
B8["settings-data-section.component.ts"]
end
subgraph B9["settings-overview"]
BA["settings-overview.component.ts"]
end
subgraph BB["settings-privacy-section"]
BC["settings-privacy-section.component.ts"]
end
subgraph BD["settings-theme-section"]
BE["settings-theme-section.component.ts"]
end
end
BF["index.ts"]
BG["settings.routes.ts"]
end
subgraph BH["feature-transactions"]
BI["category-picker.ts"]
subgraph BJ["components"]
subgraph BK["attribution-override-fieldset"]
BL["attribution-override-fieldset.component.ts"]
end
subgraph BM["category-select-cell"]
BN["category-select-cell.component.ts"]
end
BO["index.ts"]
subgraph BP["transaction-bulk-bar"]
BQ["transaction-bulk-bar.component.ts"]
end
subgraph BR["transaction-edit-form"]
BS["transaction-edit-form.component.ts"]
end
subgraph BT["transaction-filters"]
BU["transaction-filters.component.ts"]
end
subgraph BV["transaction-row"]
BW["transaction-row.component.ts"]
end
subgraph BX["transactions-overview"]
BY["transactions-overview.component.ts"]
end
subgraph BZ["transfer-review"]
C0["transfer-review.component.ts"]
end
end
C1["index.ts"]
C2["transaction-filters.ts"]
C3["transaction-row-vm.ts"]
C4["transactions.routes.ts"]
end
subgraph C5["shared"]
subgraph C6["echarts"]
C7["bucketed-axis-option.ts"]
C8["chart-theme.ts"]
C9["echarts-jsdom.testing.ts"]
CA["echarts-setup.ts"]
CB["index.ts"]
CC["legend-option.ts"]
CD["tooltip-formatter.ts"]
end
subgraph CE["ui"]
subgraph CF["alert"]
CG["alert.component.ts"]
end
subgraph CH["badge"]
CI["badge.component.ts"]
end
subgraph CJ["button"]
CK["button.component.ts"]
end
subgraph CL["collapse"]
CM["collapse.component.ts"]
end
subgraph CN["confirm-dialog"]
CO["confirm-dialog.component.ts"]
end
subgraph CP["cycle-picker"]
CQ["cycle-picker.component.ts"]
end
subgraph CR["date-range-input"]
CS["date-range-input.component.ts"]
end
subgraph CT["divider"]
CU["divider.component.ts"]
end
subgraph CV["dropdown"]
CW["dropdown.component.ts"]
end
subgraph CX["empty-state"]
CY["empty-state.component.ts"]
end
subgraph CZ["fieldset"]
D0["fieldset.component.ts"]
end
subgraph D1["flex"]
D2["flex.component.ts"]
end
subgraph D3["granularity-picker"]
D4["granularity-picker.component.ts"]
end
D5["index.ts"]
subgraph D6["input"]
D7["input.component.ts"]
end
subgraph D8["label"]
D9["label.component.ts"]
end
subgraph DA["loading-skeleton"]
DB["loading-skeleton.component.ts"]
end
subgraph DC["modal"]
DD["mm-modal.component.ts"]
end
subgraph DE["page-header"]
DF["page-header.component.ts"]
end
subgraph DG["paginator"]
DH["paginator.component.ts"]
end
subgraph DI["paper"]
DJ["paper.component.ts"]
end
subgraph DK["privacy-blur"]
DL["privacy-blur.component.ts"]
end
subgraph DM["privacy-toggle"]
DN["privacy-toggle.component.ts"]
end
subgraph DO["range-grouping-switcher"]
DP["range-grouping-switcher.component.ts"]
end
subgraph DQ["select"]
DR["select.component.ts"]
end
subgraph DS["stat-card"]
DT["stat-card.component.ts"]
end
subgraph DU["table"]
DV["table.component.ts"]
end
subgraph DW["tabs"]
DX["tabs.component.ts"]
end
subgraph DY["typography"]
DZ["typography.component.ts"]
end
end
subgraph E0["utils"]
E1["calendar-cycles.ts"]
E2["confidence-color.ts"]
E3["confirm-state.ts"]
E4["currency-format.ts"]
E5["currency-symbol-presets.ts"]
E6["daisy-classes.ts"]
E7["date-buckets.ts"]
E8["date-format.pipe.ts"]
E9["date-format.ts"]
EA["debounced-text.ts"]
EB["download-json.ts"]
EC["fingerprint.ts"]
ED["format-settings.testing.ts"]
EE["format-settings.ts"]
EF["hidden-amount.ts"]
EG["iban.ts"]
EH["index.ts"]
EI["link-control-to-setting.ts"]
EJ["locale-presets.ts"]
EK["number-format.ts"]
EL["pagination.ts"]
EM["percentage.ts"]
EN["search-params.ts"]
EO["selection-model.ts"]
EP["signed-amount.pipe.ts"]
EQ["sortable.ts"]
ER["structural-filters.ts"]
ES["theme-hooks.ts"]
subgraph ET["validators"]
EU["iban.validator.ts"]
EV["percentage.validator.ts"]
end
EW["with-archivable.ts"]
EX["with-persisted-crud.ts"]
end
end
end
end
4-->Q
4-->3P
5-->4
5-->6
6-->Q
6-->EH
8-->Q
9-->A
9-->Q
A-->5
A-->Q
B-->8
B-->A
B-->9
B-->C
B-->D
C-->Q
D-->C
D-->Q
F-->G
G-->1J
G-->34
G-->3F
G-->EC
G-->EE
H-->G
H-->3G
H-->EH
I-->G
J-->G
K-->G
L-->G
M-->G
N-->G
N-->2T
O-->G
P-->G
Q-->F
Q-->G
Q-->H
Q-->I
Q-->J
Q-->K
Q-->L
Q-->M
Q-->N
Q-->O
Q-->P
Q-->R
Q-->S
Q-->T
Q-->U
Q-->V
Q-->W
R-->G
S-->G
T-->G
U-->G
V-->G
W-->G
Y-->Q
Y-->EH
Z-->13
Z-->Q
10-->12
10-->13
11-->10
11-->13
12-->Q
13-->12
13-->Q
15-->12
15-->Q
15-->3P
15-->EH
16-->Y
16-->Z
16-->10
16-->12
16-->13
16-->14
16-->15
19-->1Z
19-->CK
19-->DZ
1A-->19
1D-->1C
1F-->1G
1F-->1H
1F-->1J
1G-->1J
1H-->1J
1I-->1G
1I-->1H
1I-->1J
1I-->1K
1I-->1L
1K-->B
1K-->Q
1N-->1Q
1O-->1N
1O-->1P
1O-->1Q
1P-->1Q
1S-->1U
1S-->22
1S-->24
1S-->5
1S-->Q
1S-->2T
1S-->3P
1S-->EH
1T-->Q
1T-->3G
1T-->EH
1U-->22
1U-->Q
1U-->EH
1V-->1W
1V-->2T
1V-->CB
1V-->EH
1W-->2T
1W-->CB
1W-->EH
1X-->Q
1X-->2T
1Y-->Q
1Y-->EH
1Z-->1S
1Z-->1T
1Z-->1U
1Z-->1V
1Z-->1W
1Z-->1X
1Z-->1Y
1Z-->20
1Z-->21
1Z-->22
1Z-->23
1Z-->24
20-->1S
20-->21
20-->22
20-->2T
20-->EH
21-->EH
22-->Q
22-->3L
22-->3P
23-->Q
24-->22
24-->23
24-->Q
24-->3P
26-->Q
26-->EH
27-->26
27-->Q
27-->EH
28-->2A
28-->2O
28-->EH
29-->2G
29-->Q
2A-->29
2A-->Q
2A-->EH
2B-->29
2B-->2G
2B-->Q
2B-->EH
2C-->2G
2C-->Q
2D-->Q
2E-->29
2E-->30
2E-->Q
2F-->EH
2G-->2D
2G-->2H
2G-->Q
2G-->3P
2H-->5
2H-->Q
2I-->Q
2J-->2A
2J-->2O
2J-->Q
2J-->EH
2K-->Q
2L-->EH
2M-->2N
2N-->2O
2N-->Q
2O-->2A
2O-->Q
2O-->EH
2P-->2Q
2P-->2S
2P-->37
2P-->Q
2Q-->2A
2Q-->2O
2Q-->EH
2R-->2O
2R-->39
2R-->EH
2S-->2A
2S-->2J
2S-->2O
2S-->EH
2T-->26
2T-->27
2T-->28
2T-->29
2T-->2A
2T-->2B
2T-->2C
2T-->2D
2T-->2E
2T-->2F
2T-->2G
2T-->2H
2T-->2I
2T-->2J
2T-->2K
2T-->2L
2T-->2M
2T-->2N
2T-->2O
2T-->2P
2T-->2Q
2T-->2R
2T-->2S
2T-->2U
2T-->2V
2T-->2W
2T-->2X
2T-->2Y
2T-->2Z
2T-->30
2T-->31
2T-->32
2T-->33
2T-->34
2T-->35
2T-->36
2T-->37
2T-->38
2T-->39
2T-->3A
2U-->2H
2U-->Q
2V-->2H
2V-->5
2V-->Q
2W-->Q
2W-->EH
2X-->3A
2Z-->2G
2Z-->Q
30-->EH
31-->EH
32-->2G
32-->B
32-->Q
32-->EH
33-->32
33-->EH
34-->2Z
34-->Q
34-->EH
35-->29
35-->2C
35-->Q
36-->Q
36-->3P
37-->2N
38-->2G
38-->Q
38-->EH
39-->2Z
39-->Q
3A-->2A
3A-->Q
3A-->EH
3C-->3D
3F-->3H
3G-->3F
3G-->3H
3G-->3I
3I-->3H
3K-->Q
3L-->3K
3L-->3M
3L-->3N
3M-->Q
3N-->Q
3N-->3P
3P-->3Q
3P-->3R
3P-->3T
3P-->3S
3Q-->Q
3R-->3T
3R-->Q
3S-->3R
3S-->3T
3S-->Q
3T-->6
3T-->Q
3T-->EH
3V-->Q
3W-->Q
3X-->Q
3Y-->Q
3Z-->4E
3Z-->4G
3Z-->CB
40-->2T
40-->EH
41-->Q
41-->1Z
41-->2T
41-->EH
44-->D5
44-->EH
46-->40
46-->41
46-->Q
46-->2T
46-->CB
46-->D5
46-->EH
48-->40
48-->41
48-->Q
48-->1Z
48-->2T
48-->CB
48-->D5
4A-->3V
4A-->3W
4A-->44
4A-->D5
4C-->3W
4C-->3Y
4C-->Q
4C-->D5
4C-->EH
4C-->EU
4C-->EV
4E-->44
4E-->46
4E-->4C
4E-->1Z
4E-->D5
4E-->EH
4G-->3V
4G-->3W
4G-->3X
4G-->48
4G-->4A
4G-->4C
4G-->Q
4G-->1Z
4G-->D5
4G-->EH
4H-->44
4H-->46
4H-->48
4H-->4A
4H-->4C
4H-->4E
4H-->4G
4I-->3W
4I-->3Y
4I-->3Z
4I-->4H
4K-->4R
4K-->54
4M-->1I
4N-->4M
4N-->5B
4N-->Q
4N-->1I
4N-->1Z
4O-->Q
4O-->D5
4R-->4L
4R-->4O
4R-->4T
4R-->B
4R-->Q
4R-->1Z
4R-->D5
4R-->EH
4T-->4L
4T-->Q
4T-->D5
4U-->4R
4U-->4T
4U-->4Y
4U-->50
4U-->52
4U-->54
4W-->56
4W-->58
4W-->B
4W-->Q
4W-->1Z
4W-->D5
4Y-->57
4Y-->1Z
4Y-->D5
4Y-->EH
50-->56
50-->4W
50-->B
50-->Q
50-->1Z
50-->D5
52-->59
52-->5B
52-->D5
52-->EH
54-->57
54-->5A
54-->5B
54-->4Y
54-->50
54-->52
54-->Q
54-->1Z
54-->D5
54-->EH
55-->4K
55-->4L
55-->4M
55-->4N
55-->4U
55-->57
55-->5A
55-->5B
56-->58
56-->Q
57-->5A
57-->Q
58-->Q
59-->Q
5A-->58
5A-->Q
5B-->59
5B-->B
5B-->Q
5B-->1Z
5B-->EH
5D-->5I
5G-->D5
5I-->5L
5I-->5M
5I-->5N
5I-->5O
5I-->5G
5I-->D5
5J-->5I
5N-->5L
5O-->5M
5P-->5D
5P-->5J
5R-->Q
5V-->1Z
5V-->D5
5V-->EH
5X-->1Z
5X-->3P
5X-->D5
5X-->EH
5Z-->6N
5Z-->1Z
5Z-->2T
5Z-->CB
5Z-->D5
5Z-->EH
61-->5R
61-->5S
61-->6N
61-->63
61-->65
61-->1Z
61-->D5
61-->EH
63-->1Z
63-->D5
65-->5S
65-->D5
67-->6J
67-->6K
67-->Q
67-->D5
69-->6J
69-->6K
69-->6N
69-->5V
69-->5X
69-->5Z
69-->61
69-->67
69-->6C
69-->6E
69-->6G
69-->6I
69-->1Z
69-->2T
69-->D5
69-->EH
6A-->5V
6A-->5X
6A-->5Z
6A-->61
6A-->63
6A-->67
6A-->69
6A-->6C
6A-->6E
6A-->6G
6A-->6I
6C-->63
6C-->1Z
6C-->2T
6C-->3P
6C-->CB
6C-->D5
6C-->EH
6E-->6N
6E-->1Z
6E-->D5
6E-->EH
6G-->1Z
6G-->2T
6G-->3P
6G-->CB
6G-->D5
6G-->EH
6I-->6N
6I-->1Z
6I-->D5
6I-->EH
6J-->6K
6J-->Q
6K-->Q
6L-->69
6L-->CB
6M-->6A
6M-->6L
6N-->5R
6N-->1Z
6N-->2T
6N-->3P
6R-->Q
6R-->3C
6R-->D5
6R-->EH
6S-->6R
6T-->6S
6X-->70
6X-->72
6X-->1Z
6X-->D5
6Y-->6X
6Y-->70
6Y-->72
70-->1Z
70-->2T
70-->CB
70-->D5
70-->EH
72-->Q
72-->1Z
72-->2T
72-->3P
72-->CB
72-->D5
72-->EH
73-->6X
73-->CB
74-->6Y
74-->73
78-->7H
78-->D5
7A-->7I
7A-->7C
7A-->D5
7C-->7I
7C-->D5
7E-->7I
7E-->D5
7F-->78
7F-->7A
7F-->7C
7F-->7E
7J-->78
7J-->7A
7J-->7E
7K-->7F
7K-->7I
7K-->7J
7O-->1D
7O-->D5
7P-->7O
7Q-->7O
7R-->7P
7R-->7Q
7T-->Q
7W-->8P
7W-->4I
7W-->D5
7Y-->D5
80-->84
80-->D5
82-->84
82-->D5
84-->D5
86-->7T
86-->84
86-->D5
88-->8T
88-->D5
8A-->7T
8A-->D5
8C-->7T
8C-->8T
8C-->8U
8C-->80
8C-->82
8C-->86
8C-->88
8C-->8A
8C-->8E
8C-->Q
8C-->16
8C-->D5
8E-->16
8E-->D5
8E-->EH
8G-->8P
8G-->8U
8G-->8N
8G-->Q
8G-->16
8G-->D5
8I-->Q
8I-->D5
8K-->8Q
8K-->7Y
8K-->8C
8K-->8G
8K-->8I
8K-->1Z
8K-->D5
8L-->8C
8L-->8E
8L-->8G
8L-->8I
8L-->8K
8N-->8P
8N-->7W
8N-->Q
8N-->D5
8O-->B
8O-->Q
8O-->16
8O-->1Z
8P-->Q
8Q-->7T
8Q-->8O
8Q-->8P
8Q-->8U
8Q-->Q
8Q-->16
8Q-->1Z
8Q-->4I
8R-->8K
8S-->7T
8S-->8L
8S-->8O
8S-->8P
8S-->8R
8S-->8T
8S-->8U
8T-->7T
8U-->Q
8W-->2T
8Z-->8W
8Z-->9Y
8Z-->D5
8Z-->EH
91-->9U
91-->D5
93-->D5
95-->9V
95-->9W
95-->9Y
95-->1Z
95-->2T
95-->D5
97-->9Y
97-->3G
97-->CB
97-->D5
99-->9T
99-->9Y
99-->93
99-->1Z
99-->2T
99-->CB
99-->D5
99-->EH
9B-->9W
9B-->9Y
9B-->1Z
9B-->2T
9B-->D5
9B-->EH
9D-->1Z
9D-->7K
9D-->D5
9F-->9U
9F-->9Y
9F-->D5
9H-->9Y
9H-->A1
9H-->95
9H-->99
9H-->9B
9H-->9D
9H-->9L
9H-->9S
9H-->1Z
9H-->2T
9H-->7K
9H-->CB
9H-->D5
9H-->EH
9J-->9U
9J-->9Y
9J-->8Z
9J-->91
9J-->97
9J-->9F
9J-->D5
9L-->9Y
9L-->1Z
9L-->2T
9L-->3P
9L-->CB
9L-->D5
9L-->EH
9M-->8Z
9M-->91
9M-->93
9M-->95
9M-->99
9M-->9B
9M-->9D
9M-->9F
9M-->9H
9M-->9J
9M-->9L
9M-->9O
9M-->9Q
9M-->9S
9O-->9Q
9O-->D5
9Q-->9W
9Q-->9Y
9Q-->A0
9Q-->A1
9Q-->D5
9Q-->EH
9S-->9Y
9S-->A0
9S-->A1
9S-->9Q
9S-->Q
9S-->D5
9T-->2T
9T-->CB
9T-->EH
9U-->Q
9V-->9W
9V-->Q
9V-->2T
9V-->D5
9V-->EH
9W-->EH
9X-->9H
9X-->9J
9X-->9O
9X-->CB
9Y-->8W
9Y-->9W
9Y-->Q
9Y-->1Z
9Y-->2T
9Y-->3G
9Y-->3P
9Z-->9M
9Z-->9U
9Z-->9W
9Z-->9X
9Z-->9Y
9Z-->A0
9Z-->A1
A0-->Q
A1-->Q
A4-->A6
A4-->AA
A4-->AC
A4-->AE
A6-->A8
A6-->AA
A6-->AC
A6-->AE
A6-->D5
A8-->AH
A8-->55
A8-->D5
AA-->AH
AA-->1I
AA-->1Z
AA-->55
AA-->D5
AC-->Q
AC-->1I
AC-->1Z
AC-->55
AC-->D5
AC-->EH
AE-->Q
AE-->1Z
AE-->55
AE-->D5
AE-->EH
AF-->A4
AF-->AG
AG-->A6
AH-->55
AH-->D5
AJ-->D5
AM-->AJ
AM-->AY
AM-->AO
AM-->AQ
AM-->1Z
AM-->2T
AM-->D5
AM-->EH
AO-->AJ
AO-->D5
AQ-->AJ
AQ-->D5
AR-->AM
AR-->AO
AR-->AQ
AR-->AT
AR-->AV
AT-->AM
AT-->AV
AT-->1Z
AT-->D5
AV-->AX
AV-->AY
AV-->1Z
AV-->2T
AV-->CB
AV-->D5
AV-->EH
AW-->AR
AW-->AZ
AY-->1Z
AY-->2T
AY-->3P
AZ-->AT
B2-->BA
B4-->1D
B4-->D5
B6-->1Z
B6-->D5
B6-->EH
B8-->6T
B8-->D5
BA-->B4
BA-->B6
BA-->B8
BA-->BC
BA-->BE
BA-->D5
BC-->1Z
BC-->D5
BC-->EH
BE-->1Z
BE-->3G
BE-->D5
BF-->B2
BF-->BG
BG-->BA
BI-->Q
BL-->Q
BL-->1Z
BL-->3L
BL-->D5
BL-->EH
BN-->BI
BO-->BQ
BO-->BS
BO-->BU
BO-->BY
BO-->C0
BQ-->BI
BQ-->B
BQ-->1Z
BQ-->D5
BS-->BI
BS-->BL
BS-->B
BS-->Q
BS-->1Z
BS-->3L
BS-->55
BS-->D5
BU-->BI
BU-->C2
BU-->B
BU-->1Z
BU-->D5
BU-->EH
BW-->BI
BW-->C3
BW-->BN
BW-->D5
BW-->EH
BY-->BI
BY-->C2
BY-->C3
BY-->BQ
BY-->BS
BY-->BU
BY-->BW
BY-->C0
BY-->B
BY-->Q
BY-->1Z
BY-->3P
BY-->55
BY-->D5
BY-->EH
C0-->1Z
C0-->3P
C0-->D5
C0-->EH
C1-->C4
C2-->Q
C2-->3P
C3-->Q
C4-->BY
CB-->C7
CB-->C8
CB-->CA
CB-->CC
CB-->CD
CD-->EH
CG-->EH
CI-->EH
CK-->EH
CM-->EH
CO-->CK
CO-->D9
CO-->DD
CO-->DZ
CQ-->EH
CS-->CW
CS-->EH
CU-->EH
CW-->EH
CY-->D2
CY-->DZ
D0-->EH
D2-->EH
D5-->CG
D5-->CI
D5-->CK
D5-->CM
D5-->CO
D5-->CQ
D5-->CS
D5-->CU
D5-->CW
D5-->CY
D5-->D0
D5-->D2
D5-->D4
D5-->D7
D5-->D9
D5-->DB
D5-->DD
D5-->DF
D5-->DH
D5-->DJ
D5-->DL
D5-->DN
D5-->DP
D5-->DR
D5-->DT
D5-->DV
D5-->DX
D5-->DZ
D7-->EH
D9-->EH
DB-->D2
DD-->EH
DF-->D2
DF-->DZ
DH-->CK
DH-->D2
DH-->DZ
DH-->EH
DJ-->EH
DL-->EH
DN-->CK
DN-->1Z
DP-->CK
DP-->CS
DP-->D2
DR-->EH
DT-->DL
DT-->DZ
DT-->EH
DV-->EH
DX-->EH
DZ-->EH
E1-->E9
E4-->EE
E7-->EE
E8-->E9
E9-->EE
ED-->EE
EH-->E1
EH-->E2
EH-->E3
EH-->E4
EH-->E5
EH-->E6
EH-->E7
EH-->E9
EH-->E8
EH-->EA
EH-->EB
EH-->EC
EH-->EE
EH-->EF
EH-->EG
EH-->EI
EH-->EJ
EH-->EK
EH-->EL
EH-->EM
EH-->EN
EH-->EO
EH-->EP
EH-->EQ
EH-->ER
EH-->ES
EH-->EW
EH-->EX
EK-->EE
EP-->E4
```
