import type { Category } from '@/core/data-access';
import type { BadgeColor } from '@/shared/ui';

/**
 * One category row's full render state (TICKET-CAT-10), joined once so the `@for` loop never calls
 * a component method per row — `categoryIconName`/`badgeColorFor`/`transactionCountFor`/`isFirst`/
 * `isLast` all collapse into this, the `account-card-vm.ts` precedent.
 *
 * The `endedLabel` field is what forced it: formatting a date means a `new Date()` allocation and an
 * `Intl` call, and doing that per row per change-detection pass is exactly the cost the
 * templates-never-derive rule exists to prevent.
 */
export type CategoryRowVm = {
  category: Category;
  iconName: string;
  kindBadgeColor: BadgeColor | undefined;
  transactionCount: number;
  isFirst: boolean;
  isLast: boolean;
  /** `'Ended 06/30/2023'` once the applicability window has closed, else `''` — the template branches on emptiness. */
  endedLabel: string;
};
