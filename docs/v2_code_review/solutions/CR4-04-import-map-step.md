# CR4-4 — `import-map-step` doing nine jobs: options

Finding: [CR4-4](../code-review.md#cr4-4--import-map-step-is-the-apps-largest-component-and-owns-nine-jobs). 506 lines + 225-line template; form definition, preset detection/prefill, raw preview, guided-stepper mechanics, samples, duplicate warnings, summary, amount-mode rules, and `MappingProfile` serialization in one class — which also exports the import feature's shared vocabulary types.

The nine jobs cluster into four seams, and the options below correspond to cutting along one, some, or none of them.

## Option A — Types-and-constants extraction only (the floor)

Move the shared vocabulary out of the component file into plain modules in `feature-import/` — e.g. `column-mapping.ts` (`ColumnFieldKey`, `ColumnFieldDef`, `COLUMN_FIELD_DEFS`, `ImportMappingResult`, `SIGN_CONVENTION_LABELS`) and `mapper-steps.ts` (`MapperStepId/Def/TrackerState/TrackerItem/Status`, `MAPPER_STEPS`). The four dependent components (+ the wizard) import from the modules; the barrel re-exports.

- Purely mechanical, no behavior change, unblocks CR4-7's type-placement half, and shrinks the file ~100 lines. This is worth doing under **every** other option and first — it's also the prerequisite that makes the deeper cuts diffable.

## Option B — Pure-function extraction of the derived state

`resolvedSamples`, `duplicateWarnings`, `invalidFieldLabels`, `summaryRows`, and `stepStatus` are all pure functions of `(formValue, headers, previewRows)` currently wrapped in `computed()`s. Lift the bodies into module functions (same file as Option A's `column-mapping.ts` or a sibling), leaving one-line computeds behind.

- Wins: these five get TestBed-free specs (they currently only get tested through component rendering); the component reads as wiring. The project explicitly prefers this shape ("pure logic lives in its own testable function, not inlined into a component") — this is applying the house rule, not inventing one.
- Cost: minor — signatures need the three inputs passed explicitly. No structural risk at all.

## Option C — Split the guided-stepper mechanics from the mapping domain

The stepper state machine (`activeStepId`, `stepperItems`, `openStep`/`advanceFrom`/`returnFrom`, `markStepTouched`, `isStepBlocked`) is generic "sequential form-section flow" logic interleaved with CSV specifics. Two sub-options:

- **C1 — feature-local extraction:** a `createMapperStepper(form, steps)` factory (same pattern as `createPagination`/`createSelectionModel` in `shared/utils` — the codebase's established idiom for stateful UI scaffolding). Lives in `feature-import/` until a second guided flow exists.
- **C2 — shared/ui generic stepper:** promote to `shared/ui` next to `ColumnMapStepperComponent` (which already renders the tracker). **Not recommended yet** — one consumer; the project got burned generalizing early elsewhere (bento-grid, CR4-9, is the cautionary exhibit sitting in the same barrel).

## Option D — Move detection/prefill out of the component

`detectAndPrefill` + `refreshPreview` (file sampling, delimiter guess, preset/saved-profile resolution, form patching, amount-mode inference) is async service-shaped logic. Extract to a `MappingPrefillService` (feature-import) returning a plain "prefill result" the component applies to its form — or fold it into `MappingProfilesStore`, which already owns `detectTemplateForFile`/`findForBankAndAccount`.

- Wins: the trickiest non-form logic (encoding sniff, preset-vs-saved precedence, skip-to-summary rule) becomes testable without a component fixture; the `detectedFile` guard field's job shrinks to "when to call," not "what happens."
- Cost: the result type is wide (form patch + detectedPreset + usedSavedProfile + activeStep decision); designing it is the actual work.

## Option E — Accept the size, cap the growth

Do only A (+ optionally B) and declare the component's remaining shape intentional: it *is* the mapping form, and forms are wide. Pair with a note in the conventions skill that new mapping concerns go into modules, not this class.

- Honest case for E: the component's individual functions are small and documented; its Fallow per-function scores are unremarkable (worst cyclomatic 12); the pain is navigational, and A alone fixes the worst of that (strangers land here chasing types, not behavior).
- Case against: 15 commits and a stable-high churn trend say people keep editing it; every edit pays the 500-line context tax; and its sibling `import-select-step` already tops Fallow's refactoring-target list with an *accelerating* trend — the feature's trajectory argues for more than the floor.

## Sequencing

A → B are safe in any window. C/D belong in the same effort as CR4-2's wizard work (shared regression surface — one verification pass, one import-feature quiet window). If CR4-2 Option A (wizard session) is chosen, revisit D afterward: the session may become the natural owner of prefill, changing where D's seam lands.
