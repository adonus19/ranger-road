# AGENTS.md — The Ranger's Road

## Purpose

This repository implements The Ranger's Road, a mobile-first Angular PWA for a structured 9-month personal training and formation campaign.

## Mandatory Rules

- Read all relevant files in `/docs` before changing behavior.
- Treat `docs/RANGERS_ROAD_PROGRAM.md` and `docs/CHAPTERS_AND_TRIALS.md` as authoritative for program logic.
- Do not invent new exercises, progression rules, faith scoring, ranks, or trials without updating the source-of-truth docs first.
- Do not convert faith or family leadership into arbitrary numerical XP.
- Do not turn the project into a generic gym tracker.
- Preserve offline-first behavior.
- Preserve historical workout, measurement, pain, and journal data through migrations.
- Prefer low-friction mobile UX.
- Exercise help must be available from the active workout screen.
- Every named exercise must support instructional text and generated image-sequence assets.
- Respect pain/readiness rules. Never auto-increase load after a pain-triggered or reduced session.
- Do not introduce heavy deadlifting into the default program.
- Do not introduce running in early chapters.
- Ruck load must progress conservatively.
- Do not add shame-based streak mechanics.
- Use clear accessible language and large touch targets.

## Tech Direction

- Angular latest stable
- Standalone components
- TypeScript strict mode
- PWA
- Mobile-first
- Local-first persistence
- Service worker
- IndexedDB preferred for structured offline data
- Cloud sync may be added later but is not required for MVP
- Keep content data-driven rather than hard-coded into components

## Before Completing A Significant Change

- Run tests.
- Run build.
- Confirm no history/migration regression.
- Confirm mobile layout.
- Confirm offline behavior where relevant.
- Update docs when product behavior changes.
