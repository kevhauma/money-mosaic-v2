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
- 453 leaf nodes, 1392 edges.
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
subgraph 7["auth"]
8["auth-api.service.ts"]
9["auth-endpoints.ts"]
A["auth-errors.ts"]
B["auth.guard.ts"]
C["auth.interceptor.ts"]
D["index.ts"]
E["public-user.ts"]
F["session.store.ts"]
end
subgraph G["categorisation"]
H["category-applicability.ts"]
I["co-owner-contribution.service.ts"]
J["co-owner-contribution.ts"]
K["index.ts"]
L["rule-matching.ts"]
M["rules-engine.service.ts"]
end
subgraph N["data-access"]
O["accounts.repository.ts"]
P["app-db.ts"]
Q["app-settings.repository.ts"]
R["categories.repository.ts"]
S["category-comparison-settings.repository.ts"]
T["category-model.repository.ts"]
U["dashboard-layout-settings.repository.ts"]
V["data-management.repository.ts"]
W["entities.ts"]
X["forecast-settings.repository.ts"]
Y["goals.repository.ts"]
Z["import-batches.repository.ts"]
10["index.ts"]
11["loans.repository.ts"]
12["mapping-profiles.repository.ts"]
13["recurring-overrides.repository.ts"]
14["rules.repository.ts"]
15["salary-metadata.repository.ts"]
16["seed-data.ts"]
17["transactions.repository.ts"]
18["transfer-settings.repository.ts"]
19["transfers.repository.ts"]
end
subgraph 1A["import"]
1B["account-detection.ts"]
1C["csv-import.service.ts"]
1D["csv-parse.ts"]
1E["csv-parse.worker.ts"]
1F["csv-row-mapper.ts"]
1G["csv-worker.types.ts"]
1H["delimiter-guess.ts"]
1I["import.service.ts"]
1J["index.ts"]
end
subgraph 1K["layout"]
subgraph 1L["app-shell"]
1M["app-shell.component.ts"]
end
1N["app-title.strategy.ts"]
1O["index.ts"]
end
subgraph 1P["links"]
1Q["external-links.ts"]
1R["index.ts"]
end
subgraph 1S["loans"]
1T["amortization.ts"]
1U["index.ts"]
1V["loan-progress.ts"]
1W["what-if.ts"]
end
subgraph 1X["ml"]
1Y["category-model.worker.ts"]
1Z["category-model.worker.types.ts"]
20["feature-hashing.ts"]
21["index.ts"]
22["model-config.ts"]
23["rule-proposal-mining.ts"]
24["training-window.ts"]
end
subgraph 25["onboarding"]
26["home-redirect.guard.ts"]
27["index.ts"]
28["mark-visited.guard.ts"]
29["visited.service.ts"]
end
subgraph 2A["qr-sync"]
2B["index.ts"]
2C["qr-camera-scanner.ts"]
2D["qr-code-renderer.ts"]
2E["qr-frames.ts"]
2F["qr-payload-codec.ts"]
2G["qr-sync.service.ts"]
2H["qr-transfer-payload.ts"]
end
subgraph 2I["state"]
2J["accounts.store.ts"]
2K["app-settings.store.ts"]
2L["categories.store.ts"]
2M["chart-options-control.ts"]
2N["chart-options.store.ts"]
2O["forecast-settings.store.ts"]
2P["goals.store.ts"]
2Q["import-batches.store.ts"]
2R["index.ts"]
2S["page-range-control.ts"]
2T["range-state.store.ts"]
2U["transactions.store.ts"]
2V["transfer-settings.store.ts"]
2W["transfers.store.ts"]
end
subgraph 2X["stats"]
2Y["account-balance-history.ts"]
2Z["account-balance-trend.ts"]
30["annual-lump-sum-smoothing.ts"]
31["category-breakdown.ts"]
32["category-composition-trend.ts"]
33["category-cycle-heatmap.ts"]
34["category-expense-transactions.ts"]
35["category-kind-contribution.ts"]
36["category-period-comparison.ts"]
37["chart-zoom-window.ts"]
38["classify-for-stats.ts"]
39["classify-joint-leg.ts"]
3A["day-transactions.ts"]
3B["embedded-bonus-smoothing.ts"]
3C["full-history-range.ts"]
3D["goal-affordability.ts"]
3E["granularity-for-span.ts"]
3F["gross-net-growth.ts"]
3G["gross-net-ratio.ts"]
3H["income-category-series.ts"]
3I["income-events.ts"]
3J["income-gap-detection.ts"]
3K["income-growth.ts"]
3L["income-step-change-detection.ts"]
3M["index.ts"]
3N["joint-account-stake.ts"]
3O["joint-contributor-breakdown.ts"]
3P["money-flow-graph.ts"]
3Q["multi-year-income-comparison.ts"]
3R["net-margin.ts"]
3S["net-worth-projection.ts"]
3T["period-stats.ts"]
3U["period-window.ts"]
3V["periodized-rate.ts"]
3W["recurring-payments.ts"]
3X["recurring-projection.ts"]
3Y["required-saving-rate.ts"]
3Z["saving-velocity.ts"]
40["spending-mosaic.ts"]
41["top-transactions.ts"]
42["wage-change-detection.ts"]
43["weekday-weekend-split.ts"]
44["year-over-year.ts"]
45["yearly-income-summary.ts"]
end
subgraph 46["storage"]
47["index.ts"]
48["storage-status.service.ts"]
end
subgraph 49["store-reset"]
4A["index.ts"]
4B["store-reset.service.ts"]
end
subgraph 4C["theme"]
4D["accent-colors.ts"]
4E["index.ts"]
4F["theme-styles.ts"]
4G["theme.service.ts"]
end
subgraph 4H["transactions"]
4I["attribution-override.ts"]
4J["index.ts"]
4K["nullify-transaction.ts"]
4L["transaction-deletion.service.ts"]
end
subgraph 4M["transfers"]
4N["index.ts"]
4O["transfer-cleanup.service.ts"]
4P["transfer-linking.service.ts"]
4Q["transfer-matching.service.ts"]
4R["transfer-matching.ts"]
end
end
subgraph 4S["feature-accounts"]
4T["account-card-vm.ts"]
4U["account-icons.ts"]
4V["account-list-order.ts"]
4W["account-types.ts"]
4X["accounts.routes.ts"]
4Y["balance-day-tooltip.ts"]
4Z["balance-trend-signals.ts"]
subgraph 50["components"]
subgraph 51["account-balance-block"]
52["account-balance-block.component.ts"]
end
subgraph 53["account-balance-chart"]
54["account-balance-chart.component.ts"]
end
subgraph 55["account-balance-history-chart"]
56["account-balance-history-chart.component.ts"]
end
subgraph 57["account-card"]
58["account-card.component.ts"]
end
subgraph 59["account-form"]
5A["account-form.component.ts"]
end
subgraph 5B["accounts-detail"]
5C["accounts-detail.component.ts"]
end
subgraph 5D["accounts-overview"]
5E["accounts-overview.component.ts"]
end
5F["index.ts"]
end
5G["index.ts"]
5H["last-import-status.ts"]
end
subgraph 5I["feature-auth"]
5J["auth.routes.ts"]
subgraph 5K["components"]
5L["index.ts"]
subgraph 5M["login-page"]
5N["login-page.component.ts"]
end
end
5O["index.ts"]
end
subgraph 5P["feature-categories"]
5Q["categories.routes.ts"]
5R["category-icons.ts"]
5S["category-model.service.ts"]
5T["category-model.store.ts"]
5U["category-row-vm.ts"]
subgraph 5V["components"]
subgraph 5W["categories-overview"]
5X["categories-overview.component.ts"]
end
subgraph 5Y["category-form"]
5Z["category-form.component.ts"]
end
60["index.ts"]
subgraph 61["rule-condition-row"]
62["rule-condition-row.component.ts"]
end
subgraph 63["rule-filters"]
64["rule-filters.component.ts"]
end
subgraph 65["rule-form"]
66["rule-form.component.ts"]
end
subgraph 67["rule-share-bar"]
68["rule-share-bar.component.ts"]
end
subgraph 69["rules-overview"]
6A["rules-overview.component.ts"]
end
end
6B["index.ts"]
6C["rule-condition-editor.ts"]
6D["rule-filters.ts"]
6E["rule-labels.ts"]
6F["rule-share.ts"]
6G["rule-summary.ts"]
6H["rules.store.ts"]
end
subgraph 6I["feature-changelog"]
6J["changelog.routes.ts"]
subgraph 6K["components"]
subgraph 6L["changelog-entry-row"]
6M["changelog-entry-row.component.ts"]
end
subgraph 6N["changelog-page"]
6O["changelog-page.component.ts"]
end
6P["index.ts"]
end
subgraph 6Q["data"]
6R["changelog-entries.ts"]
6S["roadmap-entries.ts"]
end
6T["group-changelog-entries.ts"]
6U["group-roadmap-entries.ts"]
6V["index.ts"]
end
subgraph 6W["feature-dashboard"]
6X["category-comparison-settings.store.ts"]
6Y["category-comparison-vm.ts"]
subgraph 6Z["components"]
subgraph 70["account-balance-strip"]
71["account-balance-strip.component.ts"]
end
subgraph 72["action-queue-panel"]
73["action-queue-panel.component.ts"]
end
subgraph 74["category-breakdown-panel"]
75["category-breakdown-panel.component.ts"]
end
subgraph 76["category-comparison-panel"]
77["category-comparison-panel.component.ts"]
end
subgraph 78["category-exclusion-dropdown"]
79["category-exclusion-dropdown.component.ts"]
end
subgraph 7A["comparison-category-card"]
7B["comparison-category-card.component.ts"]
end
subgraph 7C["dashboard-customize-panel"]
7D["dashboard-customize-panel.component.ts"]
end
subgraph 7E["dashboard-overview"]
7F["dashboard-overview.component.ts"]
end
7G["index.ts"]
subgraph 7H["spending-heatmap-panel"]
7I["spending-heatmap-panel.component.ts"]
end
subgraph 7J["top-transactions-panel"]
7K["top-transactions-panel.component.ts"]
end
subgraph 7L["trend-chart-panel"]
7M["trend-chart-panel.component.ts"]
end
subgraph 7N["weekday-weekend-split-panel"]
7O["weekday-weekend-split-panel.component.ts"]
end
end
7P["dashboard-layout-settings.store.ts"]
7Q["dashboard-row-order.ts"]
7R["dashboard.routes.ts"]
7S["index.ts"]
7T["stats.store.ts"]
end
subgraph 7U["feature-data-management"]
subgraph 7V["components"]
subgraph 7W["data-management-overview"]
7X["data-management-overview.component.ts"]
end
7Y["index.ts"]
subgraph 7Z["qr-receive-dialog"]
80["qr-receive-dialog.component.ts"]
end
subgraph 81["qr-send-dialog"]
82["qr-send-dialog.component.ts"]
end
end
83["index.ts"]
end
subgraph 84["feature-explore"]
subgraph 85["components"]
subgraph 86["explore-overview"]
87["explore-overview.component.ts"]
end
88["index.ts"]
subgraph 89["money-flow-panel"]
8A["money-flow-panel.component.ts"]
end
subgraph 8B["spending-mosaic-panel"]
8C["spending-mosaic-panel.component.ts"]
end
end
8D["explore.routes.ts"]
8E["index.ts"]
end
subgraph 8F["feature-future"]
subgraph 8G["components"]
subgraph 8H["forecast-controls"]
8I["forecast-controls.component.ts"]
end
subgraph 8J["forecast-notice"]
8K["forecast-notice.component.ts"]
end
subgraph 8L["future-overview"]
8M["future-overview.component.ts"]
end
subgraph 8N["goal-form"]
8O["goal-form.component.ts"]
end
subgraph 8P["goal-row"]
8Q["goal-row.component.ts"]
end
subgraph 8R["goals-panel"]
8S["goals-panel.component.ts"]
end
8T["index.ts"]
subgraph 8U["net-worth-projection-chart"]
8V["net-worth-projection-chart.component.ts"]
end
subgraph 8W["projection-figure-table"]
8X["projection-figure-table.component.ts"]
end
end
8Y["forecast-chart-copy.ts"]
8Z["forecast-controls-vm.ts"]
90["forecast-notices.ts"]
91["forecast.store.ts"]
92["future.routes.ts"]
93["goal-row-vm.ts"]
94["index.ts"]
95["net-worth-projection-chart-option.ts"]
96["projection-accessible-row.ts"]
end
subgraph 97["feature-help"]
subgraph 98["components"]
subgraph 99["faq-page"]
9A["faq-page.component.ts"]
end
subgraph 9B["guide-detail"]
9C["guide-detail.component.ts"]
end
subgraph 9D["guide-steps"]
9E["guide-steps.component.ts"]
end
subgraph 9F["guides-index"]
9G["guides-index.component.ts"]
end
9H["index.ts"]
end
subgraph 9I["data"]
9J["faq.ts"]
9K["guides.ts"]
end
9L["help.routes.ts"]
9M["index.ts"]
end
subgraph 9N["feature-home"]
subgraph 9O["components"]
subgraph 9P["home-landing"]
9Q["home-landing.component.ts"]
end
9R["index.ts"]
end
9S["home.routes.ts"]
9T["index.ts"]
end
subgraph 9U["feature-import"]
9V["column-mapping.ts"]
subgraph 9W["components"]
subgraph 9X["account-draft-editor"]
9Y["account-draft-editor.component.ts"]
end
subgraph 9Z["batch-wait-card"]
A0["batch-wait-card.component.ts"]
end
subgraph A1["column-map-amount-field"]
A2["column-map-amount-field.component.ts"]
end
subgraph A3["column-map-counterparty-field"]
A4["column-map-counterparty-field.component.ts"]
end
subgraph A5["column-map-sample-caption"]
A6["column-map-sample-caption.component.ts"]
end
subgraph A7["column-map-simple-field"]
A8["column-map-simple-field.component.ts"]
end
subgraph A9["column-map-stepper"]
AA["column-map-stepper.component.ts"]
end
subgraph AB["column-map-summary-step"]
AC["column-map-summary-step.component.ts"]
end
subgraph AD["import-history"]
AE["import-history.component.ts"]
end
subgraph AF["import-map-step"]
AG["import-map-step.component.ts"]
end
subgraph AH["import-preview-step"]
AI["import-preview-step.component.ts"]
end
subgraph AJ["import-select-step"]
AK["import-select-step.component.ts"]
end
subgraph AL["import-summary-step"]
AM["import-summary-step.component.ts"]
end
subgraph AN["import-wizard"]
AO["import-wizard.component.ts"]
end
AP["index.ts"]
subgraph AQ["queued-file-row"]
AR["queued-file-row.component.ts"]
end
end
AS["duplicate-scan.ts"]
AT["import-history-rows.ts"]
AU["import-queue.ts"]
AV["import-wizard-session.ts"]
AW["import.routes.ts"]
AX["index.ts"]
AY["mapper-steps.ts"]
AZ["mapping-profiles.store.ts"]
end
subgraph B0["feature-income"]
B1["career-start-date.ts"]
subgraph B2["components"]
subgraph B3["income-career-start"]
B4["income-career-start.component.ts"]
end
subgraph B5["income-category-checklist"]
B6["income-category-checklist.component.ts"]
end
subgraph B7["income-chart-cell"]
B8["income-chart-cell.component.ts"]
end
subgraph B9["income-events-sidebar"]
BA["income-events-sidebar.component.ts"]
end
subgraph BB["income-gross-color"]
BC["income-gross-color.component.ts"]
end
subgraph BD["income-gross-net-section"]
BE["income-gross-net-section.component.ts"]
end
subgraph BF["income-growth-panel"]
BG["income-growth-panel.component.ts"]
end
subgraph BH["income-inference-note"]
BI["income-inference-note.component.ts"]
end
subgraph BJ["income-lump-sum-checklist"]
BK["income-lump-sum-checklist.component.ts"]
end
subgraph BL["income-main-category"]
BM["income-main-category.component.ts"]
end
subgraph BN["income-overview"]
BO["income-overview.component.ts"]
end
subgraph BP["income-settings-page"]
BQ["income-settings-page.component.ts"]
end
subgraph BR["income-yearly-panel"]
BS["income-yearly-panel.component.ts"]
end
BT["index.ts"]
subgraph BU["salary-details-page"]
BV["salary-details-page.component.ts"]
end
subgraph BW["salary-metadata-table"]
BX["salary-metadata-table.component.ts"]
end
subgraph BY["salary-month-modal"]
BZ["salary-month-modal.component.ts"]
end
end
C0["gross-net-chart-options.ts"]
C1["income-category-vm.ts"]
C2["income-event-vm.ts"]
C3["income-granularity.ts"]
C4["income.routes.ts"]
C5["income.store.ts"]
C6["index.ts"]
C7["salary-metadata-edit.ts"]
C8["salary-metadata-rows.ts"]
end
subgraph C9["feature-learning"]
subgraph CA["components"]
CB["index.ts"]
subgraph CC["learning-overview"]
CD["learning-overview.component.ts"]
end
subgraph CE["model-status-badge"]
CF["model-status-badge.component.ts"]
end
subgraph CG["model-status"]
CH["model-status.component.ts"]
end
subgraph CI["rule-proposals"]
CJ["rule-proposals.component.ts"]
end
subgraph CK["suggestions-table"]
CL["suggestions-table.component.ts"]
end
end
CM["index.ts"]
CN["learning.routes.ts"]
CO["model-status-display.ts"]
end
subgraph CP["feature-loans"]
subgraph CQ["components"]
CR["index.ts"]
subgraph CS["loan-amortization-table"]
CT["loan-amortization-table.component.ts"]
end
subgraph CU["loan-balance-chart"]
CV["loan-balance-chart.component.ts"]
end
subgraph CW["loan-card"]
CX["loan-card.component.ts"]
end
subgraph CY["loan-composition-chart"]
CZ["loan-composition-chart.component.ts"]
end
subgraph D0["loan-detail"]
D1["loan-detail.component.ts"]
end
subgraph D2["loan-form"]
D3["loan-form.component.ts"]
end
subgraph D4["loan-payments-list"]
D5["loan-payments-list.component.ts"]
end
subgraph D6["loan-what-if"]
D7["loan-what-if.component.ts"]
end
subgraph D8["loans-overview"]
D9["loans-overview.component.ts"]
end
end
DA["index.ts"]
DB["loan-card-vm.ts"]
DC["loan-schedule-status.ts"]
DD["loan-types.ts"]
DE["loan-what-if-vm.ts"]
DF["loans.routes.ts"]
DG["loans.store.ts"]
end
subgraph DH["feature-recurring"]
DI["bills-calendar-vm.ts"]
subgraph DJ["components"]
subgraph DK["bills-calendar"]
DL["bills-calendar.component.ts"]
end
subgraph DM["bills-day-list"]
DN["bills-day-list.component.ts"]
end
subgraph DO["bills-month-grid"]
DP["bills-month-grid.component.ts"]
end
DQ["index.ts"]
subgraph DR["recurring-dismissed-list"]
DS["recurring-dismissed-list.component.ts"]
end
subgraph DT["recurring-overview"]
DU["recurring-overview.component.ts"]
end
subgraph DV["recurring-payments-panel"]
DW["recurring-payments-panel.component.ts"]
end
end
DX["index.ts"]
DY["recurring-overrides.ts"]
DZ["recurring-payments-row-vm.ts"]
E0["recurring-series.store.ts"]
E1["recurring.routes.ts"]
end
subgraph E2["feature-settings"]
subgraph E3["components"]
E4["index.ts"]
subgraph E5["settings-about-section"]
E6["settings-about-section.component.ts"]
end
subgraph E7["settings-currency-locale-section"]
E8["settings-currency-locale-section.component.ts"]
end
subgraph E9["settings-data-section"]
EA["settings-data-section.component.ts"]
end
subgraph EB["settings-overview"]
EC["settings-overview.component.ts"]
end
subgraph ED["settings-privacy-section"]
EE["settings-privacy-section.component.ts"]
end
subgraph EF["settings-reporting-section"]
EG["settings-reporting-section.component.ts"]
end
subgraph EH["settings-theme-section"]
EI["settings-theme-section.component.ts"]
end
end
EJ["index.ts"]
EK["settings.routes.ts"]
end
subgraph EL["feature-transactions"]
EM["category-picker.ts"]
subgraph EN["components"]
subgraph EO["attribution-override-fieldset"]
EP["attribution-override-fieldset.component.ts"]
end
subgraph EQ["category-select-cell"]
ER["category-select-cell.component.ts"]
end
ES["index.ts"]
subgraph ET["transaction-bulk-bar"]
EU["transaction-bulk-bar.component.ts"]
end
subgraph EV["transaction-card"]
EW["transaction-card.component.ts"]
end
subgraph EX["transaction-edit-form"]
EY["transaction-edit-form.component.ts"]
end
subgraph EZ["transaction-filters"]
F0["transaction-filters.component.ts"]
end
subgraph F1["transaction-row"]
F2["transaction-row.component.ts"]
end
subgraph F3["transactions-overview"]
F4["transactions-overview.component.ts"]
end
subgraph F5["transfer-review"]
F6["transfer-review.component.ts"]
end
end
F7["index.ts"]
F8["transaction-filters.ts"]
F9["transaction-row-vm.ts"]
FA["transactions.routes.ts"]
FB["transfer-label.ts"]
end
subgraph FC["shared"]
subgraph FD["echarts"]
FE["bucketed-axis-option.ts"]
FF["chart-theme.ts"]
FG["echarts-jsdom.testing.ts"]
FH["echarts-setup.ts"]
FI["index.ts"]
FJ["legend-option.ts"]
FK["tooltip-formatter.ts"]
end
subgraph FL["ui"]
subgraph FM["absolute-range-panel"]
FN["absolute-range-panel.component.ts"]
end
subgraph FO["alert"]
FP["alert.component.ts"]
end
subgraph FQ["badge"]
FR["badge.component.ts"]
end
subgraph FS["button"]
FT["button.component.ts"]
end
subgraph FU["collapse"]
FV["collapse.component.ts"]
end
subgraph FW["confirm-dialog"]
FX["confirm-dialog.component.ts"]
end
subgraph FY["cycle-picker"]
FZ["cycle-picker.component.ts"]
end
subgraph G0["date-range-input"]
G1["date-range-input.component.ts"]
end
subgraph G2["divider"]
G3["divider.component.ts"]
end
subgraph G4["dropdown"]
G5["dropdown.component.ts"]
end
subgraph G6["empty-state"]
G7["empty-state.component.ts"]
end
subgraph G8["fieldset"]
G9["fieldset.component.ts"]
end
subgraph GA["flex"]
GB["flex.component.ts"]
end
subgraph GC["granularity-picker"]
GD["granularity-picker.component.ts"]
end
GE["index.ts"]
subgraph GF["input"]
GG["input.component.ts"]
end
subgraph GH["label"]
GI["label.component.ts"]
end
subgraph GJ["loading-skeleton"]
GK["loading-skeleton.component.ts"]
end
subgraph GL["modal"]
GM["mm-modal.component.ts"]
end
subgraph GN["page-header"]
GO["page-header.component.ts"]
end
subgraph GP["paginator"]
GQ["paginator.component.ts"]
end
subgraph GR["paper"]
GS["paper.component.ts"]
end
subgraph GT["privacy-blur"]
GU["privacy-blur.component.ts"]
end
subgraph GV["privacy-toggle"]
GW["privacy-toggle.component.ts"]
end
subgraph GX["range-picker"]
GY["range-picker.component.ts"]
end
subgraph GZ["select"]
H0["select.component.ts"]
end
subgraph H1["stat-card"]
H2["stat-card.component.ts"]
end
subgraph H3["table"]
H4["table.component.ts"]
end
subgraph H5["tabs"]
H6["tabs.component.ts"]
end
subgraph H7["typography"]
H8["typography.component.ts"]
end
end
subgraph H9["utils"]
HA["calendar-cycles.ts"]
HB["compact-viewport.ts"]
HC["confidence-color.ts"]
HD["confirm-state.ts"]
HE["currency-format.ts"]
HF["currency-symbol-presets.ts"]
HG["daisy-classes.ts"]
HH["date-buckets.ts"]
HI["date-format.pipe.ts"]
HJ["date-format.ts"]
HK["debounced-text.ts"]
HL["download-json.ts"]
HM["fingerprint.ts"]
HN["format-settings.testing.ts"]
HO["format-settings.ts"]
HP["hidden-amount.ts"]
HQ["iban.ts"]
HR["index.ts"]
HS["link-control-to-setting.ts"]
HT["locale-presets.ts"]
HU["money-color.ts"]
HV["number-format.ts"]
HW["pagination.ts"]
HX["percentage.ts"]
HY["quick-ranges.ts"]
HZ["range-expression.ts"]
I0["search-params.ts"]
I1["selection-model.ts"]
I2["signed-amount.pipe.ts"]
I3["sortable.ts"]
I4["structural-filters.ts"]
I5["theme-hooks.ts"]
I6["unrendered-markup.testing.ts"]
subgraph I7["validators"]
I8["iban.validator.ts"]
I9["percentage.validator.ts"]
end
IA["with-archivable.ts"]
IB["with-persisted-crud.ts"]
end
end
end
end
4-->10
4-->4N
5-->4
5-->6
6-->10
6-->HR
8-->9
8-->E
B-->F
C-->9
C-->F
D-->8
D-->B
D-->C
D-->E
D-->F
F-->8
F-->A
F-->E
F-->4A
H-->10
I-->J
I-->10
J-->5
J-->10
K-->H
K-->J
K-->I
K-->L
K-->M
L-->10
M-->L
M-->10
O-->P
P-->W
P-->16
P-->HM
Q-->P
Q-->4E
Q-->HR
R-->P
S-->P
T-->P
U-->P
V-->P
X-->P
X-->3M
Y-->P
Z-->P
10-->O
10-->P
10-->Q
10-->R
10-->S
10-->T
10-->U
10-->V
10-->X
10-->Y
10-->Z
10-->11
10-->12
10-->13
10-->14
10-->15
10-->17
10-->18
10-->19
11-->P
12-->P
13-->P
14-->P
15-->P
17-->P
18-->P
19-->P
1B-->10
1B-->HR
1C-->1G
1C-->10
1D-->1F
1D-->1G
1E-->1D
1E-->1G
1F-->10
1G-->1F
1G-->10
1I-->1F
1I-->10
1I-->4N
1I-->HR
1J-->1B
1J-->1C
1J-->1D
1J-->1F
1J-->1G
1J-->1H
1J-->1I
1M-->D
1M-->2R
1M-->FT
1M-->H8
1O-->1M
1R-->1Q
1T-->HR
1U-->1T
1U-->1V
1U-->1W
1V-->1T
1V-->10
1V-->HR
1W-->1T
1W-->1V
1W-->10
1Y-->1Z
1Y-->20
1Y-->22
1Z-->22
20-->22
21-->1Z
21-->20
21-->22
21-->23
21-->24
22-->W
23-->K
23-->10
26-->29
27-->26
27-->28
27-->29
28-->29
2B-->2C
2B-->2D
2B-->2E
2B-->2F
2B-->2G
2B-->2H
2G-->2E
2G-->2F
2G-->2H
2G-->10
2H-->10
2J-->2L
2J-->2U
2J-->2W
2J-->5
2J-->10
2J-->3M
2J-->4A
2J-->4N
2J-->HR
2K-->10
2K-->4A
2K-->4E
2K-->HR
2L-->2U
2L-->10
2L-->4A
2L-->HR
2M-->2N
2M-->3M
2M-->FI
2M-->HR
2N-->3M
2N-->FI
2N-->HR
2O-->10
2O-->3M
2O-->4A
2P-->10
2P-->4A
2P-->HR
2Q-->2U
2Q-->2W
2Q-->K
2Q-->10
2Q-->1J
2Q-->4A
2R-->2J
2R-->2K
2R-->2L
2R-->2M
2R-->2N
2R-->2O
2R-->2P
2R-->2Q
2R-->2S
2R-->2T
2R-->2U
2R-->2V
2R-->2W
2S-->2J
2S-->2K
2S-->2T
2S-->2U
2S-->10
2S-->3M
2S-->HR
2T-->2K
2T-->HR
2U-->10
2U-->4A
2U-->4J
2U-->4N
2V-->10
2V-->4A
2W-->2U
2W-->2V
2W-->10
2W-->4A
2W-->4N
2Y-->10
2Y-->HR
2Z-->2Y
2Z-->10
2Z-->HR
30-->32
30-->3H
30-->HR
31-->38
31-->10
32-->31
32-->10
32-->HR
33-->31
33-->38
33-->10
33-->HR
34-->38
34-->10
35-->10
36-->31
36-->3U
36-->10
37-->HR
38-->35
38-->39
38-->10
38-->4N
39-->5
39-->10
3A-->10
3B-->32
3B-->3H
3B-->10
3B-->HR
3C-->10
3D-->10
3D-->HR
3E-->HR
3F-->3G
3G-->3H
3G-->10
3H-->32
3H-->10
3H-->HR
3I-->3J
3I-->3L
3I-->42
3I-->10
3J-->32
3J-->3H
3J-->HR
3K-->3H
3K-->44
3K-->HR
3L-->32
3L-->3B
3L-->3H
3L-->HR
3M-->2Y
3M-->2Z
3M-->30
3M-->31
3M-->32
3M-->33
3M-->34
3M-->35
3M-->36
3M-->37
3M-->38
3M-->39
3M-->3A
3M-->3B
3M-->3C
3M-->3D
3M-->3E
3M-->3F
3M-->3G
3M-->3H
3M-->3I
3M-->3J
3M-->3K
3M-->3L
3M-->3N
3M-->3O
3M-->3P
3M-->3Q
3M-->3R
3M-->3S
3M-->3T
3M-->3U
3M-->3V
3M-->3W
3M-->3X
3M-->3Y
3M-->3Z
3M-->40
3M-->41
3M-->42
3M-->43
3M-->44
3M-->45
3N-->39
3N-->10
3O-->39
3O-->5
3O-->10
3P-->10
3P-->HR
3Q-->45
3S-->HR
3T-->38
3T-->10
3U-->HR
3V-->HR
3W-->38
3W-->K
3W-->10
3W-->HR
3X-->3W
3X-->HR
3Y-->10
3Y-->HR
3Z-->3T
3Z-->10
3Z-->W
3Z-->HR
40-->31
40-->34
40-->10
41-->10
41-->4N
42-->3G
43-->38
43-->10
43-->HR
44-->3T
44-->10
45-->32
45-->10
45-->HR
47-->48
4A-->4B
4D-->4F
4D-->W
4E-->4D
4E-->4F
4E-->4G
4G-->4F
4I-->10
4J-->4I
4J-->4K
4J-->4L
4K-->10
4L-->10
4L-->4N
4N-->4O
4N-->4P
4N-->4R
4N-->4Q
4O-->10
4P-->4R
4P-->10
4Q-->4P
4Q-->4R
4Q-->10
4R-->6
4R-->10
4R-->HR
4T-->5H
4T-->10
4U-->10
4V-->10
4W-->10
4X-->5C
4X-->5E
4X-->FI
4Y-->3M
4Y-->HR
4Z-->10
4Z-->2R
4Z-->3M
4Z-->HR
52-->GE
52-->HR
54-->4Y
54-->4Z
54-->10
54-->3M
54-->FI
54-->GE
54-->HR
56-->4Y
56-->4Z
56-->10
56-->2R
56-->3M
56-->FI
56-->GE
58-->4T
58-->4U
58-->52
58-->GE
5A-->4U
5A-->4W
5A-->10
5A-->GE
5A-->HR
5A-->I8
5A-->I9
5C-->5H
5C-->52
5C-->54
5C-->5A
5C-->2R
5C-->GE
5C-->HR
5E-->4T
5E-->4U
5E-->4V
5E-->5H
5E-->56
5E-->58
5E-->5A
5E-->10
5E-->2R
5E-->GE
5E-->HR
5F-->52
5F-->54
5F-->56
5F-->58
5F-->5A
5F-->5C
5F-->5E
5G-->4U
5G-->4W
5G-->4X
5G-->5F
5H-->HR
5J-->5N
5L-->5N
5N-->D
5N-->FP
5N-->FT
5N-->G9
5N-->GG
5N-->GS
5N-->H8
5O-->5J
5O-->5L
5Q-->5X
5Q-->6A
5S-->21
5T-->5S
5T-->6H
5T-->10
5T-->21
5T-->2R
5T-->4A
5U-->10
5U-->GE
5X-->5R
5X-->5U
5X-->5Z
5X-->K
5X-->10
5X-->2R
5X-->GE
5X-->HR
5Z-->5R
5Z-->10
5Z-->GE
60-->5X
60-->5Z
60-->64
60-->66
60-->68
60-->6A
62-->6C
62-->6E
62-->K
62-->10
62-->2R
62-->GE
64-->6D
64-->2R
64-->GE
64-->HR
66-->6C
66-->62
66-->K
66-->10
66-->2R
66-->GE
68-->6F
68-->6H
68-->GE
68-->HR
6A-->6D
6A-->6G
6A-->6H
6A-->64
6A-->66
6A-->68
6A-->10
6A-->2R
6A-->GE
6A-->HR
6B-->5Q
6B-->5R
6B-->5S
6B-->5T
6B-->60
6B-->6D
6B-->6G
6B-->6H
6C-->6E
6C-->10
6D-->6G
6D-->10
6E-->10
6F-->10
6G-->6E
6G-->10
6H-->6F
6H-->K
6H-->10
6H-->2R
6H-->4A
6H-->HR
6J-->6O
6M-->GE
6O-->6R
6O-->6S
6O-->6T
6O-->6U
6O-->6M
6O-->GE
6P-->6O
6T-->6R
6U-->6S
6V-->6J
6V-->6P
6X-->10
6X-->4A
71-->2R
71-->GE
71-->HR
73-->2R
73-->4N
73-->GE
73-->HR
75-->7T
75-->2R
75-->3M
75-->FI
75-->GE
75-->HR
77-->6X
77-->6Y
77-->7T
77-->79
77-->7B
77-->2R
77-->GE
77-->HR
79-->2R
79-->GE
7B-->6Y
7B-->GE
7D-->7P
7D-->7Q
7D-->10
7D-->GE
7F-->7P
7F-->7Q
7F-->7T
7F-->71
7F-->73
7F-->75
7F-->77
7F-->7D
7F-->7I
7F-->7K
7F-->7M
7F-->7O
7F-->2R
7F-->3M
7F-->GE
7F-->HR
7G-->71
7G-->73
7G-->75
7G-->77
7G-->79
7G-->7D
7G-->7F
7G-->7I
7G-->7K
7G-->7M
7G-->7O
7I-->79
7I-->2R
7I-->3M
7I-->4N
7I-->FI
7I-->GE
7I-->HR
7K-->7T
7K-->2R
7K-->GE
7K-->HR
7M-->2R
7M-->3M
7M-->4N
7M-->FI
7M-->GE
7M-->HR
7O-->7T
7O-->2R
7O-->GE
7O-->HR
7P-->7Q
7P-->10
7P-->4A
7Q-->10
7R-->7F
7R-->FI
7S-->7G
7S-->7R
7T-->6X
7T-->2R
7T-->3M
7T-->4N
7X-->80
7X-->82
7X-->10
7X-->2B
7X-->47
7X-->GE
7X-->HR
7Y-->7X
80-->2B
80-->GE
82-->10
82-->2B
82-->GE
83-->7Y
87-->8A
87-->8C
87-->2R
87-->GE
88-->87
88-->8A
88-->8C
8A-->2R
8A-->3M
8A-->FI
8A-->GE
8A-->HR
8C-->10
8C-->2R
8C-->3M
8C-->4N
8C-->FI
8C-->GE
8C-->HR
8D-->87
8D-->FI
8E-->88
8E-->8D
8I-->8Z
8I-->91
8I-->10
8I-->2R
8I-->3M
8I-->GE
8I-->HR
8K-->90
8K-->GE
8M-->8I
8M-->8S
8M-->8V
8M-->GE
8O-->10
8O-->GE
8Q-->93
8Q-->GE
8S-->90
8S-->91
8S-->93
8S-->8K
8S-->8O
8S-->8Q
8S-->10
8S-->2R
8S-->GE
8S-->HR
8T-->8I
8T-->8K
8T-->8M
8T-->8O
8T-->8Q
8T-->8S
8T-->8V
8T-->8X
8V-->8Y
8V-->91
8V-->95
8V-->96
8V-->8X
8V-->2R
8V-->GE
8V-->HR
8X-->96
8Y-->10
8Z-->10
8Z-->3M
8Z-->GE
8Z-->HR
90-->8Y
90-->10
90-->3M
90-->GE
90-->HR
91-->10
91-->2R
91-->3M
91-->4N
92-->8M
92-->FI
93-->10
93-->3M
93-->GE
93-->HR
94-->8T
94-->8Y
94-->8Z
94-->90
94-->91
94-->92
94-->93
94-->95
94-->96
95-->3M
95-->FI
95-->HR
9A-->9J
9A-->GE
9C-->9K
9C-->9E
9C-->GE
9E-->9K
9E-->GE
9G-->9K
9G-->GE
9H-->9A
9H-->9C
9H-->9E
9H-->9G
9L-->9A
9L-->9C
9L-->9G
9L-->9K
9M-->9H
9M-->9K
9M-->9L
9Q-->1R
9Q-->GE
9R-->9Q
9S-->9Q
9T-->9R
9T-->9S
9V-->10
9Y-->AU
9Y-->5G
9Y-->GE
A0-->GE
A2-->A6
A2-->GE
A4-->A6
A4-->GE
A6-->GE
A8-->9V
A8-->A6
A8-->GE
AA-->AY
AA-->GE
AC-->9V
AC-->GE
AE-->AT
AE-->1J
AE-->2R
AE-->GE
AG-->9V
AG-->AS
AG-->AY
AG-->AZ
AG-->A2
AG-->A4
AG-->A8
AG-->AA
AG-->AC
AG-->AI
AG-->10
AG-->1J
AG-->GE
AI-->AS
AI-->1J
AI-->GE
AI-->HR
AK-->AU
AK-->AZ
AK-->AE
AK-->AR
AK-->10
AK-->1J
AK-->GE
AM-->AT
AM-->10
AM-->1J
AM-->2R
AM-->GE
AO-->AV
AO-->A0
AO-->AG
AO-->AK
AO-->AM
AO-->2R
AO-->GE
AP-->AG
AP-->AI
AP-->AK
AP-->AM
AP-->AO
AR-->AU
AR-->9Y
AR-->10
AR-->GE
AS-->1J
AS-->GE
AT-->10
AT-->1J
AT-->HR
AU-->10
AV-->9V
AV-->AS
AV-->AU
AV-->AZ
AV-->10
AV-->1J
AV-->2R
AV-->5G
AW-->AO
AX-->9V
AX-->AP
AX-->AU
AX-->AW
AX-->AY
AX-->AZ
AY-->9V
AZ-->10
AZ-->4A
B1-->3M
B4-->B1
B4-->C5
B4-->GE
B4-->HR
B6-->C1
B6-->GE
B8-->GE
BA-->C2
BA-->C3
BA-->C5
BA-->2R
BA-->3M
BA-->GE
BC-->C5
BC-->4E
BC-->FI
BC-->GE
BE-->C0
BE-->C5
BE-->B8
BE-->2R
BE-->3M
BE-->FI
BE-->GE
BE-->HR
BG-->C3
BG-->C5
BG-->B4
BG-->BI
BG-->2R
BG-->3M
BG-->GE
BG-->HR
BI-->GE
BK-->C1
BK-->C5
BK-->B6
BM-->C1
BM-->C5
BM-->GE
BO-->C5
BO-->C8
BO-->BA
BO-->BE
BO-->BG
BO-->BI
BO-->BK
BO-->BM
BO-->BS
BO-->BZ
BO-->2R
BO-->3M
BO-->FI
BO-->GE
BO-->HR
BQ-->C1
BQ-->C5
BQ-->B4
BQ-->B6
BQ-->BC
BQ-->BK
BQ-->BM
BQ-->GE
BS-->C5
BS-->2R
BS-->3M
BS-->4N
BS-->FI
BS-->GE
BS-->HR
BT-->B4
BT-->B6
BT-->B8
BT-->BA
BT-->BE
BT-->BG
BT-->BM
BT-->BO
BT-->BQ
BT-->BS
BT-->BV
BT-->BX
BT-->BZ
BV-->BX
BV-->GE
BX-->C3
BX-->C5
BX-->C7
BX-->C8
BX-->GE
BX-->HR
BZ-->C5
BZ-->C7
BZ-->C8
BZ-->BX
BZ-->10
BZ-->GE
C0-->3M
C0-->FI
C0-->HR
C1-->10
C2-->C3
C2-->10
C2-->3M
C2-->GE
C2-->HR
C3-->HR
C4-->BO
C4-->BQ
C4-->BV
C4-->FI
C5-->B1
C5-->C3
C5-->10
C5-->2R
C5-->3M
C5-->4A
C5-->4E
C5-->4N
C6-->BT
C6-->C1
C6-->C3
C6-->C4
C6-->C5
C6-->C7
C6-->C8
C7-->10
C8-->10
CB-->CD
CB-->CH
CB-->CJ
CB-->CL
CD-->CF
CD-->CH
CD-->CJ
CD-->CL
CD-->GE
CF-->CO
CF-->6B
CF-->GE
CH-->CO
CH-->21
CH-->2R
CH-->6B
CH-->GE
CJ-->10
CJ-->21
CJ-->2R
CJ-->6B
CJ-->GE
CJ-->HR
CL-->10
CL-->2R
CL-->6B
CL-->GE
CL-->HR
CM-->CB
CM-->CN
CN-->CD
CO-->6B
CO-->GE
CR-->CT
CR-->CV
CR-->CX
CR-->CZ
CR-->D1
CR-->D3
CR-->D5
CR-->D7
CR-->D9
CT-->CZ
CT-->10
CT-->1U
CT-->GE
CT-->HR
CV-->10
CV-->1U
CV-->FI
CV-->GE
CX-->DB
CX-->GE
CZ-->10
CZ-->1U
CZ-->FI
CZ-->GE
CZ-->HR
D1-->DC
D1-->DG
D1-->CT
D1-->CV
D1-->D3
D1-->D5
D1-->D7
D1-->1U
D1-->2R
D1-->GE
D3-->DD
D3-->10
D3-->2R
D3-->GE
D3-->I9
D5-->10
D5-->2R
D5-->GE
D5-->HR
D7-->DE
D7-->10
D7-->1U
D7-->2R
D7-->FI
D7-->GE
D9-->DB
D9-->DG
D9-->CX
D9-->D3
D9-->10
D9-->GE
DA-->CR
DA-->DB
DA-->DC
DA-->DD
DA-->DE
DA-->DF
DA-->DG
DB-->DC
DB-->DD
DB-->10
DB-->1U
DB-->GE
DB-->HR
DC-->1U
DC-->GE
DC-->HR
DD-->10
DE-->1U
DE-->HR
DF-->D1
DF-->D9
DF-->FI
DG-->10
DG-->1U
DG-->2R
DG-->4A
DG-->HR
DI-->GE
DL-->DI
DL-->E0
DL-->DN
DL-->DP
DL-->2R
DL-->3M
DL-->GE
DL-->HR
DN-->DI
DN-->GE
DP-->DI
DP-->GE
DQ-->DL
DQ-->DN
DQ-->DP
DQ-->DU
DQ-->DW
DS-->GE
DU-->DL
DU-->DW
DU-->2R
DU-->GE
DW-->DZ
DW-->E0
DW-->DS
DW-->2R
DW-->3M
DW-->FI
DW-->GE
DW-->HR
DX-->DQ
DX-->E1
DY-->10
DY-->3M
DZ-->GE
E0-->DY
E0-->10
E0-->2R
E0-->3M
E0-->4A
E0-->4N
E1-->DU
E4-->EC
E6-->1R
E6-->GE
E8-->2R
E8-->GE
E8-->HR
EA-->83
EA-->GE
EC-->E6
EC-->E8
EC-->EA
EC-->EE
EC-->EG
EC-->EI
EC-->GE
EE-->2R
EE-->GE
EE-->HR
EG-->2R
EG-->GE
EG-->HR
EI-->2R
EI-->4E
EI-->GE
EJ-->E4
EJ-->EK
EK-->EC
EM-->10
EP-->10
EP-->2R
EP-->4J
EP-->GE
EP-->HR
ER-->EM
ES-->EU
ES-->EY
ES-->F0
ES-->F4
ES-->F6
EU-->EM
EU-->K
EU-->2R
EU-->GE
EW-->EM
EW-->F9
EW-->ER
EW-->GE
EW-->HR
EY-->EM
EY-->EP
EY-->K
EY-->10
EY-->2R
EY-->4J
EY-->6B
EY-->GE
EY-->HR
F0-->EM
F0-->F8
F0-->K
F0-->2R
F0-->GE
F0-->HR
F2-->EM
F2-->F9
F2-->ER
F2-->GE
F2-->HR
F4-->EM
F4-->F8
F4-->F9
F4-->FB
F4-->EU
F4-->EW
F4-->EY
F4-->F0
F4-->F2
F4-->F6
F4-->K
F4-->10
F4-->2R
F4-->4N
F4-->6B
F4-->GE
F4-->HR
F6-->2R
F6-->4N
F6-->GE
F6-->HR
F7-->FA
F8-->10
F8-->4N
F9-->10
F9-->HR
FA-->F4
FB-->10
FI-->FE
FI-->FF
FI-->FH
FI-->FJ
FI-->FK
FK-->HR
FN-->FT
FN-->G7
FN-->G9
FN-->GG
FN-->H8
FN-->10
FN-->HR
FP-->HR
FR-->HR
FT-->HR
FV-->HR
FX-->FT
FX-->GI
FX-->GM
FX-->H8
FZ-->HR
G1-->FT
G1-->G5
G1-->HR
G3-->HR
G5-->HR
G7-->GB
G7-->H8
G9-->HR
GB-->HR
GE-->FN
GE-->FP
GE-->FR
GE-->FT
GE-->FV
GE-->FX
GE-->FZ
GE-->G1
GE-->G3
GE-->G5
GE-->G7
GE-->G9
GE-->GB
GE-->GD
GE-->GG
GE-->GI
GE-->GK
GE-->GM
GE-->GO
GE-->GQ
GE-->GS
GE-->GU
GE-->GW
GE-->GY
GE-->H0
GE-->H2
GE-->H4
GE-->H6
GE-->H8
GG-->HR
GI-->HR
GK-->GB
GM-->HR
GO-->GB
GO-->H8
GQ-->FT
GQ-->GB
GQ-->H8
GQ-->HR
GS-->HR
GU-->HR
GW-->FT
GW-->2R
GY-->FN
GY-->FT
GY-->GB
GY-->GS
GY-->H8
GY-->10
GY-->HR
H0-->HR
H2-->GU
H2-->H8
H2-->HR
H4-->HR
H6-->HR
H8-->HR
HA-->HJ
HE-->HO
HH-->HO
HI-->HJ
HJ-->HO
HN-->HO
HO-->W
HR-->HA
HR-->HB
HR-->HC
HR-->HD
HR-->HE
HR-->HF
HR-->HG
HR-->HH
HR-->HJ
HR-->HI
HR-->HK
HR-->HL
HR-->HM
HR-->HO
HR-->HP
HR-->HQ
HR-->HS
HR-->HT
HR-->HU
HR-->HV
HR-->HW
HR-->HX
HR-->HY
HR-->HZ
HR-->I0
HR-->I1
HR-->I2
HR-->I3
HR-->I4
HR-->I5
HR-->IA
HR-->IB
HV-->HO
HY-->HH
HY-->HZ
HZ-->HH
I2-->HE
```
