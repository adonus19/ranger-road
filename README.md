# The Ranger's Road

The Ranger's Road is a private-first, mobile-first training PWA designed around a 9-month personal transformation campaign.

The program combines:
- functional strength
- aerobic endurance
- mobility
- loaded carries and rucking
- practical fieldcraft
- Christian spiritual formation
- husband/father leadership
- reading and reflection
- measurable monthly trials

The purpose is not bodybuilding, fantasy role-play, or arbitrary gamification. The program exists to build a capable, energetic, disciplined, useful husband and father.

## Product Principles

1. Capability over appearance.
2. Consistency over heroics.
3. Low friction over feature bloat.
4. Real-world milestones over fake XP.
5. Faith is practiced and reflected on, not numerically scored.
6. Family leadership is modeled through service, responsibility, attention, and follow-through.
7. Pain/readiness data can modify training.
8. The app supports the program; the program must make sense without the app.
9. Solo-first. Companions are optional.
10. Offline-first PWA.

## Deployment

Every push to `main` runs the unit tests, builds the app, and publishes it to GitHub Pages at https://adonus19.github.io/ranger-road/ (`.github/workflows/deploy-pages.yml`). The build takes its base href from the Pages site, so asset URLs in templates and styles must stay relative (`images/...`, not `/images/...`). Records are stored on each device, in IndexedDB, not on GitHub.

## Source of Truth

Read `/docs` before implementing behavior.

Recommended implementation order:
1. Product shell + navigation
2. Local data model
3. Chapter I content
4. Daily mission engine
5. Workout player
6. Exercise guidance system
7. Measurement/journal tracking
8. Trial flow
9. Faith/leadership/fieldcraft content
10. Remaining chapters
11. Cloud sync later (Journal already saves and restores a backup copy)
