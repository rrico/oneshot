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
