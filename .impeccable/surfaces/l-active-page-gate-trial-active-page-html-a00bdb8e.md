---
version: 1
slug: "l-active-page-gate-trial-active-page-html-a00bdb8e"
primary_target: "src/app/features/road/gate-trial-active-page/gate-trial-active-page.html"
related_targets: ["src/app/features/road/gate-trial-page/gate-trial-page.html","src/app/features/road/road-page/road-page.html"]
---

## Scope

Gate Trial recording flow at `/road/gate-trial/active`, opened from the Station preparation page. Mode: Operate. It records the five parts (Road, Gate Circuit, Mind, Spirit, Oath) into a resumable local draft, then shows a review and the completed or stopped result.

## Audience and job

One person on a phone, mid-effort and often short of breath, recording what actually happened: the 2-mile walk, 18 circuit stations over 3 rounds, three reflections, Psalm 121 and prayer, and a personal oath. Entries save as they are made and work offline. Pain must be one tap away during the physical parts.

## Direction contract

THESIS: One station at a time. The current task, its target, and its movement sequence fill the screen; everything else waits below it.

OWN-WORLD: Forest Light, extending the approved Station preparation page: a compressed forest band, warm paper, book-serif headings and numerals, fine rules, pine actions, and the five-stop route with a gold ring on the current part.

FIRST VIEWPORT: At 390px, the band, Back to trial, the five-stop route, and the phase heading with its plain subline are visible, with Record pain, Stop trial, and the primary action docked above the tabs. After each saved station the next station's name, round and station count, target, sequence, Quick Help, and entry field scroll into view together.

FORM: Station extension, drawn by Codex as `.impeccable/mocks/decision/gate-trial-active-station-v2.png` from the user's choice of Station for the trial. Its sidecar is not marked approved. Codex's notes in `.impeccable/mocks/decision/gate-trial-active-station.md` describe the flow.

## Related behavior

- Quick Help opens in place under its button with the movement sequence, steps, and the neck-down muscle map. Focus moves into it and returns to the button on Close.
- Record pain opens at the top of the physical part and saves immediately. Body area, level 0 to 10, and the response are tap choices from the shared form controls.
- Stop trial asks once before it ends the attempt, with Keep going focused first.
- A failed save names the first missing entry above the primary action, marks the field, and moves focus to it. The save status uses the same line.
- A hold names its reason in words: another day, pain, or today's latest readiness state.
- Completion needs a same-day Green check and no blocking pain. The recovery function assessment is a separate follow-up 60 to 120 minutes after the effort.

## Local visual decisions

- The station count sits under the station name as a plain subline. Nothing sits above a heading.
- Effort (RPE) uses the Road log's 1 to 10 tap scale.
- Below 700px, Record pain, Stop trial, the message line, and the primary action stack in one bar above the tabs. From 700px they end the form, as on the walk log and check-in.
- The trial title and the station target numeral keep the Station page's larger scale.
