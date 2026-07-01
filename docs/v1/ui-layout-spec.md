# Money Mosaic — UI Layout Specification (v1)

Companion to [finance-app-spec.md](./finance-app-spec.md) and [user-stories.md](./user-stories.md). Defines the app shell, navigation, responsive rules, and a per-page layout spec so every feature in the checklist gets built against one coherent structure instead of being designed page-by-page as we go. Angular/daisyUI implementation follows `.claude/skills/coding-conventions/SKILL.md` as usual — this doc is the visual/structural contract, not a restatement of code conventions.

---

## 1. App shell

Persistent-sidebar layout built on daisyUI's `drawer` component.

- **Sidebar** (`drawer-side`) — app name at top, a `menu` of top-level nav items with icons: Dashboard, Accounts, Transactions, Categories, Transfers, Import, Settings. "Transfers" shows a badge with the pending-review count when > 0. Permanently visible ≥1024px; becomes an off-canvas overlay (hamburger-triggered) below that.
- **Topbar** (top of `drawer-content`) — hamburger (mobile/tablet only), current page title, a global **period switcher** (prev/next month arrows + "July 2026" label + "This month" jump), and a page-specific primary action slot (e.g. "Import CSV" on Dashboard/Transactions). Theme toggle (light/dark/system) lives here too.
- **Content** — `<router-outlet>` in a padded, max-width-free container (financial tables benefit from full width; cap prose-only pages like Settings at `max-w-2xl`).

The period switcher is global because most stats are month-sliced (FR-STAT-2/§7); it writes a `month` query param that Dashboard, Transactions, and Categories all read, so navigating between them keeps you looking at the same period. Centralize the key in `shared/utils/search-params.ts` per the routing convention.

## 2. Breakpoints

| Range | Sidebar | Stat grids | Tables |
|---|---|---|---|
| `<640px` (mobile) | Off-canvas drawer, hamburger trigger | 1 column, stacked | Row-per-card, stacked key/value |
| `640–1023px` (tablet) | Off-canvas drawer, hamburger trigger | 2 columns | Horizontal scroll on a fixed-layout table |
| `≥1024px` (desktop) | Permanent, full-width | 4 columns (or as specified per page) | Full table, sticky header |

Tailwind's default `sm`/`lg` breakpoints map directly to tablet/desktop above — no custom breakpoints needed.

## 3. Cross-page patterns

- **Money display** — a shared `signed-amount.pipe.ts` (`shared/utils/`) formats signed EUR amounts and a `MoneyComponent`/CSS convention colors them: `text-success` for positive, `text-error` for negative, never raw green/red hex (daisyUI theme tokens only, so it survives theme/dark-mode changes).
- **Category badge** — color dot + name, one shared `CategoryBadgeComponent` wrapping a daisyUI `badge`, used in transaction rows, rule targets, and category breakdowns alike.
- **Drill-down** — every stat, chart segment, and category total is a link that navigates to `/transactions` with the matching filters pre-filled via query params (FR-STAT-6). Dashboard passes `month`; category breakdown additionally passes `categoryId`.
- **Empty states** — icon + one-line message + a primary action (e.g. "No transactions yet — Import a CSV"), one shared `EmptyStateComponent`. Action queue widgets (uncategorised, transfer review) hide themselves entirely at zero rather than showing "0", so the dashboard doesn't nag when there's nothing to do.
- **Destructive confirmations** — one shared `ConfirmDialogComponent` (daisyUI `modal`) for delete-account, delete-all-data, unlink-transfer, etc. Consistent copy pattern: state what happens, then the irreversible part in one sentence.
- **Create/edit forms** — daisyUI `modal` for short forms (account, category, rule, mapping profile). Reactive Forms per convention, validators colocated with the form component.
- **Transaction quick-edit** — the one exception to modal-for-editing: clicking a transaction row opens a right-side slide-over (daisyUI `drawer` with `drawer-end`) rather than a modal, since it's the highest-frequency edit action in the app (category, notes, transfer link) and a slide-over lets you keep the underlying list visible and keep clicking through rows without a full open/close cycle per edit.
- **Loading** — skeleton placeholders (daisyUI `skeleton`) shaped like the content they replace (stat cards, table rows), not spinners, so layout doesn't jump when data resolves.

## 4. Page specs

### 4.1 Dashboard — `/dashboard` (default route)

1. Stats row — daisyUI `stats`, 4 items (income, expense, net cash flow, savings rate) for the selected period, collapsing 4→2→1 columns per breakpoint. Net worth shown separately in the topbar-adjacent header, since it's not period-scoped.
2. Two-column row (stacks on mobile): **category breakdown** (donut + top-5 list, "view all" → `/categories`) | **net worth trend** (12-month line chart).
3. Action queue row — "N uncategorised transactions" and "N transfers need review" cards, each linking to the relevant page's filtered view; hidden individually when their count is zero.
4. Per-account balance strip — compact horizontal list of account name + balance, linking to `/accounts/:id`.

### 4.2 Accounts — `/accounts` (overview), `/accounts/:id` (detail)

- **Overview**: header with "+ Add account" and an "Show archived" toggle. Responsive card grid (3/2/1 columns) — each card: colour accent bar, type icon, name, large balance figure, masked IBAN tail, kebab menu (edit/archive/delete). Matches the `{feature}-overview` + `{feature}-detail` component pair from the conventions doc.
- **Detail**: header (name, type badge, full balance, edit/archive/delete), a mini this-month in/out stat pair, and the account's transactions reusing the shared transaction list component from `feature-transactions` (imported via its `index.ts`, filtered to `accountId`).
- **Add/Edit**: modal, fields per FR-ACC-1.

### 4.3 Transactions — `/transactions`

- **Toolbar**: account multi-select, date range, category, free-text search, amount range — collapses into a filter sheet below `lg`. "Import CSV" primary action. A bulk-action bar appears once rows are checkbox-selected ("Categorise as…").
- **Table** (`≥1024px`): sticky header; columns = select, date, account badge, description/counterparty, category (inline-editable badge), amount (right-aligned, coloured), transfer indicator icon. Paginated at 50 rows (NFR-PERF-1) rather than rendering all 10k+ at once.
- **Mobile**: table becomes a stacked card list — date + amount on the first line, description below, category badge, tap to open the same quick-edit slide-over.
- **Quick-edit slide-over**: full field set, notes textarea, transfer link/unlink, "always categorise this merchant as X" shortcut (FR-CAT-4).

### 4.4 Import — `/import`

Single-column wizard (daisyUI `steps`, max-width ~800px), four steps:

1. **Select** — account picker + file dropzone.
2. **Map** — auto-detected preset banner (editable) or manual mapping form, split-pane against a raw-CSV preview.
3. **Preview** — parsed rows with a per-row validity flag; malformed rows shown but excluded from the commit count (FR-IMP-8).
4. **Summary** — rows read/added/skipped-duplicate + date range, "Undo this import" action, and direct links into "N likely transfers to review" / "N uncategorised" if the import created either.

Footer nav (Back/Next/Confirm) stays fixed at the bottom of the wizard card across all four steps.

### 4.5 Categories — `/categories`

Two daisyUI `tabs`:

- **Categories** — grouped list (Expense / Income sections, optional group sub-headers within), each row: colour dot, icon, name, group tag, edit/archive. "+ Add category".
- **Rules** — priority-ordered, drag-reorderable list; each row summarises its conditions in plain text ("description contains 'Delhaize'") plus the target category badge and an enabled toggle. "+ Add rule" opens a condition-builder modal: repeatable condition rows (field / operator / value), a "continue on match" toggle, and the target category.

### 4.6 Transfers — `/transfers`

- **Needs review** (primary view) — one row per ambiguous candidate pair: two mini transaction cards side by side with a connecting icon, "Link" / "Not a transfer" actions. Empty state: reassuring "All caught up" rather than a bare blank list.
- **Linked** (secondary tab) — audit list of confirmed transfers (method + confidence shown as a small badge) with an unlink action, for FR-TXN-4's manual override path.

### 4.7 Settings — `/settings`

Single column, `max-w-2xl`, stacked section cards (not a wizard — everything is independently editable):

- **Data management** — export JSON, import JSON (replace-vs-merge choice surfaced as a modal step, not a silent default), delete-all-data (confirm dialog), persistent-storage status indicator (FR-DAT-4).
- **Transfer matching** — day-window number input, confidence-behaviour toggles (FR-TRF-4).
- **Appearance** — theme select (light/dark/system).
- **About** — version, schema version (NFR-STORE-1).

## 5. Shared UI inventory (`shared/ui/`)

Build these once, reuse everywhere, rather than re-authoring daisyUI markup per feature:

| Component | Wraps | Used by |
|---|---|---|
| `PageHeaderComponent` | title + actions slot | every feature-overview page |
| `StatCardComponent` | daisyUI `stat` | Dashboard, Account detail |
| `CategoryBadgeComponent` | daisyUI `badge` | Transactions, Categories, Rules |
| `AccountBadgeComponent` | daisyUI `badge` | Transactions, Transfers |
| `PeriodSwitcherComponent` | — | Topbar |
| `EmptyStateComponent` | — | every list/queue view |
| `ConfirmDialogComponent` | daisyUI `modal` | destructive actions everywhere |
| `SlideOverComponent` | daisyUI `drawer` (`drawer-end`) | Transaction quick-edit |

`shared/utils/` gets `signed-amount.pipe.ts` and `search-params.ts` (centralizing `month`, `accountId`, `categoryId`, `from`, `to`, `q`, `minAmount`, `maxAmount` keys) alongside the reactive-forms validators already called for in the conventions doc.

## 6. Theming (closes spec Open Decision, informally)

Use daisyUI's built-in `light` / `dark` themes, switched via `prefers-color-scheme` with a manual override stored in Settings — no custom brand theme for v1. Both are WCAG AA out of the box (NFR-A11Y-1), and it keeps the whole app on tokens (`bg-base-*`, `text-*-content`) with zero hardcoded colour work. Revisit only if/when a deliberate brand identity is requested.

## 7. Route map

| Path | Feature | Reads query params |
|---|---|---|
| `/dashboard` | `feature-dashboard` | `month` |
| `/accounts` | `feature-accounts` | — |
| `/accounts/:id` | `feature-accounts` | `month` (for the mini stats) |
| `/transactions` | `feature-transactions` | `accountId`, `categoryId`, `from`, `to`, `q`, `minAmount`, `maxAmount`, `month` (shorthand for `from`/`to`) |
| `/import` | `feature-import` | — (wizard step is component-local state, not URL state) |
| `/categories` | `feature-categories` | `tab` (`categories` \| `rules`) |
| `/transfers` | `feature-transfers` | `tab` (`review` \| `linked`) |
| `/settings` | `feature-settings` | — |
