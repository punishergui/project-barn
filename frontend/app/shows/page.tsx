"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, AuthStatus, Show } from "@/lib/api";

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClientJson<Show[]>("/shows"), apiClientJson<AuthStatus>("/auth/status")]).then(([showList, authStatus]) => {
      setShows(showList);
      setAuth(authStatus);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sortedShows = useMemo(() => [...shows].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()), [shows]);

  return <div className="space-y-4 pb-3">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Shows</h1>
      {auth?.role === "parent" && auth.is_unlocked ? <Link href="/shows/new" className="rounded bg-red-700 px-3 py-2">New Show</Link> : null}
    </div>
    {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded bg-neutral-900" />)}</div> : null}
    {!loading && sortedShows.length === 0 ? <p className="rounded border border-white/10 bg-neutral-900 p-4 text-sm text-neutral-300">No shows scheduled yet.</p> : null}
    <div className="space-y-2">
      {sortedShows.map((show) => <div key={show.id} className="rounded border border-white/10 bg-neutral-900 p-3">
        <Link className="block" href={`/shows/${show.id}`}>
          <p className="font-medium">{show.name}</p>
          <p className="text-sm text-neutral-400">{show.location}</p>
          <p className="text-sm text-neutral-400">Next show date: {show.start_date.slice(0, 10)}</p>
          <p className="text-xs text-neutral-400">Animals attending: {show.entries.length}</p>
        </Link>
      </div>)}
    </div>
  </div>;
}
