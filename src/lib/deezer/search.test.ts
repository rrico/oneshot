import { describe, expect, it } from 'vitest';
import type { Track } from '@/types';
import { scoreTrackForQuery } from './search';

const track = (title: string, artist: string): Track => ({
  id: 1,
  title,
  artist,
  album: 'Album',
  artUrl: '',
  previewUrl: 'https://example.com/p.mp3',
  durationSec: 200,
});

describe('scoreTrackForQuery', () => {
  describe('issue #1 — currently-playing track surfaced on partial match', () => {
    it('scores "Heroes" >= 100 for query "hero"', () => {
      // Regression: Deezer returns songs titled "Hero" for this query and
      // buries "Heroes". The score must be >= 100 to trigger injection.
      const heroes = track('Heroes', 'David Bowie');
      expect(scoreTrackForQuery(heroes, 'hero')).toBeGreaterThanOrEqual(100);
    });

    it('scores "Heroes (2015 Remaster)" >= 100 for query "hero"', () => {
      const heroes = track('Heroes (2015 Remaster)', 'David Bowie');
      expect(scoreTrackForQuery(heroes, 'hero')).toBeGreaterThanOrEqual(100);
    });

    it('scores a track higher for exact artist match than partial', () => {
      const exact = track('Something', 'David Bowie');
      const partial = track('Something', 'David Bowiesmith');
      expect(scoreTrackForQuery(exact, 'david bowie')).toBeGreaterThan(
        scoreTrackForQuery(partial, 'david bowie'),
      );
    });

    it('scores an unrelated track 0 for "hero"', () => {
      const unrelated = track('Bohemian Rhapsody', 'Queen');
      expect(scoreTrackForQuery(unrelated, 'hero')).toBe(0);
    });

    it('returns 0 for an empty query', () => {
      const heroes = track('Heroes', 'David Bowie');
      expect(scoreTrackForQuery(heroes, '')).toBe(0);
      expect(scoreTrackForQuery(heroes, '   ')).toBe(0);
    });
  });

  describe('score tiers', () => {
    it('gives exact title match the highest score (+1000 tier)', () => {
      const t = track('Heroes', 'David Bowie');
      expect(scoreTrackForQuery(t, 'heroes')).toBeGreaterThanOrEqual(1000);
    });

    it('gives startsWith a higher score than includes-only', () => {
      const startsWith = track('Hero Man', 'Someone');
      const includesOnly = track('My Hero Is Here', 'Someone');
      expect(scoreTrackForQuery(startsWith, 'hero')).toBeGreaterThan(
        scoreTrackForQuery(includesOnly, 'hero'),
      );
    });

    it('scores an artist match the same as a title match at the same tier', () => {
      const byTitle = track('Bowie', 'Unknown');
      const byArtist = track('Unknown', 'Bowie');
      expect(scoreTrackForQuery(byTitle, 'bowie')).toBe(
        scoreTrackForQuery(byArtist, 'bowie'),
      );
    });

    it('is case-insensitive', () => {
      const t = track('Heroes', 'David Bowie');
      expect(scoreTrackForQuery(t, 'HERO')).toBeGreaterThanOrEqual(100);
      expect(scoreTrackForQuery(t, 'Hero')).toBe(scoreTrackForQuery(t, 'hero'));
    });
  });
});
