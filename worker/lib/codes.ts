const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Random lowercase alphanumeric string, used for game codes and creator tokens. */
export function generateCode(length = 7): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => CHARS[b % CHARS.length]).join('');
}

export const GAME_CODE_RE = /^[a-z0-9]{7}$/;
