import type { RoadmapEntry } from './data/roadmap-entries';

export type RoadmapGroup = {
  readonly area: string;
  readonly entries: readonly RoadmapEntry[];
};

/**
 * Groups entries by `area`, preserving each area's first-appearance order in the input rather than
 * sorting — unlike Changelog, Roadmap has no date to sort by. Entries within a group keep their
 * input order too.
 *
 * Grouped by area rather than by release because a roadmap entry is by definition unshipped, so it
 * belongs to no release yet — and `docs/` organises tickets by area for the same reason.
 */
export function groupRoadmapEntries(entries: readonly RoadmapEntry[]): readonly RoadmapGroup[] {
  const byArea = new Map<string, RoadmapEntry[]>();
  for (const entry of entries) {
    const group = byArea.get(entry.area);
    if (group) {
      group.push(entry);
    } else {
      byArea.set(entry.area, [entry]);
    }
  }

  return Array.from(byArea.entries()).map(([area, groupEntries]) => ({
    area,
    entries: groupEntries,
  }));
}
