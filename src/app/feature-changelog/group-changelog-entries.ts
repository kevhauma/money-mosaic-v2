import type { ChangelogEntry } from './data/changelog-entries';

export type ChangelogGroup = {
  readonly date: string;
  readonly entries: readonly ChangelogEntry[];
};

/** Groups entries by `date`, newest date first; entries within a group keep their input order. */
export function groupChangelogEntries(
  entries: readonly ChangelogEntry[],
): readonly ChangelogGroup[] {
  const byDate = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const group = byDate.get(entry.date);
    if (group) {
      group.push(entry);
    } else {
      byDate.set(entry.date, [entry]);
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, groupEntries]) => ({ date, entries: groupEntries }));
}
