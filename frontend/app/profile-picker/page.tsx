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
    <main className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-[#431407] via-[#7c2d12] to-[#44403c]">

      {/* ── Left peeker: pig ── */}
      <div className="pointer-events-none absolute left-[-52px] top-[28px]">
        <svg width="130" height="130" viewBox="-10 -10 116 116" fill="none" opacity="0.55">
          <ellipse cx="22" cy="18" rx="14" ry="17" fill="#f9a8d4" transform="rotate(-18 22 18)"/>
          <ellipse cx="22" cy="18" rx="8" ry="11" fill="#fb7185" transform="rotate(-18 22 18)"/>
          <ellipse cx="74" cy="18" rx="14" ry="17" fill="#f9a8d4" transform="rotate(18 74 18)"/>
          <ellipse cx="74" cy="18" rx="8" ry="11" fill="#fb7185" transform="rotate(18 74 18)"/>
          <circle cx="48" cy="56" r="38" fill="#fda4af"/>
          <ellipse cx="48" cy="70" rx="17" ry="12" fill="#fb7185"/>
          <ellipse cx="41" cy="71" rx="4" ry="4.5" fill="#9f1239"/>
          <ellipse cx="55" cy="71" rx="4" ry="4.5" fill="#9f1239"/>
          <circle cx="34" cy="48" r="7" fill="white"/>
          <circle cx="62" cy="48" r="7" fill="white"/>
          <circle cx="36" cy="48" r="4" fill="#1c1917"/>
          <circle cx="64" cy="48" r="4" fill="#1c1917"/>
          <circle cx="37.5" cy="46.5" r="1.5" fill="white"/>
          <circle cx="65.5" cy="46.5" r="1.5" fill="white"/>
        </svg>
      </div>

      {/* ── Right peeker: goat (flipped to face inward) ── */}
      <div className="pointer-events-none absolute right-[-52px] top-[20px] [transform:scaleX(-1)]">
        <svg width="130" height="140" viewBox="-10 -15 116 126" fill="none" opacity="0.55">
          <path d="M28 24 Q10 4 18 -8 Q26 -14 24 4" stroke="#c4bfbb" strokeWidth="5" strokeLinecap="round" fill="none"/>
          <path d="M68 24 Q86 4 78 -8 Q70 -14 72 4" stroke="#c4bfbb" strokeWidth="5" strokeLinecap="round" fill="none"/>
          <ellipse cx="12" cy="44" rx="10" ry="18" fill="#d6d3d1" transform="rotate(-28 12 44)"/>
          <ellipse cx="12" cy="44" rx="6" ry="11" fill="#f9a8d4" transform="rotate(-28 12 44)"/>
          <ellipse cx="84" cy="44" rx="10" ry="18" fill="#d6d3d1" transform="rotate(28 84 44)"/>
          <ellipse cx="84" cy="44" rx="6" ry="11" fill="#f9a8d4" transform="rotate(28 84 44)"/>
          <ellipse cx="48" cy="56" rx="34" ry="36" fill="#d6d3d1"/>
          <ellipse cx="48" cy="70" rx="14" ry="11" fill="#c4bfbb"/>
          <ellipse cx="42" cy="72" rx="3" ry="3.5" fill="#78716c"/>
          <ellipse cx="54" cy="72" rx="3" ry="3.5" fill="#78716c"/>
          <circle cx="34" cy="48" r="7" fill="white"/>
          <circle cx="62" cy="48" r="7" fill="white"/>
          <rect x="30.5" y="45.5" width="8" height="5" rx="2.5" fill="#1c1917"/>
          <rect x="58.5" y="45.5" width="8" height="5" rx="2.5" fill="#1c1917"/>
          <circle cx="36" cy="47" r="1.5" fill="white"/>
          <circle cx="64" cy="47" r="1.5" fill="white"/>
        </svg>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-6 py-10">

        {/* Barn logo */}
        <BarnLogo size={96} className="text-amber-100" />

        {/* App name */}
        <h1 className="mt-3 font-serif text-3xl text-amber-50">Project Barn</h1>
        <p className="mb-8 mt-1 text-sm text-amber-300/65">Who&apos;s using the app?</p>

        {/* Loading / error */}
        {loading ? (
          <p className="text-sm text-amber-300/60">Loading profiles...</p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-900/30 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {/* Profile circles grid */}
        <div className="flex w-full flex-wrap justify-center gap-6">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => onProfileTap(profile).catch(() => undefined)}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[3px] border-amber-400/40 bg-gradient-to-br from-amber-700 to-amber-900 shadow-lg transition-all hover:border-amber-300/70 active:scale-95">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-serif text-2xl text-amber-50">
                    {initials(profile.name)}
                  </span>
                )}
                {profile.requires_pin ? (
                  <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-950/80 text-[8px] text-amber-300">
                    PIN
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-amber-50">{profile.name}</p>
              <p className="text-[11px] capitalize text-amber-300/60">{profile.role}</p>
            </button>
          ))}
        </div>

        {/* PIN entry */}
        {selectedProfile ? (
          <form
            onSubmit={onSubmitPin}
            className="mt-8 w-full rounded-2xl border border-amber-700/40 bg-amber-950/50 p-5 shadow-xl backdrop-blur-sm"
          >
            <p className="mb-4 text-sm font-medium text-amber-100">
              Enter PIN for {selectedProfile.name}
            </p>
            <div className="mb-4 flex justify-center gap-4">
              {pinDigits.map((digit, index) => (
                <div
                  key={`${selectedProfile.id}-${index}`}
                  className={
                    digit
                      ? "h-5 w-5 rounded-full bg-amber-400"
                      : "h-5 w-5 rounded-full border-2 border-amber-600 bg-amber-950/50"
                  }
                />
              ))}
            </div>
            <input
              ref={pinInputRef}
              name="pin"
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D+/g, "").slice(0, 4))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              className="sr-only"
            />
            <button
              disabled={isSwitching}
              className="mt-2 w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-amber-950 disabled:opacity-60"
            >
              {isSwitching ? "Unlocking..." : "Unlock"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedProfile(null)}
              className="mt-2 w-full text-center text-sm text-amber-400/70"
            >
              Cancel
            </button>
          </form>
        ) : null}

        <p className="mt-10 text-center text-xs text-amber-400/40">
          Tap your profile to continue
        </p>
      </div>
    </main>
  );
}
