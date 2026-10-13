# 01: Docs first

**What to build:** The product docs describe all three changes before any code: per-set band assistance (including the check-in number and the less-band hint in pounds), the Forge navigation rules and chip row, and the Change order feature with its saved per-workout order and the "order performed" record. Follow the decisions in `spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

**Model / effort:** Sonnet 5.5, low

- [ ] DATA_MODEL covers set assistance, the optional order on drafts and sessions, the saved-order store (database version 7) and the check-in fields
- [ ] UX_SPEC covers navigation, the chip row, Change order and the assistance display
- [ ] RANGERS_ROAD_PROGRAM covers the less-band hint and best-set rule
- [ ] DESIGN.md/DESIGN_SYSTEM covers the chip row and order editor components
- [ ] No exercise, progression rule or content is invented beyond `spec.md`
