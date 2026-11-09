# 14: Chapters III and IV first, then place the Chapter V track steps

**What to build:** Plan, then build, Chapters III and IV in the app. Only then place the Chapter V Forge content (handstand track in Forge A's tenth slot, the planche stretch item at the end of Forge B, balance work in Forge B's tenth slot) that the skill tracks, the inversion gates and the wrist warm-up were built for.

**Blocked by:** the person's planning of Chapters III and IV

**Status:** planning for Chapter III done 2026-11-09 (see `.scratch/chapter-three/planning.md`); Chapter IV planned after Chapter III is built

**Model / effort:** to be set after planning

## Why this is a note and not ready work

- The app holds Chapters I and II only. The content packs for III to IX are in `docs/rangers-road-full-program-content/` and the Forge A and B tables for II to IX are in the docs (ticket 02), but nothing past Chapter II is a chapter program in `src/app/core/program/`.
- Tickets 07, 08, 09 and 11 were built so that they work in whatever slot a chapter writes. Nothing waits on them.

## Placement notes for Chapter V (from the spec and docs, not new rules)

- **Forge A slot 10, from Chapter V:** the handstand track (`trackId: 'handstand'`): wall plank hold, wall walk, chest-to-wall handstand hold, kick-up to wall, freestanding handstand attempts. The chapter writes the slot's dose for "Handstand track (current step)"; a step counted the same way keeps it, otherwise the step takes its catalog dose (`stepPrescription`).
- **Forge B stretch item, from Chapter V:** the planche track (`trackId: 'planche'`), optional, about 5 minutes, two short sets, skippable, never shown as missed, and a skipped one does not mark the session reduced.
- **Forge B slot 10 when it is not the glute bridge, from Chapter V:** balance work (single-leg balance with harder versions, slow lateral step-down, single-leg reach, light single-leg Romanian deadlift gated by back pain like the light hinge).
- **Wrist warm-up:** already added automatically at session start for handstand-track, planche-track and wall handstand push-up steps (`core/program/wrist-warmup.ts`), so the chapter does not write it into the warm-up.
- **Neck or shoulder pain at 2 or more:** already offers the pike hold or push-up on every step the gate names.
- **Trials:** a step first passed in a chapter becomes a part of that chapter's trial (ticket 09). Only the Three-Mile Trial screen has the skill step so far; each later chapter's trial screen must reuse the same pieces (`trial-skill-parts.ts`, `src/styles/trial-skill-parts.css`) when it is built.
- **Chapter number counted for passes:** the campaign's chapter is worked out only up to the last chapter in the app, so a pass made after the Chapter II trial counts as Chapter II until Chapter III exists. Building Chapter III fixes this; check `stepPasses` dates against the new chapter then.
- **Muscle-up and push track steps** (earliest chapters 3 to 5) also depend on the Chapter III and IV Forge tables, since their slots are in those Forges.

## Planning questions for the person (Chapters III and IV)

- Which of Chapter III's changes ship first: the press variants (two-DB in III, barbell from IV), the half-kneeling press option in III, and the overhead-carry progression (30 to 45 seconds)?
- Back-pain press stance rule starts in Chapter IV. Does it need its own ticket, with the seated barbell press "reduce the load" note?
- Chapter III and IV trials: which skill parts are expected (pull-up and push-up steps), and do their trial screens get built with Chapter III and IV or later?

- [ ] Chapters III and IV planned and approved
- [ ] Chapters III and IV built, tested and deployed
- [ ] Chapter V built with the placements above
