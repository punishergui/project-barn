"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BarnLogo from "@/components/BarnLogo";
import { apiClientJson, Profile, SessionResponse } from "@/lib/api";

const headerHeight = 56;
const bottomNavHeight = 68;

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/projects", label: "Projects", icon: "🐄" },
  { href: "/shows", label: "Shows", icon: "🏆" },
  { href: "/expenses", label: "Expenses", icon: "💵" },
  { href: "/more", label: "More", icon: "☰" }
];

function initials(name?: string) {
  if (!name) return "PB";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    apiClientJson<SessionResponse>("/session", { signal: controller.signal })
      .then((sessionData) => setProfile(sessionData.active_profile))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === "AbortError") {
          return;
        }
        setProfile(null);
      });

    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  const activeLink = useMemo(
    () => primaryLinks.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href,
    [pathname]
  );

  return (
    <div className="min-h-screen w-full bg-[var(--barn-bg)] text-[var(--barn-text)]">
      <header className="fixed inset-x-0 top-0 z-50 h-[calc(56px+env(safe-area-inset-top))] w-full border-b border-[var(--barn-border)] bg-[var(--barn-surface)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-2 px-4">
          <Link href="/dashboard" className="flex min-h-11 min-w-0 items-center gap-2 text-base font-semibold text-[var(--barn-text)]" aria-label="Go to dashboard">
            <BarnLogo size={26} />
            <span className="truncate">Project Barn</span>
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--barn-border)] bg-[var(--barn-bg)] px-2.5"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-label="Open profile menu"
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--barn-red)] text-xs font-semibold text-white">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : initials(profile?.name)}
              </span>
              <span className="max-w-24 truncate text-xs">{profile?.name ?? "Profile"}</span>
            </button>
            {profileMenuOpen ? (
              <div className="absolute right-0 top-12 w-56 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-surface)] p-1.5 shadow-xl" role="menu">
                <Link href="/profile-picker" className="block min-h-11 rounded-lg px-3 py-2 text-sm hover:bg-[var(--barn-bg)]" role="menuitem">
                  Switch Profile
                </Link>
                <Link href="/more" className="block min-h-11 rounded-lg px-3 py-2 text-sm hover:bg-[var(--barn-bg)]" role="menuitem">
                  More / Settings
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-4xl overflow-x-hidden"
        style={{
          paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top))`,
          paddingBottom: `calc(${bottomNavHeight}px + env(safe-area-inset-bottom) + 12px)`,
          minHeight: "100vh"
        }}
      >
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 h-[calc(68px+env(safe-area-inset-bottom))] w-full border-t border-[var(--barn-border)] bg-[var(--barn-surface)] pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex h-[68px] w-full max-w-4xl items-center justify-between gap-1 px-2">
          {primaryLinks.map((item) => (
            <li key={item.href} className="flex flex-1 justify-center">
              <Link
                href={item.href}
                aria-label={item.label}
                className={`flex min-h-11 w-full flex-col items-center justify-center rounded-lg text-[11px] font-medium ${
                  activeLink === item.href
                    ? "text-[var(--barn-red)]"
                    : "text-[color-mix(in_srgb,var(--barn-text)_65%,transparent)]"
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
