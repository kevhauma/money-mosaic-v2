import { findUnrenderedMarkup } from '@/shared/utils/unrendered-markup.testing';
import { CHANGELOG_ENTRIES } from './changelog-entries';
import { ROADMAP_ENTRIES } from './roadmap-entries';

/**
 * The same guard `guides.spec.ts` runs over `/help` (TICKET-PUB-10), extended to the Changelog and
 * Roadmap tabs: they are the other hand-authored prose in the app, written the same way and
 * interpolated the same way. One changelog detail line already carried a literal `*cut*`.
 */
describe('changelog and roadmap content renders as written (TICKET-PUB-10)', () => {
  const offendersIn = (labelled: readonly (readonly [string, string])[]): string[] =>
    labelled
      .map(([where, text]) => [where, findUnrenderedMarkup(text)] as const)
      .filter(([, found]) => found.length > 0)
      .map(([where, found]) => `${where}: ${found.join(', ')}`);

  it('leaves no unrendered markup in any changelog entry', () => {
    expect(
      offendersIn(
        CHANGELOG_ENTRIES.flatMap((entry) => [
          [`${entry.ticketIds.join('/')} · title`, entry.title] as const,
          ...(entry.details ?? []).map(
            (detail, index) =>
              [`${entry.ticketIds.join('/')} · detail ${index + 1}`, detail] as const,
          ),
        ]),
      ),
    ).toEqual([]);
  });

  it('leaves no unrendered markup in any roadmap entry', () => {
    expect(
      offendersIn(
        ROADMAP_ENTRIES.flatMap((entry) => [
          [`${entry.ticketId} · title`, entry.title] as const,
          [`${entry.ticketId} · area`, entry.area] as const,
        ]),
      ),
    ).toEqual([]);
  });
});
