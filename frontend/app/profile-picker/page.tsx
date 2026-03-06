"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { Profile, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";
import { uploadProfileAvatar } from "@/lib/uploads";
import EmptyState from "@/components/empty-state";

export default function ProfilePickerPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);

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

  const switchProfile = async (profile: Profile, pinValue?: string) => {
    setIsSwitching(true);
    try {
      await apiClientJson("/session/switch-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profile.id, pin: pinValue ?? undefined })
      });
      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  };

  const onProfileTap = async (profile: Profile) => {
    if (profile.requires_pin) {
      setSelectedProfile(profile);
      setPin("");
      setError(null);
      return;
    }
    try {
      await switchProfile(profile);
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to switch profile."));
    }
  };

  const onSubmitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProfile) return;
    try {
      await switchProfile(selectedProfile, pin);
    } catch (err) {
      setError(toUserErrorMessage(err, "Invalid PIN or switch failed."));
    }
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
      <p className="mt-2 text-sm text-neutral-300">Choose a profile to continue</p>

      <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] px-3 py-2 text-sm">
        Upload my avatar
        <input type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
      </label>

      <div className="mt-6 w-full space-y-3">
        {loading ? <p className="text-sm text-neutral-400">Loading profiles...</p> : null}
        {error ? <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100"><p>{error}</p><button type="button" onClick={() => loadProfiles().then(() => setError(null)).catch((err) => setError(toUserErrorMessage(err, "Unable to load profiles.")))} className="rounded bg-neutral-700 px-3 py-2 text-xs">Retry</button></div> : null}
        {profiles.length === 0 && !loading ? (
          <EmptyState
            icon="👨‍👩‍👧‍👦"
            title="No family profiles yet"
            description="Run the guided setup to create a parent profile and your first project."
            actions={[{ href: "/setup", label: "Start setup" }, { href: "/dashboard", label: "Open dashboard", variant: "secondary" }]}
          />
        ) : null}
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => onProfileTap(profile).catch(() => undefined)}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4 text-left"
          >
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[var(--barn-red)] text-base font-semibold text-white">
              {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{profile.name}</p>
              <p className="text-sm capitalize text-neutral-300">{profile.role}</p>
            </div>
            {profile.requires_pin ? <span className="rounded bg-neutral-700 px-2 py-1 text-xs">PIN</span> : null}
          </button>
        ))}
      </div>

      {selectedProfile ? (
        <form onSubmit={onSubmitPin} className="mt-5 w-full space-y-3 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4 text-left">
          <p className="text-sm font-medium">Enter PIN for {selectedProfile.name}</p>
          <input
            name="pin"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D+/g, "").slice(0, 12))}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            className="w-full rounded-lg border border-[var(--barn-border)] bg-black/20 p-3 text-lg"
            placeholder="PIN"
            required
          />
          <div className="flex gap-2">
            <button disabled={isSwitching} className="min-h-11 flex-1 rounded-lg bg-[var(--barn-red)] px-3 py-2 text-sm font-medium disabled:opacity-60">{isSwitching ? "Switching..." : "Unlock & switch"}</button>
            <button type="button" onClick={() => setSelectedProfile(null)} className="min-h-11 rounded-lg bg-neutral-700 px-3 py-2 text-sm">Cancel</button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
