"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiClientJson, AuthStatus, Show } from "@/lib/api";

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClientJson<Show[]>("/shows"),
      apiClientJson<AuthStatus>("/auth/status")
    ]).then(([showList, authStatus]) => {
      setShows(showList);
      setAuth(authStatus);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return <div className="space-y-4 pb-2">
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">Shows</h1>
      {auth?.role === "parent" && auth.is_unlocked ? <Link href="/shows/new" className="rounded bg-red-700 px-3 py-2">New Show</Link> : null}
    </div>
    {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded bg-neutral-900" />)}</div> : null}
    {!loading && shows.length === 0 ? <p className="rounded border border-white/10 bg-neutral-900 p-4 text-sm text-neutral-300">No shows scheduled yet.</p> : null}
    <div className="space-y-2">
      {shows.map((show) => <div key={show.id} className="rounded border border-white/10 bg-neutral-900 p-3">
        <Link className="block" href={`/shows/${show.id}`}>
          <p className="font-medium">{show.name}</p>
          <p className="text-sm text-neutral-400">{show.location}</p>
          <p className="text-sm text-neutral-400">{show.start_date.slice(0, 10)} - {show.end_date?.slice(0, 10) ?? "TBD"}</p>
        </Link>
        <Link href={`/shows/${show.id}/day`} className="mt-2 inline-block rounded bg-red-700 px-3 py-1 text-xs">Show Day Mode</Link>
      </div>)}
    </div>
  </div>;
}
