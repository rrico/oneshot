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

When `POST /api/games` creates a game, a second secret token is generated alongside the game code. Only the creator receives this token — it never appears in the player-facing share link.

**Redis schema change:**
```
game:{code}  →  { trackIds, title, creatorToken: "<32-char secret>" }
```

**API response change:**
```json
POST /api/games → { "code": "abc1234", "creatorToken": "xyz..." }
```

The `creatorToken` is the keycard proving ownership. It lives in two places:
- The creator's localStorage (`oneshot:games` array)
- The creator link URL (`/dashboard/abc1234?token=xyz`)

### Results storage

```
results:{code}  →  Redis list of serialized play results
```

TTL matches the game: **90 days**. The results view clearly communicates this expiry to the creator ("Results available for X more days").

### Client localStorage

Every time a game is created, an entry is appended to `oneshot:games`:

```json
{
  "code": "abc1234",
  "creatorToken": "xyz...",
  "title": "Ryan's 80s Mix",
  "trackCount": 8,
  "createdAt": 1718000000
}
```

This is the source of truth for "all games I've made." It is device-specific — no cross-device sync is needed; the creator link covers the cross-device case.

---

## Playlist titles

Titles are how a creator finds their old games in the dashboard. Today the title field is optional and tucked in the header placeholder text. Two changes needed:

1. **Prompt for a title before sharing** — when the creator hits "Share game" without a title, show a lightweight prompt asking them to name it first (or allow them to skip). A titled game is far easier to find later than "Untitled game — 6 tracks — 14 Jun."
2. **Fall back to a generated name** — if skipped, auto-generate a readable default from the track list, e.g. "6-track game · 14 Jun 2026."

---

## New API endpoints

### `POST /api/games/{code}/results`

Called when a player reaches the recap screen (game fully completed). Not called from the Studio test-play dialog.

**Request body:**
```json
{
  "sessionId": "uuid-per-browser-session",
  "perTrack": [
    { "trackId": 123, "outcome": "won", "attemptsUsed": 2 },
    { "trackId": 456, "outcome": "lost", "attemptsUsed": 6 },
    { "trackId": 789, "outcome": "unplayable", "attemptsUsed": 0 }
  ]
}
```

- `sessionId` is a random UUID stored in `sessionStorage` (not `localStorage`) — scoped to a single browser tab/session. This deduplicates multiple tab submissions without tracking users across sessions.
- Rate-limited by IP to prevent flooding.
- `unplayable` tracks are recorded but excluded from scoring.

### `GET /api/games/{code}/results?token={token}`

**Two access levels:**

| Caller | Token required? | What they see |
|--------|----------------|---------------|
| Creator | Yes (`creatorToken`) | Full results — aggregate stats + all anonymous play-throughs |
| Player who completed the game | Yes (`sessionId` that was submitted) | Same view — they earned it by finishing |
| Anyone else | — | 403 |

This keeps results semi-private while letting a creator share the results link with the group ("see how everyone did").

**Response:**
```json
{
  "gameTitle": "Ryan's 80s Mix",
  "trackCount": 8,
  "expiresAt": 1726000000,
  "totalPlays": 12,
  "completionRate": 0.75,
  "avgScore": 0.6,
  "perTrack": [
    { "trackId": 123, "title": "Heroes", "artist": "David Bowie", "winRate": 0.83, "avgAttemptsUsed": 2.1 }
  ],
  "plays": [
    { "completedAt": 1718001000, "score": 0.75, "wonTracks": 6, "playableTracks": 8 }
  ]
}
```

---

## Scoring (v1 — simple, to be refined later)

```
score = won_tracks / playable_tracks
```

`unplayable` tracks are excluded from both numerator and denominator. Displayed as a percentage on the results page.

---

## New frontend routes

| Route | Page | Who sees it |
|-------|------|-------------|
| `/dashboard` | My Games — list of all created games from localStorage | Creator only (localStorage-gated) |
| `/dashboard/:code?token={creatorToken}` | Results view | Creator + anyone with a completed-session token |

---

## New frontend pages

### My Games (`/dashboard`)

Reads `oneshot:games` from localStorage. Shows a card per game:
- Game title (or generated fallback)
- Track count
- Date created
- Play count (fetched lazily per game, or cached)
- "View results" link
- "Share game" button (copies the player link)

If localStorage is empty (no games created on this device), show a prompt to create one.

**Expiry notice:** If a game's `createdAt` is more than ~80 days ago, show a warning that it expires soon.

### Results view (`/dashboard/:code?token=...`)

Sections:
1. **Hero stat** — total plays, completion rate
2. **Score distribution** — simple bar or list showing how players scored (e.g. 3 players 100%, 2 players 75%, etc.)
3. **Track breakdown** — per track: win rate, average attempts. Sorted by hardest first. Reveals song details so a creator can see which tracks tripped people up.
4. **Share this game** — player link front and centre for resharing
5. **Expiry notice** — "Results available until {date}" shown clearly below the stats

---

## User journeys

### Journey 1 — Creator shares and checks results

1. Creator builds a playlist, names it "Summer Hits"
2. Taps "Share game" → receives player link + creator link ("Save this to view results")
3. Shares player link with friends
4. Friends play → results submitted automatically on recap screen
5. Creator opens creator link on any device → sees aggregate stats and per-track breakdown
6. Creator shares results link with the group ("see how everyone did")

### Journey 2 — Player sees the group's results

1. Player finishes the game, reaches the recap screen
2. A "See how everyone did" button appears (enabled once they've submitted their result)
3. Tapping it opens the results page — they can see everyone's scores and the track breakdown
4. They can share this results link with others who have also completed the game

### Journey 3 — Creator checks results from a different device

1. Creator made the game on their phone — their dashboard is phone-only
2. On their laptop, they open the saved creator link (`/dashboard/abc1234?token=xyz`)
3. Results view loads directly — no dashboard needed, no account needed

### Journey 4 — Dashboard browse (returning creator)

1. Creator visits `/dashboard` on their phone
2. Sees a list of all 5 games they've made, with play counts
3. Taps "Summer Hits" → jumps straight to results
4. Sees "80s Bangers" made 85 days ago with a warning: "Expires in 5 days"

### Journey 5 — Zero plays yet

1. Creator shares the game, opens creator link 30 seconds later
2. Results page shows: "No plays yet — share your link to get started"
3. Player link is shown prominently so they can reshare easily

### Journey 6 — Creator plays their own game

1. Creator uses "Test play" in Studio
2. Test play completes — **no result is submitted** (test plays are excluded)
3. Creator's own play data does not skew the results their friends see

### Journey 7 — Player replays

1. Player finishes, wants to try again
2. They reload the page and replay — a new `sessionId` is generated
3. This counts as a separate play in the results
4. Their previous result still exists alongside the new one (both anonymous)

### Journey 8 — Game expires

1. Creator opens their dashboard 91 days after making a game
2. The game card is marked "Expired" — results are gone from Redis
3. The localStorage entry remains so the creator can see their history, but clicking "View results" shows a clear "This game has expired" state

### Journey 9 — Creator wants to name their game for easy retrieval

1. Creator builds a playlist but forgets to name it
2. On hitting "Share game," a lightweight prompt appears: "Give your game a name so you can find it later" with the title input pre-focused
3. Creator types "Friday Office Mix" and confirms
4. Game is saved with the title — easy to find in the dashboard later

---

## Open questions (for a future session)

- Should the results page support a permalink that's stable even after sharing with the group, or is the token-in-URL approach sufficient?
- Should play count be shown publicly on the player-facing page (e.g. "142 people have played this"), or creator-only?
- Should the dashboard support ordering/searching across many games?

---

## Files to create / modify

| File | Change |
|------|--------|
| `api/games.ts` | Add `creatorToken` generation, return it in response |
| `api/games/[code].ts` | No change |
| `api/games/[code]/results.ts` | **New** — POST (submit) + GET (fetch, token-gated) |
| `src/features/studio/StudioPage.tsx` | Store created game to `oneshot:games` localStorage array; prompt for title before share |
| `src/features/studio/components/ShareLinkBar.tsx` | Show creator link alongside player link after sharing |
| `src/features/dashboard/DashboardPage.tsx` | **New** — My Games list |
| `src/features/dashboard/ResultsPage.tsx` | **New** — Results view |
| `src/features/play/RecapView.tsx` | Submit results on mount; show "See how everyone did" button |
| `src/router.tsx` (or equivalent) | Add `/dashboard` and `/dashboard/:code` routes |
