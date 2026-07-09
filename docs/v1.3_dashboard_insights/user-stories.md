# Money Mosaic — v1.3 Dashboard insights

Deeper dashboard analytics on top of the existing per-range income/expense/category stats (FR-STAT-1..7). Where v1.1 changed *what counts* for joint accounts and v1.2 automates *categorisation*, v1.3 is about giving more context to numbers the user already sees: how does this category compare to recent history, what's the underlying spending rate, and how does this period stack up against the same period last year. All of it is derived from existing `Transaction`/`Category`/`Account` data — no new Dexie tables, no new user input.

**Two comparison mechanisms, don't conflate them:**
- **Rolling window** (STAT-04): compares the selected range to the *n* preceding/following ranges of the same length — good for short/medium-term trend ("is this month unusual for groceries").
- **Year-over-year** (STAT-07): compares the selected range to the *same calendar dates* one or more years back — good for long-term trend and seasonal effects ("do I always spend more in December").

## 6. Statistics & Dashboard (FR-STAT)

- [ ] As a user reviewing my spending, I want to see my top-5 expense categories for the selected range compared against the 4 nearest same-length periods (average, highest, lowest), so I can tell whether this period's spend in a category is normal or an outlier ([TICKET-STAT-04](./tickets/TICKET-STAT-04-category-period-comparison.md), adds FR-STAT-8)
- [ ] As a user, I want to see my average spending per day/week/month for the selected range, so I have a normalised rate I can compare across ranges of different lengths ([TICKET-STAT-05](./tickets/TICKET-STAT-05-average-spending-rate.md), adds FR-STAT-9)
- [ ] As a user, I want to see how much I spend on weekdays vs. weekends, so I can tell whether my spending habits differ by day type ([TICKET-STAT-06](./tickets/TICKET-STAT-06-weekday-weekend-split.md), adds FR-STAT-10)
- [ ] As a user looking at a month/quarter/year, I want to compare it to the same period in previous years, so I can see whether I'm trending up or down year-over-year rather than just month-over-month ([TICKET-STAT-07](./tickets/TICKET-STAT-07-year-over-year-comparison.md), adds FR-STAT-11)
- [ ] As a user, I want to see my largest individual transactions for the selected range, so a one-off big expense doesn't hide inside a category total ([TICKET-STAT-08](./tickets/TICKET-STAT-08-biggest-transactions.md), adds FR-STAT-12)
- [ ] As a user, I want to see how much of my spend in the selected range is still uncategorised (in € and as a % of expense), so I know how much of my category breakdown to trust ([TICKET-STAT-09](./tickets/TICKET-STAT-09-uncategorised-spend-visibility.md), adds FR-STAT-13)

## Considered, not ticketed yet

- **Top counterparties/merchants** — group expense by `counterpartyIban`/description regardless of category. Parked because bank description strings are messy free text (the v1.2 auto-categoriser design doc explicitly avoids a hand-coded per-bank normalizer for the same reason) — grouping by raw IBAN alone would fragment the same merchant across multiple IBANs and grouping by raw description text would produce noisy, near-duplicate entries. Worth a ticket once there's a normalisation story (v1.2 categoriser or a dedicated one), not before.
- **"Biggest movers"** — which categories changed the most vs. their historical average. Folded into TICKET-STAT-04's acceptance criteria instead of a separate ticket, since it's the same comparison data re-sorted by delta rather than by total.
- **Recurring/subscription cost total** — already tracked in [../v2/requirements.md](../v2/requirements.md) under "subscription/recurring detection"; not duplicated here.
