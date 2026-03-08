"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import BarnLogo from "@/components/BarnLogo";
import { Profile, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

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
  const pinInputRef = useRef<HTMLInputElement>(null);

  const pinDigits = useMemo(() => Array.from({ length: 4 }, (_, index) => pin[index] ?? ""), [pin]);

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

  useEffect(() => {
    if (selectedProfile) {
      pinInputRef.current?.focus();
    }
  }, [selectedProfile]);

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

  return (
    <main className="min-h-dvh bg-secondary">
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-6 py-10">
        <BarnLogo size={88} className="h-[66px] w-[88px] text-primary" />
        <h1 className="mt-3 font-serif text-3xl text-foreground">Project Barn</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Who&apos;s using the app?</p>

        <div className="w-full space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading profiles...</p> : null}
          {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => onProfileTap(profile).catch(() => undefined)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm"
            >
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-amber-200 bg-primary text-lg font-bold text-primary-foreground">
                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : initials(profile.name)}
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{profile.name}</p>
                <p className="text-sm capitalize text-muted-foreground">{profile.role}</p>
              </div>
              {profile.requires_pin ? <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">PIN</span> : null}
            </button>
          ))}
        </div>

        {selectedProfile ? (
          <form onSubmit={onSubmitPin} className="mt-6 w-full rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-4 text-sm font-medium text-foreground">Enter PIN for {selectedProfile.name}</p>
            <div className="mb-4 flex justify-center gap-4">
              {pinDigits.map((digit, index) => (
                <div
                  key={`${selectedProfile.id}-${index}`}
                  className={digit ? "h-5 w-5 rounded-full bg-primary" : "h-5 w-5 rounded-full border-2 border-border bg-background"}
                />
              ))}
            </div>
            <input
              ref={pinInputRef}
              name="pin"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D+/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              className="sr-only"
            />
            <button
              disabled={isSwitching}
              className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isSwitching ? "Unlocking..." : "Unlock"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedProfile(null)}
              className="mt-2 w-full text-center text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
