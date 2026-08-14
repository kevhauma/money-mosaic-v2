# Money Mosaic — v1.8 Extended Date Range Picker (Overview)

Rebuilds the date-range control the app has carried since v1.0 into the two-panel, power-user picker
sketched in [requirements.md](./requirements.md) — a Grafana-style popover pairing a searchable
quick-range catalogue with a free-text absolute panel that accepts **relative expressions**
(`now-30d`, `now/M`) and remembers what you picked last time.

The lineage is [TICKET-STAT-01](../v1.0_foundation/tickets/TICKET-STAT-01-custom-range-enable.md) →
[STAT-03](../v1.0_foundation/tickets/TICKET-STAT-03-expanded-range-presets-default-grouping.md) →
[STAT-10](../v1.1_joint_accounts/tickets/TICKET-STAT-10-unified-date-range-picker.md) →
[STAT-16](../v1.3_dashboard_insights/tickets/TICKET-STAT-16-date-range-prev-next-navigation.md), all
of them **FR-STAT-7**, and STAT-16 already names this folder as its successor. This version revises
FR-STAT-7 rather than adding a requirement family: it is the same requirement — *pick a date range* —
with a much larger surface.

**The one structural change** is that a range stops being two frozen ISO dates and becomes a pair of
*expressions* that re-resolve on every read. `now-30d` bookmarked today still means "the last 30
days" next month; today's `{from: '2026-07-15', to: '2026-08-14'}` would not. Everything downstream
(`StatsStore`, every panel, every chart) keeps consuming resolved `YYYY-MM-DD` strings and needs no
edit — the resolution happens inside `RangeStore`.

## Scope decisions taken up front

The sketch is Grafana's domain — observability, timestamps, timezones — transplanted onto a
date-only finance app, so four questions had to be answered before it could be ticketed. All four
are settled here and referenced by the tickets rather than re-argued in each:

1. **Relative expressions: yes, with a real parser — but date-only.** `now`, `now-30d`, `now/M` and
   combinations are parsed, stored and re-resolved. Hour/minute units (`now-6h`) and the
   `2025-07-10 15:00` datetime form are **rejected with a message**, and the sketch's timezone footer
   row (`Browser Time · Belgium · UTC+02:00 · Change settings`) is **dropped entirely** — a
   `Transaction` carries a date, not a datetime, so an hour-level range cannot narrow any result in
   this app.
2. **Recents persist in `appSettings`** — an additive field on the existing singleton row, so this
   version ships **no Dexie schema change** (`.stores()` declares indexes, not fields; same
   precedent as `excludedIncomeCategoryIds` and `careerStartDate`). Recents are global, not per page.
3. **The full quick-range catalogue ships, fiscal included** — which means a fiscal-year-start
   setting has to exist first, hence [SET-09](./tickets/TICKET-SET-09-fiscal-year-start-setting.md).
4. **Three pages, not four.** The picker replaces `mm-range-grouping-switcher` on Dashboard, Explore
   and Accounts. The Transactions filter keeps its standalone `mm-date-range-input` — it is a filter
   field inside a reactive form with its own `from`/`to` route-input contract, not a period selector,
   and folding it in would mean reconciling two different URL contracts for no user-visible gain.

## Recommended order

- [ ] [TICKET-STAT-35](./tickets/TICKET-STAT-35-relative-range-expressions.md) — Relative range
      expressions: parse, resolve and re-serialise `now`, `now-30d`, `now/M` (extends FR-STAT-7) —
      **first**, and pure utility code with no UI: every other ticket in this version resolves a
      range through it
- [ ] [TICKET-STAT-36](./tickets/TICKET-STAT-36-expression-backed-range-state.md) — `RangeStore`
      holds expressions and re-resolves them on read, including in the URL (revises FR-STAT-7) —
      **needs STAT-35**; the one structural change in this version, and the reason a bookmarked
      relative range stays relative
- [ ] [TICKET-SET-09](./tickets/TICKET-SET-09-fiscal-year-start-setting.md) — Fiscal year start
      month in Settings (new capability, no existing FR covers it) — **independent of the two above**
      and shippable any time, but **needed by STAT-37**'s two fiscal quick ranges
- [ ] [TICKET-STAT-37](./tickets/TICKET-STAT-37-quick-range-catalogue.md) — The quick-range
      catalogue: 21 grouped ranges expressed as expression pairs, six existing ids renamed (revises
      FR-STAT-7) — **needs STAT-35 and SET-09**; still data-only, consumed by the picker UI next
- [ ] [TICKET-STAT-38](./tickets/TICKET-STAT-38-two-panel-range-picker.md) — The two-panel picker
      popover: trigger, searchable quick-range panel, prev/next preserved (revises FR-STAT-7) —
      **needs STAT-36 and STAT-37**; this is the ticket that retires
      `mm-range-grouping-switcher` on all three pages
- [ ] [TICKET-STAT-39](./tickets/TICKET-STAT-39-absolute-panel-apply-staging.md) — The absolute
      panel: typed expressions, a calendar that doesn't clobber the text, and Apply-staged edits
      (revises FR-STAT-7) — **needs STAT-38** for the panel to live in, and STAT-35 to validate what
      is typed
- [ ] [TICKET-STAT-40](./tickets/TICKET-STAT-40-recently-used-ranges.md) — Recently used ranges,
      persisted and global (revises FR-STAT-7) — **needs STAT-39**; last because a recent range fills
      the absolute panel's inputs, which do not exist until then

## Resolved from the sketch

Points [requirements.md](./requirements.md) left ambiguous, decided in the ticket named:

- **"History `[🕘]`" vs "Recent values `[📋]`" vs the "Recently used" list** — three surfaces for one
  concept. Collapsed to a single list, no separate buttons ([STAT-40](./tickets/TICKET-STAT-40-recently-used-ranges.md)).
- **Two search boxes** (header `[ Search ]` and the right panel's `🔍 Search quick ranges`) — one
  control, in the quick-range panel ([STAT-38](./tickets/TICKET-STAT-38-two-panel-range-picker.md)).
- **"Closes on Esc/outside click *unless* there are unapplied edits"** — the sketch never says what
  happens instead. Resolved: the popover stays open and marks the unapplied state
  ([STAT-39](./tickets/TICKET-STAT-39-absolute-panel-apply-staging.md)).
- **Mixed commit model** — quick ranges apply instantly while typed edits stage until Apply. Kept,
  with the collision spelled out: picking a quick range discards staged edits
  ([STAT-39](./tickets/TICKET-STAT-39-absolute-panel-apply-staging.md)).
- **Where prev/next lives** — the sketch's interaction model preserves
  [STAT-16](../v1.3_dashboard_insights/tickets/TICKET-STAT-16-date-range-prev-next-navigation.md)'s
  stepping but its layout has nowhere to put the chevrons. Resolved: they stay outside the popover,
  flanking the trigger ([STAT-38](./tickets/TICKET-STAT-38-two-panel-range-picker.md)).
- **"Dark-themed popover, ~850×500px"** — the app has nine themes and a standing no-fixed-dark rule.
  The picker is theme-driven and its panels stack below `md`
  ([STAT-38](./tickets/TICKET-STAT-38-two-panel-range-picker.md)).
- **Duplicate quick ranges** — the sketch's list overlaps today's by four entries under different
  names ("Previous month" = `last-month`, "This year so far" = `year-to-date`, …). Deduped, with the
  full rename table in [STAT-37](./tickets/TICKET-STAT-37-quick-range-catalogue.md).

## Considered, not ticketed

- **The Transactions filter adopting the picker** — see scope decision 4 above. Worth revisiting only
  if the two `from`/`to` URL contracts are unified first.
- **A grouping-granularity control in the popover.** Granularity has been per-chart since
  [TICKET-STAT-15](../v1.3_dashboard_insights/tickets/TICKET-STAT-15-independent-trend-chart-bucket-controls.md) and
  session-held by `ChartOptionsStore`; pulling it back into a global control would reverse a decision
  two versions have since built on.
- **Comparison ranges** ("this month vs last month" in one picker). A genuinely useful feature and a
  much larger one — it changes what a *range* is for every consumer, not just how it is picked.
