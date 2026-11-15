# TICKET-DAT-06 — The data-management page says the theme is stored per account

- **Area:** Data management
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** follows [TICKET-SRV-10](../../server/tickets/TICKET-SRV-10-ui-preferences-off-localstorage.md) (UI preferences moved to the account); CR6-36, part ([code review](../../releases/v3_code_review_2/code-review.md))

## User story

As someone reading where my data lives, I want the page to say my theme and preferences follow my account, so I'm not misled into thinking each browser keeps its own.

## Description

Since SRV-10, the browser holds nothing but the session cookie. The theme, the landing-page flag and the backup-reminder flag are saved to the account. The "Where your data lives" card still says the browser keeps "a few per-browser preferences like your theme".

## Current situation (as-is)

- [`data-management-overview.component.html`](../../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.html) lines 74–78 read: "Your browser keeps nothing but your session and a few per-browser preferences like your theme — signing in from another browser or device shows you the same figures."
- No spec pins this sentence.

## Desired result (to-be)

- The sentence says the browser keeps only the session, and that the theme and other preferences are saved to the account. For example: "Your browser keeps nothing but your session — your theme and other preferences are saved to your account, so signing in from another browser or device shows you the same figures and the same look."
- The rest of the card, including the backup warning, is unchanged.

## Acceptance criteria

- [ ] The card no longer says "per-browser", and says preferences are saved to the account.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: the Data management section of Settings shows the new sentence.

## Notes

- The loans page's stale "Loan tracking is on its way" copy, the other half of CR6-36, is TICKET-LOAN-18.
