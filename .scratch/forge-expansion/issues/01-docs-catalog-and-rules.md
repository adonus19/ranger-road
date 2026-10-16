# 01: Docs: catalog and rules

**What to build:** The source-of-truth docs describe everything in `spec.md` before any code. The exercise catalog has an entry for every new exercise and track step (purpose, movement pattern, targets, how, feel, avoid, pain-aware options, equipment, image or text only). The program, chapters-and-trials, UX, data-model and design docs describe the optional Forge (eligible days, exclusions, deload and trial weeks allowed), Forge C, the custom builder, the press stance rule, the readiness swaps, the skill tracks with each step's criteria and earliest chapter, and skill parts in trials.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human (docs drafted 2026-10-16; waiting on the person's review and the questions below)

**Model / effort:** Opus 5.5, medium

**Skills:** humanizer (all prose)

- [x] EXERCISE_CATALOG.md has every new exercise and track step from `spec.md`, with the image or text-only choice recorded
- [x] Each track step has drafted step-up criteria and an earliest chapter, marked for the person's approval before ticket 08
- [x] RANGERS_ROAD_PROGRAM.md covers the optional Forge, the deload/trial-week change, press stance, readiness swaps and tracks
- [x] CHAPTERS_AND_TRIALS.md covers skill parts in trials (step or the one below counts; set aside for pain)
- [x] UX_SPEC, DATA_MODEL and DESIGN.md cover the optional-Forge card, the builder flow and how custom sessions are kept out of hints
- [x] Nothing beyond `spec.md` is invented; any gap is raised with the person
- [ ] The person reviews the docs before ticket 02 starts

## Comments

**2026-10-16, docs drafted.** Changed: EXERCISE_CATALOG.md (new "Forge Expansion Exercises" part, plus Hammer Curl and Single-Leg Balance), RANGERS_ROAD_PROGRAM.md, CHAPTERS_AND_TRIALS.md, UX_SPEC.md, DATA_MODEL.md, DESIGN.md, EXERCISE_LIBRARY_SPEC.md. Tests pass (509). The Hammer Curl's Purpose and Pain-aware lines stay as they are because the app quotes them word for word; a "Forge expansion" line records the change for ticket 05.

Marked as drafts for approval:

- Every track step's "Passed when" and "Earliest chapter".
- Every "Custom Forge default" dose.
- The UX and design details I filled in: the "Not yet" link next to "Take this step", a sets stepper in the builder, a skipped planche item not marking the session reduced, custom sessions showing no "Compared with last time" and staying out of the chapter summary, and a readiness swap counting as a pain substitution, which holds the next hint.

Open questions (gaps in spec.md):

1. Pull steps 2 and 5 each combine two movements (band-light pull-up + slow negatives; straight-bar dip + transition drills). Draft: one guide per step covering both. Or should each movement be its own library exercise?
2. Straight-bar dip setup. Draft: barbell in the rack at about hip height. Or is there another bar?
3. Should the optional Forge be offered on a day that already holds a moved (make-up) Forge? The make-up rule says two Forge sessions never stack on one day, so I'd say no. This is not written into the docs yet.
4. The short wrist warm-up for handstand and planche days isn't defined. Which movements and how long?
5. Exercises already in the library that no chapter's Forge A or B prescribes (for example Bear-Hug Carry or the mobility moves) have no catalog default. Proposal: use the latest dose written in the content packs up to the current chapter.
6. Do custom Forge sessions count toward passing a track step? Draft: no, same as hints.
7. Does a stopped optional Forge session hide the card for the week? Draft: only a completed one does.
8. I added Pike Hold as a text-only catalog entry because the readiness gates name it as a swap. A freestanding handstand push-up has no step entry; it is noted as a stretch goal past the push track.
