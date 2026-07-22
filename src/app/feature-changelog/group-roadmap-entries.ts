import type { RoadmapEntry } from './data/roadmap-entries';

export type RoadmapGroup = {
  readonly versionFolder: string;
  readonly entries: readonly RoadmapEntry[];
};

/**
 * Groups entries by `versionFolder`, preserving each version's first-appearance order in the input
 * (its build order in `overview.md`) rather than sorting — unlike Changelog, Roadmap has no date to
 * sort by. Entries within a group keep their input order too.
 */
export function groupRoadmapEntries(entries: readonly RoadmapEntry[]): readonly RoadmapGroup[] {
  const byVersion = new Map<string, RoadmapEntry[]>();
  for (const entry of entries) {
    const group = byVersion.get(entry.versionFolder);
    if (group) {
      group.push(entry);
    } else {
      byVersion.set(entry.versionFolder, [entry]);
    }
  }

  return Array.from(byVersion.entries()).map(([versionFolder, groupEntries]) => ({
    versionFolder,
    entries: groupEntries,
  }));
}

const VERSION_PREFIX = /^v\d+(?:\.\d+)*_/;

/**
 * Derives a plain-language group heading from a `versionFolder`, for versions the Roadmap
 * shouldn't surface a raw version number for (e.g. not-yet-built future tracks or the raw idea
 * backlog) — `"v1.6_income_growth"` → `"Income Growth"`, `"v9999_ideas"` → `"Ideas"`. A folder with
 * no `v<N>_<slug>` shape (e.g. `"v2"`, the current near-term backlog) is returned unchanged.
 */
export function formatRoadmapHeading(versionFolder: string): string {
  const slug = versionFolder.replace(VERSION_PREFIX, '');
  if (slug === versionFolder) {
    return versionFolder;
  }

  return slug
    .split(/[_-]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
