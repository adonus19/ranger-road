# 06: Change order for this session

**What to build:** A "Change order" button opens a list with large ↑/↓ buttons per exercise and a Done button, from the warm-up screen and from the full exercise list, at any point in a session. The chips and the next-exercise logic follow the chosen order. Marked exercises keep their sets. The saved session records the order actually performed as an optional field; older sessions read as the written order.

**Blocked by:** 03

**Status:** ready-for-agent

**Model / effort:** Sonnet 5.5, medium

- [ ] Move buttons are labelled per exercise ("Move Box Squat up") and are at least 48px
- [ ] The written prescription and result indices stay unchanged
- [ ] Reload mid-session keeps the chosen order
- [ ] No drag-and-drop library added
- [ ] Tests and build pass
