"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, AuthStatus, Show } from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString();
}

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClientJson<Show[]>("/shows"), apiClientJson<AuthStatus>("/auth/status")])
      .then(([showList, authStatus]) => {
        setShows(showList);
        setAuth(authStatus);
      })
      .finally(() => setLoading(false));
  }, []);

  const sortedShows = useMemo(
    () => [...shows].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()),
    [shows]
  );

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Shows</h1>
          <p className="text-sm text-[var(--barn-muted)]">Track entries, placings, and show-day checklists.</p>
        </div>
        {auth?.role === "parent" && auth.is_unlocked ? (
          <Link href="/shows/new" className="rounded-lg bg-[var(--barn-red)] px-3 py-2 text-sm font-medium text-white">
            Add Show
          </Link>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-[var(--barn-muted)]">Loading shows...</p> : null}

      {!loading && sortedShows.length === 0 ? (
        <div className="barn-card space-y-2 text-sm text-[var(--barn-muted)]">
          <p>No shows yet. Add your first show to start planning.</p>
          {auth?.role === "parent" && auth.is_unlocked ? (
            <Link href="/shows/new" className="see-all-link">Create your first show</Link>
          ) : (
            <p>Parent profile unlock is required to create a show.</p>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        {sortedShows.map((show) => {
          const entryCount = show.entries.length;
          const placingCount = show.entries.reduce((count, entry) => count + entry.placings.length, 0);

          return (
            <Link key={show.id} href={`/shows/${show.id}`} className="barn-card block space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{show.name}</h2>
                  <p className="text-sm text-[var(--barn-muted)]">{show.location}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${placingCount > 0 ? "bg-emerald-700/70 text-white" : "bg-[var(--barn-bg)] text-[var(--barn-muted)]"}`}>
                  {placingCount > 0 ? "Placings recorded" : "No placings yet"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <p className="barn-row">Date: {formatDate(show.start_date)}</p>
                <p className="barn-row">Entries: {entryCount}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
