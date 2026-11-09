# UX Specification

## Navigation

Suggested tabs:

- Keep
- Road
- Forge
- Journal
- Field Manual

## First Launch

The person chooses the campaign's Day 1; the app does not start the campaign on its own. Any date can be chosen. Before Day 1 arrives, Keep shows the days remaining and the date can be moved. Once Day 1 has passed the start date is fixed, because dated history depends on it.

If Day 1 is not Monday, Keep and Today's Mission use Week 1's matching weekday orders as a short lead-in through Sunday. Week 1 then begins on Monday and runs through Sunday. This yields four full Monday–Sunday Chapter I weeks. A Monday Day 1 starts Week 1 directly. The campaign day count still starts at 1 on the chosen date.

## Keep — Home

Must show:

- current chapter
- day
- days until trial
- Today's Orders
- readiness status
- primary Begin Mission button
- current Hearth mission (shown only on weeks whose content pack names a leadership or Hearth mission; Chapter II's Weeks 5 and 8 name none, so Keep shows no row)
- a quiet check-in reminder while the Day 1 or monthly check-in is due, or while tests held by a Red day wait (not shown on a Red day)
- a quiet backup reminder on Sunday when no copy was saved that week (Monday through Sunday): one row opening Journal's Save a copy, with a "Not today" link that hides it until tomorrow; it never counts missed weeks
- the optional Forge card on eligible days (see The Optional Forge below)
- optional quick stats

The trial countdown points at the next Gate Trial attempt: the Monday after Week 4, then each Thursday and Monday until the trial is passed (see Trial Timing in `CHAPTERS_AND_TRIALS.md`). The band's note says when the next attempt is, or that the trial is today if the person is Green. On an attempt day, and on the day of a pass, the check-in reminder waits until the next day so its tests never land on top of the trial. Once the trial is passed, the countdown reads Done, the day's order reads Gate Trial passed, and the note names the day Chapter II begins.

**Any-day trials (from the Three-Mile Trial).** Once a chapter's last week has ended, Keep's trial band says the trial can be started any day, names the suggested day, and links to the trial page. There is no attempt-day countdown and no required gap between attempts. A trial started today replaces today's main order. The check-in reminder still waits until the day after a trial day or a pass.

From Chapter II's first day (the day after a Monday pass, or the Monday after any other pass), Keep shows Chapter I complete in place of the daily mission board until Chapter II's orders are in the app. Check-in and trial recovery reminders remain available. A pass saved under the older rules, before the trial window opened, starts Chapter II on the first attempt day while the remaining dated Week 4 orders continue through Sunday.

## Today's Mission

Chapter II uses the dated orders in the [Road content pack](rangers-road-full-program-content/02_THE_ROAD.md) from the day after a Monday Gate Trial pass (or the Monday after any other pass), counting Weeks 5–8 from that week's Monday with no lead-in. Mission IDs are `chapter-2-week-<n>-day-<d>-…`. Forge A and B and Restoration II reuse Chapter I's warm-up and finishes. Friday interval walks show their steps as written; the main order's details list them. After Week 8 its Mondays and Thursdays are Three-Mile Trial attempts under the same rules as the Gate Trial.

Chapter I uses the dated orders in the [Muster content pack](rangers-road-full-program-content/01_THE_MUSTER.md). The lead-in uses Week 1's matching weekday orders and distinct mission IDs. Wednesday offers restoration plus the specified nonexertional skill in Week 2 (tool inspection) and Week 3 (basic knots). Weeks 1 and 4 have restoration only. Restoration requires a same-day readiness check; the two nonexertional skills do not. Weeks 1–3 Friday offers the documented easy walk or restoration; Week 4 Friday is easy mobility or rest. Until a same-day readiness check is saved, a path that needs one says so; after that, each path describes itself instead. Week 2 Saturday's fieldcraft practice shows that week's tool-inspection description. On a Red day, a walk or workout's own instructions (such as brisk intervals) are hidden and the Restoration routine is linked instead; Week 4 Friday's easy mobility links the same routine. Each choice has its own mission definition, and saved attempts keep that definition as a snapshot. A later attempt is added to history without replacing the first. A record whose old week-based ID no longer matches the day's order remains visible with its saved snapshot. Week 4 Saturday is a 30-minute easy walk, followed by preparation for Monday's attempt while the trial is pending. After Week 4, Mondays and Thursdays are Gate Trial attempts; the other days repeat Week 4's orders. An attempt is a plan: the trial uses its dedicated result flow, so Today's Mission says Gate Trial today, names the next attempt in case today doesn't go, and links to the trial. Once the trial is passed, the order reads Gate Trial passed, names Chapter II's first day, and links to the record.

### Chapter III and the seasonal layer

Chapter III uses the dated orders in the [High Country pack](rangers-road-full-program-content/03_THE_HIGH_COUNTRY.md), counting Weeks 9–12 from the Monday after the Three-Mile Trial pass (or from the day after a Monday pass). Mission IDs are `chapter-3-week-<n>-day-<d>-…`. After Week 12, every day repeats Week 12 and shows a quiet "High Country Trial available" card. Tuesday's climb shows written steps, the optional interval timer, and the step-down finisher; on a Red day it links Restoration. Forge B's one-arm press has the quiet "Press half-kneeling instead" choice. Week 12 Saturday is trial preparation, Friday a choice of a 20-minute easy walk or Restoration.

Built 2026-11-09 (session 3):

- **Climb.** The written steps name the step-ups and step-downs, and under them "How to: Step-Up" and "How to: Slow Step-Down" open the exercise guides. The optional timer calls its work blocks "Step-ups" and, when it ends, says "Intervals done. Finish with the slow step-downs, 2 × 6 per leg." On a Red day the order reads "Restoration in place of the climb", the steps and guides are hidden, and Restoration opens in the Forge.
- **Press stance.** On Forge B's one-arm press, before the first set, a quiet row reads "Seated by default." with a "Press half-kneeling instead" button. After the choice it reads "Half-kneeling today." with "Press seated instead". It leaves once a set is marked or a pain note is saved. It is not a swap card: nothing says reduced, because the session stays full.
- **Trial available.** From the Monday after Week 12 until the pass, Keep shows a quiet row under the main order: "High Country Trial available. Take it on any day you choose. Pick a clear-weather day." Until the trial's own page is built (ticket 04) it opens the Road page's trial plan. The Keep band shows "Open" in place of the countdown, and its note and the Road page's trial line use the any-day wording; before Week 12 ends they say "after Week 12, on any day you choose." There are no Monday or Thursday attempt days for Chapter III.

The **seasonal layer** adds one "Advent" or "Christmas" row to Today so far and to Keep on its real dates (the four Advent Sundays, Christmas Eve, Christmas Day), whatever the chapter. The row shows the theme, the reading reference, and the family question, with a Done button undoable the same day, like the Hearth mission. Nothing counts or tallies it. It returns each year, with dates computed from Christmas Day.

## Road — Campaign

Visual 9-chapter campaign map.

Current build: Chapters I and II (Chapter III is planned for the app by 2026-11-30). The current chapter's four full weeks are drawn as a route, with a Today mark and the chapter's trial at the end, on its first attempt day (the Monday after the chapter's last week). Chapter I's route begins on Day 1 and shows any short lead-in; Chapter II's begins on its first Monday and labels its weeks 5–8. Before Day 1 the route shows the start date. From the first attempt on, the Today mark rests on the trial. The trial section names the first attempt before it arrives, then the next attempt, and says the next chapter waits for a pass; once the trial is passed, it names the day and when the next chapter begins, and links to the record. Chapters III–IX join the map once their content is seeded.

An older campaign may keep a separately chosen Gate Trial target date; attempts still follow the Monday and Thursday rule.

While the Gate Trial is pending after Week 4, the days between attempts repeat Week 4's weekday orders. Pending attempts do not start Chapter II or add a progression step.

From Chapter II's first day, Road shows Chapter II and its Three-Mile Trial; once that trial is passed and Chapter III's first day arrives (its orders are not in the app yet), Road labels Chapter II complete and links to the saved record. This derived acknowledgment does not change past records.

Road opens a separate screen for manually logging a completed walk or trail session, and lists the most recent sessions below the Gate Trial. The Phase 1 form asks for session date, miles, minutes, terrain, and RPE (1–10), with optional pain before and after (0–10). It does not set a distance, pace, or ruck-load target. Saving a Road session does not record Today's Mission; the outcome is still recorded there. On a conditioning day, once a full or reduced outcome is saved, Today's Mission offers "Log walk details", which opens the log for that date. The readiness check remains a step before training; a retrospective log does not create a past readiness check.

Each chapter:

- title
- theme
- current/completed/locked
- trial
- milestone summary

## Forge — Training

Brisk-interval walks always show their written steps. An optional interval timer is offered in a closed "Interval timer (optional)" section under those steps on Today's Mission (Chapter I Week 3 Tuesday and Chapter II's Friday walks; hidden on a Red day with the steps) and on Log a walk, where the person sets their own rounds, brisk seconds and easy seconds (1–20 rounds, 10–600 seconds). It never starts itself, nothing waits for it, and a mission or walk saves without it. It shows the current block (Warm up, Brisk, Easy, Cool down), a large countdown, the round, and what comes next, with Pause and Stop. A soft chime marks each switch (higher for brisk, lower for easy; three notes at the end), with a Sound switch remembered on the device. It keeps the screen awake while it runs where the browser allows, and takes its time from the clock so a sleeping phone catches up when reopened, though a chime cannot sound while the phone is asleep. When a plan gives no cooldown length, the timer ends with "Finish the walk at an easy pace."

Workout player:

- current exercise
- previous load
- planned load
- sets/reps/time
- rest timer
- Quick Help
- Pain button
- Substitute button

The Chapter I Forge opens the workout named in today's order. Restoration is also available as needed after a same-day readiness check. An in-progress session resumes at the saved exercise and set, with its prescription snapshot intact. The warm-up is shown before the work sets; the documented easy finish is required for Restoration and optional for Forge A. The Current Set screen keeps the dose, planned load, Quick Help, Pain, and Substitute visible together; Complete set opens a short confirmation of actual reps or seconds and optional effort before saving. Exact numeric targets may fill that confirmation for review, while ranges remain blank. Each work set is marked done or skipped before a completed session is saved. Skipped sets and described substitutions mark the session reduced. The rest timer shows elapsed time because Chapter I gives no fixed rest interval. The Current Set screen's Last time and hint (below) are display-only; the app never fills in or increases the next load automatically.

### Moving between exercises in Forge

The person may work the exercises in any order.

- **Exercise chips.** A row of chips near the top of the Current Set screen, one per exercise in the displayed order, each with its marked count ("2/3"). Tapping one switches exercise. The current chip is marked; its aria label reads "Bench Press, 2 of 3 sets marked". The full list stays below.
- **Where a tap lands.** An exercise opens on its first unmarked set, or its last set when all are marked.
- **Sets.** The set buttons sit under a "Sets" label with the hint "Tap a set to edit it." Tapping a set number opens that set.
- **After marking a set.** The person stays on that exercise until all its sets are marked, then moves to the next exercise below it in the displayed order that has unmarked sets, wrapping to the top. When nothing is left, the finish screen opens as before.
- **Rest clock.** It keeps running when the person switches exercise or opens a marked set. Only marking a set restarts it.
- **Scrolling.** Whenever the current exercise or set changes, the screen scrolls so the set numbers are at the top (a jump, not an animation, when the phone asks for reduced motion).

### Changing the exercise order

A "Change order" button on the warm-up screen and in the full exercise list opens a list of the exercises, each row with large Move up and Move down buttons (labelled for screen readers by exercise, "Move Box Squat up"), plus **Use written order** and **Done**. There is no dragging. It is available at any point in a session; exercises that already have marked sets keep them. Before any set is marked, the session starts on the first exercise in the chosen order, and changing the order moves to the new first exercise; once a set is marked, changing the order never moves the person. After each move, focus stays on that exercise's buttons. The chips, the full list and the after-marking rule all follow the chosen order. The app gives no advice about muscle groups. The order is remembered for that workout and used the next time it starts, including on make-up and deload days. If the workout's exercises have changed since, the written order is used with the note "This workout's exercises changed, so it's back in the written order." The saved session keeps the written prescription and records the order the person worked in.

### Progression in Forge

The rules live in `RANGERS_ROAD_PROGRAM.md` (Strength Progression). This section covers how they appear. Gold and the readiness colors are never used for these elements; they are plain text and numerals on paper.

**Current Set screen.** A **Last time** block replaces the old "Previous load" line, under the load box, so Quick Help, Pain and Substitute stay above the docked button on a 390 × 845 phone.

- Line 1: a spaced-caps label with the date, "LAST TIME · MON, NOV 9".
- Line 2: the sets of the last exposure in tabular serif figures, "95 × 6 · 95 × 6 · 95 × 6". The set the person is on is bold, so it answers what was done on this set. Timed work reads "25 lb · 40 s × 3 per side". The final effort follows when recorded.
- Line 3: one hint in plain sans. "May add 5 lb → 100 lb · all sets at 6, final effort 6" has a small up arrow; "Hold at 95 lb · Yellow today" has none and gives its one reason. After a planned deload it adds the context, "Week 4 was a deload; based on Week 3".
- First time on record: "First time on record". A step-up exercise adds "Last on Supported Split Squat: 20 lb × 8" and never says "add". If the prescription changed, the label names it, "Last time (Chapter I, 3 × 8)".
- No weight recorded: the hint uses reps or seconds and a quiet line says "Add the weight to track it."
- Assisted Pull-Up: the load field becomes "Band assistance (lb)" with the helper "0 if no band", filled from last time and editable. Last time reads "40 lb assist × 8 · 40 × 8 · 40 × 7". The hint reads "May use less band help, under 40 lb" with the usual reason, and never suggests a step. When none was recorded the quiet line says "Add the band help to track it." Your record and the chapter summary read "Since Day 1: 60 → 40 lb assist", and 0 shows as "no band"; the exercise sits under Lifts.
- Exercises with no hint (push-ups, bodyweight, Restoration) show no Last time block.
- The load box stays empty and the person types the weight. There is no "use this weight" button.

**Final-set effort.** On each exercise's final set, effort is the first field in the Complete set confirmation: a 1–10 tap scale in two rows of five, like the walk log, with "easy", "2–3 reps left" and "nothing left" under 1, 7 and 10, and the line "Optional · decides next time's hint". On other sets effort stays the optional field it is today.

**After saving.** A "Compared with last time" list, per exercise: what went up first ("Box Squat 95 → 100 lb", "Suitcase Carry 40 → 45 s per side"), then one line counting what held ("4 held steady"), then anything lighter ("Lighter today (reduced)"). No red, no praise words, no scores.

**Exercise guide.** After "In the program", a "Your record" list: a summary line ("Since Day 1: 75 → 100 lb"), then the best working set of each session, newest first, with the date and chapter and a "deload" or "reduced" tag where it applies. It shows 8 rows, then "Show all". There is no chart. It is hidden until the exercise has a recorded session.

**Chapter trial page after a pass.** A "What changed this chapter" section: first against last full session for each exercise, grouped as Lifts, then Carries and holds, with unchanged exercises counted in one line. Keep's "trial passed" note links to it.

In Week 8 Forge B, show the same approximate 25% guide (around 21 of its 28 work sets, curl and chin-up included); Week 8 Forge A shows no reduction and no load increase. In Week 4 Forge B, show the documented approximate 25% deload as an around-15-of-20-work-set guide. The person chooses which roughly five sets to skip, and the active and finish screens show the number actually completed and skipped. Keep the base prescription and actual set marks in the saved snapshot; this guidance does not silently remove exercises or auto-progress load.

After Chapter I is acknowledged complete, Forge stops offering the repeated Week 4 choices. A saved draft still opens so partial work can be ended and kept in history.

Pain can be recorded from the active workout using body area, a 0–10 level, and the documented response. It saves immediately. Pain at 5 or more ends strength work; stopping keeps partial sets and pain in history. On Red readiness, Forge A/B cannot run; Restoration remains available if appropriate. A saved workout remains separate from Today's Mission outcome, which the user records from the mission screen.

## The Optional Forge

Rules are in `RANGERS_ROAD_PROGRAM.md` (The Optional Forge). This section covers how it appears.

**The card.** On an eligible day, Keep's Today's Orders shows a quiet card below the main order card, and Today's Mission shows the same card after the outcome form, just above "Log light activity". The card reads "Optional Forge available", with one help line ("Forge C, about 20–25 minutes" in Chapter I; "Build your own session" from Chapter II). In a deload week the help line adds "Keep it light." It is not the main order, never takes the Begin Mission button, and has no Done ring in Today so far. Once an optional Forge session is completed that week, the card is gone until Monday; a stopped session leaves it. It does not show on a day that holds a moved Forge. It does show on a Red day, since the person always has the choice; opening a strength session then says Red readiness means no strength work today, and the usual readiness rules hold. A card left alone says nothing and is never listed as missed. On the same days the Forge page lists the session under "Optional".

**Chapter I.** The card opens Forge C in the normal workout player, with the standard warm-up first and that week's curl. Its saved sessions feed Last time and the hint like Forge A and B. The session is recorded and tracked like any other, and finishing it (completed, not stopped) records the day's walk as Today's Mission when that day's mission is a walk, the same as logging the walk. A reduced optional Forge does not make the walk reduced. When the day's mission is not a walk, the finish screen says the session was extra work and links back to Keep.

**Chapter II on: the builder.**

The card opens the builder at `/forge/custom`. Readiness has no effect on the builder: the list can be built at any time. Begin starts a strength session, so it still needs today's readiness check and says so, with a link, if there is none.

1. **Pick.** "Build your session". The full exercise library, grouped by pattern under plain headings: Lower body, Push, Pull, Carry, Core, Arms, Mobility. Each row is a 48px toggle with the exercise name and its default dose. Tapping adds it and shows its number in tap order; tapping again removes it and the later numbers close up. Every track step is listed. An exercise with no written dose yet (no chapter so far prescribes it and the catalog has no default) is not listed. A "Start from last time's list" button above the groups fills the picks from the last custom session, in the order it was worked, still editable. Each picked row has a sets stepper (1 to 6 sets) and a reps stepper (1 to 50 reps by one; for a hold or carry, 5 to 300 seconds by five). Both start at the written dose, and a written range such as 8–10 stays as written until the person changes it.
2. **Order.** "Done picking" (docked, showing the count) opens the existing order editor, already open, with the picks in tap order and "Use tap order" to undo the moves. "Back to picks" keeps the order. Under the list the person chooses "Normal" or "Reduced" for the session; a deload week starts it on Reduced with "Keep it light.", and the person may change it.
3. **Begin.** The standard warm-up comes first, with "Skip the warm-up" under its Warm-up complete button. The workout player runs as usual: chips, Quick Help, Pain, Substitute, rest clock. Opening the session link without a started custom session points back to the builder.

Each exercise's dose comes from the current chapter's Forge A or B, or from its catalog default. The builder shows where it came from in the help line ("From Forge A", "Catalog default").

**Repeat note.** If a picked exercise is one of today's or yesterday's Forge A or B main lifts, a quiet line under the picks names it ("Box Squat was in yesterday's Forge A."). It never blocks Begin.

**In a custom session.** The Current Set screen shows Last time from Forge sessions for reference, but no hint line. The in-session order editor's reset reads "Use starting order", and the order is not remembered for next time. The saved session shows what was done, without "Compared with last time". The session appears in each exercise's Your record with a "custom" tag and is left out of the chapter's "What changed" summary.

## Skill Tracks in Forge

Rules are in `RANGERS_ROAD_PROGRAM.md` (Skill Tracks).

- A track slot shows the person's current step by name, with that step's guide in Quick Help.
- When the current step is passed and the next step's earliest chapter has come, a plain line under the exercise reads "Next step available: Pike Push-Up", with "Take this step" and "Not yet". It shows on a Green day outside a deload week, never in a custom Forge, and never on a swapped exercise. Nothing changes until the person taps "Take this step", and "Not yet" only hides the line for that session.
- A quiet "Go back a step to <previous step>" link shows under any track slot that is past step 1, at any time and on any readiness day. It saves a choice one step earlier, the same way "Take this step" does: before the slot's first set it changes today's exercise at once, and after that it starts next time. Earlier passes are kept, and the next step is offered again once the earlier step is passed and its chapter has come. It never shows in a custom Forge or on a swapped exercise.
- "Take this step" before the slot's first set (and with no pain note on it) changes today's exercise to the new step at once, with the slot's dose. Once the slot has begun, the choice is saved and the line reads "Saved. Pike Push-Up starts next time." A remembered exercise order keeps working after a step, since it names the written exercises.
- A step whose criteria count band help (Band-Light Pull-Up and Slow Negatives) records "Band assistance (lb)" on each set, as the assisted pull-up does.
- A step not yet reached shows nothing: no "behind", no countdown, no list of what is left.
- The planche item at the end of Forge B is marked "Optional · about 5 minutes" and can be skipped. A skipped planche item does not mark the session reduced and is never shown as missed.
- Readiness swaps (see Readiness Gates) are offered on the exercise as a calm choice ("Shoulder pain is 3 today. Swap to Front-Hold Carry?"), with the swap and "Keep it" side by side. On back pain at 2 or more from Chapter IV, the press offers Seated and Half-kneeling; a seated barbell press shows "Reduce the load", with a link to swap to dumbbells.
- On neck or shoulder pain of 2 or more, a handstand, wall-walk, handstand push-up or planche step offers the same calm card with two choices, "Do Pike Hold" and "Do Push-Up", beside "Keep as written". It keeps the step's sets, takes the pike hold's 20–30 seconds or the push-up's 8–12 reps, and marks the session reduced. The card shows before the exercise's first set and never applies itself.
- Handstand and planche days show a wrist warm-up of about 1 minute inside the warm-up list (a 60-second Wrist Circles or Wrist Rocks step after the written warm-up), alternating between the two from the newest session that had one. A day counts when the work includes any handstand-track or planche-track step or a wall handstand push-up step. It is added when the session starts, in a Forge slot or a custom Forge, and has Help like any warm-up step.

## Exercise Quick Help

- generated image loop
- purpose
- steps
- engagement cues
- common mistakes
- full guide link

## Readiness Check

Energy (1–5) and each pain area (0–10) are answered with one tap per value. Sleep hours are typed. Readiness is always named in words, never by color alone.

## Journal

Journal holds a Measurements section:

- the check-in, marked Due now on Day 1 and every 28 days until it is saved, or Tests to add when a Red day held the tests; otherwise it says when the next one opens
- Weight and waist, a short screen for logging either one on any day, with the latest values

The check-in screen opens on The last 28 days: average sleep and back, shoulder, and neck pain from the readiness checks, read-only. Below it come Body (weight, waist, resting heart rate, optional blood pressure), Tests (push-ups, pull-up assistance in pounds with an optional band note, squat depth, toe reach), and How you feel (energy and capability, 1–5), with Save docked above the tabs on phones. On a Red readiness day the Tests part says the tests wait for another day. Before Day 1 there is no check-in to take; the first one is titled Day 1 check-in.

The Tests part links to a same-day readiness check when one has not been saved and keeps the test inputs hidden until then. Saving the body-only check-in finishes that window without tests. Held tests require a fresh same-day non-Red check before saving, including when the tests screen is opened directly.

Journal ends with Your records, because every record lives only on the device:

- Save a copy puts every record in one dated file. On a phone it opens the share sheet (Files, iCloud, email); elsewhere the file downloads. The row shows when this device last saved a copy. Closing the share sheet saves nothing.
- Restore from a copy reads a chosen file and asks before replacing anything. The confirmation compares the copy with this device (Day 1, latest entry, record count) and says how many records on this device the copy lacks. Replace records swaps in the copy; Cancel changes nothing.
- A file that isn't a copy, is damaged, or came from a newer version of the app is refused, and nothing changes.

Entries:

- daily watch (a day's reflection appears in the Evening Watch, except Week 1 Monday's "What requires my attention today?", which the Morning Watch asks)
- trial reflections
- weight
- waist
- sleep
- energy
- pain
- photos optional
- post-mission function

## Field Manual

The Field Manual opens on **This week**, a short list of the current leadership lesson, fieldcraft practice when scheduled, reading blocks, today's Scripture reference, and exercise guides. A three-way switch also opens **Contents** (each chapter's sections in program order) and **Index** (A to Z search with topic filters and a keyboard-operable letter rail). Before Day 1, the first week is labeled Week ahead. This week follows the campaign: from Chapter II's first day it lists Chapter II's lesson, Navigation I, the chapter's book, Scripture and sessions, and after Week 8 it shows the Three-Mile Trial. Once the last chapter in the app is passed and the next one's first day arrives, This week says that chapter is complete. Contents, the Scripture page and the Exercises page list every chapter in the app, with the chapter the campaign is in first and the others below it in order. Each chapter's block has its own lessons, field cards, book, Scripture by week, trial row and sessions; the principles and the reading plan appear once, under the first chapter. The Index's Scripture entries cover every chapter, and an exercise guide lists the sessions that use it in any chapter. Scripture stays as references; the app does not reproduce Bible text. Exercise guides list the standard doses and show the current week's Forge adjustment beside the relevant session; the active Forge screen remains the place to follow readiness changes and record work.

Monday Morning Watch links to the week's lesson, including Day 1 when a lead-in starts midweek. Keep's Hearth mission links to that lesson. Today's Mission links reading days to the reading plan and the Week 2 tool or Week 3 knot practice choices to their cards. The reading plan calls _Habits of the Household_ the Chapter I book; it does not claim to know which book the person is currently reading.

Content includes the twelve leadership principles, eight weekly lessons (Weeks 1–8), reading plan, Scripture references, tool and knot field cards, and full exercise guides. The approved text lives in [Field Manual Content](rangers-road-full-program-content/FIELD_MANUAL.md). Knot cards carry written steps and one picture per step, two per row, added only after they are checked against a tied knot (four steps for the square knot and bowline, six for two half hitches, where each hitch's tuck gets its own picture). Step pictures are prefetched for offline use like the exercise guides. Tool rows show a hatchet, knot rows a rope, and navigation a compass. The Navigation I card is written only, learned across Weeks 5–8, with its field mission and the optional daughter quest on Week 6's Saturday walk. A multi-part Hearth mission (Week 8) shows its short labels on Keep and each part in full on the lesson page.

## Trial Flow

Trial should feel distinct:

- preparation screen
- checklist
- multi-phase flow
- timers/data entry
- reflection
- completion summary
- permanent campaign history

The photo step was removed 2026-11-09: photos are not part of the app's trials. Photos may stay optional elsewhere (such as the Journal), but no photo uploader is to be built for now.

**Any day.** From the Three-Mile Trial on, a trial's page opens once the chapter's last week has ended, and an active trial can start on any day with a same-day Green check. The Gate Trial keeps its earlier Monday and Thursday rule. A trial with parts on separate days (the High Country Trial) shows which pieces are done and what is next, and its draft stays open between days.

The Gate Trial preparation screen uses the Station composition to show the five documented parts, readiness guidance, and the full circuit. The trial opens only on an attempt day before it is passed; on other days the screen names the next attempt, or the day it was passed. On an attempt day, a same-day Green check opens the active trial, and a Yellow or Red check names the next attempt. Passing means a completed result: every part finished as written on a Green day. The active screen saves a resumable local draft through Road, Gate Circuit, Mind, Spirit, and Oath. It records actual results for each of the six circuit stations in each of three rounds, keeps exercise help and generated movement media on the circuit screen, and saves pain immediately. Stop trial asks once before it ends the attempt; stopping retains a partial attempt and its pain notes in history. A review precedes the completed result, which remains in local campaign history. If a later readiness check is Yellow or Red, or pain or a reduced response changes the attempt, the full trial waits for another Green day.

Save a completed trial without forcing an early post-mission function answer. A separate recovery check opens 60 minutes after the circuit ends and suggests answering within 120 minutes. Completion, the Keep reminder, and recorded trial history link to it; the Keep reminder lasts 12 hours. The check captures one plain-language answer for energy, soreness, irritability, helping at home, and family life, plus an optional note. It is saved once as a linked local record without changing the completed trial. An older result without a circuit-end timestamp uses its final save time for the delay.

### Skill parts in a trial

When a chapter's trial includes a skill part (see Skill Parts in Trials in `CHAPTERS_AND_TRIALS.md`), it is its own part in the active trial, named by the step ("Wall Walk"). The person records one of: "Demonstrated", "Demonstrated the step below (Wall Plank Hold)", or, on a pain-gated day, "Set aside for pain". The step's Quick Help opens from the part.

Built in ticket 09 for the Three-Mile Trial. The skill parts share one step after the stairs and before the leadership reflection, with its own dot in the progress row. Each part shows the step's "Passed when" as the standard and, below it, the step below and its standard. A track's first step has no "step below" choice. "Set aside for pain" appears only when today's check meets that step's gate, with a line saying the trial still counts. Once an outcome is chosen, optional boxes take the reps or seconds of each set, counted in the done step's own unit. Pain can be recorded and the trial stopped from this step, as on the walk, carry and stairs. The step must be finished, like any physical part, before the reflection opens, and the end of physical effort (for the recovery check) is saved when the person leaves it. The trial's plan page and its start screen name the parts an attempt today would include, and the part count reads six or more. The review, the completed summary and the recorded attempts list each part's outcome.

## Pain Flow

Tap Pain:

- body area
- severity
- continue
- reduce mission
- substitute
- end exercise

Pain event must be persisted.

## Low-Friction Requirements

- large tap targets
- minimal typing
- remember last-used loads
- intelligent defaults
- auto rest timer
- quick voice notes later
- offline functionality
- one-tap reduced mission

## App Updates

The installed app looks for a new version when it opens, returns to the foreground, comes back online, and hourly. When one is ready, a quiet bar above the navigation reads "A new version is ready." with a Reload button. The app never reloads by itself, so unsaved text is never lost.

## Forge Rest Timer

Between sets, the rest clock counts up from when the set was marked. It has Pause/Resume, Reset and Hide (a "Show rest timer" button brings it back), and an optional rest length from 0:30 to 5:00 that plays a soft chime when reached (remembered on the device). Rest time is never saved.

## Walks and Mission Recording

- A walk logged for today on a walk day is linked to that mission (`missionId`) and records the mission as Full, or Reduced on Yellow or when "This was a reduced walk" is ticked. If readiness has not been checked, the walk saves and a note asks for the check.
- Ending a Forge session early records the mission as Reduced; finishing records Full (Reduced if sets were skipped or changed). The result can be changed on Today's Mission with "Record another attempt".
- Today's Mission shows each walk logged today with "Edit or remove" and "Log another walk". Editing keeps an "Edited" note (`editedAt`); removing asks first. Neither changes the mission record already saved.
- Only today is recorded this way. Earlier days are not made up from a walk.

## Today's Progress

- Today's Mission opens with a "Today so far" list: the main order, Morning Watch, Hearth mission, reading (when the day has it), the optional family quest, and Evening Watch. A ring becomes a check when done.
- The main order shows "Done" for a full outcome and a neutral "Recorded" for Reduced, Restoration or Rest. Watches show "Saved".
- Hearth mission, reading and the family quest have a Done button, undoable ("Undo") the same day. These marks are for today only; earlier days are never revisited, and nothing counts or tallies what was missed.
- Keep shows the same check marks on the main order, the watches and the Hearth mission once they are done. Nothing is shown for items not yet done.

## Back on Track Note

Keep shows a calm note ("Welcome back. Pick up with today's orders…") when each of the two days before today had a main order and nothing was recorded for either. A recorded Rest counts as recorded; Sundays, trial attempt days and days before Day 1 never count. It looks no further back, shows no counts or streaks, and asks for no make-up work. It disappears once today's main order is recorded.

## Forge Make-ups

When a Forge session is missed, the next morning's Keep, Today's Mission and Forge show the moved session as the day's main order, with a calm note ("Forge A, moved from Monday. Full or reduced, your choice."). The day's own walk appears beside it as "(optional)", with the note to do it alongside or in place of one leg exercise's sets. Today's Mission selects the moved session by default; the optional order is one tap away. No counts of missed sessions are shown. Rules are in `RANGERS_ROAD_PROGRAM.md`, Missed Forge Make-ups. Details settled in the build:

- The schedule is worked out from saved mission records, Forge sessions (including ones saved before one-step recording) and Red readiness days. If that history cannot be read, every day shows its own dated orders and nothing is treated as missed.
- In a three-Forge week, a missed carried session on Monday is dropped; Forge A can still move from Wednesday to Thursday, pushing Forge B to Saturday.

(Planned) Light Activity (`/keep/activity`): opened from a link at the foot of Today's Mission, worded "Add a walk or light cardio, if you like" in a deload week and "Log light activity (optional)" otherwise. A required activity name; optional time (minutes), distance (miles), weight (lb), sets and reps. Today's entries are listed with Remove. It is never required, scored or used to set a target.

## The Three-Mile Trial

`/road/three-mile-trial` shows the plan, today's status and recorded attempts; `/road/three-mile-trial/active` records it in five parts, saving as it goes, with the same Green check, pain notes, stop-and-keep, and review-then-save as the Gate Trial. It can be started on any day once Week 8 is over (the Monday after is the suggestion), until passed. Recording choices settled in the build, each from "finishing every part as written":

- Walk: a "full 3 continuous miles" confirmation, time, effort 1–10, knee and back discomfort, recovery after 5 minutes; splits (text) and average heart rate are optional. A walk timer is offered.
- Carry: weight (prefilled 30 lb; at least 30 lb to pass), seconds in each hand (at least 60 each), and grip, core and posture difficulty as plain words: Easy, Moderate, Hard. The Suitcase Carry's Quick Help and pictures open from this part.
- Stairs: a "three flights at a steady pace" confirmation and breathlessness 1–10. If the stairs are not appropriate that day, the attempt is stopped and kept, not passed.
- Leadership reflection: both prompts answered. Prayer: a confirmation that Psalm 121 was read and the family prayed for.
- Pain notes can be recorded during the walk, carry and stairs, and during any skill parts. The end of the stair test (or of the skill parts, when the trial has them) is saved as the end of physical effort, for the recovery check.
- The recovery check works as it does for the Gate Trial: it opens 60 minutes after the stair test ends (`/road/three-mile-trial/recovery/:resultId`), and the Keep reminder, which looks across every chapter's trial, links to the right one for 12 hours. The saved check and any pain notes appear in the trial's recorded attempts.

## The High Country Trial

`/road/high-country-trial` shows the plan, which pieces are done, and recorded attempts; `/road/high-country-trial/active` records it, saving as it goes, with the same Green check, pain notes, stop-and-keep and review-then-save as the other trials. It can be started any day once Week 12 is over. Decided 2026-11-09.

- **Pieces.** Pre-start plan (direction, junctions, expected distance and elevation, turnaround point and time); the hike (time, distance, gain if known, RPE, knee and back); one location estimate before checking the phone; 5 quiet minutes and the written reflection at the high point; the circuit; then skill parts. The hike and the circuit are on separate days. A completed hike stays done; the circuit can follow on any later Green day. A line says 48 hours is a target, not a rule.
- **Weather.** A "Postponed for weather" button records a postponement, not a failed attempt. Turning back on the trail under the turnaround criteria is recorded the same way. A "pick a clear-weather day" note shows on the plan.
- **Winter stand-in.** A choice on the plan, with an optional "weather reason" field. One continuous walk of 1.5–2 hours; elevation gain is recorded, not required, from outdoor terrain or an indoor track, never a treadmill. A paper trail map is used for navigation, with location estimates at set checkpoints; the quiet minutes and reflection come at the halfway mark.
- **Skill parts** come after the circuit, with the same choices and styles as the Three-Mile Trial.
- **Recovery check** counts from the end of physical effort (the circuit, or the last skill part).
- **Large touch targets, plain language and mobile-first layout** as everywhere. No photo.
