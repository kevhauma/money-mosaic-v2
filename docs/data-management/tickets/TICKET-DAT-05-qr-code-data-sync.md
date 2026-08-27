# TICKET-DAT-05 — QR code data sync between two browsers (show on one, scan with the other)

- **Area:** Data Management
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** extends FR-DAT-1 / FR-DAT-2 (export/import as a transport, no file), NFR-STORE-1, NFR-RESIL-1; idea origin: [P2P multi-device sync](../../v9999_ideas/requirements.md) ("scannable QR code that shares the data? needs compression")

## User story

As a user moving my finances from my laptop to my phone, I want one device to display my data as a QR code and the other to scan it with its own camera, so I can transfer everything without emailing myself a backup file, plugging in a cable, or trusting any server.

## Description

Adds a second transport for the export/import machinery that already exists: instead of writing a JSON file and carrying it between devices, the **sending** browser renders the export as an on-screen QR code and the **receiving** browser scans it through `getUserMedia` and runs the very same `importAll`. A full database does not fit in one QR code (a single symbol tops out at ~2,953 bytes), so the payload is gzip-compressed and split across an **animated sequence of frames** that loops on screen until the scanner has collected them all.

## Current situation (as-is)

- [`DataManagementRepository`](../../../src/app/core/data-access/data-management.repository.ts) already provides `exportAll(): Promise<AppDataExport>` and `importAll(data, 'replace' | 'merge')`, the latter transactional per NFR-RESIL-1 and guarded by a `schemaVersion > appDb.verno` rejection. Both are transport-agnostic — nothing in them assumes a file.
- The only wiring to those methods is file-based: [`data-management-overview.component.ts`](../../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.ts) exports via [`downloadJson`](../../../src/app/shared/utils/download-json.ts) and imports via an `<input type="file">` in [its template](../../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.html). Device-to-device transfer therefore requires the user to move a `.json` file themselves (cloud drive, email, USB) — the one step in an otherwise local-first app that pushes people toward a third party.
- No camera, QR, or compression code exists anywhere in `src/` (`getUserMedia`, `BarcodeDetector`, `CompressionStream` all return zero hits), and no QR dependency is in [`package.json`](../../../package.json). Every capability in this ticket is new.
- The multi-device roadmap entry (`topic-multi-device` in [`roadmap-entries.ts`](../../../src/app/feature-changelog/data/roadmap-entries.ts)) names QR as one of three candidate mechanisms, but nothing was ever ticketed.

## Desired result (to-be)

- A **`QrSyncService`** (in `core/data-access/` alongside the repository, or its own `core/qr-sync/`) owns the wire format and the chunking, keeping both the sender and scanner components thin:
  - `encode(data: AppDataExport): Promise<string[]>` — `JSON.stringify` → gzip via the native `CompressionStream('gzip')` → Base64url → split into fixed-size chunks, each prefixed with a header identifying the payload and the chunk's place in it (format id + version, a transfer id, `index`, `total`, and a checksum of the whole payload). Returns one string per frame.
  - `decode(frames: Map<number, string>): Promise<AppDataExport>` — reassembles in index order, Base64url-decodes, gunzips via `DecompressionStream('gzip')`, verifies the checksum, and `JSON.parse`s. Rejects with a clear error on a checksum mismatch or a header from a different transfer.
  - Chunk size is chosen so each frame stays well inside a scannable QR symbol at error-correction level **M** (~1,200–1,600 Base64url characters is the working target, tuned during implementation against a real phone camera, not assumed).
- **Sending side** — a "Send to another device" action in the Data section opens a modal that:
  - runs `exportAll()`, encodes it, and reports the frame count and estimated transfer time **before** starting, so the user knows what they are in for.
  - renders the frames as an animated QR loop (a canvas/SVG redrawn on a timer, ~5–10 fps, tuned so a phone camera reliably catches each frame), cycling indefinitely until dismissed. A single-frame payload renders as a static QR with no animation.
  - if the payload exceeds a sane frame ceiling (a database that would take minutes to blink across), says so plainly and points the user at the file export instead of starting a transfer that will not realistically complete.
  - keeps the screen awake during the loop via the Screen Wake Lock API where available, and degrades silently where it is not.
- **Receiving side** — a "Receive from another device" action that:
  - requests the camera with `getUserMedia({ video: { facingMode: 'environment' } })`, shows the live preview, and decodes frames from it.
  - decodes using the native `BarcodeDetector` API where the browser has it, and otherwise **lazy-loads** a QR decoder via dynamic `import()` so it never lands in the initial bundle.
  - shows collected-vs-total progress ("42 of 60 frames") and tolerates frames arriving out of order and repeatedly — the sender loops, so the scanner simply keeps watching until every index is in hand.
  - on a complete payload, stops the camera, releases every `MediaStreamTrack`, and hands the decoded `AppDataExport` into the **existing** Replace-vs-Merge confirmation flow, reusing `importAll` and the existing post-import reload prompt unchanged.
  - handles the real failure modes with distinct, actionable messages: permission denied, no camera present, insecure context (the API needs HTTPS or localhost), and a scanned code that is not a Money Mosaic transfer.
- Nothing is transmitted over any network: the payload leaves the sending device as photons and enters the receiving one through its camera. This is stated in the UI copy, because it is the whole point of the feature.
- No dependency lands in the initial bundle: both the QR encoder and any decoder fallback are dynamically imported at the moment the user opens the send/receive UI. The `angular.json` bundle budgets are **not** raised.

## Acceptance criteria

- [x] `QrSyncService` exposes `encode`/`decode` with the chunk-header format documented in the file, and a round-trip `decode(encode(x))` reproduces the original export for a realistic multi-frame payload. **Amended 2026-08-27** — `encode` takes an options argument and `decode` returns `{ data, omitted }` rather than a bare `AppDataExport`; the round trip is exact when `includeRawRows` is on, and omits the source-CSV fields when it is off. See "Payload slimming" below. (Format documented at the top of [`qr-frames.ts`](../../../src/app/core/qr-sync/qr-frames.ts); service in [`qr-sync.service.ts`](../../../src/app/core/qr-sync/qr-sync.service.ts). `qr-sync.service.spec.ts` -> "round-trips a multi-frame export back to the original object" feeds an 800-row export back through `decode` from a deliberately shuffled map.)
- [x] Compression uses the native `CompressionStream`/`DecompressionStream` — no compression dependency is added. ([`qr-payload-codec.ts`](../../../src/app/core/qr-sync/qr-payload-codec.ts); the only new dependencies in `package.json` are `qrcode-generator` and `jsqr`, both QR-only and both dynamically imported.)
- [x] Every emitted frame's character count stays inside the configured chunk ceiling, asserted by a test so a later tweak cannot silently produce unscannable frames. (Stronger than asserted: `QR_CHUNK_CHARS` is now _derived_ from `QR_FRAME_CHAR_CEILING` minus the widest possible header, so the two cannot drift. Covered by `qr-frames.spec.ts` -> "keeps every frame inside the scannable character ceiling" and "leaves the chunk size in the range a level-M symbol reads reliably off a screen", plus `qr-sync.service.spec.ts` -> "keeps every emitted frame inside the scannable character ceiling" on a real 2,000-row payload.)
- [x] The sender modal reports frame count and estimated duration before the animation starts, and refuses (with a pointer to the file export) above the configured frame ceiling. (`qr-send-dialog.component.spec.ts` -> "reports the frame count and an estimated pass time before anything animates" asserts "60 codes" and "8 seconds" in the rendered DOM with no `<canvas>` present yet; "refuses a payload above the frame ceiling and points at the file export instead" asserts the `too-large` phase, the count, the words "Export data", and that no animation interval was scheduled.)
- [x] A payload that fits in one frame renders as a static, non-animating QR code. (`qr-send-dialog.component.spec.ts` -> "renders a single-frame payload as a static code, with no animation loop": `isAnimated()` is false and no `setInterval` at the sender's cadence is scheduled after `start()`.)
- [x] The scanner accepts frames out of order and duplicated, ignores frames whose transfer id does not match the one in progress, and shows live collected/total progress. (`QrFrameCollector` in `qr-frames.ts`; `qr-frames.spec.ts` -> "accepts frames out of order and ignores repeats..." and "ignores frames belonging to a different transfer". End to end through the real camera loop in `qr-receive-dialog.component.spec.ts` -> "collects frames out of order and repeated..." and "ignores frames belonging to a different transfer", which also asserts the `2 of N codes` progress label.)
- [x] A checksum mismatch on reassembly is surfaced as a clear error and **no** import is attempted. (`qr-sync.service.spec.ts` -> "rejects a corrupted payload on the checksum, before anything is parsed"; `qr-receive-dialog.component.spec.ts` -> "refuses a corrupted transfer on its checksum, and imports nothing" asserts the `failed` phase, a /checksum/ message, and that `received` never fired, so the parent never gets a payload to import.)
- [x] A completed scan routes into the existing Replace-vs-Merge confirmation dialog; import still goes through `DataManagementRepository.importAll` — no new write path, and no component or service touches `appDb` tables directly. (`onQrReceived` in [`data-management-overview.component.ts`](../../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.ts) sets the same `pendingImport` the file picker sets. `data-management-overview.component.spec.ts` -> "routes a scanned payload into the same replace-vs-merge dialog a chosen file uses" then calls `confirmImport()` and asserts `importAll(backup, 'merge')`. Neither `core/qr-sync/` nor either dialog imports `appDb`.)
- [x] The existing `schemaVersion > appDb.verno` rejection applies to QR-received payloads exactly as it does to file imports (covered by a test feeding a newer-schema payload through the QR path). (`qr-sync.service.spec.ts` -> "refuses a newer-schema export received over QR, exactly as it does a file" encodes an export at `appDb.verno + 1`, decodes it through the QR path, and asserts `importAll` rejects with /newer database schema/.)
- [x] Camera tracks are stopped on success, on cancel, and on component destroy — verified by a test asserting `stop()` is called on every track in all three cases. (`qr-receive-dialog.component.spec.ts`, three tests, each against a fake `MediaStream` with two spied tracks: the success case inside "collects frames out of order and repeated, then hands the export up and releases the camera", plus "releases every camera track when the user cancels" and "releases every camera track when the component is destroyed". `qr-camera-scanner.spec.ts` additionally covers a double `stop()` and a stream granted _after_ cancel.)
- [x] Permission-denied, no-camera, and insecure-context failures each produce their own distinct message; none leaves the UI stuck in a "scanning…" state. (Mapped in `qr-camera-scanner.ts`'s `asCameraError`/`requestCameraStream` with a `reason` discriminant. `qr-receive-dialog.component.spec.ts` -> three "reports ... with its own message" tests each assert the `failed` phase and their own regex, and "never reuses one failure message for another" asserts all three strings are distinct.)
- [x] The QR encoder and the decoder fallback are loaded via dynamic `import()`; `ng build --configuration development` shows no growth in the initial bundle and **no `angular.json` budget is raised**. (`import('qrcode-generator')` in `qr-code-renderer.ts`, `import('jsqr')` in `qr-camera-scanner.ts`. Measured 2026-08-27 by building `HEAD` with the change stashed and again with it applied: both produce the identical initial set — `chunk-34LVC7ET.js` 1.59 MB, `styles.css` 569.03 kB, `main.js` 8.35 kB, `chunk-NILDOHVQ.js` 2.82 kB, `chunk-WOM4AICR.js` 1.42 kB, **initial total 2.17 MB** — with the same content hashes on both sides. `jsQR` lands as its own 323.73 kB _lazy_ chunk. `angular.json` is untouched.)
- [x] Unit tests cover: encode/decode round-trip across multiple frames; chunk size within ceiling; out-of-order and duplicated frame collection; foreign-transfer-id frames ignored; checksum mismatch rejected before import; newer-`schemaVersion` payload rejected; camera tracks stopped on success/cancel/destroy; single-frame payload produces exactly one frame. (60 tests across seven spec files: `qr-frames.spec.ts` (9), `qr-payload-codec.spec.ts` (7), `qr-sync.service.spec.ts` (10), `qr-camera-scanner.spec.ts` (6), `qr-send-dialog.component.spec.ts` (6), `qr-receive-dialog.component.spec.ts` (9), `data-management-overview.component.spec.ts` (13, two of them new). Full suite green after the review fixes: **306 files, 3,586 tests, 0 failures**.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues` both exit 0 — the first flagged `QR_FRAME_CHAR_CEILING` as an unused export, which is why the chunk size is now derived from it rather than sitting beside it. `ng lint` clean. `conventions-reviewer` run on the diff; see the review notes at the bottom of this file for what it found and what was done about each.)
- [ ] Verified live in the browser: with two browser windows (or a laptop and a phone against the dev server), send from one via QR, scan with the other's camera, and confirm the receiving app renders the same accounts and transactions after the reload prompt. — **left open deliberately**: the live browser check was waived by the user when this ticket was worked (2026-08-27). Nothing here has met a real camera, so the chunk size and the 8 fps frame rate are reasoned values rather than measured ones; the to-be section above asks for both to be tuned against a real phone, and that tuning is still outstanding.

## Notes

- **A single QR code cannot hold "all data".** The densest QR symbol (version 40, ECC L) holds ~2,953 bytes; a modest database gzips to tens or hundreds of kilobytes. The animated multi-frame sequence is therefore not an optimisation — it is the only shape of this feature that works, and the ticket is written around it. The user-facing framing ("show a code, scan it") is unchanged; only the number of frames differs.
- **Frame loss is handled by looping, not by retransmission negotiation.** There is no back-channel from scanner to sender, so the sender cycles forever and the scanner waits for stragglers. If real-world testing shows this converging too slowly on large payloads, a fountain code (LT/Luby, as used by animated-QR wallet transfers) is the known next step — deliberately out of scope here, noted so a future ticket does not have to rediscover it.
- **Browser support is uneven and that is acceptable.** `BarcodeDetector` is Chromium-only, hence the lazy-loaded decoder fallback. `CompressionStream` is available in all current evergreen browsers. `getUserMedia` requires a secure context — worth confirming the dev-server story during implementation (`localhost` qualifies; a LAN IP does not), since testing against a phone means reaching the dev machine by IP.
- Sender and receiver must be on **compatible schema versions**; the existing version guard already refuses the dangerous direction (newer → older). No new migration logic is needed, and no Dexie schema change is involved in this ticket at all.
- Merge mode across two devices upserts by primary key, so two independently-grown databases sharing auto-increment ids will overwrite each other's rows. That is the pre-existing behaviour of `importAll` inherited from [TICKET-DAT-01](./TICKET-DAT-01-full-data-export-import.md), not something this ticket introduces or fixes — genuine two-way sync needs stable ids and conflict resolution, which is the `topic-multi-device` P2P/WebRTC idea, not this one.
- This is a one-way push (sender → scanner), not sync. The name says "sync" because that is how the request came in; the UI copy should say "send"/"receive" so nobody expects bidirectional reconciliation.

## Review notes (conventions-reviewer, 2026-08-27)

Acted on:

- **Scanner is injected, not hand-constructed.** `QrCameraScanner` was `new`-ed inside the receive dialog, the only `new <project class>()` in a component in the app. It is now `@Injectable()` (no `providedIn`) and listed in the dialog's own `providers: [QrCameraScanner]` — the `ImportWizardSession` pattern from the coding-conventions skill: one live camera belongs to one open dialog, and a per-mount instance is what keeps the track-release discipline honest.
- **The `reason` discriminant now has a consumer.** `QrScannerFailure` was carried but only `message` was ever read. `no-camera` and `insecure-context` are the two failures no retry can fix, so the receive dialog now renders a pointer to the file import for exactly those two.
- **`qr-payload-codec.ts` got its own TestBed-free spec** — the Base64url padding restore at every `length % 4`, the URL-safe alphabet substitution, and the `0x2000`-byte slicing loop that only engages above 8 KB, none of which the service-level round trip reached.
- **Line endings and Prettier.** Several files had been written as CRLF while the rest of `src/` is LF, which made two diffs read as whole-file rewrites. All normalised; `npx prettier --check` is clean.
- **Two small template derivations** pulled into the class as `failed` / `frameNumber` computeds, and the two dialog specs' `describe` titles moved to the `{Component}: {operation}` format.

Accepted as-is, recorded rather than fixed:

- **Hardcoded `#ffffff` / `#000000` in `qr-code-renderer.ts`** (and the `bg-white` placeholder on the canvas) break the "daisyUI tokens, never hex" rule deliberately: a scanner needs fixed black-on-white contrast, and `base-100` is not white in most of this app's themes. A themed QR code is an unreadable QR code.
- **`jsqr` ships CommonJS**, so a production build adds it to the four CommonJS warnings the repo already emits (`papaparse`, `node-fetch`, `seedrandom`, `long`). No `allowedCommonJsDependencies` entry was added, since the repo has deliberately never used that option and the module only reaches a lazy chunk.
- **`csv-backup/`** — real bank CSVs sitting untracked and un-ignored in the working tree. Nothing to do with this ticket, and deliberately not committed here, but worth an entry in `.gitignore`.

## Payload slimming (2026-08-27, after the first real database hit the ceiling)

The first user database to go through this needed **829 frames** — past the 250 ceiling by more
than 3x, so the feature simply did not work for the person it was built for. Measured against a
realistic Belgian-bank CSV at 20,000 transactions, gzip -9:

| Payload | Bytes/txn | vs. as-is | 829-frame database |
|---|---|---|---|
| as-is (`AppDataExport` JSON) | 102.7 | 100% | 829 frames |
| without `rawLine`/`rawRow` | 33.0 | 32% | ~266 frames |
| ...and columnar | 26.9 | 26% | ~217 frames |
| columnar only, raw kept | 99.6 | 97% | ~804 frames |

The finding: **~68% of the compressed payload was `rawLine` + `rawRow`** — TICKET-TXN-06's copy of
the source CSV, stored twice per transaction, feeding one audit table on the transaction detail
view. Columnar encoding is worth ~18% on top of that but almost nothing on its own, because the raw
CSV strings drown the repeated key names out.

What changed, in `core/qr-sync/qr-transfer-payload.ts`:

- The QR payload is no longer `AppDataExport` JSON. It is a versioned `QrTransferPayload` — `v`,
  the schema version, `omitted`, and columnar `[keys, rows]` per table. Absent values use a NUL
  sentinel (a JSON array cannot hold `undefined`, and `null` is a legitimate stored value); a real
  string starting with NUL is escaped by doubling, so the encoding stays lossless.
- `rawLine`/`rawRow` are dropped **by default**, with an opt-in checkbox in the send dialog that
  re-encodes and shows the new frame count before anything starts. The user chose the toggle over
  always-exclude.
- The frame format id went `MMQR1` -> `MMQR2`. The payload inside changed shape, so a build from
  before this change must reject these frames at `parseQrFrame` rather than mis-parse them. That
  is exactly what the version in the format id is for; nothing had shipped, so it was free.
- `decode` returns `{ data, omitted }`, and the Replace-vs-Merge dialog warns when a transfer left
  fields behind. This matters beyond honesty: `importAll` uses `bulkPut`, which replaces whole
  rows, so **merging a slimmed transfer clears `rawLine`/`rawRow` on transactions the receiving
  device already has**. Said plainly at the point of no return rather than discovered later.

Still open, deliberately: denser frames. At 1,246 characters each frame uses about half of what a
level-M symbol holds; ~2,000 would take that same database to ~135 frames. That is the tuning the
live browser check above was meant to settle, and it needs a real camera, so it stays untouched.

## Separately: `exportAll` silently loses the trained model

Not introduced here and not fixed here, but found while measuring. `CategoryModelArtifact`
(`app-db.ts`) holds three `ArrayBuffer` fields, and `JSON.stringify` turns an `ArrayBuffer` into
`{}`. So the **file** export has always dropped the trained auto-categoriser weights, and importing
that backup writes a corrupt artifact row rather than no row at all. It affects `downloadJson` and
the QR path equally, since both stringify the same `exportAll` output. Worth its own ticket.
