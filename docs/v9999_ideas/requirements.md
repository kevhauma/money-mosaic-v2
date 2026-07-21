# Ideas

## Competitive analysis
- see [competitive-analysis.md](./competitive-analysis.md) — gaps/strengths vs Monarch Money & co (biggest gaps: budgets, goals, recurring/bill calendar, manual assets for net worth)

## Code Review
- fine tune review process after tickets

## UX improvements
- go over every screen and list what is wrong
- make dashboard more flexible, optional hiding/settings in certain panels
- improve flows, quick category maker, rule from filter,..

## Food voucher support
- ability to add food vouchers to an account, counts as income,
- being able to set active date range, with linked expense category expense (eg. groceries)
- 

## Extra graphs
- heatmaps, day of week/month/quarter (buckets), top 4 categories rows | example: https://echarts.apache.org/examples/en/editor.html?c=heatmap-cartesian or https://echarts.apache.org/examples/en/editor.html?c=matrix-simple
- sankey, income, intermediate, outcome. outside -> accounts -> category groups if exist -> category (how to deal with savings accounts?) | example https://echarts.apache.org/examples/en/editor.html?c=sankey-levels
- cool fancy 3d graph? 
  
## Public Ready
- Home page with explanation about the app, with click through to the dashboard
- How-to's for using the app
- FAQ about more complex features of the app
- Make sure the user gets informed about data never leaving the browser, use export/import to migrate to another browser.
- App settings for currency, locale (for currency formatting)  
- Changelog page, generated from tickets/user stories that are done, either a change log generator that runs on build/deploy, or an extra step in each ticket/version to update the changelog. add to skills
- privacy mode, no specific numbers, blurred or skeleton loaders, or gone entirely, from UI and graphs
- ...