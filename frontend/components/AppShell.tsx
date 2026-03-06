"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import BarnLogo from "@/components/BarnLogo";
import { NotificationsResponse, Profile, SessionResponse, apiClientJson } from "@/lib/api";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/projects", label: "Projects", icon: "🐄" },
  { href: "/shows", label: "Shows", icon: "🏆" },
  { href: "/feed", label: "Feed", icon: "🌾" },
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
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

    apiClientJson<NotificationsResponse>("/notifications?scope=unread&limit=1", { signal: controller.signal })
      .then((payload) => setUnreadNotifications(payload.unread_count))
      .catch(() => setUnreadNotifications(0));

    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  const activeLink = useMemo(
    () => primaryLinks.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href,
    [pathname]
  );

  return (
    <div className="min-h-dvh w-full bg-[var(--barn-bg)] text-[var(--barn-text)]">
      <header className="fixed inset-x-0 top-0 z-50 h-[calc(var(--barn-header-height)+env(safe-area-inset-top))] w-full border-b border-[var(--barn-border)] bg-[var(--barn-surface)] pt-[env(safe-area-inset-top)]">
        <div className="flex h-[var(--barn-header-height)] w-full items-center justify-between gap-2 px-4">
          <Link href="/dashboard" className="flex min-h-11 min-w-0 items-center gap-2 text-base font-semibold text-[var(--barn-text)]" aria-label="Go to dashboard">
            <BarnLogo size={26} />
            <span className="truncate">Project Barn</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/profile-picker" className="hidden min-h-11 items-center rounded-full border border-[var(--barn-border)] bg-[var(--barn-bg)] px-3 text-xs font-medium sm:inline-flex" aria-label="Switch profile">
              Switch
            </Link>
            <Link href="/notifications" className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--barn-border)] bg-[var(--barn-bg)]" aria-label="Open notifications">
              <span aria-hidden="true">🔔</span>
              {unreadNotifications > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--barn-red)] px-1 text-center text-[10px] font-semibold text-white">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span> : null}
            </Link>
            <div ref={profileMenuRef} className="relative">
              <button
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--barn-border)] bg-[var(--barn-bg)] px-2.5"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-controls="profile-menu"
              aria-label="Open profile menu"
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--barn-red)] text-xs font-semibold text-white">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : initials(profile?.name)}
              </span>
              <span className="max-w-24 truncate text-xs">{profile?.name ?? "Profile"}</span>
              </button>
              {profileMenuOpen ? (
              <div id="profile-menu" className="absolute right-0 top-12 w-56 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-surface)] p-1.5 shadow-xl" role="menu">
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
        </div>
      </header>

      <main
        className="w-full overflow-x-hidden"
        style={{
          paddingTop: "calc(var(--barn-header-height) + env(safe-area-inset-top))",
          paddingBottom: "calc(var(--barn-bottom-nav-height) + env(safe-area-inset-bottom) + 12px)",
          minHeight: "100dvh"
        }}
      >
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 h-[calc(var(--barn-bottom-nav-height)+env(safe-area-inset-bottom))] w-full border-t border-[var(--barn-border)] bg-[var(--barn-surface)] pb-[env(safe-area-inset-bottom)]">
        <ul className="flex h-[var(--barn-bottom-nav-height)] w-full items-center justify-between gap-1 px-2">
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
