"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AppSettings, AuthStatus, Profile, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

const inputClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = async () => {
    const authData = await apiClientJson<AuthStatus>("/auth/status");
    setAuth(authData);

    if (authData.role !== "parent") {
      setErrorMessage("Access denied. Switch to a parent profile to manage family settings.");
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

  if (auth?.role && auth.role !== "parent") {
    return (
      <div className="w-full pb-4">
        <h1 className="mb-4 font-serif text-2xl text-foreground">Family & Admin Settings</h1>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Access denied. Parent profile required for family settings.</p>
          <Link
            href="/profile-picker"
            className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Switch profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-4">
      <h1 className="mb-4 font-serif text-2xl text-foreground">Family & Admin Settings</h1>
      {errorMessage ? <p className="mb-4 text-sm text-muted-foreground">{errorMessage}</p> : null}

      <form className="space-y-4" onSubmit={(event) => save(event).catch((error) => setErrorMessage(toUserErrorMessage(error, "Unable to save settings.")))}>
        <section className="mb-4 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Family / Barn settings</h2>
          <div className="space-y-2">
            <input defaultValue={settings?.family_name ?? ""} name="family_name" className={inputClassName} placeholder="Barn display name" />
            <div className="grid grid-cols-2 gap-2">
              <input defaultValue={settings?.county ?? ""} name="county" className={inputClassName} placeholder="County" />
              <input defaultValue={settings?.state ?? ""} name="state" className={inputClassName} placeholder="State" />
            </div>
            <input defaultValue={settings?.club_name ?? ""} name="club_name" className={inputClassName} placeholder="Club / chapter" />
            <input
              defaultValue={settings?.default_project_year ?? ""}
              name="default_project_year"
              type="number"
              className={inputClassName}
              placeholder="Default project year"
            />
          </div>
        </section>

        <section className="mb-4 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Project defaults</h2>
          <div className="space-y-2">
            <input defaultValue={settings?.default_species ?? ""} name="default_species" className={inputClassName} placeholder="Default species / category" />
            <input
              defaultValue={settings?.default_checklist_template ?? ""}
              name="default_checklist_template"
              className={inputClassName}
              placeholder="Default checklist template name"
            />
            <textarea
              defaultValue={(settings?.default_show_tasks ?? []).join("\n")}
              name="default_show_tasks"
              className={inputClassName}
              rows={4}
              placeholder="Default show day tasks (one per line)"
            />
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

        <button
          className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          disabled={!(auth?.role === "parent" && auth.is_unlocked)}
        >
          Save settings
        </button>
      </form>

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
            <Link
              key={profile.id}
              href={`/settings/profiles/${profile.id}`}
              className="block text-sm text-muted-foreground"
            >
              {profile.name} • {profile.role} {profile.archived ? "(archived)" : ""}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
