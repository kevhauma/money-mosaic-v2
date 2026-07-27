# Landing Page — Critique Issues

Source: `/impeccable critique` run 2026-07-27 against
`src/app/feature-home/components/home-landing/home-landing.component.html` / `.ts`.
Full report: `.impeccable/critique/2026-07-27T19-27-59Z__components-home-landing-home-landing-component-ts.md`.
Score: **16/24 (Acceptable)** — heuristics 5, 7, 9, 10 n/a on this Persuade surface.

Scope decisions (2026-07-27): hero visual first, then everything else; **all copy issues explicitly out of scope** (marked ⛔ below).

## Priority issues

| # | Sev | Issue | Fix | Command | Status |
|---|-----|-------|-----|---------|--------|
| 1 | P1 | **No product imagery anywhere.** The page says "See it for yourself" and shows nothing; persuasion rests 100% on reading. No mosaic motif despite the product name. | Theme-aware dashboard visual in/under the hero — real screenshot with demo seed data, or inline SVG mock (no image assets, keeps local-first purity). | `/impeccable bolder` | ✅ Done 2026-07-27 (theme-aware dashboard mock + loose brand-tile mosaic motif; not yet browser-verified) |
| 2 | P1 | **"Everything included" is a documentation dump.** 7 cards, ~31 bullets, ~40% of page height at 13px/70%-opacity; buries the closing CTA (no CTA between 542px and ~5,900px on mobile). Fails cognitive-load checks: chunking, ≤4 options per decision point, progressive disclosure. | Collapse/accordion per group with one-line summaries, or cut each group to its 2–3 differentiating bullets and move the rest to the repo README. | `/impeccable distill` | Open |
| 3 | P2 | **Template-tell card styling.** Three step cards carry a colored glow (#ff756f) on dark background plus 1px border + 16px shadow blur — detector-flagged generic-template signature. | Flat elevation or border-color shift consistent with the app's own surface system. | `/impeccable polish` | Open |
| 4 | P2 | **Local-first trade-off spun, banks unnamed.** "No company holding your history hostage" invites "one browser profile holds it hostage instead"; KBC/Belfius never named. | Candid data-location card + name the supported banks. | `/impeccable clarify` | ⛔ Out of scope (copy frozen by user decision) |
| 5 | P2 | **Page unreachable after one click.** `homeRedirectGuard` redirects `''` to `/dashboard` forever; nothing in the app links back, so the pitch can't be re-read or shared. | Expose as `/welcome` (or `/about`) linked from settings or shell footer; keep the guard's behavior on `''`. | `/impeccable shape` | Open |

## Detector findings (live in-page scan; static scan was clean)

| Rule | Element | Finding | Assessment |
|------|---------|---------|------------|
| `dark-glow` ×3 | 3 step-card divs (`mm-elev-raised`) | Colored box-shadow glow (#ff756f) on dark background | Real — covered by issue 3 |
| `gpt-thin-border-wide-shadow` ×3 | Same 3 cards | 1px border + 16px shadow blur | Real — same 3 elements double-counted |
| `em-dash-overuse` | `body` | 11 em-dashes in body text | ⛔ Copy — out of scope |
| `cramped-padding` | Hero CTA (`a.btn.btn-lg.btn-primary`) | 0px vertical padding for 18px text | Likely false positive — daisyUI buttons center via flex height |
| `heading-rhythm` ×2 | Both `h2`s | 0px above vs 32px below | Likely false positive — space above comes from section padding |

## Persona red flags

- **Jordan (first-timer):** eyebrow leads with the jargon "Local-first personal finance"; bullets like "virtualized table" and "fingerprint match" are engineer-speak (⛔ copy); CTA drops onto an **empty dashboard** with no preview/softening of that first empty moment.
- **Riley (stress tester):** absolutist claims — "**Every** other finance app…", "**Nothing** to breach" (⛔ copy); "what if I clear browser data / switch laptops?" answered only by a buried bullet; GitHub repo named `money-mosaic-v2`, not the brand.
- **Casey (distracted mobile):** 6,147px mobile page with no CTA between hero and footer; "Everything included" all at 13px/70%-opacity on phone; trust chips wrap raggedly at 375px (one chip alone on first row).

## Minor observations

- "Free" appears 4×, "data never leaves" ~5× — repetition starting to dilute (⛔ copy).
- Step cards: "STEP 1" number label floats oddly next to the icon on a separate visual row.
- Zero motion anywhere; a single reduced-motion-safe hero fade-up would add polish cheaply.
- Value-prop card title lengths vary widely → uneven rhythm in the 3-column grid.
- "MoneyMosaic" (header brand mark) vs "Money Mosaic" (body copy); "Get started — it's free" vs "Open dashboard" label mismatch for the same destination (⛔ copy).
- No footer (license, version, contact) — the mid-hero GitHub link carries all that weight.

## Planned order

1. `/impeccable bolder` — hero dashboard visual + mosaic motif
2. `/impeccable distill` — shrink "Everything included"
3. `/impeccable shape` — expose landing at `/welcome`/`/about`
4. `/impeccable polish` — card glows, chip wrap, step labels, optional hero fade-up
