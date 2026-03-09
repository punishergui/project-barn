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
    <main className="relative min-h-dvh bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900">
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 opacity-20">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="55" cy="45" r="30" fill="#f9a8d4" />
          <circle cx="45" cy="50" r="6" fill="#fda4af" />
          <circle cx="65" cy="50" r="6" fill="#fda4af" />
          <circle cx="47" cy="51" r="2" fill="#9f1239" />
          <circle cx="67" cy="51" r="2" fill="#9f1239" />
          <ellipse cx="55" cy="18" rx="10" ry="14" fill="#f9a8d4" />
          <ellipse cx="55" cy="18" rx="6" ry="9" fill="#fda4af" />
          <circle cx="55" cy="32" r="4" fill="white" />
          <circle cx="56" cy="32" r="2" fill="#1c1917" />
        </svg>
      </div>

      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-20">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="25" cy="45" r="30" fill="#d6d3d1" />
          <ellipse cx="25" cy="57" rx="14" ry="9" fill="#e7e5e4" />
          <circle cx="20" cy="56" r="3" fill="#78716c" />
          <circle cx="30" cy="56" r="3" fill="#78716c" />
          <ellipse cx="15" cy="38" rx="7" ry="5" fill="#78716c" opacity="0.5" />
          <circle cx="25" cy="34" r="5" fill="white" />
          <circle cx="26" cy="34" r="2.5" fill="#1c1917" />
          <path d="M18 18 Q10 8 14 2" stroke="#d6d3d1" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-6 py-10">
        <BarnLogo size={88} className="h-[66px] w-[88px] text-amber-200" />
        <h1 className="mt-3 font-serif text-3xl text-amber-50">Project Barn</h1>
        <p className="mb-6 mt-1 text-sm text-amber-300/70">Who&apos;s using the app?</p>

        <div className="w-full space-y-3">
          {loading ? <p className="text-sm text-amber-300/70">Loading profiles...</p> : null}
          {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="w-full">
          <div className="flex flex-wrap justify-center gap-6">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => onProfileTap(profile).catch(() => undefined)}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-amber-500/40 bg-amber-700 text-2xl font-bold text-amber-50 shadow-lg transition-colors hover:border-amber-400/70">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-serif text-2xl text-amber-50">{initials(profile.name)}</span>
                  )}
                  {profile.requires_pin ? (
                    <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-900/80">
                      <span className="text-[9px] text-amber-200">●●</span>
                    </span>
                  ) : null}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-amber-50">{profile.name}</p>
                  <p className="text-xs capitalize text-amber-300/70">{profile.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedProfile ? (
          <form onSubmit={onSubmitPin} className="mt-8 w-full rounded-2xl border border-amber-700/50 bg-amber-900/50 p-5 shadow-xl backdrop-blur-sm">
            <p className="mb-4 text-sm font-medium text-amber-100">Enter PIN for {selectedProfile.name}</p>
            <div className="mb-4 flex justify-center gap-4">
              {pinDigits.map((digit, index) => (
                <div
                  key={`${selectedProfile.id}-${index}`}
                  className={digit ? "h-5 w-5 rounded-full bg-amber-400" : "h-5 w-5 rounded-full border-2 border-amber-600 bg-amber-900/50"}
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
              className="mt-2 w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-60"
            >
              {isSwitching ? "Unlocking..." : "Unlock"}
            </button>
            <button type="button" onClick={() => setSelectedProfile(null)} className="mt-2 w-full text-center text-sm text-amber-400">
              Cancel
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
