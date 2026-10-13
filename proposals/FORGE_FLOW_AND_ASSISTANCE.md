# Forge flow, exercise order and band assistance

> Ticket tracking moved: the vertical-slice tickets are in `.scratch/forge-flow/issues/` (decisions in `.scratch/forge-flow/spec.md`). The table below is the earlier draft. Keep logging hand-offs at the bottom of this file.

Approved 2026-10-13 after a grilling session. Seven build sessions plus a final check. Each session does one ticket, runs `npm test` and the build, and stops with a hand-off note at the bottom of this file.

## Decisions

### Band assistance (assisted pull-ups)

- Each set has an optional `assistance` field in pounds (`CompletedSet.assistance?: number`), separate from `load`. 0 means no band. Stacked bands are added together.
- On the set screen, "Planned load (lb)" becomes "Band assistance (lb)" for the `assisted-pull-up` kind, with the helper "0 if no band". It is prefilled from last time's value, and the person can change it.
- Last time reads "40 lb assist × 8 · 40 × 8 · 40 × 7".
- The hint keeps the existing rule (all sets at the top of the range) and names last time's assistance without suggesting a step: "May use less band help, under 40 lb". The reason line is unchanged.
- When last time had no assistance recorded, the line reads "Add the band help to track it." (this parallels `NO_LOAD_LINE`).
- Best set, "Your record" and the chapter summary: less assistance is better, and more reps break a tie. The summary reads "Since Day 1: 60 → 40 lb assist", and 0 shows as "no band". The exercise is grouped under Lifts.
- In the check-in's pull-up test, new entries record a number in pounds (0–150) plus an optional band note. Old text values stay readable and are never rewritten. The field is not prefilled from Forge.
- The Gate Trial circuit's `setup` text is unchanged.

### Moving between exercises

- Tapping an exercise opens its first unmarked set, or its last set if all are marked.
- The rest clock keeps running when you navigate. Only marking a set (done or skipped) restarts it.
- After a set is marked, you stay on that exercise's next unmarked set. Once the exercise is fully marked, the app moves to the next exercise below it in display order that has unmarked sets, wrapping to the top. When no exercise has unmarked sets, the app opens the finish screen as it does today.
- Any time the current exercise or set changes, the screen scrolls so the set numbers are at the top. With reduced motion it jumps instead of animating.
- The set buttons get a "Sets" label and the hint "Tap a set to edit it."
- An always-visible row of exercise chips sits near the top of the set screen. Each chip shows the exercise name and its marked count ("2/3"), with the aria label "Bench Press, 2 of 3 sets marked". The full list stays below.

### Exercise order

- **Change order** opens a list with large ↑/↓ buttons (aria labels "Move Box Squat up" and "Move Box Squat down"), a **Use written order** button and **Done**. There is no drag and no CDK.
- It is reachable from the warm-up screen and from the full exercise list, at any point in a session. Exercises that are already marked keep their sets.
- The order is remembered per workout definition ID in a new IndexedDB store, `exerciseOrders`. Database version 7 only adds the store. The store is included in backup and restore, and older backups without it restore cleanly.
- If the workout's exercise IDs no longer match the saved order, the saved order is dropped and the session uses the written order, with the note "This workout's exercises changed, so it's back in the written order."
- Make-ups and deload weeks use the saved order. The deload set guide is unchanged.
- `WorkoutDraft.exerciseOrder?: number[]` and `WorkoutSession.exerciseOrder?: number[]` hold indices into `definitionSnapshot.exercises`. All other indices stay definition indices, so `exerciseResults` and `currentExerciseIndex` keep their current meaning. When the field is missing, the written order applies, so no migration of old rows is needed.
- The app gives no muscle-group advice and makes no suggestions.

## Engineering notes

- Put navigation logic in pure, unit-tested functions in `features/forge/forge-session-page/forge-navigation.ts`: `openSetFor(draft, exercise)`, `nextAfterMark(draft, order)`, `displayOrder(draft)`, `applySavedOrder(definition, saved)`. Replace `firstPending` with these. The component is already 856 lines, so don't add logic to it.
- Scroll with `afterRenderEffect`, keyed on (exercise, set). Check `prefers-reduced-motion` the way the existing `scrollIntoView` at the bottom of the component does.
- The chip row and the order editor are standalone components with signal inputs and outputs, and each has its own CSS file. The session page style budget is already raised to 14/15 kB.
- Set-screen field: add `assistance` to the existing signal form model.
- Design (DESIGN.md): every tap area is at least 48px, surfaces are flat with 1px rules and no shadows, Pine marks the selected or current chip, counts use the serif, and labels and buttons use the sans. Don't add new small-caps label lines. Chips scroll horizontally with a 16px gutter at 390px. In dark mode the current chip uses Hearth Gold with Ink text.

## Tickets

| # | Ticket | Depends on | Model / effort |
|---|---|---|---|
| F0 | Docs first: DATA_MODEL (set `assistance`, `exerciseOrder`, `exerciseOrders` store, check-in fields), UX_SPEC (navigation, chips, change order, assistance display), RANGERS_ROAD_PROGRAM (less-band hint in pounds), DESIGN.md (chip row and order editor components). | none | Sonnet 5.5 / low |
| F1 | Navigation logic: `forge-navigation.ts` with tests (taking an `order` argument that defaults to the written order), tap lands on the open set, stay on the exercise after marking, wrap forward, rest clock kept, scroll to the set numbers, "Sets" label and hint. | F0 | Sonnet 5.5 / medium |
| F2 | Exercise chip row component on the set screen, wired to F1. | F1 | Sonnet 5.5 / medium |
| F3 | Saved order data: DB v7 `exerciseOrders` store and repository, backup and restore (including old backups), `exerciseOrder` on the draft and session, `applySavedOrder` with the mismatch fallback and note flag, tests for migration and restore. | F1 | Opus 5.5 / medium |
| F4 | Change order editor UI on the warm-up screen and the full list. Chips and list follow the order. Shows the "back in the written order" note. | F2, F3 | Sonnet 5.5 / medium |
| F5 | Band assistance in Forge: set field and prefill, Last time format, hint copy, best-set comparison, Your record, chapter summary, compare on save. Tests in `progression.spec`. | F0 | Opus 5.5 / medium |
| F6 | Check-in pull-up assistance as a number plus note: model, validation (0–150), measurement summary showing both old text and new numbers, backup validation. | F0 | Sonnet 5.5 / medium |
| F7 | Final check: phone-width walkthrough using the CDP driver in `tools/walkthrough/`, light and dark, offline, one impeccable audit pass, fixes in a single batch, then push to main to deploy. | all | Sonnet 5.5 / medium |

Suggested order: F0 → F1 → F2 → F5 → F6 → F3 → F4 → F7. F5 and F6 depend only on F0 and can run in any gap.

## Hand-off log

(Each session adds one line: ticket, commit, anything left over.)
- 2026-10-13, ticket 01 (docs first): done, uncommitted. Updated DATA_MODEL (set `assistance`, draft/session `exerciseOrder`, check-in `pullupAssistanceLb` and `pullupBandNote` beside the old text `pullupAssistance`, `exerciseOrders` store `{id: workoutDefinitionId, exerciseIds[], updatedAt}` at database version 7), RANGERS_ROAD_PROGRAM, UX_SPEC (new "Moving between exercises" and "Changing the exercise order" sections) and DESIGN.md (chips and order editor). Names chosen in the docs: tickets 04–07 should use them. Next: 02, 04 or 05 (any order).
