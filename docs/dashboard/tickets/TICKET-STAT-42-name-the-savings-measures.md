# TICKET-STAT-42 — Name what each savings measure actually counts

- **Area:** Stats / Dashboard
- **Released in:** [v2.3 UX review](../../releases/v2.3_ux_review/overview.md)
- **Type:** Bug fix
- **Traceability:** UX review (UXR-1); extends FR-STAT-2 — three surfaces answer "how much do I save?" with three different numbers and none states its definition

## User story

As someone reading my dashboard, I want each savings figure to say what it measures, so that two numbers differing five-fold stop looking like a bug in my own data.

## Current situation (as-is)

Three surfaces answer the same user question with three different numbers, all unlabelled:

- **"Savings rate 10.7%"** — [period-stats.ts:53](../../../src/app/core/stats/period-stats.ts) computes `savingsRate: income === 0 ? null : savings / income`, where `savings` counts **only money actually moved into savings accounts**.
- **"57.1% of income kept"** — [net-margin.ts](../../../src/app/core/stats/net-margin.ts) is a different measure entirely; its own header comment says it is "distinct from `savingsRate` (which only counts money actually moved into savings accounts) (TICKET-STAT-21)".
- **"You saved about €1,600.10/month"** on `/future` — a third framing again.

The first two render as adjacent tiles in the same KPI strip on `/dashboard`. Both are correct. Nothing on any of the three surfaces names its definition, so the only way to learn why they differ is to read `net-margin.ts`.

The definitions are already written down — they live in code comments, where the user cannot reach them.

## Desired result (to-be)

- Each figure's label states what it counts, so the difference is self-evident: "Moved to savings" (10.7%) and "Kept" (57.1%) rather than two unqualified percentages.
- Each tile carries a one-sentence definition reachable from the tile itself (tooltip or info affordance), sourced from the same wording the code comments already use.
- `/future`'s monthly figure names which of the two it derives from.
- No calculation changes — this ticket is labelling only. The numbers are right; their presentation is not.

## Acceptance criteria

- [x] The dashboard tile currently labelled "Savings rate" names the measure as money moved into savings accounts, and the tile currently labelled "% of income kept" names itself as income minus all spending. (Live on `/dashboard`, July 2026: the two tiles now read **`Moved to savings` 10,7%** and **`Net cash flow` €1.597,96 / `57,1% of income kept, after all spending`**. Specs: *names the savings-transfer measure in the label itself* and *says the net tile counts income minus all spending* in [dashboard-overview.component.spec.ts](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts).)
- [x] Each of the two tiles exposes a one-sentence definition without leaving the dashboard. (New `definition` input on `mm-stat-card` renders an info affordance beside the label. Read live off both tiles: *"The share of income you actually moved into a savings account. Money left sitting in a current account does not count here — Net cash flow is the measure that counts it."* and *"Income minus everything you spent, whether what is left stayed put or moved on. The sub-label is that as a share of income."* Deliberately **not** the existing `tooltip` input: that one carries figures and is blurred under privacy mode, and hiding *what a tile counts* along with *how much* would make the card less private, not more. The affordance is a real `<button>` carrying the sentence as its accessible name, so it works by keyboard and by screen reader — daisyUI's `.tooltip` opens on `:has(:focus-visible)` as well as `:hover`. Spec: *puts a one-sentence definition on both tiles, reachable without leaving the dashboard*.)
- [x] `/future`'s "You saved about €X/month" states which measure it is derived from. (Live on `/future`: **"You saved about €1.600,10/month counting money left over"** — the exact figure this ticket cites — and, after flipping the basis toggle, **"You saved about €300,00/month counting money moved to savings"**. The wording is derived from `BASIS_OPTIONS`, which is what the toggle above it already labels itself with, so the two cannot drift. Specs: *names which of the two measures the rate is*, *takes that wording from BASIS_OPTIONS…*, *names no basis when there is no rate to name one for*.)
- [x] No change to `savingsRate` or `netMargin` arithmetic — existing stats specs pass unmodified. (`git diff` touches no file under `src/app/core/stats/`; `period-stats.ts`, `net-margin.ts` and `saving-velocity.ts` are all untouched, and their specs pass as they stand. The only changed strings on the dashboard side are labels.)
- [x] Unit tests cover: the labels render for a populated period; the definition text is present for both tiles; the zero-income case still renders the existing `null` guard rather than a label over a missing number. (Four specs under `describe('naming the savings measures (TICKET-STAT-42)')`; the zero-income one asserts the value stays `—`, the net tile's margin sub-label stays absent, and the definition is still present — it describes the measure, not the figure. `ng test`: 287 files / 3372 tests.)
- [x] Verified live in the browser: both tiles readable side by side, definitions reachable, no layout regression in the KPI strip. (Screenshotted on `/dashboard` at 1280px — the five cards wrap the same way they did, each definition icon sitting inline after its label. `data-tip` and the button's `aria-label` both carry the sentence, read straight off the live DOM.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow CI gates exit `0`. Conventions: `definition` is a typed `input()` on the primitive, the two sentences are class fields rather than template literals, and `mm-stat-card` keeps its no-store, input-only contract.)

## Notes

- Wording should come from the existing comments rather than being reinvented, so code and UI cannot drift apart again.
- Related: [TICKET-ACC-12](../../accounts/tickets/TICKET-ACC-12-unstack-balance-history-chart.md) is the other half of the same trust problem — a number that is not just unexplained but actively wrong to read off the chart.
- Out of scope: consolidating to a single savings measure. Both are genuinely useful; the defect is that neither is named.
