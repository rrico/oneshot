export interface StoredGame {
  code: string;
  creatorToken: string;
  title: string;
  trackCount: number;
  createdAt: number; // unix seconds
}

const GAMES_KEY = 'oneshot:games';

export function loadStoredGames(): StoredGame[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown[];
    if (!Array.isArray(data)) return [];
    return data.filter(
      (g): g is StoredGame =>
        typeof g === 'object' &&
        g !== null &&
        typeof (g as StoredGame).code === 'string' &&
        typeof (g as StoredGame).creatorToken === 'string' &&
        typeof (g as StoredGame).title === 'string' &&
        typeof (g as StoredGame).trackCount === 'number' &&
        typeof (g as StoredGame).createdAt === 'number',
    );
  } catch {
    return [];
  }
}

export function saveStoredGame(game: StoredGame): void {
  try {
    const existing = loadStoredGames().filter((g) => g.code !== game.code);
    localStorage.setItem(GAMES_KEY, JSON.stringify([game, ...existing]));
  } catch {}
}

export function hasStoredGames(): boolean {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as unknown[];
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

export function getPlayedSessionId(code: string): string | null {
  try {
    return localStorage.getItem(`oneshot:played:${code}`);
  } catch {
    return null;
  }
}

export function setPlayedSessionId(code: string, sessionId: string): void {
  try {
    localStorage.setItem(`oneshot:played:${code}`, sessionId);
  } catch {}
}
