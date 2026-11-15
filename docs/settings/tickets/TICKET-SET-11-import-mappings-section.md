# TICKET-SET-11 — Manage import mappings in Settings

- **Area:** App Settings
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** extends FR-IMP-3 / FR-IMP-5 (mapping profiles are saved and reused, but can't be viewed or managed outside the import wizard). Follows the one-component-per-section structure of [TICKET-SET-07](./TICKET-SET-07-settings-section-components.md).

## User story

As someone importing from several banks and accounts, I want to see, edit, duplicate and delete my import mappings in Settings, so I can fix a wrong mapping or prepare a new one without starting an import.

## Description

A new **Import mappings** section on the Settings page lists every mapping profile, both the seeded bank templates and the mappings the wizard remembered per account and file type. Each one can be edited, duplicated or deleted. New mappings are made by **duplicating** an existing one and editing the copy. Making a mapping from scratch stays in the import wizard, which has a real CSV to pick columns from.

## Current situation (as-is)

- **Where mappings come from:**
  - The server seeds `DEFAULT_MAPPING_PROFILE_TEMPLATES` ([shared/seed-data.ts](../../../shared/seed-data.ts): KBC, Belfius, …) for each new user ([seed-user-defaults.ts](../../../server/src/seed-user-defaults.ts)).
  - The wizard adds or updates one remembered profile per account and file type ([`MappingProfilesStore.upsertRemembered`](../../../src/app/feature-import/mapping-profiles.store.ts)).
- **They're only reachable inside the import wizard.** Its select and map steps read them, auto-detection matches on `headerSignature` (`matchTemplateForHeaders`), and no screen lists them.
- **No delete in the client.** [`MappingProfilesRepository`](../../../src/app/core/data-access/mapping-profiles.repository.ts) has `getAll`, `add` and `update`, but no `remove`. The server already supports `DELETE /api/mappingProfiles/:id` through the generic entity router ([entity-router.ts](../../../server/src/routes/entity-router.ts), listed in [api.ts](../../../server/src/routes/api.ts)).
- **No references to break.** `importBatches.mappingProfileId` and `mappingProfiles.defaultAccountId` are plain columns with no foreign key ([import-batches.ts](../../../server/src/schema/import-batches.ts), [mapping-profiles.ts](../../../server/src/schema/mapping-profiles.ts)), so deleting a profile breaks nothing; old batches just keep a stale id.
- **Field labels already exist.** [column-mapping.ts](../../../src/app/feature-import/column-mapping.ts) holds `COLUMN_FIELD_DEFS` and `SIGN_CONVENTION_LABELS`, which the map step uses.
- **Settings layout.** The page is a stack of section components ([settings-overview.component.html](../../../src/app/feature-settings/components/settings-overview/settings-overview.component.html)).

## Desired result (to-be)

- **A new `settings-import-mappings-section` component** in `feature-settings`, placed after the Data section.
- **List:** a table with name, bank preset, default account (by name, or "Any"), and whether it auto-detects (has a `headerSignature`). Actions per row: **Edit**, **Duplicate**, **Delete**. An empty state shows when there are no profiles.
- **Edit** opens a form (in the existing `mm-modal`) covering every `MappingProfile` field:
  - name;
  - bank preset;
  - delimiter, decimal separator, date format, encoding, header rows, sign convention;
  - each column header name in `columns`, labelled from `COLUMN_FIELD_DEFS`;
  - default account (a select of accounts, plus "Any");
  - header signature (one header per line).
- **Form validation:**
  - a name is required;
  - the `date` and `description` columns are required;
  - either an `amount` column, or a `debit` and/or `credit` column, the same rule FR-IMP-3 and the wizard apply;
  - header rows must be an integer ≥ 0.
- **Duplicate:**
  - creates a copy named "<name> (copy)" and opens it in the edit form;
  - the copy keeps every field except `id` and **`headerSignature`**, which is cleared, so the original stays the profile that auto-detects that bank.
- **Delete:** asks for confirmation (`mm-confirm-dialog`), then removes the profile. The next import of that file type simply finds no remembered mapping.
- **Bank templates are fully editable and deletable**, like every other profile, decided 2026-11-14. The form warns that changing a profile's header signature changes which files it auto-detects.
- **Persistence:**
  - all through `MappingProfilesStore`, which gains `updateProfile`, `duplicateProfile` and `removeProfile`;
  - `MappingProfilesRepository` gains `remove`;
  - no direct API call from the component.

## Acceptance criteria

- [x] Settings shows an Import mappings section listing every profile the account has, templates included, with name, preset, default account and auto-detect status. (`settings-import-mappings-section.component.ts/.html`, placed after Data in `settings-overview.component.html`; spec `lists every mapping with its preset, default account and auto-detect status`; live 2026-11-15: a fresh account listed KBC and Belfius, `kbc`/`belfius`, Any, Yes)
- [x] Editing any field and saving persists it: it survives a reload, and the next import using that profile uses the edited values. (`MappingProfilesStore.updateProfile`; live 2026-11-15: renamed KBC to "KBC edited" and set its description column to `Mededeling`, `GET /api/mappingProfiles` returned both, still listed after a reload; importing a KBC-shaped CSV then showed "Detected: KBC edited", `Description ← Mededeling`, and the stored rows' `rawDescription` came from that column)
- [x] Validation blocks saving with no name, no `date` or `description` column, neither an amount nor a debit/credit column, or a negative or non-integer header-row count. The error shows next to the field. (validators in `mapping-profile-form.component.ts`; `mapping-profile-form.component.spec.ts` covers each rule plus 0 header rows and debit-only accepted; live: clearing the name, date and amount columns and typing 1.5 header rows kept the dialog open with each message under its own field)
- [x] Duplicate creates a new profile named "<name> (copy)" with every field copied except `id` and `headerSignature`, then opens it for editing. (`MappingProfilesStore.duplicateProfile`, spec `duplicateProfile adds a "(copy)" without the id or header signature`; live: Duplicate on Belfius made id 3 "Belfius (copy)" with `bankPreset: belfius`, `headerSignature: null`, and opened the edit dialog on it)
- [x] Delete asks for confirmation, removes the profile on the server and from the list, and a following import of that file type falls back to detection or the wizard without an error. (`mm-confirm-dialog` + `MappingProfilesStore.removeProfile`, spec `removeProfile deletes it on the server and from the list`; live: both deletes went through "Delete this mapping?", then the server and the list held only KBC edited; a Belfius CSV then said "No bank preset matched — check the columns we guessed below", with no console errors)
- [x] A seeded bank template can be edited and deleted. The form shows the header-signature warning. (live: the seeded KBC template edited, the seeded Belfius template deleted; the warning is a fixed `mm-alert` under the header-signature field, spec `warns that the header signature decides what auto-detects`)
- [x] `MappingProfilesRepository.remove` exists. Every write goes through `MappingProfilesStore`, and the section never touches `ApiClient`. (`mapping-profiles.repository.ts` `remove`, spec `remove deletes the one row`, pinned in `repository-surface.spec.ts`; the section and form import only stores, with no `ApiClient`/`HttpClient`)
- [x] Unit tests cover: the store's update, duplicate (signature cleared, name suffixed) and remove; the form's validation rules; the section rendering an empty state and a list. (`mapping-profiles.store.spec.ts` describe `managing profiles in Settings (TICKET-SET-11)`; `mapping-profile-form.component.spec.ts`; `settings-import-mappings-section.component.spec.ts` empty-state and list cases)
- [x] `ng lint`, `ng test` and `ng build --configuration development` pass. No bundle budget is raised. Verified via the fallow skill and the coding-conventions skill. (2026-11-15: lint clean, 3974/3974 tests, dev and production builds pass; `angular.json` untouched; the new code sits in the lazy settings chunk, and the production build's initial-budget warning (786 kB of 500 kB) was already there, with none of this code in the initial chunks; both fallow CI gates exit 0; conventions-reviewer run on the diff, and its findings fixed: an `mm-hydration-boundary` over both stores, display values computed in the class, "Unknown account" for a deleted account, the reading-option labels moved to `column-mapping.ts` and shared with the wizard; lint, the full suite and fallow re-run green after those fixes)
- [x] Browser check: edit, duplicate and delete a mapping in Settings, then import a CSV that uses the edited mapping. (2026-11-15, Orca browser against a scratch `DB_FILE`: everything above, then committed the KBC import, "2 transactions added". Run before the review fixes, which only changed option labels and the loading/error wrapper)

## Notes

- **Settings over an Import sub-page**, decided 2026-11-14.
- **Duplicate-only creation**, decided 2026-11-14. A blank form would mean typing header names with no CSV to check them against. The wizard already does that job properly.
- **Why the copy drops its header signature:** `matchTemplateForHeaders` returns the **first** profile whose signature matches, so two profiles with the same signature make auto-detection depend on row order. The copy keeps `bankPreset`, so it can still act as an account's remembered mapping (`sameFileType` keys on the preset).
- **Barrel weight:** `MappingProfilesStore` is reached through `@/feature-import`, which also re-exports the wizard's components. Settings is lazy, so this costs chunk size, not the eager bundle. Check the build output, and don't raise a budget if it grows.
- A deleted template is not re-seeded. Restoring one means importing a file of that bank and saving the mapping again, or restoring a backup.
