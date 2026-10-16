# 03: New exercise guides in the app

**What to build:** Every new exercise and track step from the catalog can be read in the Field Manual's exercise list and opened as Quick Help, with a progression kind assigned (carries progress time first, then load; band exercises and track steps as the catalog says). Prefactor first so exercise guides are no longer split by the chapter that introduced them.

**Blocked by:** 01

**Status:** done (built 2026-10-16; not yet committed or deployed)

**Model / effort:** Sonnet 5.5, medium

**Skills:** angular-developer

- [x] Guides are grouped by exercise, not by chapter; existing guide IDs and text unchanged
- [x] Every new exercise has guide text and 3–5 Quick Help steps from the catalog
- [x] Progression kinds assigned and covered by tests
- [x] Text-only exercises render cleanly with no image placeholder gap
- [x] Tests and build pass

## Comments

**2026-10-16, built.** Guides and Quick Help moved out of the chapter files into `exercise-guide-data.ts` and `exercise-quick-help.ts`; `exercise-guides.ts` keeps the same API. The 25 earlier IDs and texts are unchanged and tested in order. 51 guides added: all 45 Forge Expansion catalog entries, plus six older catalog entries that had no guide (Single-Leg Balance, Slow Step-Down, Supported Reverse Lunge, Front-Hold Carry, Bear-Hug Carry, Elevated Light Hinge Pattern). All new guides are `textOnly` until their pictures ship; ticket 10/12/13 clears the flag per exercise, and a test checks the flag against the image files. The guide page, Quick Help and the Gate Trial help drop the picture and muscle map for text-only guides. The exercise list gained an "Every exercise, A to Z" section so unused exercises can be read now.

IDs chosen: `chin-up`, `band-light-pull-up`, `straight-bar-dip`, `single-leg-romanian-deadlift`, and kebab-case names otherwise.

Progression kinds: new `timed-carry` (seconds up to the top of the range, then +5 lb) for the two overhead carries; DB presses, curls and reverse fly are `loaded`; barbell presses `barbell-upper` (+5 lb, a judgment call: say if overhead needs smaller steps); chin-up is `assisted-pull-up`; band work and track steps give no hint. Front-Hold Carry and Bear-Hug Carry get none, since the program table does not list them.

App text drops the catalog's "(see … in `X.md`)" pointers; the verbatim test applies the same rule. Added guide fields: equipment, harder versions, and the already-written safety and stop-or-substitute lines are now shown.
