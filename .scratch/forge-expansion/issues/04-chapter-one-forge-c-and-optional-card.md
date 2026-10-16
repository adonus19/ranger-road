# 04: Chapter I Forge C and the optional-Forge card

**What to build:** On Tuesday, Wednesday, Friday or Saturday the day's orders show a quiet "Optional Forge available" card. In Chapter I it opens Forge C, recorded like any Forge. Once Forge C is done that week, the card is gone until next week. The card is not shown on a trial attempt day or in a three-Forge make-up week; in deload weeks it adds a "keep it light" note. Nothing is said when it is not done. Forge C's curl rotates week by week (hammer, DB curl, preacher), and its sessions feed progression hints.

**Blocked by:** 01, 03

**Status:** done (built 2026-10-16)

**Deadline:** before 2026-11-02 (end of Chapter I)

**Model / effort:** Opus 5.5, medium

**Skills:** angular-developer, impeccable (card and placement), humanizer (copy)

- [x] Eligibility is a pure, tested function that reads the make-up planner's three-Forge week, not a copy of its rules
- [x] Never logged or shown as missed; no streak or count
- [x] Works during the Gate Trial wait (Monday/Thursday attempts excluded)
- [x] Offline, mobile layout and large touch targets checked
- [x] Existing history and make-up tests still pass; build passes; deployed for phone check

## Comments

**2026-10-16, built.** Eligibility is `getOptionalForge` in `src/app/core/program/optional-forge.ts`. It reads the three-Forge week from the make-up planner through a new `isThreeForgeWeek` export, and a moved Forge from `withMakeup`, so it does not copy their rules. Forge C is `chapter-1-forge-c` in `chapter-one-workouts.ts`. Its curl is chosen when the session starts, counting calendar weeks from Week 1's Monday, so the rotation carries on during the Gate Trial wait. Week 4 is saved as reduced with "Keep it light." The card is on Keep below the main order and on Today's Mission above "Log light activity". The Forge page lists Forge C as "Optional" on the same days. 15 new tests; 526 tests and the build pass. Walked through in headless Chrome at 390px, light and dark: the card is 358 × 60 px, opens Forge C with that week's curl, and is gone for the week once a completed session is saved. An offline reload with the service worker and the server stopped showed the right state.

Choices made beyond the docs, for the person to confirm:

1. The card is hidden on a Red day, since Red means no strength work.
2. The Gate Trial wait days count as deload, so they get "Keep it light." Progression hints already treat them that way.
3. The curl rotation keeps going past Week 4 while the trial waits (Week 5 DB curl, Week 6 preacher curl).
4. On Today's Mission the card sits above "Log light activity", not right under the order title, so it doesn't split the order from its details.
5. Finishing Forge C does not record Today's Mission. The finish screen says it was extra work and links back to Keep.
