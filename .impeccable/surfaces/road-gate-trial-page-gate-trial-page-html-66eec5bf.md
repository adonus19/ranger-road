---
version: 1
slug: "road-gate-trial-page-gate-trial-page-html-66eec5bf"
primary_target: "src/app/features/road/gate-trial-page/gate-trial-page.html"
related_targets: ["src/app/features/road/road-page/road-page.html","src/app/features/mission/mission-page/mission-page.html","src/app/features/road/gate-trial-active-page/gate-trial-active-page.html"]
---

## Scope

Gate Trial preparation page, opened from Road or the planned Saturday mission. Mode: Operate. It shows the plan, readiness guidance, the way into the recording flow, and recorded attempts. Recording itself happens on the active trial page, which has its own brief.

## Audience and job

One person on a phone, preparing for a Chapter I trial. It shows the five parts in order, the exact walk and circuit prescriptions, and whether today's readiness allows the physical trial. The page works offline and keeps the 48px touch target standard.

## Direction contract

THESIS: One station at a time. The walk opens as the dominant first part, and the other four parts follow on the same page with a small route linking them.

OWN-WORLD: Forest Light. The painted forest band names the trial; warm paper, book serif type, fine rules and pine actions carry the work below. Gold marks the route's first stop. Readiness is named in words.

FIRST VIEWPORT: At a 390px phone width, the forest title, Back to Road, five route stops, the 2-mile walk prescription, a walk-time tile that says what will be recorded, and the readiness link or the way into the trial are visible.

FORM: Station, selected by the user after comparing the Gate Trial mockups in `.impeccable/mocks/decision/`. The approved composition is `.impeccable/mocks/decision/gate-trial-station.png`.

## Related behavior

- The Road page links here and keeps its concise five-part outline.
- The planned Saturday mission links here instead of offering the generic mission outcome form.
- Yellow and Red readiness guidance defers the full physical trial; a missing same-day check links to Readiness.
- A same-day Green check opens the recording flow at `/road/gate-trial/active`. Completed and stopped attempts are listed here as recorded history.

## Local visual decisions

The selected comp gives the trial title and 2-mile numeral more scale than the usual DESIGN.md type steps. This is a Station-specific hierarchy decision; the rest of the page keeps the established typography, palette, and flat rules.
