"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, AuthStatus } from "@/lib/api";

export default function MorePage() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => setAuth(await apiClientJson<AuthStatus>("/auth/status"));
  useEffect(() => { load().catch(() => undefined); }, []);

  const unlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pin = new FormData(event.currentTarget).get("pin");
    try {
      await apiClientJson("/auth/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      setMessage("Unlocked for 15 minutes.");
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const setPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pin = new FormData(event.currentTarget).get("pin");
    try {
      await apiClientJson("/auth/set-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      setMessage("PIN saved.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const lock = async () => {
    await apiClientJson("/auth/lock", { method: "POST" });
    await load();
  };

  return <div className="space-y-4 pb-2">
    <h1 className="text-2xl font-semibold">More</h1>
    <section className="grid gap-2 sm:grid-cols-2">
      <Link href="/family" className="rounded border border-white/10 bg-neutral-900 p-4 text-sm">👨‍👩‍👧‍👦 Family</Link>
      <Link href="/reports" className="rounded border border-white/10 bg-neutral-900 p-4 text-sm">🧾 Tax Reports</Link>
    </section>
    <section className="rounded border border-white/10 bg-neutral-900 p-4 text-sm">
      <p>Role: {auth?.role ?? "..."}</p>
      <p>Unlocked: {auth?.is_unlocked ? "Yes" : "No"}</p>
      {auth?.unlock_expires_at ? <p>Expires: {new Date(auth.unlock_expires_at).toLocaleTimeString()}</p> : null}
    </section>
    <form onSubmit={unlock} className="space-y-2 rounded border border-white/10 bg-neutral-900 p-4">
      <h2 className="font-semibold">Unlock parent actions</h2>
      <input name="pin" type="password" className="rounded bg-neutral-800 p-2" placeholder="PIN" />
      <button className="rounded bg-red-700 px-3 py-2">Unlock</button>
      <button type="button" onClick={lock} className="ml-2 rounded bg-neutral-700 px-3 py-2">Lock</button>
    </form>
    <form onSubmit={setPin} className="space-y-2 rounded border border-white/10 bg-neutral-900 p-4">
      <h2 className="font-semibold">Set or rotate PIN</h2>
      <input name="pin" type="password" className="rounded bg-neutral-800 p-2" placeholder="New PIN" />
      <button className="rounded bg-red-700 px-3 py-2">Save PIN</button>
    </form>
    {message ? <p className="text-sm text-neutral-300">{message}</p> : null}
  </div>;
}
