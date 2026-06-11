import { Link } from 'react-router-dom';

/** Last-resort boundary for unexpected crashes. Expected failures render inline states instead. */
export function RouteErrorBoundary() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-8 text-center">
        <p aria-hidden="true" className="mb-3 text-3xl">
          ⚠
        </p>
        <h1 className="mb-2 text-lg font-semibold text-ink">Something went wrong</h1>
        <p className="mb-6 text-sm text-ink-muted">
          An unexpected error interrupted the game. Reloading usually fixes it.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface hover:bg-white"
          >
            Reload
          </button>
          <Link to="/" className="rounded-lg border border-edge px-4 py-2 text-sm text-ink hover:bg-panel-hover">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
