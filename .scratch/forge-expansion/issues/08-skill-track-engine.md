# 08: Skill-track engine

**What to build:** Track slots hold the person's current step. When the saved history meets a step's approved criteria and its earliest chapter has arrived, the exercise shows "next step available" as information; the person chooses whether to take it, and the choice is saved. Passing a step is recorded with the chapter it happened in. The pull track (assisted pull-up first) is live from Chapter II; later steps wait for their chapters.

**Blocked by:** 01 (criteria approved), 05

**Status:** ready-for-agent

**Model / effort:** Opus 5.5, high

**Skills:** angular-developer, humanizer

- [ ] Track steps and criteria are content data, not hard-coded in components
- [ ] Never steps up automatically; no "behind" message
- [ ] Custom sessions do not count toward criteria
- [ ] History, backup and migration checked; tests and build pass; deployed
