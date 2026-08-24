import { DestroyRef, inject, signal, type Signal } from '@angular/core';

/**
 * Below Tailwind's `md` (768px) — the width at which a wide data table stops fitting and has to be
 * presented some other way (TICKET-TXN-12). `767.98px` rather than `767px` so the query and the
 * Tailwind variant flip at exactly the same place on a fractional device pixel ratio.
 *
 * Deliberately *not* `lg` (1024px), the breakpoint the app shell uses for its drawer: the
 * transactions table measures ~750px, so a tablet still reads it whole and only a phone does not.
 */
const COMPACT_VIEWPORT_QUERY = '(max-width: 767.98px)';

/**
 * Whether the viewport is narrow enough that a page should render its compact presentation
 * (TICKET-TXN-12) — a signal, so a component branches on it with `@if` and renders *one* of the two
 * layouts rather than shipping both and hiding one with `hidden md:block`.
 *
 * That distinction is the reason this exists rather than a CSS-only pair of branches: the
 * transactions page renders 50 rows, each carrying a `<select>` with one `<option>` per category,
 * so a CSS-hidden second copy would double a few thousand DOM nodes on every page change.
 *
 * Call it from a field initializer, like the other inject-context helpers in this folder — it takes
 * the current `DestroyRef` to drop its listener with the component. Falls back to `false` (the
 * desktop layout) where `matchMedia` is missing, which is what jsdom gives a unit test: a spec that
 * wants the compact branch stubs `window.matchMedia` rather than resizing anything.
 */
export const isCompactViewport = (): Signal<boolean> => {
  const matches = signal(false);
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return matches.asReadonly();
  }

  const query = window.matchMedia(COMPACT_VIEWPORT_QUERY);
  matches.set(query.matches);

  const onChange = (event: MediaQueryListEvent): void => matches.set(event.matches);
  query.addEventListener('change', onChange);
  inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));

  return matches.asReadonly();
};
