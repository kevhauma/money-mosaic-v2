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
- **`type` over `interface`** for all type definitions
- Use `@/*` path alias for cross-tier imports (`@/feature-transactions/...`, not relative `../../...`)
- Single quotes — enforced by Prettier and pre-commit hook
- **Cross-feature imports go through `index.ts`** — when importing from a different feature, import from its `index.ts`, never a component file directly (e.g. `@/feature-accounts`, not `@/feature-accounts/components/account-edit.component`)
- **Prefer arrow function class fields / `const` functions** over the `function` keyword where the codebase already does so; component/service class methods stay as class methods

## SOLID Principles

Apply SOLID as it maps onto this codebase's existing tiers — don't import Java-style boilerplate (no needless interfaces/abstract base classes just to satisfy a letter).

- **S — Single Responsibility.** One reason to change per unit: a store service owns one aggregate's state, a repository owns one entity's Dexie table, a component renders one view. Pure logic (fingerprinting, rule matching, transfer-linking, aggregation math) lives in its own testable function/class, not inlined into a component or store method. If a component is fetching, transforming, *and* rendering, push the non-render work down into the store/util.
- **O — Open/Closed.** Extend behaviour without editing shipped code: add a new `.version(n + 1).stores(...)` block rather than editing a released one; add a new `shared/ui` variant to a typed string-union `input()` (e.g. `ButtonVariant`) rather than special-casing at call sites; add a new rule/matcher by registering it, not by growing a `switch`.
- **L — Liskov Substitution.** A `shared/ui` primitive that wraps a form control must be a faithful stand-in for the native element it replaces — implement `ControlValueAccessor` fully and replicate the native value coercion (e.g. `NumberValueAccessor` for `<input type="number">`), so `[formControl]`/`formControlName` behave identically to using the raw control. A substitute that silently degrades typed values breaks LSP.
- **I — Interface Segregation.** Keep `input()`/`output()` surfaces narrow and purpose-specific. Prefer several small, focused primitives over one mega-component with a dozen mutually-exclusive flags; a caller should only depend on the inputs it actually uses. Model/DTO `type`s stay minimal — don't force consumers to carry fields they don't need.
- **D — Dependency Inversion.** Components depend on store services, and stores depend on repositories — never the reverse, and never a component reaching `db.*` directly. Wire dependencies with `inject()` so collaborators are provided, not hard-constructed, keeping units testable in isolation (inject a fake store/repo in specs).

## State Management (signals-first)

- **Source signals are the source of truth**, held inside injectable `providedIn: 'root'` store services — one per aggregate. Entity stores consumed across 2+ features (`AccountsStore`, `CategoriesStore`, `TransactionsStore`, `TransfersStore`, `TransferSettingsStore`) live in `core/state/` and are imported via `@/core/state`; stores only one feature touches (`RulesStore`, `CategoryModelStore`, `StatsStore`, ...) stay in that feature folder — see the **project-map** skill.
- **Every statistic is a `computed()` derivation** of source signals — never a manually maintained/mutated field
- **Persistence via `effect()`** — each store service's constructor registers an `effect()` that mirrors signal writes into IndexedDB through the matching repository; app bootstrap hydrates source signals from IndexedDB before the app renders
- **Memoize expensive aggregates** (e.g. per `(accountId, yearMonth)`) with a `computed()` backed by a `Map` cache, so a single edit invalidates only the touched bucket, not all history
- Reach for RxJS only at boundaries that are inherently stream-based (router events, `fromEvent`, Web Worker messages for CSV parsing) — convert to a signal with `toSignal()` at the boundary rather than threading Observables through component state

## Data Access (Dexie.js / IndexedDB)

- One `Dexie` subclass in `core/data-access/app-db.ts` declares all tables via `.version(n).stores({ ... })`
- **Schema changes are additive** — add a new `.version(n + 1).stores(...)` (+ `.upgrade()` block if data needs transforming); never edit a shipped version in place
- Each entity gets a thin repository in `core/data-access/` (e.g. `TransactionsRepository`) wrapping the Dexie table — components and store services never touch `db.transactions` directly
- Multi-table writes (e.g. import batch insert + fingerprint dedupe check) run inside `db.transaction('rw', [...tables], async () => { ... })` for atomicity
- All repository methods are `async`/`await`, called from store service effects/methods — never awaited directly inside a template or component constructor

## Styling

- **Tailwind CSS utility classes + daisyUI components** — written directly in the template
- **No component-level `.scss`/CSS-in-JS** — leave `styleUrls` empty; all styling is Tailwind utilities on the template
- **Use daisyUI theme tokens** (`bg-base-100`, `text-primary`, etc.), never hardcoded hex colors, so dark mode themes stay correct
- Shared visual primitives (buttons, cards, form fields) live in `shared/ui/` as thin standalone components wrapping daisyUI markup — feature templates should reuse these rather than re-authoring the same daisyUI pattern twice
- Only layout/positioning utilities (flex, grid, gap, margin, padding, width/height) belong directly in feature templates outside `shared/ui/`
- **`shared/ui/` primitives are `mm-`-prefixed** (`mm-button`, `mm-input`, `mm-select`, `mm-badge`, `mm-alert`, `mm-modal`, `mm-page-header`, `mm-empty-state`, `mm-confirm-dialog`, `mm-stat-card`, `mm-paginator`, `mm-date-range-input`, `mm-granularity-picker`, `mm-range-grouping-switcher`, and more as they're added — see the **project-map** skill for the current full list) to keep them visually distinct from `app-`-prefixed feature components at usage sites
- **Variant-driven primitives never expose raw daisyUI classes to callers.** Each takes typed string-union `input()`s mirroring daisyUI's actual modifier axes for that element (e.g. `ButtonColor`/`ButtonVariant`/`ButtonSize`/`ButtonShape` in [button.component.ts](../../../src/app/shared/ui/button/button.component.ts)) and computes the final class string internally via `computed()`. Callers set `variant`/`color`/`size`, never `class="btn-primary"`.
- **`class = input('', { alias: 'class' })`** on every primitive routes a template `class="..."` attribute through the component input (in addition to the host element, which is harmless — the host is an unstyled custom element so a stray utility class there has no visible effect), so utility classes (`mt-2`, `w-full`, `col-span-*`) reliably reach the real inner element too. This only covers `class`/`style` — arbitrary native attributes (`step`, `min`, `maxlength`, `placeholder`, ...) need their own explicit `input()` since they don't forward automatically through a wrapping component.
- **Any primitive that wraps a form control implements `ControlValueAccessor`** (via `NG_VALUE_ACCESSOR` + `forwardRef`, see [input.component.ts](../../../src/app/shared/ui/input/input.component.ts) / [select.component.ts](../../../src/app/shared/ui/select/select.component.ts)) so `formControlName`/`[formControl]` keep working transparently through the wrapper. If the native element has a built-in value accessor with type coercion (e.g. `NumberValueAccessor` for `<input type="number">`), the wrapper's `writeValue`/change handler must replicate that coercion explicitly — otherwise typed form values silently degrade to strings.

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

## Verification

Before considering any change complete, run:

1. `ng lint` — must pass clean
2. `ng test` — must pass clean
3. `ng build --configuration development` — must compile (catches worker-bundling and cross-tier import issues `ng test`/`ng lint` can miss)
4. **The `Fallow` skill** — a code quality tool, run as part of verification alongside the commands above. If `Fallow` isn't available yet in a given session, don't skip it silently — say so, and fall back to the checks above.
5. For UI-observable changes, a live browser check per this repo's standard `<verification_workflow>` (dev server + preview tools), not just the automated checks above
