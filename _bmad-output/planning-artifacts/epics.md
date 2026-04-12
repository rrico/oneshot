---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
workflowStatus: complete
completedAt: '2026-04-02'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
advancedElicitation:
  applied: true
  methods:
    - First Principles Analysis
    - Challenge from Critical Perspective
  summary: >-
    Single playlist codec module for encode/decode; FR7 split between entry/hydration (Epic 1) and round session (Epic 3);
    minimum visible loading/error behavior in Epics 1–3; Epic 4 deepens resilience; Epic 3 may ship as multiple implementation milestones.
---

# oneshot - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **oneshot**, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

### Epic design notes (advanced elicitation)

- **Playlist contract:** One codec module only (`playlist-codec` per architecture). Epic 1 delivers **decode + validation** for entry URLs; Epic 2 completes **encode** and share output. No second parser in feature code.
- **FR7 planning split:** **FR7a** — parse shared entry, validate payload, hydrate in-memory playlist for routing (**Epic 1**). **FR7b** — begin and run the Heardle session for that playlist (**Epic 3**). PRD FR7 remains a single requirement; this split is for backlog clarity only.
- **Resilience:** Epics 1–3 **Definition of Done** includes **non-silent** loading or error UI on decode, catalog, and first clip paths. **Epic 4** adds deeper retry/skip-unavailable behavior and cross-cutting hardening—not the first time users see failures.
- **Epic 3 scope:** Covers FR8–FR20; may be implemented in **multiple milestones** (engine vs shell vs progression) while staying one epic for user value.

## Requirements Inventory

### Functional Requirements

FR1: Creator can search the music catalog for tracks to add to a playlist.

FR2: Creator can add a selected track to the current playlist.

FR3: Creator can remove a track from the current playlist.

FR4: Creator can reorder tracks in the current playlist.

FR5: Creator can view the current ordered playlist before sharing.

FR6: Creator can author a playlist without creating an application account.

FR7: Player can start a game session from a valid shared entry point.

FR8: For each playlist track, player can hear a progressive series of audio snippets with fixed durations 1s, 2s, 4s, 7s, 11s, 16s mapped to attempts 1–6 (not configurable).

FR9: Player has at most six attempts per track to identify the correct song (attempt budget matches snippet stages).

FR10: Player can submit a guess by selecting a track from catalog-backed autocomplete suggestions (e.g. matching typed input to artist/title results).

FR11: Player can skip the current attempt to advance to the next longer snippet without submitting the correct answer, consuming one attempt.

FR12: When a guess is incorrect, the product consumes an attempt and advances to the next snippet stage (until attempts are exhausted or the song is guessed).

FR13: Player can see which attempt they are on (e.g. 1 of 6) and/or remaining attempts for the current track.

FR14: Player receives immediate feedback after each guess or skip (e.g. wrong/correct/skip state) appropriate to the round rules.

FR15: When the player selects the correct song from suggestions, the round resolves as won for that track.

FR16: When no attempts remain without a correct guess, the round resolves as lost for that track (product shows answer/reveal per rules).

FR17: After a round resolves, player can advance to the next track in the playlist when one exists.

FR18: Player can see progress through the playlist (e.g. current index or remaining tracks).

FR19: Player can complete the full playlist and see that the run is finished.

FR20: Player can understand how skipping, guessing, and attempts work without prior training (inline copy or first-run hinting).

FR21: Creator can generate a shareable representation of the playlist suitable for transmission (e.g. link).

FR22: Creator can copy or invoke system share for that representation on supported platforms.

FR23: Recipient can open the shareable entry point and load the same playlist content and order (or receive a clear failure if not possible).

FR24: System can detect invalid, incomplete, or untrusted playlist data from an entry point and present an understandable error (not a blank screen).

FR25: Player can complete core play flows without creating an application account.

FR26: Player can complete core play flows without authenticating to a music service inside the application.

FR27: Player can retry when an audio clip fails to start or play.

FR28: Player can see clear feedback when playback cannot proceed (e.g. network or catalog restriction).

FR29: Player can continue the run when a single track cannot be played, according to defined product rules (e.g. skip track with notice), without aborting the entire playlist silently.

FR30: Creator can validate the playlist in a preview or equivalent experience before sharing (including representative Heardle-style play for a track if offered by the product).

### NonFunctional Requirements

NFR-P1: On P0 mobile browsers, the app shell shall reach first meaningful interaction (user can tap into author or play flow) within 5 seconds on a mid-tier device over typical mobile network conditions, as verified by release smoke tests.

NFR-P2: After the user triggers play, skip, or guess submit for a round, the UI shall show audible playback, a loading state, or an error within 3 seconds under normal network conditions (no indefinite blank wait).

NFR-S1: The app shall be served only over HTTPS.

NFR-S2: The client shall comply with Deezer (or successor catalog) rules for credentials and API usage — no disallowed secrets in shipped client bundles.

NFR-S3: The product shall not store end-user music-service passwords or session tokens for “no music login” flows.

NFR-SC1: MVP deployment shall tolerate viral small-group link sharing using static asset hosting without requiring a dedicated application server for core gameplay.

NFR-A1: Authoring, play, guess entry (autocomplete), and skip controls shall meet WCAG 2.1 Level AA for applicable criteria, verified by automated scans plus targeted manual checks on mobile.

NFR-A2: Round outcomes (correct/incorrect/skip) shall use more than color alone to convey state.

NFR-I1: Search, metadata, and preview playback shall remain within catalog provider terms and documented technical constraints (rate limits, geographic availability) as confirmed before release.

NFR-I2: Catalog or network failures shall surface user-visible errors with retry or skip paths where FRs require — no silent permanent hang on catalog calls.

NFR-R1: Invalid or truncated playlist URLs shall always resolve to a documented error state (see FR24), with no unhandled script errors on the primary manual QA path.

### Additional Requirements

- **Stack:** Vite + React + TypeScript; Tailwind + shadcn/ui (Radix); React Router with `basename` aligned to GitHub Pages `base`.
- **Hosting:** Static deploy to GitHub Pages; `vite.config` `base`, Router `basename`, and SPA reload mitigation (`404.html` = `index.html` in `dist`) must stay aligned.
- **Playlist contract:** Single module (`playlist-codec` or equivalent) for encode/decode/validate; Zod (or similar) at boundaries; URL payload treated as untrusted; versioning for link stability.
- **Deezer:** All HTTP via `src/lib/deezer/*`; adapter DTOs at API boundary; domain types camelCase; no ad-hoc fetches from components.
- **State:** Immutable updates; one source of truth for round state (attempt index, clip stage) and playlist progress; no duplicate attempt state across unrelated hooks.
- **Errors:** User-facing shape with title, body, optional recover action (`retry` | `skip-track` | `copy-link`); route-level error boundary; expected failures as rendered states.
- **Structure:** Feature folders `landing`, `author`, `play`; `components/game` for game chrome; `components/ui` for primitives only; `lib/` for codec, Deezer, round-model.
- **Naming:** Routes kebab-case in URLs; `ROUTES` constants; PascalCase components; hooks `use*`; Deezer functions `deezerSearchTracks`, etc.; `CLIP_SCHEDULE_SECONDS` for PRD ladder.
- **CI/CD:** GitHub Actions build and deploy `dist` to Pages; document `VITE_*` in `.env.example`.
- **Testing:** Co-located unit tests; shared fixtures under `src/test/` for Deezer mocks.
- **Deezer compliance:** Confirm allowed endpoints, CORS, and public app id pattern against current Deezer docs before release.

### UX Design Requirements

UX-DR1: Implement design tokens (color roles including muted wrong-guess vs success, typography scale ≥16px on inputs, spacing 4px base, motion tokens with `prefers-reduced-motion` for non-essential animation).

UX-DR2: Root landing page: single primary CTA “Create a playlist,” simple/modern/clean layout, no competing primary actions, no auth walls.

UX-DR3: Play mode: dark-first shell, single column max-width ~480–600px, safe-area insets, minimal chrome during rounds.

UX-DR4: Custom **AttemptLadder**: six dots/segments for attempts 1–6 with states used/current/remaining; state not conveyed by color alone.

UX-DR5: Custom **SnippetProgressBar**: linear bar for current clip only; elapsed/duration labels; gradient accent (cyan→violet) on fill per chosen direction; `role="progressbar"` and timing exposed for screen readers.

UX-DR6: Custom **MissedGuessesList**: append-only wrong picks (title + artist) per round; muted styling; list semantics; internal scroll on small screens; clears on next track.

UX-DR7: Custom **GameShell**: wraps dots + snippet bar + missed list + guess + skip; consistent vertical rhythm.

UX-DR8: **Guess entry:** Combobox/async search against Deezer; debounced search; keyboard navigation; focus order guess → skip → post-round actions.

UX-DR9: **Authoring:** Search-to-add pattern (A1-leaning); playlist as ordered list; empty state drives add; share disabled or blocked with clear reason when empty.

UX-DR10: **ShareLinkBar:** Copy link + optional Web Share; URL length warning before share when approaching limits; confirmation on copy (“Link copied”).

UX-DR11: **Feedback patterns:** Wrong guess muted not alarm red; success reserved for wins/copy; errors with icon, short title, body, primary recovery action.

UX-DR12: **Loading:** Skeletons for search and initial clip buffer; no silent infinite spinners on play/catalog paths.

UX-DR13: **Responsive:** Mobile-first breakpoints (&lt;640, 640–1023, 1024+); touch targets ≥44×44px on primary controls.

UX-DR14: **Accessibility:** WCAG 2.1 AA on core flows; focus visible on interactive elements; do not disable zoom; semantic regions where applicable.

UX-DR15: **Journey D/E error UX:** Invalid/truncated URL full-screen or card with plain language and next steps (re-copy, open in browser).

UX-DR16: Optional dismissible first-run hints for Heardle rules (skip vs guess, attempt budget) without tutorial wall.

UX-DR17: Author reorder UX (drag handles or explicit controls) per A3 patterns when implementing reorder.

### FR Coverage Map

| ID | Epic | Coverage note |
|----|------|-----------------|
| FR1–FR6 | Epic 2 | Authoring and account-free creator flows |
| FR7a | Epic 1 | Shared entry: parse, validate, hydrate playlist model |
| FR7b | Epic 3 | Run Heardle session on hydrated playlist |
| FR8–FR20 | Epic 3 | Rounds, guesses, progression, hints |
| FR21–FR22 | Epic 2 | Encode link, copy/share |
| FR23 | Epic 1 + Epic 2 | Recipient load (decode in E1; encode parity in E2) |
| FR24 | Epic 1 | Invalid/incomplete URL error states |
| FR25–FR26 | Epics 1–4 | No app or music login (enforced in UI across flows) |
| FR27–FR29 | Epic 4 (+ baselines in 1–3) | Retry, errors, skip-unavailable; minimum visibility in earlier epics |
| FR30 | Epic 2 | Preview / representative play before share |
| NFR-P1 | Epic 1 | First meaningful interaction path; smoke-tested |
| NFR-P2 | Epics 3–4 | Post-action feedback timing; hardened in E4 |
| NFR-S1, NFR-SC1 | Epic 1 | HTTPS static hosting |
| NFR-S2, NFR-S3 | Epics 2–4 | Deezer usage, no secrets, no stored music tokens |
| NFR-A1, NFR-A2 | Epic 4 (+ Epics 2–3 UI) | AA targets; Epic 4 consolidates pass |
| NFR-I1, NFR-I2 | Epics 2–4 | Catalog terms, visible failures |
| NFR-R1 | Epic 1 | Documented error state for bad URLs; no unhandled errors on QA path |
| UX-DR1 | Epics 1–4 | Tokens; Epic 4 verification |
| UX-DR2 | Epic 1 | Landing CTA |
| UX-DR3–UX-DR7 | Epic 3 | Play shell and custom game components |
| UX-DR8 | Epic 3 | Guess combobox |
| UX-DR9 | Epic 2 | Author search/list |
| UX-DR10 | Epic 2 | Share bar, URL length warning |
| UX-DR11–UX-DR12 | Epics 1–4 | Feedback, loading; Epic 4 consistency |
| UX-DR13 | Epics 1–3 | Responsive/touch |
| UX-DR14 | Epic 4 | A11y pass |
| UX-DR15 | Epic 1 | Bad link UX |
| UX-DR16 | Epic 3 | Dismissible hints |
| UX-DR17 | Epic 2 | Reorder affordances |

## Epic List

### Epic 1: Foundation, routing & link contract

**Goal:** Users open the app or a shared link on HTTPS/GitHub Pages; invalid or truncated links fail with a clear, documented error; root landing has one primary “create playlist” path; no authentication surfaces.

**FRs:** FR7a, FR24; FR23 (recipient decode path); FR25–FR26 (no auth). **NFRs:** NFR-S1, NFR-SC1, NFR-R1, NFR-P1 (smoke). **UX:** UX-DR2, UX-DR15, baseline UX-DR1/11/12/13.

### Epic 2: Playlist authoring & distribution

**Goal:** Creators search Deezer, build/reorder/preview a playlist, and generate a copyable/shareable URL—with no accounts.

**FRs:** FR1–FR6, FR21–FR23 (encode + parity with decode), FR30. **NFRs:** NFR-S2, NFR-I1. **UX:** UX-DR9, UX-DR10, UX-DR17, UX-DR11–UX-DR13.

### Epic 3: Heardle rounds & playlist play

**Goal:** Players experience full Heardle-style rounds (fixed clip ladder, autocomplete guess, skip, feedback, win/lose/reveal) and progress through the playlist to completion.

**FRs:** FR7b, FR8–FR20. **NFRs:** NFR-P2 (with Epic 4). **UX:** UX-DR3–UX-DR8, UX-DR16, UX-DR11–UX-DR13.

### Epic 4: Playback & catalog resilience (hardening)

**Goal:** Audio, catalog, and network failures surface explicit recovery (retry, skip track, plain language); session continues without silent dead ends. **Reframes** prior epics’ minimum error behavior into full FR27–FR29 coverage.

**FRs:** FR27–FR29. **NFRs:** NFR-P2, NFR-I2, NFR-A1, NFR-A2. **UX:** UX-DR11, UX-DR12, UX-DR14.

---

## Epic 1: Foundation, routing & link contract

Deliver a deployable client-only SPA on GitHub Pages with aligned `base`/`basename`, a single playlist codec entry point for **decode**, validated deep links, and accessible failure UX for bad URLs.

### Story 1.1: Scaffold, hosting alignment, and SPA reload safety

As a **deployer**,
I want **the Vite React TS app built with Tailwind + shadcn/ui and correct GitHub Pages base configuration**,
So that **static hosting and shared deep links work reliably**.

**Acceptance Criteria:**

**Given** a fresh repo scaffold
**When** the project is configured for GitHub Pages (including `vite.config` `base`, Router `basename` from shared `config`, and `404.html` copy from `index.html` in `dist`)
**Then** production builds load at the Pages URL and reloading a deep link does not 404
**And** `.env.example` documents any `VITE_*` public variables (NFR-S2)

### Story 1.2: Root landing and auth-free route shells

As a **visitor**,
I want **a simple landing with one primary “Create a playlist” action and routes for create/play without sign-in**,
So that **the product promise (no accounts) is obvious immediately** (FR25, FR26, UX-DR2).

**Acceptance Criteria:**

**Given** the app root URL
**When** the landing renders
**Then** there is a single primary CTA to create a playlist and no app or music-service login UI appears
**And** secondary navigation (if any) does not compete visually with the primary CTA
**And** touch targets for primary actions meet ≥44×44px (UX-DR13)

### Story 1.3: Playlist codec — decode, validate, version

As a **player**,
I want **shared playlist data in the URL to be parsed and validated in one place**,
So that **invalid payloads never silently corrupt gameplay** (FR24, NFR-R1, architecture “single codec”).

**Acceptance Criteria:**

**Given** a playlist payload in the URL (query or hash per implementation)
**When** the codec decodes it
**Then** output is validated with Zod (or agreed schema) and versioned for future compatibility
**And** malformed, truncated, or tampered payloads return a structured error object (not thrown strings) for UI use
**And** no other module parses playlist parameters ad hoc

### Story 1.4: Invalid-link error experience

As a **recipient**,
I want **a clear full-screen or card error when a link is bad or truncated**,
So that **I know what happened and what to do next** (FR24, UX-DR15).

**Acceptance Criteria:**

**Given** decode/validation failed for the entry URL
**When** the play (or entry) route loads
**Then** the user sees plain-language explanation and recovery hints (e.g. ask creator to re-copy, open in browser)
**And** there is no blank shell and no unhandled runtime error on the primary manual path (NFR-R1)

### Story 1.5: Play entry — hydrate playlist from a valid share link

As a **player**,
I want **opening a valid shared link to load the playlist into the app session**,
So that **I can start gameplay when rounds exist** (FR23 decode path, FR7a).

**Acceptance Criteria:**

**Given** a valid encoded playlist URL
**When** the user opens the link to the play route
**Then** the ordered track list is available in session/context state for the play feature
**And** if the payload is valid but empty, the UI communicates that clearly without crashing

---

## Epic 2: Playlist authoring & distribution

Enable Deezer-backed search, playlist editing, URL generation with length awareness, copy/share, and optional preview before sending.

### Story 2.1: Deezer client module and typed errors

As a **developer**,
I want **all Deezer HTTP access centralized with typed boundaries**,
So that **components stay free of ad hoc fetch and failures map to UI states** (architecture, NFR-I1, NFR-S2).

**Acceptance Criteria:**

**Given** API usage per current Deezer public/client rules
**When** search or track calls run
**Then** responses map through DTO types at the boundary and domain types internally
**And** 429/5xx/network errors surface typed error objects suitable for retry UI (NFR-I2 baseline)

### Story 2.2: Search and add tracks to the playlist

As a **creator**,
I want **to search Deezer and add tracks to my playlist**,
So that **I can build a game list without an account** (FR1, FR2, FR6, UX-DR9).

**Acceptance Criteria:**

**Given** the author view
**When** I search and select a track
**Then** it is appended to my ordered playlist with title/artist/deezer id metadata
**And** empty search results show a helpful empty state (UX-DR12)
**And** loading states use skeletons or inline status—not silent stalls

### Story 2.3: Remove, reorder, and review playlist

As a **creator**,
I want **to remove, reorder, and review my playlist before sharing**,
So that **the game order matches my intent** (FR3–FR5, UX-DR17).

**Acceptance Criteria:**

**Given** a non-empty playlist
**When** I remove a track or change order
**Then** the list updates immediately and remains consistent for encoding
**And** reorder controls are accessible (keyboard or drag per chosen pattern) and usable on mobile

### Story 2.4: Encode playlist and surface URL length risks

As a **creator**,
I want **a shareable URL generated from my playlist with warnings if the link is getting too long**,
So that **friends receive working links** (FR21, FR23 encode parity, UX-DR10).

**Acceptance Criteria:**

**Given** a non-empty playlist
**When** I request the share link
**Then** the codec encodes the playlist using the same module as decode (single source of truth)
**And** if approaching practical URL limits, I see a non-blocking warning before sharing
**And** generated URLs round-trip through decode in Story 1.3 for the same playlist

### Story 2.5: Copy, system share, and preview

As a **creator**,
I want **to copy or share the link and optionally preview a round**,
So that **I’m confident before sending** (FR22, FR30, UX-DR10).

**Acceptance Criteria:**

**Given** a generated URL
**When** I tap copy or system share (where available)
**Then** I get confirmation (“Link copied” or OS share sheet)
**And** preview, if implemented, can start a representative Heardle-style round for one track without leaving authoring context (FR30)
**And** share remains disabled with explanation when playlist is empty (UX-DR9)

---

## Epic 3: Heardle rounds & playlist play

Implement the round state machine, audio snippets, game UI shell, guessing, and playlist progression.

### Story 3.1: Pure round model and clip schedule

As a **developer**,
I want **a pure module for attempt index, clip durations (1s–16s ladder), and legal transitions**,
So that **UI and audio share one source of truth** (FR8, FR9, architecture `round-model`).

**Acceptance Criteria:**

**Given** PRD fixed ladder
**When** transitions run for skip, wrong guess, correct guess, or out of attempts
**Then** attempt budget and clip index match PRD rules with unit tests
**And** constants are named (e.g. `CLIP_SCHEDULE_SECONDS`) per architecture conventions

### Story 3.2: Snippet audio playback for current attempt

As a **player**,
I want **the current snippet to play and resync when attempts advance**,
So that **I hear the progressive clips** (FR8, NFR-P2 baseline).

**Acceptance Criteria:**

**Given** a round in progress
**When** a snippet should play for the active attempt
**Then** audio uses Deezer preview rules and stops/resets appropriately on attempt change
**And** within ~3s under normal conditions I hear audio, see buffering, or see an error—not silence (NFR-P2; deeper hardening in Epic 4)

### Story 3.3: GameShell, AttemptLadder, SnippetProgressBar, MissedGuessesList

As a **player**,
I want **attempts, clip progress, and wrong guesses visible in one calm layout**,
So that **I always know game state without hunting** (FR13, FR14, UX-DR3–UX-DR7, NFR-A2 baseline).

**Acceptance Criteria:**

**Given** play mode
**When** I view the round
**Then** AttemptLadder shows attempt 1–6 with non-color-only state; SnippetProgressBar shows elapsed/total for the active clip with `role="progressbar"`; MissedGuessesList lists wrong picks (title + artist) with muted styling and list semantics
**And** layout respects max-width ~480–600px and safe areas (UX-DR3)

### Story 3.4: Guess combobox, skip, and round resolution

As a **player**,
I want **to guess via catalog autocomplete, skip attempts, and resolve rounds with clear feedback**,
So that **the Heardle loop feels fair and legible** (FR10–FR16, UX-DR8, UX-DR11).

**Acceptance Criteria:**

**Given** an active round
**When** I submit a wrong guess
**Then** an attempt is consumed, the next snippet plays, and the wrong pick appears in MissedGuessesList
**When** I skip
**Then** an attempt is consumed and no wrong-guess row is added
**When** I pick the correct song
**Then** the round wins immediately with non-punitive success feedback
**When** attempts are exhausted without a win
**Then** I see lose + reveal with neutral-to-warm tone
**And** focus order remains: guess → skip → post-round actions (UX-DR8)

### Story 3.5: Playlist progression, completion, and lightweight hints

As a **player**,
I want **to move through the playlist and understand when I’m done—and get light rule hints if needed**,
So that **I can finish the set without a tutorial wall** (FR17–FR20, UX-DR16).

**Acceptance Criteria:**

**Given** a resolved round
**When** more tracks remain
**Then** I can advance to the next track and see playlist position (e.g. x of y)
**When** no tracks remain
**Then** I see a clear completion state
**And** optional dismissible hints explain skip vs guess and attempt budget without blocking play (FR20, UX-DR16)

---

## Epic 4: Playback & catalog resilience (hardening)

Deepen failure handling and accessibility so real-world networks and catalog limits do not dead-end sessions.

### Story 4.1: Audio failure retry and explicit playback errors

As a **player**,
I want **retry and clear messaging when a clip fails**,
So that **I’m never stuck on a silent spinner** (FR27, FR28, NFR-P2, UX-DR11–UX-DR12).

**Acceptance Criteria:**

**Given** a clip fails to start or play
**When** I use retry
**Then** the app attempts recovery and shows loading or error within the PRD timing budget
**And** errors include title, body, and a primary recovery action (architecture error shape)

### Story 4.2: Catalog and network failure surfaces

As a **player**,
I want **catalog downtime or rate limits to show actionable errors**,
So that **I understand it’s not just “the game broke”** (NFR-I2, FR28).

**Acceptance Criteria:**

**Given** search or preview calls fail after retries
**When** the UI renders
**Then** user-visible messaging explains the situation with retry or back-off guidance
**And** no infinite loading states remain without escape (NFR-I2)

### Story 4.3: Skip unavailable track and continue playlist

As a **player**,
I want **to continue the playlist when one track cannot play**,
So that **one bad track doesn’t silently end the night** (FR29).

**Acceptance Criteria:**

**Given** a track is unavailable after defined retries
**When** I choose to skip the track (or accept automatic skip per product rules)
**Then** the session advances with notice and without dropping playlist context
**And** the playlist does not abort without explanation (FR29)

### Story 4.4: Accessibility and feedback consolidation

As a **player and creator**,
I want **WCAG 2.1 AA alignment on core flows and consistent non-color state**,
So that **play and authoring work with keyboard and screen readers** (NFR-A1, NFR-A2, UX-DR14).

**Acceptance Criteria:**

**Given** core author and play flows
**When** audited (automated + targeted manual on mobile)
**Then** contrast, focus visibility, and semantics meet AA for applicable criteria
**And** round outcomes and guesses are not conveyed by color alone (NFR-A2)
**And** inputs remain ≥16px where required to avoid iOS zoom issues (UX-DR1)
