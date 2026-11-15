# TICKET-AUTH-06 — Renaming yourself on the admin page updates the shell

- **Area:** Auth & Accounts
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** extends [TICKET-AUTH-03](./TICKET-AUTH-03-admin-user-management.md) (admin rename); CR5-25 ([CR5 review](../../releases/v3_code_review/code-review.md)), re-confirmed by CR6

## User story

As an administrator, I want renaming my own account on the admin page to change the name shown in the app's header right away, so I don't have to reload to see it worked.

## Description

Renaming yourself from Settings already updates the shell, because it patches the session. Renaming yourself from the admin page saves to the server but never tells the session, so the old name stays in the header until a reload. Demoting yourself on the same page already re-reads the session; renaming doesn't.

## Current situation (as-is)

- `saveRename` in [`admin-users-page.component.ts`](../../../src/app/feature-auth/components/admin-users-page/admin-users-page.component.ts) (lines 124–133) saves through `AdminUsersStore.saveChanges` and shows "Renamed to …". It never touches `SessionStore`, even when `row.isSelf`.
- `toggleRole` (lines 135–149) in the same file calls `this.session.refresh()` after changing your own role.
- The shell's user area reads `sessionStore.displayName()` ([`app-shell.component.html`](../../../src/app/core/layout/app-shell/app-shell.component.html) line 262), which still holds the name from sign-in.
- CR5 cited lines 126–135. The method has since moved to 124–133; the behaviour is unchanged.

## Desired result (to-be)

- After a successful rename of your own row, the page calls `session.refresh()`, as `toggleRole` does. The header shows the new name without a reload.
- Renaming another account doesn't call `refresh()`. A failed rename doesn't call it either.

## Acceptance criteria

- [ ] Renaming your own row calls `SessionStore.refresh()` once after the save succeeds. (`admin-users-page.component.spec.ts` → new case "re-reads the session after renaming your own account".)
- [ ] Renaming another user's row, or a rename the server refuses, doesn't call `refresh()`. (Same spec, second case.)
- [ ] The existing "renames an account in place" and self-demotion cases still pass.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: as admin, rename yourself on `/admin/users` and see the header name change with no reload.
