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
- optional quick stats

The trial countdown points at the next Gate Trial attempt: the Monday after Week 4, then each Thursday and Monday until the trial is passed (see Trial Timing in `CHAPTERS_AND_TRIALS.md`). The band's note says when the next attempt is, or that the trial is today if the person is Green. On an attempt day, and on the day of a pass, the check-in reminder waits until the next day so its tests never land on top of the trial. Once the trial is passed, the countdown reads Done, the day's order reads Gate Trial passed, and the note names the day Chapter II begins.

From Chapter II's first day (the day after a Monday pass, or the Monday after any other pass), Keep shows Chapter I complete in place of the daily mission board until Chapter II's orders are in the app. Check-in and trial recovery reminders remain available. A pass saved under the older rules, before the trial window opened, starts Chapter II on the first attempt day while the remaining dated Week 4 orders continue through Sunday.

## Today's Mission

Chapter II uses the dated orders in the [Road content pack](rangers-road-full-program-content/02_THE_ROAD.md) from the day after a Monday Gate Trial pass (or the Monday after any other pass), counting Weeks 5–8 from that week's Monday with no lead-in. Mission IDs are `chapter-2-week-<n>-day-<d>-…`. Forge A and B and Restoration II reuse Chapter I's warm-up and finishes. Friday interval walks show their steps as written; the main order's details list them. After Week 8 its Mondays and Thursdays are Three-Mile Trial attempts under the same rules as the Gate Trial.

Chapter I uses the dated orders in the [Muster content pack](rangers-road-full-program-content/01_THE_MUSTER.md). The lead-in uses Week 1's matching weekday orders and distinct mission IDs. Wednesday offers restoration plus the specified nonexertional skill in Week 2 (tool inspection) and Week 3 (basic knots). Weeks 1 and 4 have restoration only. Restoration requires a same-day readiness check; the two nonexertional skills do not. Weeks 1–3 Friday offers the documented easy walk or restoration; Week 4 Friday is easy mobility or rest. Until a same-day readiness check is saved, a path that needs one says so; after that, each path describes itself instead. Week 2 Saturday's fieldcraft practice shows that week's tool-inspection description. On a Red day, a walk or workout's own instructions (such as brisk intervals) are hidden and the Restoration routine is linked instead; Week 4 Friday's easy mobility links the same routine. Each choice has its own mission definition, and saved attempts keep that definition as a snapshot. A later attempt is added to history without replacing the first. A record whose old week-based ID no longer matches the day's order remains visible with its saved snapshot. Week 4 Saturday is a 30-minute easy walk, followed by preparation for Monday's attempt while the trial is pending. After Week 4, Mondays and Thursdays are Gate Trial attempts; the other days repeat Week 4's orders. An attempt is a plan: the trial uses its dedicated result flow, so Today's Mission says Gate Trial today, names the next attempt in case today doesn't go, and links to the trial. Once the trial is passed, the order reads Gate Trial passed, names Chapter II's first day, and links to the record.

## Road — Campaign

Visual 9-chapter campaign map.

Current build: Chapters I and II. The current chapter's four full weeks are drawn as a route, with a Today mark and the chapter's trial at the end, on its first attempt day (the Monday after the chapter's last week). Chapter I's route begins on Day 1 and shows any short lead-in; Chapter II's begins on its first Monday and labels its weeks 5–8. Before Day 1 the route shows the start date. From the first attempt on, the Today mark rests on the trial. The trial section names the first attempt before it arrives, then the next attempt, and says the next chapter waits for a pass; once the trial is passed, it names the day and when the next chapter begins, and links to the record. Chapters III–IX join the map once their content is seeded.

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

### Progression in Forge

The rules live in `RANGERS_ROAD_PROGRAM.md` (Strength Progression). This section covers how they appear. Gold and the readiness colors are never used for these elements; they are plain text and numerals on paper.

**Current Set screen.** A **Last time** block replaces the old "Previous load" line, under the load box, so Quick Help, Pain and Substitute stay above the docked button on a 390 × 845 phone.

- Line 1: a spaced-caps label with the date, "LAST TIME · MON, NOV 9".
- Line 2: the sets of the last exposure in tabular serif figures, "95 × 6 · 95 × 6 · 95 × 6". The set the person is on is bold, so it answers what was done on this set. Timed work reads "25 lb · 40 s × 3 per side". The final effort follows when recorded.
- Line 3: one hint in plain sans. "May add 5 lb → 100 lb · all sets at 6, final effort 6" has a small up arrow; "Hold at 95 lb · Yellow today" has none and gives its one reason. After a planned deload it adds the context, "Week 4 was a deload; based on Week 3".
- First time on record: "First time on record". A step-up exercise adds "Last on Supported Split Squat: 20 lb × 8" and never says "add". If the prescription changed, the label names it, "Last time (Chapter I, 3 × 8)".
- No weight recorded: the hint uses reps or seconds and a quiet line says "Add the weight to track it."
- Exercises with no hint (push-ups, bodyweight, Restoration) show no Last time block.
- The load box stays empty and the person types the weight. There is no "use this weight" button.

**Final-set effort.** On each exercise's final set, effort is the first field in the Complete set confirmation: a 1–10 tap scale in two rows of five, like the walk log, with "easy", "2–3 reps left" and "nothing left" under 1, 7 and 10, and the line "Optional · decides next time's hint". On other sets effort stays the optional field it is today.

**After saving.** A "Compared with last time" list, per exercise: what went up first ("Box Squat 95 → 100 lb", "Suitcase Carry 40 → 45 s per side"), then one line counting what held ("4 held steady"), then anything lighter ("Lighter today (reduced)"). No red, no praise words, no scores.

**Exercise guide.** After "In the program", a "Your record" list: a summary line ("Since Day 1: 75 → 100 lb"), then the best working set of each session, newest first, with the date and chapter and a "deload" or "reduced" tag where it applies. It shows 8 rows, then "Show all". There is no chart. It is hidden until the exercise has a recorded session.

**Chapter trial page after a pass.** A "What changed this chapter" section: first against last full session for each exercise, grouped as Lifts, then Carries and holds, with unchanged exercises counted in one line. Keep's "trial passed" note links to it.

In Week 8 Forge B, show the same approximate 25% guide (around 17 of its 22 work sets, Hammer Curl included); Week 8 Forge A shows no reduction and no load increase. In Week 4 Forge B, show the documented approximate 25% deload as an around-15-of-20-work-set guide. The person chooses which roughly five sets to skip, and the active and finish screens show the number actually completed and skipped. Keep the base prescription and actual set marks in the saved snapshot; this guidance does not silently remove exercises or auto-progress load.

After Chapter I is acknowledged complete, Forge stops offering the repeated Week 4 choices. A saved draft still opens so partial work can be ended and kept in history.

Pain can be recorded from the active workout using body area, a 0–10 level, and the documented response. It saves immediately. Pain at 5 or more ends strength work; stopping keeps partial sets and pain in history. On Red readiness, Forge A/B cannot run; Restoration remains available if appropriate. A saved workout remains separate from Today's Mission outcome, which the user records from the mission screen.

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

The check-in screen opens on The last 28 days: average sleep and back, shoulder, and neck pain from the readiness checks, read-only. Below it come Body (weight, waist, resting heart rate, optional blood pressure), Tests (push-ups, pull-up assistance, squat depth, toe reach), and How you feel (energy and capability, 1–5), with Save docked above the tabs on phones. On a Red readiness day the Tests part says the tests wait for another day. Before Day 1 there is no check-in to take; the first one is titled Day 1 check-in.

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
- optional photo
- permanent campaign history

The Gate Trial preparation screen uses the Station composition to show the five documented parts, readiness guidance, and the full circuit. The trial opens only on an attempt day before it is passed; on other days the screen names the next attempt, or the day it was passed. On an attempt day, a same-day Green check opens the active trial, and a Yellow or Red check names the next attempt. Passing means a completed result: every part finished as written on a Green day. The active screen saves a resumable local draft through Road, Gate Circuit, Mind, Spirit, and Oath. It records actual results for each of the six circuit stations in each of three rounds, keeps exercise help and generated movement media on the circuit screen, and saves pain immediately. Stop trial asks once before it ends the attempt; stopping retains a partial attempt and its pain notes in history. A review precedes the completed result, which remains in local campaign history. If a later readiness check is Yellow or Red, or pain or a reduced response changes the attempt, the full trial waits for another Green day.

Save a completed trial without forcing an early post-mission function answer. A separate recovery check opens 60 minutes after the circuit ends and suggests answering within 120 minutes. Completion, the Keep reminder, and recorded trial history link to it; the Keep reminder lasts 12 hours. The check captures one plain-language answer for energy, soreness, irritability, helping at home, and family life, plus an optional note. It is saved once as a linked local record without changing the completed trial. An older result without a circuit-end timestamp uses its final save time for the delay.

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

`/road/three-mile-trial` shows the plan, today's status and recorded attempts; `/road/three-mile-trial/active` records it in five parts, saving as it goes, with the same Green check, pain notes, stop-and-keep, and review-then-save as the Gate Trial. It opens only on its attempt days (the Monday after Week 8, then Mondays and Thursdays until passed). Recording choices settled in the build, each from "finishing every part as written":

- Walk: a "full 3 continuous miles" confirmation, time, effort 1–10, knee and back discomfort, recovery after 5 minutes; splits (text) and average heart rate are optional. A walk timer is offered.
- Carry: weight (prefilled 30 lb; at least 30 lb to pass), seconds in each hand (at least 60 each), and grip, core and posture difficulty as plain words: Easy, Moderate, Hard. The Suitcase Carry's Quick Help and pictures open from this part.
- Stairs: a "three flights at a steady pace" confirmation and breathlessness 1–10. If the stairs are not appropriate that day, the attempt is stopped and kept, not passed.
- Leadership reflection: both prompts answered. Prayer: a confirmation that Psalm 121 was read and the family prayed for.
- Pain notes can be recorded during the walk, carry and stairs. The end of the stair test is saved as the end of physical effort, for the recovery check.
- The recovery check works as it does for the Gate Trial: it opens 60 minutes after the stair test ends (`/road/three-mile-trial/recovery/:resultId`), and the Keep reminder, which looks across every chapter's trial, links to the right one for 12 hours. The saved check and any pain notes appear in the trial's recorded attempts.
