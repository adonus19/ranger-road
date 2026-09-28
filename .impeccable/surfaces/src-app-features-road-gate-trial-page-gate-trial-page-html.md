---
version: 1
slug: "src-app-features-road-gate-trial-page-gate-trial-page-html"
primary_target: "src/app/features/road/gate-trial-page/gate-trial-page.html"
related_targets: ["src/app/features/road/road-page/road-page.html", "src/app/features/mission/mission-page/mission-page.html"]
---

## Scope

Gate Trial preparation page, opened from Road or the planned Saturday mission. Mode: Operate. This build shows the plan and readiness guidance. It does not record a trial.

## Audience and job

One person on a phone, preparing for a Chapter I trial. He needs to see the five parts in order, the exact walk and circuit prescriptions, and whether today's readiness allows the physical trial. The page works offline and keeps the 48px touch target standard.

## Direction contract

THESIS: One station at a time. The walk opens as the dominant first part, and the other four parts follow on the same page with a small route linking them.

OWN-WORLD: Forest Light. The painted forest band names the trial; warm paper, book serif type, fine rules and pine actions carry the work below. Gold marks the route's first stop. Readiness is named in words.

FIRST VIEWPORT: At a 390px phone width, the forest title, Back to Road, five route stops, the 2-mile walk prescription, a walk-time tile labeled preview, and a readiness link are visible. The text below the tile says recording is not yet available.

FORM: Station, selected by the user after comparing the Gate Trial mockups in `.impeccable/mocks/decision/`. The approved composition is `.impeccable/mocks/decision/gate-trial-station.png`.

## Related behavior

- The Road page links here and keeps its concise five-part outline.
- The planned Saturday mission links here instead of offering the generic mission outcome form.
- Yellow and Red readiness guidance defers the full physical trial; a missing same-day check links to Readiness.
- Trial completion remains a separate later flow with in-screen movement help, phase data, and permanent history.

## Local visual decisions

The selected comp gives the trial title and 2-mile numeral more scale than the usual DESIGN.md type steps. This is a Station-specific hierarchy decision; the rest of the page keeps the established typography, palette, and flat rules.
