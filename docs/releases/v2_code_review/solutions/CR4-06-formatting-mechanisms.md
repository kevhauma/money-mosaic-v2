# CR4-6 — Three formatting mechanisms + locale drift: options

Finding: [CR4-6](../code-review.md#cr4-6--settings-driven-formatting-has-three-coexisting-mechanisms-and-one-of-them-already-drifted). Settings-driven formatting flows through (a) two independent module-level signal channels (`currency-format.ts`, `date-format.ts`), (b) pipes over (a), and (c) five hardcoded `'en-BE'` `Intl` formatters that ignore the locale setting — a live user-visible inconsistency.

This splits into two decisions of very different urgency: **the drift fix** (percentages/ratios/month names ignoring the setting — effectively a bug) and **the channel consolidation** (architecture). They're separable; only the first is urgent.

## Part 1 — The drift fix (near-mandatory under every architecture option)

Introduce locale-aware `formatPercent` (and a fraction-digits/sign-display options bag covering the three current variants), plus locale-aware ratio and month-name formatting, in `shared/utils`, reading whatever locale source Part 2 lands on (in the interim: the existing signal in `currency-format.ts`). Then delete all five hardcoded formatters:

- 3× `PERCENT_FORMATTER` (dashboard-overview, category-breakdown-panel, category-comparison-panel — two identical, one with `maximumFractionDigits: 0` + `signDisplay: 'never'`)
- `RATIO_FORMATTER` (weekday-weekend-split-panel)
- `MONTH_NAME_FORMATTER` (`date-buckets.ts` — note: check whether this one's output is *display* or *bucketing keys* before touching; if any consumer treats month names as identifiers, localizing it changes data, not display, and it needs a display-only seam instead)

Two design details worth deciding once: percent formatters must be **rebuilt when the locale changes** (a `computed(() => new Intl.NumberFormat(locale(), …))` per variant, memoized like the existing decimal formatters — not fresh construction per call, which is slow on dashboard hot paths); and the sign-conveyed-by-icon convention (comparison panel's `signDisplay: 'never'`) should be a named variant so the next panel doesn't re-derive it.

## Part 2 — Channel consolidation options

### Option A — One formatting-settings module (keep the pattern, dedupe it)

Merge the two private `locale` signals into a single module (e.g. `shared/utils/format-settings.ts`) holding `locale`, `currencySymbol`, `currencySymbolPosition` with one `syncFormatSettings(settings)` entry point; `currency-format.ts`, `date-format.ts`, and Part 1's percent module all read it. `AppSettingsStore`'s three `onInit` effects collapse to one.

- Wins: kills the duplicate channel and the four-setter fan-out with minimal disruption; the module-signal *pattern* stays, but there's exactly one instance of it, documented in one place.
- Costs: the hidden-global-channel property remains (anything can call the setter; the store's effect is the sync point by convention only). This is the "smallest fix that fully addresses the duplication" option.

### Option B — Dependency-injected formatting service

Replace the module signals with a `providedIn: 'root'` service reading `AppSettingsStore` directly; pipes and components inject it.

- Wins: no hidden channel, standard Angular testing/override ergonomics, the store effect sync disappears entirely.
- **The known blocker, stated honestly:** `formatCurrency` is called from non-DI contexts — ECharts tooltip formatter callbacks and module-level chart config — which is *why* the module-signal design was chosen (the code comments say so). Option B therefore needs one of: passing formatter functions into chart setup at construction time (threading), an `inject()`-at-setup-then-close-over pattern, or keeping a thin module-level façade over the service for non-DI callers — at which point Option B has quietly become Option A with extra layers. Only worth it if the team values DI purity over the added threading; the review does not treat (a) as wrong, just duplicated.

### Option C — Formatting as pipes/components only

Push all formatting to template pipes (`localeDate`, `signedAmount`, a new `percent` pipe) and ban direct `formatCurrency()` calls from components.

- Reality check: charts and computed VMs (`formattedTotal`, tooltip strings) genuinely need string formatting *in TS*, not in templates — the VM-completion direction of CR4-1 moves formatting *into* class code, directly against this option. Listed because it comes up naturally; it fights the codebase's chosen direction and should be rejected explicitly.

## Part 3 — Recurrence guard (cheap, compatible with everything)

An ESLint `no-restricted-syntax` rule flagging `new Intl.NumberFormat`/`Intl.DateTimeFormat` with a **string-literal locale** outside `shared/utils` — the exact shape of all five drift instances. Mechanical, zero runtime cost, and turns "remember the convention" into "the linter remembers." (A fallow rule-pack `banned-call` is an alternative carrier for the same guard if the lint config is preferred lean.)

## Suggested composition

Part 1 alone fixes the user-visible bug and can ship immediately with the interim locale source. Part 2 Option A is the natural companion (small, and Part 1 wants a home anyway). Part 3 under any outcome. Option B only if non-DI callers get resolved as a side effect of other chart work; Option C rejected.
