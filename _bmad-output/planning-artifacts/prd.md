---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments: []
workflowType: 'prd'
documentCounts:
  brief: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: mobile_web_app
  domain: general
  complexity: low
  projectContext: greenfield
  productName: oneshot
  productConcept: >-
    Heardle-style music guessing game: each track uses progressive audio clips,
    six attempts, skip, and autocomplete song pick (classic Heardle round structure);
    user-created playlists shared via URL; client-side only; Deezer as music source
    without music login; no accounts or app login.
---

# Product Requirements Document - oneshot

**Author:** Ryan
**Date:** April 2, 2026

## Executive Summary

**oneshot** is a **mobile web** music guessing game modeled on **classic Heardle**: for **each song** in a playlist, players get **up to six attempts** while the app plays **progressively longer snippets** of the track (from about **one second up to sixteen seconds** total across the round). Players **submit guesses** by **selecting the correct title/artist** from **catalog-backed autocomplete** (not just free typing), and may **skip** to hear more audio—**each skip or wrong guess consumes an attempt** and unlocks the next-longer clip, matching the familiar Heardle loop. Anyone can **build a playlist** from **Deezer**-backed tracks, **without accounts or music-service login**. Playlists are **encoded in shareable URLs** (e.g. track IDs in the link) so creators can **update and resend** the same game for friends. The **oneshot** name emphasizes the **playlist challenge** (*can you nail the whole set?*) and a **tight, social session**, while **per-song** play follows **Heardle’s** skip + progressive-reveal + autocomplete pattern.

### What Makes This Special

- **User-authored game content:** The puzzle is **your playlist**, not only a global daily puzzle — **creators** curate; **friends** play.
- **Frictionless sharing:** **URL carries playlist identity** (track IDs), enabling **easy copy/paste, iteration, and resharing** without a backend account model.
- **No login stack:** **Client-only** app, **Deezer** as the audio catalog/source so users **don’t authenticate to a music provider** inside oneshot; **no app accounts** keeps the loop **open a link → play**.

## Project Classification

| Dimension | Value |
|-----------|--------|
| **Project type** | **Mobile web app** (browser-first, touch/mobile UX; may include PWA behaviors as designed) |
| **Domain** | **General** (consumer entertainment / music) |
| **Complexity** | **Low** (domain); implementation still depends on **Deezer API constraints**, **client-only state**, and **URL design** for playlists |
| **Project context** | **Greenfield** |

## Success Criteria

### User Success

- **Recipient:** From a shared link, a user on a **modern mobile browser** can **start a session**, play **Heardle-style rounds** (progressive clips, **skips**, **autocomplete song selection**, **up to six attempts per track**), see **clear feedback** after each guess or skip, and **complete the playlist** without creating an account or logging into music services inside oneshot.
- **Creator:** A user can **assemble a playlist from Deezer-backed tracks**, **generate a shareable URL** that encodes that playlist, **copy and send it**, and **trust that recipients get the same game**.
- **Emotional:** Users describe the experience as **fun and low-friction** (“got a link → played → shared back”) rather than confusing or login-heavy.

### Business Success

- **Ship:** Public **MVP deployed** and link-shareable within the first release cycle.
- **Proof of value:** **Repeated real-world use** (e.g. with friends or a small community), not only demo usage.
- **Sustainability (lightweight):** The product remains **cheap to operate** as **client-only** (no mandatory backend bill for core play).

### Technical Success

- **Mobile web:** Core flows work on **iOS Safari** and **Android Chrome** for target versions you support.
- **Deezer integration:** Audio and metadata usage align with **Deezer’s terms**; failures are **handled in-product** (message, retry, degrade clearly).
- **URL / state:** Playlist encoding fits **practical URL limits** for intended playlist sizes (design explicitly for long playlists if needed: compression, short IDs, or fragment strategy).
- **Security / privacy:** No unnecessary PII collection; **no fake “login”** required for the promised experience.

### Measurable Outcomes

- **Qualitative:** Post-session feedback that **sharing, progressive clips, skips, and autocomplete guessing** (Heardle-style) are the standout hooks.
- **Quantitative (if you add minimal telemetry later):** **Session completion rate** (started → finished playlist), **error rate** on load/play, optional **share link copy** events — **not required for MVP** if you stay analytics-free.

## Product Scope

### MVP - Minimum Viable Product

- **Playlist authoring** (Deezer track IDs / search or picker as designed).
- **URL that encodes the playlist** for sharing and updates.
- **Heardle-style play per track:** **six attempts**, **fixed progressive clip lengths** (**1s / 2s / 4s / 7s / 11s / 16s**), **skip** + **wrong guess** both advance audio, **autocomplete** song pick + per-round feedback; then **advance through the playlist**.
- **Mobile-first UI**, client-only deployment.
- **No accounts**; **no music login** in oneshot.

### Growth Features (Post-MVP)

- **PWA** polish (install prompt, splash, offline shell if useful).
- **Better empty/error states**, loading performance, accessibility pass.
- **Optional lightweight analytics** or share tracking **if** you add consent/infra later.

### Vision (Future)

- **Social/meta ideas** (e.g. streaks, lightweight challenges) only if they stay **link-first**, **account-free**, and preserve the **simple URL contract** and **fixed** Heardle timing.

## User Journeys

### Journey A — Maya (playlist creator), happy path

**Opening:** Maya is in a group chat about music. She wants a **quick, funny challenge** without making everyone sign up for anything.

**Rising action:** She opens **oneshot** on her phone, **searches Deezer** for tracks, **builds a playlist** (inside jokes + bangers), **previews** that the order feels right, and taps **copy link**.

**Climax:** She drops the link in the chat: *“oneshot — Heardle rules, my playlist.”*

**Resolution:** Friends start playing immediately. Maya gets **reactions and replies** without managing accounts or permissions. She **tweaks the playlist** and **resends** when the group wants a rematch.

### Journey B — Jordan (friend / player), happy path

**Opening:** Jordan sees a **link in Messages** and is mildly skeptical (*another app sign-up?*).

**Rising action:** They tap the link; **no login screen** appears. For each song, they hear a **short clip** (Heardle-style progression), can **skip** to unlock **longer clips**, type to **autocomplete** artist/title, and have **up to six attempts** before the round resolves—then they **advance** to the next track in the playlist.

**Climax:** They **guess from autocomplete**, burn a **skip** to reach a recognizable hook, or **fail the round** after six tries—then keep going through Maya’s list.

**Resolution:** They finish the playlist feeling it was **worth the tap**: **fast, social, zero friction**. They might **share the link onward** or ask Maya for another list.

### Journey C — Jordan, edge case — playback / network failure

**Opening:** Jordan is on **spotty LTE** or **Deezer** hiccups.

**Rising action:** Audio **doesn’t start** or **cuts out** mid-round.

**Climax / recovery:** They see a **clear error** (*can’t play this clip / check connection*) with **retry**; if a track is **unavailable**, the app **skips or explains** without dead-ending the whole session.

**Resolution:** They either **recover and continue** or **abandon with understanding** — not with a **silent spinner** or **cryptic failure**.

### Journey D — Maya, edge case — share link problems

**Opening:** Maya **edits the playlist** or shares to a **platform that truncates URLs**.

**Rising action:** A friend says **“link doesn’t work”** or **opens a broken state**.

**Climax / recovery:** The app **detects invalid/truncated playlist data** and shows **what went wrong** (*link incomplete, open in browser, or ask creator to re-copy*).

**Resolution:** Maya **re-copies a full URL** or uses a **supported sharing strategy**; trust is restored when **the same link format always round-trips**.

### Journey E — Deployer / maintainer, light-touch ops

**Opening:** There is **no customer admin console** in MVP; **someone** still ships the **static/client bundle**.

**Rising action:** They **deploy** to hosting, confirm **HTTPS**, **smoke-test** create → share → play on **iOS + Android**.

**Climax:** A real group chat runs a **full session** on production.

**Resolution:** **Low ongoing ops** — no user database to babysit; issues are mostly **Deezer availability**, **browser quirks**, or **URL length** in the wild.

### Journey Requirements Summary

| Area | Requirements suggested by journeys |
|------|-------------------------------------|
| **Authoring** | Search/browse Deezer, add/remove/reorder tracks, preview, **generate/copy URL** |
| **Playback** | **Progressive** clip playback, **skip**, **autocomplete** song selection, **six attempts/round**, **per-guess/skip feedback**, progress through playlist |
| **Sharing** | **URL encodes playlist**; **robust handling** of bad/truncated links |
| **Resilience** | Network/audio errors, **retry**, unavailable track handling |
| **Trust** | **No login** in flow; clear copy when something fails |
| **Release** | **Mobile web** polish for real share targets (Messages, etc.) |

## Web App Specific Requirements

### Project-Type Overview

**oneshot** is a **browser-based SPA**: game state (playlist) is carried in the **URL** and/or client storage patterns you choose; there is **no server-rendered multi-page flow** required for core play. The experience is **mobile-first** (touch, small viewports) with **desktop** acceptable for authoring and testing.

### Technical Architecture Considerations

- **Client-only delivery:** Static hosting of HTML/JS/CSS bundles; **no mandatory backend** for accounts or gameplay.
- **External API:** **Deezer** for catalog/previews per their rules; failures must be **isolated** (retry, skip, user messaging).
- **State model:** **Playlist identity** in shareable links; app must **parse**, **validate**, and **hydrate** game sessions from URLs within **browser URL length** constraints.

### Browser matrix

| Tier | Browsers | Expectation |
|------|-----------|-------------|
| **P0** | iOS Safari (current −1), Android Chrome (current −1) | Full create → share → play |
| **P1** | Desktop Chrome, Safari, Firefox (recent) | Full functionality; layout may differ |
| **P2** | Older mobile browsers | Best-effort; clear unsupported message if needed |

### Responsive design

- **Mobile-first** layouts: single column, large tap targets, minimal chrome during play.
- **Safe areas** for notches/home indicators; **orientation** supported (portrait primary; landscape best-effort).
- **Authoring** and **play** may use slightly different density (e.g. more UI when building a playlist).

### Performance targets

- **Time-to-interactive:** Aim for **fast first paint** on mid-tier mobile; **lazy-load** non-critical UI.
- **Audio:** Minimize **time-to-first-play** after user action; show **loading** per round when clips buffer.
- **Bundle:** Keep JS/CSS **small enough** for mobile networks; code-split where practical.

### SEO strategy

- **MVP:** **No reliance on SEO** for acquisition; **no-index** or minimal marketing page is acceptable if the app is a single shell.
- **Later:** Optional **Open Graph** / Twitter meta for share previews; **public landing** page if you want organic discovery.

### Accessibility level

- Target **WCAG 2.1 Level AA** where feasible for **core flows**: contrast, **focus order**, **labels** for inputs, **non-color-only** success/error feedback.
- **Audio-dependent** gameplay: provide **visible** alternative feedback for outcomes (not just sound); **guess entry** via autocomplete/combobox must be **keyboard and screen-reader** friendly where feasible.

### Implementation considerations

- **HTTPS** required for hosting and for predictable API/audio behavior.
- **CORS / API keys:** Follow Deezer’s **documented client usage**; do not expose secrets in the client if the API forbids it.
- **Deep links:** Opening a shared URL must **restore the same playlist** (or fail clearly).

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP approach:** **Experience MVP** — the smallest product that proves **user-authored playlists + shareable URL + Heardle-style rounds** (progressive clips, skips, six attempts, autocomplete guesses) feels good in **real group chats**, on **target mobile browsers**, with the **music catalog** as the audio source.

**Resource requirements:** **1 person** can ship MVP if they own **frontend + hosting + catalog integration**; **design** and **device QA** help reduce risk. No mandatory backend or ops role for core play.

### MVP feature set (Phase 1)

**Core user journeys supported:**

- **Journey A (Maya):** Build playlist → copy link → share in chat.
- **Journey B (Jordan):** Open link → **Heardle-style rounds per track** (clips, skip, autocomplete, up to six tries) → finish playlist.
- **Minimum edge coverage:** **Journey C/D** — **actionable errors** for playback/network and **bad/truncated URLs** (no silent failure).

**Must-have capabilities:**

- Catalog-backed **track search/selection** and **playlist authoring** (add/remove/reorder as needed for MVP).
- **URL encoding/decoding** of playlist (track identifiers) within **practical length limits**.
- **Heardle-style round per track:** **progressive clips** (fixed schedule: **1s / 2s / 4s / 7s / 11s / 16s** attempt windows), **skip** and **wrong guess** consume attempts and reveal more audio, **autocomplete** selection of song, **advance** through playlist after each round resolves.
- **Mobile-first UI**; **HTTPS** static deploy.
- **No login** for app or music service inside oneshot (per product definition).

**Explicitly out of MVP (unless pulled in):** accounts, leaderboards, analytics, rich SEO, native apps, real-time multiplayer, server-persisted playlists.

### Post-MVP features

**Phase 2 (growth):**

- **PWA** polish, better **loading/error** states, **accessibility** pass, **performance** tuning.
- Optional **OG/meta** for prettier link previews.
- Optional **minimal telemetry** only if aligned with privacy stance.

**Phase 3 (expansion):**

- Broader ideas (social/meta, challenges, etc.) only if **link-first**, **account-free**, **URL contract** holds, and **Heardle timing** stays **fixed**.

### Risk mitigation strategy

**Technical risks:** Catalog availability, **terms**, preview limits, **browser audio** quirks — mitigate with **clear errors**, **retries**, **skip/unavailable** paths, **documented** P0 browser matrix.

**Market risks:** “Another music game” — mitigate by nailing **zero-login + friend playlists** in **real chats**; validate with **repeat sessions** in a small group.

**Resource risks:** Solo dev bandwidth — scope to **single happy path** first; defer **growth** features until **create → share → play** is stable.

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
- **FR4:** Creator can reorder tracks in the current playlist.
- **FR5:** Creator can view the current ordered playlist before sharing.
- **FR6:** Creator can author a playlist without creating an application account.

### Gameplay — Heardle-style rounds (per track)

- **FR7:** Player can start a game session from a valid shared entry point.
- **FR8:** For each playlist track, player can hear a **progressive series of audio snippets** with **fixed** durations **1s, 2s, 4s, 7s, 11s, 16s** mapped to attempts **1–6** (not configurable).
- **FR9:** Player has **at most six attempts** per track to identify the correct song (attempt budget matches snippet stages).
- **FR10:** Player can **submit a guess** by **selecting** a track from **catalog-backed autocomplete suggestions** (e.g. matching typed input to artist/title results).
- **FR11:** Player can **skip** the current attempt to **advance** to the **next longer** snippet **without** submitting the correct answer, consuming **one attempt**.
- **FR12:** When a guess is **incorrect**, the product **consumes an attempt** and **advances** to the next snippet stage (until attempts are exhausted or the song is guessed).
- **FR13:** Player can see **which attempt** they are on (e.g. **1 of 6**) and/or **remaining attempts** for the current track.
- **FR14:** Player receives **immediate feedback** after each **guess** or **skip** (e.g. wrong/correct/skip state) appropriate to the round rules.
- **FR15:** When the player **selects the correct song** from suggestions, the round **resolves as won** for that track.
- **FR16:** When **no attempts remain** without a correct guess, the round **resolves as lost** for that track (product shows answer/reveal per rules).
- **FR17:** After a round resolves, player can **advance** to the next track in the playlist when one exists.
- **FR18:** Player can see **progress** through the playlist (e.g. current index or remaining tracks).
- **FR19:** Player can **complete** the full playlist and see that the run is finished.
- **FR20:** Player can understand **how skipping, guessing, and attempts** work **without** prior training (inline copy or first-run hinting).

### Sharing and link state

- **FR21:** Creator can generate a shareable representation of the playlist suitable for transmission (e.g. link).
- **FR22:** Creator can copy or invoke system share for that representation on supported platforms.
- **FR23:** Recipient can open the shareable entry point and load the **same** playlist content and order (or receive a clear failure if not possible).
- **FR24:** System can detect invalid, incomplete, or untrusted playlist data from an entry point and present an understandable error (not a blank screen).

### Access and identity

- **FR25:** Player can complete core play flows without creating an application account.
- **FR26:** Player can complete core play flows without authenticating to a music service **inside** the application.

### Playback and session resilience

- **FR27:** Player can retry when an audio clip fails to start or play.
- **FR28:** Player can see clear feedback when playback cannot proceed (e.g. network or catalog restriction).
- **FR29:** Player can continue the run when a single track cannot be played, according to defined product rules (e.g. skip track with notice), without aborting the entire playlist silently.

### Creator validation

- **FR30:** Creator can validate the playlist in a **preview** or equivalent experience before sharing (including representative **Heardle-style** play for a track if offered by the product).

## Non-Functional Requirements

*Only categories that matter for **oneshot** (client-only, mobile web, Deezer-backed, no accounts). Each item is **testable**.*

### Performance

- **NFR-P1:** On P0 mobile browsers, the app shell shall reach **first meaningful interaction** (user can tap into author or play flow) within **5 seconds** on a **mid-tier device** over **typical mobile network** conditions, as verified by release smoke tests.
- **NFR-P2:** After the user triggers **play**, **skip**, or **guess submit** for a round, the UI shall show **audible playback**, a **loading state**, or an **error** within **3 seconds** under normal network conditions (no indefinite blank wait).

### Security & privacy

- **NFR-S1:** The app shall be served only over **HTTPS**.
- **NFR-S2:** The client shall comply with **Deezer** (or successor catalog) rules for **credentials and API usage** — no disallowed secrets in shipped client bundles.
- **NFR-S3:** The product shall not store end-user music-service passwords or session tokens for “no music login” flows.

### Scalability (hosting)

- **NFR-SC1:** MVP deployment shall tolerate **viral small-group link sharing** using **static asset hosting** without requiring a dedicated application server for core gameplay.

### Accessibility

- **NFR-A1:** Authoring, play, guess entry (**autocomplete**), and skip controls shall meet **WCAG 2.1 Level AA** for applicable criteria, verified by automated scans plus targeted manual checks on mobile.
- **NFR-A2:** Round outcomes (correct/incorrect/skip) shall use **more than color alone** to convey state.

### Integration (music catalog)

- **NFR-I1:** Search, metadata, and preview playback shall remain within **catalog provider terms** and documented technical constraints (rate limits, geographic availability) as confirmed before release.
- **NFR-I2:** Catalog or network failures shall surface **user-visible errors** with **retry** or **skip** paths where FRs require — no silent permanent hang on catalog calls.

### Reliability

- **NFR-R1:** Invalid or truncated **playlist URLs** shall always resolve to a **documented error state** (see FR24), with **no unhandled script errors** on the primary manual QA path.
