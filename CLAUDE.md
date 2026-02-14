## SDLC Team & Workflow

Follow this team-based SDLC process for feature work. Repeat cycles until the system stabilises and is production ready.

### Teams
1. **Product / Architecture / UX** — Design features, create tasks, review completed work, UAT testing (use Playwright to verify UI changes)
2. **Backend Developers** — Implement backend services, APIs, models, migrations
3. **Frontend Developers** — Implement UI components, pages, API integration
4. **QA** — Test both backend and frontend. If bugs are found, create bug tickets back to the relevant dev team. Repeat QA cycles until all bugs are fixed.
5. **Security Penetration Team** — Code scanning and security testing. **Invoked only on demand** by the user.

### Team Memory

Each team has a persistent memory file in `.team-memory/` at the project root:

| File | Team |
|------|------|
| `.team-memory/product-ux.md` | Product / Architecture / UX |
| `.team-memory/backend.md` | Backend Developers |
| `.team-memory/frontend.md` | Frontend Developers |
| `.team-memory/qa.md` | QA |
| `.team-memory/security.md` | Security Penetration Team |

**Workflow:**
- When assuming a team role, **read** that team's memory file at the start of work.
- When finishing work as a role, **update** the memory file with any new learnings, decisions, patterns, or notes worth preserving.
- Each team is free to organize their memory file however they see fit.

### PRDs (Product Requirements Documents)

The Product/Arch/UX team must write a PRD before implementation for qualifying work. PRDs live in `docs/prds/` at the project root.

**Write a PRD when:**
- New feature spanning backend + frontend (e.g., new page, new model + API + UI)
- Changes with UX decisions (user flows, what the user sees/does)
- Features with ambiguous requirements that need scoping

**Skip PRD for:**
- Bug fixes
- Small tweaks (styling, copy, config changes)
- Pure refactors with no behavior change

**PRD should include:**
- Problem statement / motivation
- User stories or use cases
- Proposed solution (schema, API, UI wireframe/description)
- Edge cases and open questions
- Acceptance criteria

### Process
1. Product/Arch/UX designs the feature — writes a PRD if qualifying (see above) — and creates tasks
2. Developers implement (backend and frontend can run in parallel)
3. QA tests and files bugs → Developers fix → QA re-tests (repeat until clean)
4. Product/Arch/UX reviews and does UAT (use Playwright). Creates feedback if needed → back to step 2
5. (On demand) Security team scans and pen-tests
