# 07: Shoulder-pain swaps for overhead work

**What to build:** When today's readiness shows shoulder pain of 3 or more, the overhead carry offers the front-hold carry and the overhead press offers the band pull-apart, as a calm choice on the exercise. This applies in Forge C, Chapter II's Forges and the custom Forge. A swapped exercise is saved under the exercise actually done.

**Blocked by:** 04

**Status:** done (built 2026-11-03; not yet pushed)

**Model / effort:** Sonnet 5.5, medium

**Skills:** angular-developer, humanizer

- [x] Never automatic; the written exercise stays the default
- [x] No load increase after the swapped or pain-affected session (existing rules)
- [x] Tests for the threshold and the saved record; build passes; deployed (build and tests pass; push pending)

## Comments

**2026-11-03, built.** The rules are in `core/program/readiness-swaps.ts`: shoulder pain of 3 or more offers Front-Hold Carry for the two-hand overhead carry and the waiter carry, and Band Pull-Apart for all six overhead presses. The offer is a card on the Current Set screen with "Do ..." and "Keep as written", shown only before the exercise's first set. A swap rewrites the draft (`swapWorkoutExercise`, one transaction), so the session saves the exercise actually done, with `swappedFrom` naming the written one. A swapped carry keeps its sets and time; a swapped press becomes 12 band pull-aparts with its own sets and no load. The session is marked reduced. The written exercise's next hint holds ("swapped for your shoulder last time") until it is done as written again. A remembered order keeps the written exercise's ID. It works in Forge C, Chapter II's Forges and the custom Forge, since they share the player. No database version change. 583 tests pass; the build passes.

Choices for you to confirm:

1. The swap is offered only before the first set. After that, the Substitute panel is the way to record a change.
2. A swapped press is 12 reps of band pull-aparts for the same number of sets. The catalog gives pull-aparts 2 × 12, so I used its 12.
3. The half-kneeling one-arm press and both barbell presses are included in the press swap.
4. The offer needs a same-day readiness check, which every strength session already needs.
5. The muscle-up steps follow this swap when ticket 08 adds them. They are not in the table yet.
