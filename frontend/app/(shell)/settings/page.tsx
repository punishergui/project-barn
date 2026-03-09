"use client";

import { Camera } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppSettings, Profile, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";

const inputClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

type AuthStatusResponse = {
  is_parent?: boolean;
  profile_id?: number | null;
  name?: string | null;
  role?: string | null;
  requires_pin?: boolean;
  is_unlocked?: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auth, setAuth] = useState<AuthStatusResponse | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  const load = async () => {
    const authData = await apiClientJson<AuthStatusResponse>("/auth/status");
    setAuth(authData);

    if (authData.profile_id) {
      const profileData = await apiClientJson<Profile>(`/profiles/${authData.profile_id}`);
      setCurrentProfile(profileData);
      setAvatarUrl(profileData.avatar_url ?? null);
    } else {
      setCurrentProfile(null);
      setAvatarUrl(null);
    }

    if (authData.role !== "parent") {
      setSettings(null);
      setProfiles([]);
      setErrorMessage(null);
      return;
    }

    const [settingData, profileData] = await Promise.all([
      apiClientJson<AppSettings>("/settings"),
      apiClientJson<Profile[]>("/profiles?include_archived=1")
    ]);
    setSettings(settingData);
    setProfiles(profileData);
    setErrorMessage(null);
  };

  useEffect(() => {
    load().catch((error) => setErrorMessage(toUserErrorMessage(error, "Unable to load settings.")));
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const defaultShowTasks = String(form.get("default_show_tasks") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    await apiClientJson("/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        family_name: form.get("family_name"),
        county: form.get("county"),
        state: form.get("state"),
        club_name: form.get("club_name"),
        default_project_year: form.get("default_project_year") || null,
        default_species: form.get("default_species"),
        default_checklist_template: form.get("default_checklist_template"),
        default_show_tasks: defaultShowTasks,
        brand_logo_url: form.get("brand_logo_url"),
        brand_show_name: form.get("brand_show_name") === "on",
        allow_kid_task_toggle: form.get("allow_kid_task_toggle") === "on"
      })
    });
    await load();
  };

  const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth?.profile_id) return;

    try {
      const form = new FormData();
      form.append("avatar", file);
      const response = await fetch(`/api/profiles/${auth.profile_id}/avatar`, { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as { avatar_url?: string; error?: string };
      if (!response.ok || !data.avatar_url) throw new Error(data.error || "Upload failed");
      setAvatarUrl(data.avatar_url);
      toast.success("Avatar updated");
    } catch {
      toast.error("Upload failed");
    } finally {
      event.target.value = "";
    }
  };

  const handleChangePin = async () => {
    if (!auth?.profile_id) return;

    try {
      const response = await fetch(`/api/profiles/${auth.profile_id}/change-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_pin: currentPin, new_pin: newPin })
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to update PIN");
      toast.success("PIN updated");
      setCurrentPin("");
      setNewPin("");
    } catch (error) {
      toast.error(toUserErrorMessage(error, "Unable to update PIN"));
    }
  };

  return (
    <div className="w-full pb-4">
      <h1 className="mb-4 font-serif text-2xl text-foreground">Family & Admin Settings</h1>
      {errorMessage ? <p className="mb-4 text-sm text-muted-foreground">{errorMessage}</p> : null}

      <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-serif text-foreground">Profile</h2>
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-4 border-primary/30"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={currentProfile?.name ?? "Profile"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary text-2xl font-serif text-foreground">
                {initials(currentProfile?.name ?? auth?.name ?? "PB")}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={20} color="white" />
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarSelected(event).catch(() => undefined)} />
          <p className="text-sm text-muted-foreground">Tap avatar to upload</p>
        </div>
      </section>

      {auth?.requires_pin ? (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-serif text-lg text-foreground">Change PIN</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Current PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(event) => setNewPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <button onClick={() => handleChangePin().catch(() => undefined)} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Update PIN
            </button>
          </div>
        </div>
      ) : null}

      {auth?.role !== "parent" ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Family settings are available for parent profiles.</p>
          <Link href="/profile-picker" className="mt-3 inline-block rounded-xl bg-secondary px-4 py-2 text-sm text-foreground">Switch profile</Link>
        </div>
      ) : (
        <>
          <form id="settings-form" className="space-y-4" onSubmit={(event) => save(event).catch((error) => setErrorMessage(toUserErrorMessage(error, "Unable to save settings.")))}>
            <section className="mb-4 rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Family / Barn settings</h2>
              <div className="space-y-2">
                <input defaultValue={settings?.family_name ?? ""} name="family_name" className={inputClassName} placeholder="Barn display name" />
                <div className="grid grid-cols-2 gap-2">
                  <input defaultValue={settings?.county ?? ""} name="county" className={inputClassName} placeholder="County" />
                  <input defaultValue={settings?.state ?? ""} name="state" className={inputClassName} placeholder="State" />
                </div>
                <input defaultValue={settings?.club_name ?? ""} name="club_name" className={inputClassName} placeholder="Club / chapter" />
                <input defaultValue={settings?.default_project_year ?? ""} name="default_project_year" type="number" className={inputClassName} placeholder="Default project year" />
              </div>
            </section>

            <section className="mb-4 rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Project defaults</h2>
              <div className="space-y-2">
                <input defaultValue={settings?.default_species ?? ""} name="default_species" className={inputClassName} placeholder="Default species / category" />
                <input defaultValue={settings?.default_checklist_template ?? ""} name="default_checklist_template" className={inputClassName} placeholder="Default checklist template name" />
                <textarea defaultValue={(settings?.default_show_tasks ?? []).join("\n")} name="default_show_tasks" className={inputClassName} rows={4} placeholder="Default show day tasks (one per line)" />
              </div>
            </section>

            <section className="mb-4 rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Upload / branding</h2>
              <div className="space-y-2">
                <input defaultValue={settings?.brand_logo_url ?? ""} name="brand_logo_url" className={inputClassName} placeholder="Brand logo URL (optional)" />
                <label className="flex items-center justify-between border-b border-border py-2 text-sm text-foreground last:border-0">
                  Show brand/family name in app header areas
                  <input type="checkbox" name="brand_show_name" defaultChecked={settings?.brand_show_name ?? true} className="h-4 w-4 accent-primary" />
                </label>
              </div>
            </section>

            <section className="mb-4 rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">App preferences</h2>
              <label className="flex items-center justify-between border-b border-border py-2 text-sm text-foreground last:border-0">
                Allow kid task toggle
                <input type="checkbox" name="allow_kid_task_toggle" defaultChecked={settings?.allow_kid_task_toggle} className="h-4 w-4 accent-primary" />
              </label>
            </section>
          </form>

          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Appearance</p>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-foreground">Dark mode</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={cn("relative h-6 w-11 rounded-full transition-colors", theme === "dark" ? "bg-primary" : "border border-border bg-secondary")}
              >
                <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", theme === "dark" ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>
          </div>

          <button form="settings-form" className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground" disabled={!auth?.is_unlocked}>
            Save settings
          </button>

          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Profiles / members</h2>
              <div className="flex gap-2">
                <Link href="/settings/security" className="rounded-xl bg-secondary px-3 py-1.5 text-xs text-foreground">Security</Link>
                <Link href="/settings/profiles" className="rounded-xl bg-secondary px-3 py-1.5 text-xs text-foreground">Manage</Link>
              </div>
            </div>
            <div className="space-y-2">
              {profiles.map((profile) => (
                <Link key={profile.id} href={`/settings/profiles/${profile.id}`} className="block text-sm text-muted-foreground">
                  {profile.name} • {profile.role} {profile.archived ? "(archived)" : ""}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
