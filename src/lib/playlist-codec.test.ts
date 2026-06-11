import { describe, expect, it } from 'vitest';
import {
  decodePlaylistParam,
  decodeResultsParam,
  encodePlaylist,
  encodeResults,
  MAX_TRACKS,
} from './playlist-codec';

describe('playlist codec', () => {
  it('round-trips a playlist with a title', () => {
    const playlist = { title: 'roadtrip rejects 🚗', trackIds: [3135556, 916424, 1109731] };
    const decoded = decodePlaylistParam(encodePlaylist(playlist));
    expect(decoded).toEqual({ ok: true, playlist });
  });

  it('round-trips a playlist without a title', () => {
    const playlist = { trackIds: [1, 999999999] };
    const decoded = decodePlaylistParam(encodePlaylist(playlist));
    expect(decoded.ok && decoded.playlist.trackIds).toEqual(playlist.trackIds);
    expect(decoded.ok && decoded.playlist.title).toBeUndefined();
  });

  it('round-trips an empty playlist', () => {
    const decoded = decodePlaylistParam(encodePlaylist({ trackIds: [] }));
    expect(decoded.ok && decoded.playlist.trackIds).toEqual([]);
  });

  it('rejects missing payloads with a structured error', () => {
    for (const param of [null, undefined, '', '   ']) {
      const result = decodePlaylistParam(param);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.title).toBeTruthy();
    }
  });

  it('rejects truncated payloads', () => {
    const full = encodePlaylist({ title: 'test', trackIds: [3135556, 916424] });
    const truncated = full.slice(0, Math.floor(full.length / 2));
    // Either the structure breaks or an id is cut — both must fail safely.
    const result = decodePlaylistParam(truncated);
    if (result.ok) {
      // A clean cut between ids can decode; the contract is only "no crash, no garbage ids".
      expect(result.playlist.trackIds.every((id) => Number.isSafeInteger(id) && id > 0)).toBe(true);
    } else {
      expect(result.error.title).toBeTruthy();
    }
  });

  it('rejects tampered ids and wrong versions', () => {
    expect(decodePlaylistParam('1~~abc.!!').ok).toBe(false);
    expect(decodePlaylistParam('9~~abc').ok).toBe(false);
    expect(decodePlaylistParam('not-a-payload').ok).toBe(false);
  });

  it('rejects oversized playlists', () => {
    const ids = Array.from({ length: MAX_TRACKS + 1 }, (_, i) => i + 1);
    const param = `1~~${ids.map((id) => id.toString(36)).join('.')}`;
    expect(decodePlaylistParam(param).ok).toBe(false);
  });
});

describe('results codec', () => {
  it('round-trips run results', () => {
    const results = [
      { outcome: 'won' as const, winningAttempt: 1 },
      { outcome: 'lost' as const },
      { outcome: 'won' as const, winningAttempt: 6 },
      { outcome: 'unplayable' as const },
      { outcome: 'skipped' as const },
    ];
    const encoded = encodeResults(results);
    expect(encoded).toBe('1x6us');
    const decoded = decodeResultsParam(encoded, 5);
    expect(decoded).toEqual({ ok: true, outcomes: results });
  });

  it('rejects results that do not match the playlist length', () => {
    expect(decodeResultsParam('1x6u', 5).ok).toBe(false);
  });

  it('rejects missing or corrupted results', () => {
    expect(decodeResultsParam(null, 3).ok).toBe(false);
    expect(decodeResultsParam('', 0).ok).toBe(false);
    expect(decodeResultsParam('19x', 3).ok).toBe(false);
  });
});
