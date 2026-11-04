# 10: Images, batch 1

**What to build:** Image sequences for the Pallof press and the chest-supported reverse fly, generated with the existing exercise-image tool and verified one by one before they show in the app.

**Blocked by:** 03

**Status:** done (2026-11-04; images approved by the person)

**Deadline:** before 2026-11-02 if possible; the text guide covers the gap

**Model / effort:** Sonnet 5.5, low

- [x] Each image checked against the catalog text (setup, anchor height, body position)
- [x] Asset URLs relative (GitHub Pages)
- [x] Build passes; deployed (build and tests pass; push pending)

## Comments

**2026-11-04.** Pallof press and chest-supported reverse fly now have `sequence.webp` and `muscle-map.webp` in `public/images/exercises/<id>/`, and their guides are no longer text-only. The first Pallof sequence faced away from the rack and the first fly sequence read as arms forward and back, so both were redone (Pallof from the front with the rack at his side; fly from behind). The Pallof sequence's three sideways arrows were painted out, since the press goes toward the viewer. Style references and prompts are in `tools/exercise-images/refs/` and `prompts/` for batches 12 and 13.
