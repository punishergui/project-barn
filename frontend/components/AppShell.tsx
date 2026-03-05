"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BarnLogo from "@/components/BarnLogo";
import { apiClientJson, Profile, SessionResponse } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/shows", label: "Shows" },
  { href: "/expenses", label: "Expenses" },
  { href: "/more", label: "More" }
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
      <header className="fixed left-0 right-0 top-0 z-20 h-14 border-b border-[var(--barn-border)] bg-[var(--barn-dark)] px-4">
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

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-[72px]">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 h-16 border-t border-[var(--barn-border)] bg-[var(--barn-dark)] px-1">
        <ul className="mx-auto grid h-full max-w-3xl grid-cols-5 items-center gap-1">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex h-12 items-center justify-center rounded-md text-xs font-medium ${
                  activeLink === item.href ? "bg-[var(--barn-red)] text-white" : "text-neutral-300"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
