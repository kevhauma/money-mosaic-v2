---
name: frontend-conventions
description: Component patterns and conventions for frontend code
paths: "**/*.tsx,**/*.jsx,**/*.ts,**/*.vue,**/*.html,**/*.css"
---

## Common Commands

```bash
yarn dev              # start dev server
yarn build            # production build
yarn test             # run tests
yarn codegen     # regenerate API types and hooks from OpenAPI spec
yarn lint             # ESLint check
```

## Architecture

`src/` is organized into tiers:
- `app/` — page entries
- `data-access/` — HTTP client config, code-generated API hooks, custom data hooks
- `feature-{name}/` — colocated domain modules (40+)
- `layouts/` — global shell components
- `libs/ui/` — shared component library and theme
- `libs/utils/` — shared hooks and utilities

Libraries exist for: UI components, CSS-in-JS styling, state management, server state / data fetching, API code generation, form handling + schema validation, internationalization, notifications.

## Feature Folder Structure

Every feature follows this pattern:

```
feature-{name}/
├── {Feature}Layout.tsx
├── index.ts
└── components/
    ├── {Feature}Overview.tsx
    ├── {Feature}Detail.tsx
    └── index.ts
```

Add sub-folders inside `components/` for multi-file sub-components (e.g. `AddTagGrid/`).

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component files | PascalCase | `EntityEdit.tsx` |
| Hook files | camelCase | `useFetchUser.ts` |
| Utility files | camelCase | `stringUtils.ts` |
| State atom files | PascalCase | `ThemeAtom.ts` |
| Feature folders | `feature-` + kebab-case | `feature-entity` |
| Component names | PascalCase, descriptive | `EntityLayout` |
| Hook names | `use` prefix + camelCase | `useDisclosure` |
| DTO types | `{Resource}Dto` | `EntityDto` (generated) |
| Test files | `*.spec.ts` | `useDisclosure.spec.ts` |

## Code Style

- **Named exports only** — default exports only for file-based routing entry points (`page.tsx` / `layout.tsx`)
- **`type` over `interface`** for all type definitions
- **Props as a local `type Props = { ... }`** — export only if consumed by other modules
- Use `@/*` path alias for all imports (`@/feature-entity/...`, not relative `../../...`)
- Single quotes — enforced by Prettier and pre-commit hook
- **Cross-feature imports go through `index.ts`** — when importing a component from a different feature, import from the feature root (`@/feature-other`) or its `index.ts`, never directly from the `.vue` file (`@/feature-other/components/Foo.vue`)
- **Prefer arrow function notation over the `function` keyword**. Use `const foo = (...): T => { ... }` for all function definitions, including exports (e.g. `export const useCurrentUser = () => { ... }`). Exception: do not edit files under `src/data-access/generated/` — those are auto-generated.


## State Management

- **Atomic global state** for persisted UI config (theme, preferences); atom files named `{Feature}Atom.ts` with a localStorage persistence effect
- **Server state (data fetching)** for all API data — use the code-generated query and mutation hooks
- **`useState`** for local UI state
- **`useDisclosure`** (`libs/utils/useDisclosure.ts`) for open/close toggle state
- Access atoms with the minimal scope needed: read-only, read/write, or write-only

## Data Access

**Never hand-edit** `src/data-access/generated/` — always regenerate with `yarn generate:api`.

Generated hooks follow this naming:
- `useGetApi{Resource}()` — fetch list
- `useGetApi{Resource}Id(id)` — fetch single
- `usePostApi{Resource}()` — create mutation
- `usePatchApi{Resource}()` — update mutation
- `useDeleteApi{Resource}Id()` — delete mutation

Always type mutations with `DefaultAxiosError`:
```typescript
const { mutate } = usePatchApiAircraft<DefaultAxiosError>();
```

Invalidate cache using the generated key factories:
```typescript
queryClient.invalidateQueries(getGetApiAircraftQueryKey());
```

Global HTTP error handling is in `src/data-access/initAxios.ts`. Use `useWatchHttpErrorCode` for feature-level reactions to specific HTTP status codes.

## Form Handling

- Validation schemas are defined inside the form component using the schema validation library
- All form inputs are controlled — use components from `libs/ui/components/form/formInputs/` (`FormTextField`, `FormAutocomplete`, `FormCheckbox`, `FormMultiAutocomplete`, etc.)

## Styling

- **CSS-in-JS only** — no Tailwind, no CSS files, no CSS modules
- **Visual styling belongs in `libs/ui/` only** — colors, typography, borders, shadows, backgrounds, and similar visual properties must be defined there, either as styled components or as component props
- **Outside `libs/ui/`, only layout/positioning styles are allowed** — flex, grid, margin, padding, gap, width, height, overflow, and similar structural properties
- When a feature component needs visual customization, expose it as a prop on the base component in `libs/ui/` rather than overriding styles inline
- Theme is in `libs/ui/theme.tsx`; dark mode and font size are stored in a global state atom

## Routing

- Build all URLs via `clientRoutes` (`libs/utils/clientRoutes.ts`) — never construct paths manually
- Read/write URL search params using keys from `SearchParamKeys` (`libs/utils/searchParamKeys.ts`)
- **Handle URL/query params as close to the routing layer as possible** — extract them in the `page.tsx` file and pass the resolved values down as props; feature components should not read from the URL themselves
- Tab navigation via `useUrlTabs` / `useNavigateToTab`

## Views

Views (`src/views/`) are thin route entry points — they should contain **no business logic**.

The only work a view is allowed to do:
- Read route params and query strings from the URL
- Pass the resolved values down as props to feature components

Everything else (data fetching, state, UI logic) belongs in the feature component the view renders. If a view needs more than a handful of lines of `<script setup>`, that logic should move into the feature.

## Testing

- Test files: `*.spec.ts`, adjacent to the source file (hooks may have a named subfolder)
- Format: `describe('{Hook/Component}: {operation}', () => { it('{scenario}', ...) })`
- Unit tests for pure logic; extract helper functions for shared setup