---
target: landing page
total_score: 16
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 2
timestamp: 2026-07-27T19-27-59Z
slug: components-home-landing-home-landing-component-ts
---
Method: dual-agent (A: design-review sub-agent · B: detector/browser-evidence sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "Supported banks" never signals whether *your* bank works before you commit |
| 2 | Match System / Real World | 3 | Engineering-speak leaks: "virtualized table", "background worker", "fingerprint match", "neutral category kind" |
| 3 | User Control and Freedom | 2 | One-shot page: after first click the guard redirects `''` to /dashboard forever; nothing links back |
| 4 | Consistency and Standards | 3 | "Get started — it's free" vs "Open dashboard" for the same destination; "MoneyMosaic" vs "Money Mosaic" |
| 5 | Error Prevention | n/a | No inputs, no destructive actions |
| 6 | Recognition Rather Than Recall | 3 | With no screenshot, the visitor must imagine the product from ~31 bullets |
| 7 | Flexibility and Efficiency | n/a | Single-path Persuade surface with one action |
| 8 | Aesthetic and Minimalist Design | 2 | "Everything included" is a spec sheet occupying ~40% of page length at 13px caption size |
| 9 | Error Recovery | n/a | No error states possible on a static page |
| 10 | Help and Documentation | n/a | Persuade surface; the GitHub link partially serves the role |
| **Total** | | **16/24** | **Acceptable (67%)** |

## Design Specificity Verdict

**LLM assessment:** The copy is unmistakably authored for this product — contribution-based joint accounts, IBAN transfer matching, manual-category-never-overwritten, on-device ML that "only ever suggests." No generic finance SaaS could ship those sentences. The visual design, though, is the stock SaaS landing template (centered hero → trust chips → 6-card grid → 3 steps → feature list → closing CTA) with zero product imagery and zero mosaic motif. Verdict: **specific words wearing a generic body.**

**Deterministic scan:** Static scan of `home-landing.component.html` came back clean (0 findings). The live in-page detector found 10, which corroborate the "generic SaaS body" verdict from the styling side: colored glow shadows (#ff756f) on dark background plus 1px-border-with-16px-shadow on the three step cards (6 findings, but really 3 elements double-counted), 11 em-dashes in body text, cramped padding on the hero CTA, and 2 heading-rhythm flags. False positives: both heading-rhythm flags (the h2s sit at the top of sections whose padding provides the space the margin-only measurement misses) and likely the CTA padding (daisyUI buttons center text via flex height, not padding). The genuine detector catches the review missed: the **colored card glows** — a recognizable template-styling tell — and the **em-dash density**, which matches the page's overall "written, not designed" character.

**Visual overlays:** Script injection succeeded and 19 overlay elements were confirmed in the page DOM, but the Browser pane wasn't displayed during the run, so no screenshot of the overlays could be captured. The overlay tab has since been cleaned up along with the dev server.

## Overall Impression

This page has the hardest part right: an honest, product-true pitch with real proof (the GitHub link as "verify, don't trust") and textbook hero conversion mechanics. What it lacks is a body worthy of the words — no image of the product it's selling, a mid-page valley of ~31 caption-sized bullets, and card styling the detector independently flagged as template-generic. The single biggest opportunity: **show the mosaic.** The product is named after many small tiles forming one picture, the dashboard literally is that picture, and the page shows no picture at all.

## What's Working

1. **Honest, product-true copy with real proof.** No fabricated testimonials or logos; the claims map 1:1 to actual product rules, and the "read the source yourself" GitHub link is exactly the right trust mechanism for a privacy pitch.
2. **Hero conversion mechanics.** Single primary action above the fold on both viewports (CTA bottom edge at 542px of an 812px mobile viewport), 48px tap target, risk-reversal caption ("No signup. No credit card. Nothing to install."), and three trust chips that echo real differentiators.
3. **Robust rendering it was never hand-tuned for.** Light and dark both render coherently via daisyUI's `prefersdark` even though `ThemeService` never runs on this route; no horizontal overflow at 375px; clean h1→h2→h3 order; decorative blobs are `aria-hidden` and `pointer-events-none`; zero console errors.

## Priority Issues

1. **[P1] No product imagery anywhere.** A finance dashboard is the most screenshot-able genre there is; the page says "See it for yourself" and shows nothing — persuasion rests 100% on reading. **Fix:** one theme-aware dashboard visual in/under the hero — a real screenshot with demo seed data, or an inline SVG mock (keeps local-first purity, ships no image assets). **Suggested command:** /impeccable bolder
2. **[P1] "Everything included" is a documentation dump.** 7 cards, ~31 bullets, ~40% of page height, all at 13px/70%-opacity — it buries the closing CTA and reads as a README. Cognitive-load check fails 3 of 8 items here (chunking, ≤4 options per decision point, progressive disclosure). **Fix:** collapse/accordion per group with 1-line summaries, or cut each group to its 2–3 differentiating bullets and move the rest to the repo README. **Suggested command:** /impeccable distill
3. **[P2] Template-tell card styling.** The three step cards carry a colored glow (#ff756f) on dark background plus the 1px-border-wide-shadow combo — the detector's most reliable "generic AI landing" signature, and it undercuts the authored feel the copy earns. **Fix:** replace glows with flat elevation or a border-color shift consistent with the app's own surface system. **Suggested command:** /impeccable polish
4. **[P2] The local-first trade-off is spun, not sold — and the banks are never named.** "No company holding your history hostage" invites "no — one browser profile holds it hostage instead"; skeptics punish detectable spin. Meanwhile "supported banks" never says KBC/Belfius, which costs nothing and is instant credibility for the actual audience. **Fix:** a candid card — "Your data lives in this browser. Moving devices? One-click JSON backup and restore." — plus "Works out of the box with KBC and Belfius exports; a one-time mapping wizard handles any other bank." **Suggested command:** /impeccable clarify
5. **[P2] The page is unreachable after one click.** `homeRedirectGuard` redirects `''` to /dashboard forever and nothing links back, so the pitch can never be re-read or shared. **Fix:** expose it as `/welcome` or `/about` from settings or the shell footer; keep the guard's current behavior on `''`. **Suggested command:** /impeccable shape

## Persona Red Flags

**Jordan (confused first-timer):** The very first words on the page are the eyebrow label "Local-first personal finance" — jargon Jordan doesn't know (the h1 explains it, but the term leads). Bullets like "virtualized table" and "fingerprint match" are engineer-speak. Biggest risk: the CTA promises "your full financial picture" and drops Jordan onto an **empty dashboard** — the landing does nothing to preview or soften that first empty moment.

**Riley (deliberate stress tester):** Absolutist claims are attack surface — "**Every** other finance app asks you to trust a company with your bank credentials" (false: other CSV-import tools exist), "**Nothing** to breach" (device theft, shared computers). Riley's first question — "what if I clear browser data or switch laptops?" — is answered only by a buried bullet in the last feature card. Riley will also notice the GitHub repo is named `money-mosaic-v2`, not the brand name.

**Casey (distracted mobile user):** 6,147px of mobile page with **no CTA between 542px and ~5,900px** — interrupted mid-scroll, the action is six screens away in either direction. The entire "Everything included" section renders at 13px/70%-opacity on a phone. Trust chips wrap raggedly (one chip alone on the first row at 375px).

## Minor Observations

- "Free" appears 4 times and "data never leaves" ~5 times; this much repetition starts to dilute.
- 11 em-dashes in body text (detector-confirmed) — the copy voice leans on one rhythm.
- Step cards read icon → "STEP 1" → title on separate visual rows; the number label floats oddly next to the icon.
- Zero motion anywhere — reduced-motion-safe by default, but a single fade-up on the hero would add polish at negligible cost.
- Value-prop card title lengths vary widely, producing uneven rhythm in the 3-column grid.
- No footer (license, version, contact) — the mid-hero GitHub link carries all that weight.

## Questions to Consider

1. The strongest proof this page owns — "read the source yourself" — is a footnote-sized caption link. For a product whose entire thesis is *verifiability over trust*, should that be the hero's secondary action instead of its smallest element?
2. The product is named after a mosaic — many small tiles forming one picture — and the dashboard literally is that picture. Why does the landing contain neither a mosaic motif nor the picture?
3. Given the page shows once, ever: is the 31-bullet inventory persuading a visitor, or reassuring the author — and what would this page look like if it were allowed to be half as long and twice as visual?
