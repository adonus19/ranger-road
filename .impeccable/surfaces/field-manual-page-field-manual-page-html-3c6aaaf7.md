---
version: 1
slug: "field-manual-page-field-manual-page-html-3c6aaaf7"
primary_target: "src/app/features/field-manual/field-manual-page/field-manual-page.html"
related_targets: ["src/app/features/journal/watch-page/watch-page.html","src/app/features/keep/keep-page/keep-page.html","src/app/features/mission/mission-page/mission-page.html"]
---

## Scope

Field Manual tab at `/field-manual` with three views under one switch (This week, Contents, Index) and the reading pages they open: the week's leadership lesson, the leadership principles, the reading plan, Scripture by week, the Chapter I field cards (tool inspection; square knot, bowline, two half hitches) and the exercise guides. Mode: Read. It also covers the ways in: a Monday Morning Watch step, the Hearth row on Keep, and the reading and fieldcraft links on Today's Mission.

## Audience and job

One person on a phone: at the start of the week, on a reading day, in the garage with tools, or with a rope in hand. Job: see what this week asks them to read or practice, read it in a few minutes, and look up any guide later. Works offline, 48px touch targets, no scores, streaks or completion marks on faith or leadership, and Scripture as references only.

## Direction contract

THESIS: The manual opens on this week: the five things the week asks you to read, practice or train, each one tap away. A three-way switch turns the same manual into its contents (every entry with its week, this week's marked) or an A to Z index with search. It refuses a library-first shelf page.

OWN-WORLD: Forest Light, inherited. Night-forest header bar, warm paper page, the segmented switch (pine fill for the selected view), medallion rows between hairlines in Journal's row language with gold pictograms, serif titles over one secondary sans line and a thin arrow. Contents uses serif entries with dotted leaders to a right-aligned week and small pine This week tags; Index uses serif letter heads and a sage letter rail. Wittgenstein for the title, headings, row names and entries; Noto Sans for descriptions and the switch. Gold only in the pictograms and the selected tab.

STORY: The visitor opens Field Manual on Monday, sees Week 2 · Keep Your Word, taps Keep small promises and reads the lesson in about three minutes. Midweek they come back for the tool inspection card, the reading or an exercise guide. Contents shows where everything sits in the chapter; Index finds anything by name.

FIRST VIEWPORT: At 390x845: header bar; the Field Manual page title; the switch (This week selected, Contents, Index); the heading Week 2 · Keep Your Word with Chapter I · The Muster under it; five medallion rows between hairlines (hearth: Keep small promises, Leadership lesson · Read Monday, about 3 minutes; hatchet: Tool inspection, Field card · Wednesday or Saturday; open book: Habits of the Household, Reading · Wednesday and Friday, 10 minutes; sunrise: Matthew 5:33–37, Scripture today · six more this week; anvil: Forge and Restoration, Exercise guides · 18 movements this week); calm empty paper down to the five-tab bar with Field Manual selected.

FORM: This week first, with a three-view switch. Structure 1 on the ordered list of seven, dealt third by surface seed e829b51d and locked by the user on decision page 88b44db1 on 2026-09-29. At the user's direction the dealt Contents (structure 3) and Index (structure 7) became switch views, The whole manual rows were removed, and a fifth row for the week's exercises was added: .impeccable/mocks/decision/field-manual-switch-v2.png. Contents and Index views follow .impeccable/mocks/decision/field-manual-contents.png and field-manual-index.png under the same title and switch.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Related surfaces

- Reading pages (a lesson, the principles, the reading plan, Scripture by week, a field card, this week's exercises, an exercise guide) inherit the system: back link, serif page title, one sans subline, hairline sections.
- Morning Watch: on Monday, a step links to the week's lesson.
- Keep: the Hearth row links to the week's lesson.
- Today's Mission: the reading link opens the reading plan; Week 2 and Week 3 fieldcraft days link to their cards.

## Unresolved

- The comp's lesson pictogram is a heart. The build uses the app's hearth pictogram, which Keep already uses for the Hearth mission. The hatchet is a new icon in the same 24px set.
- The lessons, principles, reading plan and field cards are drafts awaiting the user's review in docs/rangers-road-full-program-content/FIELD_MANUAL.md.
- The knot cards carry generated four-panel step strips in the exercise-guide style. Each must be checked for correct crossings before it ships.
- Before Day 1, This week shows Week 1 as the week ahead. After Chapter I is complete, it says Chapter II's pages will appear once they are added; Contents and Index stay open.
- Weeks without a field card or reading days show fewer rows. On Gate Trial weeks the exercise row lists the trial circuit and Restoration.
