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
      <div className="w-full space-y-4 px-4 pb-4">
        <h1 className="text-xl font-semibold">Security</h1>
        <p className="barn-card text-sm">Access denied. Only parent profiles can manage security settings.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 px-4 pb-4">
      <h1 className="text-xl font-semibold">Security</h1>
      <p className="text-sm text-[var(--barn-muted)]">PINs protect profile switching and parent-only actions. Biometric unlock is planned for a future native app and is not available yet.</p>
      {message ? <p className="barn-card text-sm">{message}</p> : null}

      <section className="barn-card space-y-2 text-sm">
        <h2 className="text-base font-semibold">Role protections</h2>
        <p><strong>Parent:</strong> {data?.role_protections.parent}</p>
        <p><strong>Kid:</strong> {data?.role_protections.kid}</p>
        <p><strong>Grandparent:</strong> {data?.role_protections.grandparent}</p>
      </section>

      <section className="space-y-3">
        {data?.profiles.map((profile) => (
          <form key={profile.id} onSubmit={(event) => updatePin(event, profile.id).catch(() => undefined)} className="barn-card space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{profile.name} <span className="text-xs capitalize text-[var(--barn-muted)]">({profile.role})</span></p>
              <span className="text-xs">{profile.has_pin ? "PIN set" : "No PIN"}</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input name="pin_enabled" type="checkbox" defaultChecked={profile.has_pin || profile.role === "parent"} /> Require PIN
            </label>
            <input name="pin" type="password" inputMode="numeric" pattern="[0-9]*" minLength={4} maxLength={12} className="w-full rounded bg-neutral-800 p-3" placeholder="New PIN (4-12 digits)" />
            <button className="min-h-11 rounded bg-blue-700 px-3 py-2 text-sm disabled:opacity-60" disabled={saving[profile.id]}>{saving[profile.id] ? "Saving..." : "Save security"}</button>
          </form>
        ))}
      </section>
    </div>
  );
}
