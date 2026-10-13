# 04: Band assistance in the Forge

**What to build:** Assisted pull-ups record band assistance in pounds per set, separate from load. The set screen shows "Band assistance (lb)" with the helper "0 if no band", prefilled from last time. Last time reads "40 lb assist × 8 · 40 × 8 · 40 × 7". The hint keeps its all-sets-at-top rule and names last time's assistance without suggesting a step ("May use less band help, under 40 lb"). When none was recorded, the line reads "Add the band help to track it." Best set, Your record, the chapter summary and compare on save treat less assistance as better, with more reps breaking ties; 0 shows as "no band" and the exercise stays under Lifts.

**Blocked by:** 01

**Status:** done

**Model / effort:** Opus 5.5, medium

- [ ] Existing saved sets without assistance still read correctly
- [ ] No hint ever increases load after a reduced or pain session (unchanged rules)
- [ ] Tests added in the progression specs for ordering, hint copy and summary text
- [ ] Copy matches `spec.md`; build and tests pass
