# CR4-1 — Template complexity: options per component

Finding: [CR4-1](../code-review.md#cr4-1--complexity-has-migrated-from-classes-into-templates). Class-side logic is clean after three reviews; the highest cognitive-complexity units are now the templates themselves. This doc goes through each flagged component individually, because "template complexity" has at least four distinct root causes here and they don't share one fix.

## The four patterns behind the numbers

Naming these once, so the per-component sections can refer to them:

- **P1 — Unfinished view models.** A `computed()` builds a VM but stops one mapping short, so the template re-derives display facts (colors, icons, labels) with inline ternaries. The project already has the discipline (`CR-2.3`/`CR-2.5` comments in the code call it out); it's just applied unevenly.
- **P2 — Method calls in loops.** `@for` rows call component methods per row (`balanceFor(account)`), which is both a readability and an OnPush-change-detection cost. Same VM discipline, loop-shaped.
- **P3 — Repeated card/row units inline.** A visually self-contained unit (an account card, a comparison card, a condition row) lives inline in the parent template, so the parent's branch count is the sum of all its units'.
- **P4 — State-shape branching.** `@if`/`@else if` ladders that re-derive *which situation we're in* from several independent signals, instead of switching once on a single discriminated state.

A fifth option applies everywhere and is covered at the end: **measuring** template complexity so it can't silently regress again.

---

## 1. `import-wizard.component.html` — cognitive 45, cyclomatic 26 (127 lines)

The worst template, and the one where the complexity is *least* visible from its line count. Three concentrations:

**(a) The Next-button `disabled` expression (lines 36–44)** — a seven-condition boolean spanning two steps' worth of rules (`step===1 && !canAdvanceFromStep1`, `step===2 && (!mapResult || parsing || committing || parseError || headerMismatch)`), inline in a property binding.
**(b) The CTA label ladder (lines 47–59)** — nested `@if` choosing between `Importing…`/`Parsing…`/`Confirm & continue`/`Confirm import`/`Next` from four signals.
**(c) The step-2 nesting (lines 73–105)** — `@if (currentFile) → @if (currentAccountId) → @if (showManualMapStep) → @else → @if (headerMismatchMessage)`: four nested levels re-deriving one question ("which of the three step-2 views is showing?").

Note that (a) and (b) are the *same state* rendered twice — the conditions that disable the button are the conditions that pick its label. That points at the cleanest option:

- **Option A — a CTA view model (P1).** One `computed()` in the class returning e.g. `{ label: string; disabled: boolean }`, derived in a single place from `step`/`parseState`/`committing`/`canAdvanceFromStep1`. The template binds two fields. This moves ~13 template branches into one testable computed, and makes the disable/label invariant ("the button never says *Confirm import* while disabled for parsing") checkable in the component spec. Cheapest, no structural change, biggest single win.
- **Option B — a step-2 view discriminant (P4).** One `computed()` returning a union like `'manual-map' | 'batch-waiting' | 'batch-mismatch' | 'not-ready'`, rendered with a single `@switch`. Collapses the four-level nesting to one level and gives the "batch waiting" paper (lines 90–102) an explicit name. Pairs with Option A; also cheap.
- **Option C — extract the batch-wait card (P3).** The lines 90–102 paper (message + filename + "Map this file individually" button) as a dumb component. Only worth it if Option B alone doesn't get the template under control — it's a small, single-use unit, so the component boundary buys less here than elsewhere.
- **Interaction:** any deeper restructuring of the wizard (CR4-2's state machine options) would produce Option A/B's computeds as a side effect — if CR4-2 Option A or B is chosen, do *not* spend effort here first. If CR4-2 is deferred, A+B here are safe standalone moves that don't prejudge it.

Option C

## 2. `category-comparison-panel.component.html` — cognitive 48 (109 lines)

The clearest **P1** case in the app, with irony attached: the class already builds `CategoryComparisonVm` explicitly "so the template stays method-free (CR-2.5)" — but the VM carries `deltaTone` and `deltaDirection`, and the template then re-maps both:

- lines 53–59: `deltaTone === 'warning' ? 'warning' : deltaTone === 'success' ? 'success' : undefined` — a nested ternary that maps a value *onto itself*;
- lines 62–66: `deltaDirection === 'up' ? 'tablerTriangleFill' : 'tablerTriangleInvertedFill'`.

- **Option A — finish the VM (P1).** Replace `deltaTone`/`deltaDirection` on the VM with the fields the template actually binds: `deltaColor` (already the same union) and `deltaIcon` (the icon name string). The two ternaries — the bulk of the cognitive score — get deleted outright. Near-zero risk; the VM's spec already exists to extend. Worth doing regardless of anything else.
- **Option B — extract a `comparison-category-card` (P3).** The per-category `mm-paper` (lines 38–99: header + delta badge + bar row + avg/high/low footer) as a presentational component taking one `CategoryComparisonVm`. The panel template drops to: header, exclude-dropdown, a grid of cards, empty state. This is the strongest P3 candidate among the dashboard panels because the unit is already VM-shaped — the input type exists.
- **Option C — nothing beyond A.** Defensible: after Option A the remaining branching (`hasEnoughData`, the exclude dropdown, the bar loop) is genuinely this panel's job. B is an improvement, not a necessity.
- **Also worth knowing:** the class-side `categories` computed does windowing, formatting, scaling, and drill-down param assembly in one pass — if it grows again, splitting bar-VM assembly into a module function (testable without TestBed) is the natural seam. Its `PERCENT_FORMATTER` is part of CR4-6 and should not be "fixed" locally here.

Option A and B

## 3. `accounts-overview.component.html` — cognitive 26 (139 lines)

The clearest **P2** case: the `@for` card calls five component methods per account — `balanceFor(account)` (twice: color + value), `shareFor(account)` (twice, plus a `!` assertion), `isFirst(account)`, `isLast(account)`, `accountIconName(account.icon)` — exactly the per-row `.find()` shape the project eliminated from the transactions table in CR-2.3.

- **Option A — an `AccountCardVm` (P2→P1).** One `computed()` joining accounts with balances, shares, sort position, and resolved icon name into `{ account, balance, shareDisplay: string | null, isFirst, isLast, iconName, ibanTail }[]`. Deletes every method call and the `!` assertion from the template; matches the established `rows()` precedent so it needs no new convention. The methods it replaces likely become private helpers of the computed or disappear.
- **Option B — extract an `account-card` component (P3), fed by Option A's VM.** Takes the VM row plus emits `edit`/`archive`/`delete`/`moveUp`/`moveDown`. Worth it if the accounts overview is expected to keep growing (it's on an accelerating churn trend — 13 commits); otherwise A alone halves the template.
- **Shared-fragment note:** the `dataReady() ? balance : skeleton` + "Your share" block appears here *and* in `accounts-detail` (below). If both A here and the detail page's option are taken, a tiny shared `account-balance-block` presentational component would deduplicate it — but don't create it pre-emptively for one-and-a-half uses; note it and let the second real need decide.

Option A and B

## 4. `accounts-detail.component.html` — cognitive 25 (109 lines)

**The mildest of the six — acceptance is a legitimate option here.** Its score comes from breadth (page header actions, balance block, contributor breakdown, two confirm dialogs, not-found state), not from any single knot. There is no ladder deeper than two levels and no inline derivation worse than `account.archived ? 'Unarchive' : 'Archive'`.

- **Option A — accept, with the two micro-cleanups.** Precompute `shareDisplay` (kills the `share()!` assertion) and the archive label/icon pair (one tiny VM for the toggle button, shared in shape with the overview card's identical dropdown item). Total diff is a few lines.
- **Option B — only if pattern-hunting:** the balance block extraction shared with `accounts-overview` (see above). Nothing else here justifies a component boundary.
- Flagging this one honestly matters for calibration: if a future gate is added on template complexity (see "Guarding" below), this file is evidence that the threshold should sit above ~25, not at it.

Option A and B

## 5. `transactions-overview.component.html` — cognitive 25 (166 lines)

Page-level orchestration (alert → transfer review → filters → bulk bar → skeleton/empty/table ladder) that is *supposed* to live here, plus three genuine irritants inside the row loop:

- **(a) the checkbox `aria-label` built by string concatenation in the template** (lines 70–75), which is why `formatDate` is exposed as a bare class field;
- **(b) the per-row category `<select>`** rendering the full `activeCategories()` option list × 50 rows — a readability *and* rendering-cost issue (≈50·N options re-evaluated on category changes);
- **(c) the `$any($event.target).value` cast** feeding `onCategoryChange`.

- **Option A — extend the existing `rows()` VM (P1).** Add `ariaLabel` (kills (a) and the `formatDate` field exposure) and `categoryId: string` (the selected value as a string, simplifying option `[selected]` logic). Smallest move, no new files.
- **Option B — a `category-select-cell` component (P3)** taking `options` + `selectedId`, emitting a typed `number | undefined`. Solves (b)'s readability and (c)'s cast in one place; the options array is passed once per row but the *template* for it exists once. If the inline quick-set select ever appears elsewhere (it's ticket-adjacent to bulk categorisation), this component is where it consolidates.
- **Option C — a full `transaction-row` component.** Probably **over-extraction**: the row's cells are heterogeneous and coupled to the page's selection/edit/unlink handlers; the boundary would be seven inputs and five outputs wide. The interesting complexity is (a)–(c), which A+B already cover. Recording this as a considered-and-rejected option is worth as much as the accepted ones.
- **Note:** the top-level skeleton/empty/table ladder should stay — replacing legitimate page states with indirection would be worse than the score it saves.

Option A, B, and C

## 6. `rule-form.component.html` — cognitive 22 (149 lines)

One cause: the per-condition row (lines 58–134) with its **four-way value-editor branch** (`isAccountField` → account select; `isBetween` → min/max pair; `isNumericField` → number input; else → text input + regex-length error). Everything else in the modal is a flat form.

- **Option A — a single editor discriminant (P4).** Replace the three boolean helpers with one `editorKindFor(group): 'account' | 'between' | 'numeric' | 'text'` and one `@switch`. The branch count is unchanged but becomes exhaustive, ordered, and nameable — and the class loses two of three semi-redundant helpers. Cheapest.
- **Option B — extract a `rule-condition-row` component (P3).** The row is used from a `FormArray`, so the child needs the standard `ControlContainer`/`viewProviders` wiring (or takes the `ConditionGroup` as an input, which the codebase already does informally — the template passes `group` to helpers). Prior art in-repo: TICKET-SOLID-06 extracted `attribution-override-fieldset` out of the transaction edit form under the same constraints, so the pattern is proven here. Moves `operatorsFor`, the field/operator change handlers, and Option A's discriminant into the child, where they're cohesive.
- **Which:** A alone if the rule form is considered done; B if rule conditions are expected to grow more editor kinds (the operator/label single-sourcing from CAT-05 suggests this area does keep growing). B without A would be a missed opportunity — do A inside B.

Option A and B

---

## Guarding the trend (applies to all six)

Whatever subset above is taken, the finding's *systemic* half — "complexity migrated somewhere the tooling didn't watch" — has its own options:

- **Option G1 — put template findings in the Fallow gate.** Fallow already scores Angular templates (that's where these numbers come from); the audit baseline (CR4-14's doc) can include them so a template crossing the threshold fails the same pre-commit/`fallow:audit` path as class code. Needs a threshold calibrated against the survivors — per §4 above, somewhere above the mid-20s, so page orchestrators pass and the wizard/comparison-panel shapes don't.
- **Option G2 — write the rule down.** One paragraph in the coding-conventions skill (lands naturally in CR4-12's edit): *"templates may branch on state; they may not derive state — no nested ternaries, no method calls inside `@for`, display mappings (colors/icons/labels) belong on the VM."* All four patterns above are instances of that sentence.
- **Option G3 — do nothing systemic** and rely on review culture. Given this exact drift happened while three reviews were actively watching the `.ts` side, this option is listed for completeness rather than advocacy.

Option G1 and G2