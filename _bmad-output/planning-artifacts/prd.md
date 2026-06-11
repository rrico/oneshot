

# Product Requirements Document - oneshot

**Author:** Ryan
**Date:** June 10, 2026

## Executive Summary

**oneshot** is a **desktop web** music guessing game modeled on **classic Heardle**: for **each song** in a playlist, players get **up to six attempts** while the app plays **progressively longer snippets** of the track (from about **one second up to sixteen seconds** total across the round). Players **submit guesses** by **selecting the correct title/artist** from **catalog-backed autocomplete** (not just free typing), and may **skip** to hear more audio—**each skip or wrong guess consumes an attempt** and unlocks the next-longer clip, matching the familiar Heardle loop. Anyone can **build a playlist** from **Deezer**-backed tracks, **without accounts or music-service login**. Playlists are **encoded in shareable URLs** (track IDs in the link) so creators can **update and resend** the same game for friends. The app is a **static site hosted on GitHub Pages**—no backend, no database, no authentication of any kind.

The desktop format unlocks two experiences the mobile concept could not deliver well:

- **Creator Studio:** a **two-pane authoring workspace** (search on the left, playlist on the right) with **instant hover-preview** of tracks, **drag-and-drop reordering**, and a **live share-link bar**—building a 10-track game should take under two minutes.
- **Keyboard-first play:** the round loop maps to keys (**Space** to play/replay, type to guess, **Enter** to submit, **Tab + Enter** or a shortcut to skip), so a full playlist run flows without touching the mouse. At the end of a run, players get a **recap screen** with a **copyable emoji results grid** (Wordle-style) to paste back into the chat where the link came from.

### What Makes This Special

- **User-authored game content:** The puzzle is **your playlist**, not only a global daily puzzle — **creators** curate; **friends** play.
- **Frictionless sharing:** **URL carries playlist identity** (track IDs), enabling **easy copy/paste, iteration, and resharing** without a backend account model.
- **No login stack:** **Client-only** app on **GitHub Pages**, **Deezer** as the audio catalog/source so users **don't authenticate to a music provider** inside oneshot; **no app accounts** keeps the loop **open a link → play**.
- **Share-back loop:** The **emoji recap grid** turns every play session into a reply in the group chat, prompting the next round of links.

## Project Classification

| Dimension | Value |
|-----------|--------|
| **Project type** | **Desktop web app** (browser-first, keyboard/pointer UX; responsive down to smaller viewports as best-effort) |
| **Hosting** | **GitHub Pages** (static, HTTPS, no server) — **hard requirement** |
| **Authentication** | **None** — no app accounts, no music-service login — **hard requirement** |
| **Domain** | **General** (consumer entertainment / music) |
| **Complexity** | **Low** (domain); implementation still depends on **Deezer API constraints**, **client-only state**, and **URL design** for playlists |
| **Project context** | **Greenfield** |

## Success Criteria

### User Success

- **Recipient:** From a shared link, a user on a **modern desktop browser** can **start a session**, play **Heardle-style rounds** (progressive clips, **skips**, **autocomplete song selection**, **up to six attempts per track**), see **clear feedback** after each guess or skip, **complete the playlist**, and **copy a recap** to share back—without creating an account or logging into music services.
- **Creator:** A user can **assemble a playlist from Deezer-backed tracks** in the **two-pane studio**, **preview any candidate track instantly**, **reorder by drag-and-drop**, **test-play** a round before sharing, **copy a shareable URL** that encodes that playlist, and **trust that recipients get the same game**.
- **Emotional:** Users describe the experience as **fun and low-friction** ("got a link → played → pasted my score back") rather than confusing or login-heavy.

### Business Success

- **Ship:** Public **MVP deployed to GitHub Pages** and link-shareable within the first release cycle.
- **Proof of value:** **Repeated real-world use** (e.g. with friends or a small community), not only demo usage.
- **Sustainability:** The product remains **free to operate** — GitHub Pages hosting plus public Deezer endpoints means **zero infrastructure cost** for core play.

### Technical Success

- **Desktop web:** Core flows work on **Chrome, Firefox, Safari, and Edge** (current −1) on desktop OSes.
- **Deezer integration:** Audio and metadata usage align with **Deezer's terms**; failures are **handled in-product** (message, retry, degrade clearly).
- **URL / state:** Playlist encoding fits **practical URL limits** for intended playlist sizes (compression, short IDs, fragment strategy as designed).
- **GitHub Pages:** Deep links and page reloads **resolve correctly** despite Pages having no server-side rewrites (hash routing or 404 fallback).
- **Security / privacy:** No PII collection; **no fake "login"** anywhere in the experience.

### Measurable Outcomes

- **Qualitative:** Post-session feedback that **sharing, progressive clips, keyboard flow, and the recap grid** are the standout hooks.
- **Quantitative (if minimal telemetry is ever added):** **Session completion rate** (started → finished playlist), **recap copy** events, **error rate** on load/play — **not required for MVP**; the app stays analytics-free by default.

## Product Scope

### MVP - Minimum Viable Product

- **Creator Studio:** two-pane authoring (Deezer search + playlist), instant track preview, add/remove, **drag-and-drop and keyboard reorder**, optional playlist title.
- **URL that encodes the playlist** for sharing and updates; live link bar with copy confirmation and length awareness.
- **Heardle-style play per track:** **six attempts**, **fixed progressive clip lengths** (**1s / 2s / 4s / 7s / 11s / 16s**), **skip** + **wrong guess** both advance audio, **autocomplete** song pick + per-round feedback; then **advance through the playlist**.
- **Keyboard-first play controls** with on-screen shortcut hints.
- **Run recap:** per-track results, score, **copyable emoji grid**.
- **Desktop-first UI**, client-only **GitHub Pages** deployment.
- **No accounts**; **no music login** in oneshot.

### Growth Features (Post-MVP)

- **Open Graph / link preview** metadata for prettier shares.
- **Better empty/error states**, loading performance, deeper accessibility pass.
- **Creator extras:** shuffle-per-player flag, per-track start-offset selection, duplicate-link detection.
- **Optional lightweight analytics** only if consent/infra is added later.

### Vision (Future)

- **Social/meta ideas** (e.g. streaks, lightweight async challenges, score comparison via pasted recaps) only if they stay **link-first**, **account-free**, and preserve the **simple URL contract** and **fixed** Heardle timing.

## User Journeys

### Journey A — Maya (playlist creator), happy path

**Opening:** Maya is in a group chat about music. She wants a **quick, funny challenge** without making everyone sign up for anything.

**Rising action:** She opens **oneshot** in a browser tab, lands in the **Creator Studio**: search box on the left, empty playlist on the right. She types an artist, **hovers a result to hear a snippet instantly**, clicks **add**, repeats for ten tracks (inside jokes + bangers), **drags two tracks** into a better order, optionally names the list "*roadtrip rejects*", and clicks **test play** to confirm round one feels right.

**Climax:** She clicks **Copy link** ("Link copied ✓") and drops it in the chat: *"oneshot — Heardle rules, my playlist."*

**Resolution:** Friends start playing immediately. Scores start arriving as **pasted emoji grids**. Maya **tweaks the playlist** and **resends** when the group wants a rematch.

### Journey B — Jordan (friend / player), happy path

**Opening:** Jordan sees a **link in the chat** on their laptop and is mildly skeptical (*another app sign-up?*).

**Rising action:** They click the link; **no login screen** appears—just the game with the playlist name and "track 1 of 10." They press **Space**, hear a **one-second clip**, type a few letters, and pick from **autocomplete**. Wrong—the guess drops into the **missed list**, the next-longer clip unlocks. They **skip** once to reach a recognizable hook.

**Climax:** They **nail track 3 on the first second** and feel like a genius; they **fail track 7 entirely** and see the reveal with album art. The whole run flows on the keyboard.

**Resolution:** The **recap screen** shows their results grid; they click **Copy results** and paste **🟩⬛🟨...** back into the chat. **Worth the click**: fast, social, zero friction.

### Journey C — Jordan, edge case — playback / network failure

**Opening:** Jordan is on **flaky hotel Wi-Fi** or **Deezer** hiccups.

**Rising action:** Audio **doesn't start** or **cuts out** mid-round.

**Climax / recovery:** They see a **clear error** (*can't play this clip / check connection*) with **retry**; if a track is **unavailable**, the app **skips it with notice** without dead-ending the whole session.

**Resolution:** They either **recover and continue** or **abandon with understanding** — not with a **silent spinner** or **cryptic failure**.

### Journey D — Maya, edge case — share link problems

**Opening:** Maya **edits the playlist** or shares to a **platform that truncates URLs**.

**Rising action:** A friend says **"link doesn't work"** or **opens a broken state**.

**Climax / recovery:** The app **detects invalid/truncated playlist data** and shows **what went wrong** (*link incomplete — ask the creator to re-copy the full link*).

**Resolution:** Maya **re-copies a full URL**; the studio's **length awareness** warned her before it became a problem. Trust is restored when **the same link format always round-trips**.

### Journey E — Deployer / maintainer, light-touch ops

**Opening:** There is **no customer admin console** in MVP; **someone** still ships the **static bundle**.

**Rising action:** A push to the default branch triggers **GitHub Actions**, which builds and **deploys to GitHub Pages**. They confirm **HTTPS**, **smoke-test** create → share → play in two desktop browsers.

**Climax:** A real group chat runs a **full session** on production.

**Resolution:** **Zero ongoing ops** — no servers, no database; issues are mostly **Deezer availability**, **browser quirks**, or **URL length** in the wild.

### Journey Requirements Summary

| Area | Requirements suggested by journeys |
|------|-------------------------------------|
| **Authoring** | Two-pane studio: search/browse Deezer, instant preview, add/remove/reorder (drag + keyboard), name list, test play, **generate/copy URL** |
| **Playback** | **Progressive** clip playback, **skip**, **autocomplete** song selection, **six attempts/round**, **per-guess/skip feedback**, progress through playlist, **keyboard shortcuts** |
| **Recap** | End-of-run results, **copyable emoji grid** for share-back |
| **Sharing** | **URL encodes playlist**; **robust handling** of bad/truncated links; in-studio length awareness |
| **Resilience** | Network/audio errors, **retry**, unavailable track handling |
| **Trust** | **No login** in flow; clear copy when something fails |
| **Release** | **GitHub Pages** deploy via CI; smoke-test on desktop browser matrix |

## Web App Specific Requirements

### Project-Type Overview

**oneshot** is a **browser-based SPA**: game state (playlist) is carried in the **URL**; there is **no server-rendered multi-page flow** and **no backend**. The experience is **desktop-first** (pointer + keyboard, generous viewports) with **smaller viewports usable** at reduced fidelity. Static hosting on **GitHub Pages** is a hard constraint that shapes routing and asset strategy.

### Technical Architecture Considerations

- **Client-only delivery:** Static HTML/JS/CSS on GitHub Pages; **no mandatory backend** for accounts or gameplay.
- **External API:** **Deezer** for catalog/previews per their rules; browser-callable access pattern (CORS/JSONP as documented) must be confirmed; failures must be **isolated** (retry, skip, user messaging).
- **State model:** **Playlist identity** in shareable links; app must **parse**, **validate**, and **hydrate** game sessions from URLs within **browser URL length** constraints.
- **GitHub Pages routing:** no server rewrites — use **hash-based routing** (recommended; payload lives in the fragment, immune to path rewrites) or a `404.html` fallback.

### Browser matrix

| Tier | Browsers | Expectation |
|------|-----------|-------------|
| **P0** | Desktop Chrome, Firefox, Safari, Edge (current −1) | Full create → share → play, keyboard flow |
| **P1** | iPad / tablet browsers (recent) | Full functionality; layout adapts |
| **P2** | Mobile browsers | Play flow usable single-column; studio best-effort; no hard breakage |

### Responsive design

- **Desktop-first** layouts: the studio uses a **two-pane grid ≥1024px**; play uses a **centered column (~640–720px)** so wide monitors don't sprawl.
- Below ~1024px the studio **stacks to one column** (search above playlist); play layout is already narrow and degrades gracefully.
- **Hover affordances** (preview-on-hover, row actions) always have **click/keyboard equivalents** so smaller/touch devices are not locked out.

### Performance targets

- **Time-to-interactive:** Fast first paint on a typical broadband desktop; **lazy-load** the studio vs play routes.
- **Audio:** Minimize **time-to-first-play** after user action; show **loading** per round when clips buffer.
- **Bundle:** Keep JS/CSS lean; code-split studio and play.

### SEO strategy

- **MVP:** **No reliance on SEO** for acquisition; minimal landing content is acceptable.
- **Later:** Optional **Open Graph** / Twitter meta for share previews.

### Accessibility level

- Target **WCAG 2.1 Level AA** for **core flows**: contrast, **focus order**, **labels** for inputs, **non-color-only** success/error feedback.
- **Keyboard-first by design:** every play action (play/replay, guess, skip, advance) and every studio action (search, add, remove, reorder) is fully operable by keyboard; shortcuts are **discoverable** (on-screen hints / `?` overlay) and never the only path.
- **Audio-dependent** gameplay: provide **visible** alternative feedback for outcomes (not just sound); **guess entry** via combobox must be **screen-reader** friendly.

### Implementation considerations

- **HTTPS** is provided by GitHub Pages.
- **CORS / API keys:** Follow Deezer's **documented client usage**; no secrets in the client bundle.
- **Deep links:** Opening a shared URL must **restore the same playlist** (or fail clearly), including after a **full page reload** on GitHub Pages.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP approach:** **Experience MVP** — the smallest product that proves **user-authored playlists + shareable URL + Heardle-style rounds + share-back recap** feels good in **real group chats**, on **desktop browsers**, with **Deezer** as the audio source and **GitHub Pages** as the only infrastructure.

**Resource requirements:** **1 person** can ship MVP if they own **frontend + Pages deploy + catalog integration**; **design** and **cross-browser QA** help reduce risk. No backend or ops role exists.

### MVP feature set (Phase 1)

**Core user journeys supported:**

- **Journey A (Maya):** Studio: build playlist → test play → copy link → share in chat.
- **Journey B (Jordan):** Open link → **Heardle-style rounds per track** → finish playlist → **copy recap**.
- **Minimum edge coverage:** **Journey C/D** — **actionable errors** for playback/network and **bad/truncated URLs** (no silent failure).

**Must-have capabilities:**

- Catalog-backed **track search/selection** with **instant preview** and **playlist authoring** (add/remove/reorder).
- **URL encoding/decoding** of playlist (track identifiers + optional title) within **practical length limits**.
- **Heardle-style round per track:** **progressive clips** (fixed schedule: **1s / 2s / 4s / 7s / 11s / 16s**), **skip** and **wrong guess** consume attempts and reveal more audio, **autocomplete** selection of song, **advance** through playlist after each round resolves.
- **Keyboard shortcuts** for the play loop with visible hints.
- **Run recap** with copyable emoji grid.
- **Desktop-first UI**; **GitHub Pages** static deploy via CI.
- **No login** for app or music service inside oneshot.

**Explicitly out of MVP (unless pulled in):** accounts, leaderboards, analytics, rich SEO, native apps, real-time multiplayer, server-persisted playlists.

### Post-MVP features

**Phase 2 (growth):**

- **OG/meta** for link previews, better **loading/error** states, **accessibility** pass, **performance** tuning.
- Creator extras: shuffle flag, clip start-offsets, smarter duplicate detection.
- Optional **minimal telemetry** only if aligned with privacy stance.

**Phase 3 (expansion):**

- Broader ideas (social/meta, challenges) only if **link-first**, **account-free**, the **URL contract** holds, and **Heardle timing** stays **fixed**.

### Risk mitigation strategy

**Technical risks:** Catalog availability, **terms**, preview limits, **browser audio autoplay policies** — mitigate with **user-gesture-initiated playback**, **clear errors**, **retries**, **skip/unavailable** paths, documented P0 browser matrix.

**Market risks:** "Another music game" — mitigate by nailing **zero-login + friend playlists + share-back recap** in **real chats**; validate with **repeat sessions** in a small group.

**Resource risks:** Solo dev bandwidth — scope to **single happy path** first; defer **growth** features until **create → share → play → recap** is stable.

## Functional Requirements

*Sourced from discovery, MVP scope, and **classic Heardle-style** rules (six progressively longer snippets from ~1s to ~16s per song; wrong guesses and skips advance the round). FRs state **capabilities** (what), not implementation.*

### Heardle-aligned round model (per playlist track)

- **Reference:** **Six attempts** per song with **progressively longer audio** (total span **1–16 seconds**). **Fixed** per-attempt snippet lengths: **1s, 2s, 4s, 7s, 11s, 16s** (attempts **1–6**). This schedule is **not configurable**.
- **Guessing:** Players **select** the song from **autocomplete** suggestions (artist/title), not unlimited free-text scoring alone.
- **Skip:** **Skip** uses an attempt and moves to the **next longer** snippet (same as classic Heardle behavior).
- **Wrong guess:** Consumes an attempt and advances to the **next** snippet.

### Playlist authoring

- **FR1:** Creator can search the music catalog for tracks to add to a playlist.
- **FR2:** Creator can add a selected track to the current playlist.
- **FR3:** Creator can remove a track from the current playlist.
- **FR4:** Creator can reorder tracks in the current playlist via drag-and-drop and via keyboard-accessible controls.
- **FR5:** Creator can view the current ordered playlist alongside search at all times (two-pane studio on desktop).
- **FR6:** Creator can author a playlist without creating an application account.
- **FR7:** Creator can preview the audio of any search result or playlist track before/after adding it, without leaving the studio.
- **FR8:** Creator can optionally name the playlist; the name travels with the share link and is shown to players.

### Gameplay — Heardle-style rounds (per track)

- **FR9:** Player can start a game session from a valid shared entry point.
- **FR10:** For each playlist track, player can hear a **progressive series of audio snippets** with **fixed** durations **1s, 2s, 4s, 7s, 11s, 16s** mapped to attempts **1–6** (not configurable).
- **FR11:** Player has **at most six attempts** per track to identify the correct song (attempt budget matches snippet stages).
- **FR12:** Player can **submit a guess** by **selecting** a track from **catalog-backed autocomplete suggestions** (matching typed input to artist/title results).
- **FR13:** Player can **skip** the current attempt to **advance** to the **next longer** snippet **without** submitting the correct answer, consuming **one attempt**.
- **FR14:** When a guess is **incorrect**, the product **consumes an attempt** and **advances** to the next snippet stage (until attempts are exhausted or the song is guessed).
- **FR15:** Player can see **which attempt** they are on (e.g. **1 of 6**) and/or **remaining attempts** for the current track.
- **FR16:** Player receives **immediate feedback** after each **guess** or **skip** (wrong/correct/skip state) appropriate to the round rules.
- **FR17:** When the player **selects the correct song** from suggestions, the round **resolves as won** for that track.
- **FR18:** When **no attempts remain** without a correct guess, the round **resolves as lost** for that track (product shows answer/reveal, including title, artist, and album art where available).
- **FR19:** After a round resolves, player can **advance** to the next track in the playlist when one exists.
- **FR20:** Player can see **progress** through the playlist (e.g. current index or remaining tracks).
- **FR21:** Player can **complete** the full playlist and see a **recap** of the run: per-track outcome (won at attempt n / lost) and an overall score.
- **FR22:** Player can **copy a compact text/emoji representation** of their recap suitable for pasting into chat.
- **FR23:** Player can operate the **entire round loop with the keyboard**: play/replay the snippet, focus and type a guess, submit, and skip — with shortcuts surfaced in the UI.
- **FR24:** Player can understand **how skipping, guessing, and attempts** work **without** prior training (inline copy, on-screen hints, or first-run hinting).
- **FR25:** Player can adjust playback **volume**, and the setting persists for the session.

### Sharing and link state

- **FR26:** Creator can generate a shareable representation of the playlist suitable for transmission (a link).
- **FR27:** Creator can copy that link to the clipboard with visible confirmation.
- **FR28:** Recipient can open the shareable entry point and load the **same** playlist content and order (or receive a clear failure if not possible), including after a full page reload.
- **FR29:** System can detect invalid, incomplete, or untrusted playlist data from an entry point and present an understandable error (not a blank screen).
- **FR30:** Creator can see **URL length awareness** in the studio (warning before practical limits are exceeded).

### Access and identity

- **FR31:** Player can complete core play flows without creating an application account.
- **FR32:** Player can complete core play flows without authenticating to a music service **inside** the application.

### Playback and session resilience

- **FR33:** Player can retry when an audio clip fails to start or play.
- **FR34:** Player can see clear feedback when playback cannot proceed (e.g. network or catalog restriction).
- **FR35:** Player can continue the run when a single track cannot be played (skip track with notice), without aborting the entire playlist silently.

### Creator validation

- **FR36:** Creator can **test-play** a representative Heardle-style round from the studio before sharing.

## Non-Functional Requirements

*Only categories that matter for **oneshot** (client-only, desktop web, Deezer-backed, GitHub Pages, no accounts). Each item is **testable**.*

### Performance

- **NFR-P1:** On P0 desktop browsers over typical broadband, the app shell shall reach **first meaningful interaction** (user can enter studio or play flow) within **3 seconds**, as verified by release smoke tests.
- **NFR-P2:** After the user triggers **play**, **skip**, or **guess submit** for a round, the UI shall show **audible playback**, a **loading state**, or an **error** within **3 seconds** under normal network conditions (no indefinite blank wait).
- **NFR-P3:** Studio search results (or a loading state) shall appear within **1 second** of pausing typing under normal conditions, to keep the authoring loop fluid.

### Security & privacy

- **NFR-S1:** The app shall be served only over **HTTPS** (provided by GitHub Pages).
- **NFR-S2:** The client shall comply with **Deezer** (or successor catalog) rules for **credentials and API usage** — no disallowed secrets in shipped client bundles.
- **NFR-S3:** The product shall not store end-user music-service passwords or session tokens for "no music login" flows.

### Scalability (hosting)

- **NFR-SC1:** MVP deployment shall tolerate **viral small-group link sharing** using **GitHub Pages static hosting** without requiring any application server for core gameplay.

### Accessibility

- **NFR-A1:** Authoring, play, guess entry (**autocomplete**), and skip controls shall meet **WCAG 2.1 Level AA** for applicable criteria, verified by automated scans plus targeted manual keyboard and screen-reader checks on desktop.
- **NFR-A2:** Round outcomes (correct/incorrect/skip) shall use **more than color alone** to convey state.
- **NFR-A3:** All keyboard shortcuts shall have visible on-screen equivalents; shortcuts shall not conflict with browser or assistive-technology defaults on P0 browsers.

### Integration (music catalog)

- **NFR-I1:** Search, metadata, and preview playback shall remain within **catalog provider terms** and documented technical constraints (rate limits, geographic availability, browser access pattern) as confirmed before release.
- **NFR-I2:** Catalog or network failures shall surface **user-visible errors** with **retry** or **skip** paths where FRs require — no silent permanent hang on catalog calls.

### Reliability

- **NFR-R1:** Invalid or truncated **playlist URLs** shall always resolve to a **documented error state** (see FR29), with **no unhandled script errors** on the primary manual QA path.
- **NFR-R2:** A full page **reload on any deep link** served from GitHub Pages shall restore the same app state encoded in the URL (no 404, no blank shell).
