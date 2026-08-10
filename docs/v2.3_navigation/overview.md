# Money Mosaic — v2.3 Navigation (Overview)

The app has grown to thirteen routes and the sidebar still lists eight of them as one undifferentiated
column. But they are not one kind of thing: Dashboard, Income and Explore are places you go to **look
at** your money, and Accounts, Transactions, Categories, Learning and Import are places you go to
**feed or shape** it. That distinction is already in the nav's reading order — it's just never been
drawn. This version draws it, and then uses it.

**Two tickets, one idea.** [UI-26](./tickets/TICKET-UI-26-grouped-sidebar-navigation.md) splits the
sidebar into an "Insights" group and a "Data" group — labelled headings over always-expanded lists,
never collapsible, so nothing that is one click away today becomes two.
[PRIV-02](./tickets/TICKET-PRIV-02-hide-amounts-on-every-insight-page.md) then treats that grouping as
a contract: the "Hide amounts" toggle
[TICKET-PRIV-01](../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md) built for the Dashboard
belongs on **every** page in the Insights group, and nowhere in the Data group. A page you look at is
a page you might need to blank; a page you type into is not.

**No new routes, no new requirement family, no schema change.** Both tickets are structural: one moves
markup and adds two headings, the other extracts one control into `shared/ui` and gives it to the two
pages that were missing it. The only genuinely new behaviour is Income finally honouring a setting it
has been ignoring since PRIV-01 shipped — Explore already blurs its figures, it just had no way to say
so without a trip to the Dashboard first.

**Where `/future` lands.** [TICKET-FUT-03](../v2.2_goals_and_forecast/tickets/TICKET-FUT-03-future-page-scaffold.md)
adds a Future page in v2.2 and specs its nav item "between Explore and Accounts" — precisely the
boundary UI-26 draws a heading across. Neither ticket blocks the other; whichever ships second places
Future as the last item of the Insights group and gives it the toggle. That is recorded in both
tickets rather than left to be rediscovered.

## Recommended order

- [x] [TICKET-UI-26](./tickets/TICKET-UI-26-grouped-sidebar-navigation.md) — Sidebar nav grouped into "Insights" and "Data", both groups always visible (ui-layout-spec §Navigation; no FR change) — first: it defines the classification the next ticket applies, and is independently shippable on its own merit
- [x] [TICKET-PRIV-02](./tickets/TICKET-PRIV-02-hide-amounts-on-every-insight-page.md) — "Hide amounts" on every insight page, not just the Dashboard (extends TICKET-PRIV-01) — **needs UI-26** for the Insights/Data line it draws its scope along; the shared `mm-privacy-toggle` it extracts is what any future insight page picks up for free — shipped on **four** pages (Recurring joined the Insights group after the ticket was written), with the live browser check declined by the user and left open on the ticket

## Considered, not ticketed yet

- **Collapsible groups with persisted open/closed state.** Rejected in UI-26 rather than deferred: at
  eight items the sidebar has no height problem, so collapsing would buy nothing and cost a click plus
  a piece of state to get wrong. Worth revisiting only if the nav grows past roughly a dozen items.
- **Privacy mode on the data pages** (Transactions, Accounts). A blurred Transactions list can't be
  reconciled and a blurred Accounts balance can't be checked against the bank, so extending the blur
  there needs an answer to "what does hiding mean while you're editing" that this version doesn't try
  to give. PRIV-01 named these as follow-up scope and they stay follow-up scope.
- **Masking amounts drawn inside a chart canvas** — echarts axis ticks and its own hover tooltips are
  not reachable by `mm-privacy-blur`, a residual PRIV-01 recorded. Fixing it means touching every
  chart's option-building logic and is its own ticket, not a rider on this one.
- **A keyboard shortcut for hide-amounts.** Tempting for the screen-share case, but it needs a
  shortcut registry the app doesn't have.

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development`
all pass, plus the `Fallow` code-quality check, plus a live browser check — both tickets here are
purely UI-visible, so neither can be accepted on specs alone. **No Dexie change in this version**: the
`privacyMode` field already exists on `appSettings` from
[TICKET-SET-05](../v2/tickets/TICKET-SET-05-settings-store-foundation.md)/PRIV-01, and no ticket here
adds a table, a version block or an entity. Settings are read and written through
`AppSettingsStore`/`AppSettingsRepository` only — no component touches `appSettings` directly. **No
route is added, removed or renamed**, and the production bundle budget in `angular.json` is never
raised — UI-26 adds markup, and PRIV-02's shared toggle replaces per-page code rather than adding to
it. Cross-feature imports go through the `@/shared/ui` and feature barrels as usual. Both tickets keep
the existing accessibility guarantees: nav group headings are non-interactive `<h2>`s that label their
list, and blurred figures stay unselectable while their links, labels and charts stay usable —
PRIV-01's rule that **numbers blur and charts don't** holds everywhere the blur is newly applied.
