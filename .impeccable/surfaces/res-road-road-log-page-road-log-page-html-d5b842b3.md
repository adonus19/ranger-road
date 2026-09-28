---
version: 1
slug: "res-road-road-log-page-road-log-page-html-d5b842b3"
primary_target: "src/app/features/road/road-log-page/road-log-page.html"
related_targets: ["src/app/features/road/road-page/road-page.html","src/app/features/mission/mission-page/mission-page.html"]
---

## Scope

Road log: a screen opened from Road for recording a completed walk or trail session. It also covers the Road page's Log a walk button and short list of recent walks, and the Log walk details link on Today's Mission. Mode: Operate.

## Audience and job

One person on a phone, right after a walk or later the same day. Job: record the date, miles, minutes, terrain and effort, optionally pain before and after, and save. Constraints: works offline, 48px touch targets, no distance, pace or ruck-load targets, no scores, and saving does not record Today's Mission.

## Direction contract

THESIS: The log is one short form in two titled parts, The walk and How it felt, with Save docked above the tabs, so a walk goes in quickly and the button is always in reach. It refuses both a step-by-step wizard and a history-first ledger.

OWN-WORLD: Forest Light, inherited. Night-forest header bar, warm paper page, sage spaced-caps field labels, 1px bordered fields and tap buttons with 6px corners, pine for the selected date, the selected effort and Save. Wittgenstein for the title, the two section headings and every numeral a person enters; Noto Sans for labels, help and controls. Gold only on the selected tab.

STORY: The visitor sees Log a walk, keeps Today or picks another date, types miles and minutes, checks the terrain, taps an effort from 1 to 10, optionally opens pain before and after, and saves. The walk then shows on Road.

FIRST VIEWPORT: At 390x844: header bar, Back to Road, the Log a walk title, The walk heading; the date as three equal segmented buttons; miles and minutes side by side as large serif numerals; terrain full width; a rule; How it felt; effort 1 to 10 in two rows of five with its help line; the collapsed pain row; a pine Save walk docked above the five-tab bar.

FORM: Two halves, docked save. Structure 1 on the ordered list, dealt second by surface seed bcc45f96. The user locked it on decision page a2500b5b on 2026-09-26: .impeccable/mocks/decision/road-log-halves.png (answer saved in .impeccable/questions/road-log-round.answer.json).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Related surfaces

- Road: a Log a walk button and the last few walks below the Gate Trial.
- Today's Mission: a Log walk details link on conditioning days once a full or reduced outcome is saved. It opens the log for that date and its back link returns to the mission.

## Unresolved

- The comp sets the Save walk label in the serif. DESIGN.md's Serif Names, Sans Works rule puts tapped labels in Noto Sans, so the build uses the sans.
- The comp shows no open pain section; opened, it reuses the readiness pain scales (0 to 10, two rows of six on phones).
- The comp's sample values (2.1, 41, Gravel trail, effort 6) are placeholders. The built form starts empty, except that terrain prefills with the last terrain used.
