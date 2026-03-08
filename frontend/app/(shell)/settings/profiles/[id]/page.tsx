"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { ProfileLifetimeSummary, apiClientJson, Profile } from "@/lib/api";
import { uploadProfileAvatar } from "@/lib/uploads";

export default function SettingsProfileDetailPage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lifetime, setLifetime] = useState<ProfileLifetimeSummary | null>(null);

  const load = async () => {
    const [profileData, lifetimeData] = await Promise.all([
      apiClientJson<Profile>(`/profiles/${params.id}`),
      apiClientJson<ProfileLifetimeSummary>(`/profiles/${params.id}/lifetime-summary`).catch(() => null)
    ]);
    setProfile(profileData);
    setLifetime(lifetimeData);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/profiles/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        role: form.get("role"),
        color: form.get("color"),
        club_name: form.get("club_name"),
        county: form.get("county"),
        state: form.get("state"),
        years_in_4h: form.get("years_in_4h") || null,
        birthdate: form.get("birthdate") || null,
        archived: form.get("archived") === "on"
      })
    });
    await load();
  };

  const uploadAvatar = async (file: File) => {
    await uploadProfileAvatar(file);
    await load();
  };

  if (!profile) return <p className="px-4">Loading profile...</p>;

  return (
    <div className="w-full space-y-3 px-4 pb-4">
      <h1 className="text-xl font-semibold">{profile.name}</h1>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2 text-sm">
        <p>Active projects: {profile.summary?.active_projects ?? 0}</p>
        <p>Shows: {profile.summary?.shows ?? 0}</p>
        <p>Expenses: {profile.summary?.expenses ?? 0}</p>
        <p>Age: {lifetime?.age ?? "—"}</p>
        <p>Years active: {lifetime?.years_active ?? profile.years_in_4h ?? 1}</p>
        <p>Lifetime ribbons: {lifetime?.lifetime_ribbons ?? 0}</p>
        <p>Lifetime expenses: ${lifetime?.lifetime_expenses.toFixed(2) ?? "0.00"}</p>
        <p>Lifetime income: ${lifetime?.lifetime_income.toFixed(2) ?? "0.00"}</p>
      </section>

      <form className="rounded-2xl bg-card border border-border shadow-sm p-4 grid gap-2" onSubmit={(event) => save(event).catch(() => undefined)}>
        <input name="name" defaultValue={profile.name} className="rounded bg-background p-2" placeholder="Profile name" required />
        <select name="role" defaultValue={profile.role} className="rounded bg-background p-2">
          <option value="parent">parent</option>
          <option value="kid">kid</option>
          <option value="grandparent">grandparent</option>
        </select>
        <input name="color" defaultValue={profile.color ?? "#A08060"} className="rounded bg-background p-2" placeholder="#A08060" />
        <div className="grid grid-cols-2 gap-2">
          <input name="county" defaultValue={profile.county ?? ""} className="rounded bg-background p-2" placeholder="County" />
          <input name="state" defaultValue={profile.state ?? ""} className="rounded bg-background p-2" placeholder="State" />
        </div>
        <input name="club_name" defaultValue={profile.club_name ?? ""} className="rounded bg-background p-2" placeholder="Club / chapter" />
        <div className="grid grid-cols-2 gap-2">
          <input name="years_in_4h" type="number" defaultValue={profile.years_in_4h ?? ""} className="rounded bg-background p-2" placeholder="Years in 4-H" />
          <input name="birthdate" type="date" defaultValue={profile.birthdate ?? ""} className="rounded bg-background p-2" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="archived" defaultChecked={profile.archived} /> Archived</label>
        <button className="rounded bg-primary text-primary-foreground px-3 py-2">Save profile</button>
      </form>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <h2 className="text-base font-semibold">Avatar</h2>
        <label className="inline-flex rounded bg-secondary text-foreground px-3 py-2 text-xs">Upload avatar<input className="hidden" type="file" accept="image/*" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) uploadAvatar(file).catch(() => undefined);
        }} /></label>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <h2 className="text-base font-semibold">Owned projects</h2>
        {(profile.projects ?? []).map((project) => <p key={project.id} className="text-sm text-muted-foreground text-sm">{project.name}</p>)}
      </section>
    </div>
  );
}
