# 04: Any-day trials and the High Country Trial

**Status:** ready-for-agent

**Blocked by:** 03

**Model / effort:** Opus 5.5, high

**Skills:** angular-developer, impeccable, tdd

**What to build:** Any-day trials for every trial from the Three-Mile Trial on, and the High Country Trial. Rules are in `CHAPTERS_AND_TRIALS.md` (Trial Timing, Chapter III), `UX_SPEC.md` (The High Country Trial) and `DATA_MODEL.md` (Any-day trials and the High Country Trial). The Three-Mile Trial must ship before Mon 2026-11-30.

- Any-day start once the chapter's last week has ended; the day's order is replaced; the Gate Trial keeps its rule.
- Multi-day pieces on one draft: hike, then circuit; a passed hike stays passed; 48 hours is a note only.
- Weather postponement with an optional reason, not a failed attempt; a turnaround counts the same.
- Winter stand-in: 1.5–2 h continuous walk, no treadmill, gain recorded not required, paper map, checkpoint estimates, halfway reflection.
- Circuit retry, skill parts after the circuit (reuse `trial-skill-parts.ts` and its stylesheet).
- Fix the chapter number counted for a pass once Chapter III exists (check `stepPasses`).
- Confirmed 2026-11-09, build: a trial started on a day with a moved Forge drops the moved session.
- No trial photo step.

- [ ] Existing trial records, drafts, attempts and backups read unchanged
- [ ] Tests and build pass; 390 px light and dark; offline
- [ ] Deployed before 2026-11-30
