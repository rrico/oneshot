---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: architecture
lastStep: 8
status: complete
completedAt: '2026-04-02'
project_name: oneshot
user_name: Ryan
date: '2026-04-02'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

The PRD defines **30 FRs** covering: **playlist authoring** (search/add/remove/reorder/preview without accounts, FR1–FR6, FR30); **Heardle-style rounds** per track with a **fixed** six-stage clip schedule (**1s / 2s / 4s / 7s / 11s / 16s**), **autocomplete** selection (not free-text scoring), **skip** and **wrong guess** consuming attempts, **win/lose** resolution, and **playlist progression** (FR7–FR20); **shareable URL** encoding/decoding with **invalid/truncated** handling (FR21–FR24); **no app or music-service login** for core flows (FR25–FR26); **retry**, **clear errors**, and **continue without dead-ending** on bad playback (FR27–FR29). Architecturally this implies a **single-page client** with a **round state machine**, a **playlist model** serialized to URLs, and **catalog + audio** adapters.

**Non-Functional Requirements:**

**Performance:** First meaningful interaction within **5s** on mid-tier mobile (NFR-P1); **≤3s** to **audio, loading, or error** after user actions (NFR-P2). **Security/privacy:** **HTTPS** (NFR-S1); **Deezer-compliant** API usage (NFR-S2); no stored music passwords/tokens for the no-login flow (NFR-S3). **Hosting:** **Static** deployment for viral link sharing without an app server for gameplay (NFR-SC1). **Accessibility:** **WCAG 2.1 AA** on authoring, play, and autocomplete; state not by color alone (NFR-A1, NFR-A2). **Integration:** Stay within catalog **terms** and surface **user-visible** failures with **retry/skip** (NFR-I1, NFR-I2). **Reliability:** Invalid/short URLs → **documented error state**, no unhandled errors on QA paths (NFR-R1).

**Scale & Complexity:**

- **Primary domain:** Mobile **web SPA** (browser + touch), **client-only**.
- **Complexity level:** **Medium** — low product domain complexity, higher **integration** and **UX** surface (audio, URL, a11y-rich components).
- **Estimated architectural components (logical):** **Routing/entry** (root vs deep link); **playlist codec** (encode/decode/validate); **session/game state** (round + playlist index); **Deezer client** (search, metadata, previews); **audio engine** (clip timing, progress sync); **UI shell** (author vs play); **shared design-system layer** (tokens, primitives per UX).

### Technical Constraints & Dependencies

- **No backend** for accounts or gameplay in MVP; **static hosting**.
- **Deployment target (stakeholder):** **GitHub Pages** — fits static SPA delivery and **HTTPS**; implementation must account for **project/repository Pages URL** shape (e.g. `https://<user>.github.io/<repo>/`) via correct **`base` path** in the build, and **SPA deep links**: GitHub Pages has no server rewrite rules, so **history-based routing** requires a **known mitigation** (e.g. **`404.html` = `index.html`**, or **hash-based** routing) so shared game URLs reload correctly.
- **Deezer** (or successor) as **external catalog** — **rate limits**, **geo**, and **preview rules** are constraints; **CORS/API key** pattern must follow documented client usage.
- **Browser URL length** — playlists may need **compression**, **short IDs**, or **hash/fragment** strategies for long lists.
- **P0 browsers:** iOS Safari and Android Chrome (current −1) per PRD.
- **UX** prescribes **Tailwind-class tokens + headless/Radix-style primitives** (or acceptable alternative); custom **AttemptLadder**, **SnippetProgressBar**, **MissedGuessesList**, **GameShell**.

### Cross-Cutting Concerns Identified

- **Error handling UX** — uniform patterns for **bad URL**, **audio failure**, **catalog down** (retry, skip track, plain language).
- **Accessibility** — combobox, progress, lists, focus order, reduced motion.
- **URL as contract** — encode/decode/versioning so share links stay stable as the product evolves; **test** shared links under **GitHub Pages** base URL + **direct navigation** to deep paths.
- **Audio timing** — clip boundaries aligned to PRD schedule and sync to **snippet progress** UI.
- **Separation author vs play** — shared components but distinct **density** and **navigation** (per UX).

## Starter Template Evaluation

### Primary Technology Domain

**Mobile web SPA (client-only)** — static build output deployed to **GitHub Pages**, aligned with PRD and UX (Tailwind-friendly stack, accessible combobox and layout primitives, small mobile bundles).

### Starter Options Considered

- **Vite + React + TypeScript** (`npm create vite@latest` with `react-ts`) — default choice: fast dev/build, first-class static `dist`, ecosystem match for **Tailwind** and **shadcn/ui** (Radix), tree-shaking, widely documented **GitHub Pages** deployment patterns (**`base`**, **`404.html`** SPA fallback).
- **Next.js** — not selected for MVP: **static export** is possible but adds framework weight for a **no-SSR** product; PRD emphasizes **simple static** hosting.
- **SvelteKit / others** — viable; UX and team velocity assumptions here favor **React + Radix-class** stack already specified in the UX doc.

### Selected Starter: Vite (`react-ts` template)

**Rationale for Selection:**

- Matches **greenfield SPA** with **no server**; build artifact is plain static files for **GitHub Pages**.
- **Intermediate** skill level: standard **React** patterns, large reference surface for **Deezer** + audio in the browser.
- Clear path to **Tailwind** + **shadcn/ui** after scaffold (UX: tokens, combobox, focus/a11y).

**Initialization Command:**

```bash
npm create vite@latest oneshot -- --template react-ts
```

Follow with: `cd oneshot && npm install`, add **Tailwind CSS** per current Vite docs, then **shadcn/ui** init (or equivalent Radix + Tailwind wiring). Use a **Node** version matching current Vite requirements (e.g. **20.19+** or **22.12+** per upstream docs at install time).

**Architectural Decisions Provided by Starter:**

| Area | What the starter establishes |
|------|------------------------------|
| **Language & runtime** | **TypeScript** + **React** (client render); **ESM**-first Vite pipeline |
| **Styling** | None until added — plan **Tailwind** + design tokens (UX) |
| **Build tooling** | **Vite** dev server, HMR, production **Rollup** build to `dist/` |
| **Testing** | Not included by default — add **Vitest** + **Testing Library** when stories require |
| **Code organization** | `src/` entry, component-oriented structure (extend with `features/`, `components/ui/`, etc.) |
| **Development experience** | `npm run dev` / `npm run build` / `npm run preview` |

**GitHub Pages alignment:**

- Set `base` in `vite.config` to repository path (e.g. `/oneshot/`) for **project** Pages; pair **`BrowserRouter`** (or equivalent) **`basename`** if using **react-router**.
- Post-build: ensure **SPA fallback** (e.g. copy **`index.html`** to **`404.html`** in `dist`) so deep links and reloads work.
- Deploy **`dist`** via **`gh-pages`** branch, **`actions/upload-pages-artifact`**, or similar.

**Note:** Running the init command (and first Tailwind/shadcn setup) should be an early **implementation** task once epics/stories exist.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation if undefined):**

- **Playlist representation in the URL** — encoding, versioning, max length handling.
- **Deezer access pattern** — which endpoints, error handling, and how public credentials (if any) are loaded without shipping secrets.
- **Client routing + GitHub Pages** — `base` / `basename` + SPA fallback for reloads and shared links.
- **Game state model** — round machine (attempt index, clip stage, missed guesses) and playlist index.

**Important (shape the codebase):**

- **UI stack** — React + Tailwind + shadcn/Radix (from UX); custom game components on top.
- **Client state** — predictable updates for round + playlist (e.g. **Zustand** or **useReducer** + context); URL as source of truth for **playlist**, session state mostly in memory.
- **Validation** — **Zod** (or similar) for decoded URL payloads and external API responses at boundaries.

**Deferred (post-MVP):**

- **PWA** (PRD growth), **analytics**, **OG/meta** — not architecture blockers for MVP.

### Data Architecture

- **No server-side database** for MVP; no multi-user persisted state.
- **Playlist data** serialized in the **shareable URL** (and/or **fragment** if needed for length); **decode → validate → hydrate** on load.
- **Optional:** `sessionStorage` / `localStorage` only for non-critical UX (e.g. dismissed hints), not for source-of-truth gameplay.
- **In-memory** structures for current **round** and **playlist progress** during play.

### Authentication & Security

- **No application authentication** (PRD).
- **HTTPS** everywhere (GitHub Pages provides TLS).
- **No music-service tokens** stored for “no login” flows (NFR-S3).
- **Deezer:** use only **documented** public/client patterns; **no private API keys** in the repo — if the API requires an app identifier, use **build-time public env** (e.g. Vite `import.meta.env`) and confirm compliance with Deezer terms.
- **Threat model (lightweight):** treat URL payload as **untrusted input**; validate before use.

### API & Communication Patterns

- **Deezer** via **HTTPS** (`fetch`), no custom backend proxy for MVP unless CORS/terms force a minimal edge later (defer until proven).
- **Errors:** map network/catalog failures to **user-visible** states (retry, skip track) per FR27–FR29 and NFR-I2.
- **No internal REST/GraphQL** server for core play.

### Frontend Architecture

- **Framework:** **React** (from Vite starter); **TypeScript** strictness as adopted in repo.
- **Routing:** **React Router** (current **v7** line on npm — pin **latest stable** at install time) with **`basename`** aligned to GitHub Pages path; routes for **landing**, **author**, **play** (and error routes as needed).
- **State:** **UI + round state** in client stores/reducers; **playlist from URL** on entry and when sharing updates the link.
- **Styling / components:** **Tailwind** + **shadcn/ui** (Radix) per UX; custom **AttemptLadder**, **SnippetProgressBar**, **MissedGuessesList**, **GameShell**.
- **Performance:** code-split **author** vs **play** where it helps; lazy routes if the bundle grows; respect PRD timing NFRs.

### Infrastructure & Deployment

- **Hosting:** **GitHub Pages** (static `dist/`).
- **CI/CD:** **GitHub Actions** — on push to default branch: **Node** LTS, `npm ci`, `npm run build`, deploy artifact to Pages (or `gh-pages` branch); optional **PR** preview if added later.
- **Envs:** build-time only (Vite env vars); document required vars in README.
- **Monitoring:** none required for MVP per PRD; optional client error logging later.

### Decision Impact Analysis

**Implementation sequence (suggested):**

1. Vite React TS + Tailwind + shadcn + Router **`base`/`basename`** + **`404.html`** SPA workaround.
2. **Playlist codec** + validation + error UI for bad URLs.
3. **Deezer** client module + search + preview playback integration.
4. **Round state machine** + UI shell (attempt ladder, snippet bar, missed guesses, combobox).
5. **Author** flow + **share link** generation.
6. Hardening: a11y pass, mobile P0 browsers, error paths.

**Cross-component dependencies:**

- **URL codec** ↔ **router** ↔ **share** button output must stay aligned.
- **Audio timing** ↔ **SnippetProgressBar** ↔ **attempt index** must share one source of truth per round.
- **GitHub Pages `base`** must match **Vite `base`** and **Router `basename`**.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical conflict points (AI agents):** route vs file naming, URL/query param shapes vs playlist codec, Deezer response field naming vs app types, error object shapes, state update style, and where tests live.

### Naming Patterns

**Database naming:** N/A (no DB in MVP).

**API naming (Deezer-facing):** Keep **Deezer JSON field names** as returned by the API in **adapter**/`dto` types at the boundary; map to **camelCase** in **domain** types inside the app. Name adapter functions **`deezerSearchTracks`**, **`deezerFetchTrack`** (verb + resource), not generic `getData`.

**Routes (React Router):** Path segments **kebab-case** in user-visible URLs if multiple segments (e.g. `/play`, `/create`); **route IDs in code** as constants: `ROUTES = { home: '/', create: '/create', play: '/play' }` in one module.

**Code naming:**

- **React components:** `PascalCase` files matching export (`AttemptLadder.tsx` → `export function AttemptLadder`).
- **Hooks:** `use` prefix, camelCase (`useRoundState`).
- **Utilities:** camelCase functions (`encodePlaylist`, `parsePlaylistParam`).
- **Types/interfaces:** `PascalCase` for models (`Playlist`, `RoundState`); append `Schema` for Zod (`PlaylistSchema`).
- **Constants:** `UPPER_SNAKE` only for true constants (e.g. `CLIP_SCHEDULE_SECONDS` for the PRD clip ladder).

### Structure Patterns

**Project organization (feature-first):**

- `src/features/author/` — playlist build, share.
- `src/features/play/` — round loop, game shell.
- `src/features/landing/` — root landing.
- `src/components/ui/` — shadcn/Radix primitives only.
- `src/components/game/` — AttemptLadder, SnippetProgressBar, MissedGuessesList, GameShell.
- `src/lib/` — codec, env, Deezer client, small pure helpers.
- `src/routes/` or `src/app/` — route tables and layout wrappers.

**Tests:** Co-locate **`*.test.ts(x)`** next to source for units; **`src/test/`** for shared mocks (e.g. Deezer fixture responses, fake `Audio`).

**Assets:** `public/` for static; **no** large media in repo except favicon.

### Format Patterns

**Internal app data:** **camelCase** in TypeScript objects and JSON you own (playlist model in memory).

**URL playlist payload:** Document **one** encoding (e.g. compressed string in query or hash); version with a leading **`v`** or schema field inside decoded object; **Zod** parse on decode.

**Errors:** User-facing: structured type with **`title`**, optional **`body`**, optional **`recover`** (`'retry' | 'skip-track' | 'copy-link'`); never `throw` raw strings to the UI. Log technical detail only in dev or behind a flag.

### Communication Patterns

**Events:** Prefer **explicit callbacks** and **state setters** over a global event bus for MVP. If a bus is added later, prefix channel names: `game:round-resolved`.

**State management:** **Immutable** updates only (spread / Immer if introduced). One **round state** owner per session (store or context); **do not** duplicate attempt index in unrelated `useState` hooks without a single source of truth.

**Deezer fetch:** Centralize in **`src/lib/deezer/`**; route all `fetch` through a small wrapper that handles **base URL**, **typed errors**, and **429/5xx** outcomes for UI.

### Process Patterns

**Loading:** Name flags **`isLoadingSearch`**, **`isBufferingClip`** — boolean per concern; avoid one global `loading` for the whole app.

**Errors:** **Route-level** error boundary for unexpected crashes; **expected** failures (bad URL, track unavailable) as **rendered states** with recovery actions, not only toasts.

**Retries:** **Exponential backoff** only where network retry is appropriate; cap retries; always show **Skip** / **Cancel** when PRD requires.

### Enforcement Guidelines

**All AI agents MUST:**

- Import **Deezer** only through **`src/lib/deezer/**`**.
- Define **playlist encode/decode** in a **single agreed module** under **`src/lib/`** (e.g. `playlist-codec.ts`) — no ad-hoc `URLSearchParams` parsing in random components.
- Use **shared route constants** and **`basename`** from one config shared with Vite + Router.
- Keep **Vite `base`** and **Router `basename`** aligned with GitHub Pages deployment.

**Verification:** ESLint + TypeScript strict; PR review checks **codec** and **deezer** import paths.

### Pattern Examples

**Good:** `features/play/hooks/useRoundState.ts` owns attempt index; `SnippetProgressBar` receives `elapsedMs` and `clipDurationMs` from that hook.

**Anti-patterns:** Parsing the playlist in three components differently; calling Deezer from a leaf button; scattering `window.location` manipulation without the codec helper.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
oneshot/
├── README.md
├── package.json
├── package-lock.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── components.json              # shadcn/ui
├── eslint.config.js
├── .env.example
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml           # build + GitHub Pages (optional split: ci.yml)
├── public/
│   └── favicon.ico
├── dist/                        # gitignored — Vite build output for Pages
└── src/
    ├── main.tsx
    ├── vite-env.d.ts
    ├── app/
    │   ├── providers.tsx        # router, theme, optional query client
    │   └── routes.tsx           # route table; ROUTES constants
    ├── features/
    │   ├── landing/
    │   │   ├── LandingPage.tsx
    │   │   └── components/
    │   ├── author/
    │   │   ├── AuthorPage.tsx
    │   │   ├── components/
    │   │   └── hooks/
    │   └── play/
    │       ├── PlayPage.tsx
    │       ├── components/
    │       └── hooks/
    ├── components/
    │   ├── game/
    │   │   ├── GameShell.tsx
    │   │   ├── AttemptLadder.tsx
    │   │   ├── SnippetProgressBar.tsx
    │   │   └── MissedGuessesList.tsx
    │   └── ui/                  # shadcn-generated only
    ├── lib/
    │   ├── config.ts            # basename, base URL, feature flags
    │   ├── playlist-codec.ts    # encode/decode/validate playlist for URL
    │   ├── round-model.ts       # clip schedule, attempt transitions (pure)
    │   └── deezer/
    │       ├── client.ts        # fetch wrapper, errors
    │       ├── search.ts
    │       ├── track.ts
    │       └── types.ts         # boundary DTOs vs domain types
    ├── types/
    │   └── index.ts             # shared Playlist, RoundState, etc.
    └── test/
        ├── setup.ts
        └── fixtures/
            └── deezer.ts
```

Co-locate **`*.test.ts(x)`** beside modules as they are added (e.g. `src/lib/playlist-codec.test.ts`).

### Architectural Boundaries

**API boundaries**

- **External:** only **Deezer HTTPS** endpoints, accessed through **`src/lib/deezer/*`**. No other network origins for MVP catalog/audio.
- **Internal:** no backend API; the **playlist codec** is the only serialization contract for share links.

**Component boundaries**

- **`components/ui`:** generic primitives; **no** Deezer or round logic.
- **`components/game`:** game chrome; **no** direct `fetch`.
- **`features/*`:** pages and feature hooks; wire data into **`components/game`**.

**Service boundaries**

- **`lib/deezer`:** all HTTP; maps responses to app types.
- **`lib/playlist-codec`:** URL string ↔ playlist structure; **single** entry for query/hash playlist parsing in routes.

**Data boundaries**

- **No DB.** **Source of truth:** decoded URL + in-memory session state in **`features/play`**. **Optional** `sessionStorage` only for non-game UX (document in code when used).

### Requirements to Structure Mapping

| FR category (PRD) | Primary location |
|-------------------|------------------|
| Playlist authoring (FR1–FR6, FR30) | `src/features/author/` |
| Heardle rounds, guess, skip, progress (FR7–FR20) | `src/features/play/`, `components/game/`, `lib/round-model.ts` |
| Shareable URL (FR21–FR24) | `lib/playlist-codec.ts`, `app/routes.tsx`, author share UI |
| No login (FR25–FR26) | No auth modules |
| Resilience (FR27–FR29) | `lib/deezer/client.ts`, play error states |
| Landing / root | `features/landing/` |

**Cross-cutting:** A11y and focus — **`components/ui`** + **`components/game`**; tokens in **Tailwind** + global CSS.

### Integration Points

**Internal:** **Router** → **Play/Author** pages → **hooks** → **`round-model`** + **`playlist-codec`** + **`deezer`**. **Author** updates playlist → **codec** → share URL.

**External:** **Deezer** only via **`lib/deezer`**.

**Data flow:** **URL** → decode (**codec**) → **Playlist** → **play session** → per-track **RoundState** → **audio** + **UI**; **author** edits **Playlist** → encode → **URL** for share.

### File Organization Patterns

**Configuration:** Root **Vite/Tailwind/ESLint**; **`src/lib/config.ts`** for **`basename`** and public env; **`.env.example`** lists `VITE_*` only.

**Source:** **Feature folders** own pages and feature hooks; **shared game visuals** in **`components/game`**.

**Tests:** Co-located unit tests; **`src/test/fixtures`** for Deezer JSON mocks.

**Assets:** **`public/`** for static; **`dist/`** gitignored.

### Development Workflow Integration

**Dev:** `npm run dev` — align **`vite.config` `base`** with Pages when testing deep links.

**Build:** `npm run build` → `dist/`; post-step copy **`index.html`** → **`404.html`** in `dist` (npm script) for GitHub Pages SPA.

**Deploy:** **GitHub Actions** publishes **`dist`** to **Pages**; **`base`** matches repo name.

## Architecture Validation Results

### Coherence Validation

**Decision compatibility:** **Vite + React + TS + Tailwind + shadcn + React Router + static GitHub Pages** is consistent: static `dist`, `base`/`basename` pairing, SPA `404.html` workaround, no server dependency. **Deezer via `fetch`** matches client-only PRD. **Zod + single codec module** fits URL-as-source-of-truth.

**Pattern consistency:** Feature-first layout, **`lib/deezer`** and **`playlist-codec`** boundaries match core decisions. Naming (PascalCase components, camelCase domain, route constants) aligns with stack norms.

**Structure alignment:** **author / play / landing** maps to PRD journeys; **game** components separated from **ui** primitives; integration points match the decision impact sequence.

### Requirements Coverage Validation

**Epics:** None in repo — coverage traced via **FR categories** and UX spec.

**Functional requirements:** FR1–FR30 are covered by **author** + **codec** + **play/round** + **deezer resilience** + **no-auth** stance (see mapping table in Project Structure). **UX** requirements (combobox, attempt UI, missed guesses, landing CTA) map to **components/game**, **features/landing**, **shadcn** stack.

**Non-functional requirements:** **NFR-P1/P2** — performance budgets addressed in decisions (code-split, lazy routes); **NFR-S/HTTPS** — Pages + env discipline; **NFR-SC1** — static hosting; **NFR-A1/A2** — Radix/shadcn + documented patterns; **NFR-I/R** — Deezer wrapper + error states + URL validation.

### Implementation Readiness Validation

**Decision completeness:** Critical choices documented; **pin exact package versions at init** (React Router v7 line, Vite, etc.) in `package.json` when scaffolding.

**Structure completeness:** Concrete tree provided; file names may be adjusted during init but **boundaries** stay.

**Pattern completeness:** Conflict-prone areas (codec, Deezer, errors, state) have **MUST** rules and examples.

### Gap Analysis Results

**Critical:** None identified — **playlist encoding format** (exact compression/query/hash scheme) is **intentionally** left to implementation but **must** live only in **`playlist-codec.ts`** with versioning.

**Important:** **Deezer API** specifics (allowed endpoints, app id / CORS) must be confirmed against current Deezer docs before release — track as implementation task, not an architecture contradiction.

**Nice-to-have:** **Storybook** for game components; **E2E** (Playwright) for create → share → play path — post-MVP or parallel track.

### Validation Issues Addressed

No blocking contradictions found. GitHub Pages + client-side router dependency is **explicitly** documented (base path + `404.html`).

### Architecture Completeness Checklist

**Requirements analysis:** Project context, scale, constraints, cross-cutting concerns — done.

**Architectural decisions:** Stack, hosting, routing, state, API boundaries — done.

**Implementation patterns:** Naming, structure, format, communication, process — done.

**Project structure:** Directory tree, boundaries, FR mapping — done.

### Architecture Readiness Assessment

**Overall status:** **READY FOR IMPLEMENTATION** (pending concrete repo scaffold and Deezer compliance check at build time).

**Confidence level:** **High** for SPA + static hosting; **medium** until Deezer integration is proven on target browsers (known external risk).

**Key strengths:** Clear **feature/lib** split; **single codec** and **single Deezer gateway**; **GitHub Pages** alignment stated end-to-end.

**Areas for future enhancement:** PWA, analytics, optional backend proxy if catalog CORS/terms require it.

### Implementation Handoff

**AI agent guidelines:** Follow this document for stack, boundaries, and patterns; do not add **second** playlist parsers or **ad-hoc** Deezer calls.

**First implementation priority:** Run **`npm create vite@latest oneshot -- --template react-ts`**, add **Tailwind + shadcn**, wire **`config.ts`** (`base`/`basename`), **SPA 404 copy**, then **playlist codec** + **router shells** before feature work.
