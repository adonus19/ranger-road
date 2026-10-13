# 07: Remember the order for each workout

**What to build:** A chosen order is saved per workout and reused the next time that workout starts. "Use written order" clears it. If the workout's exercises no longer match the saved order, the written order is used with the note "This workout's exercises changed, so it's back in the written order." Make-ups and deload weeks use the saved order. This adds database version 7 (adds a store only); backup includes the saved orders and older backups still restore.

**Blocked by:** 06

**Status:** done

**Model / effort:** Opus 5.5, medium

- [x] Upgrading from version 6 preserves every existing record
- [x] Backup and restore round-trip the saved orders; backups without them restore cleanly
- [x] Mismatch fallback and note covered by tests
- [x] Tests and build pass
