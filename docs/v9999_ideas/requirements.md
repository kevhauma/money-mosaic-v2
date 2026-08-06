# Ideas

## Competitive analysis
- see [competitive-analysis.md](./competitive-analysis.md) — gaps/strengths vs Monarch Money & co (biggest gaps: budgets, goals, recurring/bill calendar, manual assets for net worth)


## Food voucher support
- ability to add food vouchers to an account, counts as income,
- being able to set active date range, with linked expense category expense (eg. groceries)
  
## P2P multi-device sync
- being able to sync between devides
- WebRTC Datachannels, handshake via pair code? possibly needs server
- scannable QR code that shares the data? needs compression

## Extra graphs
> **Graduated to [v2.1_extra_graphs](../v2.1_extra_graphs/overview.md)** — all three lines below are worked out as seven
> tickets there (heatmap as a Dashboard row, Sankey + 3D on a new `/explore` page). Kept here as the origin of that
> version; a "chart builder" (freeform measure × dimension × period) is the one graph idea deliberately *not* ticketed —
> see that version's "Considered, not ticketed yet".

- heatmaps, day of week/month/quarter (buckets), top 4 categories rows | example: https://echarts.apache.org/examples/en/editor.html?c=heatmap-cartesian or https://echarts.apache.org/examples/en/editor.html?c=matrix-simple
- sankey, income, intermediate, outcome. outside -> accounts -> category groups if exist -> category (how to deal with savings accounts?) | example https://echarts.apache.org/examples/en/editor.html?c=sankey-levels
- cool fancy 3d graph? 
  
## Public Ready
- privacy mode, no specific numbers, blurred or skeleton loaders, or gone entirely, from UI and graphs
- ...