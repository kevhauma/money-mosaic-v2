import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** The brand, and the whole document title on a route that names no page of its own. */
const BRAND = 'Money Mosaic';

/** Separator between page and brand — the same middot the app already joins short facts with (e.g. a row's `Transfer · Savings` badge). */
const SEPARATOR = ' · ';

/**
 * Builds `<page> · Money Mosaic` from each route's own `title` (TICKET-TXN-12).
 *
 * Every route used to leave `document.title` at the `index.html` value, so the browser tab, the
 * history entry, the bookmark and the task switcher all read "Money Mosaic" on all fifteen routes —
 * and a screen reader, which announces the document title on a client-side navigation, was told
 * nothing had changed. The page name in the route is what fixes all four at once.
 *
 * **This is deliberately not a second visible title.** TICKET-TXN-12's criterion asked for the
 * mobile top bar to name the page; TICKET-UI-25 already pins `mm-page-header` to the top of the
 * viewport at every scroll position, so a title in the shell bar as well would put two of them on a
 * 375px screen and breach TICKET-UI-22's one-header rule. What was actually still missing was the
 * page's name *outside* the viewport, which is this.
 *
 * The brand is appended here rather than repeated in fifteen route definitions, and a route with no
 * `title` (the public landing page) gets the bare brand rather than a dangling separator.
 */
@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    this.title.setTitle(pageTitle ? `${pageTitle}${SEPARATOR}${BRAND}` : BRAND);
  }
}
