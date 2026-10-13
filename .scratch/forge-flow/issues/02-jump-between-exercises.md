# 02: Jump between exercises

**What to build:** During a Forge session, tapping any exercise lands on its first unmarked set (or its last set if all are marked). Marking a set keeps you on that exercise until it is fully marked, then moves to the next exercise below it with unmarked sets, wrapping to the top. The rest clock keeps running when you navigate and restarts only when a set is marked. The screen scrolls to the set numbers whenever the current set changes (jumping instead of animating with reduced motion). The set buttons show a "Sets" label and the hint "Tap a set to edit it."

**Blocked by:** 01

**Status:** done

**Model / effort:** Sonnet 5.5, medium

- [ ] Navigation rules live in pure functions with unit tests, outside the page component
- [ ] Out-of-order sets no longer pull you back to an earlier exercise
- [ ] Tapping a set number still edits that set
- [ ] Finish behaviour is unchanged when every set is marked
- [ ] Tests and build pass; resume after reload lands on the saved set
