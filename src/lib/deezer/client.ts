/**
 * The only network transport for the Deezer catalog.
 * The public Deezer API does not send CORS headers for plain fetch from
 * browsers, but supports JSONP via `output=jsonp&callback=`. Script-tag
 * injection with timeout + cleanup is therefore the documented client pattern
 * for a static, backend-free site.
 */

export const DEEZER_API_BASE = 'https://api.deezer.com';

export type DeezerErrorKind = 'timeout' | 'network' | 'api';

export class DeezerError extends Error {
  readonly kind: DeezerErrorKind;

  constructor(kind: DeezerErrorKind, message: string) {
    super(message);
    this.name = 'DeezerError';
    this.kind = kind;
  }
}

const JSONP_TIMEOUT_MS = 8000;
let callbackCounter = 0;

type JsonpWindow = Window & Record<string, unknown>;

export function jsonpRequest<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const callbackName = `__oneshot_dz_${Date.now()}_${callbackCounter++}`;
    const search = new URLSearchParams({ ...params, output: 'jsonp', callback: callbackName });
    const script = document.createElement('script');
    const win = window as unknown as JsonpWindow;

    const cleanup = () => {
      clearTimeout(timer);
      delete win[callbackName];
      script.remove();
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new DeezerError('timeout', `Deezer request timed out: ${path}`));
    }, JSONP_TIMEOUT_MS);

    win[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new DeezerError('network', `Deezer request failed to load: ${path}`));
    };

    script.src = `${DEEZER_API_BASE}${path}?${search.toString()}`;
    document.head.appendChild(script);
  });
}
