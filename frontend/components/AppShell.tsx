"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { apiClientJson, AuthStatus, Profile, SessionResponse } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/expenses", label: "Expenses" },
  { href: "/shows", label: "Shows" },
  { href: "/more", label: "More" }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [auth, setAuth] = useState<AuthStatus>({ role: null, is_unlocked: false, unlock_expires_at: null });
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const load = async () => {
      const [sessionData, authData, profileData] = await Promise.all([
        apiClientJson<SessionResponse>("/session"),
        apiClientJson<AuthStatus>("/auth/status"),
        apiClientJson<Profile[]>("/profiles")
      ]);
      setProfile(sessionData.active_profile);
      setAuth(authData);
      setProfiles(profileData);
    };
    load().catch(() => undefined);
  }, [pathname]);

  const switchProfile = async (id: number) => {
    await apiClientJson("/session/switch-profile", { method: "POST", body: JSON.stringify({ profile_id: id }), headers: { "Content-Type": "application/json" } });
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/dashboard" className="text-lg font-semibold text-red-400">Project Barn</Link>
          <div className="flex items-center gap-2 text-sm">
            <span>{profile?.name ?? "Loading"}</span>
            <span className="rounded bg-white/10 px-2 py-1">{auth.is_unlocked ? "Unlocked" : profile?.role ?? ""}</span>
            <select className="rounded bg-neutral-900 px-2 py-1" value={profile?.id ?? ""} onChange={(e) => switchProfile(Number(e.target.value))}>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Link href="/more" className="rounded border border-white/20 px-2 py-1">Settings</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 pb-24 md:ml-52">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-neutral-950/95 p-2 backdrop-blur md:top-0 md:right-auto md:w-52 md:border-r md:border-t-0 md:p-4">
        <ul className="flex justify-around md:mt-16 md:flex-col md:gap-2">
          {links.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={`block rounded px-3 py-2 text-sm ${pathname.startsWith(item.href) ? "bg-red-500/20 text-red-300" : "text-neutral-300"}`}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
