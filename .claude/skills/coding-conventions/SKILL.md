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
ng generate component feature-{name}/components/{Name}  # scaffold a standalone component
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
    ├── {feature}-overview.component.ts
    ├── {feature}-overview.component.html
    ├── {feature}-detail.component.ts
    ├── {feature}-detail.component.html
    └── index.ts
```

Add sub-folders inside `components/` for multi-file sub-components (e.g. `add-tag-grid/`).

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component files | kebab-case + `.component.ts`/`.html` | `entity-edit.component.ts` |
| Component class | PascalCase + `Component` suffix | `EntityEditComponent` |
| Component selector | `app-` + kebab-case | `app-entity-edit` |
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

## State Management (signals-first)

- **Source signals are the source of truth**, held inside injectable `providedIn: 'root'` store services — one per aggregate (`AccountsStore`, `TransactionsStore`, `CategoriesStore`, `RulesStore`, `TransfersStore`, ...)
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

- Test files: `*.spec.ts`, adjacent to the source file
- Format: `describe('{Service/Component}: {operation}', () => { it('{scenario}', ...) })`
- Use `TestBed` for component/service tests; assert on signal `.value()`/computed output directly rather than over-relying on `fixture.detectChanges()` timing
- Unit tests for pure logic (fingerprinting, rule matching, transfer-linking, aggregation math) should not require `TestBed` at all — test the plain functions/classes directly
