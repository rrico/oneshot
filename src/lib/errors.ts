export type RecoverAction = 'retry' | 'skip-track' | 'copy-link';

/** User-facing error shape. Never throw raw strings to the UI. */
export interface AppError {
  title: string;
  body?: string;
  recover?: RecoverAction;
}

export function appError(title: string, body?: string, recover?: RecoverAction): AppError {
  return { title, body, recover };
}
