# CR4-5 — Settings page as an unbounded accumulator: options

Finding: [CR4-5](../code-review.md#cr4-5--the-settings-page-is-becoming-an-unbounded-accumulator). One component/template hosts the theme picker, accent row, currency symbol/position, locale, the embedded data-management panel, and the GitHub/about links — and nothing structural routes the next setting anywhere else.

**Decide CR4-8/CR4-13 first.** Whether data management stays embedded or becomes a `/settings/data` child route changes this page's shape more than any option below; sequencing this doc's work before that decision risks doing it twice.

## Option A — Section components, one per concern

Extract `settings-theme-section`, `settings-accent-section`, `settings-currency-locale-section`, `settings-about-section` (grouping to taste — theme+accent plausibly stay together since the accent row renders *inside* the theme list positionally). Each owns its controls, its store wiring, and its slice of template; `settings-overview` becomes a page header plus a stack of sections.

- Wins: each future setting (PRIV-01 is already open) lands as a new small component instead of another 40 lines on the pile; the two change-reasons currently converging here (settings vs. data management) separate; section specs shrink from "mount the whole settings page" to per-concern fixtures.
- The boilerplate to watch: the control↔store sync dance (`valueChanges.subscribe` + `effect` write-back with `emitEvent: false`) exists **twice** in the component today (currency symbol, locale) and would be copied into each form-bearing section. A tiny helper — `linkControlToSetting(control, read, write)` in `shared/utils` — would keep sections honest; without it, Option A multiplies the pattern CR4-6 already complains about at module level.
- Cost: component-count overhead for what is, today, a 171-line class. This option is *pre-paying* for growth; if the settings surface were frozen, it wouldn't clear the bar.

## Option B — Child routes (tabs/sections as routes)

`/settings/appearance`, `/settings/formatting`, `/settings/data`, `/settings/about` as lazy child routes under the settings shell — the shape the original TICKET-SET-06 pointed toward.

- Wins: deep-linkable sections; per-section lazy chunks (the data-management code — file pickers, JSON export logic — stops loading for someone changing their theme); the accumulation problem becomes a routing table, which is self-organizing.
- Costs: a real UX change (today's single scrollable settings page becomes navigation — needs the browser-verification pass the project's rules require); more ceremony per new setting than Option A; and for the current volume of settings, four routes hosting one control each would be structure outrunning content. Most attractive *if* CR4-8 resolves toward "route" anyway — then the routing shell must exist regardless and sections can migrate into it incrementally.

## Option C — Convention only, no restructuring now

Add one rule to the conventions/project-map docs: "each new setting ships as its own section component under `feature-settings/components/`, composed into the overview" — i.e., adopt Option A's *shape* prospectively without retro-fitting the existing four sections.

- Wins: zero immediate cost; stops the growth-by-default dynamic, which is the actual finding.
- Cost: the existing monolith stays; the first author to add a section component next to 170 lines of inline sections will feel the inconsistency. C degrades gracefully into A (retrofit later, section by section).

## Notes that hold under every option

- The `DataManagementOverviewComponent` embed importing across features via the barrel is legal per house rules — the *coupling* concern is that settings-overview's spec/render now transitively exercises another feature's component. Any of A/B/C isolates that.
- The accent-swatch logic (`accentSwatch`, `defaultAccentSwatch`, `lastDefaultThemeId`) is theme-domain knowledge living in a settings component; if Option A happens, it belongs in the theme section component or `core/theme` — worth doing in the same motion, not separately.
