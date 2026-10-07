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

Current build: Chapter I only. Its four full weeks are drawn as a route after any short lead-in, with a Today mark and the Gate Trial at the end, on the first attempt day (the Monday after Week 4). Before Day 1 the route shows the start date. From the first attempt on, the Today mark rests on the trial. The Gate Trial section names the first attempt before it arrives, then the next attempt, and says Chapter II waits for a pass; once the trial is passed, it names the day and when Chapter II begins, and links to the record. Chapters II–IX join the map once their content is seeded.

An older campaign may keep a separately chosen Gate Trial target date; attempts still follow the Monday and Thursday rule.

While the Gate Trial is pending after Week 4, the days between attempts repeat Week 4's weekday orders. Pending attempts do not start Chapter II or add a progression step.

From Chapter II's first day, Road labels Chapter I complete and links to the saved trial record. This derived acknowledgment does not change past records.

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

The Chapter I Forge opens the workout named in today's order. Restoration is also available as needed after a same-day readiness check. An in-progress session resumes at the saved exercise and set, with its prescription snapshot intact. The warm-up is shown before the work sets; the documented easy finish is required for Restoration and optional for Forge A. The Current Set screen keeps the dose, planned load, Quick Help, Pain, and Substitute visible together; Complete set opens a short confirmation of actual reps or seconds and optional effort before saving. Exact numeric targets may fill that confirmation for review, while ranges remain blank. Each work set is marked done or skipped before a completed session is saved. Skipped sets and described substitutions mark the session reduced. The rest timer shows elapsed time because Chapter I gives no fixed rest interval. Previous load is display-only; the app never fills in or increases the next load automatically.

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

The Field Manual opens on **This week**, a short list of the current leadership lesson, fieldcraft practice when scheduled, reading blocks, today's Scripture reference, and exercise guides. A three-way switch also opens **Contents** (the Chapter I sections in program order) and **Index** (A to Z search with topic filters and a keyboard-operable letter rail). Before Day 1, the first week is labeled Week ahead. After a passed Gate Trial, the manual retains Chapter I references while Chapter II pages await implementation. Scripture stays as references; the app does not reproduce Bible text. Exercise guides list the standard doses and show the current week's Forge adjustment beside the relevant session; the active Forge screen remains the place to follow readiness changes and record work.

Monday Morning Watch links to the week's lesson, including Day 1 when a lead-in starts midweek. Keep's Hearth mission links to that lesson. Today's Mission links reading days to the reading plan and the Week 2 tool or Week 3 knot practice choices to their cards. The reading plan calls _Habits of the Household_ the Chapter I book; it does not claim to know which book the person is currently reading.

Content includes the twelve leadership principles, four Chapter I lessons, reading plan, Scripture references, tool and knot field cards, and full exercise guides. The approved text lives in [Field Manual Content](rangers-road-full-program-content/FIELD_MANUAL.md). Knot cards carry written steps and one picture per step, two per row, added only after they are checked against a tied knot (four steps for the square knot and bowline, six for two half hitches, where each hitch's tuck gets its own picture). Step pictures are prefetched for offline use like the exercise guides. Tool rows show a hatchet and knot rows a rope.

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

## Forge Make-ups (planned)

When a Forge session is missed, the next morning's Keep and Today's Mission show the moved session in place of that day's order, worded calmly ("Forge A moved to today"), with a full or reduced choice and a way to skip it. The displaced walk is marked optional, with the choice to do it alongside or in place of a leg exercise's sets. No counts of missed sessions are shown. The full rule is in `RANGERS_ROAD_PROGRAM.md`, Missed Forge Make-ups.

Light Activity (deload weeks and any day): a log with a required activity name and optional weight, sets, reps, distance and time.
