import { groupChangelogEntries } from './group-changelog-entries';
import type { ChangelogEntry } from './data/changelog-entries';

describe('groupChangelogEntries', () => {
  it('groups entries sharing a date and orders groups newest-first, regardless of input order', () => {
    const entries: readonly ChangelogEntry[] = [
      {
        date: '2026-07-01',
        versionFolder: 'v1.0_foundation',
        ticketIds: ['TICKET-TXN-01'],
        title: 'Older entry',
        area: 'Transactions',
      },
      {
        date: '2026-07-15',
        versionFolder: 'v2',
        ticketIds: ['TICKET-PUB-02'],
        title: 'Newest entry, first of two',
        area: 'Help',
      },
      {
        date: '2026-07-01',
        versionFolder: 'v1.0_foundation',
        ticketIds: ['TICKET-TXN-02', 'TICKET-TXN-03'],
        title: 'Second entry on the older date, batching two tickets',
        area: 'Transactions',
      },
      {
        date: '2026-07-15',
        versionFolder: 'v2',
        ticketIds: ['TICKET-PUB-03'],
        title: 'Newest entry, second of two',
        area: 'Help',
      },
    ];

    const groups = groupChangelogEntries(entries);

    expect(groups.map((g) => g.date)).toEqual(['2026-07-15', '2026-07-01']);
    expect(groups[0].entries.map((e) => e.title)).toEqual([
      'Newest entry, first of two',
      'Newest entry, second of two',
    ]);
    expect(groups[1].entries.map((e) => e.ticketIds)).toEqual([
      ['TICKET-TXN-01'],
      ['TICKET-TXN-02', 'TICKET-TXN-03'],
    ]);
  });

  it('returns an empty array for no entries', () => {
    expect(groupChangelogEntries([])).toEqual([]);
  });
});
