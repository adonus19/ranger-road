# 06: Custom Forge builder

**What to build:** From Chapter II, the optional-Forge card opens a builder. The person sees the full library grouped by pattern and taps exercises to add them in tap order (tap again removes). "Start from last time's list" is offered. Done picking opens the existing order editor; Begin starts the session with the standard warm-up in front (skippable). Each exercise defaults to its current chapter prescription or a catalog default, with the set count editable. Custom sessions are saved to history and shown on the exercise, but are left out of progression hints.

**Blocked by:** 04

**Status:** done (built 2026-10-16)

**Deadline:** before 2026-11-02 (start of Chapter II)

**Model / effort:** Opus 5.5, medium

**Skills:** angular-developer, impeccable (builder screens), humanizer (copy)

- [x] The saved session keeps a snapshot of the chosen exercises and order, so history survives library changes
- [x] Progression hints and "Your record" ignore custom sessions (tested)
- [x] A quiet note appears when the picks repeat that day's or yesterday's main lifts
- [x] Backup and restore include custom sessions; older backups restore cleanly
- [x] Mobile, offline and accessibility checked; tests and build pass; deployed

## Comments

**2026-10-16, built.** From Chapter II the optional-Forge card opens the builder at `/forge/custom` (`custom-forge-page`). Dose rules and the repeat note are pure functions in `core/program/custom-forge.ts`; the groups and catalog defaults are content in `custom-forge-library.ts`. A custom session is a workout session with `workoutDefinitionId: 'custom-forge'` and `kind: 'custom'`, and its snapshot holds the picks in their final order, their doses and set counts, and the Chapter II warm-up. `exposuresFor` leaves custom sessions out, so Last time, hints, "Compared with last time" and the chapter summary ignore them. "Your record" lists them with a "custom" tag and leaves them out of "Since Day 1". Database version 8 adds no store; older rows and older backups read and restore unchanged (tests for the v7 upgrade, a v7 copy, and a copy holding a custom session). 565 tests and the build pass. Walked through in headless Chrome at 390px, light and dark: card → builder → picks with a repeat note → order → Begin → skipped warm-up → saved; the card was gone for the week, the guide showed the custom row, and the next week's "Start from last time's list" came back in the order worked. Every builder control measured at least 48px. Reloaded offline from the service worker with the server stopped.

Choices made beyond the docs, for the person to confirm:

1. Exercises with no written dose yet are left out of the builder rather than given one: Single-Leg Balance, Slow Step-Down, Supported Reverse Lunge, Front-Hold Carry, Bear-Hug Carry, Elevated Light Hinge, Wrist Circles and Wrist Rocks. They appear once a chapter in the app writes a dose or the catalog gives a default.
2. Doses come from the current chapter's Forge A or B, then its other sessions (Restoration), then earlier chapters in the app ("From Chapter I Forge C"), then the catalog default. Warm-up doses are never used.
3. The group for each exercise is my reading of its movement pattern: handstand and planche work are under Push, the muscle-up under Pull, the straight-bar dip under Push.
4. The repeat note reads saved sessions (completed or stopped) of today's or yesterday's Forge A or B, main sets only, so a warm-up box squat is not a repeat.
5. The sets stepper runs from 1 to 6.
6. In a deload week a custom session is saved as reduced with "Keep it light.", like Forge C.
7. The builder asks for today's readiness check before showing the list, as the session start screen does.
8. During a custom session the Current Set screen still shows Last time from Forge A or B for reference, with no hint line.
9. "Your record" in the ticket: custom rows are listed with a "custom" tag (as the spec says) and only "Since Day 1" ignores them.
