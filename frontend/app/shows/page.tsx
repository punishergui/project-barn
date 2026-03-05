"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiClientJson, AuthStatus, Show } from "@/lib/api";

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  useEffect(() => {
    Promise.all([
      apiClientJson<Show[]>("/shows"),
      apiClientJson<AuthStatus>("/auth/status")
    ]).then(([showList, authStatus]) => {
      setShows(showList);
      setAuth(authStatus);
    }).catch(() => undefined);
  }, []);

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">Shows</h1>
      {auth?.role === "parent" && auth.is_unlocked ? <Link href="/shows/new" className="rounded bg-red-700 px-3 py-2">New Show</Link> : null}
    </div>
    <div className="space-y-2">
      {shows.map((show) => <Link key={show.id} className="block rounded border border-white/10 bg-neutral-900 p-3" href={`/shows/${show.id}`}>
        <p className="font-medium">{show.name}</p>
        <p className="text-sm text-neutral-400">{show.location}</p>
        <p className="text-sm text-neutral-400">{show.start_date.slice(0, 10)} - {show.end_date?.slice(0, 10) ?? "TBD"}</p>
      </Link>)}
    </div>
  </div>;
}
