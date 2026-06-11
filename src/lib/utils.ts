import { createElement, type ReactNode } from 'react';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Format seconds as m:ss (e.g. 4 -> "0:04"). */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Loose normalization for comparing track titles/artists across catalog duplicates. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*[([].*?[)\]]\s*/g, ' ') // drop "(Remastered 2011)" etc.
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const WORD_TOKEN_RE = /[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu;

function referenceWords(reference: string): Set<string> {
  const normalized = normalizeForMatch(reference);
  return new Set(normalized.split(/\s+/).filter(Boolean));
}

function tokenizeText(text: string): string[] {
  return text.match(WORD_TOKEN_RE) ?? [text];
}

/** Highlight word tokens in `text` that also appear in `reference` (wrong-guess hints). */
export function highlightSharedWords(text: string, reference: string): ReactNode {
  const words = referenceWords(reference);
  if (words.size === 0) return text;

  const parts = tokenizeText(text);
  return parts.map((part, index) => {
    const normalized = normalizeForMatch(part);
    if (normalized && words.has(normalized)) {
      return createElement('mark', { key: index }, part);
    }
    return part;
  });
}
