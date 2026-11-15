import { z } from 'zod';
import { GAME_CODE_RE } from './codes';

export const CodeParam = z.object({ code: z.string().regex(GAME_CODE_RE) });

export const TrackMeta = z.object({
  id: z.number(),
  title: z.string(),
  artist: z.string(),
  artUrl: z.string(),
});
export type TrackMeta = z.infer<typeof TrackMeta>;

export const CreateGameBody = z.object({
  trackIds: z.array(z.number().int().positive()).min(1).max(100),
  title: z.string().max(120).optional(),
  // Optional metadata used to render the results dashboard without extra Deezer calls.
  // Invalid metadata is dropped rather than rejected.
  tracks: z.unknown().optional(),
});

export const Outcome = z.enum(['won', 'lost', 'unplayable', 'skipped']);

export const PerTrackResult = z.object({
  trackId: z.number(),
  outcome: Outcome,
  attemptsUsed: z.number(),
});
export type PerTrackResult = z.infer<typeof PerTrackResult>;

export const SubmitResultsBody = z.object({
  sessionId: z.string().regex(/^[0-9a-f-]{36}$/),
  perTrack: z.array(PerTrackResult).min(1),
});

export const ResultsQuery = z.object({ token: z.string().optional() });

export const OgQuery = z.object({
  title: z.string().max(200).optional(),
  count: z.coerce.number().int().min(0).max(1000).optional().catch(0),
});
