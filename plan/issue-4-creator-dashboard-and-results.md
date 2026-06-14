# Issue #4 — Creator Dashboard & Play Results

> **Status:** Ready for implementation  
> **Constraint:** No account creation for creators or players

---

## Overview

After a creator shares a game link, friends play it. Today the creator has no way to see how anyone did. This feature adds:

1. A **creator token** system so a creator can claim ownership of a game without an account
2. **Result submission** when a player finishes a game
3. A **results page** visible to the creator and to anyone who has completed the game
4. A **dashboard** listing all games a creator has made, sourced from localStorage

---

## Architecture

### Creator token

When `POST /api/games` creates a game, a second secret token is generated alongside the game code. Only the creator receives this token — it never appears in the player-facing share link (`/g/:code`).

**Redis schema change:**
```
game:{code}  →  { trackIds, title, creatorToken: "<32-char alphanumeric secret>" }
```

**API response change:**
```json
POST /api/games → { "code": "abc1234", "creatorToken": "k9z2m..." }
```

The `creatorToken` uses the same character set as game codes (`a-z0-9`) but is 32 characters long (~165 bits of entropy). It lives in two places only:
- The creator's `localStorage` (`oneshot:games` array, on the device that created the game)
- The creator link URL (`/dashboard/abc1234?token=k9z2m...`)

### Player session tracking

When a player completes a game, their `sessionId` (a random UUID) is stored in `localStorage` under `oneshot:played:{code}`. This persists across browser sessions so the player can return later and prove they completed the game to access the results view.

> **Why `localStorage` and not `sessionStorage`?**  
> `sessionStorage` is cleared when the tab closes. If stored there, a player who finishes on their phone and then tries to open the results link later would be locked out. `localStorage` keyed by game code keeps the session ID available indefinitely on that device without tracking the user across unrelated games.

### Results storage

```
results:{code}  →  Redis list of serialized play result objects
```

- TTL matches the game: **90 days** from game creation
- Capped at **1000 entries** (LTRIM after each push) to prevent unbounded growth on viral games
- Each push sets/refreshes the TTL on the key to align with the parent game's expiry

### Client localStorage

Every time a game is created, append an entry to `oneshot:games`:

```json
{
  "code": "abc1234",
  "creatorToken": "k9z2m...",
  "title": "Summer Hits",
  "trackCount": 8,
  "createdAt": 1718000000
}
```

This is the source of truth for "all games I've made." It is device-specific by design — the creator link URL is the cross-device mechanism.

---

## Playlist titles

Titles are how a creator finds their old games in the dashboard. Today the title field is optional and easy to miss. Two changes are required:

### 1. Prompt before sharing

When the creator hits "Share game" without a title entered, show an inline prompt (not a blocking modal) with a generated name pre-filled. The creator can:
- Accept the generated name (one tap)
- Edit it
- Skip entirely (game saved as untitled)

The prompt appears within the existing ShareLinkBar UI — the title input scrolls into focus and the generated name is inserted as the value. The "Share" button becomes "Confirm & share."

### 2. Generated name algorithm

Generated names are composed at share time from the track list. Rules in priority order:

**Rule 1 — Single artist**
If all tracks are by the same artist:
> `"{Artist} Challenge"` — e.g. "David Bowie Challenge", "Foo Fighters Challenge"

**Rule 2 — Two dominant artists**
If 2 artists together account for ≥70% of tracks:
> `"{Artist1} vs {Artist2}"` — e.g. "Bowie vs Bono"
(Use last name / short name if artist name is long)

**Rule 3 — Multi-artist, pick a title word**
Find the most evocative word from all track titles (excluding stop words: the, a, an, in, of, on, it, is, my, me, you, your, I, and, or, to, at). Pick the longest remaining word or the most unique one:
> `"The {Word} Mix"` — e.g. "The Heroes Mix", "The Thunder Mix"

**Rule 4 — Fallback**
If all title words are stop words or the track list is empty:
> `"{N}-Track Throwdown"` — e.g. "6-Track Throwdown"

All generated names are title-cased. The algorithm runs entirely client-side with no additional API calls.

---

## New API endpoints

### `POST /api/games/{code}/results`

Called when a player reaches the recap screen. **Not** called from the Studio test-play dialog.

**Request body:**
```json
{
  "sessionId": "uuid-v4",
  "perTrack": [
    { "trackId": 123, "outcome": "won", "attemptsUsed": 2 },
    { "trackId": 456, "outcome": "lost", "attemptsUsed": 6 },
    { "trackId": 789, "outcome": "unplayable", "attemptsUsed": 0 }
  ]
}
```

- `sessionId` is a random UUID generated once per game play and stored in `localStorage` under `oneshot:played:{code}`
- If the same `sessionId` has already been submitted for this game, the server overwrites the previous entry (idempotent replay handling)
- Rate-limited to 10 submissions per IP per hour to prevent flooding
- `unplayable` tracks are stored but excluded from score calculation
- If the API call fails client-side, the client retries silently (up to 3 times with exponential backoff). The "See how everyone did" button appears regardless — the player just won't appear in the results if all retries fail

**Response:** `{ "ok": true }`

---

### `GET /api/games/{code}/results?token={token}`

Token is checked against two valid types:

| Token type | Valid value | Access granted |
|------------|------------|----------------|
| Creator token | `creatorToken` stored with game | Yes |
| Player session | A `sessionId` present in `results:{code}` list | Yes |
| Invalid / missing | Anything else | 403 |

This means results are visible to: (a) the creator, and (b) anyone who has completed the game — exactly the group who "earned it." A player can share the results URL with another player who has also finished and they'll have access.

**Response:**
```json
{
  "gameTitle": "Summer Hits",
  "trackCount": 8,
  "expiresAt": 1726000000,
  "totalPlays": 12,
  "avgScore": 0.6,
  "perTrack": [
    {
      "trackId": 123,
      "title": "Heroes",
      "artist": "David Bowie",
      "artUrl": "https://...",
      "winRate": 0.83,
      "avgAttemptsUsed": 2.1
    }
  ],
  "plays": [
    { "completedAt": 1718001000, "score": 0.75, "wonTracks": 6, "playableTracks": 8 }
  ]
}
```

> **Note on `completionRate`:** Removed from v1. Computing it correctly requires tracking game starts, which would mean an additional Redis write every time someone loads the play page. Not worth the complexity for v1 — `totalPlays` is sufficient.

> **Note on `artUrl` in perTrack:** The results API returns `artUrl` for each track so the results page can show album art without extra Deezer API calls.

---

## Scoring (v1 — to be refined in a future session)

```
score = won_tracks / playable_tracks
```

`unplayable` tracks are excluded from both numerator and denominator. Displayed as a percentage (e.g. "75%") on the results page.

---

## Navigation — getting to the dashboard

A "My games" link appears in the app header **only when `oneshot:games` has at least one entry in localStorage**. Shown as:
- A small text link in the Studio header (next to the "New playlist" button)
- A link on the landing page ("Made one before? View your games →")

Users with no history see neither link — no empty state to handle, no clutter.

---

## New frontend routes

| Route | Page | Who sees it |
|-------|------|-------------|
| `/dashboard` | My Games — list of created games (localStorage) | Creator only (localStorage-gated) |
| `/dashboard/:code?token={token}` | Results view | Creator or player with completed sessionId |

---

## New frontend pages

### My Games (`/dashboard`)

Reads `oneshot:games` from localStorage. Shows cards sorted by `createdAt` descending (newest first). Each card shows:
- Game title (or "Untitled game" if unnamed)
- Track count · Date created
- Play count (fetched lazily; shows "—" while loading)
- "View results" button → `/dashboard/:code?token={creatorToken}`
- "Share" button → native share sheet / clipboard with player link

**Empty state:** If localStorage has no games, show "You haven't created any games yet" with a button to go to Studio.

**Expiry warnings:**
- 80–90 days old → amber warning: "Expires in X days"
- Expired (API returns 404 on results fetch) → card marked "Expired" with no "View results" button

### Results view (`/dashboard/:code?token=...`)

Sections in order:

1. **Header** — game title, track count, expiry date ("Results available until DD MMM YYYY")
2. **Hero stats** — total plays · average score
3. **Score distribution** — a simple list: "3 players scored 100%", "2 players scored 75%", etc. No charting library required.
4. **Track breakdown** — one row per track, sorted hardest first (lowest win rate). Columns: album art · title · artist · win rate · avg attempts. This is the most useful view for the creator — they immediately see which tracks tripped people up.
5. **Share section** — player link with copy/native-share button and the prompt "Share with more friends →"
6. **Expiry notice** — repeated at the bottom in muted text

**Loading state:** Skeleton rows while API call is in flight.  
**403 state:** "You need to complete the game to view these results."  
**Empty state (0 plays):** "No plays yet" with the player link front and centre.

---

## ShareLinkBar — post-share UI

After a game is shared and `creatorToken` is received, the ShareLinkBar shows two distinct items:

1. **Player link** (existing) — the `/g/:code` URL to share with friends
2. **Creator link** (new) — below or alongside, styled differently (muted/secondary). Label: "Your results link — save this." Clicking copies it or opens the native share sheet.

A small warning note below: "This link gives access to results. Keep it — we can't recover it."

---

## User journeys

### Journey 1 — Creator shares and checks results

1. Creator builds a playlist, hits "Share game" without a title
2. The title input comes into focus with "Bowie vs Foo Fighters" pre-filled (generated name)
3. Creator accepts → game created → receives player link + creator link ("Save this to view results")
4. Creator copies the player link and sends it to friends in a group chat
5. Friends play → results submitted automatically on their recap screen
6. Creator taps their saved creator link → results page loads with play count, avg score, and track breakdown
7. Creator shares the results link in the group chat ("see how everyone did")

### Journey 2 — Player sees the group's results

1. Player finishes the game, reaches the recap screen
2. "See how everyone did →" button appears
3. Player taps it → results page loads showing their score alongside everyone else's (anonymous)
4. Player shares the results URL in the group chat for others who have also finished

### Journey 3 — Creator checks results from a different device

1. Creator made the game on their phone — their dashboard only lives on that phone
2. On their laptop, they open the bookmarked creator link (`/dashboard/abc1234?token=k9z2m...`)
3. Results view loads directly — no dashboard, no account needed

### Journey 4 — Dashboard browse (returning creator)

1. Creator visits `/dashboard` on their phone
2. Sees 5 game cards, newest first, each with a live play count
3. Taps "Summer Hits" → jumps to results
4. "80s Bangers" shows an amber warning: "Expires in 5 days"
5. An old expired game card is greyed out: "Expired · Results unavailable"

### Journey 5 — Zero plays yet

1. Creator shares the game, opens the creator link 30 seconds later
2. Results page shows: "No plays yet — share your link to get started"
3. Player link is displayed prominently so they can reshare immediately

### Journey 6 — Creator plays their own game

1. Creator uses "Test play" in Studio
2. Test play completes in the dialog — **no result is submitted** (test plays are excluded at the call site)
3. Creator's play data does not appear in the results their friends see

### Journey 7 — Player replays

1. Player finishes, wants to try again — they reload and replay
2. A new `sessionId` is generated for the new play (previous one is overwritten in `localStorage`)
3. The new result is submitted and overwrites the old one in Redis (idempotent by sessionId)
4. The results page reflects their latest attempt

### Journey 8 — Game expires

1. Creator opens their dashboard 91 days after creating a game
2. The game card shows as expired (API returns 404) — no "View results" button
3. The localStorage entry remains so the creator can see it in their history

### Journey 9 — Creator names their game for easy retrieval

1. Creator builds a playlist but ignores the title field
2. Hits "Share game" → the title input gets focus with "The Heroes Mix" pre-filled
3. Creator edits it to "Friday Office Quiz" and confirms
4. Game saved with that title — immediately visible with that name in the dashboard

### Journey 10 — Player shares results with a friend who hasn't played yet

1. Player shares the results URL with a friend who hasn't played the game
2. Friend opens the URL → gets a 403 ("Complete the game first to see results")
3. The 403 page includes a link to play the game → friend plays → now has access

---

## Open questions (future session)

- Should play count be shown publicly on the player-facing `/g/:code` page ("142 people have played this")?
- Should the dashboard support sorting or searching when a creator has many games?
- Should individual plays in the results show a relative ranking ("you came 3rd out of 8")?

---

## Files to create / modify

| File | Change |
|------|--------|
| `api/games.ts` | Add `creatorToken` generation; return it in POST response |
| `api/games/[code]/results.ts` | **New** — handles POST (submit result) and GET (fetch results, token-gated) |
| `src/lib/nameGenerator.ts` | **New** — client-side generated playlist name algorithm |
| `src/app/routes.tsx` | Add `/dashboard` and `/dashboard/:code` routes |
| `src/features/studio/StudioPage.tsx` | On share success: store entry to `oneshot:games` localStorage; pass `creatorToken` to ShareLinkBar |
| `src/features/studio/components/ShareLinkBar.tsx` | Title prompt flow before sharing; show creator link post-share |
| `src/features/dashboard/DashboardPage.tsx` | **New** — My Games list |
| `src/features/dashboard/ResultsPage.tsx` | **New** — Results view (creator + completed player access) |
| `src/features/play/RecapView.tsx` | Submit results on mount (fire-and-forget with retry); show "See how everyone did" button |
| `src/features/landing/LandingPage.tsx` | Add "My games" link when `oneshot:games` is non-empty |
