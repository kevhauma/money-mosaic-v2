import { formatRoadmapHeading, groupRoadmapEntries } from './group-roadmap-entries';
import type { RoadmapEntry } from './data/roadmap-entries';

describe('groupRoadmapEntries', () => {
  it('groups entries sharing a versionFolder and orders groups by first appearance, not sorted', () => {
    const entries: readonly RoadmapEntry[] = [
      {
        versionFolder: 'v2',
        ticketId: 'TICKET-SET-05',
        title: 'First v2 entry',
        area: 'App Settings',
      },
      {
        versionFolder: 'v1.6_future',
        ticketId: 'TICKET-XYZ-01',
        title: 'First v1.6 entry',
        area: 'Somewhere',
      },
      {
        versionFolder: 'v2',
        ticketId: 'TICKET-SET-02',
        title: 'Second v2 entry',
        area: 'App Settings',
      },
      {
        versionFolder: 'v1.6_future',
        ticketId: 'TICKET-XYZ-02',
        title: 'Second v1.6 entry',
        area: 'Somewhere',
      },
    ];

    const groups = groupRoadmapEntries(entries);

    expect(groups.map((g) => g.versionFolder)).toEqual(['v2', 'v1.6_future']);
    expect(groups[0].entries.map((e) => e.title)).toEqual(['First v2 entry', 'Second v2 entry']);
    expect(groups[1].entries.map((e) => e.ticketId)).toEqual(['TICKET-XYZ-01', 'TICKET-XYZ-02']);
  });

  it('returns an empty array for no entries', () => {
    expect(groupRoadmapEntries([])).toEqual([]);
  });
});

describe('formatRoadmapHeading', () => {
  it('strips a leading version-number prefix and title-cases the remainder', () => {
    expect(formatRoadmapHeading('v1.6_income_growth')).toBe('Income Growth');
    expect(formatRoadmapHeading('v1.7_loan_tracker')).toBe('Loan Tracker');
    expect(formatRoadmapHeading('v1.8_extended_date_range_picker')).toBe(
      'Extended Date Range Picker',
    );
    expect(formatRoadmapHeading('v9999_ideas')).toBe('Ideas');
  });

  it('leaves a version folder with no trailing slug unchanged', () => {
    expect(formatRoadmapHeading('v2')).toBe('v2');
  });
});
