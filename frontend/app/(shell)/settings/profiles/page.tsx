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
    <div className="w-full space-y-3 px-4 pb-4">
      <h1 className="text-xl font-semibold">Profiles / Members</h1>
      {profiles.length === 0 ? (
        <EmptyState
          icon="👤"
          title="No profiles available"
          description="Run setup to create your first parent profile and continue onboarding."
          actions={[{ href: "/setup", label: "Open setup" }]}
        />
      ) : profiles.map((profile) => (
        <Link key={profile.id} href={`/settings/profiles/${profile.id}`} className="text-sm text-muted-foreground block text-sm">
          <p className="font-medium">{profile.name}</p>
          <p className="text-xs text-muted-foreground">{profile.role} • {profile.archived ? "Archived" : "Active"}</p>
        </Link>
      ))}
    </div>
  );
}
