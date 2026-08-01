import { GUIDES } from './guides';

const guideBySlug = (slug: string) => {
  const guide = GUIDES.find((entry) => entry.slug === slug);
  if (guide === undefined) throw new Error(`No guide with slug "${slug}"`);
  return guide;
};

const textOf = (guides: readonly (typeof GUIDES)[number][]): string =>
  guides
    .flatMap((guide) => [
      guide.title,
      guide.summary,
      ...guide.steps.flatMap((step) => [step.title, step.description]),
    ])
    .join('\n');

const allText = (): string => textOf(GUIDES);

/**
 * Only the two Income guides. The stale-surface checks below are scoped to them because the words
 * they ban are still perfectly real elsewhere — the Learning guide's suggestions table genuinely
 * has a Dismiss button.
 */
const incomeText = (): string => textOf(GUIDES.filter((guide) => guide.tryItRoute === '/income'));

describe('GUIDES: the Income onboarding pair (TICKET-PUB-07)', () => {
  const gettingStarted = () => guideBySlug('getting-started-with-the-income-page');

  it('lists the getting-started guide before the read-the-numbers one', () => {
    const slugs = GUIDES.map((guide) => guide.slug);

    expect(slugs).toContain('getting-started-with-the-income-page');
    expect(slugs.indexOf('getting-started-with-the-income-page')).toBeLessThan(
      slugs.indexOf('reading-your-income-growth'),
    );
  });

  it('says what the page is for in its summary, before any step', () => {
    const { summary } = gettingStarted();

    expect(summary).toContain('money coming');
    expect(summary).toContain('trend');
  });

  it('opens with exactly the three quick-setup steps, in order', () => {
    // TICKET-PUB-08's first-visit surface renders `steps.slice(0, 3)`. Reordering or inserting a
    // step here silently changes what a first-time user is shown, so the order is pinned.
    const [first, second, third] = gettingStarted().steps;

    expect(first.title).toBe('Get income transactions in, and categorised as income');
    expect(second.title).toBe('Tell the page when your career started');
    expect(third.title).toBe('Choose which categories count, and flag any annual lump sums');
    expect(gettingStarted().steps.length).toBeGreaterThan(3);
  });

  it('names the prerequisites and points at the guides that cover them', () => {
    const [first] = gettingStarted().steps;

    expect(first.description).toContain('kind is "income"');
    expect(first.description).toContain('Importing a bank statement');
    expect(first.description).toContain('Setting up categorisation rules');
  });

  it('spells out both ways to record an annual lump sum, and when each applies', () => {
    // The quick-setup step is what the first-visit intro shows, and this is the part a first-timer
    // gets wrong: they look for their bonus category, don't have one because payroll bundles it
    // into the salary deposit, and conclude the feature doesn't apply to them.
    const [, , third] = gettingStarted().steps;

    expect(third.description).toContain('two ways to record one');
    // Route 1 — its own category, ticked on the settings page.
    expect(third.description).toContain('its own transaction in its own category');
    expect(third.description).toContain('tick that category under "Annual lump sums"');
    // Route 2 — no category to tick, so it goes on the month itself.
    expect(third.description).toContain('paid inside your regular salary deposit');
    expect(third.description).toContain('Bonus column');
    // …and that the two are equivalent, so the reader doesn't hunt for a difference.
    expect(third.description).toContain('Both do the same thing');
  });

  it('lists the three empty-page causes with a fix for each', () => {
    const step = gettingStarted().steps.find((entry) => entry.title.includes('still looks empty'));

    expect(step?.description).toContain('No transactions in range');
    expect(step?.description).toContain('No income categories counted');
    expect(step?.description).toContain('career start date is not set after your data');
  });

  it('cross-references the other income guide from each, so neither reads as a duplicate', () => {
    expect(
      gettingStarted()
        .steps.map((step) => step.title)
        .join(),
    ).not.toBe('');
    expect(guideBySlug('reading-your-income-growth').summary).toContain(
      'Getting started with the Income page',
    );
  });

  it('lands its “Try it” button on the Income page', () => {
    expect(gettingStarted().tryItRoute).toBe('/income');
  });
});

describe('GUIDES: no step describes a surface that no longer exists (TICKET-PUB-07)', () => {
  // The v1.6 follow-up batch replaced or removed each of these. A guide that still describes them
  // is worse than no guide, because the reader trusts it and then can't find the control.
  it.each([
    ['dismiss', /dismiss/i],
    ['vs. previous month', /previous month/i],
    ['a settings popup', /settings popup|settings dropdown/i],
    ['a salary modal', /salary details modal|salary modal/i],
    ['a standalone take-home panel', /take-home rate panel/i],
  ])('never mentions %s', (_label, pattern) => {
    expect(incomeText()).not.toMatch(pattern);
  });

  it('describes navigating to the settings and salary pages, not opening overlays', () => {
    const text = incomeText();

    expect(text).toContain('Income settings page');
    expect(text).toContain('open Salary details');
  });
});

describe('GUIDES: copy carries no user-settable value (TICKET-PUB-07)', () => {
  // Currency symbol, date format and the gross series colour are all settings (SET-02/03/04/08),
  // so guide text must describe controls rather than baking in one user's values.
  it.each([
    ['a currency symbol', /[€$£¥]/],
    ['a locale-shaped date', /\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/],
    ['a theme colour name', /\b(amber|violet|teal|lime|rose|sky)\b/i],
  ])('contains no %s', (_label, pattern) => {
    expect(allText()).not.toMatch(pattern);
  });
});
