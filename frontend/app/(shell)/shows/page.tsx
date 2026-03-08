"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthStatus, Show, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString();
}

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [showList, authStatus] = await Promise.all([apiClientJson<Show[]>("/shows"), apiClientJson<AuthStatus>("/auth/status")]);
      setShows(showList);
      setAuth(authStatus);
    } catch (loadError) {
      setError(toUserErrorMessage(loadError, "Unable to load shows right now."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const sortedShows = useMemo(
    () => [...shows].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()),
    [shows]
  );

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Shows</h1>
          <p className="text-sm text-muted-foreground">Track entries, placings, and show-day checklists.</p>
        </div>
        {auth?.role === "parent" && auth.is_unlocked ? (
          <Link href="/shows/new" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Add Show
          </Link>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading shows...</p> : null}

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm">
          <p className="text-destructive">{error}</p>
          <button type="button" onClick={() => load().catch(() => undefined)} className="mt-2 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && sortedShows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          <p>No shows yet. Add your first show to start planning.</p>
          {auth?.role === "parent" && auth.is_unlocked ? (
            <Link href="/shows/new" className="mt-2 inline-block text-primary underline-offset-2 hover:underline">
              Create your first show
            </Link>
          ) : (
            <p className="mt-2">Parent profile unlock is required to create a show.</p>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        {sortedShows.map((show) => {
          const entryCount = show.entries.length;
          const placingCount = show.entries.reduce((count, entry) => count + entry.placings.length, 0);

          return (
            <Link
              key={show.id}
              href={`/shows/${show.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div>
                <h2 className="text-sm font-semibold text-foreground">{show.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{show.location}</p>
                <p className="text-xs text-muted-foreground">{formatDate(show.start_date)}</p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">{formatDate(show.start_date)}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{entryCount} entries</span>
                {placingCount > 0 ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-800">Placings recorded</span> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
