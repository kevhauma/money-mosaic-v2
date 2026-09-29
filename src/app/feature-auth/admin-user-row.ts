import type { AdminUser } from '@/core/auth';
import type { BadgeColor } from '@/shared/ui';
import { formatDate } from '@/shared/utils';

/**
 * One row of the admin panel's account table (TICKET-AUTH-03), with every display fact already
 * resolved — labels, badge colour, and which of the four actions this row may offer.
 *
 * A plain module in the feature root rather than fields on the page component, per the conventions:
 * templates branch on state and never derive it, and this row carries far more than a couple of
 * derived facts. It is also where the *mirrored* half of the server's invariants lives, so the page
 * can grey out a control instead of offering it and reporting the 409 it earns.
 */
export type AdminUserRow = {
  readonly id: number;
  readonly email: string;
  readonly displayName: string;
  readonly roleLabel: string;
  /** What the role button does next — "Make administrator" or "Make member". */
  readonly roleActionLabel: string;
  readonly nextRole: AdminUser['role'];
  readonly statusLabel: string;
  readonly statusColor: BadgeColor;
  /** What the disable/enable button does next. */
  readonly statusActionLabel: string;
  readonly disable: boolean;
  /** When the password last changed, or that it never has since the account was created. */
  readonly passwordChangedLabel: string;
  readonly createdLabel: string;
  /** This is the signed-in admin's own row — labelled, and not offered the two self-refusals. */
  readonly isSelf: boolean;
  readonly canChangeRole: boolean;
  readonly canDisable: boolean;
  readonly canDelete: boolean;
  /**
   * Your own row does not offer an admin reset: that route sets a password without asking for the
   * current one, which is only safe aimed at somebody else. Changing your own is Settings' job,
   * where TICKET-AUTH-04 asks for the current password first.
   */
  readonly canResetPassword: boolean;
  /**
   * Why the controls above are unavailable, for the row that cannot use them — rendered as a caption
   * beneath the row's buttons, so a greyed-out control explains itself rather than looking broken.
   * (Not a button `title`: `mm-button` exposes no such input, and a tooltip nobody hovers is not an
   * explanation.)
   */
  readonly blockedReason: string | null;
};

const ROLE_LABEL: Record<AdminUser['role'], string> = { admin: 'Administrator', user: 'Member' };

const LAST_ADMIN_REASON =
  'This is the last administrator who can sign in. Promote another account first.';
const SELF_REASON =
  'This is your own account. Disable and delete are for other people; change your own password in Settings.';

/** An ISO-8601 instant as the app's locale-aware date — the panel never shows a time of day. */
const asDate = (isoInstant: string): string => formatDate(isoInstant.slice(0, 10));

/** The last-administrator rule is stated first: it is the reason even on the admin's own row. */
const reasonFor = (isLastAdmin: boolean, isSelf: boolean): string | null => {
  if (isLastAdmin) return LAST_ADMIN_REASON;
  return isSelf ? SELF_REASON : null;
};

export type AdminUserRowContext = {
  /** The signed-in admin, whose own row is the one the self-rules are about. */
  readonly callerId: number;
  /** How many accounts are administrators who are not disabled — the server's own count. */
  readonly enabledAdminCount: number;
};

export const toAdminUserRow = (
  user: AdminUser,
  { callerId, enabledAdminCount }: AdminUserRowContext,
): AdminUserRow => {
  const isSelf = user.id === callerId;
  // The same condition the server checks, in the same words: an administrator who can sign in, and
  // the only one. Demoting, disabling or deleting them would leave nobody able to administer.
  const isLastAdmin = user.role === 'admin' && !user.disabled && enabledAdminCount <= 1;
  // The account has never had its password changed since it was created, which for the seeded
  // `admin` means it is still `admin`.
  const passwordUnchanged = user.passwordUpdatedAt === user.createdAt;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roleLabel: ROLE_LABEL[user.role],
    roleActionLabel: user.role === 'admin' ? 'Make member' : 'Make administrator',
    nextRole: user.role === 'admin' ? 'user' : 'admin',
    statusLabel: user.disabled ? 'Disabled' : 'Active',
    statusColor: user.disabled ? 'warning' : 'success',
    statusActionLabel: user.disabled ? 'Enable' : 'Disable',
    disable: !user.disabled,
    passwordChangedLabel: passwordUnchanged
      ? 'Never changed'
      : `Changed ${asDate(user.passwordUpdatedAt)}`,
    createdLabel: asDate(user.createdAt),
    isSelf,
    canChangeRole: !isLastAdmin,
    canDisable: !isSelf && !isLastAdmin,
    canDelete: !isSelf && !isLastAdmin,
    canResetPassword: !isSelf,
    blockedReason: reasonFor(isLastAdmin, isSelf),
  };
};
