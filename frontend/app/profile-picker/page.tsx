"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";

import { apiClientJson, Profile } from "@/lib/api";
import { uploadProfileAvatar } from "@/lib/uploads";
import { toUserErrorMessage } from "@/lib/errorMessage";

export default function ProfilePickerPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = async () => {
    const profileData = await apiClientJson<Profile[]>("/profiles");
    setProfiles(profileData);
  };

  useEffect(() => {
    loadProfiles()
      .then(() => setError(null))
      .catch((err) => setError(toUserErrorMessage(err, "Unable to load profiles.")))
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

  const onUploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadProfileAvatar(file);
      await loadProfiles();
      router.refresh();
      setError(null);
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to upload avatar."));
    } finally {
      event.target.value = "";
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <Image src="/brand/barn-logo.png" alt="Project Barn" width={92} height={92} priority className="mb-4 rounded-2xl" />
      <h1 className="text-3xl font-semibold text-white">Project Barn</h1>
      <p className="mt-2 text-sm text-neutral-300">Choose a profile</p>

      <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] px-3 py-2 text-sm">
        Upload my avatar
        <input type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
      </label>

      <div className="mt-6 w-full space-y-3">
        {loading ? <p className="text-sm text-neutral-400">Loading profiles...</p> : null}
        {error ? <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100"><p>{error}</p><button type="button" onClick={() => loadProfiles().then(() => setError(null)).catch((err) => setError(toUserErrorMessage(err, "Unable to load profiles.")))} className="rounded bg-neutral-700 px-3 py-2 text-xs">Retry</button></div> : null}
        {profiles.length === 0 && !loading ? (
          <div className="rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4 text-sm text-neutral-300">
            <p>No profiles found yet.</p>
            <p className="mt-1">Ask a parent to create a family profile in Settings.</p>
          </div>
        ) : null}
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => switchProfile(profile.id).catch((err) => setError(toUserErrorMessage(err, "Unable to load profiles.")))}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4 text-left"
          >
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[var(--barn-red)] text-base font-semibold text-white">
              {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}
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
