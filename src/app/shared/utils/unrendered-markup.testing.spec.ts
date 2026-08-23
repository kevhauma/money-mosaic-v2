import { findUnrenderedMarkup } from './unrendered-markup.testing';

/**
 * The guard's own tests (TICKET-PUB-10) — a guard nobody has watched fail is not a guard. The
 * datasets it protects assert against it in `guides.spec.ts` and `changelog-content.spec.ts`.
 */
describe('findUnrenderedMarkup (TICKET-PUB-10)', () => {
  it.each([
    ['emphasis', 'the money coming *in* and out', '*in*'],
    ['strong', 'this is **important** to know', '**important**'],
    ['underscore emphasis', 'the money coming _in_ and out', '_in_'],
    ['inline code', 'set `locale` in Settings', '`locale`'],
    ['a markdown link', 'see [the guide](/help) for more', '[the guide](/help)'],
    ['a heading marker', '## Importing\nDrag your file in', '## I'],
  ])('flags %s, naming the fragment it found', (_label, text, expected) => {
    expect(findUnrenderedMarkup(text)).toContain(expected);
  });

  it.each([
    'A rule can do it for you every time (see "Setting up categorisation rules").',
    'Price ↑ €9.99 → €12.99 — instead of quietly nudging its average.',
    'Each file needs an account chosen next to it — an "Auto-detected" badge says which.',
    'Your stake is your own deposits and income, minus your share of what the account spends.',
    'snake_case and a trailing_ underscore are words, not emphasis',
    '2 * 3 is 6, and 10 * 10 is 100',
  ])('leaves plain prose alone: %s', (text) => {
    expect(findUnrenderedMarkup(text)).toEqual([]);
  });
});
