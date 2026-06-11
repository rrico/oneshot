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
completedAt: '2026-06-10'
project_name: oneshot
user_name: Ryan
date: '2026-06-10'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

The PRD defines **36 FRs** covering: **playlist authoring** in a two-pane studio (search/preview/add/remove/reorder/name without accounts, FR1–FR8, FR36); **Heardle-style rounds** per track with a **fixed** six-stage clip schedule (**1s / 2s / 4s / 7s / 11s / 16s**), **autocomplete** selection (not free-text scoring), **skip** and **wrong guess** consuming attempts, **win/lose** resolution with reveal, **playlist progression**, **run recap with copyable emoji grid**, **full keyboard operability**, and **volume control** (FR9–FR25); **shareable URL** encoding/decoding with **invalid/truncated** handling, copy confirmation, and **in-studio length awareness** (FR26–FR30); **no app or music-service login** for core flows (FR31–FR32); **retry**, **clear errors**, and **continue without dead-ending** on bad playback (FR33–FR35). Architecturally this implies a **single-page client** with a **round state machine**, a **playlist model** serialized to URLs, a **results/recap module**, a **keyboard shortcut layer**, and **catalog + audio** adapters.

**Non-Functional Requirements:**

**Performance:** First meaningful interaction within **3s** on desktop broadband (NFR-P1); **≤3s** to **audio, loading, or error** after user actions (NFR-P2); search results within **~1s** of pause-typing (NFR-P3). **Security/privacy:** **HTTPS** via Pages (NFR-S1); **Deezer-compliant** API usage (NFR-S2); no stored music passwords/tokens (NFR-S3). **Hosting:** **GitHub Pages static** deployment, no app server (NFR-SC1). **Accessibility:** **WCAG 2.1 AA** on authoring, play, and autocomplete; state not by color alone; shortcuts additive with visible equivalents (NFR-A1–A3). **Integration:** Stay within catalog **terms** and surface **user-visible** failures with **retry/skip** (NFR-I1, NFR-I2). **Reliability:** Invalid/short URLs → **documented error state** (NFR-R1); **deep-link reloads on Pages restore state** with no 404/blank shell (NFR-R2).

**Scale & Complexity:**

- **Primary domain:** Desktop **web SPA** (pointer + keyboard), **client-only**.
- **Complexity level:** **Medium** — low product domain complexity, higher **integration** and **UX** surface (audio, URL, keyboard layer, a11y-rich components).
- **Estimated architectural components (logical):** **Routing/entry** (root vs deep link); **playlist codec** (encode/decode/validate); **session/game state** (round + playlist index + run results); **Deezer client** (search, metadata, previews); **audio engine** (clip timing, progress sync, volume); **keyboard shortcut manager**; **recap/share-text generator**; **UI shells** (studio vs play); **shared design-system layer** (tokens, primitives per UX).

### Technical Constraints & Dependencies

- **No backend** for accounts or gameplay; **GitHub Pages static hosting** is a **hard requirement**.
- **GitHub Pages routing:** Pages has **no server rewrite rules**. Decision (see Core Decisions): **hash-based routing** (`/#/play?...`) so deep links and reloads always resolve to `index.html` regardless of path — no `404.html` hack required, and the playlist payload lives in the fragment, which keeps it out of any server logs and immune to path-based truncation. Account for **project Pages URL** shape (`https://<user>.github.io/<repo>/`) via correct **`base` path** in the Vite build.
- **Deezer** as **external catalog** — **rate limits**, **geo availability**, and **preview rules** are constraints. The public Deezer API has historically **not sent CORS headers** for plain `fetch`; the documented browser pattern is **JSONP** (`output=jsonp&callback=`). The Deezer adapter must support a **JSONP transport** behind its interface (with `fetch` as a config option if CORS proves available), confirmed against current Deezer docs before release. Preview MP3s are served from CDN URLs playable via the `Audio` element.
- **Browser autoplay policies** — first playback must follow a **user gesture**; the audio engine must be initialized/resumed inside a gesture handler.
- **Browser URL length** — playlists encode compactly (numeric Deezer IDs, varint/base64url or similar) so realistic lists (≤30 tracks + title) stay well under conservative limits (~2k chars); studio surfaces a **length meter** (FR30).
- **P0 browsers:** Desktop Chrome, Firefox, Safari, Edge (current −1) per PRD.
- **UX** prescribes **Tailwind tokens + shadcn/Radix primitives**; custom **AttemptLadder**, **SnippetProgressBar** (segmented), **MissedGuessesList**, **GuessCombobox**, **RecapGrid**, **RevealCard**, **ShareLinkBar**, **ShortcutOverlay**, **GameShell**, **StudioShell**.

### Cross-Cutting Concerns Identified

- **Error handling UX** — uniform patterns for **bad URL**, **audio failure**, **catalog down** (retry, skip track, plain language).
- **Accessibility** — combobox, progressbar semantics, list semantics, focus order, reduced motion, **keyboard shortcut layer that never traps or conflicts with inputs**.
- **URL as contract** — encode/decode/versioning so share links stay stable as the product evolves; **test** shared links under the **GitHub Pages base URL** + **direct navigation/reload** of deep links.
- **Audio timing** — clip boundaries aligned to the PRD schedule and synced to the **segmented snippet bar**; one clock source per round.
- **Keyboard layer** — single registry of bindings; suspended while text inputs are focused; drives both behavior and on-screen hint chips.
- **Separation studio vs play** — shared tokens/primitives but distinct shells, code-split per route.

## Starter Template Evaluation

### Primary Technology Domain

**Desktop web SPA (client-only)** — static build output deployed to **GitHub Pages**, aligned with PRD and UX (Tailwind-friendly stack, accessible combobox and layout primitives, lean bundles).

### Starter Options Considered

- **Vite + React + TypeScript** (`npm create vite@latest` with `react-ts`) — default choice: fast dev/build, first-class static `dist`, ecosystem match for **Tailwind** and **shadcn/ui** (Radix), tree-shaking, widely documented **GitHub Pages** deployment patterns.
- **Next.js** — not selected: static export possible but adds framework weight for a **no-SSR** product.
- **SvelteKit / others** — viable; UX and velocity assumptions favor the **React + Radix-class** stack already specified in the UX doc.

### Selected Starter: Vite (`react-ts` template)

**Rationale for Selection:**

- Matches **greenfield SPA** with **no server**; build artifact is plain static files for **GitHub Pages**.
- Standard **React** patterns, large reference surface for **Deezer** + audio in the browser.
- Clear path to **Tailwind** + **shadcn/ui** after scaffold (UX: tokens, combobox, focus/a11y).

**Initialization Command:**

```bash
npm create vite@latest oneshot -- --template react-ts
```

Follow with: `cd oneshot && npm install`, add **Tailwind CSS** per current Vite docs, then **shadcn/ui** init. Use a **Node** version matching current Vite requirements at install time.

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

- Set `base` in `vite.config` to the repository path (e.g. `/oneshot/`) for **project** Pages.
- **Hash routing** (see Core Decisions) means **no SPA 404 fallback is required**; reloads of `https://<user>.github.io/oneshot/#/play?d=...` always serve `index.html`.
- Deploy **`dist`** via **GitHub Actions** + `actions/deploy-pages` (preferred) or a `gh-pages` branch.

**Note:** Running the init command (and first Tailwind/shadcn setup) should be an early **implementation** task once epics/stories exist.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation if undefined):**

- **Playlist representation in the URL** — encoding, versioning, max length handling; lives in the **hash fragment**.
- **Deezer access pattern** — JSONP-capable transport behind the adapter; which endpoints; error handling; no secrets.
- **Client routing + GitHub Pages** — **hash router** + Vite `base`; deep-link reload guarantee (NFR-R2).
- **Game state model** — round machine (attempt index, clip stage, missed guesses) + playlist index + accumulated **run results** for the recap.

**Important (shape the codebase):**

- **UI stack** — React + Tailwind + shadcn/Radix (from UX); custom game components on top.
- **Client state** — predictable updates for round + playlist + results (**Zustand** or **useReducer** + context); URL as source of truth for **playlist**; session state in memory.
- **Keyboard layer** — one shortcut registry module consumed by both behavior and hint UI.
- **Validation** — **Zod** for decoded URL payloads and external API responses at boundaries.

**Deferred (post-MVP):**

- **OG/meta link previews**, **analytics**, creator extras (shuffle flag, clip offsets) — not architecture blockers.

### Data Architecture

- **No server-side database**; no multi-user persisted state.
- **Playlist data** serialized in the **URL hash fragment**: versioned, compact (numeric Deezer track IDs + optional title), e.g. `#/play?d=<v1.base64url-payload>`; **decode → validate (Zod) → hydrate** on load.
- **In-memory** structures for current **round**, **playlist progress**, and **run results** (per-track outcome + winning attempt) feeding the recap.
- **`localStorage`** only for non-critical UX: volume level, dismissed first-run hints. Never source-of-truth gameplay.
- **Recap share text** generated client-side from run results (emoji grid + score + link); copied via Clipboard API.

### Authentication & Security

- **No application authentication** (hard requirement).
- **HTTPS** everywhere (GitHub Pages provides TLS).
- **No music-service tokens** stored (NFR-S3).
- **Deezer:** use only **documented** public/client patterns; **no private API keys** in the repo; JSONP responses treated as untrusted input (validated like any boundary data).
- **Threat model (lightweight):** treat URL payload as **untrusted input**; validate before use; cap decoded playlist size; render all strings as text (no HTML injection from titles).

### API & Communication Patterns

- **Deezer** via a transport-abstracted client in `src/lib/deezer/` — **JSONP** by default (script-tag injection with timeout + cleanup), `fetch` as an alternative if CORS is confirmed; no custom backend proxy for MVP unless terms force a minimal edge later (defer until proven).
- **Preview audio** via `HTMLAudioElement` pointed at Deezer preview URLs; the **audio engine** owns play/pause/seek/clip-boundary enforcement and volume.
- **Errors:** map network/catalog/JSONP-timeout failures to **user-visible** states (retry, skip track) per FR33–FR35 and NFR-I2.
- **No internal REST/GraphQL** server for core play.

### Frontend Architecture

- **Framework:** **React** (from Vite starter); **TypeScript strict**.
- **Routing:** **React Router** (pin latest stable at install) in **hash mode** (`createHashRouter`); routes for **landing** (`/`), **studio** (`/create`), **play** (`/play`), plus error boundaries. Vite `base` set to the repo path; hash routing makes a `basename` unnecessary for in-app paths.
- **State:** **round + run state** in a single store/reducer per session (one source of truth for attempt index and clip stage); **playlist from URL** on entry; studio edits re-encode to the share URL on change.
- **Audio engine:** `src/lib/audio/` — wraps one `Audio` element; exposes `playClip(previewUrl, untilSeconds)`, elapsed-time subscription for the snippet bar, volume control; enforces clip boundaries with a high-frequency clock check (not `setTimeout` alone).
- **Keyboard layer:** `src/lib/shortcuts/` — registry of `{ key, scope, description, handler }`; scopes (`play`, `reveal`, `global`) activated by route/state; auto-suspends when a text input is focused; feeds the `?` overlay and inline hint chips (NFR-A3).
- **Recap:** `src/lib/recap.ts` — pure function from run results → emoji grid string + score line.
- **Styling / components:** **Tailwind** + **shadcn/ui** (Radix) per UX; custom game components per UX component strategy.
- **Performance:** code-split **studio** vs **play** routes; lazy-load the studio (players are the majority entry); respect PRD timing NFRs.

### Infrastructure & Deployment

- **Hosting:** **GitHub Pages** (static `dist/`), project-site URL shape.
- **CI/CD:** **GitHub Actions** — on push to default branch: Node LTS, `npm ci`, `npm run build`, `actions/upload-pages-artifact` + `actions/deploy-pages`.
- **Envs:** build-time only (Vite `import.meta.env`); document required `VITE_*` vars in README/`.env.example` (likely none for MVP).
- **Monitoring:** none required for MVP; optional client error logging later.

### Decision Impact Analysis

**Implementation sequence (suggested):**

1. Vite React TS + Tailwind + shadcn + **hash router** + Vite `base` + Pages deploy workflow (deploy a hello-world to production first).
2. **Playlist codec** + validation + error UI for bad URLs.
3. **Deezer** client module (JSONP transport) + search + preview playback via the audio engine.
4. **Round state machine** + play shell (attempt ladder, segmented snippet bar, missed guesses, guess combobox) + keyboard layer.
5. **Recap** (results accumulation, RecapGrid, copy-results).
6. **Studio** flow (two-pane, preview, reorder, test play) + **share link** generation.
7. Hardening: a11y pass, P0 browsers, error paths.

**Cross-component dependencies:**

- **URL codec** ↔ **router** ↔ **ShareLinkBar** output must stay aligned (one codec module).
- **Audio engine clock** ↔ **SnippetProgressBar** ↔ **attempt index** share one source of truth per round.
- **Shortcut registry** ↔ **hint chips/overlay** render from the same data.
- **GitHub Pages `base`** must match **Vite `base`**; hash routes keep deep links reload-safe.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical conflict points (AI agents):** route vs file naming, URL/fragment param shapes vs playlist codec, Deezer response field naming vs app types, error object shapes, state update style, shortcut registration, and where tests live.

### Naming Patterns

**Database naming:** N/A (no DB).

**API naming (Deezer-facing):** Keep **Deezer JSON field names** as returned in **adapter**/`dto` types at the boundary; map to **camelCase** in **domain** types inside the app. Name adapter functions **`deezerSearchTracks`**, **`deezerFetchTrack`** (verb + resource), not generic `getData`.

**Routes (React Router, hash mode):** Path segments **kebab-case**; **route IDs in code** as constants: `ROUTES = { home: '/', create: '/create', play: '/play' }` in one module.

**Code naming:**

- **React components:** `PascalCase` files matching export (`AttemptLadder.tsx` → `export function AttemptLadder`).
- **Hooks:** `use` prefix, camelCase (`useRoundState`, `useShortcuts`).
- **Utilities:** camelCase functions (`encodePlaylist`, `parsePlaylistParam`, `buildRecapText`).
- **Types/interfaces:** `PascalCase` for models (`Playlist`, `RoundState`, `RunResults`); append `Schema` for Zod (`PlaylistSchema`).
- **Constants:** `UPPER_SNAKE` only for true constants (`CLIP_SCHEDULE_SECONDS` for the PRD clip ladder).

### Structure Patterns

**Project organization (feature-first):**

- `src/features/studio/` — playlist build, preview, share.
- `src/features/play/` — round loop, game shell, recap.
- `src/features/landing/` — root landing.
- `src/components/ui/` — shadcn/Radix primitives only.
- `src/components/game/` — AttemptLadder, SnippetProgressBar, MissedGuessesList, RevealCard, RecapGrid, GameShell.
- `src/lib/` — codec, config, recap, shortcuts, audio engine, Deezer client, small pure helpers.
- `src/app/` — route table, providers, layout wrappers.

**Tests:** Co-locate **`*.test.ts(x)`** next to source for units; **`src/test/`** for shared mocks (Deezer fixture responses, fake `Audio`, fake clock).

**Assets:** `public/` for static; **no** large media in repo except favicon/og image.

### Format Patterns

**Internal app data:** **camelCase** in TypeScript objects and JSON you own.

**URL playlist payload:** **One** encoding, in the **hash fragment** query (`#/play?d=...`): version prefix (`v1`), compact track-ID list + optional title, base64url-safe characters only; **Zod** parse on decode; reject oversized payloads with the structured error shape.

**Errors:** User-facing: structured type with **`title`**, optional **`body`**, optional **`recover`** (`'retry' | 'skip-track' | 'copy-link'`); never `throw` raw strings to the UI. Log technical detail only in dev or behind a flag.

### Communication Patterns

**Events:** Prefer **explicit callbacks** and **state setters** over a global event bus. The shortcut registry dispatches to handlers registered by the active scope — no DOM-level ad-hoc `keydown` listeners in components.

**State management:** **Immutable** updates only. One **round state** owner per session; **do not** duplicate attempt index in unrelated `useState` hooks. Run results accumulate in the same store the recap reads from.

**Deezer fetch:** Centralize in **`src/lib/deezer/`**; all requests go through one transport wrapper that handles **JSONP callback lifecycle (or fetch)**, **timeouts**, **typed errors**, and **rate-limit outcomes** for UI.

**Audio:** Components never construct `Audio` elements; they call the engine and subscribe to its clock.

### Process Patterns

**Loading:** Name flags **`isLoadingSearch`**, **`isBufferingClip`** — boolean per concern; avoid one global `loading`.

**Errors:** **Route-level** error boundary for unexpected crashes; **expected** failures (bad URL, track unavailable) as **rendered states** with recovery actions, not only toasts.

**Retries:** **Exponential backoff** only where network retry is appropriate; cap retries; always show **Skip** / **Cancel** when PRD requires.

### Enforcement Guidelines

**All AI agents MUST:**

- Import **Deezer** only through **`src/lib/deezer/**`**.
- Define **playlist encode/decode** in a **single module** (`src/lib/playlist-codec.ts`) — no ad-hoc fragment parsing in components.
- Register keyboard handling only through **`src/lib/shortcuts/`** — no scattered `keydown` listeners.
- Play audio only through **`src/lib/audio/`**.
- Use **shared route constants**; keep **Vite `base`** aligned with the GitHub Pages repo path.

**Verification:** ESLint + TypeScript strict; PR review checks **codec**, **deezer**, **audio**, and **shortcuts** import paths.

### Pattern Examples

**Good:** `features/play/hooks/useRoundState.ts` owns attempt index; `SnippetProgressBar` receives `elapsedMs` and `unlockedMs` from the audio engine subscription exposed by that hook.

**Anti-patterns:** Parsing the playlist in three components differently; calling Deezer from a leaf button; a component adding its own `window.addEventListener('keydown', ...)`; two `Audio` elements fighting over playback.

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
│       └── deploy.yml           # build + deploy to GitHub Pages
├── public/
│   └── favicon.ico
├── dist/                        # gitignored — Vite build output for Pages
└── src/
    ├── main.tsx
    ├── vite-env.d.ts
    ├── app/
    │   ├── providers.tsx        # router (hash), theme
    │   └── routes.tsx           # route table; ROUTES constants
    ├── features/
    │   ├── landing/
    │   │   ├── LandingPage.tsx
    │   │   └── components/
    │   ├── studio/
    │   │   ├── StudioPage.tsx
    │   │   ├── components/      # StudioShell, PlaylistRow, ShareLinkBar, TestPlayDialog
    │   │   └── hooks/
    │   └── play/
    │       ├── PlayPage.tsx
    │       ├── RecapPage.tsx    # or recap state within PlayPage
    │       ├── components/
    │       └── hooks/           # useRoundState, useRunResults
    ├── components/
    │   ├── game/
    │   │   ├── GameShell.tsx
    │   │   ├── AttemptLadder.tsx
    │   │   ├── SnippetProgressBar.tsx
    │   │   ├── MissedGuessesList.tsx
    │   │   ├── GuessCombobox.tsx
    │   │   ├── RevealCard.tsx
    │   │   └── RecapGrid.tsx
    │   ├── shortcuts/
    │   │   ├── ShortcutHint.tsx
    │   │   └── ShortcutOverlay.tsx
    │   └── ui/                  # shadcn-generated only
    ├── lib/
    │   ├── config.ts            # base URL helpers, feature flags
    │   ├── playlist-codec.ts    # encode/decode/validate playlist for URL fragment
    │   ├── round-model.ts       # clip schedule, attempt transitions (pure)
    │   ├── recap.ts             # run results -> emoji grid + score text (pure)
    │   ├── shortcuts/
    │   │   ├── registry.ts      # scopes, bindings, suspend-on-input
    │   │   └── useShortcuts.ts
    │   ├── audio/
    │   │   └── engine.ts        # single Audio element, clip boundary, clock, volume
    │   └── deezer/
    │       ├── client.ts        # JSONP/fetch transport, timeouts, typed errors
    │       ├── search.ts
    │       ├── track.ts
    │       └── types.ts         # boundary DTOs vs domain types
    ├── types/
    │   └── index.ts             # shared Playlist, RoundState, RunResults, etc.
    └── test/
        ├── setup.ts
        └── fixtures/
            └── deezer.ts
```

Co-locate **`*.test.ts(x)`** beside modules as they are added (e.g. `src/lib/playlist-codec.test.ts`, `src/lib/recap.test.ts`).

### Architectural Boundaries

**API boundaries**

- **External:** only **Deezer** endpoints (catalog + preview CDN), accessed through **`src/lib/deezer/*`** and **`src/lib/audio/*`**. No other network origins for MVP.
- **Internal:** no backend API; the **playlist codec** is the only serialization contract for share links; **recap text** is the only share-back contract.

**Component boundaries**

- **`components/ui`:** generic primitives; **no** Deezer or round logic.
- **`components/game`:** game chrome; **no** direct network or `Audio` access.
- **`features/*`:** pages and feature hooks; wire data into **`components/game`**.

**Service boundaries**

- **`lib/deezer`:** all catalog HTTP/JSONP; maps responses to app types.
- **`lib/audio`:** the only owner of playback.
- **`lib/playlist-codec`:** URL fragment ↔ playlist structure; **single** entry for playlist parsing.
- **`lib/shortcuts`:** the only keyboard event surface.

**Data boundaries**

- **No DB.** **Source of truth:** decoded URL + in-memory session state in **`features/play`**. **`localStorage`** only for volume + dismissed hints (documented in code).

### Requirements to Structure Mapping

| FR category (PRD) | Primary location |
|-------------------|------------------|
| Playlist authoring (FR1–FR8, FR36) | `src/features/studio/` |
| Heardle rounds, guess, skip, progress (FR9–FR20) | `src/features/play/`, `components/game/`, `lib/round-model.ts`, `lib/audio/` |
| Recap + copy results (FR21–FR22) | `lib/recap.ts`, `components/game/RecapGrid.tsx`, `features/play/` |
| Keyboard operability (FR23) | `lib/shortcuts/`, `components/shortcuts/` |
| Hints / volume (FR24–FR25) | `features/play/`, `lib/audio/` |
| Shareable URL (FR26–FR30) | `lib/playlist-codec.ts`, `app/routes.tsx`, studio ShareLinkBar |
| No login (FR31–FR32) | No auth modules anywhere |
| Resilience (FR33–FR35) | `lib/deezer/client.ts`, `lib/audio/engine.ts`, play error states |
| Landing / root | `features/landing/` |

**Cross-cutting:** A11y and focus — **`components/ui`** + **`components/game`**; tokens in **Tailwind** + global CSS.

### Integration Points

**Internal:** **Router** → **Play/Studio** pages → **hooks** → **`round-model`** + **`playlist-codec`** + **`deezer`** + **`audio`** + **`shortcuts`**. **Studio** edits playlist → **codec** → share URL. **Play** results → **`recap`** → clipboard.

**External:** **Deezer** only via **`lib/deezer`** (catalog) and preview URLs via **`lib/audio`**.

**Data flow:** **URL fragment** → decode (**codec**) → **Playlist** → **play session** → per-track **RoundState** → **audio engine** + **UI** → accumulated **RunResults** → **recap text** → clipboard; **studio** edits **Playlist** → encode → **URL** for share.

### File Organization Patterns

**Configuration:** Root **Vite/Tailwind/ESLint**; **`src/lib/config.ts`** for public env; **`.env.example`** lists `VITE_*` only.

**Source:** **Feature folders** own pages and feature hooks; **shared game visuals** in **`components/game`**.

**Tests:** Co-located unit tests; **`src/test/fixtures`** for Deezer JSON mocks; fake clock helpers for audio-timing tests.

**Assets:** **`public/`** for static; **`dist/`** gitignored.

### Development Workflow Integration

**Dev:** `npm run dev` — hash routing behaves identically in dev and on Pages, so deep-link testing is faithful locally.

**Build:** `npm run build` → `dist/` with `base` set to the repo path. No 404 fallback step needed with hash routing.

**Deploy:** **GitHub Actions** workflow builds and publishes **`dist`** to **Pages** on push to the default branch.

## Architecture Validation Results

### Coherence Validation

**Decision compatibility:** **Vite + React + TS + Tailwind + shadcn + React Router (hash) + static GitHub Pages** is consistent: static `dist`, `base` pairing, reload-safe deep links without server rewrites, no server dependency. **Deezer via JSONP-capable adapter** matches the client-only, no-proxy constraint. **Zod + single codec module** fits URL-as-source-of-truth.

**Pattern consistency:** Feature-first layout; **`lib/deezer`**, **`lib/audio`**, **`lib/shortcuts`**, and **`playlist-codec`** boundaries match core decisions. Naming aligns with stack norms.

**Structure alignment:** **studio / play / landing** maps to PRD journeys; **game** components separated from **ui** primitives; recap and shortcut layers have single homes.

### Requirements Coverage Validation

**Functional requirements:** FR1–FR36 are covered by **studio** + **codec** + **play/round** + **audio engine** + **shortcuts** + **recap** + **deezer resilience** + **no-auth** stance (see mapping table). UX requirements (segmented snippet bar, recap grid, shortcut overlay, two-pane studio) map to **components/game**, **components/shortcuts**, **features/studio**.

**Non-functional requirements:** **NFR-P1–P3** — code-split routes, lazy studio, debounced search; **NFR-S/HTTPS** — Pages + env discipline; **NFR-SC1** — static hosting; **NFR-A1–A3** — Radix/shadcn + shortcut registry with visible equivalents; **NFR-I/R** — Deezer wrapper + error states + URL validation; **NFR-R2** — hash routing guarantees reload-safe deep links.

### Implementation Readiness Validation

**Decision completeness:** Critical choices documented; **pin exact package versions at init** in `package.json` when scaffolding.

**Structure completeness:** Concrete tree provided; file names may be adjusted during init but **boundaries** stay.

**Pattern completeness:** Conflict-prone areas (codec, Deezer, audio, shortcuts, errors, state) have **MUST** rules and examples.

### Gap Analysis Results

**Critical:** None identified — the **exact payload byte format** (varint vs delimited IDs, compression choice) is **intentionally** left to implementation but **must** live only in **`playlist-codec.ts`** with versioning.

**Important:** **Deezer API** browser-access specifics (JSONP availability, rate limits, geo behavior of previews) must be confirmed against current Deezer docs/behavior before release — track as an early implementation spike, not an architecture contradiction.

**Nice-to-have:** **Storybook** for game components; **E2E** (Playwright) for create → share → play → recap path — post-MVP or parallel track.

### Validation Issues Addressed

No blocking contradictions found. GitHub Pages routing constraint resolved structurally via hash routing; autoplay policy resolved via gesture-initiated audio engine.

### Architecture Completeness Checklist

**Requirements analysis:** Project context, scale, constraints, cross-cutting concerns — done.

**Architectural decisions:** Stack, hosting, routing, state, audio, keyboard, API boundaries — done.

**Implementation patterns:** Naming, structure, format, communication, process — done.

**Project structure:** Directory tree, boundaries, FR mapping — done.

### Architecture Readiness Assessment

**Overall status:** **READY FOR IMPLEMENTATION** (pending repo scaffold and the Deezer browser-access spike).

**Confidence level:** **High** for SPA + Pages + hash routing; **medium** until Deezer JSONP/preview behavior is proven on P0 browsers (known external risk).

**Key strengths:** Clear **feature/lib** split; **single codec, single audio engine, single shortcut registry, single Deezer gateway**; GitHub Pages alignment stated end-to-end with no server-rewrite dependency.

**Areas for future enhancement:** OG/meta previews, optional minimal proxy if catalog terms require it, creator extras.

### Implementation Handoff

**AI agent guidelines:** Follow this document for stack, boundaries, and patterns; do not add **second** playlist parsers, **ad-hoc** Deezer calls, stray `Audio` elements, or component-level `keydown` listeners.

**First implementation priority:** Run **`npm create vite@latest oneshot -- --template react-ts`**, add **Tailwind + shadcn**, wire **hash router** + Vite `base`, ship the **Pages deploy workflow** with a hello-world, then **Deezer access spike** + **playlist codec** before feature work.
