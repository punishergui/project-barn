"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BarnLogo from "@/components/BarnLogo";
import { apiClientJson, Profile, SessionResponse } from "@/lib/api";

const headerHeight = 56;
const bottomNavHeight = 64;

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

export default function AppShell({
  children,
  showShell
}: {
  children: React.ReactNode;
  showShell: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (!showShell) {
      setProfile(null);
      return;
    }

    apiClientJson<SessionResponse>("/session")
      .then((sessionData) => setProfile(sessionData.active_profile))
      .catch(() => setProfile(null));
  }, [pathname, showShell]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  const activeLink = useMemo(() => {
    if (pathname === "/") {
      return "/dashboard";
    }
    return primaryLinks.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;
  }, [pathname]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    try {
      await apiClientJson("/session/logout", { method: "POST" });
    } catch {
      await Promise.resolve();
    }
    router.push("/profile-picker");
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full bg-[var(--barn-bg)] text-neutral-100">
      {showShell ? (
        <header className="fixed left-0 right-0 top-0 z-[1000] h-[calc(56px+env(safe-area-inset-top))] border-b border-[var(--barn-border)] bg-[var(--barn-dark)] pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-3 text-lg font-semibold text-white">
              <BarnLogo size={28} />
              <span>Project Barn</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--barn-border)] text-sm text-neutral-300"
                aria-label="Notifications"
              >
                🔔
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--barn-border)] bg-black/20 text-xs font-semibold text-white"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  aria-label="Open profile menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--barn-red)]">
                    {initials(profile?.name)}
                  </span>
                </button>
                {profileMenuOpen ? (
                  <div
                    className="absolute right-0 top-12 w-52 rounded-lg border border-[var(--barn-border)] bg-[var(--barn-dark)] p-1 shadow-lg"
                    role="menu"
                  >
                    <Link
                      href="/profile-picker"
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-[var(--barn-red)]"
                      role="menuitem"
                    >
                      Switch Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-[var(--barn-red)]"
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>
      ) : null}

      <main
        className="w-full"
        style={{
          paddingTop: showShell ? `calc(${headerHeight}px + env(safe-area-inset-top) + 1rem)` : 0,
          paddingBottom: showShell ? `calc(${bottomNavHeight}px + env(safe-area-inset-bottom) + 1rem)` : 0,
          minHeight: "100vh"
        }}
      >
        {children}
      </main>

      {showShell ? (
        <nav className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-[var(--barn-border)] bg-[var(--barn-dark)] pb-[env(safe-area-inset-bottom)]">
          <ul className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-1 px-2">
            {primaryLinks.map((item) => (
              <li key={item.href} className="flex flex-1 justify-center">
                <Link
                  href={item.href}
                  className={`flex h-14 w-full flex-col items-center justify-center rounded-lg text-[11px] font-medium ${
                    activeLink === item.href ? "bg-[var(--barn-red)] text-white" : "text-neutral-300"
                  }`}
                >
                  <span aria-hidden="true" className="text-base">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
