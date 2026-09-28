# Codex Kickoff Prompt

Paste the following into Codex after placing this repository bundle in the project.

---

You are implementing The Ranger's Road.

Before writing code, read:
- `README.md`
- `AGENTS.md`
- every file in `/docs`

The documentation is the source of truth.

Your first task is **Phase 0 + the foundation of Phase 1 only**.

Requirements:

1. Inspect the existing repository before modifying anything.
2. If no Angular app exists, scaffold using the latest stable Angular release with:
   - standalone components
   - strict TypeScript
   - routing
   - PWA/service worker
3. Build a mobile-first application shell.
4. Implement design tokens from `docs/DESIGN_SYSTEM.md`.
5. Implement a local-first persistence layer using IndexedDB with explicit schema versioning.
6. Create TypeScript domain models based on `docs/DATA_MODEL.md`.
7. Build seed-data support so program content is data-driven.
8. Implement routes/placeholders for:
   - Keep
   - Road
   - Forge
   - Journal
   - Field Manual
9. Implement the Chapter I campaign seed structure, but do not invent content beyond the docs.
10. Implement a basic readiness-check flow and persist it locally.
11. Implement the Keep dashboard showing:
    - Chapter I: The Muster
    - campaign day
    - days until Gate Trial
    - Today's Orders
    - readiness state
    - Begin Today's Mission CTA
12. Add tests for core domain and persistence behavior.
13. Run build and tests before finishing.
14. Update docs only if implementation requires a documented clarification.

Do not implement cloud sync, authentication, social features, or Chapters II–IX UI yet.

At the end, report:
- what you built
- file structure
- important architectural decisions
- tests run
- build status
- next recommended Phase 1 task
