"use client";

import { FormEvent, useEffect, useState } from "react";

import { AuthStatus, SecuritySettingsResponse, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

type SavingState = { [profileId: number]: boolean };

export default function SecuritySettingsPage() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [data, setData] = useState<SecuritySettingsResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<SavingState>({});

  const load = async () => {
    const authData = await apiClientJson<AuthStatus>("/auth/status");
    setAuth(authData);
    if (authData.role !== "parent") return;
    const payload = await apiClientJson<SecuritySettingsResponse>("/settings/security");
    setData(payload);
  };

  useEffect(() => {
    load().catch((error) => setMessage(toUserErrorMessage(error, "Unable to load security settings.")));
  }, []);

  const updatePin = async (event: FormEvent<HTMLFormElement>, profileId: number) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const pin = String(form.get("pin") || "").trim();
    const pinEnabled = form.get("pin_enabled") === "on";

    setSaving((prev) => ({ ...prev, [profileId]: true }));
    try {
      await apiClientJson("/settings/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, pin_enabled: pinEnabled, pin: pinEnabled ? pin : null })
      });
      setMessage("Security settings updated.");
      await load();
      event.currentTarget.reset();
    } catch (error) {
      setMessage(toUserErrorMessage(error, "Unable to update this PIN setting."));
    } finally {
      setSaving((prev) => ({ ...prev, [profileId]: false }));
    }
  };

  if (auth?.role && auth.role !== "parent") {
    return (
      <div className="w-full px-4 pb-4">
        <h1 className="mb-1 font-serif text-2xl text-foreground">Security</h1>
        <p className="mb-4 text-sm text-muted-foreground">PINs protect profile switching and parent-only actions.</p>
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Access denied. Only parent profiles can manage security settings.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 pb-4">
      <h1 className="mb-1 font-serif text-2xl text-foreground">Security</h1>
      <p className="mb-4 text-sm text-muted-foreground">PINs protect profile switching and parent-only actions. Biometric unlock is planned for a future native app and is not available yet.</p>
      {message ? <p className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">{message}</p> : null}

      <section className="mb-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Role protections</h2>
        <div className="flex justify-between border-b border-border py-1.5 last:border-0">
          <p className="text-sm font-medium text-foreground">Parent</p>
          <p className="text-sm text-muted-foreground">{data?.role_protections.parent}</p>
        </div>
        <div className="flex justify-between border-b border-border py-1.5 last:border-0">
          <p className="text-sm font-medium text-foreground">Kid</p>
          <p className="text-sm text-muted-foreground">{data?.role_protections.kid}</p>
        </div>
        <div className="flex justify-between border-b border-border py-1.5 last:border-0">
          <p className="text-sm font-medium text-foreground">Grandparent</p>
          <p className="text-sm text-muted-foreground">{data?.role_protections.grandparent}</p>
        </div>
      </section>

      <section>
        {data?.profiles.map((profile) => (
          <form key={profile.id} onSubmit={(event) => updatePin(event, profile.id).catch(() => undefined)} className="mb-3 rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{profile.name}</p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{profile.role}</span>
              <span className="ml-auto text-xs text-muted-foreground">{profile.has_pin ? "PIN set" : "No PIN"}</span>
            </div>
            <label className="flex items-center gap-2 py-2">
              <input name="pin_enabled" type="checkbox" defaultChecked={profile.has_pin || profile.role === "parent"} className="accent-primary" />
              <span className="text-sm text-foreground">Require PIN</span>
            </label>
            <input name="pin" type="password" inputMode="numeric" pattern="[0-9]*" minLength={4} maxLength={12} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="New PIN (4–12 digits)" />
            <button className="mt-1 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60" disabled={saving[profile.id]}>{saving[profile.id] ? "Saving..." : "Save security"}</button>
          </form>
        ))}
      </section>
    </div>
  );
}
