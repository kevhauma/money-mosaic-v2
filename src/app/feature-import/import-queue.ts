import type { Account } from '@/core/data-access';

/** A not-yet-persisted account, created inline from step 1 (TICKET-IMP-08) — only becomes a real `Account` at commit time. */
export type PendingAccountDraft = {
  id: string;
  /** The queued file whose "+ New account" action created this draft — the one and only file that actually persists it (TICKET-IMP-08). */
  ownerFile: File;
  name: string;
  iban: string;
  /**
   * Matches `Account['type']`, including `'joint'` — a joint draft is created with no co-owners
   * registered (`coOwners`/`ownershipShare` both left `undefined`, same as any other account
   * created with none), editable afterward via the full account form on the Accounts screen.
   */
  type: Account['type'];
};

export type QueuedImportFile = {
  file: File;
  accountId: number | null;
  autoDetected: boolean;
  /** Set once this file is linked to (or owns) a `PendingAccountDraft`; mutually exclusive with a non-null `accountId` (TICKET-IMP-08). */
  pendingDraftId: string | null;
  /** The file's own IBAN/account number detected via `detectOwnIban`, kept even when it matched no existing account, so "+ New account" can pre-fill from it (TICKET-IMP-08). */
  detectedIban: string | null;
};
