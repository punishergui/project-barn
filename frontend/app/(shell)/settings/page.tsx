"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, AppSettings, AuthStatus, Profile } from "@/lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  const load = () =>
    Promise.all([
      apiClientJson<AppSettings>("/settings"),
      apiClientJson<Profile[]>("/profiles?include_archived=1"),
      apiClientJson<AuthStatus>("/auth/status")
    ]).then(([settingData, profileData, authData]) => {
      setSettings(settingData);
      setProfiles(profileData);
      setAuth(authData);
    });

  useEffect(() => {
    load().catch(() => undefined);
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

  return (
    <div className="w-full space-y-4 px-4 pb-4">
      <h1 className="text-xl font-semibold">Family & Admin Settings</h1>

      <form className="space-y-4" onSubmit={(event) => save(event).catch(() => undefined)}>
        <section className="barn-card space-y-2">
          <h2 className="text-base font-semibold">Family / Barn settings</h2>
          <input defaultValue={settings?.family_name ?? ""} name="family_name" className="w-full rounded bg-neutral-800 p-2" placeholder="Barn display name" />
          <div className="grid grid-cols-2 gap-2">
            <input defaultValue={settings?.county ?? ""} name="county" className="rounded bg-neutral-800 p-2" placeholder="County" />
            <input defaultValue={settings?.state ?? ""} name="state" className="rounded bg-neutral-800 p-2" placeholder="State" />
          </div>
          <input defaultValue={settings?.club_name ?? ""} name="club_name" className="w-full rounded bg-neutral-800 p-2" placeholder="Club / chapter" />
          <input defaultValue={settings?.default_project_year ?? ""} name="default_project_year" type="number" className="w-full rounded bg-neutral-800 p-2" placeholder="Default project year" />
        </section>

        <section className="barn-card space-y-2">
          <h2 className="text-base font-semibold">Project defaults</h2>
          <input defaultValue={settings?.default_species ?? ""} name="default_species" className="w-full rounded bg-neutral-800 p-2" placeholder="Default species / category" />
          <input defaultValue={settings?.default_checklist_template ?? ""} name="default_checklist_template" className="w-full rounded bg-neutral-800 p-2" placeholder="Default checklist template name" />
          <textarea defaultValue={(settings?.default_show_tasks ?? []).join("\n")} name="default_show_tasks" className="w-full rounded bg-neutral-800 p-2" rows={4} placeholder="Default show day tasks (one per line)" />
        </section>

        <section className="barn-card space-y-2">
          <h2 className="text-base font-semibold">Upload / branding</h2>
          <input defaultValue={settings?.brand_logo_url ?? ""} name="brand_logo_url" className="w-full rounded bg-neutral-800 p-2" placeholder="Brand logo URL (optional)" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="brand_show_name" defaultChecked={settings?.brand_show_name ?? true} /> Show brand/family name in app header areas</label>
          <p className="text-xs text-[var(--barn-muted)]">Profile avatars are managed per member profile detail.</p>
        </section>

        <section className="barn-card space-y-2">
          <h2 className="text-base font-semibold">App preferences</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allow_kid_task_toggle" defaultChecked={settings?.allow_kid_task_toggle} /> Allow kid task toggle</label>
        </section>

        <button className="w-full rounded bg-blue-700 px-3 py-2" disabled={!(auth?.role === "parent" && auth.is_unlocked)}>Save settings</button>
      </form>

      <section className="barn-card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Profiles / members</h2>
          <Link href="/settings/profiles" className="rounded bg-neutral-700 px-3 py-1.5 text-xs">Manage</Link>
        </div>
        {profiles.map((profile) => (
          <Link key={profile.id} href={`/settings/profiles/${profile.id}`} className="barn-row block text-sm">
            {profile.name} • {profile.role} {profile.archived ? "(archived)" : ""}
          </Link>
        ))}
      </section>
    </div>
  );
}
