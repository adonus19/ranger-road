# 03: Exercise chip row

**What to build:** An always-visible row of exercise chips near the top of the set screen. Each shows the exercise name and sets marked ("2/3"); tapping one switches exercise using ticket 02's rules. The current chip is marked. The full list stays below.

**Blocked by:** 02

**Status:** ready-for-agent

**Model / effort:** Sonnet 5.5, medium

- [ ] Chip aria label reads like "Bench Press, 2 of 3 sets marked"; the current chip has aria-current
- [ ] Tap areas at least 48px; row scrolls sideways with a 16px gutter at 390px
- [ ] Flat styling per the design system, light and dark; no new small-caps labels
- [ ] Standalone component with its own CSS and a spec
