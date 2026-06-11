---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
workflowStatus: complete
completedAt: '2026-06-10'
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
    Single playlist codec module for encode/decode; FR9 split between entry/hydration (Epic 1) and round session (Epic 3);
    Deezer browser-access spike pulled to the front of Epic 2 as the highest external risk; keyboard layer treated as a
    first-class Epic 3 story (not polish); recap/share-back included in Epic 3 MVP because it is the growth loop;
    minimum visible loading/error behavior in Epics 1–3; Epic 4 deepens resilience and consolidates the a11y pass.
---

# oneshot - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **oneshot** (desktop web, GitHub Pages, no authentication), decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

### Epic design notes (advanced elicitation)

- **Playlist contract:** One codec module only (`playlist-codec` per architecture). Epic 1 delivers **decode + validation** for entry URLs; Epic 2 completes **encode** and share output. No second parser in feature code.
- **FR9 planning split:** **FR9a** — parse shared entry, validate payload, hydrate in-memory playlist for routing (**Epic 1**). **FR9b** — begin and run the Heardle session for that playlist (**Epic 3**). PRD FR9 remains a single requirement; this split is for backlog clarity only.
- **External risk first:** The **Deezer browser-access spike** (JSONP vs CORS, preview playback on P0 browsers) is Story 2.1 and should be scheduled as early as possible — it is the only integration that can invalidate downstream assumptions.
- **Keyboard layer is core, not polish:** FR23/NFR-A3 are delivered inside Epic 3 alongside the round loop, because the shortcut registry shapes component design.
- **Recap is MVP:** FR21–FR22 (recap + copy results) live in Epic 3 — the share-back loop is the product's growth mechanism.
- **Resilience:** Epics 1–3 **Definition of Done** includes **non-silent** loading or error UI on decode, catalog, and first clip paths. **Epic 4** adds deeper retry/skip-unavailable behavior and cross-cutting hardening—not the first time users see failures.

## Requirements Inventory

### Functional Requirements

FR1: Creator can search the music catalog for tracks to add to a playlist.

FR2: Creator can add a selected track to the current playlist.

FR3: Creator can remove a track from the current playlist.

FR4: Creator can reorder tracks via drag-and-drop and via keyboard-accessible controls.

FR5: Creator can view the current ordered playlist alongside search at all times (two-pane studio on desktop).

FR6: Creator can author a playlist without creating an application account.

FR7: Creator can preview the audio of any search result or playlist track without leaving the studio.

FR8: Creator can optionally name the playlist; the name travels with the share link and is shown to players.

FR9: Player can start a game session from a valid shared entry point.

FR10: For each playlist track, player can hear a progressive series of audio snippets with fixed durations 1s, 2s, 4s, 7s, 11s, 16s mapped to attempts 1–6 (not configurable).

FR11: Player has at most six attempts per track to identify the correct song.

FR12: Player can submit a guess by selecting a track from catalog-backed autocomplete suggestions.

FR13: Player can skip the current attempt to advance to the next longer snippet, consuming one attempt.

FR14: When a guess is incorrect, the product consumes an attempt and advances to the next snippet stage.

FR15: Player can see which attempt they are on and/or remaining attempts for the current track.

FR16: Player receives immediate feedback after each guess or skip.

FR17: When the player selects the correct song, the round resolves as won.

FR18: When no attempts remain without a correct guess, the round resolves as lost with answer reveal (title, artist, album art where available).

FR19: After a round resolves, player can advance to the next track when one exists.

FR20: Player can see progress through the playlist.

FR21: Player can complete the full playlist and see a recap of the run: per-track outcome and an overall score.

FR22: Player can copy a compact text/emoji representation of their recap suitable for pasting into chat.

FR23: Player can operate the entire round loop with the keyboard, with shortcuts surfaced in the UI.

FR24: Player can understand how skipping, guessing, and attempts work without prior training.

FR25: Player can adjust playback volume; the setting persists for the session.

FR26: Creator can generate a shareable representation of the playlist suitable for transmission (a link).

FR27: Creator can copy that link to the clipboard with visible confirmation.

FR28: Recipient can open the shareable entry point and load the same playlist content and order (or receive a clear failure), including after a full page reload.

FR29: System can detect invalid, incomplete, or untrusted playlist data and present an understandable error (not a blank screen).

FR30: Creator can see URL length awareness in the studio.

FR31: Player can complete core play flows without creating an application account.

FR32: Player can complete core play flows without authenticating to a music service inside the application.

FR33: Player can retry when an audio clip fails to start or play.

FR34: Player can see clear feedback when playback cannot proceed.

FR35: Player can continue the run when a single track cannot be played (skip track with notice), without aborting the playlist silently.

FR36: Creator can test-play a representative Heardle-style round from the studio before sharing.

### NonFunctional Requirements

NFR-P1: On P0 desktop browsers over typical broadband, the app shell shall reach first meaningful interaction within 3 seconds, as verified by release smoke tests.

NFR-P2: After the user triggers play, skip, or guess submit, the UI shall show audible playback, a loading state, or an error within 3 seconds under normal network conditions.

NFR-P3: Studio search results (or a loading state) shall appear within ~1 second of pausing typing under normal conditions.

NFR-S1: The app shall be served only over HTTPS (GitHub Pages).

NFR-S2: The client shall comply with Deezer (or successor catalog) rules for credentials and API usage — no disallowed secrets in shipped client bundles.

NFR-S3: The product shall not store end-user music-service passwords or session tokens.

NFR-SC1: MVP deployment shall tolerate viral small-group link sharing using GitHub Pages static hosting without any application server.

NFR-A1: Authoring, play, guess entry (autocomplete), and skip controls shall meet WCAG 2.1 Level AA for applicable criteria, verified by automated scans plus targeted manual keyboard and screen-reader checks on desktop.

NFR-A2: Round outcomes (correct/incorrect/skip) shall use more than color alone to convey state.

NFR-A3: All keyboard shortcuts shall have visible on-screen equivalents and shall not conflict with browser or assistive-technology defaults on P0 browsers.

NFR-I1: Search, metadata, and preview playback shall remain within catalog provider terms and documented technical constraints (rate limits, geographic availability, browser access pattern) as confirmed before release.

NFR-I2: Catalog or network failures shall surface user-visible errors with retry or skip paths — no silent permanent hang on catalog calls.

NFR-R1: Invalid or truncated playlist URLs shall always resolve to a documented error state with no unhandled script errors on the primary manual QA path.

NFR-R2: A full page reload on any deep link served from GitHub Pages shall restore the same app state encoded in the URL (no 404, no blank shell).

### Additional Requirements

- **Stack:** Vite + React + TypeScript; Tailwind + shadcn/ui (Radix); React Router in **hash mode** (`createHashRouter`); Vite `base` aligned to the GitHub Pages repo path.
- **Hosting:** Static deploy to GitHub Pages via GitHub Actions; hash routing removes the need for a `404.html` fallback; deep links must survive reloads (NFR-R2).
- **Playlist contract:** Single module (`playlist-codec`) for encode/decode/validate; payload in the **hash fragment**, versioned (`v1`), Zod at boundaries; URL payload treated as untrusted; size caps enforced.
- **Deezer:** All catalog access via `src/lib/deezer/*` with a **JSONP-capable transport** (fetch optional if CORS confirmed); adapter DTOs at the boundary; domain types camelCase; no ad-hoc requests from components.
- **Audio:** Single engine in `src/lib/audio/` owning the one `Audio` element, clip-boundary enforcement, elapsed-time clock, and volume; components never construct `Audio`.
- **Keyboard:** Single registry in `src/lib/shortcuts/` with scopes (`play`, `reveal`, `global`), auto-suspend while inputs are focused; drives both behavior and on-screen hint chips; no component-level `keydown` listeners.
- **Recap:** Pure `lib/recap.ts` from run results → emoji grid + score text; Clipboard API for copy.
- **State:** Immutable updates; one source of truth for round state (attempt index, clip stage), playlist progress, and run results.
- **Errors:** User-facing shape with title, body, optional recover action (`retry` | `skip-track` | `copy-link`); route-level error boundary; expected failures as rendered states.
- **Structure:** Feature folders `landing`, `studio`, `play`; `components/game` for game chrome; `components/ui` for primitives only; `lib/` for codec, recap, shortcuts, audio, Deezer, round-model.
- **Naming:** Routes kebab-case; `ROUTES` constants; PascalCase components; hooks `use*`; `CLIP_SCHEDULE_SECONDS` for the PRD ladder.
- **CI/CD:** GitHub Actions build and deploy `dist` to Pages; document `VITE_*` in `.env.example`.
- **Testing:** Co-located unit tests; shared fixtures under `src/test/` for Deezer mocks and a fake audio clock.
- **Deezer compliance:** Confirm browser access pattern (JSONP/CORS), allowed endpoints, and preview behavior against current Deezer docs before release (Story 2.1 spike).

### UX Design Requirements

UX-DR1: Implement design tokens (dark-first color roles incl. muted wrong-guess vs success, cyan→violet gradient reserved for snippet fill/recap accents, typography scale with tabular numerals for timers/scores, 4px spacing base, motion tokens with `prefers-reduced-motion`).

UX-DR2: Root landing page: single primary CTA "Create a playlist," quiet "how it works" strip, simple/modern/clean layout, no competing primary actions, no auth walls.

UX-DR3: Play mode: dark shell, single centered column max-width ~640–720px, minimal chrome during rounds; never stretch across wide monitors.

UX-DR4: Custom **AttemptLadder**: six segments for attempts 1–6 with states used/current/remaining; state not conveyed by color alone.

UX-DR5: Custom **SnippetProgressBar**: segmented 16s bar divided at 1/2/4/7/11/16s boundaries; gradient fill over the unlocked span; dimmed locked span; elapsed/unlocked labels in tabular numerals; `role="progressbar"` with human-readable value text.

UX-DR6: Custom **MissedGuessesList**: append-only wrong picks (title + artist) per round; muted styling; list semantics; internal scroll past ~5 rows; clears on next track.

UX-DR7: Custom **GameShell**: wraps ladder + snippet bar + missed list + guess + skip; consistent vertical rhythm; inline shortcut hint chips.

UX-DR8: **GuessCombobox:** command-palette-style async combobox against Deezer; auto-focus at round start; debounced search; ↑↓/Enter/Esc; focus order guess → skip → post-round actions; global shortcuts suspend while focused.

UX-DR9: **Studio:** two-pane layout ≥1024px (search left ~40%, playlist right ~60%, independent scroll); stacks below 1024px; empty state drives add; share disabled with clear reason when empty.

UX-DR10: **ShareLinkBar:** pinned in playlist pane — truncated URL preview, length meter with warning before limits, Test play secondary, Copy link primary with "Link copied" confirmation.

UX-DR11: **Feedback patterns:** wrong guess muted not alarm red; success reserved for wins/copy; errors with icon, short title, body, primary recovery action.

UX-DR12: **Loading:** skeletons for search and initial clip buffer; buffering shown inline on the Play control; no silent infinite spinners.

UX-DR13: **Responsive:** desktop-first; tablet stacks studio; small screens keep play usable single-column with ≥44px touch targets; no horizontal scroll.

UX-DR14: **Accessibility:** WCAG 2.1 AA on core flows; focus visible; do not disable zoom; semantic regions; hover affordances duplicated on focus (no hover-only functionality); drag-and-drop always mirrored by keyboard reorder buttons.

UX-DR15: **Error UX:** invalid/truncated URL full-screen card with plain language, next steps (re-copy full link), and a secondary "create your own" path.

UX-DR16: Optional dismissible first-run hints for Heardle rules plus a `?` **ShortcutOverlay** dialog listing all bindings; no tutorial wall.

UX-DR17: **Studio rows:** PlaylistRow shared between search-result variant (hover/focus preview + add) and playlist variant (drag handle, ↑/↓ buttons, remove on hover/focus).

UX-DR18: **RevealCard:** post-round answer with album art, title, artist; win pulse vs neutral loss; Next track primary (Enter).

UX-DR19: **RecapGrid:** per-track outcome cells (winning attempt or ✗), score line; visually consistent with the emoji output of Copy results.

### FR Coverage Map

| ID | Epic | Coverage note |
|----|------|-----------------|
| FR1–FR8 | Epic 2 | Studio authoring, preview, naming, account-free creator flows |
| FR9a | Epic 1 | Shared entry: parse, validate, hydrate playlist model |
| FR9b | Epic 3 | Run Heardle session on hydrated playlist |
| FR10–FR25 | Epic 3 | Rounds, guesses, keyboard layer, recap, hints, volume |
| FR26–FR27, FR30 | Epic 2 | Encode link, copy, length meter |
| FR28 | Epic 1 + Epic 2 | Recipient load + reload safety (decode in E1; encode parity in E2) |
| FR29 | Epic 1 | Invalid/incomplete URL error states |
| FR31–FR32 | Epics 1–4 | No app or music login (enforced across flows) |
| FR33–FR35 | Epic 4 (+ baselines in 1–3) | Retry, errors, skip-unavailable |
| FR36 | Epic 2 | Test play before share |
| NFR-P1 | Epic 1 | First meaningful interaction path; smoke-tested |
| NFR-P2 | Epics 3–4 | Post-action feedback timing; hardened in E4 |
| NFR-P3 | Epic 2 | Studio search latency |
| NFR-S1, NFR-SC1 | Epic 1 | HTTPS GitHub Pages static hosting |
| NFR-S2, NFR-S3 | Epics 2–4 | Deezer usage, no secrets, no stored music tokens |
| NFR-A1, NFR-A2 | Epic 4 (+ Epics 2–3 UI) | AA targets; Epic 4 consolidates pass |
| NFR-A3 | Epic 3 | Shortcut layer with visible equivalents |
| NFR-I1, NFR-I2 | Epics 2–4 | Catalog terms, visible failures |
| NFR-R1 | Epic 1 | Documented error state for bad URLs |
| NFR-R2 | Epic 1 | Hash routing reload safety on Pages |
| UX-DR1 | Epics 1–4 | Tokens; Epic 4 verification |
| UX-DR2 | Epic 1 | Landing CTA |
| UX-DR3–UX-DR8, UX-DR18–UX-DR19 | Epic 3 | Play shell, game components, reveal, recap |
| UX-DR9–UX-DR10, UX-DR17 | Epic 2 | Studio panes, share bar, rows |
| UX-DR11–UX-DR12 | Epics 1–4 | Feedback, loading; Epic 4 consistency |
| UX-DR13 | Epics 1–3 | Responsive behavior |
| UX-DR14 | Epic 4 | A11y pass |
| UX-DR15 | Epic 1 | Bad link UX |
| UX-DR16 | Epic 3 | Hints + shortcut overlay |

## Epic List

### Epic 1: Foundation, hosting & link contract

**Goal:** Users open the app or a shared link on HTTPS/GitHub Pages; deep links survive reloads; invalid or truncated links fail with a clear, documented error; root landing has one primary "create playlist" path; no authentication surfaces.

**FRs:** FR9a, FR29; FR28 (recipient decode + reload path); FR31–FR32 (no auth). **NFRs:** NFR-S1, NFR-SC1, NFR-R1, NFR-R2, NFR-P1 (smoke). **UX:** UX-DR2, UX-DR15, baseline UX-DR1/11/12/13.

### Epic 2: Creator Studio & distribution

**Goal:** Creators search Deezer in a two-pane studio, preview instantly, build/reorder/name a playlist, test-play, and copy a shareable URL with length awareness—no accounts.

**FRs:** FR1–FR8, FR26–FR28 (encode + parity with decode), FR30, FR36. **NFRs:** NFR-S2, NFR-I1, NFR-P3. **UX:** UX-DR9, UX-DR10, UX-DR17, UX-DR11–UX-DR13.

### Epic 3: Heardle rounds, keyboard play & recap

**Goal:** Players experience full Heardle-style rounds (fixed clip ladder, autocomplete guess, skip, feedback, win/lose/reveal) entirely playable on the keyboard, progress through the playlist, and finish with a copyable recap.

**FRs:** FR9b, FR10–FR25. **NFRs:** NFR-P2 (with Epic 4), NFR-A3. **UX:** UX-DR3–UX-DR8, UX-DR16, UX-DR18–UX-DR19, UX-DR11–UX-DR13.

### Epic 4: Playback & catalog resilience (hardening)

**Goal:** Audio, catalog, and network failures surface explicit recovery (retry, skip track, plain language); session continues without silent dead ends; accessibility pass consolidates AA across studio and play.

**FRs:** FR33–FR35. **NFRs:** NFR-P2, NFR-I2, NFR-A1, NFR-A2. **UX:** UX-DR11, UX-DR12, UX-DR14.

---

## Epic 1: Foundation, hosting & link contract

Deliver a deployable client-only SPA on GitHub Pages with hash routing, a single playlist codec entry point for **decode**, validated deep links that survive reloads, and accessible failure UX for bad URLs.

### Story 1.1: Scaffold, Pages deploy, and reload-safe routing

As a **deployer**,
I want **the Vite React TS app built with Tailwind + shadcn/ui, hash routing, correct Pages `base`, and a CI deploy workflow**,
So that **static hosting and shared deep links work reliably from day one**.

**Acceptance Criteria:**

**Given** a fresh repo scaffold
**When** the project is configured for GitHub Pages (`vite.config` `base` matching the repo path, `createHashRouter`, GitHub Actions workflow deploying `dist` to Pages)
**Then** the production build loads at the Pages URL over HTTPS
**And** reloading any deep link (e.g. `/#/play?d=...`) restores the same route with no 404 or blank shell (NFR-R2)
**And** `.env.example` documents any `VITE_*` public variables (NFR-S2)

### Story 1.2: Root landing and auth-free route shells

As a **visitor**,
I want **a simple landing with one primary "Create a playlist" action and routes for create/play without sign-in**,
So that **the product promise (no accounts) is obvious immediately** (FR31, FR32, UX-DR2).

**Acceptance Criteria:**

**Given** the app root URL
**When** the landing renders
**Then** there is a single primary CTA to create a playlist and no app or music-service login UI appears anywhere
**And** a quiet "how it works" strip explains link → play → share-back without competing with the CTA
**And** the layout is centered and clean on wide monitors (UX-DR3 principle) and does not break below 640px (UX-DR13)

### Story 1.3: Playlist codec — decode, validate, version

As a **player**,
I want **shared playlist data in the URL fragment to be parsed and validated in one place**,
So that **invalid payloads never silently corrupt gameplay** (FR29, NFR-R1, architecture "single codec").

**Acceptance Criteria:**

**Given** a playlist payload in the hash fragment (`#/play?d=...`)
**When** the codec decodes it
**Then** output is validated with Zod and versioned (`v1`) for future compatibility
**And** malformed, truncated, oversized, or tampered payloads return a structured error object (not thrown strings) for UI use
**And** decoded strings are rendered as text only (no markup injection from titles)
**And** no other module parses playlist parameters ad hoc

### Story 1.4: Invalid-link error experience

As a **recipient**,
I want **a clear full-screen card when a link is bad or truncated**,
So that **I know what happened and what to do next** (FR29, UX-DR15).

**Acceptance Criteria:**

**Given** decode/validation failed for the entry URL
**When** the play (or entry) route loads
**Then** the user sees a plain-language explanation and recovery hints (ask creator to re-copy the full link)
**And** a secondary "Create your own playlist" action offers a soft landing
**And** there is no blank shell and no unhandled runtime error on the primary manual path (NFR-R1)

### Story 1.5: Play entry — hydrate playlist from a valid share link

As a **player**,
I want **opening a valid shared link to load the playlist into the app session**,
So that **I can start gameplay when rounds exist** (FR28 decode path, FR9a).

**Acceptance Criteria:**

**Given** a valid encoded playlist URL
**When** the user opens the link to the play route
**Then** the ordered track list (and optional playlist name) is available in session state for the play feature
**And** the pre-game screen shows the playlist name (or a default) and "track 1 of N"
**And** if the payload is valid but empty, the UI communicates that clearly without crashing

---

## Epic 2: Creator Studio & distribution

Enable Deezer-backed search with instant preview, two-pane playlist editing, URL generation with length awareness, copy confirmation, and test play before sending.

### Story 2.1: Deezer browser-access spike and client module

As a **developer**,
I want **all Deezer access centralized behind a transport-abstracted client, with the browser access pattern (JSONP vs CORS) proven on P0 browsers**,
So that **the riskiest external dependency is validated early and components stay free of ad hoc requests** (architecture, NFR-I1, NFR-S2).

**Acceptance Criteria:**

**Given** current Deezer public/client documentation
**When** the spike runs search and track lookups from a static-hosted page on P0 browsers
**Then** the working transport (JSONP with timeout/cleanup, or fetch if CORS is available) is documented and implemented in `src/lib/deezer/`
**And** preview MP3 URLs are confirmed playable via `HTMLAudioElement` on P0 browsers
**And** responses map through DTO types at the boundary and domain types internally
**And** rate-limit/5xx/timeout failures surface typed error objects suitable for retry UI (NFR-I2 baseline)

### Story 2.2: Two-pane studio with search, preview, and add

As a **creator**,
I want **to search Deezer on the left, preview a track instantly, and add it to my playlist on the right**,
So that **I can build a game list fluidly without an account** (FR1, FR2, FR5, FR6, FR7, UX-DR9, UX-DR17).

**Acceptance Criteria:**

**Given** the studio view at ≥1024px
**When** I type a query
**Then** debounced results (or a skeleton) appear within ~1s of pausing (NFR-P3, UX-DR12)
**And** each result row shows art, title, artist, duration, a preview play/stop control (hover and focus revealed), and an add action
**And** clicking add appends the track to the ordered playlist pane, which remains visible throughout
**And** previews play through the shared audio engine (one at a time; starting one stops another)
**And** below 1024px the panes stack with search above playlist (UX-DR13)
**And** empty search results show a helpful empty state

### Story 2.3: Remove, reorder, and name the playlist

As a **creator**,
I want **to remove tracks, reorder by drag or keyboard, and optionally name my game**,
So that **the game order and identity match my intent** (FR3, FR4, FR8, UX-DR14, UX-DR17).

**Acceptance Criteria:**

**Given** a non-empty playlist
**When** I drag a row by its handle or use the ↑/↓ keyboard-accessible buttons
**Then** the order updates immediately and remains consistent for encoding
**And** remove is available on hover and on focus for each row
**And** an optional name field ("Name your game…") stores a title that travels with the share link
**And** all reorder/remove actions are fully operable by keyboard (UX-DR14)

### Story 2.4: Encode playlist, live share bar, and length awareness

As a **creator**,
I want **a live shareable URL generated from my playlist with a length meter and warnings**,
So that **friends receive working links** (FR26, FR28 encode parity, FR30, UX-DR10).

**Acceptance Criteria:**

**Given** a non-empty playlist
**When** the playlist changes
**Then** the ShareLinkBar updates the encoded URL using the same codec module as decode (single source of truth)
**And** a length meter warns non-blockingly before practical URL limits are exceeded
**And** generated URLs round-trip through Story 1.3 decode to an identical playlist (unit-tested)
**And** the share bar is disabled with a clear reason while the playlist is empty (UX-DR9)

### Story 2.5: Copy link and test play

As a **creator**,
I want **to copy the link with confirmation and test-play a round before sending**,
So that **I'm confident before sharing** (FR27, FR36, UX-DR10).

**Acceptance Criteria:**

**Given** a generated URL
**When** I click Copy link
**Then** the URL is on my clipboard and I see "Link copied" confirmation (toast or inline check with revert)
**And** Test play opens a representative Heardle-style round for a selected track in a dialog without leaving the studio (FR36)
**And** closing test play returns me to the studio with playlist state intact

---

## Epic 3: Heardle rounds, keyboard play & recap

Implement the round state machine, audio engine, game UI shell, guessing, keyboard layer, playlist progression, and the recap/share-back loop.

### Story 3.1: Pure round model and clip schedule

As a **developer**,
I want **a pure module for attempt index, clip durations (1s–16s ladder), legal transitions, and run-result accumulation**,
So that **UI, audio, and recap share one source of truth** (FR10, FR11, architecture `round-model`).

**Acceptance Criteria:**

**Given** the PRD fixed ladder
**When** transitions run for skip, wrong guess, correct guess, or out of attempts
**Then** attempt budget and clip index match PRD rules with unit tests
**And** each resolved round records its outcome (winning attempt or loss) into run results for the recap
**And** constants are named (`CLIP_SCHEDULE_SECONDS`) per architecture conventions

### Story 3.2: Audio engine and snippet playback

As a **player**,
I want **the current snippet to play on demand, stop exactly at the unlocked boundary, and resync when attempts advance**,
So that **I hear the progressive clips fairly** (FR10, FR25, NFR-P2 baseline).

**Acceptance Criteria:**

**Given** a round in progress
**When** I trigger play (user gesture) for the active attempt
**Then** the engine plays the Deezer preview from 0 to exactly the unlocked duration and stops (clock-checked, not timeout-only)
**And** replay is available within the same attempt; advancing attempts extends the boundary
**And** a volume control adjusts playback and persists via localStorage (FR25)
**And** within ~3s under normal conditions I hear audio, see buffering on the play control, or see an error—not silence (NFR-P2; deeper hardening in Epic 4)
**And** all playback flows through `src/lib/audio/` (no stray Audio elements)

### Story 3.3: GameShell, AttemptLadder, segmented SnippetProgressBar, MissedGuessesList

As a **player**,
I want **attempts, clip progress, and wrong guesses visible in one calm layout**,
So that **I always know game state without hunting** (FR15, FR16, UX-DR3–UX-DR7, NFR-A2 baseline).

**Acceptance Criteria:**

**Given** play mode
**When** I view the round
**Then** AttemptLadder shows segments 1–6 with non-color-only used/current/remaining states
**And** SnippetProgressBar renders the full 16s span segmented at 1/2/4/7/11/16s, gradient fill over the unlocked span synced to the audio clock, dimmed locked span, elapsed/unlocked labels in tabular numerals, and `role="progressbar"` with readable value text
**And** MissedGuessesList lists wrong picks (title + artist) with muted styling, list semantics, and internal scroll past ~5 rows
**And** the layout is a centered column max-width ~640–720px that holds at all P0 viewport sizes (UX-DR3)

### Story 3.4: Guess combobox, skip, and round resolution

As a **player**,
I want **to guess via catalog autocomplete, skip attempts, and resolve rounds with clear feedback and reveal**,
So that **the Heardle loop feels fair and legible** (FR12–FR18, UX-DR8, UX-DR11, UX-DR18).

**Acceptance Criteria:**

**Given** an active round
**When** I submit a wrong guess from the combobox
**Then** an attempt is consumed, the next snippet unlocks, and the wrong pick appears in MissedGuessesList
**When** I skip
**Then** an attempt is consumed and no missed-guess row is added
**When** I pick the correct song
**Then** the round wins immediately with success feedback and a RevealCard (art, title, artist)
**When** attempts are exhausted without a win
**Then** I see the loss RevealCard with the answer in a neutral-to-warm tone
**And** the combobox auto-focuses at round start, debounces search, supports ↑↓/Enter/Esc, and prevents free-text submissions (catalog rows only)
**And** focus order remains guess → skip → post-round actions (UX-DR8)

### Story 3.5: Keyboard layer and shortcut discoverability

As a **player**,
I want **the entire round loop operable from the keyboard with visible shortcut hints**,
So that **a full playlist run flows without the mouse** (FR23, NFR-A3, UX-DR7, UX-DR16).

**Acceptance Criteria:**

**Given** play mode
**When** I use only the keyboard
**Then** I can play/replay the snippet (Space), type and submit a guess (Enter), skip, advance after reveal (Enter/→), and open the shortcut reference (`?`)
**And** all bindings are registered in the single shortcut registry with scopes, and suspend while text inputs are focused (except input-native Enter/Esc semantics)
**And** inline hint chips render beside controls from the same registry data, and the `?` overlay lists all bindings (NFR-A3)
**And** no binding conflicts with browser or AT defaults on P0 browsers

### Story 3.6: Playlist progression, recap, and copy results

As a **player**,
I want **to move through the playlist, finish with a recap, and copy an emoji results grid**,
So that **I can complete the set and share my score back into chat** (FR19–FR22, FR24, UX-DR16, UX-DR19).

**Acceptance Criteria:**

**Given** a resolved round
**When** more tracks remain
**Then** I can advance to the next track and always see playlist position (x of y)
**When** no tracks remain
**Then** I see a recap: per-track outcome cells (winning attempt or ✗), an overall score line, and primary Copy results
**And** Copy results places a compact emoji grid + score + game link on the clipboard with confirmation, matching the on-screen grid (unit-tested via `lib/recap.ts`)
**And** optional dismissible first-run hints explain skip vs guess and the attempt budget without blocking play (FR24, UX-DR16)

---

## Epic 4: Playback & catalog resilience (hardening)

Deepen failure handling and accessibility so real-world networks and catalog limits do not dead-end sessions.

### Story 4.1: Audio failure retry and explicit playback errors

As a **player**,
I want **retry and clear messaging when a clip fails**,
So that **I'm never stuck on a silent spinner** (FR33, FR34, NFR-P2, UX-DR11–UX-DR12).

**Acceptance Criteria:**

**Given** a clip fails to start or play
**When** I use retry
**Then** the app attempts recovery and shows loading or error within the PRD timing budget
**And** errors include title, body, and a primary recovery action (architecture error shape)

### Story 4.2: Catalog and network failure surfaces

As a **player or creator**,
I want **catalog downtime or rate limits to show actionable errors in both play and studio**,
So that **I understand it's not just "the game broke"** (NFR-I2, FR34).

**Acceptance Criteria:**

**Given** search or preview calls fail after capped retries with backoff
**When** the UI renders
**Then** user-visible messaging explains the situation with retry or back-off guidance
**And** no infinite loading states remain without escape in either studio or play (NFR-I2)

### Story 4.3: Skip unavailable track and continue playlist

As a **player**,
I want **to continue the playlist when one track cannot play**,
So that **one bad track doesn't silently end the session** (FR35).

**Acceptance Criteria:**

**Given** a track is unavailable after defined retries
**When** I choose to skip the track (or accept automatic skip per product rules)
**Then** the session advances with notice, the recap marks the track as unplayable (distinct from a loss), and playlist context is preserved
**And** the playlist does not abort without explanation (FR35)

### Story 4.4: Accessibility and feedback consolidation

As a **player and creator**,
I want **WCAG 2.1 AA alignment on core flows, consistent non-color state, and verified keyboard/SR paths**,
So that **play and authoring work with keyboard and screen readers** (NFR-A1, NFR-A2, UX-DR14).

**Acceptance Criteria:**

**Given** core studio and play flows
**When** audited (axe/Lighthouse in CI plus manual keyboard and VoiceOver/NVDA passes on guess, round resolve, and reorder paths)
**Then** contrast, focus visibility, and semantics meet AA for applicable criteria
**And** round outcomes and guesses are not conveyed by color alone (NFR-A2)
**And** all hover-revealed actions are reachable via focus; drag reorder is fully mirrored by keyboard controls (UX-DR14)
**And** `prefers-reduced-motion` disables non-essential animation (win pulse, slide-ins)
