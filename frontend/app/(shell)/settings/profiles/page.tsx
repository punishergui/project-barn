"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import EmptyState from "@/components/empty-state";
import { apiClientJson, Profile } from "@/lib/api";

export default function SettingsProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    apiClientJson<Profile[]>("/profiles?include_archived=1").then(setProfiles).catch(() => setProfiles([]));
  }, []);

  return (
    <div className="w-full px-4 pb-4">
      <h1 className="mb-4 font-serif text-2xl text-foreground">Profiles / Members</h1>
      {profiles.length === 0 ? (
        <EmptyState
          icon="👤"
          title="No profiles available"
          description="Run setup to create your first parent profile and continue onboarding."
          actions={[{ href: "/setup", label: "Open setup" }]}
        />
      ) : profiles.map((profile) => (
        <Link
          key={profile.id}
          href={`/settings/profiles/${profile.id}`}
          className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {profile.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{profile.name}</p>
            <p className="text-xs capitalize text-muted-foreground">{profile.role} • {profile.archived ? "Archived" : "Active"}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
