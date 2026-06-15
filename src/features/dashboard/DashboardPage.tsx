import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadStoredGames, type StoredGame } from '@/lib/gameStorage';
import { Button } from '@/components/ui/Button';

type SortKey = 'newest' | 'oldest' | 'az';

type CardStatus = 'loading' | 'live' | 'expired';

interface GameCardData {
  game: StoredGame;
  status: CardStatus;
  playCount: number | null;
}

const DAYS_90 = 60 * 60 * 24 * 90;

function daysRemaining(createdAt: number): number {
  const elapsed = Math.floor(Date.now() / 1000) - createdAt;
  return Math.max(0, Math.floor((DAYS_90 - elapsed) / 86400));
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function nativeShare(url: string): void {
  if (typeof navigator !== 'undefined' && navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    void navigator.share({ url });
  } else {
    void navigator.clipboard.writeText(url);
  }
}

function GameCard({ data }: { data: GameCardData }) {
  const { game, status, playCount } = data;
  const days = daysRemaining(game.createdAt);
  const isExpired = status === 'expired' || days === 0;
  const isWarning = !isExpired && days <= 10;
  const playerUrl = `${window.location.origin}/g/${game.code}`;
  const resultsUrl = `/dashboard/${game.code}?token=${game.creatorToken}`;

  return (
    <div className={`rounded-2xl border p-5 ${isExpired ? 'border-edge opacity-60' : 'border-edge bg-panel'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {game.title || 'Untitled game'}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {game.trackCount} track{game.trackCount === 1 ? '' : 's'} · {formatDate(game.createdAt)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {status === 'loading' ? (
            <p className="text-sm text-ink-faint tabular-nums">—</p>
          ) : isExpired ? (
            <p className="text-xs text-ink-faint">Expired</p>
          ) : (
            <p className="text-sm font-semibold tabular-nums text-ink">
              {playCount ?? 0}
              <span className="ml-1 text-xs font-normal text-ink-muted">
                {playCount === 1 ? 'play' : 'plays'}
              </span>
            </p>
          )}
        </div>
      </div>

      {isWarning && !isExpired && (
        <p className="mt-2 text-xs text-amber-500">Expires in {days} day{days === 1 ? '' : 's'}</p>
      )}
      {isExpired && (
        <p className="mt-2 text-xs text-ink-faint">Results unavailable</p>
      )}

      {!isExpired && (
        <div className="mt-4 flex items-center gap-2">
          <Link
            to={resultsUrl}
            className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-edge px-4 text-sm text-ink hover:bg-panel-hover"
          >
            View results
          </Link>
          <button
            onClick={() => nativeShare(playerUrl)}
            className="inline-flex min-h-9 items-center rounded-lg border border-edge px-4 text-sm text-ink hover:bg-panel-hover"
          >
            Share
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const [games] = useState<StoredGame[]>(() => loadStoredGames());
  const [cardData, setCardData] = useState<Map<string, GameCardData>>(() => {
    const map = new Map<string, GameCardData>();
    for (const game of loadStoredGames()) {
      map.set(game.code, { game, status: 'loading', playCount: null });
    }
    return map;
  });
  const [sort, setSort] = useState<SortKey>('newest');
  const [search, setSearch] = useState('');

  // Lazily fetch play counts for each game
  useEffect(() => {
    for (const game of games) {
      fetch(`/api/games/${game.code}`)
        .then((r) => {
          if (r.status === 404) return null;
          return r.ok ? r.json() : null;
        })
        .then((data: { playCount?: number } | null) => {
          setCardData((prev) => {
            const next = new Map(prev);
            next.set(game.code, {
              game,
              status: data === null ? 'expired' : 'live',
              playCount: data?.playCount ?? 0,
            });
            return next;
          });
        })
        .catch(() => {
          setCardData((prev) => {
            const next = new Map(prev);
            next.set(game.code, { game, status: 'expired', playCount: null });
            return next;
          });
        });
    }
  }, [games]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = [...games];
    if (query) {
      list = list.filter((g) => g.title.toLowerCase().includes(query));
    }
    switch (sort) {
      case 'oldest':
        list.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'az':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [games, sort, search]);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-edge">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="text-sm font-bold tracking-tight text-ink-muted hover:text-ink">
            oneshot
          </Link>
          <h1 className="text-sm font-semibold text-ink">My games</h1>
          <Link to="/create" className="text-xs text-ink-muted hover:text-ink">
            New game
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="mb-2 text-lg font-semibold text-ink">No games yet</p>
            <p className="mb-6 text-sm text-ink-muted">Create your first game and share it with friends.</p>
            <Link to="/create">
              <Button variant="primary">Create a game</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games…"
                className="flex-1 rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
              />
              <div className="flex gap-2">
                {(['newest', 'oldest', 'az'] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSort(key)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      sort === key
                        ? 'border-accent bg-accent text-surface'
                        : 'border-edge bg-panel text-ink-muted hover:text-ink'
                    }`}
                  >
                    {key === 'newest' ? 'Newest' : key === 'oldest' ? 'Oldest' : 'A–Z'}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-muted">No games match your search.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((game) => (
                  <GameCard key={game.code} data={cardData.get(game.code) ?? { game, status: 'loading', playCount: null }} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
