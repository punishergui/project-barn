"use client";

import {
  BarChart3,
  Bell,
  FolderOpen,
  LayoutDashboard,
  Receipt,
  Trophy,
  UserCircle
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsResponse, SessionResponse, apiClientJson } from "@/lib/api";
import { cn } from "@/lib/utils";

function TopBar({
  profile,
  unread
}: {
  profile: SessionResponse["active_profile"] | null;
  unread: number;
}) {
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-card">
      <div className="mx-auto flex h-full max-w-lg items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <svg viewBox="0 0 64 48" width="28" height="21" fill="none" aria-hidden="true" className="text-primary">
            <path d="M10 20 H54 V44 H10 Z" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <path d="M6 21 L32 8 L58 21" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M28 4 H36 V9 H28 Z" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <path d="M27 4 L32 1 L37 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 24 H24 V30 H18 Z" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <path d="M40 24 H46 V30 H40 Z" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <path d="M20 28 H32 V44 H20 Z" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <path d="M32 28 H44 V44 H32 Z" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <path d="M20 28 L32 44 M32 28 L20 44" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M32 28 L44 44 M44 28 L32 44" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
          <span className="font-serif text-lg text-foreground">Project Barn</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/notifications" className="relative text-muted-foreground">
            <Bell size={20} />
            {unread > 0 ? <span className="absolute -right-0.5 top-0 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
          </Link>
          <Link href="/profile-picker">
            <Avatar className="h-8 w-8 rounded-full bg-primary text-primary-foreground">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.name ?? "Profile"} /> : null}
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : <UserCircle size={16} />}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/shows", label: "Shows", icon: Trophy },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 }
];

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border bg-card">
      <div className="mx-auto flex h-full max-w-lg items-stretch">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive ? <div className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" /> : null}
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<SessionResponse["active_profile"] | null>(null);
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    apiClientJson<SessionResponse>("/session", { signal: controller.signal })
      .then((d) => setProfile(d.active_profile))
      .catch(() => {});

    apiClientJson<NotificationsResponse>("/notifications?scope=unread&limit=1", { signal: controller.signal })
      .then((d) => setUnread(d.unread_count))
      .catch(() => setUnread(0));

    return () => controller.abort();
  }, [pathname]);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <TopBar profile={profile} unread={unread} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
