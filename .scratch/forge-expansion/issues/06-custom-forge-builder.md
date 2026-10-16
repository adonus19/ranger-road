# 06: Custom Forge builder

**What to build:** From Chapter II, the optional-Forge card opens a builder. The person sees the full library grouped by pattern and taps exercises to add them in tap order (tap again removes). "Start from last time's list" is offered. Done picking opens the existing order editor; Begin starts the session with the standard warm-up in front (skippable). Each exercise defaults to its current chapter prescription or a catalog default, with the set count editable. Custom sessions are saved to history and shown on the exercise, but are left out of progression hints.

**Blocked by:** 04

**Status:** ready-for-agent

**Deadline:** before 2026-11-02 (start of Chapter II)

**Model / effort:** Opus 5.5, medium

**Skills:** angular-developer, impeccable (builder screens), humanizer (copy)

- [ ] The saved session keeps a snapshot of the chosen exercises and order, so history survives library changes
- [ ] Progression hints and "Your record" ignore custom sessions (tested)
- [ ] A quiet note appears when the picks repeat that day's or yesterday's main lifts
- [ ] Backup and restore include custom sessions; older backups restore cleanly
- [ ] Mobile, offline and accessibility checked; tests and build pass; deployed
