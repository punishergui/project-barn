"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BarnLogo from "@/components/BarnLogo";
import { Badge } from "@/components/ui/badge";
import { Profile, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";
import { uploadProfileAvatar } from "@/lib/uploads";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfilePickerPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);

  const pinDigits = useMemo(() => Array.from({ length: 6 }, (_, index) => pin[index] ?? ""), [pin]);

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

  const onUploadAvatar = async (event: ChangeEvent<HTMLInputElement>, profileId: number) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadProfileAvatar(file, profileId);
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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center bg-background px-6 py-10">
      <BarnLogo size={56} />
      <h1 className="mt-3 font-serif text-3xl text-foreground">Project Barn</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a profile to continue</p>

      <div className="mt-6 w-full space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading profiles...</p> : null}
        {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {profiles.map((profile) => (
          <div key={profile.id} className="rounded-xl border border-border bg-card p-3">
            <button type="button" onClick={() => onProfileTap(profile).catch(() => undefined)} className="flex w-full items-center gap-3 text-left">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : initials(profile.name)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{profile.name}</p>
                <p className="text-sm capitalize text-muted-foreground">{profile.role}</p>
              </div>
              {profile.requires_pin ? <Badge variant="secondary">PIN</Badge> : null}
            </button>
            <label className="mt-3 inline-flex cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-xs">
              Upload avatar
              <input type="file" accept="image/*" className="hidden" onChange={(event) => onUploadAvatar(event, profile.id).catch(() => undefined)} />
            </label>
          </div>
        ))}
      </div>

      {selectedProfile ? (
        <form onSubmit={onSubmitPin} className="mt-5 w-full space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Enter PIN for {selectedProfile.name}</p>
          <div className="grid grid-cols-6 gap-2">
            {pinDigits.map((digit, index) => (
              <div key={`${selectedProfile.id}-${index}`} className="flex h-12 items-center justify-center rounded-lg border border-input bg-background text-lg font-semibold text-foreground">
                {digit || "•"}
              </div>
            ))}
          </div>
          <input
            name="pin"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D+/g, "").slice(0, 6))}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-lg"
            placeholder="Enter 6-digit PIN"
            required
          />
          <div className="flex gap-2">
            <button disabled={isSwitching} className="min-h-11 flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{isSwitching ? "Switching..." : "Unlock & switch"}</button>
            <button type="button" onClick={() => setSelectedProfile(null)} className="min-h-11 rounded-lg border border-input bg-secondary px-3 py-2 text-sm">Cancel</button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
