import { z } from 'zod';
import type { Playlist, RoundOutcome } from '@/types';
import { appError, type AppError } from '@/lib/errors';

/**
 * Single source of truth for the share-link playlist payload (FR26-FR29).
 * Format (version 1):  "1~<base64url(title)|empty>~<id36>.<id36>...."
 * Lives in the hash fragment query:  #/play?d=<payload>
 * No other module may parse or build this payload.
 */

const VERSION = '1';
export const MAX_TRACKS = 100;
export const MAX_TITLE_LENGTH = 120;

const PlaylistSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
  trackIds: z.array(z.number().int().positive()).max(MAX_TRACKS),
});

export type DecodeResult = { ok: true; playlist: Playlist } | { ok: false; error: AppError };

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePlaylist(playlist: Playlist): string {
  const parsed = PlaylistSchema.parse(playlist);
  const titlePart = parsed.title ? base64UrlEncode(parsed.title) : '';
  const idPart = parsed.trackIds.map((id) => id.toString(36)).join('.');
  return `${VERSION}~${titlePart}~${idPart}`;
}

const badLink = (body: string): DecodeResult => ({
  ok: false,
  error: appError('This game link is broken', body, 'copy-link'),
});

export function decodePlaylistParam(param: string | null | undefined): DecodeResult {
  if (!param || param.trim() === '') {
    return badLink('The link has no playlist data. Ask the creator to copy the full link again.');
  }

  const parts = param.split('~');
  if (parts.length !== 3) {
    return badLink(
      'The playlist data looks incomplete — chat apps sometimes truncate long links. Ask the creator to re-copy the full link.',
    );
  }

  const [version, titlePart, idPart] = parts;
  if (version !== VERSION) {
    return badLink('This link was made with a newer version of oneshot. Ask the creator for a fresh link.');
  }

  let title: string | undefined;
  if (titlePart !== '') {
    try {
      title = base64UrlDecode(titlePart);
    } catch {
      return badLink('The playlist name in this link is corrupted. Ask the creator to re-copy the link.');
    }
  }

  let trackIds: number[] = [];
  if (idPart !== '') {
    const rawIds = idPart.split('.');
    trackIds = [];
    for (const raw of rawIds) {
      if (!/^[0-9a-z]{1,11}$/.test(raw)) {
        return badLink('Part of the track list is corrupted or cut off. Ask the creator to re-copy the full link.');
      }
      const id = parseInt(raw, 36);
      if (!Number.isSafeInteger(id) || id <= 0) {
        return badLink('Part of the track list is corrupted. Ask the creator to re-copy the full link.');
      }
      trackIds.push(id);
    }
  }

  const result = PlaylistSchema.safeParse({ title, trackIds });
  if (!result.success) {
    return badLink('The playlist in this link is not valid. Ask the creator to re-copy the link.');
  }

  return { ok: true, playlist: result.data };
}

/** Build a full shareable URL for the current origin/path. */
export function buildShareUrl(playlist: Playlist): string {
  const payload = encodePlaylist(playlist);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/play?d=${payload}`;
}

// --- Run results payload (shared results page) ------------------------------
// One character per track: '1'-'6' = won on that attempt, 'x' = lost,
// 'u' = unplayable. Order matches the playlist payload.

export type ResultOutcome = { outcome: RoundOutcome; winningAttempt?: number };

export function encodeResults(results: Array<{ outcome: RoundOutcome; winningAttempt?: number }>): string {
  return results
    .map((r) => (r.outcome === 'won' ? String(r.winningAttempt ?? 6) : r.outcome === 'lost' ? 'x' : 'u'))
    .join('');
}

export type DecodeResultsResult = { ok: true; outcomes: ResultOutcome[] } | { ok: false; error: AppError };

export function decodeResultsParam(param: string | null | undefined, expectedLength: number): DecodeResultsResult {
  const badResults: DecodeResultsResult = {
    ok: false,
    error: appError(
      "These results can't be shown",
      'The results part of this link is missing or cut off. Ask your friend to copy the link again.',
      'copy-link',
    ),
  };
  if (!param || !/^[1-6xu]+$/.test(param) || param.length !== expectedLength) return badResults;
  return {
    ok: true,
    outcomes: [...param].map((char) =>
      char === 'x'
        ? { outcome: 'lost' as const }
        : char === 'u'
          ? { outcome: 'unplayable' as const }
          : { outcome: 'won' as const, winningAttempt: Number(char) },
    ),
  };
}

/** Build a URL to the shared results page for a finished run. */
export function buildResultsUrl(playlistParam: string, results: Array<{ outcome: RoundOutcome; winningAttempt?: number }>): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/results?d=${playlistParam}&r=${encodeResults(results)}`;
}
