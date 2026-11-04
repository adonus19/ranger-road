# 09: Skill parts in trials

**What to build:** A track step first passed during a chapter appears as a part of that chapter's trial. Demonstrating that step or the step just below it completes the part. On a pain-gated day the part can be marked "set aside for pain" without failing the trial.

**Blocked by:** 08

**Status:** done (built 2026-11-04; not yet pushed)

**Model / effort:** Opus 5.5, medium

**Skills:** angular-developer, impeccable (trial page), humanizer

- [x] Works with the Trial Timing rule (Monday/Thursday attempts until passed)
- [x] Existing trial records read unchanged
- [x] Tests and build pass; deployed (tests and build pass; push pending)

## Comments

**2026-11-04, from ticket 08's answers.** A step first passed in Chapter I is a Chapter I pass, and the Gate Trial is already done, so it does not become a part of that trial. It stays on record (`stepPasses` keeps each step's first pass and its chapter). The person asked that such passes can still become part of future trials where that applies. Decide in this ticket what "where that applies" means, for example a step passed in Chapter I but not yet shown in a trial, and ask the person if the docs do not settle it. "Go back a step" is allowed (ticket 08); a step stays passed for the trial it was first passed in even if the person goes back.

**2026-11-04, built.** When a trial attempt starts, the app works out the skill parts from the saved sessions with ticket 08's `stepPasses` and copies them into the attempt's snapshot (`core/domain/trial-skill-parts.ts`). The attempt days, the Green check and "pass means every part finished" are unchanged; an attempt simply cannot move past the stairs, or be saved as complete, until every skill part has an outcome. In the Three-Mile Trial the parts share one step after the stairs, with its own dot in the progress row. Each part shows its standard ("Passed when") and the step below, the step's Quick Help, the three choices from the UX spec, and optional reps or seconds per set. No store was added, so the database stays at version 9: the new fields (`skillParts` on the snapshot, `skillResults` on drafts, stopped attempts and results) are optional, and older drafts, attempts, results and backups read, save and restore as before (tested). 641 tests and the build pass; the only warning is the existing forge-session-page.css budget one. The new styles are in `src/styles/trial-skill-parts.css`. Checked at 390 px in light and dark with a seeded CDP run (tools/walkthrough driver, clock pinned to Monday 2026-11-30, the first attempt day): plan page, start screen and the skill step. Every choice and set box is 48 px tall and nothing scrolls sideways.

How I read "where that applies" for Chapter I passes (please confirm): a track adds trial parts only from the chapter its Forge slot starts in, and the pull and push tracks start in Chapter II. A step passed earlier joins that first chapter's trial, once. In practice this means a push-up or assisted pull-up step 1 passed in Chapter I becomes a part of the Three-Mile Trial, and the Gate Trial never has skill parts. Nothing passed in Chapter I is carried any further than that.

Other choices for you to confirm:

1. Placement: the skill step comes after the stairs and before the leadership reflection, so all the physical work is together. The recovery check now counts from the end of the skill step when there is one, not from the end of the stairs.
2. Several parts from one track all stay. If you passed step 1 in Chapter I and step 2 in Chapter II, the trial asks for both (for example Push-Up, then Pike Push-Up, which also accepts the push-up). Should a track show only its highest step instead?
3. "Demonstrated" is your own call, as with the Three-Mile Trial's confirmations. The sets are optional and the app does not check them against the standard.
4. Pain gates per step come from each step's Readiness Gate and its catalog "Pain-aware options": neck or shoulder pain at 2 or more for the feet-elevated pike push-up, both wall handstand push-up steps and every handstand and planche step; shoulder pain at 3 or more for the muscle-up steps (a Yellow day, so in practice the trial waits). The pull-ups, the push-up and the pike push-up have no gate, so in Chapter II "Set aside for pain" will not appear.
5. A track's first step (push-up, assisted pull-up) has no step below, so its only choices are "Demonstrated" or, where gated, "Set aside".
6. The parts are fixed when an attempt starts. A step passed after a stopped attempt joins the next attempt. Going back a step never removes a part.
7. The plan page and the start screen name the parts an attempt today would include ("Seven parts, in order…" with "Skill parts: Push-Up, Pike Push-Up").
8. Pain during the skill step is recorded under its own phase (`skill-parts`) and holds the trial the same way pain on the walk does.

Docs updated: CHAPTERS_AND_TRIALS.md (the Chapter I reading, the gates, fixed at start), UX_SPEC.md (the skill step, Three-Mile pain and effort end), DATA_MODEL.md (the built shape), RANGERS_ROAD_PROGRAM.md (the stale "no way back down" line now names Go back a step).

**2026-11-04, answers.** Choices 1 and 3 to 8 confirmed. 2: show all passed steps as parts (no highest-step-only rule), as built.
