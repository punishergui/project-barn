"use client";

import {
  BarChart3,
  Bell,
  FolderOpen,
  LayoutDashboard,
  Receipt,
  Trophy
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
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <svg viewBox="0 0 40 32" width="28" height="22" fill="none" aria-hidden="true">
            <rect x="2" y="14" width="36" height="16" rx="1" stroke="currentColor" strokeWidth="1.8" className="text-primary" />
            <path d="M0 15 L20 4 L40 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
            <rect x="14" y="18" width="12" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
            <line x1="14" y1="18" x2="26" y2="30" stroke="currentColor" strokeWidth="1.2" className="text-primary/60" />
            <line x1="26" y1="18" x2="14" y2="30" stroke="currentColor" strokeWidth="1.2" className="text-primary/60" />
          </svg>
          <span className="font-serif text-lg text-foreground">Project Barn</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary">
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
          </Link>
          <Link href="/profile-picker">
            <Avatar className="h-8 w-8 border border-border">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.name ?? "Profile"} /> : null}
              <AvatarFallback className="bg-primary text-[11px] font-semibold text-white">{profile?.name?.slice(0, 2).toUpperCase() ?? "PB"}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/shows", label: "Shows", icon: Trophy },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 }
];

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "")} />
                {isActive ? <div className="absolute -bottom-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" /> : null}
              </div>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
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
