"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AuthStatus, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

const navLinks = [
  { href: "/dashboard", label: "🏠 Dashboard" },
  { href: "/projects", label: "🐄 Projects" },
  { href: "/tasks", label: "✅ Tasks" },
  { href: "/shows", label: "🏆 Shows" },
  { href: "/feed", label: "🌾 Feed" },
  { href: "/expenses", label: "🧾 Expenses" },
  { href: "/family", label: "👨‍👩‍👧‍👦 Family" },
  { href: "/reports", label: "📊 Reports" },
  { href: "/activity", label: "🕒 Activity" },
  { href: "/notifications", label: "🔔 Notifications" },
  { href: "/income", label: "💰 Income" },
  { href: "/inventory", label: "🧰 Inventory" },
  { href: "/equipment", label: "🪛 Equipment" },
  { href: "/packing-lists", label: "🎒 Packing Lists" },
  { href: "/auctions", label: "🏷️ Auctions" },
  { href: "/settings", label: "⚙️ Settings" },
  { href: "/admin", label: "🛡️ Parent Admin" },
  { href: "/profile-picker", label: "🔄 Switch Profile" }
];

const fieldClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

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
    const formData = new FormData(event.currentTarget);
    const pin = String(formData.get("pin") || "").trim();
    const currentPin = String(formData.get("current_pin") || "").trim();
    try {
      await apiClientJson("/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          current_pin: currentPin || undefined
        })
      });
      setMessage("PIN saved.");
      event.currentTarget.reset();
      await load();
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
    <div className="w-full pb-4">
      <h1 className="mb-4 font-serif text-2xl text-foreground">More</h1>

      <section className="mb-4 grid grid-cols-2 gap-2">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </section>

      <section className="mb-4 flex flex-col gap-1 rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">Role:</span> {auth?.role ?? "..."}
        </p>
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">Unlocked:</span> {auth?.is_unlocked ? "Yes" : "No"}
        </p>
        {auth?.unlock_expires_at ? (
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">Expires:</span> {new Date(auth.unlock_expires_at).toLocaleTimeString()}
          </p>
        ) : null}
      </section>

      <form onSubmit={unlock} className="mb-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Unlock parent actions</h2>
        <input name="pin" type="password" className={fieldClassName} placeholder="PIN" />
        <div className="mt-2 flex gap-2">
          <button className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">Unlock</button>
          <button
            type="button"
            onClick={() => lock().catch(() => undefined)}
            className="rounded-xl bg-secondary px-4 py-2 text-sm text-foreground"
          >
            Lock
          </button>
        </div>
      </form>

      <form onSubmit={setPin} className="mb-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Set or rotate PIN</h2>
        <div className="space-y-2">
          <input
            name="current_pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            className={fieldClassName}
            placeholder="Current PIN (required when rotating)"
          />
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={4}
            maxLength={12}
            className={fieldClassName}
            placeholder="New PIN (4-12 digits)"
            required
          />
          <button className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">Save PIN</button>
        </div>
      </form>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
