---
name: frontend-conventions
description: Component patterns and conventions for frontend code
paths: "**/*.ts,**/*.html,**/*.css"
---

## Common Commands

```bash
ng serve              # start dev server
ng build              # production build
ng test               # run unit tests
ng lint               # ESLint check
ng generate component feature-{name}/components/{Name}  # scaffold a standalone component (creates its own folder by default — do not pass --flat)
```

## Architecture

`src/app/` is organized into tiers:
- `app.routes.ts` — top-level lazy route table
- `core/` — singleton services, app-wide guards/interceptors, the Dexie database and its repositories
- `feature-{name}/` — colocated domain modules (accounts, transactions, import, categories, transfers, stats, settings, ...)
- `shared/ui/` — shared standalone components wrapping Tailwind/daisyUI primitives
- `shared/utils/` — shared signals, pipes, directives, and utilities

No backend: all persistence is local-first via IndexedDB (Dexie.js). There is no HTTP data-access layer, API codegen, or axios client — everything an app previously fetched from a server instead lives in `core/data-access/`.

## Feature Folder Structure

Every feature follows this pattern:

```
feature-{name}/
├── {feature}.routes.ts
├── {feature}.store.ts
├── index.ts
└── components/
    ├── {feature}-overview/
    │   ├── {feature}-overview.component.ts
    │   ├── {feature}-overview.component.html
    │   └── {feature}-overview.component.spec.ts
    ├── {feature}-detail/
    │   ├── {feature}-detail.component.ts
    │   ├── {feature}-detail.component.html
    │   └── {feature}-detail.component.spec.ts
    └── index.ts
```

**Every component gets its own folder** — `.component.ts`, `.component.html`, and `.component.spec.ts` (when present) live together in a folder named after the component (kebab-case, no `.component` suffix on the folder itself). Never place component files flat as siblings in `components/`. This applies everywhere a component lives, not just `feature-{name}/components/` — `shared/ui/` follows the same one-folder-per-component shape (e.g. `shared/ui/confirm-dialog/confirm-dialog.component.ts`).

A component's own folder may still `import` a sibling within that same folder using `./`; reaching the parent feature's store/service from inside a component folder now needs `../../` (one level for `components/`, one more for the component's own folder) — double-check relative import depth after moving or adding files.

Two features have a standing shape for the work most likely to land in them next:

- **Settings:** each new setting ships as its own section component under `feature-settings/components/`, composed by `settings-overview` (TICKET-SET-07) — never another block on the page. Bind its control to the store with `linkControlToSetting` from `shared/utils`; that helper is the only place the `emitEvent: false` write-back belongs.
- **Import mapping:** a new mapping concern goes into a `feature-import` module (`column-mapping.ts`, `mapper-steps.ts`, `import-wizard-session.ts`, ...), not onto the `import-map-step` component class.

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component files | kebab-case + `.component.ts`/`.html` | `entity-edit.component.ts` |
| Component class | PascalCase + `Component` suffix | `EntityEditComponent` |
| Component selector | `app-` + kebab-case (`mm-` + kebab-case for `shared/ui/` primitives) | `app-entity-edit`, `mm-button` |
| Service files | kebab-case + `.service.ts` | `transaction.service.ts` |
| Service class | PascalCase + `Service` suffix | `TransactionService` |
| Store (signal state) files | kebab-case + `.store.ts` | `transactions.store.ts` |
| Directive files | kebab-case + `.directive.ts` | `currency-input.directive.ts` |
| Pipe files | kebab-case + `.pipe.ts` | `signed-amount.pipe.ts` |
| Feature folders | `feature-` + kebab-case | `feature-transactions` |
| Model/DTO types | PascalCase, no suffix | `Transaction`, `Account` |
| Test files | `*.spec.ts` | `transaction.service.spec.ts` |

## Code Style

- **Standalone components only** — no `NgModule`s; each component declares its own `imports: [...]`
- **`ChangeDetectionStrategy.OnPush`** on every component
- **`inject()`** for dependency injection instead of constructor injection
- **Signal-based inputs/outputs** — `input()` / `output()` / `model()` instead of `@Input()` / `@Output()` decorators
- **Native control flow** in templates — `@if` / `@for` / `@switch`, never `*ngIf` / `*ngFor`
- **Templates branch on state; they never derive it.** No nested ternaries, no method calls inside `@for`, no string assembly in a binding — display facts (labels, icons, colors, accessible names, pre-stringified option values) are resolved once on a view-model in the class and read as plain fields. When a row grows past a couple of such facts, give it a `*-vm.ts` type and a `computed()` that joins it (e.g. [`feature-transactions/transaction-row-vm.ts`](../../../src/app/feature-transactions/transaction-row-vm.ts)).
- **A component file exports its component class, and I/O types only its direct host consumes.** Vocabulary shared more widely — view-model types, discriminants, option lists, constants — lives in a plain `.ts` module in the feature root (e.g. [`feature-categories/rule-condition-editor.ts`](../../../src/app/feature-categories/rule-condition-editor.ts)), which also keeps a child from importing through its own parent. Formatting helpers live in `shared/utils`, never `shared/ui`.
- **`type` over `interface`** for all type definitions
- Use `@/*` path alias for cross-tier imports (`@/feature-transactions/...`, not relative `../../...`)
- Single quotes — enforced by Prettier and pre-commit hook
- **Cross-feature imports go through `index.ts`** — when importing from a different feature, import from its `index.ts`, never a component file directly (e.g. `@/feature-accounts`, not `@/feature-accounts/components/account-edit.component`)
- **Prefer arrow function class fields / `const` functions** over the `function` keyword where the codebase already does so; component/service class methods stay as class methods
- **A component that's always freshly created (mounted via `@if`, never reused across re-opens) seeds itself from its own `input.required<T>()`s in `ngOnInit`** — not a `queueMicrotask`/`setTimeout` called from the parent right after setting `isOpen`. A parent-side timed callback assumes the *parent's* change detection has already created the child's view by the time it fires; that held in tests only because `fixture.detectChanges()` runs synchronously, and broke silently in a real zoneless app once Angular's own async CD scheduling ran *after* the queued callback (`viewChild()` still `undefined`, seeding a no-op) — see [`AbsoluteRangePanelComponent`](../../../src/app/shared/ui/absolute-range-panel/absolute-range-panel.component.ts)'s doc comment (TICKET-STAT-40). `ngOnInit` runs once, guaranteed after required inputs resolve, with no ordering assumption to get wrong.

## SOLID Principles

Apply SOLID as it maps onto this codebase's existing tiers — don't import Java-style boilerplate (no needless interfaces/abstract base classes just to satisfy a letter).

- **S — Single Responsibility.** One reason to change per unit: a store service owns one aggregate's state, a repository owns one entity's Dexie table, a component renders one view. Pure logic (fingerprinting, rule matching, transfer-linking, aggregation math) lives in its own testable function/class, not inlined into a component or store method. If a component is fetching, transforming, *and* rendering, push the non-render work down into the store/util.
- **O — Open/Closed.** Extend behaviour without editing shipped code: add a new `.version(n + 1).stores(...)` block rather than editing a released one; add a new `shared/ui` variant to a typed string-union `input()` (e.g. `ButtonVariant`) rather than special-casing at call sites; add a new rule/matcher by registering it, not by growing a `switch`.
- **L — Liskov Substitution.** A `shared/ui` primitive that wraps a form control must be a faithful stand-in for the native element it replaces — implement `ControlValueAccessor` fully and replicate the native value coercion (e.g. `NumberValueAccessor` for `<input type="number">`), so `[formControl]`/`formControlName` behave identically to using the raw control. A substitute that silently degrades typed values breaks LSP.
- **I — Interface Segregation.** Keep `input()`/`output()` surfaces narrow and purpose-specific. Prefer several small, focused primitives over one mega-component with a dozen mutually-exclusive flags; a caller should only depend on the inputs it actually uses. Model/DTO `type`s stay minimal — don't force consumers to carry fields they don't need.
- **D — Dependency Inversion.** Components depend on store services, and stores depend on repositories — never the reverse, and never a component reaching `db.*` directly. Wire dependencies with `inject()` so collaborators are provided, not hard-constructed, keeping units testable in isolation (inject a fake store/repo in specs).

## State Management (signals-first)

- **Source signals are the source of truth**, held inside injectable `providedIn: 'root'` store services — one per aggregate.
- **Store placement is a lookup, not a judgment call:** any store consumed across features lives in `core/state/` and is imported via `@/core/state` — entity store or not, which is why the app-wide `AppSettingsStore` and `RangeStore` live there too. Only a store a single feature touches (`RulesStore`, `StatsStore`, `MappingProfilesStore`, ...) stays in that feature folder. The **project-map** skill carries the full registry.
- **The canonical store shape is [`core/state/accounts.store.ts`](../../../src/app/core/state/accounts.store.ts) — copy it** rather than working from a description here. What matters and doesn't change: `signalStore({ providedIn: 'root' })` + `withEntities`, `computed()` derivations, and explicit `await` on the repository before patching state.
- **Every statistic is a `computed()` derivation** of source signals — never a manually maintained/mutated field
- **Persistence is an explicit awaited repository call, and hydration happens on first injection.** A store method awaits its repository, then patches state — there is no `effect()` mirroring signal writes into IndexedDB. Each store exposes an idempotent, cached `hydrate()` invoked from `withHooks({ onInit })` (TICKET-PERF-07), so the first injection of a store starts its load; `app.config.ts` only opens the database. In specs this means **mock the repository before creating the component** — re-mocking afterwards hits the cached hydration and changes nothing.
- **Memoize expensive aggregates** (e.g. per `(accountId, yearMonth)`) with a `computed()` backed by a `Map` cache, so a single edit invalidates only the touched bucket, not all history
- Reach for RxJS only at boundaries that are inherently stream-based (router events, `fromEvent`, Web Worker messages for CSV parsing) — convert to a signal with `toSignal()` at the boundary rather than threading Observables through component state
- **UI state that must outlive a component but not a reload** (a page's date range, a chart's bucket size / hidden series / dragged zoom) lives in a keyed root `signalStore` with no repository behind it — `RangeStore`, `ChartOptionsStore` — reached from a component through an **inject-context helper** called from a field initializer, named for what it controls: [`pageRangeControl()`](../../../src/app/core/state/page-range-control.ts), [`chartGranularity()`/`chartSeriesFilter()`/`chartZoomControl()`/`chartCycle()`/`chartGroupCategories()`](../../../src/app/core/state/chart-options-control.ts). The helper returns a `computed()` read plus explicit handlers and **never a local writable mirrored into the store by an `effect`** — a mirror writes the auto-derived *seed* on first mount, which the store can't tell from a user's choice, so the seeding rule silently stops applying for the rest of the session (TICKET-STAT-27)
- **Component-scoped session state** (ephemeral, multi-step flow orchestration that never persists to IndexedDB, e.g. `ImportWizardSession`) is a plain `@Injectable()` class — not a `signalStore`, not `providedIn: 'root'` — named `*Session` and provided via the owning component's own `providers: [...]`, so a fresh instance is created and torn down with each mount instead of needing an explicit `reset()` discipline
- **Custom `signalStoreFeature`s for cross-store patterns** (TICKET-NG-08 decision): `withArchivable<Entity>()` (`activeEntities`/`archivedEntities` computed filters) and `withPersistedCrud(repositoryToken, entityConfig)` (generic `add`/`update`/`remove` that persist through the repository, then patch entity state) both live in `shared/utils`. A consuming store aliases the feature's generic names to its own public method names in a following `withMethods()` block (e.g. `addRule: (rule) => store.add(rule)`), and adopts a method only where its own operation is genuinely plain CRUD — a store with a divergent operation (`AccountsStore.removeAccount`'s cascade delete through `AccountDeletionService`, `CategoriesStore.removeCategory`'s referencing-transaction cleanup, `MappingProfilesStore`'s upsert) keeps that one method hand-rolled instead of forcing it through the feature; adoption is per-method, not all-or-nothing.

## Data Access (Dexie.js / IndexedDB)

- One `Dexie` subclass in `core/data-access/app-db.ts` declares all tables via `.version(n).stores({ ... })`
- **Schema changes are additive** — add a new `.version(n + 1).stores(...)` (+ `.upgrade()` block if data needs transforming); never edit a shipped version in place
- Each entity gets a thin repository in `core/data-access/` (e.g. `TransactionsRepository`) wrapping the Dexie table — components and store services never touch `db.transactions` directly
- Multi-table writes (e.g. import batch insert + fingerprint dedupe check) run inside `db.transaction('rw', [...tables], async () => { ... })` for atomicity
- All repository methods are `async`/`await`, called from store service methods — never awaited directly inside a template or component constructor

## Styling

- **Tailwind CSS utility classes + daisyUI components** — written directly in the template
- **No component-level `.scss`/CSS-in-JS** — leave `styleUrls` empty; all styling is Tailwind utilities on the template
- **Use daisyUI theme tokens** (`bg-base-100`, `text-primary`, etc.), never hardcoded hex colors, so dark mode themes stay correct
- Shared visual primitives (buttons, cards, form fields) live in `shared/ui/` as thin standalone components wrapping daisyUI markup — feature templates should reuse these rather than re-authoring the same daisyUI pattern twice
- Only layout/positioning utilities (flex, grid, gap, margin, padding, width/height) belong directly in feature templates outside `shared/ui/`
- **`shared/ui/` primitives are `mm-`-prefixed** (`mm-button`, `mm-input`, `mm-select`, `mm-badge`, `mm-alert`, `mm-modal`, `mm-page-header`, `mm-empty-state`, `mm-confirm-dialog`, `mm-stat-card`, `mm-paginator`, `mm-date-range-input`, `mm-granularity-picker`, `mm-range-picker`, and more as they're added — see the **project-map** skill for the current full list) to keep them visually distinct from `app-`-prefixed feature components at usage sites
- **A routed page in its normal state opens with exactly one `mm-page-header`** (TICKET-UI-22): its `title` on the left, that page's **page-level** controls projected into its two action slots, and nothing else — there is no `subtitle` input, and a page needing an explanatory sentence puts it in the body. "Page-level" means anything that reconfigures the whole page (date range, view switch, create-new, show-archived, page settings, guide links, re-run); a control scoped to one panel stays on that panel. **Pick the slot by what the control does** (TICKET-UI-24): one that changes *what the page is showing* — date range, view switch, back-to-parent — goes in `[actions-start]`, beside the title; one that *acts on what is shown* — create, re-run, show-archived, page settings, a link elsewhere — goes in `[actions-end]`. The bar is `sticky top-0 z-10` (TICKET-UI-25); a theme that restyles `.navbar` must target `.mm-page-header-bar` to tell this bar from the shell's, and must not leave the pinned fill translucent. Never render a page-level control as a second strip below the header. Full-screen takeovers are the deliberate exception and keep their own hand-rolled heading — the first-visit intro that replaces `/income` entirely ([income-intro](../../../src/app/feature-income/components/income-intro/income-intro.component.html), TICKET-PUB-08) and the public landing hero ([home-landing](../../../src/app/feature-home/components/home-landing/home-landing.component.html)) — because neither is the page's chrome around content. See [page-header.component.ts](../../../src/app/shared/ui/page-header/page-header.component.ts) and §3 of [ui-layout-spec.md](../../../docs/v1.0_foundation/ui-layout-spec.md).
- **Variant-driven primitives never expose raw daisyUI classes to callers.** Each takes typed string-union `input()`s mirroring daisyUI's actual modifier axes for that element (e.g. `ButtonColor`/`ButtonVariant`/`ButtonSize`/`ButtonShape` in [button.component.ts](../../../src/app/shared/ui/button/button.component.ts)) and computes the final class string internally via `computed()`. Callers set `variant`/`color`/`size`, never `class="btn-primary"`.
- **`class = input('', { alias: 'class' })`** on every primitive routes a template `class="..."` attribute through the component input (in addition to the host element, which is harmless — the host is an unstyled custom element so a stray utility class there has no visible effect), so utility classes (`mt-2`, `w-full`, `col-span-*`) reliably reach the real inner element too. This only covers `class`/`style` — arbitrary native attributes (`step`, `min`, `maxlength`, `placeholder`, ...) need their own explicit `input()` since they don't forward automatically through a wrapping component.
- **Any primitive that wraps a form control implements `ControlValueAccessor`** (via `NG_VALUE_ACCESSOR` + `forwardRef`, see [input.component.ts](../../../src/app/shared/ui/input/input.component.ts) / [select.component.ts](../../../src/app/shared/ui/select/select.component.ts)) so `formControlName`/`[formControl]` keep working transparently through the wrapper. If the native element has a built-in value accessor with type coercion (e.g. `NumberValueAccessor` for `<input type="number">`), the wrapper's `writeValue`/change handler must replicate that coercion explicitly — otherwise typed form values silently degrade to strings.
- **A table column that must not stretch the table is clamped on its cell's *content*, not on the cell** (TICKET-REC-10). A `<th>`/`<td>` in auto table layout sizes to its content and ignores a `max-width`, so `truncate` alone does nothing — put `block max-w-* truncate` on the inner span (its `overflow: hidden` also zeroes the flex item's automatic minimum size) and a `title` for the hover text. A *max*-width, so short values still shrink the column. Pick the value by measuring the panel at the narrowest supported viewport rather than by eye, and keep `mm-table`'s `overflow-x-auto` wrapper — the clamp removes the *need* to scroll, not the ability. Exemplar: the Payment column in [recurring-payments-panel.component.html](../../../src/app/feature-recurring/components/recurring-payments-panel/recurring-payments-panel.component.html).
- **Privacy mode blurs what is *seen* and withholds what is *read*.** `mm-privacy-blur` (TICKET-PRIV-01) is a CSS filter, so it only works on visible text. A chart's `sr-only` companion table (the TICKET-STAT-20 pattern) is clipped to a 1px box and read aloud by assistive tech, where a blur paints nothing and hides nothing — so a privacy-aware chart omits those amounts from the view-model instead of wrapping them (`accessibleRows` in [spending-heatmap-panel.component.ts](../../../src/app/feature-dashboard/components/spending-heatmap-panel/spending-heatmap-panel.component.ts), TICKET-STAT-29). Same rule for anything a chart hands to echarts: a tooltip formatter's text, an axis label, or an amount-labelled `visualMap` is data, not styled DOM, so it has to be suppressed at build time too (the heatmap's tooltip formatter, which drops the figure and keeps the heading; its `visualMap` was the other exemplar until TICKET-STAT-34 replaced it with per-row colours). What a withheld figure is replaced with is one shared constant, [`HIDDEN_AMOUNT_TEXT`](../../../src/app/shared/utils/hidden-amount.ts) — a screen-reader user should hear one word, not a different euphemism per chart.
- **A new insight page carries the privacy toggle; a data page does not.** Any page in the sidebar's *Insights* group projects [`<mm-privacy-toggle actions-end />`](../../../src/app/shared/ui/privacy-toggle/privacy-toggle.component.ts) into its header and blurs its own figures (TICKET-PRIV-02) — that is the whole wiring, since the control owns its label, icons, store read and click. The *Data* pages (Accounts, Transactions, Categories, Auto-categoriser, Import) deliberately get neither: they are where you work on your figures, and a blurred balance can't be reconciled. `mm-privacy-toggle` is the one `shared/ui` primitive that injects a store — there is exactly one global privacy setting, so a `[value]`/`(valueChange)` pair would only mean every page wiring the same two lines. Every other primitive, `mm-privacy-blur` included, stays input-driven.

## Routing

- Lazy-load every feature via `loadChildren`/`loadComponent` in `app.routes.ts`
- Feature-level routes live in `{feature}.routes.ts`
- **Handle URL/query params as close to the routing layer as possible** — resolve them in the feature's route entry component via `ActivatedRoute`/`input()` route bindings, then pass the resolved values down as `input()`s to child components; child components should not read the URL themselves
- Tab-style navigation reads/writes the same param keys consistently — centralize key names in `shared/utils/search-params.ts`

## Forms

- **Reactive Forms** (`FormGroup`/`FormBuilder`/`FormControl`) for all forms — no template-driven forms
- Validators are colocated with the form's component; shared custom validators live in `shared/utils/validators/`
- Bind controls with `[formControl]`/`[formGroup]`, not manual signal wiring, so Angular's built-in validation/state (`dirty`, `touched`, `errors`) stays available

## Testing

- Test files: `*.spec.ts`, adjacent to the source file (inside the component's own folder for components — see Feature Folder Structure above)
- Format: `describe('{Service/Component}: {operation}', () => { it('{scenario}', ...) })`
- Use `TestBed` for component/service tests; assert on signal `.value()`/computed output directly rather than over-relying on `fixture.detectChanges()` timing
- Unit tests for pure logic (fingerprinting, rule matching, transfer-linking, aggregation math) should not require `TestBed` at all — test the plain functions/classes directly
- **A spec that reads or writes formatted currency/date/percent text calls `withCleanFormatSettings()`** ([format-settings.testing.ts](../../../src/app/shared/utils/format-settings.testing.ts)) at the top of its `describe` — never a hand-rolled reset hook. `format-settings.ts`'s locale/symbol signals are module-level and Vitest runs `isolate: false`, so they are shared by every spec file in the process; the helper brackets each test on both sides, so a file neither leaks outward nor inherits inward. `src/test-setup.ts` **cannot** do this globally — setup files are transformed separately from the pre-bundled specs and get their own copy of any app module they import (that hook was a silent no-op until 2026-08-01). Shared *testing-only* helpers are `*.testing.ts`, colocated with what they support and excluded from `tsconfig.app.json`.
- **A parent component's own spec stubs out a chart child it isn't testing, rather than mounting the real `NgxEchartsDirective`.** jsdom has no real canvas 2D context, so an *initial* render tolerates it, but any test that triggers a post-mount option *update* on a live chart (e.g. an unrelated click that changes a signal the chart's option depends on) drives zrender's animation ticker into a repaint against a null context — a genuine crash (`Cannot read properties of null (reading 'clearRect')`), not a flaky assertion. `loan-detail.component.spec.ts` (TICKET-LOAN-07) is the precedent: `TestBed.overrideComponent(ParentComponent, { remove: { imports: [RealChartComponent] }, add: { imports: [ChartStub] } })` with a trivial selector-matching stub. The chart's own spec (e.g. `loan-balance-chart.component.spec.ts`) still mounts the real directive — `provideEchartsCore({ echarts })` plus a `ResizeObserverStub` (the `account-balance-chart.component.spec.ts` precedent) — since it never triggers an update mid-test.

## Verification

Before considering any change complete, run:

1. `ng lint` — must pass clean
2. `ng test` — must pass clean
3. `ng build --configuration development` — must compile (catches worker-bundling and cross-tier import issues `ng test`/`ng lint` can miss)
4. **The `Fallow` skill** — a code quality tool, run as part of verification alongside the commands above. If `Fallow` isn't available yet in a given session, don't skip it silently — say so, and fall back to the checks above.
5. For UI-observable changes, a live browser check per this repo's standard `<verification_workflow>` (dev server + preview tools), not just the automated checks above
