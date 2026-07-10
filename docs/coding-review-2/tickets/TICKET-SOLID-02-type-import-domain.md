# TICKET-SOLID-02 — Single-source the import domain unions (`signConvention`, `dateFormat`, `encoding`)

- **Area:** OCP / type safety (core/import, core/data-access)
- **Type:** Refactor
- **Traceability:** CR2-3.1, CR2-3.2 (+ the ISP fix from CR2-3.1's second bullet)
- **Fallow evidence (2026-07-07):** `parseDate`'s format chain is a high complexity finding (cyclomatic 16), `updateResult`'s column-mapping chains rank high (cyclomatic 23 / cognitive 35), and `csv-row-mapper.ts` is a top refactoring target (5 dependents) — all three shrink under this ticket

## User story

As a developer, I want `MappingProfile`'s `signConvention`/`dateFormat`/`encoding` declared as the closed unions they actually are (single-sourced, with the map-step's option lists derived from them and `CsvImportService.parse` accepting `Omit<MappingProfile, 'id'>`), so adding a format/convention is one union edit the compiler propagates, and the `as` casts in `csv-import.service` and `import-wizard` disappear.

## Description

The import domain is closed — three sign conventions, three date formats, two encodings — but `MappingProfile` declares them all as `string`, so the type information is invented downstream and re-asserted with casts. Supported date formats are additionally listed twice with nothing linking the copies: adding a format to the parser doesn't surface it in the mapping form, and adding it to the form makes every row silently fail as "unparseable date". Declare each union once and let the compiler propagate it.

## Current situation (as-is)

- [app-db.ts:113-118](../../../src/app/core/data-access/app-db.ts) — `MappingProfile.delimiter/decimalSeparator/dateFormat/encoding/signConvention` are all `string`.
- [csv-row-mapper.ts:12-16](../../../src/app/core/import/csv-row-mapper.ts) — `RowMapOptions.signConvention` declares the real union `'as-is' | 'debit-negative' | 'credit-negative'`; `parseDate` (lines 32–63) supports exactly `YYYY-MM-DD` / `DD/MM/YYYY` / `MM/DD/YYYY` via an `if/else` chain that returns `null` for anything else.
- [import-map-step.component.ts:19-20](../../../src/app/feature-import/components/import-map-step/import-map-step.component.ts) — `DATE_FORMATS` and `ENCODINGS` re-list the supported values as untyped string arrays.
- Casts papering over the gaps:
  - [csv-import.service.ts:19](../../../src/app/core/import/csv-import.service.ts) — `mappingProfile.signConvention as CsvParseRequest['signConvention']`.
  - [import-wizard.component.ts:109](../../../src/app/feature-import/components/import-wizard/import-wizard.component.ts) — `mapResult.mappingProfile as MappingProfile`, only needed because `CsvImportService.parse` demands a full `MappingProfile` while never reading `id`.

## Desired result (to-be)

- `SignConvention`, `DateFormat`, and `CsvEncoding` union types defined once, next to `MappingProfile` in `app-db.ts` (the framework-agnostic home of the entity types), each derived from an `as const` value list (e.g. `export const SIGN_CONVENTIONS = [...] as const; export type SignConvention = (typeof SIGN_CONVENTIONS)[number];`) so UI option lists and types share one source.
- `MappingProfile` uses those unions; `RowMapOptions`/`CsvParseRequest` reuse them instead of redeclaring.
- `parseDate` dispatches via a lookup keyed by `DateFormat` (pattern + field order), so an unhandled member of the union is a compile error, not a silent `null`.
- `import-map-step` builds its date-format and encoding `<option>`s from the shared const arrays; the local `DATE_FORMATS`/`ENCODINGS` copies are deleted.
- `CsvImportService.parse` (and `detectHeaders`/`previewRawRows` if applicable) accepts `Omit<MappingProfile, 'id'>`; both casts above are deleted.

## Acceptance criteria

- [x] `grep -rn "as CsvParseRequest\|as MappingProfile" src` returns zero hits.
- [x] `SIGN_CONVENTIONS` / `SUPPORTED_DATE_FORMATS` / `SUPPORTED_ENCODINGS` (naming per implementer) exist exactly once each; the map-step form options and the parser both derive from them.
- [x] Assigning an invalid literal (e.g. `signConvention: 'debitneg'`) anywhere a profile is built is a TypeScript error — verified by the build, not by a runtime check.
- [x] Adding a hypothetical fourth date format compiles only after both the pattern lookup entry and (automatically) the form option exist — i.e. the union is the single edit point.
- [x] **No Dexie schema/version change**: these are compile-time types over the same stored strings. Already-stored profile rows (including the seeded KBC/Belfius templates) load unchanged. If a stored value could predate validation, hydration must tolerate it (type the repository return honestly or normalise on read) — do **not** add a migration for this.
- [x] Existing `csv-row-mapper.spec.ts` / `csv-parse.spec.ts` / `import.service.spec.ts` / `mapping-profiles.store.spec.ts` pass; `parseDate` gains a spec-table entry proving unknown-format is unrepresentable or safely rejected.
- [x] Verified live: an import with a seeded preset and a custom mapping both still parse and commit; no console errors.
- [x] The `angular.json` bundle budget is **not** raised.

## Notes

- `delimiter` and `decimalSeparator` stay `string` — they're genuinely open (any single character), unlike the three closed axes.
- Keep `app-db.ts` free of Angular imports (see the existing header comment about staying framework-agnostic); plain `as const` arrays are fine there.
