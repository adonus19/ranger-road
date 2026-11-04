# 11: Inversion and planche gates, wrist warm-up

**What to build:** When today's readiness shows neck or shoulder pain of 2 or more, handstand, wall walk, handstand push-up and planche work offer a pike hold or a regular push-up as a choice. Sessions with handstand or planche work add a short wrist warm-up. Lands with the Chapter V build, when these steps start.

**Blocked by:** 08

**Status:** done (built 2026-11-04; Chapter V Forge content still to come)

**Model / effort:** Sonnet 5.5, medium

**Skills:** angular-developer, humanizer

- [x] Never automatic; tested thresholds
- [x] Tests and build pass; deployed (tests and build pass; push pending)

## Comments

**2026-11-04, built.** `swapsFor` in `core/program/readiness-swaps.ts` now returns every swap offered at today's readiness: the shoulder swaps at shoulder pain 3 or more, and a Pike Hold and a Push-Up at neck or shoulder pain of 2 or more for every step whose pain gate names the neck (the handstand and planche tracks, the wall handstand push-up steps, and the feet-elevated pike push-up). The session card now lists each option, with "Keep as written". The wrist warm-up is `core/program/wrist-warmup.ts`: when a session starts, handstand or planche work adds a 60-second Wrist Circles or Wrist Rocks step to the end of the warm-up, alternating from the newest session that had one, in Forge slots and the custom Forge. 653 tests and the build pass. The Chapter V Forge content that puts these steps in a slot is not in the app yet, so today they appear through the custom Forge and the track slots as those are built.

Choices for you to confirm:

1. The feet-elevated pike push-up takes the swap (the catalog's gate names it); the plain pike push-up does not.
2. A swapped push-up uses 8–12 reps and a Pike Hold uses 20–30 seconds, both with the step's own sets. The catalog gives no push-up dose for a swap, so I used the push track's range.
3. The wrist warm-up is one 60-second step, not both wrist moves in one session. The docs say "alternating ... from one session to the next".
4. Wall handstand push-up steps take the wrist warm-up. The pike push-ups do not.
5. A day with a shoulder swap that removes every handstand step still gets the warm-up, since it is added when the session starts.
