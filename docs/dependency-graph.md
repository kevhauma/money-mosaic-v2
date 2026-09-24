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
- 439 leaf nodes, 1348 edges.
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
N["entities.ts"]
O["forecast-settings.repository.ts"]
P["goals.repository.ts"]
Q["import-batches.repository.ts"]
R["index.ts"]
S["loans.repository.ts"]
T["mapping-profiles.repository.ts"]
U["recurring-overrides.repository.ts"]
V["rules.repository.ts"]
W["salary-metadata.repository.ts"]
X["seed-data.ts"]
Y["transactions.repository.ts"]
Z["transfer-settings.repository.ts"]
10["transfers.repository.ts"]
end
subgraph 11["import"]
12["account-detection.ts"]
13["csv-import.service.ts"]
14["csv-parse.ts"]
15["csv-parse.worker.ts"]
16["csv-row-mapper.ts"]
17["csv-worker.types.ts"]
18["delimiter-guess.ts"]
19["import.service.ts"]
1A["index.ts"]
end
subgraph 1B["layout"]
subgraph 1C["app-shell"]
1D["app-shell.component.ts"]
end
1E["app-title.strategy.ts"]
1F["index.ts"]
end
subgraph 1G["links"]
1H["external-links.ts"]
1I["index.ts"]
end
subgraph 1J["loans"]
1K["amortization.ts"]
1L["index.ts"]
1M["loan-progress.ts"]
1N["what-if.ts"]
end
subgraph 1O["ml"]
1P["category-model.worker.ts"]
1Q["category-model.worker.types.ts"]
1R["feature-hashing.ts"]
1S["index.ts"]
1T["model-config.ts"]
1U["rule-proposal-mining.ts"]
1V["training-window.ts"]
end
subgraph 1W["onboarding"]
1X["home-redirect.guard.ts"]
1Y["index.ts"]
1Z["mark-visited.guard.ts"]
20["visited.service.ts"]
end
subgraph 21["qr-sync"]
22["index.ts"]
23["qr-camera-scanner.ts"]
24["qr-code-renderer.ts"]
25["qr-frames.ts"]
26["qr-payload-codec.ts"]
27["qr-sync.service.ts"]
28["qr-transfer-payload.ts"]
end
subgraph 29["state"]
2A["accounts.store.ts"]
2B["app-settings.store.ts"]
2C["categories.store.ts"]
2D["chart-options-control.ts"]
2E["chart-options.store.ts"]
2F["forecast-settings.store.ts"]
2G["goals.store.ts"]
2H["import-batches.store.ts"]
2I["index.ts"]
2J["page-range-control.ts"]
2K["range-state.store.ts"]
2L["transactions.store.ts"]
2M["transfer-settings.store.ts"]
2N["transfers.store.ts"]
end
subgraph 2O["stats"]
2P["account-balance-history.ts"]
2Q["account-balance-trend.ts"]
2R["annual-lump-sum-smoothing.ts"]
2S["category-breakdown.ts"]
2T["category-composition-trend.ts"]
2U["category-cycle-heatmap.ts"]
2V["category-expense-transactions.ts"]
2W["category-kind-contribution.ts"]
2X["category-period-comparison.ts"]
2Y["chart-zoom-window.ts"]
2Z["classify-for-stats.ts"]
30["classify-joint-leg.ts"]
31["day-transactions.ts"]
32["embedded-bonus-smoothing.ts"]
33["full-history-range.ts"]
34["goal-affordability.ts"]
35["granularity-for-span.ts"]
36["gross-net-growth.ts"]
37["gross-net-ratio.ts"]
38["income-category-series.ts"]
39["income-events.ts"]
3A["income-gap-detection.ts"]
3B["income-growth.ts"]
3C["income-step-change-detection.ts"]
3D["index.ts"]
3E["joint-account-stake.ts"]
3F["joint-contributor-breakdown.ts"]
3G["money-flow-graph.ts"]
3H["multi-year-income-comparison.ts"]
3I["net-margin.ts"]
3J["net-worth-projection.ts"]
3K["period-stats.ts"]
3L["period-window.ts"]
3M["periodized-rate.ts"]
3N["recurring-payments.ts"]
3O["recurring-projection.ts"]
3P["required-saving-rate.ts"]
3Q["saving-velocity.ts"]
3R["spending-mosaic.ts"]
3S["top-transactions.ts"]
3T["wage-change-detection.ts"]
3U["weekday-weekend-split.ts"]
3V["year-over-year.ts"]
3W["yearly-income-summary.ts"]
end
subgraph 3X["storage"]
3Y["index.ts"]
3Z["storage-status.service.ts"]
end
subgraph 40["theme"]
41["accent-colors.ts"]
42["index.ts"]
43["theme-styles.ts"]
44["theme.service.ts"]
end
subgraph 45["transactions"]
46["attribution-override.ts"]
47["index.ts"]
48["nullify-transaction.ts"]
49["transaction-deletion.service.ts"]
end
subgraph 4A["transfers"]
4B["index.ts"]
4C["transfer-cleanup.service.ts"]
4D["transfer-linking.service.ts"]
4E["transfer-matching.service.ts"]
4F["transfer-matching.ts"]
end
end
subgraph 4G["feature-accounts"]
4H["account-card-vm.ts"]
4I["account-icons.ts"]
4J["account-list-order.ts"]
4K["account-types.ts"]
4L["accounts.routes.ts"]
4M["balance-day-tooltip.ts"]
4N["balance-trend-signals.ts"]
subgraph 4O["components"]
subgraph 4P["account-balance-block"]
4Q["account-balance-block.component.ts"]
end
subgraph 4R["account-balance-chart"]
4S["account-balance-chart.component.ts"]
end
subgraph 4T["account-balance-history-chart"]
4U["account-balance-history-chart.component.ts"]
end
subgraph 4V["account-card"]
4W["account-card.component.ts"]
end
subgraph 4X["account-form"]
4Y["account-form.component.ts"]
end
subgraph 4Z["accounts-detail"]
50["accounts-detail.component.ts"]
end
subgraph 51["accounts-overview"]
52["accounts-overview.component.ts"]
end
53["index.ts"]
end
54["index.ts"]
55["last-import-status.ts"]
end
subgraph 56["feature-categories"]
57["categories.routes.ts"]
58["category-icons.ts"]
59["category-model.service.ts"]
5A["category-model.store.ts"]
5B["category-row-vm.ts"]
subgraph 5C["components"]
subgraph 5D["categories-overview"]
5E["categories-overview.component.ts"]
end
subgraph 5F["category-form"]
5G["category-form.component.ts"]
end
5H["index.ts"]
subgraph 5I["rule-condition-row"]
5J["rule-condition-row.component.ts"]
end
subgraph 5K["rule-filters"]
5L["rule-filters.component.ts"]
end
subgraph 5M["rule-form"]
5N["rule-form.component.ts"]
end
subgraph 5O["rule-share-bar"]
5P["rule-share-bar.component.ts"]
end
subgraph 5Q["rules-overview"]
5R["rules-overview.component.ts"]
end
end
5S["index.ts"]
5T["rule-condition-editor.ts"]
5U["rule-filters.ts"]
5V["rule-labels.ts"]
5W["rule-share.ts"]
5X["rule-summary.ts"]
5Y["rules.store.ts"]
end
subgraph 5Z["feature-changelog"]
60["changelog.routes.ts"]
subgraph 61["components"]
subgraph 62["changelog-entry-row"]
63["changelog-entry-row.component.ts"]
end
subgraph 64["changelog-page"]
65["changelog-page.component.ts"]
end
66["index.ts"]
end
subgraph 67["data"]
68["changelog-entries.ts"]
69["roadmap-entries.ts"]
end
6A["group-changelog-entries.ts"]
6B["group-roadmap-entries.ts"]
6C["index.ts"]
end
subgraph 6D["feature-dashboard"]
6E["category-comparison-settings.store.ts"]
6F["category-comparison-vm.ts"]
subgraph 6G["components"]
subgraph 6H["account-balance-strip"]
6I["account-balance-strip.component.ts"]
end
subgraph 6J["action-queue-panel"]
6K["action-queue-panel.component.ts"]
end
subgraph 6L["category-breakdown-panel"]
6M["category-breakdown-panel.component.ts"]
end
subgraph 6N["category-comparison-panel"]
6O["category-comparison-panel.component.ts"]
end
subgraph 6P["category-exclusion-dropdown"]
6Q["category-exclusion-dropdown.component.ts"]
end
subgraph 6R["comparison-category-card"]
6S["comparison-category-card.component.ts"]
end
subgraph 6T["dashboard-customize-panel"]
6U["dashboard-customize-panel.component.ts"]
end
subgraph 6V["dashboard-overview"]
6W["dashboard-overview.component.ts"]
end
6X["index.ts"]
subgraph 6Y["spending-heatmap-panel"]
6Z["spending-heatmap-panel.component.ts"]
end
subgraph 70["top-transactions-panel"]
71["top-transactions-panel.component.ts"]
end
subgraph 72["trend-chart-panel"]
73["trend-chart-panel.component.ts"]
end
subgraph 74["weekday-weekend-split-panel"]
75["weekday-weekend-split-panel.component.ts"]
end
end
76["dashboard-layout-settings.store.ts"]
77["dashboard-row-order.ts"]
78["dashboard.routes.ts"]
79["index.ts"]
7A["stats.store.ts"]
end
subgraph 7B["feature-data-management"]
subgraph 7C["components"]
subgraph 7D["data-management-overview"]
7E["data-management-overview.component.ts"]
end
7F["index.ts"]
subgraph 7G["qr-receive-dialog"]
7H["qr-receive-dialog.component.ts"]
end
subgraph 7I["qr-send-dialog"]
7J["qr-send-dialog.component.ts"]
end
end
7K["index.ts"]
end
subgraph 7L["feature-explore"]
subgraph 7M["components"]
subgraph 7N["explore-overview"]
7O["explore-overview.component.ts"]
end
7P["index.ts"]
subgraph 7Q["money-flow-panel"]
7R["money-flow-panel.component.ts"]
end
subgraph 7S["spending-mosaic-panel"]
7T["spending-mosaic-panel.component.ts"]
end
end
7U["explore.routes.ts"]
7V["index.ts"]
end
subgraph 7W["feature-future"]
subgraph 7X["components"]
subgraph 7Y["forecast-controls"]
7Z["forecast-controls.component.ts"]
end
subgraph 80["forecast-notice"]
81["forecast-notice.component.ts"]
end
subgraph 82["future-overview"]
83["future-overview.component.ts"]
end
subgraph 84["goal-form"]
85["goal-form.component.ts"]
end
subgraph 86["goal-row"]
87["goal-row.component.ts"]
end
subgraph 88["goals-panel"]
89["goals-panel.component.ts"]
end
8A["index.ts"]
subgraph 8B["net-worth-projection-chart"]
8C["net-worth-projection-chart.component.ts"]
end
subgraph 8D["projection-figure-table"]
8E["projection-figure-table.component.ts"]
end
end
8F["forecast-chart-copy.ts"]
8G["forecast-controls-vm.ts"]
8H["forecast-notices.ts"]
8I["forecast.store.ts"]
8J["future.routes.ts"]
8K["goal-row-vm.ts"]
8L["index.ts"]
8M["net-worth-projection-chart-option.ts"]
8N["projection-accessible-row.ts"]
end
subgraph 8O["feature-help"]
subgraph 8P["components"]
subgraph 8Q["faq-page"]
8R["faq-page.component.ts"]
end
subgraph 8S["guide-detail"]
8T["guide-detail.component.ts"]
end
subgraph 8U["guide-steps"]
8V["guide-steps.component.ts"]
end
subgraph 8W["guides-index"]
8X["guides-index.component.ts"]
end
8Y["index.ts"]
end
subgraph 8Z["data"]
90["faq.ts"]
91["guides.ts"]
end
92["help.routes.ts"]
93["index.ts"]
end
subgraph 94["feature-home"]
subgraph 95["components"]
subgraph 96["home-landing"]
97["home-landing.component.ts"]
end
98["index.ts"]
end
99["home.routes.ts"]
9A["index.ts"]
end
subgraph 9B["feature-import"]
9C["column-mapping.ts"]
subgraph 9D["components"]
subgraph 9E["account-draft-editor"]
9F["account-draft-editor.component.ts"]
end
subgraph 9G["batch-wait-card"]
9H["batch-wait-card.component.ts"]
end
subgraph 9I["column-map-amount-field"]
9J["column-map-amount-field.component.ts"]
end
subgraph 9K["column-map-counterparty-field"]
9L["column-map-counterparty-field.component.ts"]
end
subgraph 9M["column-map-sample-caption"]
9N["column-map-sample-caption.component.ts"]
end
subgraph 9O["column-map-simple-field"]
9P["column-map-simple-field.component.ts"]
end
subgraph 9Q["column-map-stepper"]
9R["column-map-stepper.component.ts"]
end
subgraph 9S["column-map-summary-step"]
9T["column-map-summary-step.component.ts"]
end
subgraph 9U["import-history"]
9V["import-history.component.ts"]
end
subgraph 9W["import-map-step"]
9X["import-map-step.component.ts"]
end
subgraph 9Y["import-preview-step"]
9Z["import-preview-step.component.ts"]
end
subgraph A0["import-select-step"]
A1["import-select-step.component.ts"]
end
subgraph A2["import-summary-step"]
A3["import-summary-step.component.ts"]
end
subgraph A4["import-wizard"]
A5["import-wizard.component.ts"]
end
A6["index.ts"]
subgraph A7["queued-file-row"]
A8["queued-file-row.component.ts"]
end
end
A9["duplicate-scan.ts"]
AA["import-history-rows.ts"]
AB["import-queue.ts"]
AC["import-wizard-session.ts"]
AD["import.routes.ts"]
AE["index.ts"]
AF["mapper-steps.ts"]
AG["mapping-profiles.store.ts"]
end
subgraph AH["feature-income"]
AI["career-start-date.ts"]
subgraph AJ["components"]
subgraph AK["income-career-start"]
AL["income-career-start.component.ts"]
end
subgraph AM["income-category-checklist"]
AN["income-category-checklist.component.ts"]
end
subgraph AO["income-chart-cell"]
AP["income-chart-cell.component.ts"]
end
subgraph AQ["income-events-sidebar"]
AR["income-events-sidebar.component.ts"]
end
subgraph AS["income-gross-color"]
AT["income-gross-color.component.ts"]
end
subgraph AU["income-gross-net-section"]
AV["income-gross-net-section.component.ts"]
end
subgraph AW["income-growth-panel"]
AX["income-growth-panel.component.ts"]
end
subgraph AY["income-inference-note"]
AZ["income-inference-note.component.ts"]
end
subgraph B0["income-lump-sum-checklist"]
B1["income-lump-sum-checklist.component.ts"]
end
subgraph B2["income-main-category"]
B3["income-main-category.component.ts"]
end
subgraph B4["income-overview"]
B5["income-overview.component.ts"]
end
subgraph B6["income-settings-page"]
B7["income-settings-page.component.ts"]
end
subgraph B8["income-yearly-panel"]
B9["income-yearly-panel.component.ts"]
end
BA["index.ts"]
subgraph BB["salary-details-page"]
BC["salary-details-page.component.ts"]
end
subgraph BD["salary-metadata-table"]
BE["salary-metadata-table.component.ts"]
end
subgraph BF["salary-month-modal"]
BG["salary-month-modal.component.ts"]
end
end
BH["gross-net-chart-options.ts"]
BI["income-category-vm.ts"]
BJ["income-event-vm.ts"]
BK["income-granularity.ts"]
BL["income.routes.ts"]
BM["income.store.ts"]
BN["index.ts"]
BO["salary-metadata-edit.ts"]
BP["salary-metadata-rows.ts"]
end
subgraph BQ["feature-learning"]
subgraph BR["components"]
BS["index.ts"]
subgraph BT["learning-overview"]
BU["learning-overview.component.ts"]
end
subgraph BV["model-status-badge"]
BW["model-status-badge.component.ts"]
end
subgraph BX["model-status"]
BY["model-status.component.ts"]
end
subgraph BZ["rule-proposals"]
C0["rule-proposals.component.ts"]
end
subgraph C1["suggestions-table"]
C2["suggestions-table.component.ts"]
end
end
C3["index.ts"]
C4["learning.routes.ts"]
C5["model-status-display.ts"]
end
subgraph C6["feature-loans"]
subgraph C7["components"]
C8["index.ts"]
subgraph C9["loan-amortization-table"]
CA["loan-amortization-table.component.ts"]
end
subgraph CB["loan-balance-chart"]
CC["loan-balance-chart.component.ts"]
end
subgraph CD["loan-card"]
CE["loan-card.component.ts"]
end
subgraph CF["loan-composition-chart"]
CG["loan-composition-chart.component.ts"]
end
subgraph CH["loan-detail"]
CI["loan-detail.component.ts"]
end
subgraph CJ["loan-form"]
CK["loan-form.component.ts"]
end
subgraph CL["loan-payments-list"]
CM["loan-payments-list.component.ts"]
end
subgraph CN["loan-what-if"]
CO["loan-what-if.component.ts"]
end
subgraph CP["loans-overview"]
CQ["loans-overview.component.ts"]
end
end
CR["index.ts"]
CS["loan-card-vm.ts"]
CT["loan-schedule-status.ts"]
CU["loan-types.ts"]
CV["loan-what-if-vm.ts"]
CW["loans.routes.ts"]
CX["loans.store.ts"]
end
subgraph CY["feature-recurring"]
CZ["bills-calendar-vm.ts"]
subgraph D0["components"]
subgraph D1["bills-calendar"]
D2["bills-calendar.component.ts"]
end
subgraph D3["bills-day-list"]
D4["bills-day-list.component.ts"]
end
subgraph D5["bills-month-grid"]
D6["bills-month-grid.component.ts"]
end
D7["index.ts"]
subgraph D8["recurring-dismissed-list"]
D9["recurring-dismissed-list.component.ts"]
end
subgraph DA["recurring-overview"]
DB["recurring-overview.component.ts"]
end
subgraph DC["recurring-payments-panel"]
DD["recurring-payments-panel.component.ts"]
end
end
DE["index.ts"]
DF["recurring-overrides.ts"]
DG["recurring-payments-row-vm.ts"]
DH["recurring-series.store.ts"]
DI["recurring.routes.ts"]
end
subgraph DJ["feature-settings"]
subgraph DK["components"]
DL["index.ts"]
subgraph DM["settings-about-section"]
DN["settings-about-section.component.ts"]
end
subgraph DO["settings-currency-locale-section"]
DP["settings-currency-locale-section.component.ts"]
end
subgraph DQ["settings-data-section"]
DR["settings-data-section.component.ts"]
end
subgraph DS["settings-overview"]
DT["settings-overview.component.ts"]
end
subgraph DU["settings-privacy-section"]
DV["settings-privacy-section.component.ts"]
end
subgraph DW["settings-reporting-section"]
DX["settings-reporting-section.component.ts"]
end
subgraph DY["settings-theme-section"]
DZ["settings-theme-section.component.ts"]
end
end
E0["index.ts"]
E1["settings.routes.ts"]
end
subgraph E2["feature-transactions"]
E3["category-picker.ts"]
subgraph E4["components"]
subgraph E5["attribution-override-fieldset"]
E6["attribution-override-fieldset.component.ts"]
end
subgraph E7["category-select-cell"]
E8["category-select-cell.component.ts"]
end
E9["index.ts"]
subgraph EA["transaction-bulk-bar"]
EB["transaction-bulk-bar.component.ts"]
end
subgraph EC["transaction-card"]
ED["transaction-card.component.ts"]
end
subgraph EE["transaction-edit-form"]
EF["transaction-edit-form.component.ts"]
end
subgraph EG["transaction-filters"]
EH["transaction-filters.component.ts"]
end
subgraph EI["transaction-row"]
EJ["transaction-row.component.ts"]
end
subgraph EK["transactions-overview"]
EL["transactions-overview.component.ts"]
end
subgraph EM["transfer-review"]
EN["transfer-review.component.ts"]
end
end
EO["index.ts"]
EP["transaction-filters.ts"]
EQ["transaction-row-vm.ts"]
ER["transactions.routes.ts"]
ES["transfer-label.ts"]
end
subgraph ET["shared"]
subgraph EU["echarts"]
EV["bucketed-axis-option.ts"]
EW["chart-theme.ts"]
EX["echarts-jsdom.testing.ts"]
EY["echarts-setup.ts"]
EZ["index.ts"]
F0["legend-option.ts"]
F1["tooltip-formatter.ts"]
end
subgraph F2["ui"]
subgraph F3["absolute-range-panel"]
F4["absolute-range-panel.component.ts"]
end
subgraph F5["alert"]
F6["alert.component.ts"]
end
subgraph F7["badge"]
F8["badge.component.ts"]
end
subgraph F9["button"]
FA["button.component.ts"]
end
subgraph FB["collapse"]
FC["collapse.component.ts"]
end
subgraph FD["confirm-dialog"]
FE["confirm-dialog.component.ts"]
end
subgraph FF["cycle-picker"]
FG["cycle-picker.component.ts"]
end
subgraph FH["date-range-input"]
FI["date-range-input.component.ts"]
end
subgraph FJ["divider"]
FK["divider.component.ts"]
end
subgraph FL["dropdown"]
FM["dropdown.component.ts"]
end
subgraph FN["empty-state"]
FO["empty-state.component.ts"]
end
subgraph FP["fieldset"]
FQ["fieldset.component.ts"]
end
subgraph FR["flex"]
FS["flex.component.ts"]
end
subgraph FT["granularity-picker"]
FU["granularity-picker.component.ts"]
end
FV["index.ts"]
subgraph FW["input"]
FX["input.component.ts"]
end
subgraph FY["label"]
FZ["label.component.ts"]
end
subgraph G0["loading-skeleton"]
G1["loading-skeleton.component.ts"]
end
subgraph G2["modal"]
G3["mm-modal.component.ts"]
end
subgraph G4["page-header"]
G5["page-header.component.ts"]
end
subgraph G6["paginator"]
G7["paginator.component.ts"]
end
subgraph G8["paper"]
G9["paper.component.ts"]
end
subgraph GA["privacy-blur"]
GB["privacy-blur.component.ts"]
end
subgraph GC["privacy-toggle"]
GD["privacy-toggle.component.ts"]
end
subgraph GE["range-picker"]
GF["range-picker.component.ts"]
end
subgraph GG["select"]
GH["select.component.ts"]
end
subgraph GI["stat-card"]
GJ["stat-card.component.ts"]
end
subgraph GK["table"]
GL["table.component.ts"]
end
subgraph GM["tabs"]
GN["tabs.component.ts"]
end
subgraph GO["typography"]
GP["typography.component.ts"]
end
end
subgraph GQ["utils"]
GR["calendar-cycles.ts"]
GS["compact-viewport.ts"]
GT["confidence-color.ts"]
GU["confirm-state.ts"]
GV["currency-format.ts"]
GW["currency-symbol-presets.ts"]
GX["daisy-classes.ts"]
GY["date-buckets.ts"]
GZ["date-format.pipe.ts"]
H0["date-format.ts"]
H1["debounced-text.ts"]
H2["download-json.ts"]
H3["fingerprint.ts"]
H4["format-settings.testing.ts"]
H5["format-settings.ts"]
H6["hidden-amount.ts"]
H7["iban.ts"]
H8["index.ts"]
H9["link-control-to-setting.ts"]
HA["locale-presets.ts"]
HB["money-color.ts"]
HC["number-format.ts"]
HD["pagination.ts"]
HE["percentage.ts"]
HF["quick-ranges.ts"]
HG["range-expression.ts"]
HH["search-params.ts"]
HI["selection-model.ts"]
HJ["signed-amount.pipe.ts"]
HK["sortable.ts"]
HL["structural-filters.ts"]
HM["theme-hooks.ts"]
HN["unrendered-markup.testing.ts"]
subgraph HO["validators"]
HP["iban.validator.ts"]
HQ["percentage.validator.ts"]
end
HR["with-archivable.ts"]
HS["with-persisted-crud.ts"]
end
end
end
end
4-->R
4-->4B
5-->4
5-->6
6-->R
6-->H8
8-->R
9-->A
9-->R
A-->5
A-->R
B-->8
B-->A
B-->9
B-->C
B-->D
C-->R
D-->C
D-->R
F-->G
G-->N
G-->X
G-->H3
H-->G
H-->42
H-->H8
I-->G
J-->G
K-->G
L-->G
M-->G
O-->G
O-->3D
P-->G
Q-->G
R-->F
R-->G
R-->H
R-->I
R-->J
R-->K
R-->L
R-->M
R-->O
R-->P
R-->Q
R-->S
R-->T
R-->U
R-->V
R-->W
R-->Y
R-->Z
R-->10
S-->G
T-->G
U-->G
V-->G
W-->G
Y-->G
Z-->G
10-->G
12-->R
12-->H8
13-->17
13-->R
14-->16
14-->17
15-->14
15-->17
16-->R
17-->16
17-->R
19-->16
19-->R
19-->4B
19-->H8
1A-->12
1A-->13
1A-->14
1A-->16
1A-->17
1A-->18
1A-->19
1D-->2I
1D-->FA
1D-->GP
1F-->1D
1I-->1H
1K-->H8
1L-->1K
1L-->1M
1L-->1N
1M-->1K
1M-->R
1M-->H8
1N-->1K
1N-->1M
1N-->R
1P-->1Q
1P-->1R
1P-->1T
1Q-->1T
1R-->1T
1S-->1Q
1S-->1R
1S-->1T
1S-->1U
1S-->1V
1T-->N
1U-->B
1U-->R
1X-->20
1Y-->1X
1Y-->1Z
1Y-->20
1Z-->20
22-->23
22-->24
22-->25
22-->26
22-->27
22-->28
27-->25
27-->26
27-->28
27-->R
28-->R
2A-->2C
2A-->2L
2A-->2N
2A-->5
2A-->R
2A-->3D
2A-->4B
2A-->H8
2B-->R
2B-->42
2B-->H8
2C-->2L
2C-->R
2C-->H8
2D-->2E
2D-->3D
2D-->EZ
2D-->H8
2E-->3D
2E-->EZ
2E-->H8
2F-->R
2F-->3D
2G-->R
2G-->H8
2H-->2L
2H-->2N
2H-->B
2H-->R
2H-->1A
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
2J-->2A
2J-->2B
2J-->2K
2J-->2L
2J-->R
2J-->3D
2J-->H8
2K-->2B
2K-->H8
2L-->R
2L-->47
2L-->4B
2M-->R
2N-->2L
2N-->2M
2N-->R
2N-->4B
2P-->R
2P-->H8
2Q-->2P
2Q-->R
2Q-->H8
2R-->2T
2R-->38
2R-->H8
2S-->2Z
2S-->R
2T-->2S
2T-->R
2T-->H8
2U-->2S
2U-->2Z
2U-->R
2U-->H8
2V-->2Z
2V-->R
2W-->R
2X-->2S
2X-->3L
2X-->R
2Y-->H8
2Z-->2W
2Z-->30
2Z-->R
2Z-->4B
30-->5
30-->R
31-->R
32-->2T
32-->38
32-->R
32-->H8
33-->R
34-->R
34-->H8
35-->H8
36-->37
37-->38
37-->R
38-->2T
38-->R
38-->H8
39-->3A
39-->3C
39-->3T
39-->R
3A-->2T
3A-->38
3A-->H8
3B-->38
3B-->3V
3B-->H8
3C-->2T
3C-->32
3C-->38
3C-->H8
3D-->2P
3D-->2Q
3D-->2R
3D-->2S
3D-->2T
3D-->2U
3D-->2V
3D-->2W
3D-->2X
3D-->2Y
3D-->2Z
3D-->30
3D-->31
3D-->32
3D-->33
3D-->34
3D-->35
3D-->36
3D-->37
3D-->38
3D-->39
3D-->3A
3D-->3B
3D-->3C
3D-->3E
3D-->3F
3D-->3G
3D-->3H
3D-->3I
3D-->3J
3D-->3K
3D-->3L
3D-->3M
3D-->3N
3D-->3O
3D-->3P
3D-->3Q
3D-->3R
3D-->3S
3D-->3T
3D-->3U
3D-->3V
3D-->3W
3E-->30
3E-->R
3F-->30
3F-->5
3F-->R
3G-->R
3G-->H8
3H-->3W
3J-->H8
3K-->2Z
3K-->R
3L-->H8
3M-->H8
3N-->2Z
3N-->B
3N-->R
3N-->H8
3O-->3N
3O-->H8
3P-->R
3P-->H8
3Q-->3K
3Q-->R
3Q-->N
3Q-->H8
3R-->2S
3R-->2V
3R-->R
3S-->R
3S-->4B
3T-->37
3U-->2Z
3U-->R
3U-->H8
3V-->3K
3V-->R
3W-->2T
3W-->R
3W-->H8
3Y-->3Z
41-->43
41-->N
42-->41
42-->43
42-->44
44-->43
46-->R
47-->46
47-->48
47-->49
48-->R
49-->R
49-->4B
4B-->4C
4B-->4D
4B-->4F
4B-->4E
4C-->R
4D-->4F
4D-->R
4E-->4D
4E-->4F
4E-->R
4F-->6
4F-->R
4F-->H8
4H-->55
4H-->R
4I-->R
4J-->R
4K-->R
4L-->50
4L-->52
4L-->EZ
4M-->3D
4M-->H8
4N-->R
4N-->2I
4N-->3D
4N-->H8
4Q-->FV
4Q-->H8
4S-->4M
4S-->4N
4S-->R
4S-->3D
4S-->EZ
4S-->FV
4S-->H8
4U-->4M
4U-->4N
4U-->R
4U-->2I
4U-->3D
4U-->EZ
4U-->FV
4W-->4H
4W-->4I
4W-->4Q
4W-->FV
4Y-->4I
4Y-->4K
4Y-->R
4Y-->FV
4Y-->H8
4Y-->HP
4Y-->HQ
50-->55
50-->4Q
50-->4S
50-->4Y
50-->2I
50-->FV
50-->H8
52-->4H
52-->4I
52-->4J
52-->55
52-->4U
52-->4W
52-->4Y
52-->R
52-->2I
52-->FV
52-->H8
53-->4Q
53-->4S
53-->4U
53-->4W
53-->4Y
53-->50
53-->52
54-->4I
54-->4K
54-->4L
54-->53
55-->H8
57-->5E
57-->5R
59-->1S
5A-->59
5A-->5Y
5A-->R
5A-->1S
5A-->2I
5B-->R
5B-->FV
5E-->58
5E-->5B
5E-->5G
5E-->B
5E-->R
5E-->2I
5E-->FV
5E-->H8
5G-->58
5G-->R
5G-->FV
5H-->5E
5H-->5G
5H-->5L
5H-->5N
5H-->5P
5H-->5R
5J-->5T
5J-->5V
5J-->B
5J-->R
5J-->2I
5J-->FV
5L-->5U
5L-->2I
5L-->FV
5L-->H8
5N-->5T
5N-->5J
5N-->B
5N-->R
5N-->2I
5N-->FV
5P-->5W
5P-->5Y
5P-->FV
5P-->H8
5R-->5U
5R-->5X
5R-->5Y
5R-->5L
5R-->5N
5R-->5P
5R-->R
5R-->2I
5R-->FV
5R-->H8
5S-->57
5S-->58
5S-->59
5S-->5A
5S-->5H
5S-->5U
5S-->5X
5S-->5Y
5T-->5V
5T-->R
5U-->5X
5U-->R
5V-->R
5W-->R
5X-->5V
5X-->R
5Y-->5W
5Y-->B
5Y-->R
5Y-->2I
5Y-->H8
60-->65
63-->FV
65-->68
65-->69
65-->6A
65-->6B
65-->63
65-->FV
66-->65
6A-->68
6B-->69
6C-->60
6C-->66
6E-->R
6I-->2I
6I-->FV
6I-->H8
6K-->2I
6K-->4B
6K-->FV
6K-->H8
6M-->7A
6M-->2I
6M-->3D
6M-->EZ
6M-->FV
6M-->H8
6O-->6E
6O-->6F
6O-->7A
6O-->6Q
6O-->6S
6O-->2I
6O-->FV
6O-->H8
6Q-->2I
6Q-->FV
6S-->6F
6S-->FV
6U-->76
6U-->77
6U-->R
6U-->FV
6W-->76
6W-->77
6W-->7A
6W-->6I
6W-->6K
6W-->6M
6W-->6O
6W-->6U
6W-->6Z
6W-->71
6W-->73
6W-->75
6W-->2I
6W-->3D
6W-->FV
6W-->H8
6X-->6I
6X-->6K
6X-->6M
6X-->6O
6X-->6Q
6X-->6U
6X-->6W
6X-->6Z
6X-->71
6X-->73
6X-->75
6Z-->6Q
6Z-->2I
6Z-->3D
6Z-->4B
6Z-->EZ
6Z-->FV
6Z-->H8
71-->7A
71-->2I
71-->FV
71-->H8
73-->2I
73-->3D
73-->4B
73-->EZ
73-->FV
73-->H8
75-->7A
75-->2I
75-->FV
75-->H8
76-->77
76-->R
77-->R
78-->6W
78-->EZ
79-->6X
79-->78
7A-->6E
7A-->2I
7A-->3D
7A-->4B
7E-->7H
7E-->7J
7E-->R
7E-->22
7E-->3Y
7E-->FV
7E-->H8
7F-->7E
7H-->22
7H-->FV
7J-->R
7J-->22
7J-->FV
7K-->7F
7O-->7R
7O-->7T
7O-->2I
7O-->FV
7P-->7O
7P-->7R
7P-->7T
7R-->2I
7R-->3D
7R-->EZ
7R-->FV
7R-->H8
7T-->R
7T-->2I
7T-->3D
7T-->4B
7T-->EZ
7T-->FV
7T-->H8
7U-->7O
7U-->EZ
7V-->7P
7V-->7U
7Z-->8G
7Z-->8I
7Z-->R
7Z-->2I
7Z-->3D
7Z-->FV
7Z-->H8
81-->8H
81-->FV
83-->7Z
83-->89
83-->8C
83-->FV
85-->R
85-->FV
87-->8K
87-->FV
89-->8H
89-->8I
89-->8K
89-->81
89-->85
89-->87
89-->R
89-->2I
89-->FV
89-->H8
8A-->7Z
8A-->81
8A-->83
8A-->85
8A-->87
8A-->89
8A-->8C
8A-->8E
8C-->8F
8C-->8I
8C-->8M
8C-->8N
8C-->8E
8C-->2I
8C-->FV
8C-->H8
8E-->8N
8F-->R
8G-->R
8G-->3D
8G-->FV
8G-->H8
8H-->8F
8H-->R
8H-->3D
8H-->FV
8H-->H8
8I-->R
8I-->2I
8I-->3D
8I-->4B
8J-->83
8J-->EZ
8K-->R
8K-->3D
8K-->FV
8K-->H8
8L-->8A
8L-->8F
8L-->8G
8L-->8H
8L-->8I
8L-->8J
8L-->8K
8L-->8M
8L-->8N
8M-->3D
8M-->EZ
8M-->H8
8R-->90
8R-->FV
8T-->91
8T-->8V
8T-->FV
8V-->91
8V-->FV
8X-->91
8X-->FV
8Y-->8R
8Y-->8T
8Y-->8V
8Y-->8X
92-->8R
92-->8T
92-->8X
92-->91
93-->8Y
93-->91
93-->92
97-->1I
97-->FV
98-->97
99-->97
9A-->98
9A-->99
9C-->R
9F-->AB
9F-->54
9F-->FV
9H-->FV
9J-->9N
9J-->FV
9L-->9N
9L-->FV
9N-->FV
9P-->9C
9P-->9N
9P-->FV
9R-->AF
9R-->FV
9T-->9C
9T-->FV
9V-->AA
9V-->1A
9V-->2I
9V-->FV
9X-->9C
9X-->A9
9X-->AF
9X-->AG
9X-->9J
9X-->9L
9X-->9P
9X-->9R
9X-->9T
9X-->9Z
9X-->R
9X-->1A
9X-->FV
9Z-->A9
9Z-->1A
9Z-->FV
9Z-->H8
A1-->AB
A1-->AG
A1-->9V
A1-->A8
A1-->R
A1-->1A
A1-->FV
A3-->AA
A3-->R
A3-->1A
A3-->2I
A3-->FV
A5-->AC
A5-->9H
A5-->9X
A5-->A1
A5-->A3
A5-->2I
A5-->FV
A6-->9X
A6-->9Z
A6-->A1
A6-->A3
A6-->A5
A8-->AB
A8-->9F
A8-->R
A8-->FV
A9-->1A
A9-->FV
AA-->R
AA-->1A
AA-->H8
AB-->R
AC-->9C
AC-->A9
AC-->AB
AC-->AG
AC-->R
AC-->1A
AC-->2I
AC-->54
AD-->A5
AE-->9C
AE-->A6
AE-->AB
AE-->AD
AE-->AF
AE-->AG
AF-->9C
AG-->R
AI-->3D
AL-->AI
AL-->BM
AL-->FV
AL-->H8
AN-->BI
AN-->FV
AP-->FV
AR-->BJ
AR-->BK
AR-->BM
AR-->2I
AR-->3D
AR-->FV
AT-->BM
AT-->42
AT-->EZ
AT-->FV
AV-->BH
AV-->BM
AV-->AP
AV-->2I
AV-->3D
AV-->EZ
AV-->FV
AV-->H8
AX-->BK
AX-->BM
AX-->AL
AX-->AZ
AX-->2I
AX-->3D
AX-->FV
AX-->H8
AZ-->FV
B1-->BI
B1-->BM
B1-->AN
B3-->BI
B3-->BM
B3-->FV
B5-->BM
B5-->BP
B5-->AR
B5-->AV
B5-->AX
B5-->AZ
B5-->B1
B5-->B3
B5-->B9
B5-->BG
B5-->2I
B5-->3D
B5-->EZ
B5-->FV
B5-->H8
B7-->BI
B7-->BM
B7-->AL
B7-->AN
B7-->AT
B7-->B1
B7-->B3
B7-->FV
B9-->BM
B9-->2I
B9-->3D
B9-->4B
B9-->EZ
B9-->FV
B9-->H8
BA-->AL
BA-->AN
BA-->AP
BA-->AR
BA-->AV
BA-->AX
BA-->B3
BA-->B5
BA-->B7
BA-->B9
BA-->BC
BA-->BE
BA-->BG
BC-->BE
BC-->FV
BE-->BK
BE-->BM
BE-->BO
BE-->BP
BE-->FV
BE-->H8
BG-->BM
BG-->BO
BG-->BP
BG-->BE
BG-->R
BG-->FV
BH-->3D
BH-->EZ
BH-->H8
BI-->R
BJ-->BK
BJ-->R
BJ-->3D
BJ-->FV
BJ-->H8
BK-->H8
BL-->B5
BL-->B7
BL-->BC
BL-->EZ
BM-->AI
BM-->BK
BM-->R
BM-->2I
BM-->3D
BM-->42
BM-->4B
BN-->BA
BN-->BI
BN-->BK
BN-->BL
BN-->BM
BN-->BO
BN-->BP
BO-->R
BP-->R
BS-->BU
BS-->BY
BS-->C0
BS-->C2
BU-->BW
BU-->BY
BU-->C0
BU-->C2
BU-->FV
BW-->C5
BW-->5S
BW-->FV
BY-->C5
BY-->1S
BY-->2I
BY-->5S
BY-->FV
C0-->R
C0-->1S
C0-->2I
C0-->5S
C0-->FV
C0-->H8
C2-->R
C2-->2I
C2-->5S
C2-->FV
C2-->H8
C3-->BS
C3-->C4
C4-->BU
C5-->5S
C5-->FV
C8-->CA
C8-->CC
C8-->CE
C8-->CG
C8-->CI
C8-->CK
C8-->CM
C8-->CO
C8-->CQ
CA-->CG
CA-->R
CA-->1L
CA-->FV
CA-->H8
CC-->R
CC-->1L
CC-->EZ
CC-->FV
CE-->CS
CE-->FV
CG-->R
CG-->1L
CG-->EZ
CG-->FV
CG-->H8
CI-->CT
CI-->CX
CI-->CA
CI-->CC
CI-->CK
CI-->CM
CI-->CO
CI-->1L
CI-->2I
CI-->FV
CK-->CU
CK-->R
CK-->2I
CK-->FV
CK-->HQ
CM-->R
CM-->2I
CM-->FV
CM-->H8
CO-->CV
CO-->R
CO-->1L
CO-->2I
CO-->EZ
CO-->FV
CQ-->CS
CQ-->CX
CQ-->CE
CQ-->CK
CQ-->R
CQ-->FV
CR-->C8
CR-->CS
CR-->CT
CR-->CU
CR-->CV
CR-->CW
CR-->CX
CS-->CT
CS-->CU
CS-->R
CS-->1L
CS-->FV
CS-->H8
CT-->1L
CT-->FV
CT-->H8
CU-->R
CV-->1L
CV-->H8
CW-->CI
CW-->CQ
CW-->EZ
CX-->R
CX-->1L
CX-->2I
CX-->H8
CZ-->FV
D2-->CZ
D2-->DH
D2-->D4
D2-->D6
D2-->2I
D2-->3D
D2-->FV
D2-->H8
D4-->CZ
D4-->FV
D6-->CZ
D6-->FV
D7-->D2
D7-->D4
D7-->D6
D7-->DB
D7-->DD
D9-->FV
DB-->D2
DB-->DD
DB-->2I
DB-->FV
DD-->DG
DD-->DH
DD-->D9
DD-->2I
DD-->3D
DD-->EZ
DD-->FV
DD-->H8
DE-->D7
DE-->DI
DF-->R
DF-->3D
DG-->FV
DH-->DF
DH-->R
DH-->2I
DH-->3D
DH-->4B
DI-->DB
DL-->DT
DN-->1I
DN-->FV
DP-->2I
DP-->FV
DP-->H8
DR-->7K
DR-->FV
DT-->DN
DT-->DP
DT-->DR
DT-->DV
DT-->DX
DT-->DZ
DT-->FV
DV-->2I
DV-->FV
DV-->H8
DX-->2I
DX-->FV
DX-->H8
DZ-->2I
DZ-->42
DZ-->FV
E0-->DL
E0-->E1
E1-->DT
E3-->R
E6-->R
E6-->2I
E6-->47
E6-->FV
E6-->H8
E8-->E3
E9-->EB
E9-->EF
E9-->EH
E9-->EL
E9-->EN
EB-->E3
EB-->B
EB-->2I
EB-->FV
ED-->E3
ED-->EQ
ED-->E8
ED-->FV
ED-->H8
EF-->E3
EF-->E6
EF-->B
EF-->R
EF-->2I
EF-->47
EF-->5S
EF-->FV
EF-->H8
EH-->E3
EH-->EP
EH-->B
EH-->2I
EH-->FV
EH-->H8
EJ-->E3
EJ-->EQ
EJ-->E8
EJ-->FV
EJ-->H8
EL-->E3
EL-->EP
EL-->EQ
EL-->ES
EL-->EB
EL-->ED
EL-->EF
EL-->EH
EL-->EJ
EL-->EN
EL-->B
EL-->R
EL-->2I
EL-->4B
EL-->5S
EL-->FV
EL-->H8
EN-->2I
EN-->4B
EN-->FV
EN-->H8
EO-->ER
EP-->R
EP-->4B
EQ-->R
EQ-->H8
ER-->EL
ES-->R
EZ-->EV
EZ-->EW
EZ-->EY
EZ-->F0
EZ-->F1
F1-->H8
F4-->FA
F4-->FO
F4-->FQ
F4-->FX
F4-->GP
F4-->R
F4-->H8
F6-->H8
F8-->H8
FA-->H8
FC-->H8
FE-->FA
FE-->FZ
FE-->G3
FE-->GP
FG-->H8
FI-->FA
FI-->FM
FI-->H8
FK-->H8
FM-->H8
FO-->FS
FO-->GP
FQ-->H8
FS-->H8
FV-->F4
FV-->F6
FV-->F8
FV-->FA
FV-->FC
FV-->FE
FV-->FG
FV-->FI
FV-->FK
FV-->FM
FV-->FO
FV-->FQ
FV-->FS
FV-->FU
FV-->FX
FV-->FZ
FV-->G1
FV-->G3
FV-->G5
FV-->G7
FV-->G9
FV-->GB
FV-->GD
FV-->GF
FV-->GH
FV-->GJ
FV-->GL
FV-->GN
FV-->GP
FX-->H8
FZ-->H8
G1-->FS
G3-->H8
G5-->FS
G5-->GP
G7-->FA
G7-->FS
G7-->GP
G7-->H8
G9-->H8
GB-->H8
GD-->FA
GD-->2I
GF-->F4
GF-->FA
GF-->FS
GF-->G9
GF-->GP
GF-->R
GF-->H8
GH-->H8
GJ-->GB
GJ-->GP
GJ-->H8
GL-->H8
GN-->H8
GP-->H8
GR-->H0
GV-->H5
GY-->H5
GZ-->H0
H0-->H5
H4-->H5
H5-->N
H8-->GR
H8-->GS
H8-->GT
H8-->GU
H8-->GV
H8-->GW
H8-->GX
H8-->GY
H8-->H0
H8-->GZ
H8-->H1
H8-->H2
H8-->H3
H8-->H5
H8-->H6
H8-->H7
H8-->H9
H8-->HA
H8-->HB
H8-->HC
H8-->HD
H8-->HE
H8-->HF
H8-->HG
H8-->HH
H8-->HI
H8-->HJ
H8-->HK
H8-->HL
H8-->HM
H8-->HR
H8-->HS
HC-->H5
HF-->GY
HF-->HG
HG-->GY
HJ-->GV
```
