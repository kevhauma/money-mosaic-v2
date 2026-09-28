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
- 456 leaf nodes, 1403 edges.
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
subgraph 1O["default-password-notice"]
1P["default-password-notice.component.ts"]
end
1Q["index.ts"]
end
subgraph 1R["links"]
1S["external-links.ts"]
1T["index.ts"]
end
subgraph 1U["loans"]
1V["amortization.ts"]
1W["index.ts"]
1X["loan-progress.ts"]
1Y["what-if.ts"]
end
subgraph 1Z["ml"]
20["category-model.worker.ts"]
21["category-model.worker.types.ts"]
22["feature-hashing.ts"]
23["index.ts"]
24["model-config.ts"]
25["rule-proposal-mining.ts"]
26["training-window.ts"]
end
subgraph 27["onboarding"]
28["home-redirect.guard.ts"]
29["index.ts"]
2A["mark-visited.guard.ts"]
2B["visited.service.ts"]
end
subgraph 2C["qr-sync"]
2D["index.ts"]
2E["qr-camera-scanner.ts"]
2F["qr-code-renderer.ts"]
2G["qr-frames.ts"]
2H["qr-payload-codec.ts"]
2I["qr-sync.service.ts"]
2J["qr-transfer-payload.ts"]
end
subgraph 2K["state"]
2L["accounts.store.ts"]
2M["app-settings.store.ts"]
2N["categories.store.ts"]
2O["chart-options-control.ts"]
2P["chart-options.store.ts"]
2Q["forecast-settings.store.ts"]
2R["goals.store.ts"]
2S["import-batches.store.ts"]
2T["index.ts"]
2U["page-range-control.ts"]
2V["range-state.store.ts"]
2W["transactions.store.ts"]
2X["transfer-settings.store.ts"]
2Y["transfers.store.ts"]
end
subgraph 2Z["stats"]
30["account-balance-history.ts"]
31["account-balance-trend.ts"]
32["annual-lump-sum-smoothing.ts"]
33["category-breakdown.ts"]
34["category-composition-trend.ts"]
35["category-cycle-heatmap.ts"]
36["category-expense-transactions.ts"]
37["category-kind-contribution.ts"]
38["category-period-comparison.ts"]
39["chart-zoom-window.ts"]
3A["classify-for-stats.ts"]
3B["classify-joint-leg.ts"]
3C["day-transactions.ts"]
3D["embedded-bonus-smoothing.ts"]
3E["full-history-range.ts"]
3F["goal-affordability.ts"]
3G["granularity-for-span.ts"]
3H["gross-net-growth.ts"]
3I["gross-net-ratio.ts"]
3J["income-category-series.ts"]
3K["income-events.ts"]
3L["income-gap-detection.ts"]
3M["income-growth.ts"]
3N["income-step-change-detection.ts"]
3O["index.ts"]
3P["joint-account-stake.ts"]
3Q["joint-contributor-breakdown.ts"]
3R["money-flow-graph.ts"]
3S["multi-year-income-comparison.ts"]
3T["net-margin.ts"]
3U["net-worth-projection.ts"]
3V["period-stats.ts"]
3W["period-window.ts"]
3X["periodized-rate.ts"]
3Y["recurring-payments.ts"]
3Z["recurring-projection.ts"]
40["required-saving-rate.ts"]
41["saving-velocity.ts"]
42["spending-mosaic.ts"]
43["top-transactions.ts"]
44["wage-change-detection.ts"]
45["weekday-weekend-split.ts"]
46["year-over-year.ts"]
47["yearly-income-summary.ts"]
end
subgraph 48["storage"]
49["index.ts"]
4A["storage-status.service.ts"]
end
subgraph 4B["store-reset"]
4C["index.ts"]
4D["store-reset.service.ts"]
end
subgraph 4E["theme"]
4F["accent-colors.ts"]
4G["index.ts"]
4H["theme-styles.ts"]
4I["theme.service.ts"]
end
subgraph 4J["transactions"]
4K["attribution-override.ts"]
4L["index.ts"]
4M["nullify-transaction.ts"]
4N["transaction-deletion.service.ts"]
end
subgraph 4O["transfers"]
4P["index.ts"]
4Q["transfer-cleanup.service.ts"]
4R["transfer-linking.service.ts"]
4S["transfer-matching.service.ts"]
4T["transfer-matching.ts"]
end
end
subgraph 4U["feature-accounts"]
4V["account-card-vm.ts"]
4W["account-icons.ts"]
4X["account-list-order.ts"]
4Y["account-types.ts"]
4Z["accounts.routes.ts"]
50["balance-day-tooltip.ts"]
51["balance-trend-signals.ts"]
subgraph 52["components"]
subgraph 53["account-balance-block"]
54["account-balance-block.component.ts"]
end
subgraph 55["account-balance-chart"]
56["account-balance-chart.component.ts"]
end
subgraph 57["account-balance-history-chart"]
58["account-balance-history-chart.component.ts"]
end
subgraph 59["account-card"]
5A["account-card.component.ts"]
end
subgraph 5B["account-form"]
5C["account-form.component.ts"]
end
subgraph 5D["accounts-detail"]
5E["accounts-detail.component.ts"]
end
subgraph 5F["accounts-overview"]
5G["accounts-overview.component.ts"]
end
5H["index.ts"]
end
5I["index.ts"]
5J["last-import-status.ts"]
end
subgraph 5K["feature-auth"]
5L["auth.routes.ts"]
subgraph 5M["components"]
5N["index.ts"]
subgraph 5O["login-page"]
5P["login-page.component.ts"]
end
end
5Q["index.ts"]
end
subgraph 5R["feature-categories"]
5S["categories.routes.ts"]
5T["category-icons.ts"]
5U["category-model.service.ts"]
5V["category-model.store.ts"]
5W["category-row-vm.ts"]
subgraph 5X["components"]
subgraph 5Y["categories-overview"]
5Z["categories-overview.component.ts"]
end
subgraph 60["category-form"]
61["category-form.component.ts"]
end
62["index.ts"]
subgraph 63["rule-condition-row"]
64["rule-condition-row.component.ts"]
end
subgraph 65["rule-filters"]
66["rule-filters.component.ts"]
end
subgraph 67["rule-form"]
68["rule-form.component.ts"]
end
subgraph 69["rule-share-bar"]
6A["rule-share-bar.component.ts"]
end
subgraph 6B["rules-overview"]
6C["rules-overview.component.ts"]
end
end
6D["index.ts"]
6E["rule-condition-editor.ts"]
6F["rule-filters.ts"]
6G["rule-labels.ts"]
6H["rule-share.ts"]
6I["rule-summary.ts"]
6J["rules.store.ts"]
end
subgraph 6K["feature-changelog"]
6L["changelog.routes.ts"]
subgraph 6M["components"]
subgraph 6N["changelog-entry-row"]
6O["changelog-entry-row.component.ts"]
end
subgraph 6P["changelog-page"]
6Q["changelog-page.component.ts"]
end
6R["index.ts"]
end
subgraph 6S["data"]
6T["changelog-entries.ts"]
6U["roadmap-entries.ts"]
end
6V["group-changelog-entries.ts"]
6W["group-roadmap-entries.ts"]
6X["index.ts"]
end
subgraph 6Y["feature-dashboard"]
6Z["category-comparison-settings.store.ts"]
70["category-comparison-vm.ts"]
subgraph 71["components"]
subgraph 72["account-balance-strip"]
73["account-balance-strip.component.ts"]
end
subgraph 74["action-queue-panel"]
75["action-queue-panel.component.ts"]
end
subgraph 76["category-breakdown-panel"]
77["category-breakdown-panel.component.ts"]
end
subgraph 78["category-comparison-panel"]
79["category-comparison-panel.component.ts"]
end
subgraph 7A["category-exclusion-dropdown"]
7B["category-exclusion-dropdown.component.ts"]
end
subgraph 7C["comparison-category-card"]
7D["comparison-category-card.component.ts"]
end
subgraph 7E["dashboard-customize-panel"]
7F["dashboard-customize-panel.component.ts"]
end
subgraph 7G["dashboard-overview"]
7H["dashboard-overview.component.ts"]
end
7I["index.ts"]
subgraph 7J["spending-heatmap-panel"]
7K["spending-heatmap-panel.component.ts"]
end
subgraph 7L["top-transactions-panel"]
7M["top-transactions-panel.component.ts"]
end
subgraph 7N["trend-chart-panel"]
7O["trend-chart-panel.component.ts"]
end
subgraph 7P["weekday-weekend-split-panel"]
7Q["weekday-weekend-split-panel.component.ts"]
end
end
7R["dashboard-layout-settings.store.ts"]
7S["dashboard-row-order.ts"]
7T["dashboard.routes.ts"]
7U["index.ts"]
7V["stats.store.ts"]
end
subgraph 7W["feature-data-management"]
subgraph 7X["components"]
subgraph 7Y["data-management-overview"]
7Z["data-management-overview.component.ts"]
end
80["index.ts"]
subgraph 81["qr-receive-dialog"]
82["qr-receive-dialog.component.ts"]
end
subgraph 83["qr-send-dialog"]
84["qr-send-dialog.component.ts"]
end
end
85["index.ts"]
end
subgraph 86["feature-explore"]
subgraph 87["components"]
subgraph 88["explore-overview"]
89["explore-overview.component.ts"]
end
8A["index.ts"]
subgraph 8B["money-flow-panel"]
8C["money-flow-panel.component.ts"]
end
subgraph 8D["spending-mosaic-panel"]
8E["spending-mosaic-panel.component.ts"]
end
end
8F["explore.routes.ts"]
8G["index.ts"]
end
subgraph 8H["feature-future"]
subgraph 8I["components"]
subgraph 8J["forecast-controls"]
8K["forecast-controls.component.ts"]
end
subgraph 8L["forecast-notice"]
8M["forecast-notice.component.ts"]
end
subgraph 8N["future-overview"]
8O["future-overview.component.ts"]
end
subgraph 8P["goal-form"]
8Q["goal-form.component.ts"]
end
subgraph 8R["goal-row"]
8S["goal-row.component.ts"]
end
subgraph 8T["goals-panel"]
8U["goals-panel.component.ts"]
end
8V["index.ts"]
subgraph 8W["net-worth-projection-chart"]
8X["net-worth-projection-chart.component.ts"]
end
subgraph 8Y["projection-figure-table"]
8Z["projection-figure-table.component.ts"]
end
end
90["forecast-chart-copy.ts"]
91["forecast-controls-vm.ts"]
92["forecast-notices.ts"]
93["forecast.store.ts"]
94["future.routes.ts"]
95["goal-row-vm.ts"]
96["index.ts"]
97["net-worth-projection-chart-option.ts"]
98["projection-accessible-row.ts"]
end
subgraph 99["feature-help"]
subgraph 9A["components"]
subgraph 9B["faq-page"]
9C["faq-page.component.ts"]
end
subgraph 9D["guide-detail"]
9E["guide-detail.component.ts"]
end
subgraph 9F["guide-steps"]
9G["guide-steps.component.ts"]
end
subgraph 9H["guides-index"]
9I["guides-index.component.ts"]
end
9J["index.ts"]
end
subgraph 9K["data"]
9L["faq.ts"]
9M["guides.ts"]
end
9N["help.routes.ts"]
9O["index.ts"]
end
subgraph 9P["feature-home"]
subgraph 9Q["components"]
subgraph 9R["home-landing"]
9S["home-landing.component.ts"]
end
9T["index.ts"]
end
9U["home.routes.ts"]
9V["index.ts"]
end
subgraph 9W["feature-import"]
9X["column-mapping.ts"]
subgraph 9Y["components"]
subgraph 9Z["account-draft-editor"]
A0["account-draft-editor.component.ts"]
end
subgraph A1["batch-wait-card"]
A2["batch-wait-card.component.ts"]
end
subgraph A3["column-map-amount-field"]
A4["column-map-amount-field.component.ts"]
end
subgraph A5["column-map-counterparty-field"]
A6["column-map-counterparty-field.component.ts"]
end
subgraph A7["column-map-sample-caption"]
A8["column-map-sample-caption.component.ts"]
end
subgraph A9["column-map-simple-field"]
AA["column-map-simple-field.component.ts"]
end
subgraph AB["column-map-stepper"]
AC["column-map-stepper.component.ts"]
end
subgraph AD["column-map-summary-step"]
AE["column-map-summary-step.component.ts"]
end
subgraph AF["import-history"]
AG["import-history.component.ts"]
end
subgraph AH["import-map-step"]
AI["import-map-step.component.ts"]
end
subgraph AJ["import-preview-step"]
AK["import-preview-step.component.ts"]
end
subgraph AL["import-select-step"]
AM["import-select-step.component.ts"]
end
subgraph AN["import-summary-step"]
AO["import-summary-step.component.ts"]
end
subgraph AP["import-wizard"]
AQ["import-wizard.component.ts"]
end
AR["index.ts"]
subgraph AS["queued-file-row"]
AT["queued-file-row.component.ts"]
end
end
AU["duplicate-scan.ts"]
AV["import-history-rows.ts"]
AW["import-queue.ts"]
AX["import-wizard-session.ts"]
AY["import.routes.ts"]
AZ["index.ts"]
B0["mapper-steps.ts"]
B1["mapping-profiles.store.ts"]
end
subgraph B2["feature-income"]
B3["career-start-date.ts"]
subgraph B4["components"]
subgraph B5["income-career-start"]
B6["income-career-start.component.ts"]
end
subgraph B7["income-category-checklist"]
B8["income-category-checklist.component.ts"]
end
subgraph B9["income-chart-cell"]
BA["income-chart-cell.component.ts"]
end
subgraph BB["income-events-sidebar"]
BC["income-events-sidebar.component.ts"]
end
subgraph BD["income-gross-color"]
BE["income-gross-color.component.ts"]
end
subgraph BF["income-gross-net-section"]
BG["income-gross-net-section.component.ts"]
end
subgraph BH["income-growth-panel"]
BI["income-growth-panel.component.ts"]
end
subgraph BJ["income-inference-note"]
BK["income-inference-note.component.ts"]
end
subgraph BL["income-lump-sum-checklist"]
BM["income-lump-sum-checklist.component.ts"]
end
subgraph BN["income-main-category"]
BO["income-main-category.component.ts"]
end
subgraph BP["income-overview"]
BQ["income-overview.component.ts"]
end
subgraph BR["income-settings-page"]
BS["income-settings-page.component.ts"]
end
subgraph BT["income-yearly-panel"]
BU["income-yearly-panel.component.ts"]
end
BV["index.ts"]
subgraph BW["salary-details-page"]
BX["salary-details-page.component.ts"]
end
subgraph BY["salary-metadata-table"]
BZ["salary-metadata-table.component.ts"]
end
subgraph C0["salary-month-modal"]
C1["salary-month-modal.component.ts"]
end
end
C2["gross-net-chart-options.ts"]
C3["income-category-vm.ts"]
C4["income-event-vm.ts"]
C5["income-granularity.ts"]
C6["income.routes.ts"]
C7["income.store.ts"]
C8["index.ts"]
C9["salary-metadata-edit.ts"]
CA["salary-metadata-rows.ts"]
end
subgraph CB["feature-learning"]
subgraph CC["components"]
CD["index.ts"]
subgraph CE["learning-overview"]
CF["learning-overview.component.ts"]
end
subgraph CG["model-status-badge"]
CH["model-status-badge.component.ts"]
end
subgraph CI["model-status"]
CJ["model-status.component.ts"]
end
subgraph CK["rule-proposals"]
CL["rule-proposals.component.ts"]
end
subgraph CM["suggestions-table"]
CN["suggestions-table.component.ts"]
end
end
CO["index.ts"]
CP["learning.routes.ts"]
CQ["model-status-display.ts"]
end
subgraph CR["feature-loans"]
subgraph CS["components"]
CT["index.ts"]
subgraph CU["loan-amortization-table"]
CV["loan-amortization-table.component.ts"]
end
subgraph CW["loan-balance-chart"]
CX["loan-balance-chart.component.ts"]
end
subgraph CY["loan-card"]
CZ["loan-card.component.ts"]
end
subgraph D0["loan-composition-chart"]
D1["loan-composition-chart.component.ts"]
end
subgraph D2["loan-detail"]
D3["loan-detail.component.ts"]
end
subgraph D4["loan-form"]
D5["loan-form.component.ts"]
end
subgraph D6["loan-payments-list"]
D7["loan-payments-list.component.ts"]
end
subgraph D8["loan-what-if"]
D9["loan-what-if.component.ts"]
end
subgraph DA["loans-overview"]
DB["loans-overview.component.ts"]
end
end
DC["index.ts"]
DD["loan-card-vm.ts"]
DE["loan-schedule-status.ts"]
DF["loan-types.ts"]
DG["loan-what-if-vm.ts"]
DH["loans.routes.ts"]
DI["loans.store.ts"]
end
subgraph DJ["feature-recurring"]
DK["bills-calendar-vm.ts"]
subgraph DL["components"]
subgraph DM["bills-calendar"]
DN["bills-calendar.component.ts"]
end
subgraph DO["bills-day-list"]
DP["bills-day-list.component.ts"]
end
subgraph DQ["bills-month-grid"]
DR["bills-month-grid.component.ts"]
end
DS["index.ts"]
subgraph DT["recurring-dismissed-list"]
DU["recurring-dismissed-list.component.ts"]
end
subgraph DV["recurring-overview"]
DW["recurring-overview.component.ts"]
end
subgraph DX["recurring-payments-panel"]
DY["recurring-payments-panel.component.ts"]
end
end
DZ["index.ts"]
E0["recurring-overrides.ts"]
E1["recurring-payments-row-vm.ts"]
E2["recurring-series.store.ts"]
E3["recurring.routes.ts"]
end
subgraph E4["feature-settings"]
subgraph E5["components"]
subgraph E6["account-password-form"]
E7["account-password-form.component.ts"]
end
E8["index.ts"]
subgraph E9["settings-about-section"]
EA["settings-about-section.component.ts"]
end
subgraph EB["settings-account-section"]
EC["settings-account-section.component.ts"]
end
subgraph ED["settings-currency-locale-section"]
EE["settings-currency-locale-section.component.ts"]
end
subgraph EF["settings-data-section"]
EG["settings-data-section.component.ts"]
end
subgraph EH["settings-overview"]
EI["settings-overview.component.ts"]
end
subgraph EJ["settings-privacy-section"]
EK["settings-privacy-section.component.ts"]
end
subgraph EL["settings-reporting-section"]
EM["settings-reporting-section.component.ts"]
end
subgraph EN["settings-theme-section"]
EO["settings-theme-section.component.ts"]
end
end
EP["index.ts"]
EQ["settings.routes.ts"]
end
subgraph ER["feature-transactions"]
ES["category-picker.ts"]
subgraph ET["components"]
subgraph EU["attribution-override-fieldset"]
EV["attribution-override-fieldset.component.ts"]
end
subgraph EW["category-select-cell"]
EX["category-select-cell.component.ts"]
end
EY["index.ts"]
subgraph EZ["transaction-bulk-bar"]
F0["transaction-bulk-bar.component.ts"]
end
subgraph F1["transaction-card"]
F2["transaction-card.component.ts"]
end
subgraph F3["transaction-edit-form"]
F4["transaction-edit-form.component.ts"]
end
subgraph F5["transaction-filters"]
F6["transaction-filters.component.ts"]
end
subgraph F7["transaction-row"]
F8["transaction-row.component.ts"]
end
subgraph F9["transactions-overview"]
FA["transactions-overview.component.ts"]
end
subgraph FB["transfer-review"]
FC["transfer-review.component.ts"]
end
end
FD["index.ts"]
FE["transaction-filters.ts"]
FF["transaction-row-vm.ts"]
FG["transactions.routes.ts"]
FH["transfer-label.ts"]
end
subgraph FI["shared"]
subgraph FJ["echarts"]
FK["bucketed-axis-option.ts"]
FL["chart-theme.ts"]
FM["echarts-jsdom.testing.ts"]
FN["echarts-setup.ts"]
FO["index.ts"]
FP["legend-option.ts"]
FQ["tooltip-formatter.ts"]
end
subgraph FR["ui"]
subgraph FS["absolute-range-panel"]
FT["absolute-range-panel.component.ts"]
end
subgraph FU["alert"]
FV["alert.component.ts"]
end
subgraph FW["badge"]
FX["badge.component.ts"]
end
subgraph FY["button"]
FZ["button.component.ts"]
end
subgraph G0["collapse"]
G1["collapse.component.ts"]
end
subgraph G2["confirm-dialog"]
G3["confirm-dialog.component.ts"]
end
subgraph G4["cycle-picker"]
G5["cycle-picker.component.ts"]
end
subgraph G6["date-range-input"]
G7["date-range-input.component.ts"]
end
subgraph G8["divider"]
G9["divider.component.ts"]
end
subgraph GA["dropdown"]
GB["dropdown.component.ts"]
end
subgraph GC["empty-state"]
GD["empty-state.component.ts"]
end
subgraph GE["fieldset"]
GF["fieldset.component.ts"]
end
subgraph GG["flex"]
GH["flex.component.ts"]
end
subgraph GI["granularity-picker"]
GJ["granularity-picker.component.ts"]
end
GK["index.ts"]
subgraph GL["input"]
GM["input.component.ts"]
end
subgraph GN["label"]
GO["label.component.ts"]
end
subgraph GP["loading-skeleton"]
GQ["loading-skeleton.component.ts"]
end
subgraph GR["modal"]
GS["mm-modal.component.ts"]
end
subgraph GT["page-header"]
GU["page-header.component.ts"]
end
subgraph GV["paginator"]
GW["paginator.component.ts"]
end
subgraph GX["paper"]
GY["paper.component.ts"]
end
subgraph GZ["privacy-blur"]
H0["privacy-blur.component.ts"]
end
subgraph H1["privacy-toggle"]
H2["privacy-toggle.component.ts"]
end
subgraph H3["range-picker"]
H4["range-picker.component.ts"]
end
subgraph H5["select"]
H6["select.component.ts"]
end
subgraph H7["stat-card"]
H8["stat-card.component.ts"]
end
subgraph H9["table"]
HA["table.component.ts"]
end
subgraph HB["tabs"]
HC["tabs.component.ts"]
end
subgraph HD["typography"]
HE["typography.component.ts"]
end
end
subgraph HF["utils"]
HG["calendar-cycles.ts"]
HH["compact-viewport.ts"]
HI["confidence-color.ts"]
HJ["confirm-state.ts"]
HK["currency-format.ts"]
HL["currency-symbol-presets.ts"]
HM["daisy-classes.ts"]
HN["date-buckets.ts"]
HO["date-format.pipe.ts"]
HP["date-format.ts"]
HQ["debounced-text.ts"]
HR["download-json.ts"]
HS["fingerprint.ts"]
HT["format-settings.testing.ts"]
HU["format-settings.ts"]
HV["hidden-amount.ts"]
HW["iban.ts"]
HX["index.ts"]
HY["link-control-to-setting.ts"]
HZ["locale-presets.ts"]
I0["money-color.ts"]
I1["number-format.ts"]
I2["pagination.ts"]
I3["percentage.ts"]
I4["quick-ranges.ts"]
I5["range-expression.ts"]
I6["search-params.ts"]
I7["selection-model.ts"]
I8["signed-amount.pipe.ts"]
I9["sortable.ts"]
IA["structural-filters.ts"]
IB["theme-hooks.ts"]
IC["unrendered-markup.testing.ts"]
subgraph ID["validators"]
IE["iban.validator.ts"]
IF["percentage.validator.ts"]
end
IG["with-archivable.ts"]
IH["with-persisted-crud.ts"]
end
end
end
end
4-->10
4-->4P
5-->4
5-->6
6-->10
6-->HX
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
F-->4C
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
P-->HS
Q-->P
Q-->4G
Q-->HX
R-->P
S-->P
T-->P
U-->P
V-->P
X-->P
X-->3O
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
1B-->HX
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
1I-->4P
1I-->HX
1J-->1B
1J-->1C
1J-->1D
1J-->1F
1J-->1G
1J-->1H
1J-->1I
1M-->1P
1M-->D
1M-->2T
1M-->FZ
1M-->HE
1P-->D
1P-->FV
1P-->FZ
1P-->HE
1Q-->1M
1T-->1S
1V-->HX
1W-->1V
1W-->1X
1W-->1Y
1X-->1V
1X-->10
1X-->HX
1Y-->1V
1Y-->1X
1Y-->10
20-->21
20-->22
20-->24
21-->24
22-->24
23-->21
23-->22
23-->24
23-->25
23-->26
24-->W
25-->K
25-->10
28-->2B
29-->28
29-->2A
29-->2B
2A-->2B
2D-->2E
2D-->2F
2D-->2G
2D-->2H
2D-->2I
2D-->2J
2I-->2G
2I-->2H
2I-->2J
2I-->10
2J-->10
2L-->2N
2L-->2W
2L-->2Y
2L-->5
2L-->10
2L-->3O
2L-->4C
2L-->4P
2L-->HX
2M-->10
2M-->4C
2M-->4G
2M-->HX
2N-->2W
2N-->10
2N-->4C
2N-->HX
2O-->2P
2O-->3O
2O-->FO
2O-->HX
2P-->3O
2P-->FO
2P-->HX
2Q-->10
2Q-->3O
2Q-->4C
2R-->10
2R-->4C
2R-->HX
2S-->2W
2S-->2Y
2S-->K
2S-->10
2S-->1J
2S-->4C
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
2U-->2L
2U-->2M
2U-->2V
2U-->2W
2U-->10
2U-->3O
2U-->HX
2V-->2M
2V-->HX
2W-->10
2W-->4C
2W-->4L
2W-->4P
2X-->10
2X-->4C
2Y-->2W
2Y-->2X
2Y-->10
2Y-->4C
2Y-->4P
30-->10
30-->HX
31-->30
31-->10
31-->HX
32-->34
32-->3J
32-->HX
33-->3A
33-->10
34-->33
34-->10
34-->HX
35-->33
35-->3A
35-->10
35-->HX
36-->3A
36-->10
37-->10
38-->33
38-->3W
38-->10
39-->HX
3A-->37
3A-->3B
3A-->10
3A-->4P
3B-->5
3B-->10
3C-->10
3D-->34
3D-->3J
3D-->10
3D-->HX
3E-->10
3F-->10
3F-->HX
3G-->HX
3H-->3I
3I-->3J
3I-->10
3J-->34
3J-->10
3J-->HX
3K-->3L
3K-->3N
3K-->44
3K-->10
3L-->34
3L-->3J
3L-->HX
3M-->3J
3M-->46
3M-->HX
3N-->34
3N-->3D
3N-->3J
3N-->HX
3O-->30
3O-->31
3O-->32
3O-->33
3O-->34
3O-->35
3O-->36
3O-->37
3O-->38
3O-->39
3O-->3A
3O-->3B
3O-->3C
3O-->3D
3O-->3E
3O-->3F
3O-->3G
3O-->3H
3O-->3I
3O-->3J
3O-->3K
3O-->3L
3O-->3M
3O-->3N
3O-->3P
3O-->3Q
3O-->3R
3O-->3S
3O-->3T
3O-->3U
3O-->3V
3O-->3W
3O-->3X
3O-->3Y
3O-->3Z
3O-->40
3O-->41
3O-->42
3O-->43
3O-->44
3O-->45
3O-->46
3O-->47
3P-->3B
3P-->10
3Q-->3B
3Q-->5
3Q-->10
3R-->10
3R-->HX
3S-->47
3U-->HX
3V-->3A
3V-->10
3W-->HX
3X-->HX
3Y-->3A
3Y-->K
3Y-->10
3Y-->HX
3Z-->3Y
3Z-->HX
40-->10
40-->HX
41-->3V
41-->10
41-->W
41-->HX
42-->33
42-->36
42-->10
43-->10
43-->4P
44-->3I
45-->3A
45-->10
45-->HX
46-->3V
46-->10
47-->34
47-->10
47-->HX
49-->4A
4C-->4D
4F-->4H
4F-->W
4G-->4F
4G-->4H
4G-->4I
4I-->4H
4K-->10
4L-->4K
4L-->4M
4L-->4N
4M-->10
4N-->10
4N-->4P
4P-->4Q
4P-->4R
4P-->4T
4P-->4S
4Q-->10
4R-->4T
4R-->10
4S-->4R
4S-->4T
4S-->10
4T-->6
4T-->10
4T-->HX
4V-->5J
4V-->10
4W-->10
4X-->10
4Y-->10
4Z-->5E
4Z-->5G
4Z-->FO
50-->3O
50-->HX
51-->10
51-->2T
51-->3O
51-->HX
54-->GK
54-->HX
56-->50
56-->51
56-->10
56-->3O
56-->FO
56-->GK
56-->HX
58-->50
58-->51
58-->10
58-->2T
58-->3O
58-->FO
58-->GK
5A-->4V
5A-->4W
5A-->54
5A-->GK
5C-->4W
5C-->4Y
5C-->10
5C-->GK
5C-->HX
5C-->IE
5C-->IF
5E-->5J
5E-->54
5E-->56
5E-->5C
5E-->2T
5E-->GK
5E-->HX
5G-->4V
5G-->4W
5G-->4X
5G-->5J
5G-->58
5G-->5A
5G-->5C
5G-->10
5G-->2T
5G-->GK
5G-->HX
5H-->54
5H-->56
5H-->58
5H-->5A
5H-->5C
5H-->5E
5H-->5G
5I-->4W
5I-->4Y
5I-->4Z
5I-->5H
5J-->HX
5L-->5P
5N-->5P
5P-->D
5P-->FV
5P-->FZ
5P-->GF
5P-->GM
5P-->GY
5P-->HE
5Q-->5L
5Q-->5N
5S-->5Z
5S-->6C
5U-->23
5V-->5U
5V-->6J
5V-->10
5V-->23
5V-->2T
5V-->4C
5W-->10
5W-->GK
5Z-->5T
5Z-->5W
5Z-->61
5Z-->K
5Z-->10
5Z-->2T
5Z-->GK
5Z-->HX
61-->5T
61-->10
61-->GK
62-->5Z
62-->61
62-->66
62-->68
62-->6A
62-->6C
64-->6E
64-->6G
64-->K
64-->10
64-->2T
64-->GK
66-->6F
66-->2T
66-->GK
66-->HX
68-->6E
68-->64
68-->K
68-->10
68-->2T
68-->GK
6A-->6H
6A-->6J
6A-->GK
6A-->HX
6C-->6F
6C-->6I
6C-->6J
6C-->66
6C-->68
6C-->6A
6C-->10
6C-->2T
6C-->GK
6C-->HX
6D-->5S
6D-->5T
6D-->5U
6D-->5V
6D-->62
6D-->6F
6D-->6I
6D-->6J
6E-->6G
6E-->10
6F-->6I
6F-->10
6G-->10
6H-->10
6I-->6G
6I-->10
6J-->6H
6J-->K
6J-->10
6J-->2T
6J-->4C
6J-->HX
6L-->6Q
6O-->GK
6Q-->6T
6Q-->6U
6Q-->6V
6Q-->6W
6Q-->6O
6Q-->GK
6R-->6Q
6V-->6T
6W-->6U
6X-->6L
6X-->6R
6Z-->10
6Z-->4C
73-->2T
73-->GK
73-->HX
75-->2T
75-->4P
75-->GK
75-->HX
77-->7V
77-->2T
77-->3O
77-->FO
77-->GK
77-->HX
79-->6Z
79-->70
79-->7V
79-->7B
79-->7D
79-->2T
79-->GK
79-->HX
7B-->2T
7B-->GK
7D-->70
7D-->GK
7F-->7R
7F-->7S
7F-->10
7F-->GK
7H-->7R
7H-->7S
7H-->7V
7H-->73
7H-->75
7H-->77
7H-->79
7H-->7F
7H-->7K
7H-->7M
7H-->7O
7H-->7Q
7H-->2T
7H-->3O
7H-->GK
7H-->HX
7I-->73
7I-->75
7I-->77
7I-->79
7I-->7B
7I-->7F
7I-->7H
7I-->7K
7I-->7M
7I-->7O
7I-->7Q
7K-->7B
7K-->2T
7K-->3O
7K-->4P
7K-->FO
7K-->GK
7K-->HX
7M-->7V
7M-->2T
7M-->GK
7M-->HX
7O-->2T
7O-->3O
7O-->4P
7O-->FO
7O-->GK
7O-->HX
7Q-->7V
7Q-->2T
7Q-->GK
7Q-->HX
7R-->7S
7R-->10
7R-->4C
7S-->10
7T-->7H
7T-->FO
7U-->7I
7U-->7T
7V-->6Z
7V-->2T
7V-->3O
7V-->4P
7Z-->82
7Z-->84
7Z-->10
7Z-->2D
7Z-->49
7Z-->GK
7Z-->HX
80-->7Z
82-->2D
82-->GK
84-->10
84-->2D
84-->GK
85-->80
89-->8C
89-->8E
89-->2T
89-->GK
8A-->89
8A-->8C
8A-->8E
8C-->2T
8C-->3O
8C-->FO
8C-->GK
8C-->HX
8E-->10
8E-->2T
8E-->3O
8E-->4P
8E-->FO
8E-->GK
8E-->HX
8F-->89
8F-->FO
8G-->8A
8G-->8F
8K-->91
8K-->93
8K-->10
8K-->2T
8K-->3O
8K-->GK
8K-->HX
8M-->92
8M-->GK
8O-->8K
8O-->8U
8O-->8X
8O-->GK
8Q-->10
8Q-->GK
8S-->95
8S-->GK
8U-->92
8U-->93
8U-->95
8U-->8M
8U-->8Q
8U-->8S
8U-->10
8U-->2T
8U-->GK
8U-->HX
8V-->8K
8V-->8M
8V-->8O
8V-->8Q
8V-->8S
8V-->8U
8V-->8X
8V-->8Z
8X-->90
8X-->93
8X-->97
8X-->98
8X-->8Z
8X-->2T
8X-->GK
8X-->HX
8Z-->98
90-->10
91-->10
91-->3O
91-->GK
91-->HX
92-->90
92-->10
92-->3O
92-->GK
92-->HX
93-->10
93-->2T
93-->3O
93-->4P
94-->8O
94-->FO
95-->10
95-->3O
95-->GK
95-->HX
96-->8V
96-->90
96-->91
96-->92
96-->93
96-->94
96-->95
96-->97
96-->98
97-->3O
97-->FO
97-->HX
9C-->9L
9C-->GK
9E-->9M
9E-->9G
9E-->GK
9G-->9M
9G-->GK
9I-->9M
9I-->GK
9J-->9C
9J-->9E
9J-->9G
9J-->9I
9N-->9C
9N-->9E
9N-->9I
9N-->9M
9O-->9J
9O-->9M
9O-->9N
9S-->1T
9S-->GK
9T-->9S
9U-->9S
9V-->9T
9V-->9U
9X-->10
A0-->AW
A0-->5I
A0-->GK
A2-->GK
A4-->A8
A4-->GK
A6-->A8
A6-->GK
A8-->GK
AA-->9X
AA-->A8
AA-->GK
AC-->B0
AC-->GK
AE-->9X
AE-->GK
AG-->AV
AG-->1J
AG-->2T
AG-->GK
AI-->9X
AI-->AU
AI-->B0
AI-->B1
AI-->A4
AI-->A6
AI-->AA
AI-->AC
AI-->AE
AI-->AK
AI-->10
AI-->1J
AI-->GK
AK-->AU
AK-->1J
AK-->GK
AK-->HX
AM-->AW
AM-->B1
AM-->AG
AM-->AT
AM-->10
AM-->1J
AM-->GK
AO-->AV
AO-->10
AO-->1J
AO-->2T
AO-->GK
AQ-->AX
AQ-->A2
AQ-->AI
AQ-->AM
AQ-->AO
AQ-->2T
AQ-->GK
AR-->AI
AR-->AK
AR-->AM
AR-->AO
AR-->AQ
AT-->AW
AT-->A0
AT-->10
AT-->GK
AU-->1J
AU-->GK
AV-->10
AV-->1J
AV-->HX
AW-->10
AX-->9X
AX-->AU
AX-->AW
AX-->B1
AX-->10
AX-->1J
AX-->2T
AX-->5I
AY-->AQ
AZ-->9X
AZ-->AR
AZ-->AW
AZ-->AY
AZ-->B0
AZ-->B1
B0-->9X
B1-->10
B1-->4C
B3-->3O
B6-->B3
B6-->C7
B6-->GK
B6-->HX
B8-->C3
B8-->GK
BA-->GK
BC-->C4
BC-->C5
BC-->C7
BC-->2T
BC-->3O
BC-->GK
BE-->C7
BE-->4G
BE-->FO
BE-->GK
BG-->C2
BG-->C7
BG-->BA
BG-->2T
BG-->3O
BG-->FO
BG-->GK
BG-->HX
BI-->C5
BI-->C7
BI-->B6
BI-->BK
BI-->2T
BI-->3O
BI-->GK
BI-->HX
BK-->GK
BM-->C3
BM-->C7
BM-->B8
BO-->C3
BO-->C7
BO-->GK
BQ-->C7
BQ-->CA
BQ-->BC
BQ-->BG
BQ-->BI
BQ-->BK
BQ-->BM
BQ-->BO
BQ-->BU
BQ-->C1
BQ-->2T
BQ-->3O
BQ-->FO
BQ-->GK
BQ-->HX
BS-->C3
BS-->C7
BS-->B6
BS-->B8
BS-->BE
BS-->BM
BS-->BO
BS-->GK
BU-->C7
BU-->2T
BU-->3O
BU-->4P
BU-->FO
BU-->GK
BU-->HX
BV-->B6
BV-->B8
BV-->BA
BV-->BC
BV-->BG
BV-->BI
BV-->BO
BV-->BQ
BV-->BS
BV-->BU
BV-->BX
BV-->BZ
BV-->C1
BX-->BZ
BX-->GK
BZ-->C5
BZ-->C7
BZ-->C9
BZ-->CA
BZ-->GK
BZ-->HX
C1-->C7
C1-->C9
C1-->CA
C1-->BZ
C1-->10
C1-->GK
C2-->3O
C2-->FO
C2-->HX
C3-->10
C4-->C5
C4-->10
C4-->3O
C4-->GK
C4-->HX
C5-->HX
C6-->BQ
C6-->BS
C6-->BX
C6-->FO
C7-->B3
C7-->C5
C7-->10
C7-->2T
C7-->3O
C7-->4C
C7-->4G
C7-->4P
C8-->BV
C8-->C3
C8-->C5
C8-->C6
C8-->C7
C8-->C9
C8-->CA
C9-->10
CA-->10
CD-->CF
CD-->CJ
CD-->CL
CD-->CN
CF-->CH
CF-->CJ
CF-->CL
CF-->CN
CF-->GK
CH-->CQ
CH-->6D
CH-->GK
CJ-->CQ
CJ-->23
CJ-->2T
CJ-->6D
CJ-->GK
CL-->10
CL-->23
CL-->2T
CL-->6D
CL-->GK
CL-->HX
CN-->10
CN-->2T
CN-->6D
CN-->GK
CN-->HX
CO-->CD
CO-->CP
CP-->CF
CQ-->6D
CQ-->GK
CT-->CV
CT-->CX
CT-->CZ
CT-->D1
CT-->D3
CT-->D5
CT-->D7
CT-->D9
CT-->DB
CV-->D1
CV-->10
CV-->1W
CV-->GK
CV-->HX
CX-->10
CX-->1W
CX-->FO
CX-->GK
CZ-->DD
CZ-->GK
D1-->10
D1-->1W
D1-->FO
D1-->GK
D1-->HX
D3-->DE
D3-->DI
D3-->CV
D3-->CX
D3-->D5
D3-->D7
D3-->D9
D3-->1W
D3-->2T
D3-->GK
D5-->DF
D5-->10
D5-->2T
D5-->GK
D5-->IF
D7-->10
D7-->2T
D7-->GK
D7-->HX
D9-->DG
D9-->10
D9-->1W
D9-->2T
D9-->FO
D9-->GK
DB-->DD
DB-->DI
DB-->CZ
DB-->D5
DB-->10
DB-->GK
DC-->CT
DC-->DD
DC-->DE
DC-->DF
DC-->DG
DC-->DH
DC-->DI
DD-->DE
DD-->DF
DD-->10
DD-->1W
DD-->GK
DD-->HX
DE-->1W
DE-->GK
DE-->HX
DF-->10
DG-->1W
DG-->HX
DH-->D3
DH-->DB
DH-->FO
DI-->10
DI-->1W
DI-->2T
DI-->4C
DI-->HX
DK-->GK
DN-->DK
DN-->E2
DN-->DP
DN-->DR
DN-->2T
DN-->3O
DN-->GK
DN-->HX
DP-->DK
DP-->GK
DR-->DK
DR-->GK
DS-->DN
DS-->DP
DS-->DR
DS-->DW
DS-->DY
DU-->GK
DW-->DN
DW-->DY
DW-->2T
DW-->GK
DY-->E1
DY-->E2
DY-->DU
DY-->2T
DY-->3O
DY-->FO
DY-->GK
DY-->HX
DZ-->DS
DZ-->E3
E0-->10
E0-->3O
E1-->GK
E2-->E0
E2-->10
E2-->2T
E2-->3O
E2-->4C
E2-->4P
E3-->DW
E7-->D
E7-->GK
E8-->EI
EA-->1T
EA-->GK
EC-->E7
EC-->D
EC-->GK
EE-->2T
EE-->GK
EE-->HX
EG-->85
EG-->GK
EI-->EA
EI-->EC
EI-->EE
EI-->EG
EI-->EK
EI-->EM
EI-->EO
EI-->GK
EK-->2T
EK-->GK
EK-->HX
EM-->2T
EM-->GK
EM-->HX
EO-->2T
EO-->4G
EO-->GK
EP-->E8
EP-->EQ
EQ-->EI
ES-->10
EV-->10
EV-->2T
EV-->4L
EV-->GK
EV-->HX
EX-->ES
EY-->F0
EY-->F4
EY-->F6
EY-->FA
EY-->FC
F0-->ES
F0-->K
F0-->2T
F0-->GK
F2-->ES
F2-->FF
F2-->EX
F2-->GK
F2-->HX
F4-->ES
F4-->EV
F4-->K
F4-->10
F4-->2T
F4-->4L
F4-->6D
F4-->GK
F4-->HX
F6-->ES
F6-->FE
F6-->K
F6-->2T
F6-->GK
F6-->HX
F8-->ES
F8-->FF
F8-->EX
F8-->GK
F8-->HX
FA-->ES
FA-->FE
FA-->FF
FA-->FH
FA-->F0
FA-->F2
FA-->F4
FA-->F6
FA-->F8
FA-->FC
FA-->K
FA-->10
FA-->2T
FA-->4P
FA-->6D
FA-->GK
FA-->HX
FC-->2T
FC-->4P
FC-->GK
FC-->HX
FD-->FG
FE-->10
FE-->4P
FF-->10
FF-->HX
FG-->FA
FH-->10
FO-->FK
FO-->FL
FO-->FN
FO-->FP
FO-->FQ
FQ-->HX
FT-->FZ
FT-->GD
FT-->GF
FT-->GM
FT-->HE
FT-->10
FT-->HX
FV-->HX
FX-->HX
FZ-->HX
G1-->HX
G3-->FZ
G3-->GO
G3-->GS
G3-->HE
G5-->HX
G7-->FZ
G7-->GB
G7-->HX
G9-->HX
GB-->HX
GD-->GH
GD-->HE
GF-->HX
GH-->HX
GK-->FT
GK-->FV
GK-->FX
GK-->FZ
GK-->G1
GK-->G3
GK-->G5
GK-->G7
GK-->G9
GK-->GB
GK-->GD
GK-->GF
GK-->GH
GK-->GJ
GK-->GM
GK-->GO
GK-->GQ
GK-->GS
GK-->GU
GK-->GW
GK-->GY
GK-->H0
GK-->H2
GK-->H4
GK-->H6
GK-->H8
GK-->HA
GK-->HC
GK-->HE
GM-->HX
GO-->HX
GQ-->GH
GS-->HX
GU-->GH
GU-->HE
GW-->FZ
GW-->GH
GW-->HE
GW-->HX
GY-->HX
H0-->HX
H2-->FZ
H2-->2T
H4-->FT
H4-->FZ
H4-->GH
H4-->GY
H4-->HE
H4-->10
H4-->HX
H6-->HX
H8-->H0
H8-->HE
H8-->HX
HA-->HX
HC-->HX
HE-->HX
HG-->HP
HK-->HU
HN-->HU
HO-->HP
HP-->HU
HT-->HU
HU-->W
HX-->HG
HX-->HH
HX-->HI
HX-->HJ
HX-->HK
HX-->HL
HX-->HM
HX-->HN
HX-->HP
HX-->HO
HX-->HQ
HX-->HR
HX-->HS
HX-->HU
HX-->HV
HX-->HW
HX-->HY
HX-->HZ
HX-->I0
HX-->I1
HX-->I2
HX-->I3
HX-->I4
HX-->I5
HX-->I6
HX-->I7
HX-->I8
HX-->I9
HX-->IA
HX-->IB
HX-->IG
HX-->IH
I1-->HU
I4-->HN
I4-->I5
I5-->HN
I8-->HK
```
