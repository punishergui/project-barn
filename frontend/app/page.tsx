"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BarnLogo from "@/components/BarnLogo";
import { apiClientJson, Profile } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClientJson<Profile[]>("/profiles")
      .then((profileData) => {
        setProfiles(profileData);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const switchProfile = async (profileId: number) => {
    await apiClientJson("/session/switch-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId })
    });
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <BarnLogo size={90} className="mb-4" />
      <h1 className="text-3xl font-semibold text-white">Project Barn</h1>
      <p className="mt-2 text-sm text-neutral-300">Choose a profile</p>

      <div className="mt-6 w-full space-y-3">
        {loading ? <p className="text-sm text-neutral-400">Loading profiles...</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => switchProfile(profile.id).catch((err) => setError((err as Error).message))}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4 text-left"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--barn-red)] text-base font-semibold text-white">
              {profile.avatar_url ? "👤" : profile.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{profile.name}</p>
              <p className="text-sm capitalize text-neutral-300">{profile.role}</p>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
