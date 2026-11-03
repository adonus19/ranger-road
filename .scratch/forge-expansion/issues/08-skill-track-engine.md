# 08: Skill-track engine

**What to build:** Track slots hold the person's current step. When the saved history meets a step's approved criteria and its earliest chapter has arrived, the exercise shows "next step available" as information; the person chooses whether to take it, and the choice is saved. Passing a step is recorded with the chapter it happened in. The pull track (assisted pull-up first) is live from Chapter II; later steps wait for their chapters.

**Blocked by:** 01 (criteria approved), 05

**Status:** done (built 2026-11-03; not yet pushed)

**Model / effort:** Opus 5.5, high

**Skills:** angular-developer, humanizer

- [x] Track steps and criteria are content data, not hard-coded in components
- [x] Never steps up automatically; no "behind" message
- [x] Custom sessions do not count toward criteria
- [x] History, backup and migration checked; tests and build pass; deployed (tests and build pass; push pending)

## Comments

**2026-11-03, built.** The four tracks, their steps, earliest chapters and "Passed when" text are content in `core/program/skill-tracks.ts`. The engine is `core/program/skill-track-progress.ts`: it works out passes, the first pass's chapter, and whether the next step is available from saved sessions each time, and stores nothing but the person's choices. Chapter II's Forge A assisted pull-up is the `pull` slot and Forge B's push-up the `push` slot (`trackId` on the prescription). Database version 9 adds the append-only `trackSteps` store; older rows and backups read unchanged, and an older backup restores with every track at step 1. The muscle-up steps joined the shoulder swap table. 619 tests pass; the build passes (the existing forge-session-page.css budget warning is now 14.77 kB of the 15 kB limit). Not checked in a phone-sized browser.

What counts toward a pass: a completed Forge A, B or C on a day that is not Yellow, with the step done as written (no pain note, readiness swap, substitute or written modification) and the final set's effort recorded at 7 or less. Custom and stopped sessions never count.

Choices for you to confirm:

1. "Next step available" means the current step is passed and the next step's earliest chapter has come. The UX text says "the next step's criteria", but each "Passed when" belongs to the step it sits under, so I read it this way.
2. Several "Passed when" lines name things the sets cannot show. The app checks the counted part and leaves the rest to you: band-light pull-up (the slow negatives), chest-to-bar (8 strict pull-ups in one set), straight-bar dip (the transition drills), pike push-up and planche lean (form), wall HSPU negative (3-second tempo), wall plank (feet height), wall walk (hand distance), kick-up (the 15-second holds and the bail), band-assisted muscle-up (both arms together). Is that right, or should some of these get their own logged sets?
3. Freestanding handstand attempts are logged as attempts, so the app never reads that step as passed. Should its sets record seconds instead?
4. Wall walk counts as 3 sets of at least 1 walk, and kick-up as 5 kick-ups added up across the sets.
5. A missing final effort means not passed, as it does for hints.
6. A modification note on the exercise (from the Substitute panel) keeps that session from counting, the same as a changed movement in a trial.
7. The line shows only on a Green day outside a deload week, like a hint that may rise. It never shows in a custom Forge.
8. "Take this step" before the slot's first set (and with no pain note) changes today's exercise at once. After that the choice is saved and the line reads "Saved. Pike Push-Up starts next time."
9. A step keeps the chapter's slot dose (Chapter II: 3 × 6–8 pull, 3 × 8–12 push), since the later packs write "Handstand track (current step)". A step counted the other way (seconds against reps) takes its catalog default. The step's own catalog note (for example "Band-light reps, then 3 slow negatives.") comes before the slot's note.
10. The muscle-up steps swap to 12 band pull-aparts for their own sets, the same as a press.
11. Band-Light Pull-Up records band help in pounds on each set, since its criteria count it.
12. Track-step choices count with the records shown before saving or restoring a copy.

Questions:

- There is no way to step back down a track; a hard day uses the Substitute panel. Do you want a "Go back a step" choice?
- Chapter I's assisted pull-up and push-up sessions count toward step 1, so a step 1 may already be passed in Chapter I. Ticket 09 adds first passes to that chapter's trial; the Gate Trial is already passed, so Chapter I passes would not become trial parts. Is that what you want?
