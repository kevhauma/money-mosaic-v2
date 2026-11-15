# TICKET-MCP-06 — "Copy token" works over plain HTTP on a LAN

- **Area:** MCP
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** extends [TICKET-MCP-05](./TICKET-MCP-05-self-service-tokens-in-settings.md) (self-service tokens); CR6-28 ([code review](../../releases/v3_code_review_2/code-review.md))

## User story

As someone opening Money Mosaic on my home network by its IP address, I want the "Copy token" and "Copy command" buttons to actually copy, so I can paste my new MCP token before it disappears.

## Description

The token is shown only once, and the copy buttons use the browser's async Clipboard API. That API only exists on secure pages (HTTPS or `localhost`). The app's normal deployment is plain HTTP on a LAN address, where the buttons throw and nothing is copied.

## Current situation (as-is)

- `copy()` in [`settings-mcp-tokens-section.component.ts`](../../../src/app/feature-settings/components/settings-mcp-tokens-section/settings-mcp-tokens-section.component.ts) (lines 113–116) calls `navigator.clipboard.writeText(text)`. On `http://192.168.x.x:4300`, `navigator.clipboard` is `undefined`, so the click throws a `TypeError`. "Copied." never shows, and there is no message.
- Both buttons in the [template](../../../src/app/feature-settings/components/settings-mcp-tokens-section/settings-mcp-tokens-section.component.html) go through it: "Copy token" (line 37) and "Copy command" (line 42).
- `@angular/cdk` is already a dependency. Its `Clipboard` service (`@angular/cdk/clipboard`) copies through a hidden textarea, which works on insecure pages too. Nothing in the app uses it yet.

## Desired result (to-be)

- `copy()` uses the CDK `Clipboard` service, so both buttons copy on HTTP LAN addresses as well as on `localhost` and HTTPS.
- When the copy reports failure, the section says so in place of "Copied.", e.g. "Couldn't copy — select the text and copy it by hand." The token stays on screen either way.

## Acceptance criteria

- [ ] "Copy token" and "Copy command" copy their text through `Clipboard.copy` and show "Copied." when it returns `true`. (`settings-mcp-tokens-section.component.spec.ts` → "copies the token and the command through the CDK clipboard".)
- [ ] When `Clipboard.copy` returns `false`, the fallback message shows and "Copied." doesn't. (Same spec → "says so when the copy fails".)
- [ ] No component calls `navigator.clipboard` directly any more. (`grep -rn "navigator.clipboard" src/app` is empty.)
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass, and the bundle budget is unchanged.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser **over the LAN IP, not `localhost`** (`localhost` counts as secure, so it hides the bug): create a token, press both buttons, paste both.

## Notes

- Settings is lazy-loaded, so `@angular/cdk/clipboard` lands in that chunk, not the eager one.
