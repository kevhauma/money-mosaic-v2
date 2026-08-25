import { groupRoadmapEntries } from './group-roadmap-entries';
import type { RoadmapEntry } from './data/roadmap-entries';

describe('groupRoadmapEntries', () => {
  it('groups entries sharing an area and orders groups by first appearance, not sorted', () => {
    const entries: readonly RoadmapEntry[] = [
      {
        ticketId: 'TICKET-SET-05',
        title: 'First settings entry',
        area: 'App Settings',
      },
      {
        ticketId: 'TICKET-XYZ-01',
        title: 'First somewhere entry',
        area: 'Somewhere',
      },
      {
        ticketId: 'TICKET-SET-02',
        title: 'Second settings entry',
        area: 'App Settings',
      },
      {
        ticketId: 'TICKET-XYZ-02',
        title: 'Second somewhere entry',
        area: 'Somewhere',
      },
    ];

    const groups = groupRoadmapEntries(entries);

    expect(groups.map((g) => g.area)).toEqual(['App Settings', 'Somewhere']);
    expect(groups[0].entries.map((e) => e.title)).toEqual([
      'First settings entry',
      'Second settings entry',
    ]);
    expect(groups[1].entries.map((e) => e.ticketId)).toEqual(['TICKET-XYZ-01', 'TICKET-XYZ-02']);
  });

  it('returns an empty array for no entries', () => {
    expect(groupRoadmapEntries([])).toEqual([]);
  });
});
