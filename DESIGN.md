---
name: The Ranger's Road
description: A private nine-month training campaign on a phone, set as a mission board under a painted dawn forest.
colors:
  forest-band: "#172b21"
  deep-forest: "#18241d"
  pine: "#24362b"
  hearth-gold: "#b68a4a"
  gold-line: "#a9804a"
  gold-on-band: "#d6b37a"
  gold-ink: "#9c7442"
  cream-on-band: "#f4f1e8"
  mist-on-band: "#c3c9c1"
  paper: "#f6f3ea"
  parchment-tint: "#e9e5d8"
  medallion: "#e2dbcb"
  rule: "#d4d1c7"
  rule-soft: "#dcd8ce"
  ink: "#171a17"
  ink-secondary: "#4f514d"
  ink-tertiary: "#666864"
  sage-label: "#53655c"
  nav-gray: "#676964"
  ember: "#8c5137"
  status-green-surface: "#e1e7da"
  status-green-text: "#2c4633"
  status-yellow-surface: "#f0e5cc"
  status-yellow-text: "#5b3f17"
  status-red-surface: "#f1ddd5"
  status-red-text: "#692d21"
typography:
  display:
    fontFamily: "Wittgenstein, 'Iowan Old Style', Georgia, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Wittgenstein, 'Iowan Old Style', Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Wittgenstein, 'Iowan Old Style', Georgia, serif"
    fontSize: "1.3125rem"
    fontWeight: 700
    lineHeight: 1.15
  page-title:
    fontFamily: "Wittgenstein, 'Iowan Old Style', Georgia, serif"
    fontSize: "2.4375rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  numeral:
    fontFamily: "Wittgenstein, 'Iowan Old Style', Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "'lnum' 1, 'tnum' 1"
  numeral-entry:
    fontFamily: "Wittgenstein, 'Iowan Old Style', Georgia, serif"
    fontSize: "1.9375rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "'lnum' 1, 'tnum' 1"
  body:
    fontFamily: "'Noto Sans', -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'wdth' 87.5"
  label:
    fontFamily: "'Noto Sans', -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  sm: "6px"
  md: "10px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  touch: "48px"
components:
  button-primary:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.cream-on-band}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.deep-forest}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
    height: "48px"
  readiness-strip:
    backgroundColor: "{colors.parchment-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 9px 10px 12px"
  order-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "19px 20px 16px 14px"
  medallion:
    backgroundColor: "{colors.medallion}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.full}"
    size: "54px"
  scale-option:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "48px"
  scale-option-selected:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.cream-on-band}"
  scale-option-form:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "46px"
  segmented-option:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    height: "37px"
  segmented-option-selected:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.cream-on-band}"
  nav-tab:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.nav-gray}"
    typography: "{typography.label}"
    height: "76px"
  nav-tab-active:
    textColor: "{colors.pine}"
---

# Design System: The Ranger's Road

## Overview

**Creative North Star: "The Dawn Mission Board"**

Every day starts under a forest at first light. A dark band painted with mist, ridgelines, pines and a low sun holds everything about the chapter: its name, its theme, the campaign day and the days left to the trial. Below it the page turns to warm paper, and the day's work is set out as a plain board of orders. Readiness comes first, because it decides what the day can hold. Then come the main order, the two watches and the Hearth mission.

The system is quiet and legible. The forest painting is the only decorative picture; exercise guides use instructional movement sequences and neck-down muscle maps. Gold is the only accent, used sparingly. Type does the rest: a sturdy book serif names chapters, headings and numbers, and a narrow humanist sans carries everything a person reads or taps. Surfaces are flat. Hierarchy comes from the dark-to-paper step, hairline borders and type weight, never from shadows. The app is used on a phone before training and in low light at the watches, so touch targets stay large and the dark variant follows the phone.

The world was chosen as "Forest Light". The Road page borrows the "Night Atlas" route line: a winding trail with a gold Today mark and a ring for the trial.

**Key Characteristics:**

- One painted forest band per screen that has one, with its text set directly on it.
- Warm paper ground with 1px borders and small radii.
- Gold as a single accent: the pine mark, the theme line, the main order's top edge, the selected tab.
- Wittgenstein for names and numbers; Noto Sans at a semi-condensed width for UI.
- Readiness named in words, with color only repeating it.

## Colors

A night-green band over warm paper, with one restrained gold and a status set reserved for readiness.

### Primary

- **Pine** (#24362b): the action color. Begin Today's Mission, Set Day 1, Save readiness check, and the selected tap-scale option. Also the active tab's text and icon.
- **Night Forest Band** (#172b21): the painted band's ground and fallback, the header bar on pages without a scene, and the Road chart. It stays the same in the dark theme.

### Secondary

- **Hearth Gold** (#b68a4a): the documented chapter-and-trial accent. In the dark theme it becomes the action color.
- **Gold Line** (#a9804a): thin gold rules on paper, such as the main order's top edge and the active tab's underline.
- **Gold on the Band** (#d6b37a): the pine mark, the theme line, the Today mark, the trial ring and the route labels, on the dark band only.
- **Gold Ink** (#9c7442): gold pictograms on paper (the readiness heart, sunrise, hearth), darkened for contrast.

### Tertiary

- **Ember** (#8c5137): focus rings on paper. The documented warning color.
- **Status set**: green (#e1e7da with #2c4633), yellow (#f0e5cc with #5b3f17), red (#f1ddd5 with #692d21). Used only for readiness states, always beside the words "Green · Ready", "Yellow · Reduce" or "Red · Restore".

### Neutral

- **Paper** (#f6f3ea): the page, cards, tiles and nav.
- **Parchment Tint** (#e9e5d8): the readiness strip and neutral notices.
- **Medallion** (#e2dbcb): round icon grounds on paper; #d9d1c0 when the medallion sits on the parchment tint.
- **Rule** (#d4d1c7) and **Soft Rule** (#dcd8ce): card borders, and dividers between rows and sections.
- **Ink** (#171a17), **Secondary Ink** (#4f514d), **Tertiary Ink** (#666864): headings and body, help text, and quieter guidance.
- **Sage Label** (#53655c): the small spaced-caps labels.
- **Cream and Mist on the Band** (#f4f1e8, #c3c9c1): primary and secondary text on the dark band.

The dark theme swaps the paper for night green (#111b15). Surfaces use #1a2820, lines #2f3e35 and text #e8e2d3. Actions turn Hearth Gold with Ink text. The full dark set lives in `src/styles.css` and in the sidecar.

### Named Rules

**The One Gold Rule.** Gold marks identity and progress only: the pine mark, the chapter theme, the main order's top edge, the selected tab, and the route's Today mark and trial ring. It never fills a card or a paragraph.

**The Words First Rule.** A readiness state is always named in words. The tint only repeats what the words say, so the state reads correctly without color.

## Typography

**Display Font:** Wittgenstein (with Iowan Old Style, Georgia)
**Body Font:** Noto Sans at 87.5% width (with the system sans)

**Character:** A sturdy, bracketed book serif gives chapters and numbers some weight and age. A narrow humanist sans keeps labels, help text and controls compact and easy to read on a phone. Both are self-hosted as Latin variable fonts, so the app looks the same offline.

### Hierarchy

- **Display** (700, 2rem, 1; 3rem at 700px and up): the chapter name on the band.
- **Page title** (700, 2.4375rem, 1.05; 3rem at 700px and up): the title of a screen opened from a tab, such as "Log a walk".
- **Headline** (700, 1.75rem, 1.1): section headings such as "Today's Orders", "The Gate Trial" and "When is Day 1?".
- **Title** (700, 1.3125rem, 1.15): the main order. Watch titles use 1.14rem, and the readiness status uses 1.375rem.
- **Numeral** (500, 1.875rem, 1; 2.5rem at 700px and up): the campaign day and the trial countdown, with lining, tabular figures.
- **Entered numeral** (600, 1.9375rem, 1): numbers a person types into a field, such as miles and minutes, with lining, tabular figures.
- **Body** (400, 1rem, 1.5, 87.5% width): prose and help text. Help lines run 0.8 to 0.86rem.
- **Label** (600, 0.625 to 0.6875rem, 0.14em tracking, uppercase, full width): field names, scale names, route labels, and the four Keep labels.
- **Wordmark** (600, 1.35rem): "The Ranger’s Road", with a typographic apostrophe.

### Named Rules

**The Serif Names, Sans Works Rule.** Wittgenstein is for names, headings and numbers. Anything a person reads as instructions or taps is set in Noto Sans.

## Layout

The design is mobile first at 390px. The page gutter is 16px, and every control has a tap area at least 48px tall. Form screens may draw a segmented choice at 37px or a tap-scale button at 46px, as long as its radio still reaches 48px. On Keep, the band is about 218px plus the safe-area inset. Below it the body stacks readiness, Today's Orders (a full-width main-order card, then two watch tiles side by side with an 8px gap), and the Hearth row between hairlines. Begin Today's Mission docks above the tab bar on phones.

- **Below 700px:** a five-tab bar is fixed at the bottom (76px), and the mission button is fixed above it.
- **700px and up:** content centers in a 40rem column, and the band's content aligns to the page container while the scene stays edge to edge.
- **900px and up:** Keep splits into two columns. Orders take the wider left column; readiness, the mission button and the Hearth row sit on the right.
- **1024px and up:** the tabs move into the brand row at the top, over the scene where there is one. Tablets keep the bottom bar.

Pages that open on a band (Keep and Road) let the brand row float over the scene instead of sitting on its own bar. Spacing stays tight inside a group (4 to 8px) and wider between groups (12 to 24px), with more room above a heading than below it.

## Elevation & Depth

The system is flat. Depth comes from the step between the dark band and the paper, from 1px borders, and from tinted surfaces. Nothing on paper casts a shadow. The only exception is the route's Today mark, which gets a two-ring halo in the band color so it separates from the trail.

### Named Rules

**The Flat Paper Rule.** Surfaces on paper use a border or a tint to separate, never a shadow.

## Shapes

Corners are small and consistent. Cards, strips, buttons, inputs and scale options use 6px, and larger result panels use 10px. Icon grounds are circles. The main order's card carries a 2px gold top edge that follows its rounded corners. Rules are 1px. Icons are one authored 24px set with a 1.75 stroke; filled shapes are reserved for the pictograms that need mass (footprints, moon, hearth, anvil).

## Components

### Buttons

- **Shape:** gently rounded (6px), at least 48px tall.
- **Primary:** Pine with cream text, 16px medium-bold label, optional arrow icon. It darkens to Deep Forest on hover. In the dark theme it is Hearth Gold with Ink text.
- **Secondary:** paper with a 1px Rule border and Ink text. The border darkens to Stone on hover.
- **Focus:** a 3px Ember outline, offset 3px. On the band the outline switches to gold.

### Readiness Strip

The first thing below the band. A parchment-tinted strip holds a round medallion with a gold heart-pulse line, a serif status line, one help line, and a chevron. The whole strip is a link to the readiness check. Its tint switches to the status set for green, yellow and red, and the status words always say the state.

### Cards / Containers

- **Main order card:** paper with a 1px Rule border, a 2px gold top edge and a 6px radius. A 64px medallion sits beside the label, the serif title and the guidance line.
- **Watch tiles:** two half-width tiles with the same border and radius, each with a 52px medallion, a label and a serif title.
- **Hearth row:** not a card. It sits between two soft rules, with a gold hearth icon, a short vertical divider, a label and the mission text. It opens the week's leadership lesson, so it ends in a chevron like the check-in row.

### Reminder Rows

Quiet rows under the Hearth row, between soft rules, in the same form: gold icon, short vertical divider, serif title, one help line and a chevron. The check-in row uses a tape measure; the Sunday backup row uses the tray-and-arrow icon and opens Journal. The backup row has a plain "Not today" text link on its own line (48px tap area) that hides it until tomorrow. Neither row counts or names missed weeks.

### Last Time and Progression Hint
On the Current Set screen, under the load box: a spaced-caps label with the date, the last exposure's sets in Entered-numeral type with the current set in bold, and one plain-sans hint line. A small up arrow marks "may add"; "hold" has none and gives one reason. It uses Ink, Secondary Ink and Tertiary Ink only: no gold and no status colors, because the readiness set is reserved for readiness (The Words First Rule) and gold for identity. It takes about three lines so Quick Help, Pain and Substitute stay above the docked button. The same figures reappear in "Compared with last time" after saving, in a guide's "Your record" list, and in a trial page's chapter summary, always as plain rows between soft rules.

### Inputs / Fields

- **Text and date fields:** paper background, 1px Rule border, 6px radius, 48px tall, 16px text. The border darkens to Stone on hover.
- **Tap scales:** a row of equal buttons, one per value (1 to 5 for energy, 0 to 10 for pain in two rows of six on phones). Each is a real radio button. Selected: filled Pine with cream numerals. Values are set in the serif. Readiness draws them 48px tall. Form screens from the Road log on draw them 46px tall (effort 1 to 10 in two rows of five), with each radio's tap area extended to 48px.
- **Final-set effort:** the same tap scale as the walk log (1 to 10, two rows of five, 46px, tap area 48px), with "easy", "2–3 reps left" and "nothing left" in label type under 1, 7 and 10.
- **Segmented choices:** a row of equal bordered buttons for one short choice, such as Today, Yesterday or Pick a date. Each is a real radio button drawn 37px tall with its tap area extended to 48px. Unselected labels are Secondary Ink at 15px; the selected one fills Pine with cream text.
- **Number fields:** miles and minutes are typed into 48px fields and set in the serif as Entered numerals.
- **Errors:** a short line in the red status text, naming the problem and the fix. The field gains a red border, `aria-invalid` and a link to its error, and a failed save focuses the first field that needs attention.

### Navigation

Five tabs: Keep, Road, Forge, Journal and Field Manual. Each is a 26px outline icon over a small label, in gray. The selected tab turns Pine, fills its icon where the shape is closed, and gains a 42px gold underline. On large screens the tabs sit in the brand row, in mist and cream on the band.

### Field Manual

The Field Manual opens on **This week**. A three-view switch beneath the page title opens **Contents** and **Index** without leaving the manual. This week lists the current lesson, fieldcraft card or practice, reading, today's Scripture reference and exercise guides when those entries are scheduled. Each row has one gold pictogram in a medallion, a serif name, one plain-language detail line and a link. Fewer scheduled entries mean fewer rows; there are no filler cards or completion marks.

Contents follows Chapter I in program order, using serif entry names, dotted leaders and right-aligned week labels. The entries for the active week have a small pine tag. At narrow phone widths the note wraps below the title. Index is an A to Z list with search and topic filters; its letter rail is a pointer scrubber and keyboard slider, while the same entries remain available through search and normal scrolling. On a phone, the three-view switch stays above the content, and every link or filter has at least a 48px tap area.

Before Day 1, the manual names the first week **Week ahead**. After the Gate Trial passes, Chapter I's reference pages remain available. Detail pages share a back link, serif title, one subline, hairline sections and comfortable prose measure. Route changes move focus to the new view's heading (the Index lands on its heading, not the search field, so a phone keyboard never opens by itself), and fragment links focus their destination without changing scroll position. These reading positions draw no focus ring; controls keep theirs. Keep's Hearth row, Monday Morning Watch and the relevant Mission orders link directly to the lesson, reading plan or fieldcraft card. Pictograms follow the entry: hearth for leadership, hatchet for tool cards, a rope loop for knot cards, open book for reading, sunrise for Scripture, anvil for exercises. Exercise guides retain their sequence and muscle-map images. Approved knot illustrations show one panel per written step, two per row at every screen width (2×2 for four steps, 2×3 for six); each knot's crossings must be checked before its image is added.

On phones narrower than 360px, the tab labels drop to 10px so Field Manual still fits its column.

### Forest Band (signature)

The painted dawn forest (`public/images/forest-band.webp`) fills the top of Keep edge to edge. Text sits directly on it: the chapter line, the chapter name, the gold theme line, the day and trial counts between thin mist hairlines, and the planning-target note. On wide screens a low fade keeps small text legible over the treeline.

### Route Chart (signature)

Road draws Chapter I as a winding trail on the darkened painted forest. Thin ticks mark where each week begins, with week labels centered under their stretch. The road already walked is a solid cream line and the road ahead is dashed. A gold dot marks today and a gold ring marks the Gate Trial. Labels sit just above their marks. Near the end the trial label steps up a line so the two never meet, and once today reaches the ring they merge into one label. The walked line draws in once on load, left to right, unless the phone asks for reduced motion.

## Do's and Don'ts

### Do:

- **Do** give every control a tap area at least 48px tall (the `--touch-target` token). A control may draw smaller only when its tap area still reaches 48px.
- **Do** name each readiness state in words and let its tint repeat it.
- **Do** keep gold to the places listed in The One Gold Rule.
- **Do** separate surfaces on paper with 1px rules or tints, not shadows.
- **Do** use the self-hosted Wittgenstein and Noto Sans, and set UI text at the 87.5% width.
- **Do** let a page's brand row float over its scene when the page opens on a painted band.
- **Do** write labels, errors and buttons in the product's plain voice, naming the action or the fix.

### Don't:

- **Don't** add small uppercase label lines above headings on new surfaces. Keep's four ("Chapter I · Weeks 1–4", "Main order", "Daily watch", "Hearth mission") are an exception the user approved for that screen, not a pattern to repeat.
- **Don't** put drop shadows on paper surfaces, and don't use glows, gradient text, neon or game-style HUD details.
- **Don't** add fake parchment texture, medieval ornament, or decorative pictures beyond the forest painting. Exercise sequence and muscle-map images serve instruction in the Forge and Field Manual.
- **Don't** show points, scores, streaks or XP for faith, family or training.
- **Don't** use red for anything but pain and safety states.
- **Don't** add chevrons to rows that don't open anything yet.
