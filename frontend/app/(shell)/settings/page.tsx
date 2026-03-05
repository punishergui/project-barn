"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiClientJson, AppSettings, AuthStatus, Profile } from "@/lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  const load = () => Promise.all([apiClientJson<AppSettings>("/settings"), apiClientJson<Profile[]>("/profiles"), apiClientJson<AuthStatus>("/auth/status")]).then(([a, b, c]) => {
    setSettings(a); setProfiles(b); setAuth(c);
  });

  useEffect(() => { load().catch(() => undefined); }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson("/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ family_name: form.get("family_name"), allow_kid_task_toggle: form.get("allow_kid_task_toggle") === "on" }) });
    await load();
  };

  const lock = async () => { await apiClientJson("/auth/lock", { method: "POST" }); await load(); };

  const setPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson("/auth/set-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: form.get("pin") }) });
    (event.target as HTMLFormElement).reset();
  };

  return <div className="space-y-4">
    <h1 className="text-xl font-semibold">Settings</h1>
    <form className="grid gap-2 rounded border border-white/10 bg-neutral-900 p-3" onSubmit={save}>
      <input defaultValue={settings?.family_name ?? ""} name="family_name" className="rounded bg-neutral-800 p-2" placeholder="Family name" />
      <label className="flex items-center gap-2"><input type="checkbox" name="allow_kid_task_toggle" defaultChecked={settings?.allow_kid_task_toggle} /> Allow kid task toggle</label>
      <button className="rounded bg-blue-700 px-3 py-2" disabled={!(auth?.role === "parent" && auth.is_unlocked)}>Save settings</button>
    </form>
    <form className="grid gap-2 rounded border border-white/10 bg-neutral-900 p-3" onSubmit={setPin}><input name="pin" className="rounded bg-neutral-800 p-2" placeholder="Set or change PIN" /><button className="rounded bg-neutral-700 px-3 py-2" disabled={auth?.role !== "parent"}>Save PIN</button></form>
    <button className="rounded bg-red-700 px-3 py-2" onClick={lock}>Lock now</button>
    <section className="rounded border border-white/10 bg-neutral-900 p-3"><h2 className="font-semibold">Profiles</h2>{profiles.map((profile) => <p key={profile.id} className="text-sm">{profile.name} • {profile.role}</p>)}</section>
  </div>;
}
