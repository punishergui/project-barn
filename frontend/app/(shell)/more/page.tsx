"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AuthStatus, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

export default function MorePage() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setAuth(await apiClientJson<AuthStatus>("/auth/status"));
    } catch (error) {
      setMessage(toUserErrorMessage(error, "Unable to load settings status."));
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const unlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pin = new FormData(event.currentTarget).get("pin");
    try {
      await apiClientJson("/auth/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      setMessage("Unlocked for 15 minutes.");
      await load();
    } catch (error) {
      setMessage(toUserErrorMessage(error, "Unable to unlock right now."));
    }
  };

  const setPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pin = new FormData(event.currentTarget).get("pin");
    try {
      await apiClientJson("/auth/set-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      setMessage("PIN saved.");
    } catch (error) {
      setMessage(toUserErrorMessage(error, "Unable to save PIN right now."));
    }
  };

  const lock = async () => {
    try {
      await apiClientJson("/auth/lock", { method: "POST" });
      await load();
      setMessage("Locked.");
    } catch (error) {
      setMessage(toUserErrorMessage(error, "Unable to lock right now."));
    }
  };

  return (
    <div className="w-full space-y-4 px-4 pb-4">
      <h1 className="text-2xl font-semibold">More</h1>
      <section className="barn-card grid gap-2 sm:grid-cols-2">
        <Link href="/dashboard" className="quick-action-card justify-start px-4 text-sm">🏠 Dashboard</Link>
        <Link href="/projects" className="quick-action-card justify-start px-4 text-sm">🐄 Projects</Link>
        <Link href="/tasks" className="quick-action-card justify-start px-4 text-sm">✅ Tasks</Link>
        <Link href="/shows" className="quick-action-card justify-start px-4 text-sm">🏆 Shows</Link>
        <Link href="/feed" className="quick-action-card justify-start px-4 text-sm">🌾 Feed</Link>
        <Link href="/expenses" className="quick-action-card justify-start px-4 text-sm">🧾 Expenses</Link>
        <Link href="/family" className="quick-action-card justify-start px-4 text-sm">👨‍👩‍👧‍👦 Family</Link>
        <Link href="/reports" className="quick-action-card justify-start px-4 text-sm">📊 Reports</Link>
        <Link href="/activity" className="quick-action-card justify-start px-4 text-sm">🕒 Activity</Link>
        <Link href="/notifications" className="quick-action-card justify-start px-4 text-sm">🔔 Notifications</Link>
        <Link href="/income" className="quick-action-card justify-start px-4 text-sm">💰 Income</Link>
        <Link href="/inventory" className="quick-action-card justify-start px-4 text-sm">🧰 Inventory</Link>
        <Link href="/auctions" className="quick-action-card justify-start px-4 text-sm">🏷️ Auctions</Link>
        <Link href="/settings" className="quick-action-card justify-start px-4 text-sm">⚙️ Settings</Link>
        <Link href="/admin" className="quick-action-card justify-start px-4 text-sm">🛡️ Parent Admin</Link>
        <Link href="/profile-picker" className="quick-action-card justify-start px-4 text-sm">🔄 Switch Profile</Link>
      </section>
      <section className="barn-card text-sm">
        <p>Role: {auth?.role ?? "..."}</p>
        <p>Unlocked: {auth?.is_unlocked ? "Yes" : "No"}</p>
        {auth?.unlock_expires_at ? <p>Expires: {new Date(auth.unlock_expires_at).toLocaleTimeString()}</p> : null}
      </section>
      <form onSubmit={unlock} className="barn-card space-y-2">
        <h2 className="font-semibold">Unlock parent actions</h2>
        <input name="pin" type="password" className="w-full rounded-lg border border-[var(--barn-border)] bg-black/20 p-2" placeholder="PIN" />
        <div className="flex gap-2">
          <button className="rounded-lg bg-[var(--barn-red)] px-3 py-2 text-sm">Unlock</button>
          <button type="button" onClick={() => lock().catch(() => undefined)} className="rounded-lg bg-neutral-700 px-3 py-2 text-sm">Lock</button>
        </div>
      </form>
      <form onSubmit={setPin} className="barn-card space-y-2">
        <h2 className="font-semibold">Set or rotate PIN</h2>
        <input name="pin" type="password" className="w-full rounded-lg border border-[var(--barn-border)] bg-black/20 p-2" placeholder="New PIN" />
        <button className="rounded-lg bg-[var(--barn-red)] px-3 py-2 text-sm">Save PIN</button>
      </form>
      {message ? <p className="text-sm text-neutral-300">{message}</p> : null}
    </div>
  );
}
