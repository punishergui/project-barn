"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BarnLogo from "@/components/BarnLogo";
import { apiClientJson, Profile, SessionResponse } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/projects", label: "Projects", icon: "📋" },
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

  useEffect(() => {
    apiClientJson<SessionResponse>("/session")
      .then((sessionData) => setProfile(sessionData.active_profile))
      .catch(() => setProfile(null));
  }, [pathname]);

  const activeLink = useMemo(() => links.find((item) => pathname.startsWith(item.href))?.href, [pathname]);

  if (pathname === "/") {
    return <div className="min-h-screen bg-[var(--barn-bg)] text-neutral-100">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--barn-bg)] text-neutral-100">
      <header className="fixed left-0 right-0 top-0 z-[1000] h-14 border-b border-[var(--barn-border)] bg-[var(--barn-dark)] px-4">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold text-white">
            <BarnLogo size={28} />
            <span>Project Barn</span>
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-full border border-[var(--barn-border)] p-2 text-xs text-neutral-300" aria-label="Notifications placeholder">
              🔔
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--barn-red)] text-xs font-semibold text-white">
              {initials(profile?.name)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-screen max-w-6xl overflow-y-auto px-4 pb-16 pt-14">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-[1000] flex h-16 items-center justify-around border-t border-[var(--barn-border)] bg-[var(--barn-dark)] px-1">
        <ul className="mx-auto flex h-full w-full max-w-3xl items-center justify-around gap-1">
          {links.map((item) => (
            <li key={item.href} className="flex flex-1 justify-center text-center">
              <Link
                href={item.href}
                className={`flex h-14 w-full flex-col items-center justify-center rounded-md text-[11px] font-medium leading-tight ${
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
    </div>
  );
}
