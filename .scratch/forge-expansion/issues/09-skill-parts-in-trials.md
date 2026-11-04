# 09: Skill parts in trials

**What to build:** A track step first passed during a chapter appears as a part of that chapter's trial. Demonstrating that step or the step just below it completes the part. On a pain-gated day the part can be marked "set aside for pain" without failing the trial.

**Blocked by:** 08

**Status:** ready-for-agent

**Model / effort:** Opus 5.5, medium

**Skills:** angular-developer, impeccable (trial page), humanizer

- [ ] Works with the Trial Timing rule (Monday/Thursday attempts until passed)
- [ ] Existing trial records read unchanged
- [ ] Tests and build pass; deployed

## Comments

**2026-11-04, from ticket 08's answers.** A step first passed in Chapter I is a Chapter I pass, and the Gate Trial is already done, so it does not become a part of that trial. It stays on record (`stepPasses` keeps each step's first pass and its chapter). The person asked that such passes can still become part of future trials where that applies. Decide in this ticket what "where that applies" means, for example a step passed in Chapter I but not yet shown in a trial, and ask the person if the docs do not settle it. "Go back a step" is allowed (ticket 08); a step stays passed for the trial it was first passed in even if the person goes back.
