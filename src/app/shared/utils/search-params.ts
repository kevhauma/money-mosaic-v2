export const STAT_QUERY_PARAMS = {
  from: 'from',
  to: 'to',
  groupBy: 'groupBy',
  categoryId: 'categoryId',
  accountId: 'accountId',
} as const;

/** Shared sentinel for "no category assigned" across the topbar/dashboard drill-downs and the transactions filter form. */
export const UNCATEGORISED_SENTINEL = 'uncategorised';

export type TransactionDrilldownParams = {
  from?: string;
  to?: string;
  categoryId?: number | typeof UNCATEGORISED_SENTINEL;
  accountId?: number;
};

/** Builds the `/transactions` query params for a drill-down link — deliberately omits `groupBy` since a flat list has nothing to bucket. */
export const buildTransactionDrilldownParams = (
  params: TransactionDrilldownParams,
): Record<string, string> => {
  const query: Record<string, string> = {};
  if (params.from) query[STAT_QUERY_PARAMS.from] = params.from;
  if (params.to) query[STAT_QUERY_PARAMS.to] = params.to;
  if (params.categoryId != null) query[STAT_QUERY_PARAMS.categoryId] = String(params.categoryId);
  if (params.accountId != null) query[STAT_QUERY_PARAMS.accountId] = String(params.accountId);
  return query;
};
