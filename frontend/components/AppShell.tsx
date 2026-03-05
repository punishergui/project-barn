"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BarnLogo from "@/components/BarnLogo";
import { apiClientJson, Profile, SessionResponse } from "@/lib/api";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/projects", label: "Projects", icon: "🐄" },
  { href: "/shows", label: "Shows", icon: "🏆" },
  { href: "/expenses", label: "Expenses", icon: "💵" },
  { href: "/more", label: "More", icon: "☰" }
];

const moreLinks = [
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/settings", label: "Settings", icon: "⚙️" }
];

function initials(name?: string) {
  if (!name) return "PB";
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    apiClientJson<SessionResponse>("/session").then((sessionData) => setProfile(sessionData.active_profile)).catch(() => setProfile(null));
  }, [pathname]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  const allNavLinks = useMemo(() => [...primaryLinks, ...moreLinks], []);
  const activeLink = useMemo(() => allNavLinks.find((item) => pathname.startsWith(item.href))?.href, [allNavLinks, pathname]);

  const switchProfile = async () => {
    setProfileMenuOpen(false);
    try {
      await apiClientJson("/session/logout", { method: "POST" });
    } catch {
      await Promise.resolve();
    }
    router.push("/");
  };

  if (pathname === "/") return <div className="min-h-screen bg-[var(--barn-bg)] text-neutral-100">{children}</div>;

  return (
    <div className="min-h-screen bg-[var(--barn-bg)] text-neutral-100">
      <header className="fixed left-0 right-0 top-0 z-[1000] h-[calc(56px+env(safe-area-inset-top))] border-b border-[var(--barn-border)] bg-[var(--barn-dark)] px-4 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold text-white"><BarnLogo size={28} /><span>Project Barn</span></Link>
          <div className="flex items-center gap-2">
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--barn-border)] text-sm text-neutral-300" aria-label="Notifications">
              🔔
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--barn-red)] text-xs font-semibold text-white"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-label="Open profile menu"
              >
                {initials(profile?.name)}
              </button>
              {profileMenuOpen ? (
                <div className="absolute right-0 top-11 w-48 rounded-lg border border-[var(--barn-border)] bg-[var(--barn-dark)] p-1 shadow-lg" role="menu">
                  <div className="px-3 py-2 text-xs text-neutral-300">{profile?.name ?? "Current profile"}</div>
                  <button type="button" onClick={switchProfile} className="w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-[var(--barn-red)]" role="menuitem">
                    Switch Profile
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="pt-[calc(56px+env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-[1200px] gap-6 px-4 py-4 md:py-6">
          <aside className="hidden w-[220px] shrink-0 md:block">
            <nav className="rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-2">
              <ul className="space-y-1">
                {primaryLinks.map((item) => <li key={item.href}><Link href={item.href} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${activeLink === item.href ? "bg-[var(--barn-red)] text-white" : "text-neutral-300 hover:bg-white/5"}`}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link></li>)}
              </ul>
              <div className="mt-3 border-t border-[var(--barn-border)] pt-3">
                <div className="px-3 pb-2 text-xs uppercase tracking-wide text-neutral-400">More</div>
                <ul className="space-y-1">
                  {moreLinks.map((item) => <li key={item.href}><Link href={item.href} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${activeLink === item.href ? "bg-[var(--barn-red)] text-white" : "text-neutral-300 hover:bg-white/5"}`}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link></li>)}
                </ul>
              </div>
            </nav>
          </aside>

          <main className="min-h-[calc(100vh-56px)] flex-1 pb-[calc(64px+env(safe-area-inset-bottom)+16px)] md:pb-4">{children}</main>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-[var(--barn-border)] bg-[var(--barn-dark)] px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto flex h-16 w-full max-w-md items-center justify-between gap-1">
          {primaryLinks.map((item) => <li key={item.href} className="flex flex-1 justify-center"><Link href={item.href} className={`flex h-16 w-full flex-col items-center justify-center rounded-lg text-[11px] font-medium ${activeLink === item.href ? "bg-[var(--barn-red)] text-white" : "text-neutral-300"}`}><span aria-hidden="true" className="text-base">{item.icon}</span><span>{item.label}</span></Link></li>)}
        </ul>
      </nav>
    </div>
  );
}
