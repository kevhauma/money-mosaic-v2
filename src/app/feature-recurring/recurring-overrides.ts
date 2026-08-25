import type { RecurringOverride } from '@/core/data-access';
import { mergeRecurringSeries, type RecurringPaymentSeries } from '@/core/stats';

/**
 * Applies the user's corrections on top of a fresh detection run (TICKET-REC-11).
 *
 * The whole point is that this survives re-detection: detection is a pure derivation that re-runs
 * on every transaction change, so an override that could only be expressed as "edit the detected
 * row" would be wiped every time. Instead an override names a **transaction id**, and is re-matched
 * to whichever freshly-detected series still contains it — which is stable across a price change
 * (which moves the series key), across new payments arriving, and across older history being
 * imported (which moves the series' first occurrence).
 *
 * The same guarantee `categoryManual` gives categorisation, by the same means: the automation is
 * free to recompute everything, and is not free to overwrite what the user said about it.
 */
export type AppliedRecurringOverrides = {
  /** What the page shows: detected series, minus dismissals, with merges folded together. */
  series: RecurringPaymentSeries[];
  /** The dismissed ones, kept so the page can offer them back — a dismissal is itself reversible. */
  dismissed: DismissedSeries[];
  /**
   * For each series that only looks the way it does because the user merged something into it, the
   * override that did it — so the row can offer to undo it. A merge is automation the user applied
   * rather than automation the app applied, and it has to be as reversible as the rest.
   */
  mergeOverrideIdByKey: Map<string, number>;
};

/** A dismissed series, paired with the override that dismissed it so it can be undone. */
export type DismissedSeries = {
  series: RecurringPaymentSeries;
  overrideId: number;
};

/** Two detections the user could plausibly be told are one payment (TICKET-REC-11). */
export type MergeCandidatePair = {
  primary: RecurringPaymentSeries;
  duplicate: RecurringPaymentSeries;
};

const occurrenceIds = (series: RecurringPaymentSeries): Set<number> =>
  new Set(series.occurrences.map((occurrence) => occurrence.transactionId));

/**
 * The series an override is about, or `undefined` when nothing matches it any more — which happens
 * when the anchoring transaction was deleted, or when the rows around it stopped being a rhythm.
 * A stale override is skipped, never treated as an error: the user's correction outliving the thing
 * it corrected is the normal end of its life, not a fault.
 */
const seriesFor = (
  series: readonly RecurringPaymentSeries[],
  transactionId: number,
): RecurringPaymentSeries | undefined =>
  series.find((entry) =>
    entry.occurrences.some((occurrence) => occurrence.transactionId === transactionId),
  );

/**
 * Any transaction id that identifies this series for storage. The **earliest** occurrence, because
 * it is the one a later import cannot invent: new payments arrive at the end, so anchoring at the
 * start keeps one override pointing at one series for as long as the series exists.
 */
export const anchorOf = (series: RecurringPaymentSeries): number =>
  series.occurrences[0].transactionId;

export const applyRecurringOverrides = (
  detected: readonly RecurringPaymentSeries[],
  overrides: readonly RecurringOverride[],
): AppliedRecurringOverrides => {
  const dismissed: DismissedSeries[] = [];
  const dismissedKeys = new Set<string>();

  for (const override of overrides) {
    if (override.kind !== 'dismissed' || override.id == null) continue;
    const match = seriesFor(detected, override.anchorTransactionId);
    if (!match || dismissedKeys.has(match.key)) continue;
    dismissedKeys.add(match.key);
    dismissed.push({ series: match, overrideId: override.id });
  }

  const surviving = detected.filter((entry) => !dismissedKeys.has(entry.key));

  // Merges are applied after dismissals, over what is left: merging into a row the user has since
  // dismissed would resurrect it.
  const byKey = new Map(surviving.map((entry) => [entry.key, entry]));
  const absorbedKeys = new Set<string>();
  const mergeOverrideIdByKey = new Map<string, number>();

  for (const override of overrides) {
    if (override.kind !== 'merged' || override.mergedIntoTransactionId == null) continue;
    const duplicate = seriesFor(surviving, override.anchorTransactionId);
    const primary = seriesFor(surviving, override.mergedIntoTransactionId);
    if (!duplicate || !primary || duplicate.key === primary.key) continue;
    if (absorbedKeys.has(duplicate.key) || absorbedKeys.has(primary.key)) continue;

    byKey.set(primary.key, mergeRecurringSeries(byKey.get(primary.key) ?? primary, duplicate));
    absorbedKeys.add(duplicate.key);
    if (override.id != null) mergeOverrideIdByKey.set(primary.key, override.id);
  }

  const series = surviving
    .filter((entry) => !absorbedKeys.has(entry.key))
    .map((entry) => byKey.get(entry.key) ?? entry)
    // The detector sorts by monthly cost and a merge changes that figure, so the order is restated
    // rather than left to whatever the pre-merge sort happened to be.
    .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);

  return { series, dismissed, mergeOverrideIdByKey };
};

/**
 * Pairs of rows worth offering as "these look like the same payment" (TICKET-REC-11) — the review's
 * own example was FreshMarket listed twice, at €73.15 and €58.40, same counterparty and same
 * category.
 *
 * Same counterparty **and** same category is a deliberately narrow test. A suggestion the user has
 * to reject is worse than one that never appears: the app is not claiming these are one payment,
 * only that they are the shape of thing that usually is, and the user decides.
 *
 * The earlier-starting series is the primary, so a merge keeps the longer history's identity.
 */
export const mergeCandidatePairs = (
  series: readonly RecurringPaymentSeries[],
): MergeCandidatePair[] => {
  const pairs: MergeCandidatePair[] = [];

  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const a = series[i];
      const b = series[j];
      if (a.label !== b.label || a.categoryId !== b.categoryId) continue;
      // Overlapping occurrences mean they are already one series by another route.
      const ids = occurrenceIds(a);
      if (b.occurrences.some((occurrence) => ids.has(occurrence.transactionId))) continue;

      const [primary, duplicate] = a.occurrences[0].date <= b.occurrences[0].date ? [a, b] : [b, a];
      pairs.push({ primary, duplicate });
    }
  }

  return pairs;
};
