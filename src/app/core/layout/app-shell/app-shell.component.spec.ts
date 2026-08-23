import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TransactionsRepository, type Transaction } from '@/core/data-access';
import { TransactionsStore } from '@/core/state';
import { AppShellComponent } from './app-shell.component';

const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

/** Uncategorised by `TransactionsStore`'s definition: no category, not linked as a transfer, not a savings movement. */
const uncategorised = (id: number): Transaction => ({
  id,
  accountId: 1,
  bookingDate: '2026-08-01',
  amount: -12,
  currency: 'EUR',
  rawDescription: 'Coffee',
  fingerprint: `fp-${id}`,
  createdAt: '2026-08-01T00:00:00.000Z',
});

beforeEach(async () => {
  vi.clearAllMocks();
  transactionsRepository.getAll.mockResolvedValue([]);
  await TestBed.configureTestingModule({
    imports: [AppShellComponent],
    providers: [
      provideRouter([]),
      { provide: TransactionsRepository, useValue: transactionsRepository },
    ],
  }).compileComponents();
});

describe('AppShellComponent', () => {
  it('should create the shell', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('does not render a top-level "Data" nav item (moved under Settings — TICKET-SET-06)', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const dataLink = (fixture.nativeElement as HTMLElement).querySelector('a[href="/data"]');

    expect(dataLink).toBeNull();
  });

  // The shell used to own the one app-wide range (its switcher, its RangeStore injection, its
  // query-param mirroring). TICKET-UI-23 handed all three to the pages that actually use a range;
  // `page-range-control.spec.ts` covers the behaviour at its new home.
  it("renders no range switcher — the range lives in each page's own header (TICKET-UI-23)", () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const shell = fixture.nativeElement as HTMLElement;

    expect(shell.querySelector('mm-range-picker')).toBeNull();
    expect(shell.querySelector('mm-date-range-input')).toBeNull();
  });
});

// TICKET-UI-31 — the skip links have to be the *first* focusable elements in the document, which is
// a DOM-order fact rather than a styling one, so it is asserted against the rendered tree rather
// than by eye. `.drawer-toggle` sits above them in the markup but is `display: none`, so it does not
// take focus; jsdom applies no stylesheet, hence the explicit exclusion below.
describe('AppShellComponent: skip links (TICKET-UI-31)', () => {
  const FOCUSABLE = 'a[href], button, input:not(.drawer-toggle), select, textarea, [tabindex="0"]';

  const renderShell = (): HTMLElement => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders both skip links ahead of every other focusable element', () => {
    const shell = renderShell();

    const focusable = [...shell.querySelectorAll<HTMLElement>(FOCUSABLE)];

    expect(focusable.slice(0, 2).map((element) => element.textContent?.trim())).toEqual([
      'Skip to content',
      'Skip to navigation',
    ]);
  });

  it('hides each link until it takes focus', () => {
    const shell = renderShell();

    const links = [...shell.querySelectorAll<HTMLElement>('a[href^="#"]')];

    for (const link of links) {
      expect(link.className).toContain('sr-only');
      expect(link.className).toContain('focus:not-sr-only');
    }
  });

  it('gives the two regions a landmark and an accessible name', () => {
    const shell = renderShell();

    const main = shell.querySelector('main');
    const nav = shell.querySelector('nav');

    expect(main?.getAttribute('aria-label')).toBe('Page content');
    expect(main?.getAttribute('tabindex')).toBe('-1');
    expect(nav?.getAttribute('aria-label')).toBe('Main');
    expect(nav?.getAttribute('tabindex')).toBe('-1');
  });

  it('moves focus into the main region, so the next Tab continues inside the page', () => {
    const shell = renderShell();
    const skipToContent = shell.querySelector<HTMLAnchorElement>('a[href="#main-content"]');

    skipToContent?.click();

    expect(document.activeElement).toBe(shell.querySelector('main'));
  });

  it('moves focus into the nav region, so the next Tab lands on the first nav link', () => {
    const shell = renderShell();
    const skipToNav = shell.querySelector<HTMLAnchorElement>('a[href="#app-nav"]');

    skipToNav?.click();

    expect(document.activeElement).toBe(shell.querySelector('nav'));
  });

  it('leaves the URL alone rather than letting the browser follow the fragment', () => {
    const shell = renderShell();
    const skipToContent = shell.querySelector<HTMLAnchorElement>('a[href="#main-content"]');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    skipToContent?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});

// TICKET-UI-26 — the eight feature links are two labelled, always-expanded groups. The meta list at
// the foot of the sidebar (How-to's, FAQ, Changelog, Settings) is deliberately not one of them: its
// position is already the grouping signal, so it has no heading and is excluded from these queries.
/** The `<ul>` a `menu-title` heading labels, looked up the way a screen reader resolves it. */
const groupFor = (shell: HTMLElement, heading: string): HTMLUListElement => {
  const title = [...shell.querySelectorAll('h2.menu-title')].find(
    (element) => element.textContent?.trim() === heading,
  );
  expect(title).toBeDefined();
  const group = shell.querySelector<HTMLUListElement>(`ul[aria-labelledby="${title?.id}"]`);
  expect(group).not.toBeNull();
  return group as HTMLUListElement;
};

const hrefsIn = (list: HTMLUListElement): (string | null)[] =>
  [...list.querySelectorAll('a')].map((anchor) => anchor.getAttribute('href'));

const renderShell = async (transactions: Transaction[] = []): Promise<HTMLElement> => {
  transactionsRepository.getAll.mockResolvedValue(transactions);
  const fixture = TestBed.createComponent(AppShellComponent);
  await TestBed.inject(TransactionsStore).hydrate({ force: true });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
};

describe('AppShellComponent: grouped sidebar navigation (TICKET-UI-26)', () => {
  it('renders exactly two feature group headings, "Insights" then "Data"', async () => {
    const shell = await renderShell();

    const headings = [...shell.querySelectorAll('h2.menu-title')].map((element) =>
      element.textContent?.trim(),
    );

    expect(headings).toEqual(['Insights', 'Data']);
  });

  it('puts Dashboard, Income, Recurring, Loans, Explore and Future in Insights — and nothing else', async () => {
    const shell = await renderShell();

    // Future sits last in Insights, i.e. between Explore and the Data group's Accounts
    // (TICKET-FUT-03). Loans sits after Recurring: it reads as a forward-looking view of a
    // liability rather than a store of records, so it moved out of Data (2026-08-22).
    expect(hrefsIn(groupFor(shell, 'Insights'))).toEqual([
      '/dashboard',
      '/income',
      '/recurring',
      '/loans',
      '/explore',
      '/future',
    ]);
  });

  it('labels the Future nav item and gives it an icon (TICKET-FUT-03)', async () => {
    const shell = await renderShell();
    const link = groupFor(shell, 'Insights').querySelector('a[href="/future"]') as HTMLElement;

    expect(link.textContent?.trim()).toBe('Future');
    expect(link.querySelector('ng-icon')).not.toBeNull();
  });

  it('puts Accounts, Transactions, Categories, Auto-categoriser and Import in Data — and nothing else', async () => {
    const shell = await renderShell();

    expect(hrefsIn(groupFor(shell, 'Data'))).toEqual([
      '/accounts',
      '/transactions',
      '/categories',
      // Not `/learning` — renamed by TICKET-UI-32, which also keeps the old path
      // alive as a redirect (`app.routes.spec.ts`).
      '/auto-categoriser',
      '/import',
    ]);
  });

  it('keeps both groups permanently expanded — no <details>, so every link is one click away', async () => {
    const shell = await renderShell();

    expect(shell.querySelector('details')).toBeNull();
    expect(shell.querySelector('summary')).toBeNull();
  });

  it('leaves the group headings out of the tab order, out of the link set, and off NAV_ITEM_CLASS', async () => {
    const shell = await renderShell();

    // Counted first: a bare `for` over an empty list would pass this vacuously.
    const headings = [...shell.querySelectorAll('h2.menu-title')];
    expect(headings.length).toBe(2);

    for (const heading of headings) {
      expect(heading.getAttribute('tabindex')).toBeNull();
      expect(heading.querySelector('a')).toBeNull();
      // daisyUI's heading class plus the AA contrast override, and nothing else — in particular
      // never the nav items' NAV_ITEM_CLASS.
      expect(heading.className).toBe('menu-title text-base-content/60');
    }
  });

  it('still renders the Transactions badge from uncategorisedCount(), now inside the Data group', async () => {
    const shell = await renderShell([uncategorised(1), uncategorised(2), uncategorised(3)]);

    const transactionsLink = groupFor(shell, 'Data').querySelector('a[href="/transactions"]');

    expect(transactionsLink?.querySelector('.badge-warning')?.textContent?.trim()).toBe('3');
  });

  it('renders no badge when nothing is uncategorised', async () => {
    const shell = await renderShell();

    expect(shell.querySelector('.badge-warning')).toBeNull();
  });

  it('leaves the meta list unheaded and pinned to the foot of the sidebar', async () => {
    const shell = await renderShell();

    const metaList = shell.querySelector<HTMLUListElement>('ul.mt-auto');

    expect(metaList).not.toBeNull();
    expect(metaList?.querySelector('.menu-title')).toBeNull();
    expect(hrefsIn(metaList as HTMLUListElement)).toEqual([
      '/help',
      '/help/faq',
      '/changelog',
      '/settings',
    ]);
  });
});

/**
 * TICKET-UI-28 — the nav outgrew the premise TICKET-UI-26 sized it against ("with nine items the
 * sidebar has no height problem"): at 15 links and a 700px viewport, Changelog and Settings sat
 * below the fold of an unmarked scroll region.
 *
 * These assert the **mechanism**, not a count. jsdom has no layout, so "is Settings visible at
 * 700px?" is not a question this suite can answer — but "can a growing feature list push the meta
 * list off screen?" is a structural question, and the structure is what the fix changed. A 16th
 * feature link must not be able to break this.
 */
describe('AppShellComponent: the sidebar fits its viewport (TICKET-UI-28)', () => {
  const renderNav = async (): Promise<HTMLElement> =>
    (await renderShell()).querySelector('nav#app-nav') as HTMLElement;

  it('gives the nav a fixed height and no scroll of its own', async () => {
    const nav = await renderNav();

    // Was `min-h-full`, which let the nav grow past the drawer and hand the overflow to
    // `.drawer-side`'s own `overflow-y: auto` — a scroll region with nothing marking it as one.
    expect(nav.classList).toContain('h-full');
    expect(nav.classList).toContain('overflow-hidden');
    expect(nav.classList).not.toContain('min-h-full');
    // daisyUI's `.menu` is `flex-flow: column wrap`, and a definite height plus `overflow-hidden`
    // turns a wrap into a second column that is clipped outright rather than scrolled — an
    // unreachable link, strictly worse than the unmarked scroll this ticket fixes.
    expect(nav.classList).toContain('flex-nowrap');
  });

  it('scrolls the feature groups inside their own frame', async () => {
    const nav = await renderNav();
    const frame = nav.querySelector<HTMLUListElement>('ul.overflow-y-auto');

    expect(frame).not.toBeNull();
    // `min-h-0` is load-bearing, not decoration: a flex child's automatic minimum size is its
    // content, so without it `flex-1` never shrinks and the frame never scrolls.
    expect(frame?.classList).toContain('flex-1');
    expect(frame?.classList).toContain('min-h-0');
    // It is the feature groups that scroll — both headings live inside it.
    expect([...frame!.querySelectorAll('h2.menu-title')].map((h) => h.textContent?.trim())).toEqual(
      ['Insights', 'Data'],
    );
  });

  it('keeps the meta list outside that frame, so it can never be scrolled off', async () => {
    const nav = await renderNav();
    const frame = nav.querySelector<HTMLUListElement>('ul.overflow-y-auto') as HTMLUListElement;
    const metaList = nav.querySelector<HTMLUListElement>('ul.mt-auto') as HTMLUListElement;

    // The whole fix: Settings is a sibling of the scroll region, not a descendant of it.
    expect(frame.contains(metaList)).toBe(false);
    expect(metaList.querySelector('a[href="/settings"]')).not.toBeNull();
    expect(metaList.classList).toContain('shrink-0');
  });

  it('leaves every link in one of the two regions — none stranded between them', async () => {
    const nav = await renderNav();
    const frame = nav.querySelector<HTMLUListElement>('ul.overflow-y-auto') as HTMLUListElement;
    const metaList = nav.querySelector<HTMLUListElement>('ul.mt-auto') as HTMLUListElement;

    // A partition, not a count: the inventory itself is asserted group by group above, and pinning
    // "15" here would fail the day a 16th link is added — the very growth this layout exists to
    // absorb. What it guards is that every link is either in the scrolling frame or in the pinned
    // foot, so the layout change stranded none of them.
    const inRegions =
      frame.querySelectorAll('a[href]').length + metaList.querySelectorAll('a[href]').length;

    expect(nav.querySelectorAll('a[href]').length).toBeGreaterThan(0);
    expect(inRegions).toBe(nav.querySelectorAll('a[href]').length);
  });

  it('keeps the group headings labelling their lists', async () => {
    const nav = await renderNav();

    for (const heading of nav.querySelectorAll('h2.menu-title')) {
      expect(nav.querySelector(`ul[aria-labelledby="${heading.id}"]`)).not.toBeNull();
    }
    expect(nav.querySelectorAll('h2.menu-title')).toHaveLength(2);
  });
});
