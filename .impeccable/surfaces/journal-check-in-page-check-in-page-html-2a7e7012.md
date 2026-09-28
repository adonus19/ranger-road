---
version: 1
slug: "journal-check-in-page-check-in-page-html-2a7e7012"
primary_target: "src/app/features/journal/check-in-page/check-in-page.html"
related_targets: ["src/app/features/journal/journal-page/journal-page.html","src/app/features/journal/body-log-page/body-log-page.html","src/app/features/keep/keep-page/keep-page.html"]
---

## Scope

Measurements: the check-in screen opened from Journal (and from a Keep reminder when one is due), for recording body measurements, four simple physical tests, and how the person feels. It also covers the Journal's Measurements section, the weight-and-waist log for any day, a tests-only follow-up after a Red day, and the Keep reminder. Mode: Operate.

## Audience and job

One person on a phone, on Day 1 and every 28 days after, plus any day for weight and waist. Job: see what the last 28 days of readiness checks already say (average sleep; back, shoulder and neck pain), enter weight, waist and resting heart rate (needed), optionally blood pressure, push-ups, pull-up assistance, squat depth in words and toe reach, rate energy and perceived capability 1 to 5, and save. Constraints: works offline, 48px touch targets, no goals or targets, no good/bad colors on changes, and on a Red readiness day the four tests are held for another day.

## Direction contract

THESIS: The check-in opens on what the month's readiness checks already know, a read-only look-back, and asks for today's numbers under it, so the check-in reads as a monthly account rather than a blank form. It refuses a bare stack of empty fields and a step-by-step wizard.

OWN-WORLD: Forest Light, inherited. Night-forest header bar, warm paper page, one parchment-tint read-only panel split by a hairline, sage spaced-caps labels, 1px bordered fields with 6px corners, pine Save docked above the tabs under a full-width hairline. Wittgenstein for the title, section headings and every numeral, read or entered; Noto Sans for labels, help and controls. Gold only on the selected tab.

STORY: The visitor sees Monthly check-in and the campaign day, reads average sleep and pain from the last 28 days, types weight, waist and resting heart rate, works down through blood pressure, the tests and how they feel, and saves. The check-in then shows in Journal, and the Keep reminder clears.

FIRST VIEWPORT: At 390x845: header bar, Back to Journal, the Monthly check-in title with Day 29 · Monday, October 12 beneath; The last 28 days; the tint panel with AVERAGE SLEEP 6.6 hours on the left of a hairline and BACK, SHOULDER, NECK PAIN with serif values on the right, a rule, then Averages from 22 readiness checks.; a rule; Body; WEIGHT (LB) and WAIST (IN) side by side as large serif numerals; RESTING HEART RATE (BPM) half width with its two-line help beside it; a full-width rule and pine Save check-in docked above the five-tab bar with Journal selected.

FORM: Last 28 days first. Structure 5 on the ordered list of six (rested then tested; ledger with last values; stations; checklist rows; readiness look-back first; then-and-now columns), dealt as the lead by surface seed adc55701. The user locked it on decision page 4ad73071 on 2026-09-26: .impeccable/mocks/decision/check-in-lookback.png (answer saved in .impeccable/questions/check-in-round.answer.json).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Related surfaces

- Journal: a Measurements section with the check-in (and its due or follow-up state), the weight-and-waist log, and the latest values.
- Keep: a quiet reminder row on Day 1 and every 28 days after until the check-in is saved, and a follow-up row when a Red day held the tests.
- Weight and waist: a short screen for logging either or both on any day.

## Unresolved

- The comp's sample values (221.6, 41.5, 68; 6.6, 2.4, 1.1, 0.8 from 22 checks) are placeholders. The built form starts empty; the panel shows real averages.
- Below the first viewport the comp shows nothing. Blood pressure, Tests and How you feel inherit the Body section's system; squat depth uses the segmented choice, energy and capability the 1 to 5 tap scale.
- The first check-in (Day 1 window) titles itself Day 1 check-in, and with no readiness checks yet the panel says so instead of showing numbers.
- The measurement how-to lines (weight, waist, heart rate, blood pressure, push-ups, pull-up band, squat depth, toe reach) were written for this build and need the user's review.
