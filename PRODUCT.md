# Product

<!-- impeccable:product-schema 1 -->

This file records confirmed product facts for the Impeccable design workflow. The program rules in `docs/RANGERS_ROAD_PROGRAM.md` and `docs/CHAPTERS_AND_TRIALS.md`, along with the other files in `docs/`, remain the source of truth for implementation.

## Platform

web

## Users

The first release serves the primary user described in `docs/PRODUCT_VISION.md`: a 44-year-old husband and father who wants greater physical capability, energy, practical skill, and consistency in faith and family leadership. He is returning to training, has recurring lower-back pain and occasional shoulder or neck pain, and needs a low-friction daily plan. Future users may be supported, but the first experience is optimized for one person.

## Product Purpose

The Ranger's Road guides a nine-month campaign across training, reflection, faith, leadership, and fieldcraft. A useful day starts with a clear mission, adapts to readiness and pain, and leaves a record the user can return to. Success is greater real-life capability and follow-through, measured through practical milestones and reflection.

## Positioning

The product connects a finite, chapter-based program and monthly trials to a private daily mission board. Physical progress can be measured; faith and family leadership are recorded through practices and reflection without numerical scores.

## Operating Context

The app is used on a phone before training, during sessions, and during short morning and evening watches. It must work offline and preserve the user's local history. The five main destinations are Keep, Road, Forge, Journal, and Field Manual. The primary home action is “Begin Today's Mission.”

## Capabilities and Constraints

- Angular PWA with standalone components, strict TypeScript, routing, a service worker, and local IndexedDB persistence.
- Readiness and pain can reduce or redirect training. A pain-triggered or reduced session must never cause an automatic load increase.
- Program content stays data driven. The authoritative program docs control exercises, progression, chapters, and trials.
- Historical workouts, measurements, pain events, and journal entries must survive migrations.
- The app is solo first. Cloud sync, accounts, and social features are outside the current scope.
- The [full program content pack](docs/rangers-road-full-program-content/PROGRAM_INDEX.md) specifies Chapter I Forge A/B, daily walking doses, and the Gate Trial circuit. The app must use those prescriptions without inventing alternatives.

## Brand Commitments

The name is The Ranger's Road. The voice is grounded, capable, restrained, Christian without pressure, and challenging without shame. The experience should evoke a personal field journal and mission board. `docs/DESIGN_SYSTEM.md` records the binding visual direction and constraints.

## Evidence on Hand

- `docs/PRODUCT_VISION.md`, `docs/UX_SPEC.md`, `docs/DESIGN_SYSTEM.md`, and the program docs contain the product brief and content boundaries.
- `src/app/core/program/chapter-one.seed.ts` and the Chapter I daily, workout, and trial seed modules hold the documented program structure and prescriptions.
- The Angular shell, Keep dashboard, readiness flow, dated Chapter I missions, and Forge session player are the current working UI.
- Chapter I workout prescriptions and exercise instruction text are supplied in `docs/rangers-road-full-program-content/`. Optimized exercise sequences and neck-down muscle maps live in `public/images/exercises/`; PNG masters and generation prompts live in `assets-source/exercises/`.

## Product Principles

1. Build useful capability through a finite campaign with clear daily actions.
2. Favor consistency and safe adaptation over heroic single sessions.
3. Keep daily use quick, private, and available offline.
4. Use real milestones and reflection; avoid arbitrary scores for formation.
5. Preserve the person's history as the program evolves.

## Accessibility & Inclusion

Use clear language, readable type, and large touch targets. Readiness and pain guidance must remain understandable without relying on color alone.
